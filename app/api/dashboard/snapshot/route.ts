// app/api/dashboard/snapshot/route.ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkUserId },
      select: { id: true },
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
      totalBalanceAmount,
      recentPledgesRaw,
      goldItemsCount,
      silverItemsCount,
      regionsDataRaw,
      unreadAlerts,
      pledgesThisYear,
      transactionsThisYear,
      customersThisYear,
      transactionsAggr,
      customerLoanAggr,
      customerActivePledgesAggr,
      customerDetailsRaw,
      releaseAuditsThisYear,
      goldWeightAggr,
      silverWeightAggr,
    ] = await Promise.all([
      prisma.financialSnapshot.findMany({
        where: { userId: user.id },
        orderBy: { calculatedAt: "desc" },
        take: 2,
      }),
      prisma.pledge.count({
        where: { customer: { userId: user.id }, createdAt: { gte: startOfMonth } },
      }),
      prisma.pledge.count({
        where: { customer: { userId: user.id }, status: "RELEASED", releaseDate: { gte: startOfMonth } },
      }),
      prisma.pledge.aggregate({
        where: { customer: { userId: user.id }, createdAt: { gte: startOfMonth } },
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
      prisma.pledge.aggregate({
        where: { customer: { userId: user.id }, status: "ACTIVE" },
        _sum: { lastAmountOwed: true },
      }),
      prisma.pledge.findMany({
        where: { customer: { userId: user.id } },
        orderBy: { createdAt: "desc" },
        take: 4,
        include: { customer: true, items: { take: 1 } },
      }),
      // Portfolio Items
      prisma.pledgeItem.count({
        where: { metalType: "GOLD", pledge: { customer: { userId: user.id }, status: { not: "RELEASED" } } },
      }),
      prisma.pledgeItem.count({
        where: { metalType: "SILVER", pledge: { customer: { userId: user.id }, status: { not: "RELEASED" } } },
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
      // Charts
      prisma.pledge.findMany({
        where: { customer: { userId: user.id }, createdAt: { gte: yearStart } },
        select: { createdAt: true, releaseDate: true, status: true },
      }),
      prisma.transaction.findMany({
        where: { pledge: { customer: { userId: user.id } }, createdAt: { gte: yearStart } },
        select: { amount: true, type: true, createdAt: true },
      }),
      prisma.customer.findMany({
        where: { userId: user.id, createdAt: { gte: yearStart } },
        select: { createdAt: true },
      }),
      prisma.transaction.groupBy({
        by: ["type"],
        where: { pledge: { customer: { userId: user.id } } },
        _sum: { amount: true },
      }),
      prisma.pledge.groupBy({
        by: ["customerId"],
        where: { customer: { userId: user.id } },
        _sum: { loanAmount: true },
      }),
      prisma.pledge.groupBy({
        by: ["customerId"],
        where: { customer: { userId: user.id }, status: "ACTIVE" },
        _count: { id: true },
      }),
      prisma.customer.findMany({
        where: { userId: user.id, deletedAt: null },
        select: { id: true, name: true, mobile: true, customerImg: true, createdAt: true },
      }),
      prisma.pledgeAudit.findMany({
        where: {
          pledge: { customer: { userId: user.id } },
          action: "RELEASED",
          createdAt: { gte: yearStart },
        },
        select: {
          createdAt: true,
          totalInterest: true,
        },
      }),
      prisma.pledgeItem.aggregate({
        where: { metalType: "GOLD", pledge: { customer: { userId: user.id }, status: { not: "RELEASED" } } },
        _sum: { netWeight: true },
      }),
      prisma.pledgeItem.aggregate({
        where: { metalType: "SILVER", pledge: { customer: { userId: user.id }, status: { not: "RELEASED" } } },
        _sum: { netWeight: true },
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

    const totalInterestCollected = Number(transactionsAggr?.find((t: any) => t.type === "REPAYMENT_INTEREST")?._sum?.amount ?? 0);
    const totalPrincipalCollected = Number(transactionsAggr?.find((t: any) => t.type === "REPAYMENT_PRINCIPAL")?._sum?.amount ?? 0);

    const stats = {
      totalCustomers,
      totalActivePledges,
      totalActiveLoanAmount: Number(totalActiveLoanAmount._sum.loanAmount ?? 0),
      totalReleasedLoanAmount: Number(totalReleasedLoanAmount._sum.loanAmount ?? 0),
      totalBalanceAmount: Number(totalBalanceAmount._sum.lastAmountOwed ?? 0),
      totalInterestSecured: totalInterestCollected + Number(today?.totalInterestOwed ?? 0),
      totalMarketValue: Number(today?.totalMarketValue ?? 0),
      totalAmountRecovered: totalPrincipalCollected + totalInterestCollected,
    };

    const recentPledges = recentPledgesRaw.map((p) => {
      const firstItem = p.items?.[0];
      let itemDesc = "Unknown";
      if (firstItem) {
        if (firstItem.itemName) itemDesc = firstItem.itemName;
        else {
          const typeStr = firstItem.itemType.toLowerCase();
          const metalStr = firstItem.metalType.toLowerCase();
          itemDesc = `${metalStr.charAt(0).toUpperCase() + metalStr.slice(1)} ${typeStr.charAt(0).toUpperCase() + typeStr.slice(1)}`;
        }
      }

      return {
        id: p.id,
        customerId: p.customerId,
        pledgeId: `#PL-${p.id.split("-")[0].toUpperCase()}`,
        customerName: p.customer.name,
        initials:
          p.customer.name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .substring(0, 2) || "U",
        pledgeItem: itemDesc,
        pledgeDate: p.pledgeDate.toISOString().split("T")[0],
        loanAmount: Number(p.loanAmount),
        releaseDate: p.releaseDate ? p.releaseDate.toISOString().split("T")[0] : null,
        status: p.status === "ACTIVE" ? "Processing" : p.status === "RELEASED" ? "Released" : "On Hold",
      };
    });

    // Regions mapping
    const regions = regionsDataRaw.map((r) => ({
      name: r.region || "Unknown",
      count: r._count.id,
    }));

    // Tasks mapping (No Task model exists currently, so we return empty array)
    const tasks: { id: string, text: string, done: boolean, createdAt: string }[] = [];

    // Chart aggregations
    const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    const currentMonthIdx = now.getMonth();
    
    // Initialize chart arrays up to current month
    const chartPledges = Array.from({ length: currentMonthIdx + 1 }, (_, i) => ({ month: monthNames[i], added: 0, released: 0 }));
    const chartLoans = Array.from({ length: currentMonthIdx + 1 }, (_, i) => ({ month: monthNames[i], disbursed: 0, recovered: 0 }));
    const chartCustomers = Array.from({ length: currentMonthIdx + 1 }, (_, i) => ({ month: monthNames[i], added: 0 }));
    const chartInterest = Array.from({ length: currentMonthIdx + 1 }, (_, i) => ({ month: monthNames[i], collected: 0 }));

    pledgesThisYear.forEach((p) => {
      const mIdx = p.createdAt.getMonth();
      if (mIdx <= currentMonthIdx) chartPledges[mIdx].added++;
      if (p.releaseDate) {
        const rIdx = p.releaseDate.getMonth();
        if (rIdx <= currentMonthIdx) chartPledges[rIdx].released++;
      }
    });

    // In Loan charts, we can approximate disbursed from pledges if we don't have separate DISBURSEMENT transactions.
    // The spec said "Total Disbursed, Recovered Amount, Recovery Rate, from actual transactions."
    // Let's use pledges for disbursed and transactions for recovered.
    pledgesThisYear.forEach((p) => {
      const mIdx = p.createdAt.getMonth();
      // Assuming we need actual amount. But graph needs concise numbers, we will pass raw numbers.
      // Wait, we need the pledge amount for disbursed.
    });

    // Actually, let's fetch full pledges for loan amount
    const fullPledgesThisYear = await prisma.pledge.findMany({
      where: { customer: { userId: user.id }, createdAt: { gte: yearStart } },
      select: { createdAt: true, loanAmount: true },
    });

    fullPledgesThisYear.forEach((p) => {
      const mIdx = p.createdAt.getMonth();
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

    releaseAuditsThisYear.forEach((a) => {
      const mIdx = a.createdAt.getMonth();
      if (mIdx <= currentMonthIdx) {
        chartInterest[mIdx].collected += Number(a.totalInterest ?? 0);
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

    // Top Customers Logic
    const customerMap = new Map(customerDetailsRaw.map((c) => [c.id, c]));

    const aggregatedCustomers = customerDetailsRaw.map((c) => {
      const loanData = customerLoanAggr.find((l) => l.customerId === c.id);
      const activeData = customerActivePledgesAggr.find((a) => a.customerId === c.id);
      return {
        id: c.id,
        name: c.name,
        mobile: c.mobile,
        customerImg: c.customerImg,
        createdAt: c.createdAt,
        totalLoanAmount: Number(loanData?._sum.loanAmount ?? 0),
        activePledges: Number(activeData?._count.id ?? 0),
      };
    });

    const topByLoanTaken = [...aggregatedCustomers]
      .sort((a, b) => {
        if (b.totalLoanAmount !== a.totalLoanAmount) return b.totalLoanAmount - a.totalLoanAmount;
        if (b.activePledges !== a.activePledges) return b.activePledges - a.activePledges;
        return a.createdAt.getTime() - b.createdAt.getTime();
      })
      .slice(0, 3);

    const topByActivePledges = [...aggregatedCustomers]
      .sort((a, b) => {
        if (b.activePledges !== a.activePledges) return b.activePledges - a.activePledges;
        if (b.totalLoanAmount !== a.totalLoanAmount) return b.totalLoanAmount - a.totalLoanAmount;
        return a.createdAt.getTime() - b.createdAt.getTime();
      })
      .slice(0, 3);

    return NextResponse.json({
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
      topCustomers: {
        byLoanTaken: topByLoanTaken,
        byActivePledges: topByActivePledges,
      },
      portfolio: {
        goldItems: goldItemsCount,
        silverItems: silverItemsCount,
        goldWeight: Number(goldWeightAggr._sum.netWeight ?? 0),
        silverWeight: Number(silverWeightAggr._sum.netWeight ?? 0),
      },
      regions,
      tasks,
      charts: {
        pledges: chartPledges,
        loans: chartLoans,
        customers: chartCustomers,
        interest: chartInterest,
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