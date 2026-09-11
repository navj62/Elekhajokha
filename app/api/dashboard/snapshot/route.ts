// app/api/dashboard/snapshot/route.ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { calculateHybridInterest } from "@/lib/interest";
import type { CompoundingDuration } from "@prisma/client";

export async function GET() {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkUserId },
      select: { id: true, firstName: true, shopName: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const [
      snapshots,
      mtdNewPledges,
      mtdReleasedPledges,
      mtdLoanAmount,
      totalCustomers,
      totalActivePledges,
      totalActiveLoanAmount,
      totalReleasedLoanAmount,
      openPledges,
      recentPledgesRaw,
      regionsDataRaw,
      unreadAlerts,
      pledgesAddedThisYear,
      pledgesReleasedThisYear,
      transactionsThisYear,
      customersThisYear,
    ] = await Promise.all([
      prisma.financialSnapshot.findMany({
        where: { userId: user.id },
        orderBy: { calculatedAt: "desc" },
        take: 2,
      }),
      // MTD new pledges — keyed by pledgeDate (EVENT time: when the loan was
      // booked), not createdAt (RECORDING time: when the row was written).
      // The migration seed let createdAt default to now() on import, so every
      // migrated pledge's createdAt is the 2026-07-26 import day regardless of
      // when it was actually booked — bucketing on it would have shown ~9,630
      // "new pledges this month" throughout that July. Not currently visible
      // (September's MTD window post-dates the import on both clocks), but
      // latent for any future bulk import.
      prisma.pledge.count({
        where: { customer: { userId: user.id }, pledgeDate: { gte: startOfMonth } },
      }),
      prisma.pledge.count({
        where: { customer: { userId: user.id }, status: "RELEASED", releaseDate: { gte: startOfMonth } },
      }),
      // MTD loan amount — same pledgeDate-vs-createdAt reasoning as the count
      // above; keep both MTD pledge queries on the same clock.
      prisma.pledge.aggregate({
        where: { customer: { userId: user.id }, pledgeDate: { gte: startOfMonth } },
        _sum: { loanAmount: true },
      }),
      prisma.customer.count({
        where: { userId: user.id, deletedAt: null },
      }),
      prisma.pledge.count({
        where: { customer: { userId: user.id }, status: "ACTIVE" },
      }),
      prisma.pledge.aggregate({
        where: { customer: { userId: user.id }, status: "ACTIVE" },
        _sum: { loanAmount: true },
      }),
      prisma.pledge.aggregate({
        where: { customer: { userId: user.id }, status: "RELEASED" },
        _sum: { loanAmount: true },
      }),
      // Amount owed on the open book, computed LIVE (Invariant 8 — the engine
      // is called, never reimplemented). This deliberately does NOT read
      // Pledge.lastAmountOwed: that column is written only by the evaluate-risk
      // cron, so it is NULL for every pledge booked since the last sweep and
      // stale by up to a full sweep interval for the rest. SQL SUM skips NULLs,
      // which silently rendered "not yet valued" as ₹0.
      //
      // The select carries exactly what calculateHybridInterest needs. Same
      // where clause as the count and loan-amount aggregates above — do not
      // diverge. Cost measured at ~2.3ms of CPU over a 1,221-pledge book.
      prisma.pledge.findMany({
        where: { customer: { userId: user.id }, status: "ACTIVE" },
        select: {
          id: true,
          loanAmount: true,
          interestRate: true,
          pledgeDate: true,
          allowCompounding: true,
          compoundingDuration: true,
        },
      }),
      prisma.pledge.findMany({
        where: { customer: { userId: user.id } },
        orderBy: { createdAt: "desc" },
        take: 4,
        include: { customer: true },
      }),
      // Regions
      prisma.customer.groupBy({
        by: ["region"],
        where: { userId: user.id, deletedAt: null },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 3,
      }),
      // Tasks
      prisma.pledgeAlert.findMany({
        where: { userId: user.id, isRead: false },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      // Charts — pledges added, keyed by pledgeDate (EVENT time), not
      // createdAt (RECORDING time). This chart answers "when did this
      // happen", and pledgeDate is the only column that answers that
      // truthfully for migrated rows (see the MTD comment above).
      //
      // This used to be one query (`pledgesThisYear`, filtered on createdAt)
      // feeding both the added and released series. It is now split in two,
      // each filtered on the clock it buckets on — matching 75711dd's fix to
      // monthly-performance. Filtering on one clock while bucketing on
      // another is worse than consistently using either: today, filtering
      // this on createdAt happens to also catch every 2026 release only
      // because the entire ledger was imported in July 2026 — that accident
      // reverses in 2027, when a createdAt-scoped filter would silently drop
      // real releases from the chart.
      prisma.pledge.findMany({
        where: { customer: { userId: user.id }, pledgeDate: { gte: yearStart } },
        select: { pledgeDate: true },
      }),
      // Charts — pledges released. releaseDate is set on both RELEASED and
      // SOLD closures (Invariant 12), and this series has always counted
      // both — no status filter here, matching prior behavior exactly.
      prisma.pledge.findMany({
        where: { customer: { userId: user.id }, releaseDate: { gte: yearStart } },
        select: { releaseDate: true },
      }),
      prisma.transaction.findMany({
        where: { pledge: { customer: { userId: user.id } }, createdAt: { gte: yearStart } },
        select: { amount: true, type: true, createdAt: true },
      }),
      // Charts — new customers, keyed by createdAt. Customer has no
      // event-time column other than createdAt — no acquisition date, no
      // "signed up on" field — so for the 2,101 migrated customers this
      // series reflects IMPORT date (2026-07-26), not true acquisition date.
      // (MIN(pledgeDate) per customer was considered and rejected: it
      // excludes the 14 migrated customers who have zero pledges and
      // silently redefines "new customer" as "first-time borrower.") Same
      // limitation 75711dd already accepted for monthly-performance's query
      // D — left as-is here for the same reason, not an oversight.
      prisma.customer.findMany({
        where: { userId: user.id, createdAt: { gte: yearStart } },
        select: { createdAt: true },
      }),
    ]);

    const today = snapshots[0] ?? null;
    const yesterday = snapshots[1] ?? null;

    const ltvChange =
      today?.overallLtv !== null &&
      yesterday?.overallLtv !== null &&
      today !== null &&
      yesterday !== null
        ? Number(today.overallLtv) - Number(yesterday.overallLtv)
        : null;

    // Sum of amount owed across the open book, at this instant.
    //
    // `null` means "there is nothing to total" — the shop holds no ACTIVE
    // pledge — and the card renders it as an em-dash rather than ₹0. A real
    // ₹0 is now unreachable here: an open pledge always owes at least its
    // principal, so a numeric 0 would require an open book of zero-value
    // loans. Do not collapse this null to 0 downstream.
    const totalBalanceAmount =
      openPledges.length === 0
        ? null
        : openPledges.reduce(
            (sum, p) =>
              sum +
              calculateHybridInterest(
                Number(p.loanAmount),
                Number(p.interestRate),
                p.pledgeDate,
                now,
                p.allowCompounding,
                p.compoundingDuration as CompoundingDuration
              ).receivableAmount,
            0
          );

    const stats = {
      totalCustomers,
      totalActivePledges,
      totalActiveLoanAmount: Number(totalActiveLoanAmount._sum.loanAmount ?? 0),
      totalReleasedLoanAmount: Number(totalReleasedLoanAmount._sum.loanAmount ?? 0),
      totalBalanceAmount,
    };

    const recentPledges = recentPledgesRaw.map((p) => ({
      id: p.id,
      pledgeId: `#PL-${p.id.split("-")[0].toUpperCase()}`,
      customerName: p.customer.name,
      initials:
        p.customer.name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .substring(0, 2) || "U",
      customerId: p.customer.id,
      pledgeDate: p.pledgeDate.toISOString().split("T")[0],
      loanAmount: Number(p.loanAmount),
      releaseDate: p.releaseDate ? p.releaseDate.toISOString().split("T")[0] : null,
      // The pledge's real status. Do not remap to invented labels — an ACTIVE
      // pledge is not "Processing", and SOLD is not "On Hold".
      status: p.status,
    }));

    // Regions mapping
    const regions = regionsDataRaw.map((r) => ({
      name: r.region || "Unknown",
      count: r._count.id,
    }));

    // This dashboard snapshot always reports an empty tasks array. The real
    // Task model and /api/tasks CRUD routes exist and work (see the Tasks
    // module) — this field is simply disconnected from them, not a stub for
    // a missing model.
    const tasks: { id: string, text: string, done: boolean, createdAt: string }[] = [];

    // Chart aggregations
    const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    const currentMonthIdx = now.getMonth();
    
    // Initialize chart arrays up to current month
    const chartPledges = Array.from({ length: currentMonthIdx + 1 }, (_, i) => ({ month: monthNames[i], added: 0, released: 0 }));
    const chartLoans = Array.from({ length: currentMonthIdx + 1 }, (_, i) => ({ month: monthNames[i], disbursed: 0, recovered: 0 }));
    const chartCustomers = Array.from({ length: currentMonthIdx + 1 }, (_, i) => ({ month: monthNames[i], added: 0 }));

    pledgesAddedThisYear.forEach((p) => {
      const mIdx = p.pledgeDate.getMonth();
      if (mIdx <= currentMonthIdx) chartPledges[mIdx].added++;
    });

    pledgesReleasedThisYear.forEach((p) => {
      if (!p.releaseDate) return;
      const rIdx = p.releaseDate.getMonth();
      if (rIdx <= currentMonthIdx) chartPledges[rIdx].released++;
    });

    // In Loan charts, we can approximate disbursed from pledges if we don't have separate DISBURSEMENT transactions.
    // The spec said "Total Disbursed, Recovered Amount, Recovery Rate, from actual transactions."
    // Let's use pledges for disbursed and transactions for recovered.

    // Fetch full pledges for loan amount — keyed by pledgeDate (EVENT time),
    // not createdAt (RECORDING time), for the same reason as the added-chart
    // query above: this answers "how much was disbursed when", and createdAt
    // says only "when was this row written".
    const fullPledgesThisYear = await prisma.pledge.findMany({
      where: { customer: { userId: user.id }, pledgeDate: { gte: yearStart } },
      select: { pledgeDate: true, loanAmount: true },
    });

    fullPledgesThisYear.forEach((p) => {
      const mIdx = p.pledgeDate.getMonth();
      if (mIdx <= currentMonthIdx) chartLoans[mIdx].disbursed += Number(p.loanAmount);
    });

    transactionsThisYear.forEach((t) => {
      const mIdx = t.createdAt.getMonth();
      if (mIdx <= currentMonthIdx) {
        if (t.type === "REPAYMENT_PRINCIPAL" || t.type === "REPAYMENT_INTEREST") {
          chartLoans[mIdx].recovered += Number(t.amount);
        } else if (t.type === "TOPUP") {
          chartLoans[mIdx].disbursed += Number(t.amount);
        }
      }
    });

    customersThisYear.forEach((c) => {
      const mIdx = c.createdAt.getMonth();
      if (mIdx <= currentMonthIdx) chartCustomers[mIdx].added++;
    });

    // Summary totals for Loan Amount
    const totalDisbursed = chartLoans.reduce((sum, item) => sum + item.disbursed, 0);
    const totalRecovered = chartLoans.reduce((sum, item) => sum + item.recovered, 0);
    const recoveryRate = totalDisbursed > 0 ? (totalRecovered / totalDisbursed) * 100 : 0;

    return NextResponse.json({
      user: {
        firstName: user.firstName,
        shopName: user.shopName,
      },
      snapshot: today,
      trend: {
        ltvChange: ltvChange !== null ? Math.round(ltvChange * 100) / 100 : null,
        direction: ltvChange === null ? null : ltvChange > 0 ? "up" : ltvChange < 0 ? "down" : "flat",
      },
      mtd: {
        newPledges: mtdNewPledges,
        releasedPledges: mtdReleasedPledges,
        loanAmount: Number(mtdLoanAmount._sum.loanAmount ?? 0),
      },
      stats,
      recentPledges,
      portfolio: today
        ? {
            goldWeightGrams: Number(today.totalGoldWeight),
            silverWeightGrams: Number(today.totalSilverWeight),
            goldPricePerGram: Number(today.goldPricePerGram),
            silverPricePerGram: Number(today.silverPricePerGram),
            goldValue: Number(today.totalGoldWeight) * Number(today.goldPricePerGram),
            silverValue: Number(today.totalSilverWeight) * Number(today.silverPricePerGram),
            totalMarketValue: Number(today.totalMarketValue),
            snapshotDate: today.snapshotDate,
          }
        : null,
      regions,
      tasks,
      charts: {
        pledges: chartPledges,
        loans: chartLoans,
        customers: chartCustomers,
        loanSummary: {
          totalDisbursed,
          totalRecovered,
          recoveryRate,
        }
      }
    });
  } catch (err: unknown) {
    console.error("Dashboard Snapshot Error:", err);
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 });
  }
}