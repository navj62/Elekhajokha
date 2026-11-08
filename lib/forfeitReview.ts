// lib/forfeitReview.ts
//
// Client-safe rules for the bulk-forfeit UI on the LTV page: tier keys for
// the chips, "Select all shown", per-row inventory price checks and the live
// footer totals. No Prisma, no zod — the page imports this. The server
// re-checks everything (lib/pledgeForfeit.ts); these only drive the screen.
import { parseCashAmount } from "@/lib/cashBookShared";

/** Most pledges one forfeit request may carry. */
export const MAX_FORFEIT_BATCH = 100;

export type RiskTierKey = "SAFE" | "WATCH" | "AT_RISK" | "UNDERWATER" | "UNKNOWN";
export const TIER_KEYS: readonly RiskTierKey[] = ["SAFE", "WATCH", "AT_RISK", "UNDERWATER", "UNKNOWN"];

/** A row's chip: its risk tier, or UNKNOWN when there is no LTV (no price). */
export function tierKey(riskTier: string | null): RiskTierKey {
  return riskTier === "SAFE" || riskTier === "WATCH" || riskTier === "AT_RISK" || riskTier === "UNDERWATER"
    ? riskTier
    : "UNKNOWN";
}

/**
 * "Select all shown": every shown row, or — above the batch limit — the
 * first MAX_FORFEIT_BATCH by highest LTV (no LTV last, then by id so the pick
 * is stable whatever the on-screen sort).
 */
export function selectAllShown<T extends { pledgeId: string; ltv: number | null }>(
  rows: T[],
  max = MAX_FORFEIT_BATCH,
): { ids: string[]; capped: boolean } {
  if (rows.length <= max) return { ids: rows.map((r) => r.pledgeId), capped: false };
  const ranked = [...rows].sort((a, b) => {
    if (a.ltv === null && b.ltv === null) return a.pledgeId < b.pledgeId ? -1 : 1;
    if (a.ltv === null) return 1;
    if (b.ltv === null) return -1;
    return b.ltv - a.ltv || (a.pledgeId < b.pledgeId ? -1 : 1);
  });
  return { ids: ranked.slice(0, max).map((r) => r.pledgeId), capped: true };
}

const toPaise = (n: number) => Math.round(n * 100);
const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

export type PriceCheck = { ok: true; value: number } | { ok: false; message: string };

/**
 * One row's inventory price as typed: 0 ≤ price ≤ owed, at most 2 decimal
 * places. Commas and spaces are ignored so "1,12,480" is accepted.
 */
export function checkForfeitPrice(input: string, owed: number): PriceCheck {
  const raw = input.replace(/[,\s]/g, "");
  if (raw === "") return { ok: false, message: "Enter a price (0 or more)." };
  if (raw.startsWith("-")) return { ok: false, message: "Price can't be negative." };
  const parsed = parseCashAmount(raw, { allowZero: true });
  if (!parsed.ok) return { ok: false, message: parsed.message };
  const value = Number(parsed.value);
  if (toPaise(value) > toPaise(owed)) {
    return { ok: false, message: `Can't be more than the amount owed (${inr(owed)}).` };
  }
  return { ok: true, value };
}

/** The price a row starts at: the amount owed, as an input string. */
export const owedInput = (owed: number) => owed.toFixed(2);

/** True when the typed price is not the default (the amount owed). */
export function isEdited(input: string, owed: number): boolean {
  const c = checkForfeitPrice(input, owed);
  return !c.ok || toPaise(c.value) !== toPaise(owed);
}

export interface ReviewTotals {
  count: number;
  totalOwed: number;
  /** null while any row's price is invalid — shown as "—". */
  totalCost: number | null;
  /** Σ(owed − price) over the rows whose price is valid. */
  writtenOff: number;
  invalid: number;
}

/** Live footer totals. Sums in paise so the rupee figures don't drift. */
export function reviewTotals(rows: { owed: number; input: string }[]): ReviewTotals {
  let owed = 0;
  let cost = 0;
  let off = 0;
  let invalid = 0;
  for (const r of rows) {
    owed += toPaise(r.owed);
    const c = checkForfeitPrice(r.input, r.owed);
    if (!c.ok) { invalid++; continue; }
    cost += toPaise(c.value);
    off += toPaise(r.owed) - toPaise(c.value);
  }
  return {
    count:      rows.length,
    totalOwed:  owed / 100,
    totalCost:  invalid > 0 ? null : cost / 100,
    writtenOff: off / 100,
    invalid,
  };
}

/**
 * The execute body. An unedited row sends no buyPrice, so the server prices
 * it at the amount owed as of the moment it runs (owed can tick up between
 * review and confirm, e.g. across midnight).
 */
export function forfeitRequestItems(rows: { pledgeId: string; owed: number; input: string }[]) {
  return rows.map((r) => {
    const c = checkForfeitPrice(r.input, r.owed);
    if (!c.ok) throw new Error("INVALID_PRICE");
    return toPaise(c.value) === toPaise(r.owed) ? { pledgeId: r.pledgeId } : { pledgeId: r.pledgeId, buyPrice: c.value };
  });
}
