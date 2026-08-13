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

const DAY_MS = 1000 * 60 * 60 * 24;

// Display label for a pledge, taken from its first item. Used by the open,
// settled, and sold lists so one pledge reads the same name everywhere.
function pledgeLabel(
  items: { itemName: string | null; itemType: string; metalType: string }[]
): string {
  const first = items[0];
  if (!first) return "Pledge";
  return first.itemName ?? `${first.itemType} (${first.metalType})`;
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

    /* ── Prices, settlement history, sold pledges, repayment ledger ──
       All four are ownership-scoped through the customer 404 guard above. */
    const [goldPrice, silverPrice, settlementAudits, soldPledges, repaymentGroups] =
      await Promise.all([
        prisma.metalPrice.findFirst({
          where: { metal: "GOLD" },
          orderBy: { createdAt: "desc" },
          select: { inrPerGram: true },
        }),
        prisma.metalPrice.findFirst({
          where: { metal: "SILVER" },
          orderBy: { createdAt: "desc" },
          select: { inrPerGram: true },
        }),
        // Settled releases. These are finalized financial records snapshotted
        // at release — never recomputed here. action:"RELEASED" excludes SOLD
        // audit rows, which are structurally identical but a different event.
        prisma.pledgeAudit.findMany({
          where: { pledge: { customerId }, action: "RELEASED" },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            createdAt: true,
            releaseDate: true,
            principal: true,
            totalInterest: true,
            receivableAmount: true,
            ltvAtRelease: true,
            pledge: {
              select: {
                id: true,
                pledgeDate: true,
                items: {
                  select: { itemName: true, itemType: true, metalType: true },
                  take: 1,
                },
              },
            },
          },
        }),
        // SOLD pledges and the inventory item each became. Deliberately a
        // SEPARATE query from the risk pipeline below: SOLD pledges must never
        // reach the customer risk score or the active-exposure aggregates.
        prisma.pledge.findMany({
          where: { customerId, status: "SOLD" },
          orderBy: { pledgeDate: "desc" },
          select: {
            id: true,
            pledgeDate: true,
            items: {
              select: { itemName: true, itemType: true, metalType: true },
              take: 1,
            },
            inventoryItem: {
              select: {
                id: true,
                acquiredAt: true,
                acquiredCost: true,
                amountOwedAt: true,
                status: true,
              },
            },
          },
        }),
        // Part-payment ledger. NOTE: transactions are a record of receipts and
        // are NOT applied to interest accrual — never net these against owed.
        prisma.transaction.groupBy({
          by: ["type"],
          where: { pledge: { customerId } },
          _sum: { amount: true },
          _count: { _all: true },
        }),
      ]);

    const goldPerGram = goldPrice ? Number(goldPrice.inrPerGram) : null;
    const silverPerGram = silverPrice ? Number(silverPrice.inrPerGram) : null;

    /* ── All pledges for this customer (scoped via customer guard above) ── */
    const pledges = await prisma.pledge.findMany({
      where: { customerId, status: { not: "SOLD" } },
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

    // Per-pledge time-to-underwater is no longer a table column — the
    // dashboard owns time-to-trouble. Only the worst case across open pledges
    // survives: it feeds the composite risk score and is shown as one line on
    // the risk card, labelled approximate because this is a simple-interest
    // estimate that understates compounding pledges.
    let daysToUnderwaterWorst: number | null = null;

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

      return {
        id: p.id,
        name: pledgeLabel(p.items),
        pledgeDate: p.pledgeDate.toISOString(),
        status: p.status,
        loanAmount,
        amountOwed,
        marketValue,
        ltv,
        risk,
        goldWeight,
        silverWeight,
      };
    });

    // processed is a 1:1 map of pledges, so index alignment holds. The rate
    // lives only on the raw row, which is why this reads from both.
    pledges.forEach((p, i) => {
      if (p.status !== "ACTIVE" && p.status !== "OVERDUE") return;
      const row = processed[i];
      const { days } = buildTimeToUnderwater(
        p.status,
        row.loanAmount,
        Number(p.interestRate),
        row.amountOwed,
        row.marketValue
      );
      if (days === null) return;
      if (daysToUnderwaterWorst === null || days < daysToUnderwaterWorst) {
        daysToUnderwaterWorst = days;
      }
    });

    /* ── Portfolio aggregates ──────────────────────────────────── */
    const activePledges = processed.filter((p) => p.status === "ACTIVE" || p.status === "OVERDUE");
    const releasedPledges = processed.filter((p) => p.status === "RELEASED");

    const totalLoanAmount = activePledges.reduce((s, p) => s + p.loanAmount, 0);
    const totalAmountOwed = activePledges.reduce((s, p) => s + p.amountOwed, 0);
    const totalMarketValue = activePledges.reduce(
      (s, p) => s + (p.marketValue ?? 0),
      0
    );

    // Sum each metal independently. A mixed pledge (both gold AND silver)
    // contributes to BOTH totals — do not classify it by a single
    // dominant metalType, which dropped the smaller metal's weight.
    const totalGoldWeight = activePledges.reduce((s, p) => s + p.goldWeight, 0);
    const totalSilverWeight = activePledges.reduce((s, p) => s + p.silverWeight, 0);

    const overallLTV =
      totalMarketValue > 0
        ? parseFloat(((totalAmountOwed / totalMarketValue) * 100).toFixed(2))
        : null;

    // Drivers behind the composite score, surfaced so the number is readable
    // rather than opaque. Both are plain maxima over open pledges — the score
    // itself still comes only from computeCustomerRiskScore.
    const worstLtv = activePledges.reduce<number | null>(
      (worst, p) =>
        p.ltv === null ? worst : worst === null ? p.ltv : Math.max(worst, p.ltv),
      null
    );

    const longestDaysHeld = activePledges.reduce<number | null>((max, p) => {
      const held = Math.floor((now.getTime() - new Date(p.pledgeDate).getTime()) / DAY_MS);
      return max === null || held > max ? held : max;
    }, null);

    /* ── Settled releases — realised performance ───────────────────
       Every figure here is read from the audit row written at release, not
       recomputed. Interest already collected is the one number that says
       whether lending to this customer has actually paid. */
    const settlements = settlementAudits.map((a) => {
      const principal = Number(a.principal);
      const interestEarned = Number(a.totalInterest ?? 0);
      const settledOn = a.releaseDate ?? a.createdAt;
      const daysHeld = Math.max(
        0,
        Math.round((settledOn.getTime() - a.pledge.pledgeDate.getTime()) / DAY_MS)
      );

      return {
        id: a.id,
        pledgeId: a.pledge.id,
        name: pledgeLabel(a.pledge.items),
        pledgeDate: a.pledge.pledgeDate.toISOString(),
        settledOn: settledOn.toISOString(),
        daysHeld,
        principal,
        interestEarned,
        ltvAtRelease: a.ltvAtRelease !== null ? Number(a.ltvAtRelease) : null,
        // Interest as a share of principal advanced. Null on a zero principal
        // so the UI renders "—" rather than a divide-by-zero artefact.
        returnPct:
          principal > 0
            ? parseFloat(((interestEarned / principal) * 100).toFixed(2))
            : null,
      };
    });

    const lifetimeInterestEarned = settlements.reduce((s, r) => s + r.interestEarned, 0);
    const lifetimeReleasedPledges = settlements.length;
    const principalSettled = settlements.reduce((s, r) => s + r.principal, 0);

    const realisedReturnPct =
      principalSettled > 0
        ? parseFloat(((lifetimeInterestEarned / principalSettled) * 100).toFixed(2))
        : null;

    const avgDaysHeld =
      settlements.length > 0
        ? Math.round(settlements.reduce((s, r) => s + r.daysHeld, 0) / settlements.length)
        : null;

    /* ── Sold to shop ──────────────────────────────────────────────
       Net position and cash paid are derived here for display only and are
       never stored (Invariant 11). amountOwedAt is the snapshot taken at the
       sale date — it is read, never recomputed. */
    const soldToShop = soldPledges.map((p) => {
      const inv = p.inventoryItem;
      const acquiredCost = inv ? Number(inv.acquiredCost) : null;
      const amountOwedAt =
        inv && inv.amountOwedAt !== null ? Number(inv.amountOwedAt) : null;
      const bothKnown = acquiredCost !== null && amountOwedAt !== null;

      return {
        pledgeId: p.id,
        inventoryItemId: inv?.id ?? null,
        name: pledgeLabel(p.items),
        pledgeDate: p.pledgeDate.toISOString(),
        closedOn: inv ? inv.acquiredAt.toISOString() : null,
        amountOwedAt,
        acquiredCost,
        netPosition: bothKnown ? acquiredCost - amountOwedAt : null,
        cashToCustomer: bothKnown ? Math.max(acquiredCost - amountOwedAt, 0) : null,
        resold: inv?.status === "SOLD",
      };
    });

    /* ── Repayment ledger ─────────────────────────────────────────── */
    const repayments = repaymentGroups.map((g) => ({
      type: g.type,
      count: g._count._all,
      amount: Number(g._sum.amount ?? 0),
    }));
    const repaymentTotal = repayments.reduce((s, r) => s + r.amount, 0);
    const repaymentCount = repayments.reduce((s, r) => s + r.count, 0);

    /* ── Composite risk score ──────────────────────────────────── */
    // Composite risk score: weighted sum of LTV, interest velocity,
    // time-to-underwater, concentration, and average pledge age.
    // Velocity uses TODAY's market value at both timepoints — it
    // measures interest accrual pressure, not price-driven LTV change.

    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    let totalAmountOwed30dAgo = 0;
    for (const rawPledge of pledges.filter((p) => p.status === "ACTIVE" || p.status === "OVERDUE")) {
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

    /* ── Final response ────────────────────────────────────────── */
    return NextResponse.json({
      customer: {
        name: customer.name,
        region: customer.region,
        lifetimeReleasedPledges,
      },
      // Score and tier come straight from computeCustomerRiskScore; the three
      // drivers beside them explain it without restating its internal weights.
      risk: {
        score: riskResult.score,
        tier: riskResult.tier,
        worstLtv,
        longestDaysHeld,
        daysToUnderwaterWorst,
      },
      metrics: {
        totalLoanAmount,
        totalAmountOwed: parseFloat(totalAmountOwed.toFixed(2)),
        totalGoldWeight: parseFloat(totalGoldWeight.toFixed(3)),
        totalSilverWeight: parseFloat(totalSilverWeight.toFixed(3)),
        activePledges: activePledges.length,
        overallLTV,
        totalMarketValue: parseFloat(totalMarketValue.toFixed(2)),
      },
      // Realised performance across every settled release.
      realised: {
        principalSettled: parseFloat(principalSettled.toFixed(2)),
        interestEarned: parseFloat(lifetimeInterestEarned.toFixed(2)),
        returnPct: realisedReturnPct,
        avgDaysHeld,
      },
      // How this customer's pledges have ended. `settlementsCovered` is the
      // number of releases with an audit row behind them; when it trails
      // `released`, the settlement table is showing less than the full history
      // and the UI says so rather than implying the gap is zero.
      disposition: {
        open: activePledges.length,
        released: releasedPledges.length,
        sold: soldPledges.length,
        settlementsCovered: settlements.length,
      },
      repayments: {
        byType: repayments,
        total: parseFloat(repaymentTotal.toFixed(2)),
        count: repaymentCount,
      },
      settlements,
      soldToShop,
      pledges: processed,
    });
  } catch (err: unknown) {
    console.error("FINANCIAL SUMMARY ERROR:", err);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}