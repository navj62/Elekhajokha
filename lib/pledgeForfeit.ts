// lib/pledgeForfeit.ts
//
// Bulk forfeit from the LTV page: many open pledges (any customers of one shop)
// sold to the shop's inventory in ONE all-or-nothing transaction. Each pledge
// goes through the same sale core as single sell (lib/pledgeSale.ts), with
// buy price = amount owed unless the owner lowered it.
//
// Shared by the preflight (read-only) and execute routes so both run exactly
// the same checks:
//   body (400) → NOT_OWNED → NOT_OPEN → FUTURE_PLEDGE_DATE → BUY_PRICE_ABOVE_OWED
// The first failing check is returned, listing every offending pledge.
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { buildPledgeSale, describeItems, type PledgeSale, type SalePrices } from "@/lib/pledgeSale";
import { calculateLTV } from "@/lib/calculateLTV";
import { isOpenPledgeStatus } from "@/lib/pledgeConstants";
import { parseCashAmount } from "@/lib/cashBookShared";
import { MAX_FORFEIT_BATCH } from "@/lib/forfeitReview";

// Defined in the client-safe module so the LTV page can share it.
export { MAX_FORFEIT_BATCH };

const buyPriceSchema = z
  .number({ message: "buyPrice must be a number." })
  .refine((v) => v >= 0, "buyPrice must be at least 0.")
  .refine((v) => parseCashAmount(v, { allowZero: true }).ok, "buyPrice must have at most 2 decimal places.");

export const forfeitBodySchema = z.object({
  items: z
    .array(z.object({
      pledgeId: z.string().min(1, "pledgeId is required."),
      buyPrice: buyPriceSchema.optional(),
    }))
    .min(1, "Select at least one pledge.")
    .max(MAX_FORFEIT_BATCH, `At most ${MAX_FORFEIT_BATCH} pledges at a time.`)
    .refine((items) => new Set(items.map((i) => i.pledgeId)).size === items.length, "Each pledge may appear only once."),
});

export type ForfeitRequestItem = z.infer<typeof forfeitBodySchema>["items"][number];

/** A failed check: the HTTP status and body to return. Nothing is written. */
export class ForfeitRejection extends Error {
  constructor(readonly status: number, readonly body: Record<string, unknown>) {
    super(String(body.error));
  }
}

/** Parses the request body, or throws a 400 ForfeitRejection. */
export function parseForfeitBody(body: unknown): ForfeitRequestItem[] {
  const parsed = forfeitBodySchema.safeParse(body);
  if (!parsed.success) {
    throw new ForfeitRejection(400, { error: "VALIDATION", message: parsed.error.issues[0]?.message ?? "Invalid request." });
  }
  return parsed.data.items;
}

/** Same id order as the SQL lock (`ORDER BY p.id COLLATE "C"`). */
export const byId = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/** The pledge fields a forfeit reads. Scope the `where` to the user. */
export const forfeitPledgeSelect = {
  id: true,
  customerId: true,
  status: true,
  loanAmount: true,
  interestRate: true,
  pledgeDate: true,
  allowCompounding: true,
  compoundingDuration: true,
  netWeightOfGold: true,
  netWeightOfSilver: true,
  itemPhoto: true,
  customer: { select: { name: true } },
  items: {
    select:  { itemType: true, metalType: true, itemName: true, purity: true, grossWeight: true },
    // Earliest-added item first, as in single sell: it supplies itemType,
    // metalType and rate.
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  },
} satisfies Prisma.PledgeSelect;

export type ForfeitPledge = Prisma.PledgeGetPayload<{ select: typeof forfeitPledgeSelect }>;

/** Latest INR/gram rates, read once per request. */
export async function readSalePrices(db: Pick<Prisma.TransactionClient, "metalPrice">): Promise<SalePrices> {
  const [gold, silver] = await Promise.all([
    db.metalPrice.findFirst({ where: { metal: "GOLD"   }, orderBy: { createdAt: "desc" } }),
    db.metalPrice.findFirst({ where: { metal: "SILVER" }, orderBy: { createdAt: "desc" } }),
  ]);
  return {
    goldPpg:   gold   ? parseFloat(gold.inrPerGram.toString())   : null,
    silverPpg: silver ? parseFloat(silver.inrPerGram.toString()) : null,
  };
}

const money = (d: Prisma.Decimal) => d.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP).toNumber();

/**
 * Runs every forfeit check against the loaded pledges and builds each sale.
 * Throws a 409 ForfeitRejection on the first failing check. Sales come back
 * sorted by pledge id.
 */
