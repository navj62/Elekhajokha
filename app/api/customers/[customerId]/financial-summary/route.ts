 // app/api/customers/[customerId]/financial-summary/route.ts

import { NextResponse }  from "next/server";
import { auth }          from "@clerk/nextjs/server";
import { prisma }        from "@/lib/prisma";
import { calculateHybridInterest } from "@/lib/interest";
import { calculateLTV }            from "@/lib/calculateLTV";
import type { CompoundingDuration } from "@/src/generated/prisma";

type RouteContext = {
  params: Promise<{ customerId: string }>;
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

type RiskTier = "SAFE" | "WATCH" | "AT RISK" | "UNDERWATER";

function getRiskTier(ltv: number | null): RiskTier {
  if (ltv === null)  return "SAFE";
  if (ltv >= 100)    return "UNDERWATER";
  if (ltv >= 85)     return "AT RISK";
  if (ltv >= 70)     return "WATCH";
  return "SAFE";
}

/**
 * Estimate days until the pledge goes underwater (LTV >= 100).
 * Uses simple linear approximation: how many days until
 * amountOwed = marketValue, assuming market value stays constant
 * and interest accrues at the daily rate.
 *
 * Returns null if already underwater or if market value is unknown.
 * Returns 0  if currently underwater.
 */
function daysToUnderwater(
  loanAmount: number,
  interestRate: number,      // annual %
  amountOwed: number,
  marketValue: number | null
): number | null {
  if (marketValue === null) return null;
  if (amountOwed >= marketValue) return 0;

  // daily interest on principal (simple approximation)
  const dailyRate   = interestRate / 100 / 365;
  const dailyAccrual = loanAmount * dailyRate;
  if (dailyAccrual <= 0) return null;

  return Math.ceil((marketValue - amountOwed) / dailyAccrual);
}

/**
 * Overall risk score 0–100 derived from the portfolio's weighted average LTV.
 * 0 = perfectly safe, 100 = fully underwater.
 */
function portfolioRiskScore(overallLTV: number | null): number {
  if (overallLTV === null) return 0;
  // clamp and scale: 0% LTV → score 0, 100%+ LTV → score 100
  return Math.min(100, Math.max(0, Math.round(overallLTV)));
}

/* ------------------------------------------------------------------ */
/*  GET /api/customers/[customerId]/financial-summary                  */
/* ------------------------------------------------------------------ */

export async function GET(_req: Request, context: RouteContext) {
  try {
    /* ── Auth ──────────────────────────────────────────────────── */
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where:  { clerkUserId },
      select: { id: true },
    });
    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { customerId } = await context.params;

    /* ── Customer ──────────────────────────────────────────────── */
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, userId: user.id, deletedAt: null },
      select: {
        id:     true,
        name:   true,
        region: true,
      },
    });
    if (!customer)
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });

    /* ── Latest metal prices ───────────────────────────────────── */
    const [goldPrice, silverPrice] = await Promise.all([
      prisma.metalPrice.findFirst({
        where:   { metal: "GOLD" },
        orderBy: { createdAt: "desc" },
        select:  { inrPerGram: true, createdAt: true },
      }),
      prisma.metalPrice.findFirst({
        where:   { metal: "SILVER" },
        orderBy: { createdAt: "desc" },
        select:  { inrPerGram: true },
      }),
    ]);

    const goldPerGram   = goldPrice   ? Number(goldPrice.inrPerGram)   : null;
    const silverPerGram = silverPrice ? Number(silverPrice.inrPerGram) : null;

    /* ── All pledges for this customer ─────────────────────────── */
    const pledges = await prisma.pledge.findMany({
      where:   { customerId, deletedAt: undefined },
      orderBy: { pledgeDate: "asc" },
      select: {
        id:                  true,
        pledgeDate:          true,
        status:              true,
        loanAmount:          true,
        interestRate:        true,
        compoundingDuration: true,
        allowCompounding:    true,
        netWeightOfGold:     true,
        netWeightOfSilver:   true,
        remark:              true,
        items: {
          select: {
            itemName:  true,
            itemType:  true,
            metalType: true,
          },
          take: 1,   // first item for display label
        },
      },
    });

    /* ── Process each pledge ───────────────────────────────────── */
    const now = new Date();

    const processed = pledges.map((p) => {
      const loanAmount    = Number(p.loanAmount);
      const interestRate  = Number(p.interestRate);
      const goldWeight    = Number(p.netWeightOfGold);
      const silverWeight  = Number(p.netWeightOfSilver);
      const pledgeDate    = new Date(p.pledgeDate);

      // Interest calculation
      const interest = calculateHybridInterest(
        loanAmount,
        interestRate,
        pledgeDate,
        now,
        p.allowCompounding,
        p.compoundingDuration as CompoundingDuration
      );

      const amountOwed = interest.receivableAmount;

      // LTV calculation
      const ltvResult = calculateLTV({
        principal:           loanAmount,
        rate:                interestRate,
        pledgeDate,
        currentDate:         now,
        allowCompounding:    p.allowCompounding,
        compoundingDuration: p.compoundingDuration as CompoundingDuration,
        goldWeight,
        silverWeight,
        goldPrice:           goldPerGram,
        silverPrice:         silverPerGram,
      });

      const marketValue = ltvResult.marketValue;
      const ltv         = ltvResult.ltv;
      const risk        = getRiskTier(ltv);

      // Pledge display name from first item
      const firstItem = p.items[0];
      const name = firstItem?.itemName
        ?? (firstItem ? `${firstItem.itemType} (${firstItem.metalType})` : `Pledge`)

      // Primary metal type
      const metalType = goldWeight >= silverWeight ? "GOLD" : "SILVER";

      return {
        id:               p.id,
        name,
        pledgeDate:       p.pledgeDate.toISOString(),
        status:           p.status,
        loanAmount,
        amountOwed,
        marketValue,
        ltv,
        risk,
        metalType,
        weight:           goldWeight + silverWeight,
        daysToUnderwater: p.status !== "RELEASED"
          ? daysToUnderwater(loanAmount, interestRate, amountOwed, marketValue)
          : null,
      };
    });

    /* ── Portfolio aggregates ──────────────────────────────────── */
    const activePledges    = processed.filter(p => p.status !== "RELEASED");
    const releasedPledges  = processed.filter(p => p.status === "RELEASED");

    const totalLoanAmount  = activePledges.reduce((s, p) => s + p.loanAmount,  0);
    const totalAmountOwed  = activePledges.reduce((s, p) => s + p.amountOwed,  0);
    const totalMarketValue = activePledges.reduce((s, p) => s + (p.marketValue ?? 0), 0);

    const totalGoldWeight   = activePledges.reduce((s, p) => s + (p.metalType === "GOLD"   ? p.weight : 0), 0);
    const totalSilverWeight = activePledges.reduce((s, p) => s + (p.metalType === "SILVER" ? p.weight : 0), 0);

    const underwaterPledges = activePledges.filter(p => p.risk === "UNDERWATER").length;

    // Overall LTV = total amount owed / total market value
    const overallLTV = totalMarketValue > 0
      ? parseFloat(((totalAmountOwed / totalMarketValue) * 100).toFixed(2))
      : null;

    // Liquidation coverage = market value / amount owed (at 85% recovery)
    const estimatedCoverage = totalAmountOwed > 0
      ? parseFloat(((totalMarketValue * 0.85 / totalAmountOwed) * 100).toFixed(2))
      : null;

    // Risk distribution for donut chart
    const riskDistribution = [
      { name: "Safe",       value: activePledges.filter(p => p.risk === "SAFE").length,       color: "#22c55e" },
      { name: "Watch",      value: activePledges.filter(p => p.risk === "WATCH").length,      color: "#eab308" },
      { name: "At Risk",    value: activePledges.filter(p => p.risk === "AT RISK").length,    color: "#f97316" },
      { name: "Underwater", value: activePledges.filter(p => p.risk === "UNDERWATER").length, color: "#ef4444" },
    ].filter(r => r.value > 0);  // only include tiers with pledges

    // Exposure breakdown for bar chart
    const exposureData = [
      { name: "Loan",   gold: totalLoanAmount,  silver: 0 },
      { name: "Owed",   gold: totalAmountOwed,  silver: 0 },
      { name: "Market", gold: totalMarketValue, silver: 0 },
    ];

    // Risk alerts — pledges that need attention
    const alerts = activePledges
      .filter(p => p.risk !== "SAFE")
      .sort((a, b) => {
        // sort: underwater first, then at risk, then watch
        const order: Record<string, number> = { UNDERWATER: 0, "AT RISK": 1, WATCH: 2 };
        return (order[a.risk] ?? 9) - (order[b.risk] ?? 9);
      })
      .map(p => ({
        pledgeId:         p.id,
        pledgeName:       p.name,
        risk:             p.risk,
        ltv:              p.ltv,
        daysToUnderwater: p.daysToUnderwater,
        message:
          p.risk === "UNDERWATER"
            ? `${p.name} is currently underwater — action required`
            : p.daysToUnderwater !== null && p.daysToUnderwater <= 30
            ? `${p.name} may go underwater in ${p.daysToUnderwater} days`
            : `${p.name} is approaching risk threshold (LTV ${p.ltv?.toFixed(1)}%)`,
      }));

    // Last pledge date
    const lastPledgeDate = activePledges.length > 0
      ? activePledges[activePledges.length - 1].pledgeDate
      : null;

    /* ── LTV trend — last 6 months of pledge audit snapshots ───── */
    // NOTE: This uses PledgeAudit records if available.
    // If your audits don't have enough history, this returns an empty array
    // and the page should fall back to hiding the trend chart.
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const audits = await prisma.pledgeAudit.findMany({
      where: {
        pledge: { customerId },
        createdAt: { gte: sixMonthsAgo },
      },
      orderBy: { createdAt: "asc" },
      select: {
        createdAt:       true,
        principal:       true,
        totalInterest:   true,
        receivableAmount: true,
        marketValueAtRelease: true,
        ltvAtRelease:         true,
      },
    });

    // Group audits by month and take the last entry per month
    const trendByMonth = new Map<string, {
      ltv: number; marketValue: number; amountOwed: number;
    }>();

    for (const audit of audits) {
      const month = audit.createdAt.toLocaleDateString("en-IN", { month: "short" });
      const mv    = audit.marketValueAtRelease ? Number(audit.marketValueAtRelease) : 0;
      const owed  = audit.receivableAmount     ? Number(audit.receivableAmount)     : 0;
      const ltv   = audit.ltvAtRelease         ? Number(audit.ltvAtRelease)         : 0;
      trendByMonth.set(month, { ltv, marketValue: mv, amountOwed: owed });
    }

    const ltvTrend = Array.from(trendByMonth.entries()).map(([month, data]) => ({
      month,
      ...data,
    }));

    /* ── Final response ────────────────────────────────────────── */
    return NextResponse.json({
      customer: {
        id:                 customer.id,
        name:               customer.name,
        region:             customer.region,
        riskScore:          portfolioRiskScore(overallLTV),
        totalActivePledges: activePledges.length,
        lastPledgeDate,
      },
      metrics: {
        totalLoanAmount,
        totalAmountOwed:  parseFloat(totalAmountOwed.toFixed(2)),
        totalGoldWeight:  parseFloat(totalGoldWeight.toFixed(3)),
        totalSilverWeight: parseFloat(totalSilverWeight.toFixed(3)),
        activePledges:    activePledges.length,
        releasedPledges:  releasedPledges.length,
        underwaterPledges,
        overallLTV,
        totalMarketValue: parseFloat(totalMarketValue.toFixed(2)),
        estimatedCoverage,
      },
      prices: {
        goldPerGram,
        silverPerGram,
        updatedAt: goldPrice?.createdAt ?? null,
      },
      pledges:         processed,
      riskDistribution,
      exposureData,
      ltvTrend,         // empty array if no audit history
      alerts,
    });

  } catch (err: any) {
    console.error("FINANCIAL SUMMARY ERROR:", err);
    return NextResponse.json(
      { error: "Server Error", message: err.message },
      { status: 500 }
    );
  }
}