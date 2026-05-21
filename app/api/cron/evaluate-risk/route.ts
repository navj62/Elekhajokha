// app/api/cron/evaluate-risk/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { calculateLTV, getRiskTier, type RiskTier } from "@/lib/calculateLTV";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

interface PledgeRow {
  id: string;
  customerId: string;
  customer: { userId: string };
  loanAmount: Prisma.Decimal;
  interestRate: Prisma.Decimal;
  allowCompounding: boolean;
  compoundingDuration: "MONTHLY" | "HALFYEARLY" | "YEARLY";
  pledgeDate: Date;
  netWeightOfGold: Prisma.Decimal;
  netWeightOfSilver: Prisma.Decimal;
  lastRiskTier: string | null;
  transactions: { amount: Prisma.Decimal; type: string }[];
}
// ─────────────────────────────────────────────
// AUTH GUARD
// ─────────────────────────────────────────────

function isAuthorized(req: NextRequest): boolean {
  return req.headers.get("x-cron-secret") === process.env.CRON_SECRET;
}

// ─────────────────────────────────────────────
// ALERT MESSAGE
// ─────────────────────────────────────────────

function buildAlertMessage(
  oldTier: RiskTier | null,
  newTier: RiskTier,
  ltv: number,
  pledgeId: string
): string {
  const ltvStr = ltv.toFixed(1);
  if (newTier === "UNDERWATER")
    return `Pledge ${pledgeId} is now UNDERWATER — LTV has reached ${ltvStr}%. Immediate attention required.`;
  if (newTier === "AT_RISK")
    return `Pledge ${pledgeId} moved to AT RISK — LTV is ${ltvStr}%. Monitor closely.`;
  if (newTier === "WATCH" && oldTier === "SAFE")
    return `Pledge ${pledgeId} moved to WATCH — LTV is ${ltvStr}%.`;
  return `Pledge ${pledgeId} risk tier changed from ${oldTier} to ${newTier}. LTV: ${ltvStr}%.`;
}