export function evaluateForfeit(args: {
  ownerId: string;
  requested: ForfeitRequestItem[];
  pledges: ForfeitPledge[];
  now: Date;
  prices: SalePrices;
}) {
  const { ownerId, requested, pledges, now, prices } = args;
  const byPledgeId = new Map(pledges.map((p) => [p.id, p]));
  const sorted = [...requested].sort((a, b) => byId(a.pledgeId, b.pledgeId));

  // Missing = not in this shop. An id from another shop and one that does not
  // exist at all get the same answer.
  const notOwned = sorted.filter((r) => !byPledgeId.has(r.pledgeId)).map((r) => r.pledgeId);
  if (notOwned.length > 0) {
    throw new ForfeitRejection(409, {
      error: "NOT_OWNED", message: "Some pledges could not be found.", offendingIds: notOwned,
    });
  }
  const rows = sorted.map((r) => ({ req: r, pledge: byPledgeId.get(r.pledgeId)! }));

  const notOpen = rows.filter(({ pledge }) => !isOpenPledgeStatus(pledge.status)).map(({ pledge }) => pledge.id);
  if (notOpen.length > 0) {
    throw new ForfeitRejection(409, {
      error: "NOT_OPEN", message: "Some pledges are already closed.", offendingIds: notOpen,
    });
  }

  const future = rows.filter(({ pledge }) => pledge.pledgeDate >= now).map(({ pledge }) => pledge.id);
  if (future.length > 0) {
    throw new ForfeitRejection(409, {
      error: "FUTURE_PLEDGE_DATE", message: "Some pledges are dated in the future.", offendingIds: future,
    });
  }

  const built = rows.map(({ req, pledge }) => {
    const base = {
      ownerId,
      pledge:   { ...pledge, customerName: pledge.customer.name },
      items:    pledge.items,
      saleDate: now,
      prices,
    };
    // Owed first (price-independent), then the sale at the chosen price.
    const owed = buildPledgeSale({ ...base, buyPrice: 0 }).owed;
    const buyPrice = req.buyPrice ?? owed.toNumber();
    return { pledge, owed, buyPrice, above: new Prisma.Decimal(buyPrice).greaterThan(owed), base };
  });

  const above = built.filter((b) => b.above);
  if (above.length > 0) {
    throw new ForfeitRejection(409, {
      error:        "BUY_PRICE_ABOVE_OWED",
      message:      "An inventory price can't be more than the amount owed.",
      offendingIds: above.map((b) => b.pledge.id),
      owed:         above.map((b) => ({ pledgeId: b.pledge.id, owed: money(b.owed) })),
    });
  }

  const sales: PledgeSale[] = [];
  let totalOwed = new Prisma.Decimal(0);
  let totalCost = new Prisma.Decimal(0);

  const previews = built.map(({ pledge, owed, buyPrice, base }) => {
    const sale = buildPledgeSale({ ...base, buyPrice });
    sales.push(sale);
    totalOwed = totalOwed.plus(owed);
    totalCost = totalCost.plus(sale.inventory.acquiredCost);

    // Display valuation from the same engine the LTV page uses, so the
    // review shows the page's numbers (unclamped LTV).
    const ltv = calculateLTV({
      principal:           Number(pledge.loanAmount),
      rate:                Number(pledge.interestRate),
      pledgeDate:          pledge.pledgeDate,
      currentDate:         now,
      allowCompounding:    pledge.allowCompounding,
      compoundingDuration: pledge.compoundingDuration,
      goldWeight:          Number(pledge.netWeightOfGold),
      silverWeight:        Number(pledge.netWeightOfSilver),
      goldPrice:           prices.goldPpg,
      silverPrice:         prices.silverPpg,
    });

    return {
      pledgeId:          pledge.id,
      customerId:        pledge.customerId,
      customerName:      pledge.customer.name,
      pledgeDate:        pledge.pledgeDate,
      itemSummary:       describeItems(pledge.items),
      grossWeight:       sale.inventory.grossWeight.toNumber(),
      netWeightOfGold:   Number(pledge.netWeightOfGold),
      netWeightOfSilver: Number(pledge.netWeightOfSilver),
      marketValue:       ltv.marketValue,
      ltv:               ltv.ltv,
      riskTier:          ltv.riskTier,
      owed:              money(owed),
      buyPrice:          money(sale.inventory.acquiredCost),
      writtenOff:        money(owed.minus(sale.inventory.acquiredCost)),
    };
  });

  return {
    sales,
    previews,
    totals: {
      count:      sales.length,
      totalOwed:  money(totalOwed),
      totalCost:  money(totalCost),
      writtenOff: money(totalOwed.minus(totalCost)),
    },
  };
}
