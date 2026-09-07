import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { clerkUserId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        shopName: true,
        subscriptionStatus: true,
        subscriptionEndDate: true,
      },
    });
    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Total customers
    const totalCustomers = await prisma.customer.count({
      where: { userId: user.id, deletedAt: null },
    });

    // Pledge aggregates
    const allPledges = await prisma.pledge.findMany({
      where: { customer: { userId: user.id } },
      select: {
        id: true,
        loanAmount: true,
        status: true,
        pledgeDate: true,
        releaseDate: true,
        receivableAmount: true,
        totalInterest: true,
      },
    });

    const activePledges = allPledges.filter((p) => p.status === "ACTIVE");
    const releasedPledges = allPledges.filter((p) => p.status === "RELEASED");

    const totalActiveLoanAmount = activePledges.reduce(
      (sum, p) => sum + Number(p.loanAmount),
      0
    );

    const totalReleasedLoanAmount = releasedPledges.reduce(
      (sum, p) => sum + Number(p.loanAmount),
      0
    );

    // Sum of loanAmount over ACTIVE pledges — PRINCIPAL ONLY, no accrued
    // interest. Pledge.receivableAmount is written only at closure (release /
    // bulk-release / sell), so it is null for every open pledge and the ternary
    // below always falls through to loanAmount.
    //
    // NAMED `totalActivePrincipalAmount`, deliberately not "balance". It was
    // called `totalBalanceAmount` — the SAME key, in the SAME `stats` object,
    // that /api/dashboard/snapshot returns as a live-accrued `number | null`
    // where null means "unknown, render an em-dash". Two different quantities
    // under one name, and swapping the routes would have shown principal where
    // interest was meant with no type error to catch it. The name now states
    // what the number is.
    //
    // Still has NO consumer: app/reports/page.tsx is the only reader of this
    // route and destructures totalCustomers, totalActivePledges and
    // totalActiveLoanAmount only. Before wiring it to any UI: compute accrual
    // via calculateHybridInterest (needs interestRate, allowCompounding and
    // compoundingDuration added to the select above), and note the filter
    // matches status === "ACTIVE" only, excluding OVERDUE. If what you actually
    // want is the accrued figure, read /api/dashboard/snapshot instead of
    // growing a second implementation here.
    const totalActivePrincipalAmount = activePledges.reduce((sum, p) => {
      const receivable = p.receivableAmount ? Number(p.receivableAmount) : 0;
      return sum + (receivable > 0 ? receivable : Number(p.loanAmount));
    }, 0);

    // Recent pledges (latest 5) with customer info
    const recentPledges = await prisma.pledge.findMany({
      where: { customer: { userId: user.id } },
      include: {
        customer: { select: { name: true, customerImg: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    // Monthly loan data for chart (last 6 months)
    const now = new Date();
    const monthlyData: { month: string; amount: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const monthPledges = allPledges.filter((p) => {
        const pd = new Date(p.pledgeDate);
        return pd >= date && pd < nextMonth;
      });
      const amount = monthPledges.reduce(
        (sum, p) => sum + Number(p.loanAmount),
        0
      );
      monthlyData.push({
        month: date.toLocaleString("default", { month: "short" }),
        amount,
      });
    }

    // Subscription info
    let trialDaysRemaining = 0;
    if (user.subscriptionStatus === "trial" && user.subscriptionEndDate) {
      trialDaysRemaining = Math.max(
        0,
        Math.ceil(
          (new Date(user.subscriptionEndDate).getTime() - now.getTime()) /
            (1000 * 60 * 60 * 24)
        )
      );
    }

    return NextResponse.json({
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        shopName: user.shopName,
        subscriptionStatus: user.subscriptionStatus,
        trialDaysRemaining,
      },
      stats: {
        totalCustomers,
        totalActivePledges: activePledges.length,
        totalActiveLoanAmount,
        totalReleasedLoanAmount,
        totalActivePrincipalAmount,
      },
      recentPledges: recentPledges.map((p) => ({
        id: p.id,
        customerName: p.customer.name,
        customerImg: p.customer.customerImg,
        pledgeDate: p.pledgeDate,
        loanAmount: Number(p.loanAmount),
        releaseDate: p.releaseDate,
        status: p.status,
      })),
      monthlyData,
    });
  } catch (err) {
    console.error("DASHBOARD API ERROR:", err);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
