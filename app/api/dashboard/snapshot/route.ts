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

    const [
      snapshots,
      totalCustomers,
      totalActivePledges,
      totalActiveLoanAmount,
      totalReleasedLoanAmount,
      openPledges,
      recentPledgesRaw,
      regionsDataRaw,
    ] = await Promise.all([
      prisma.financialSnapshot.findMany({
        where: { userId: user.id },
        orderBy: { calculatedAt: "desc" },
        take: 2,
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
        include: {
          customer: true,
          items: { select: { itemType: true }, orderBy: { createdAt: "asc" } },
        },
      }),
      // Regions
      prisma.customer.groupBy({
        by: ["region"],
        where: { userId: user.id, deletedAt: null },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 3,
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
    const openPledgeTotals = openPledges.map((p) =>
      calculateHybridInterest(
        Number(p.loanAmount),
        Number(p.interestRate),
        p.pledgeDate,
        now,
        p.allowCompounding,
        p.compoundingDuration as CompoundingDuration
      )
    );
    const totalBalanceAmount =
      openPledges.length === 0
        ? null
        : openPledgeTotals.reduce((sum, r) => sum + r.receivableAmount, 0);
    // Interest accrued on the open book, from the same engine call as the
    // balance above — so principal + interest always reconciles to balance.
    // Same null convention as totalBalanceAmount.
    const totalInterestAmount =
      openPledges.length === 0
        ? null
        : openPledgeTotals.reduce((sum, r) => sum + r.totalInterest, 0);

    const stats = {
      totalCustomers,
      totalActivePledges,
      totalActiveLoanAmount: Number(totalActiveLoanAmount._sum.loanAmount ?? 0),
      totalReleasedLoanAmount: Number(totalReleasedLoanAmount._sum.loanAmount ?? 0),
      totalBalanceAmount,
      totalInterestAmount,
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
      // First item's type, plus a count of the rest: "Ring", "Ring +2".
      // null only for a pledge with no items, which the card renders as "—".
      pledgeItem:
        p.items.length === 0
          ? null
          : p.items.length === 1
            ? p.items[0].itemType
            : `${p.items[0].itemType} +${p.items.length - 1}`,
    }));

    // Regions mapping
    const regions = regionsDataRaw.map((r) => ({
      name: r.region || "Unknown",
      count: r._count.id,
    }));

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
    });
  } catch (err: unknown) {
    console.error("Dashboard Snapshot Error:", err);
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 });
  }
}