// ─────────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dryRun = req.nextUrl.searchParams.get("dryRun") === "true";

  try {
    // ── Latest metal prices ──
    const [latestGold, latestSilver] = await Promise.all([
      prisma.metalPrice.findFirst({ where: { metal: "GOLD" }, orderBy: { createdAt: "desc" } }),
      prisma.metalPrice.findFirst({ where: { metal: "SILVER" }, orderBy: { createdAt: "desc" } }),
    ]);

    // Prices can be null — calculateLTV handles null gracefully
    const goldPrice = latestGold ? Number(latestGold.inrPerGram) : null;
    const silverPrice = latestSilver ? Number(latestSilver.inrPerGram) : null;

    const now = new Date();
    const snapshotDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // ── Fetch all active pledges ──
    // No need to include items — netWeightOfGold/Silver are on Pledge directly
    const pledges = await prisma.pledge.findMany({
      where: { status: "ACTIVE" },
      include: {
        customer: { select: { userId: true } },
        transactions: { select: { amount: true, type: true } },
      },
    }) as unknown as PledgeRow[];

    const userIds = [...new Set(pledges.map((p) => p.customer.userId))];

    const pledgesByUser = new Map<string, PledgeRow[]>();
    for (const pledge of pledges) {
      const uid = pledge.customer.userId;
      if (!pledgesByUser.has(uid)) pledgesByUser.set(uid, []);
      pledgesByUser.get(uid)!.push(pledge);
    }

    // ── Accumulators ──
    const alertsToCreate: object[] = [];
    const pledgeUpdates: {
      id: string;
      lastAmountOwed: number;
      lastMarketValue: number | null;
      lastCalculatedLtv: number | null;
      lastRiskTier: RiskTier | null;
      lastEvaluatedAt: Date;
    }[] = [];
    const snapshotsToCreate: object[] = [];

    for (const userId of userIds) {
      const userPledges = pledgesByUser.get(userId) ?? [];

      let totalLoanAmount = 0;
      let totalAmountOwed = 0;
      let totalInterestOwed = 0;
      let totalMarketValue = 0;
      let totalGoldWeight = 0;
      let totalSilverWeight = 0;
      let safePledges = 0;
      let watchPledges = 0;
      let atRiskPledges = 0;
      let underwaterPledges = 0;

      for (const pledge of userPledges) {
        // ── Use your actual calculateLTV function ──
        const result = calculateLTV({
          principal:           Number(pledge.loanAmount),
          rate:                Number(pledge.interestRate),
          pledgeDate:          pledge.pledgeDate,
          currentDate:         now,
          allowCompounding:    pledge.allowCompounding,
          compoundingDuration: pledge.compoundingDuration,
          goldWeight:          Number(pledge.netWeightOfGold),
          silverWeight:        Number(pledge.netWeightOfSilver),
          goldPrice,
          silverPrice,
        });

        const { amountOwed, marketValue, ltv, riskTier } = result;
        const oldTier = pledge.lastRiskTier as RiskTier | null;

        // Accumulate totals
        totalLoanAmount += Number(pledge.loanAmount);
        totalAmountOwed += amountOwed;
        totalInterestOwed += amountOwed - Number(pledge.loanAmount);
        if (marketValue !== null) totalMarketValue += marketValue;
        totalGoldWeight += Number(pledge.netWeightOfGold);
        totalSilverWeight += Number(pledge.netWeightOfSilver);

        // Risk tier counts — only if LTV is calculable
        if (riskTier === "SAFE") safePledges++;
        else if (riskTier === "WATCH") watchPledges++;
        else if (riskTier === "AT_RISK") atRiskPledges++;
        else if (riskTier === "UNDERWATER") underwaterPledges++;

        // Alert only if tier actually changed and we have a valid tier
        if (riskTier !== null && oldTier !== riskTier) {
          const alertType =
            riskTier === "UNDERWATER" ? "CRITICAL"
            : riskTier === "AT_RISK" || riskTier === "WATCH" ? "TIER_CHANGE"
            : "INFO";

          alertsToCreate.push({
            userId,
            pledgeId:   pledge.id,
            customerId: pledge.customerId,
            oldTier,
            newTier:    riskTier,
            alertType,
            message:    buildAlertMessage(oldTier, riskTier, ltv!, pledge.id),
          });
        }

        pledgeUpdates.push({
          id:               pledge.id,
          lastAmountOwed:   amountOwed,
          lastMarketValue:  marketValue,
          lastCalculatedLtv: ltv,
          lastRiskTier:     riskTier,
          lastEvaluatedAt:  now,
        });
      }

      // ── Pledge counts ──
      const [totalPledges, releasedPledges, overduePledges] = await Promise.all([
        prisma.pledge.count({ where: { customer: { userId } } }),
        prisma.pledge.count({ where: { customer: { userId }, status: "RELEASED" } }),
        prisma.pledge.count({ where: { customer: { userId }, status: "OVERDUE" } }),
      ]);

      const overallLtv =
        totalMarketValue > 0
          ? Math.round((totalAmountOwed / totalMarketValue) * 10000) / 100
          : null;

     snapshotsToCreate.push({
        userId,
        totalLoanAmount:    new Prisma.Decimal(totalLoanAmount.toFixed(2)),
        totalAmountOwed:    new Prisma.Decimal(totalAmountOwed.toFixed(2)),
        totalInterestOwed:  new Prisma.Decimal(Math.max(0, totalInterestOwed).toFixed(2)),
        totalMarketValue:   new Prisma.Decimal(totalMarketValue.toFixed(2)),
        goldPricePerGram:   new Prisma.Decimal((goldPrice ?? 0).toFixed(2)),
        silverPricePerGram: new Prisma.Decimal((silverPrice ?? 0).toFixed(2)),
        overallLtv:         overallLtv !== null ? new Prisma.Decimal(overallLtv.toFixed(2)) : null,
        totalGoldWeight:    new Prisma.Decimal(totalGoldWeight.toFixed(3)),
        totalSilverWeight:  new Prisma.Decimal(totalSilverWeight.toFixed(3)),
        totalPledges,
        activePledges:      userPledges.length,
        releasedPledges,
        overduePledges,
        safePledges,
        watchPledges,
        atRiskPledges,
        underwaterPledges,
        snapshotDate,
        calculatedAt:       now,
      });
    }

    // ── Dry run ──
    if (dryRun) {
      return NextResponse.json({
        dryRun: true,
        usersProcessed:       userIds.length,
        pledgesProcessed:     pledges.length,
        alertsWouldCreate:    alertsToCreate.length,
        snapshotsWouldCreate: snapshotsToCreate.length,
        alerts:               alertsToCreate,
      });
    }

    // ── Commit ──
    await prisma.$transaction(async (tx) => {
      // 1. Update cached pledge metrics
      await Promise.all(
        pledgeUpdates.map((p) =>
          tx.pledge.update({
            where: { id: p.id },
            data: {
              lastAmountOwed:    p.lastAmountOwed,
              lastMarketValue:   p.lastMarketValue,
              lastCalculatedLtv: p.lastCalculatedLtv,
              lastRiskTier:      p.lastRiskTier,
              lastEvaluatedAt:   p.lastEvaluatedAt,
            },
          })
        )
      );

      // 2. Create tier-change alerts
      if (alertsToCreate.length > 0) {
        await tx.pledgeAlert.createMany({ data: alertsToCreate as any });
      }

      // 3. Upsert snapshots — safe if cron runs twice in one day
      for (const snapshot of snapshotsToCreate as any[]) {
        await tx.financialSnapshot.upsert({
          where: {
            userId_snapshotDate: {
              userId:       snapshot.userId,
              snapshotDate: snapshot.snapshotDate,
            },
          },
          update: snapshot,
          create: snapshot,
        });
      }
    });

    return NextResponse.json({
      success:          true,
      usersProcessed:   userIds.length,
      pledgesProcessed: pledges.length,
      alertsCreated:    alertsToCreate.length,
      snapshotsCreated: snapshotsToCreate.length,
    });

  } catch (error) {
    console.error("[evaluate-risk] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}