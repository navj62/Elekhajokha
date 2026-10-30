/**
 * Client-side loading and shared formatting for one inventory item: the
 * detail page and the sell page read the same GET /api/inventory/[id]
 * response through the same normalize(), so they cannot disagree.
 */
import { marketValue } from "@/lib/calculateLTV";
import { fmtINR } from "@/components/ui/DetailParts";

/* -------------------------------------------------------------------------- */
/* Types                                                                       */
/* -------------------------------------------------------------------------- */
// Prisma Decimal columns arrive as strings; normalize() converts them to
// numbers once so everything downstream works with real numbers.

type Decimalish = string | number | null | undefined;

export interface SaleAudit {
  principal: number | null;
  totalInterest: number | null;
  receivableAmount: number | null;
  durationMonths: number | null;
  releaseDate: string | null;
  goldPricePerGram: number | null;
  silverPricePerGram: number | null;
  marketValueAtRelease: number | null;
  ltvAtRelease: number | null;
}

export interface SourcePledge {
  id: string;
  customerId: string;
  customerName: string;
  pledgeDate: string;
  loanAmount: number | null;
  interestRate: number | null;
  releaseDate: string | null;
  totalInterest: number | null;
  receivableAmount: number | null;
  durationMonths: number | null;
  audit: SaleAudit | null;
}

export interface Item {
  id: string;
  sourceType: "PLEDGE_SALE" | "DIRECT_PURCHASE";
  status: "IN_STOCK" | "SOLD";
  description: string;
  itemType: string;
  metalType: string;
  purity: number | null;
  grossWeight: number | null;
  netWeightOfGold: number;
  netWeightOfSilver: number;
  photoUrl: string | null;
  acquiredAt: string;
  acquiredCost: number | null;
  amountOwedAt: number | null;
  acquiredMetalRate: number | null;
  sellerName: string | null;
  sellerIdNum: string | null;
  soldAt: string | null;
  soldPrice: number | null;
  buyerName: string | null;
  buyerMobile: string | null;
  saleNotes: string | null;
  notes: string | null;
  sourcePledge: SourcePledge | null;
}

export interface PricePoint { inrPerGram: number; createdAt: string }
export interface MarketRates { gold: PricePoint | null; silver: PricePoint | null }

/* -------------------------------------------------------------------------- */
/* Normalisation                                                               */
/* -------------------------------------------------------------------------- */
function num(v: Decimalish): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function price(row: { inrPerGram: Decimalish; createdAt: string } | null | undefined): PricePoint | null {
  const p = num(row?.inrPerGram);
  return row && p !== null ? { inrPerGram: p, createdAt: row.createdAt } : null;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function normalize(raw: any): Item {
  const sp = raw.sourcePledge;
  const a = sp?.pledgeAudits?.[0];
  return {
    id: raw.id,
    sourceType: raw.sourceType,
    status: raw.status,
    description: raw.description,
    itemType: raw.itemType,
    metalType: raw.metalType,
    purity: num(raw.purity),
    grossWeight: num(raw.grossWeight),
    netWeightOfGold: num(raw.netWeightOfGold) ?? 0,
    netWeightOfSilver: num(raw.netWeightOfSilver) ?? 0,
    photoUrl: raw.photoUrl ?? null,
    acquiredAt: raw.acquiredAt,
    acquiredCost: num(raw.acquiredCost),
    amountOwedAt: num(raw.amountOwedAt),
    acquiredMetalRate: num(raw.acquiredMetalRate),
    sellerName: raw.sellerName ?? null,
    sellerIdNum: raw.sellerIdNum ?? null,
    soldAt: raw.soldAt ?? null,
    soldPrice: num(raw.soldPrice),
    buyerName: raw.buyerName ?? null,
    buyerMobile: raw.buyerMobile ?? null,
    saleNotes: raw.saleNotes ?? null,
    notes: raw.notes ?? null,
    sourcePledge: sp
      ? {
          id: sp.id,
          customerId: sp.customerId,
          customerName: sp.customer?.name ?? "—",
          pledgeDate: sp.pledgeDate,
          loanAmount: num(sp.loanAmount),
          interestRate: num(sp.interestRate),
          releaseDate: sp.releaseDate ?? null,
          totalInterest: num(sp.totalInterest),
          receivableAmount: num(sp.receivableAmount),
          durationMonths: num(sp.durationMonths),
          audit: a
            ? {
                principal: num(a.principal),
                totalInterest: num(a.totalInterest),
                receivableAmount: num(a.receivableAmount),
                durationMonths: num(a.durationMonths),
                releaseDate: a.releaseDate ?? null,
                goldPricePerGram: num(a.goldPricePerGram),
                silverPricePerGram: num(a.silverPricePerGram),
                marketValueAtRelease: num(a.marketValueAtRelease),
                ltvAtRelease: num(a.ltvAtRelease),
              }
            : null,
        }
      : null,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export type FetchResult =
  | { ok: true; item: Item; market: MarketRates | null }
  | { ok: false; error: string };

export async function fetchItem(id: string): Promise<FetchResult> {
  try {
    const [itemRes, marketRes] = await Promise.all([
      fetch(`/api/inventory/${id}`),
      fetch("/api/market-rates"),
    ]);
    if (!itemRes.ok) {
      return { ok: false, error: itemRes.status === 404 ? "Item not found" : "Failed to load item" };
    }
    const raw = await itemRes.json();
    if (!raw?.item?.id) return { ok: false, error: "Failed to load item" };

    let market: MarketRates | null = null;
    if (marketRes.ok) {
      const m = await marketRes.json();
      market = { gold: price(m?.gold), silver: price(m?.silver) };
    }
    return { ok: true, item: normalize(raw.item), market };
  } catch {
    return { ok: false, error: "Failed to load item" };
  }
}

/* -------------------------------------------------------------------------- */
/* Valuation                                                                   */
/* -------------------------------------------------------------------------- */
/**
 * Market value at today's metal price, via the app's shared valuation rule.
 * Every metal the item holds must have a current price — a partial valuation
 * would understate it — so a missing price is null ("—"), never a guess.
 */
export function valueToday(item: Item, market: MarketRates | null): number | null {
  const holdsGold = item.netWeightOfGold > 0;
  const holdsSilver = item.netWeightOfSilver > 0;
  const fullyPriced =
    (holdsGold || holdsSilver) &&
    (!holdsGold || market?.gold != null) &&
    (!holdsSilver || market?.silver != null);
  return fullyPriced
    ? marketValue(
        item.netWeightOfGold, item.netWeightOfSilver,
        market?.gold?.inrPerGram ?? null, market?.silver?.inrPerGram ?? null,
      )
    : null;
}

/* -------------------------------------------------------------------------- */
/* Formatting                                                                  */
/* -------------------------------------------------------------------------- */
export function fmtSignedINR(n: number) {
  return `${n >= 0 ? "+" : "−"}${fmtINR(Math.abs(n))}`;
}
export function fmtSignedPct(n: number) {
  return `${n >= 0 ? "+" : "−"}${Math.abs(n).toFixed(1)}%`;
}
/** YYYY-MM-DD in the viewer's local zone (not UTC). */
export function localISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
/** "₹X (+Y%)", or just "₹X" when the base is 0 and a % is meaningless. */
export function fmtChange(amount: number, base: number) {
  return base > 0 ? `${fmtSignedINR(amount)} (${fmtSignedPct((amount / base) * 100)})` : fmtSignedINR(amount);
}
