// app/api/customers/[customerId]/financial-summary/route.ts

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { calculateHybridInterest } from "@/lib/interest";
import { calculateLTV, getRiskTier } from "@/lib/calculateLTV";
import { computeCustomerRiskScore } from "@/lib/customerRiskScore";
import type { CompoundingDuration } from "@prisma/client";

type RouteContext = {
  params: Promise<{ customerId: string }>;
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

// NOTE: getRiskTier is imported from lib/calculateLTV (single source of truth).
// Do NOT redefine risk thresholds here — they previously diverged from the
// canonical ≤65 SAFE / ≤75 WATCH / ≤90 AT_RISK / else UNDERWATER tiers.

type RiskTier = ReturnType<typeof getRiskTier>;

// NOTE: simple-interest approximation; understates time-to-underwater
// for compounding pledges by 5-15% typically. Display-only — the
// canonical interest engine (calculateHybridInterest) is the source
// of truth for amounts owed.
function daysToUnderwater(
  loanAmount: number,
  interestRate: number, // annual %
  amountOwed: number,
  marketValue: number | null
): number | null {
  if (marketValue === null) return null;
  if (amountOwed >= marketValue) return 0;

  const dailyRate = interestRate / 100 / 365;
  const dailyAccrual = loanAmount * dailyRate;
  if (dailyAccrual <= 0) return null;

  return Math.ceil((marketValue - amountOwed) / dailyAccrual);
}

type TTUStatus = "underwater" | "soon" | "ok" | "unknown" | "released";

function buildTimeToUnderwater(
  pledgeStatus: string,
  loanAmount: number,
  interestRate: number,
  amountOwed: number,
  marketValue: number | null
): { days: number | null; label: string; status: TTUStatus } {
  if (pledgeStatus === "RELEASED") return { days: null, label: "—", status: "released" };
  if (marketValue === null)        return { days: null, label: "—", status: "unknown" };
  if (amountOwed >= marketValue)   return { days: 0,    label: "Underwater", status: "underwater" };

  const days = daysToUnderwater(loanAmount, interestRate, amountOwed, marketValue);
  if (days === null) return { days: null, label: "—", status: "unknown" };

  let label: string;
  if (days <= 90) {
    label = `${days} days`;
  } else if (days <= 365) {
    label = `${Math.round(days / 30)} months`;
  } else if (days <= 3650) {
    label = `${(days / 365).toFixed(1)} years`;
  } else {
    label = "10+ years";
  }

  return { days, label, status: days <= 90 ? "soon" : "ok" };
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
      where: { clerkUserId },
      select: { id: true },
    });
    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { customerId } = await context.params;

    /* ── Customer (ownership guard — everything below is scoped by this) ── */
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, userId: user.id, deletedAt: null },
      select: {
        id: true,
        name: true,
        region: true,
      },
    });
    if (!customer)
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });

    /* ── Latest metal prices ───────────────────────────────────── */
    const [goldPrice, silverPrice] = await Promise.all([
      prisma.metalPrice.findFirst({
        where: { metal: "GOLD" },
        orderBy: { createdAt: "desc" },
        select: { inrPerGram: true, createdAt: true },
      }),
      prisma.metalPrice.findFirst({
        where: { metal: "SILVER" },
        orderBy: { createdAt: "desc" },
        select: { inrPerGram: true },
      }),
    ]);

    const goldPerGram = goldPrice ? Number(goldPrice.inrPerGram) : null;
    const silverPerGram = silverPrice ? Number(silverPrice.inrPerGram) : null;

    /* ── All pledges for this customer (scoped via customer guard above) ── */
    const pledges = await prisma.pledge.findMany({
      where: { customerId },
      orderBy: { pledgeDate: "asc" },
      select: {
        id: true,
        pledgeDate: true,
        status: true,
        loanAmount: true,
        interestRate: true,
        compoundingDuration: true,
        allowCompounding: true,
        netWeightOfGold: true,
        netWeightOfSilver: true,
        remark: true,
        items: {
          select: {
            itemName: true,
            itemType: true,
            metalType: true,
          },
          take: 1, // first item for display label only
        },
      },
    });

    /* ── Process each pledge ───────────────────────────────────── */
    const now = new Date();

    const processed = pledges.map((p) => {
      const loanAmount = Number(p.loanAmount);
      const interestRate = Number(p.interestRate);
      const goldWeight = Number(p.netWeightOfGold);
      const silverWeight = Number(p.netWeightOfSilver);
      const pledgeDate = new Date(p.pledgeDate);

      const interest = calculateHybridInterest(
        loanAmount,
        interestRate,
        pledgeDate,
        now,
        p.allowCompounding,
        p.compoundingDuration as CompoundingDuration
      );

      const amountOwed = interest.receivableAmount;

      const ltvResult = calculateLTV({
        principal: loanAmount,
        rate: interestRate,
        pledgeDate,
        currentDate: now,
        allowCompounding: p.allowCompounding,
        compoundingDuration: p.compoundingDuration as CompoundingDuration,
        goldWeight,
        silverWeight,
        goldPrice: goldPerGram,
        silverPrice: silverPerGram,
      });

      const marketValue = ltvResult.marketValue;
      const ltv = ltvResult.ltv;
      const risk = ltv !== null ? getRiskTier(ltv) : "SAFE";

      const firstItem = p.items[0];
      const name =
        firstItem?.itemName ??
        (firstItem ? `${firstItem.itemType} (${firstItem.metalType})` : "Pledge");

      const metalType = goldWeight >= silverWeight ? "GOLD" : "SILVER";

      return {
        id: p.id,
        name,
        pledgeDate: p.pledgeDate.toISOString(),
        status: p.status,
        loanAmount,
        amountOwed,
        marketValue,
        ltv,
        risk,
        metalType,
        weight: goldWeight + silverWeight,
        timeToUnderwater: buildTimeToUnderwater(
          p.status,
          loanAmount,
          interestRate,
          amountOwed,
          marketValue
        ),
      };
    });

    /* ── Portfolio aggregates ──────────────────────────────────── */
    const activePledges = processed.filter((p) => p.status !== "RELEASED");
    const releasedPledges = processed.filter((p) => p.status === "RELEASED");

    const totalLoanAmount = activePledges.reduce((s, p) => s + p.loanAmount, 0);
    const totalAmountOwed = activePledges.reduce((s, p) => s + p.amountOwed, 0);
    const totalMarketValue = activePledges.reduce(
      (s, p) => s + (p.marketValue ?? 0),
      0
    );

    const totalGoldWeight = activePledges.reduce(
      (s, p) => s + (p.metalType === "GOLD" ? p.weight : 0),
      0
    );
    const totalSilverWeight = activePledges.reduce(
      (s, p) => s + (p.metalType === "SILVER" ? p.weight : 0),
      0
    );

    const underwaterPledges = activePledges.filter(
      (p) => p.risk === "UNDERWATER"
    ).length;

    const overallLTV =
      totalMarketValue > 0
        ? parseFloat(((totalAmountOwed / totalMarketValue) * 100).toFixed(2))
        : null;

    const estimatedCoverage =
      totalAmountOwed > 0
        ? parseFloat(
            (((totalMarketValue * 0.85) / totalAmountOwed) * 100).toFixed(2)
          )
        : null;

    const riskDistribution = [
      { name: "Safe", value: activePledges.filter((p) => p.risk === "SAFE").length, color: "#22c55e" },
      { name: "Watch", value: activePledges.filter((p) => p.risk === "WATCH").length, color: "#eab308" },
      { name: "At Risk", value: activePledges.filter((p) => p.risk === "AT_RISK").length, color: "#f97316" },
      { name: "Underwater", value: activePledges.filter((p) => p.risk === "UNDERWATER").length, color: "#ef4444" },
    ].filter((r) => r.value > 0);

    const exposureData = [
      { name: "Loan", gold: totalLoanAmount, silver: 0 },
      { name: "Owed", gold: totalAmountOwed, silver: 0 },
      { name: "Market", gold: totalMarketValue, silver: 0 },
    ];

    const riskOrder: Record<string, number> = {
      UNDERWATER: 0,
      AT_RISK: 1,
      WATCH: 2,
    };

    const alerts = activePledges
      .filter((p) => p.risk !== "SAFE")
      .sort((a, b) => (riskOrder[a.risk] ?? 9) - (riskOrder[b.risk] ?? 9))
      .map((p) => ({
        pledgeId: p.id,
        pledgeName: p.name,
        risk: p.risk,
        ltv: p.ltv,
        timeToUnderwater: p.timeToUnderwater,
        message:
          p.risk === "UNDERWATER"
            ? `${p.name} is currently underwater — action required`
            : p.timeToUnderwater.status === "soon"
            ? `${p.name} may go underwater in ${p.timeToUnderwater.label}`
            : `${p.name} is approaching risk threshold (LTV ${p.ltv?.toFixed(1)}%)`,
      }));

    const lastPledgeDate =
      activePledges.length > 0
        ? activePledges[activePledges.length - 1].pledgeDate
        : null;

    /* ── Composite risk score ──────────────────────────────────── */
    // Composite risk score: weighted sum of LTV, interest velocity,
    // time-to-underwater, concentration, and average pledge age.
    // Velocity uses TODAY's market value at both timepoints — it
    // measures interest accrual pressure, not price-driven LTV change.

    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    let totalAmountOwed30dAgo = 0;
    for (const rawPledge of pledges.filter((p) => p.status !== "RELEASED")) {
      const pledgeDate = new Date(rawPledge.pledgeDate);
      const endDate30 = pledgeDate > thirtyDaysAgo ? pledgeDate : thirtyDaysAgo;
      const interest30 = calculateHybridInterest(
        Number(rawPledge.loanAmount),
        Number(rawPledge.interestRate),
        pledgeDate,
        endDate30,
        rawPledge.allowCompounding,
        rawPledge.compoundingDuration as CompoundingDuration
      );
      totalAmountOwed30dAgo += interest30.receivableAmount;
    }

    const ltvThirtyDaysAgo: number | null =
      totalMarketValue > 0
        ? parseFloat(((totalAmountOwed30dAgo / totalMarketValue) * 100).toFixed(2))
        : null;

    let daysToUnderwaterWorst: number | null = null;
    for (const p of activePledges) {
      const d = p.timeToUnderwater.days;
      if (d === null) continue;
      if (d === 0) { daysToUnderwaterWorst = 0; break; }
      if (daysToUnderwaterWorst === null || d < daysToUnderwaterWorst) {
        daysToUnderwaterWorst = d;
      }
    }

    const largestPledgeMarketValue = activePledges.reduce(
      (max, p) => (p.marketValue !== null ? Math.max(max, p.marketValue) : max),
      0
    );

    const avgPledgeAgeMonths =
      activePledges.length === 0
        ? 0
        : activePledges.reduce((sum, p) => {
            const ageMs = now.getTime() - new Date(p.pledgeDate).getTime();
            return sum + ageMs / (1000 * 60 * 60 * 24 * 30.4375);
          }, 0) / activePledges.length;

    const riskResult = computeCustomerRiskScore({
      currentLtv: overallLTV,
      ltvThirtyDaysAgo,
      daysToUnderwaterWorst,
      largestPledgeMarketValue,
      totalMarketValue,
      avgPledgeAgeMonths,
    });

    /* ── LTV trend — last 6 months of pledge audit snapshots ───── */
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const audits = await prisma.pledgeAudit.findMany({
      where: {
        pledge: { customerId },
        createdAt: { gte: sixMonthsAgo },
      },
      orderBy: { createdAt: "asc" },
      select: {
        createdAt: true,
        principal: true,
        totalInterest: true,
        receivableAmount: true,
        marketValueAtRelease: true,
        ltvAtRelease: true,
      },
    });

    const trendByMonth = new Map<
      string,
      { ltv: number; marketValue: number; amountOwed: number }
    >();

    for (const audit of audits) {
      const month = audit.createdAt.toLocaleDateString("en-IN", {
        month: "short",
      });
      const mv = audit.marketValueAtRelease
        ? Number(audit.marketValueAtRelease)
        : 0;
      const owed = audit.receivableAmount ? Number(audit.receivableAmount) : 0;
      const ltv = audit.ltvAtRelease ? Number(audit.ltvAtRelease) : 0;
      trendByMonth.set(month, { ltv, marketValue: mv, amountOwed: owed });
    }

    const ltvTrend = Array.from(trendByMonth.entries()).map(([month, data]) => ({
      month,
      ...data,
    }));

    /* ── Final response ────────────────────────────────────────── */
    return NextResponse.json({
      customer: {
        id: customer.id,
        name: customer.name,
        region: customer.region,
        riskScore: riskResult.score,
        riskTier: riskResult.tier,
        riskBreakdown: riskResult.breakdown,
        totalActivePledges: activePledges.length,
        lastPledgeDate,
      },
      metrics: {
        totalLoanAmount,
        totalAmountOwed: parseFloat(totalAmountOwed.toFixed(2)),
        totalGoldWeight: parseFloat(totalGoldWeight.toFixed(3)),
        totalSilverWeight: parseFloat(totalSilverWeight.toFixed(3)),
        activePledges: activePledges.length,
        releasedPledges: releasedPledges.length,
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
      pledges: processed,
      riskDistribution,
      exposureData,
      ltvTrend,
      alerts,
    });
  } catch (err: unknown) {
    console.error("FINANCIAL SUMMARY ERROR:", err);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}