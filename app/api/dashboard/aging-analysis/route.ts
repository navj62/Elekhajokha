// app/api/dashboard/aging-analysis/route.ts
//
// GET — Aging Analysis of the active loan book for the signed-in shop owner.
// Active pledges are bucketed by age (now - pledgeDate) into 5 fixed ranges,
// reporting principal, amount owed, and average LTV per bucket.
//
// Reads the CACHED cron metrics (lastCalculatedLtv, lastAmountOwed) rather than
// recomputing LTV/interest live for every active pledge on each dashboard load —
// the risk cron (app/api/cron/evaluate-risk) writes these per pledge within the
// hour. For a brand-new pledge not yet cron-evaluated, lastAmountOwed is null and
// we fall back to loanAmount.
//
// Tenant-scoped to the internal user.id through the customer relation (Invariant 1).
// Money is read-only display aggregation, so Number(Decimal) is acceptable here
// (Invariant 2) — these values are never written back.
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

interface Bucket {
  label: string;
  ageRange: string;
  count: number;
  principal: number;
  owed: number;
  avgLtv: number | null;
  underwaterCount: number;
  pctOfPrincipal: number;
  pctOfOwed: number;
  // running accumulator for the LTV mean (stripped before responding)
  _ltvSum: number;
  _ltvCount: number;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

// Bucket definitions, youngest first. maxDays is inclusive; the last bucket
// (365+) has no upper bound (Infinity).
const BUCKET_DEFS: { label: string; ageRange: string; maxDays: number }[] = [
  { label: "0–30 days", ageRange: "0-30", maxDays: 30 },
  { label: "31–90 days", ageRange: "31-90", maxDays: 90 },
  { label: "91–180 days", ageRange: "91-180", maxDays: 180 },
  { label: "181–365 days", ageRange: "181-365", maxDays: 365 },
  { label: "365+ days", ageRange: "365+", maxDays: Infinity },
];

export async function GET() {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { clerkUserId },
      select: { id: true },
    });
    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    const pledges = await prisma.pledge.findMany({
      where: {
        customer: { userId: user.id },
        status: "ACTIVE",
      },
      select: {
        id: true,
        pledgeDate: true,
        loanAmount: true,
        interestRate: true,
        compoundingDuration: true,
        allowCompounding: true,
        netWeightOfGold: true,
        netWeightOfSilver: true,
        lastCalculatedLtv: true,
        lastAmountOwed: true,
      },
    });

    // Initialize all 5 buckets (always present, even when empty).
    const buckets: Bucket[] = BUCKET_DEFS.map((d) => ({
      label: d.label,
      ageRange: d.ageRange,
      count: 0,
      principal: 0,
      owed: 0,
      avgLtv: null,
      underwaterCount: 0,
      pctOfPrincipal: 0,
      pctOfOwed: 0,
      _ltvSum: 0,
      _ltvCount: 0,
    }));

    const now = Date.now();
    const DAY_MS = 1000 * 60 * 60 * 24;

    for (const p of pledges) {
      const ageDays = Math.floor((now - p.pledgeDate.getTime()) / DAY_MS);
      const bi = BUCKET_DEFS.findIndex((d) => ageDays <= d.maxDays);
      const bucket = buckets[bi === -1 ? buckets.length - 1 : bi];

      const principal = Number(p.loanAmount);
      const owed = p.lastAmountOwed !== null ? Number(p.lastAmountOwed) : principal;

      bucket.count += 1;
      bucket.principal += principal;
      bucket.owed += owed;

      if (p.lastCalculatedLtv !== null) {
        const ltv = Number(p.lastCalculatedLtv);
        bucket._ltvSum += ltv;
        bucket._ltvCount += 1;
        if (ltv > 90) bucket.underwaterCount += 1;
      }
    }

    const totalActivePledges = pledges.length;
    const totalPrincipal = buckets.reduce((s, b) => s + b.principal, 0);
    const totalOwed = buckets.reduce((s, b) => s + b.owed, 0);

    for (const b of buckets) {
      b.avgLtv = b._ltvCount > 0 ? round1(b._ltvSum / b._ltvCount) : null;
      b.pctOfPrincipal =
        totalPrincipal > 0 ? round1((b.principal / totalPrincipal) * 100) : 0;
      b.pctOfOwed = totalOwed > 0 ? round1((b.owed / totalOwed) * 100) : 0;
    }

    const oldest = buckets[buckets.length - 1]; // 365+ bucket
    const capitalStuck = buckets[3].principal + buckets[4].principal; // 181-365 + 365+
    const capitalStuckShare =
      totalPrincipal > 0 ? round1((capitalStuck / totalPrincipal) * 100) : 0;

    // Strip the internal LTV accumulators before responding.
    const outBuckets = buckets.map((b) => ({
      label: b.label,
      ageRange: b.ageRange,
      count: b.count,
      principal: b.principal,
      owed: b.owed,
      avgLtv: b.avgLtv,
      underwaterCount: b.underwaterCount,
      pctOfPrincipal: b.pctOfPrincipal,
      pctOfOwed: b.pctOfOwed,
    }));

    return NextResponse.json({
      totalActivePledges,
      totalPrincipal,
      totalOwed,
      buckets: outBuckets,
      insights: {
        oldestBucketPrincipalShare: oldest.pctOfPrincipal,
        oldestBucketOwedShare: oldest.pctOfOwed,
        capitalStuck,
        capitalStuckShare,
      },
    });
  } catch (err) {
    console.error("AGING ANALYSIS ERROR:", err);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
