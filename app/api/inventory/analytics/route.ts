import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// Live inventory analytics — every number is computed on the fly from the
// user's InventoryItem rows plus the latest MetalPrice. Nothing is read from
// or written to FinancialSnapshot or any cache table.
export async function GET() {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where:  { clerkUserId },
      select: { id: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // One scoped item fetch + latest metal prices, all in parallel.
    const [items, goldPrice, silverPrice] = await Promise.all([
      prisma.inventoryItem.findMany({
        where:  { ownerId: user.id },
        select: {
          status:            true,
          netWeightOfGold:   true,
          netWeightOfSilver: true,
          acquiredCost:      true,
          soldPrice:         true,
          soldAt:            true,
          acquiredAt:        true,
        },
      }),
      prisma.metalPrice.findFirst({ where: { metal: "GOLD"   }, orderBy: { createdAt: "desc" } }),
      prisma.metalPrice.findFirst({ where: { metal: "SILVER" }, orderBy: { createdAt: "desc" } }),
    ]);

    const goldPpg   = goldPrice   ? Number(goldPrice.inrPerGram)   : null;
    const silverPpg = silverPrice ? Number(silverPrice.inrPerGram) : null;

    const inStockItems = items.filter((i) => i.status === "IN_STOCK");
    const soldItems    = items.filter((i) => i.status === "SOLD");

    const sum = <T>(arr: T[], fn: (t: T) => number) => arr.reduce((s, t) => s + fn(t), 0);

    // ── IN_STOCK aggregates ─────────────────────────────────────────
    const goldInStock   = sum(inStockItems, (i) => Number(i.netWeightOfGold));
    const silverInStock = sum(inStockItems, (i) => Number(i.netWeightOfSilver));
    const acquiredCostInStock = sum(inStockItems, (i) => Number(i.acquiredCost));

    // Market value: value each metal at its live per-gram rate. If a price is
    // missing, that metal contributes 0 and we flag the result as partial.
    const hasGold   = goldPpg   !== null;
    const hasSilver = silverPpg !== null;
    let marketValue: number | null;
    let isMarketValuePartial = false;
    if (!hasGold && !hasSilver) {
      marketValue = null; // no prices at all
    } else {
      marketValue = sum(inStockItems, (i) =>
        (hasGold   ? Number(i.netWeightOfGold)   * (goldPpg   as number) : 0) +
        (hasSilver ? Number(i.netWeightOfSilver) * (silverPpg as number) : 0),
      );
      isMarketValuePartial = !hasGold || !hasSilver;
    }

    // ── SOLD aggregates ─────────────────────────────────────────────
    const goldSold        = sum(soldItems, (i) => Number(i.netWeightOfGold));
    const silverSold      = sum(soldItems, (i) => Number(i.netWeightOfSilver));
    const moneyCollected  = sum(soldItems, (i) => Number(i.soldPrice ?? 0));
    const costBasisSold   = sum(soldItems, (i) => Number(i.acquiredCost));
    const realizedProfit  = moneyCollected - costBasisSold;

    // Most recent price timestamp, whichever metal is newer.
    const times = [goldPrice?.createdAt, silverPrice?.createdAt].filter(Boolean) as Date[];
    const pricesUpdatedAt = times.length
      ? new Date(Math.max(...times.map((d) => d.getTime()))).toISOString()
      : null;

    return NextResponse.json({
      stock: {
        count:                inStockItems.length,
        goldWeightGrams:      goldInStock,
        silverWeightGrams:    silverInStock,
        acquiredCost:         acquiredCostInStock,
        marketValue,
        isMarketValuePartial,
      },
      sold: {
        count:           soldItems.length,
        goldWeightGrams: goldSold,
        silverWeightGrams: silverSold,
        moneyCollected,
        costBasis:       costBasisSold,
        realizedProfit,
      },
      total: {
        itemCount: items.length,
      },
      rates: {
        goldPerGram:   goldPpg,
        silverPerGram: silverPpg,
        updatedAt:     pricesUpdatedAt,
      },
    });
  } catch (err) {
    console.error("GET /api/inventory/analytics failed:", err);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
