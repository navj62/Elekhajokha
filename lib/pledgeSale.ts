// lib/pledgeSale.ts
//
// Selling an open pledge to the shop's inventory — the one shared core behind
// the single "Add to Inventory" route and bulk forfeit. Every field a sale
// writes (pledge closure, SOLD audit, InventoryItem, PLEDGE_SOLD cash entry) is
// decided here, so the two paths cannot drift apart.
//
//  • buildPledgeSale  — pure: inputs → the exact rows to write.
//  • writePledgeSale  — runs the three per-pledge writes on the caller's
//    transaction client and RETURNS the cash entry. The caller writes cash
//    entries with recordCashEntries (one statement, day row locked last), so a
//    batch can write all of its entries together.
//
// Invariants this module carries (CLAUDE.md): 8 (owed via
// calculateHybridInterest), 11 (amountOwedAt snapshotted once), 12 (SOLD audit
// mirrors RELEASED field-for-field), 13 (one cash entry per action, same txn).
import { Prisma, type CompoundingDuration } from "@prisma/client";
import { calculateHybridInterest } from "@/lib/interest";
import {
  CALCULATION_VERSION,
  OPEN_PLEDGE_STATUSES,
  LTV_MAX_5_2,
} from "@/lib/pledgeConstants";
import type { NewCashEntry } from "@/lib/cashBook";

/** Thrown by writePledgeSale when the pledge was no longer open. */
export const PLEDGE_NOT_OPEN = "NOT_ACTIVE";

export interface SalePledge {
  id: string;
  customerId: string;
  customerName: string;
  loanAmount: Prisma.Decimal;
  interestRate: Prisma.Decimal;
  pledgeDate: Date;
  allowCompounding: boolean;
  compoundingDuration: CompoundingDuration;
  netWeightOfGold: Prisma.Decimal;
  netWeightOfSilver: Prisma.Decimal;
  itemPhoto: string | null;
}

export interface SaleItem {
  itemType: string;
  metalType: string;
  itemName: string | null;
  purity: Prisma.Decimal;
  grossWeight: Prisma.Decimal;
}

/** Latest INR/gram rates, read once per request. null = no price. */
export interface SalePrices {
  goldPpg: number | null;
  silverPpg: number | null;
}

export interface PledgeSaleInput {
  ownerId: string;
  pledge: SalePledge;
  items: SaleItem[];
  saleDate: Date;
  /** Acquisition cost / item value (≥ 0). NOT the cash paid. */
  buyPrice: number;
  prices: SalePrices;
  notes?: string | null;
}

/** An item's display name: its name, else its type, else "Pledged item". */
type NamedItem = Pick<SaleItem, "itemName" | "itemType">;
const nameOf = (it: NamedItem) => it.itemName?.trim() || it.itemType?.trim() || "Pledged item";

/** Item description for the inventory row. One item: its name. Several:
 *  the names joined, e.g. "Ring + Chain (2 items)". */
export function describeItems(items: NamedItem[]): string {
  if (items.length === 0) return "Pledged item";
  if (items.length === 1) return nameOf(items[0]);
  return `${items.map(nameOf).join(" + ")} (${items.length} items)`;
}

/** Purity shared by every item, or null when the items' purities differ. */
export function commonPurity(items: SaleItem[]): Prisma.Decimal | null {
  if (items.length === 0) return null;
  const first = new Prisma.Decimal(items[0].purity.toString());
  return items.every((it) => first.equals(it.purity.toString())) ? first : null;
}

export function buildPledgeSale(input: PledgeSaleInput) {
  const { ownerId, pledge, items, saleDate, buyPrice, prices, notes } = input;
  const { goldPpg, silverPpg } = prices;

  // ── Amount owed at the sale date ──────────────────────────────────
  const calc = calculateHybridInterest(
    Number(pledge.loanAmount),
    Number(pledge.interestRate),
    new Date(pledge.pledgeDate),
    saleDate,
    pledge.allowCompounding,
    pledge.compoundingDuration,
  );

  const netWeightOfGold   = parseFloat(pledge.netWeightOfGold.toString());
  const netWeightOfSilver = parseFloat(pledge.netWeightOfSilver.toString());

  const marketValueRaw =
    (goldPpg   !== null ? goldPpg   * netWeightOfGold   : 0) +
    (silverPpg !== null ? silverPpg * netWeightOfSilver : 0);

  // Market-value convention - must match every closure path (single release,
  // bulk release, sell) and the bulk preview. Store null unless the value is
  // POSITIVE: a computed 0 means "could not value" (no price for the metal
  // actually held), never "worth nothing" - pledge items are always GOLD or
  // SILVER with server-validated positive weight. Audit rows are immutable,
  // so a 0 written here could never be corrected. Revisit if MetalType ever
  // gains OTHER on the pledge side: "priced at zero" and "unpriceable" would
  // then be genuinely different states.
  const marketValue = marketValueRaw > 0 ? marketValueRaw : null;
  // ltvAtRelease is a ratio, not a bounded percentage — a tiny/mispriced
  // marketValue against a large receivableAmount can exceed the column's
  // Decimal(5,2) ceiling. Clamp before writing, or Postgres throws
  // "numeric field overflow" and rolls back the whole sale transaction,
  // including the InventoryItem creation. A value AT the ceiling means
  // "at or above 999.99%", never a precise figure.
  const ltv =
    marketValue !== null
      ? Math.min(LTV_MAX_5_2, Math.round((calc.receivableAmount / marketValue) * 10000) / 100)
      : null;

  // ── Inventory item details ────────────────────────────────────────
  // One inventory item per pledge (sourcePledgeId is unique). itemType,
  // metalType and the metal rate come from the first item; the description
  // names every item; purity is kept only when all items share it. Net
  // weights are the financially meaningful values and are copied from the
  // pledge aggregates, preserving both metals for a mixed gold+silver pledge.
  const firstItem = items[0];
  const itemType  = firstItem?.itemType ?? "Other";
  // metalType is the PledgeItem enum serialised as "GOLD"/"SILVER" (uppercase).
  const metalType = String(firstItem?.metalType ?? "GOLD");
  const purity    = commonPurity(items);
  // Gross weight = sum of the per-item physical gross weights. The pledge
  // aggregate only stores net weights, so gross is reconstructed from items.
  const grossWeight = items.reduce(
    (sum, it) => sum.plus(it.grossWeight.toString()),
    new Prisma.Decimal(0),
  );
  const acquiredMetalRate =
    metalType === "GOLD"   ? goldPpg :
    metalType === "SILVER" ? silverPpg :
    null;

  const owed = new Prisma.Decimal(calc.receivableAmount);
  const cost = new Prisma.Decimal(buyPrice).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

  return {
    calc,
    owed,
    marketValue,
    ltv,

    pledgeUpdate: {
      status:             "SOLD",
      releaseDate:        saleDate,
      salePrice:          new Prisma.Decimal(buyPrice),
      calculationVersion: CALCULATION_VERSION,
      totalInterest:      new Prisma.Decimal(calc.totalInterest),
      receivableAmount:   owed,
      durationMonths:     new Prisma.Decimal(calc.T),
    } satisfies Prisma.PledgeUpdateManyMutationInput,

    // Audit trail — mirrors the release audit field-for-field (Invariant 12).
    audit: {
      pledgeId:             pledge.id,
      action:               "SOLD",
      principal:            pledge.loanAmount,
      interestRate:         pledge.interestRate,
      allowCompounding:     pledge.allowCompounding,
      compoundingDuration:  pledge.compoundingDuration,
      calculationVersion:   CALCULATION_VERSION,
      durationMonths:       new Prisma.Decimal(calc.T),
      totalInterest:        new Prisma.Decimal(calc.totalInterest),
      receivableAmount:     owed,
      netWeightOfGold:      pledge.netWeightOfGold,
      netWeightOfSilver:    pledge.netWeightOfSilver,
      goldPricePerGram:     goldPpg     !== null ? new Prisma.Decimal(goldPpg)     : null,
      silverPricePerGram:   silverPpg   !== null ? new Prisma.Decimal(silverPpg)   : null,
      marketValueAtRelease: marketValue !== null ? new Prisma.Decimal(marketValue) : null,
      ltvAtRelease:         ltv         !== null ? new Prisma.Decimal(ltv)         : null,
      releaseDate:          saleDate,
    } satisfies Prisma.PledgeAuditUncheckedCreateInput,

    inventory: {
      ownerId,
      sourceType:        "PLEDGE_SALE",
      sourcePledgeId:    pledge.id,
      description:       describeItems(items),
      itemType,
      metalType,
      purity,
      grossWeight,
      netWeightOfGold:   pledge.netWeightOfGold,
      netWeightOfSilver: pledge.netWeightOfSilver,
      photoUrl:          pledge.itemPhoto ?? null,
      acquiredAt:        saleDate,
      acquiredCost:      new Prisma.Decimal(buyPrice),
      amountOwedAt:      owed,
      acquiredMetalRate: acquiredMetalRate !== null ? new Prisma.Decimal(acquiredMetalRate) : null,
      notes:             typeof notes === "string" && notes.trim() ? notes.trim() : null,
      status:            "IN_STOCK",
    } satisfies Prisma.InventoryItemUncheckedCreateInput,

    // Cash paid to the customer = acquisition cost − amount owed, floored at
    // 0 (the same formula the sell page shows). The debt itself cancels
    // without cash; a ₹0 entry still records the settlement.
    cashEntry: {
      kind:       "PLEDGE_SOLD",
      direction:  "OUT",
      amount:     Prisma.Decimal.max(cost.minus(owed), 0),
      partyName:  pledge.customerName,
      customerId: pledge.customerId,
      pledgeId:   pledge.id,
      eventAt:    saleDate,
    } satisfies NewCashEntry,
  };
}

export type PledgeSale = ReturnType<typeof buildPledgeSale>;

/**
 * Closes the pledge as SOLD, writes its SOLD audit row and its InventoryItem,
 * on `tx`. Throws PLEDGE_NOT_OPEN if the pledge was no longer ACTIVE/OVERDUE.
 * Returns the cash entry (with inventoryItemId) for the caller to write with
 * recordCashEntries in the same transaction.
 */
export async function writePledgeSale(
  tx: Prisma.TransactionClient,
  sale: PledgeSale,
): Promise<NewCashEntry> {
  const pledgeId = sale.audit.pledgeId;

  // Double-status guard — accepts ACTIVE or OVERDUE
  const result = await tx.pledge.updateMany({
    where: { id: pledgeId, status: { in: [...OPEN_PLEDGE_STATUSES] } },
    data:  sale.pledgeUpdate,
  });
  if (result.count === 0) throw new Error(PLEDGE_NOT_OPEN);

  await tx.pledgeAudit.create({ data: sale.audit });

  const item = await tx.inventoryItem.create({
    data:   sale.inventory,
    select: { id: true },
  });

  return { ...sale.cashEntry, inventoryItemId: item.id };
}
