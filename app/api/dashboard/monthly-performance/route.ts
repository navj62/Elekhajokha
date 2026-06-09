// app/api/dashboard/monthly-performance/route.ts
//
// GET — 12-month rolling Monthly Performance rollup for the signed-in shop owner.
// Field mappings are the ones confirmed by the Part-1 data audit (do not re-derive):
//   pledgesAdded          → Pledge.pledgeDate            (business date)
//   pledgesReleased       → Pledge.releaseDate           (status=RELEASED)
//   loanAmountGiven       → Pledge.loanAmount
//   totalAmountReceived   → PledgeAudit.receivableAmount (action=RELEASED), null→0
//   newCustomers          → Customer.createdAt           (deletedAt: null)
//   totalInterestReceived → PledgeAudit.totalInterest    (action=RELEASED), null→0
//
// All four queries are tenant-scoped to the internal user.id (Invariant 1).
// Money is read-only display aggregation, so Number(Decimal) is acceptable here
// (Invariant 2) — these values are never written back.
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

interface MonthData {
  pledgesAdded: number;
  pledgesReleased: number;
  loanAmountGiven: number;
  totalAmountReceived: number;
  newCustomers: number;
  totalInterestReceived: number;
}

interface MonthOut extends MonthData {
  month: string; // "YYYY-MM"
  label: string; // "Jul '25"
}

interface SummaryMetric {
  current: number;
  previous: number;
  changePercent: number | null;
}

const toMonthKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

// previous=0 && current>0 → null (frontend shows "New"); previous=0 && current=0 → 0
function changePercent(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? null : 0;
  return Math.round(((current - previous) / previous) * 100 * 10) / 10;
}

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

    const now = new Date();
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const [pledgesCreated, pledgesReleased, releaseAudits, newCustomers] =
      await Promise.all([
        // A) Pledges created — keyed by pledgeDate (business date).
        prisma.pledge.findMany({
          where: {
            customer: { userId: user.id },
            pledgeDate: { gte: twelveMonthsAgo },
          },
          select: { pledgeDate: true, loanAmount: true },
        }),
        // B) Pledges released — keyed by releaseDate (business date).
        prisma.pledge.findMany({
          where: {
            customer: { userId: user.id },
            status: "RELEASED",
            releaseDate: { gte: twelveMonthsAgo },
          },
          select: { releaseDate: true },
        }),
        // C) Release audits — settlement money snapshotted at release.
        prisma.pledgeAudit.findMany({
          where: {
            pledge: { customer: { userId: user.id } },
            action: "RELEASED",
            createdAt: { gte: twelveMonthsAgo },
          },
          select: {
            createdAt: true,
            receivableAmount: true,
            totalInterest: true,
          },
        }),
        // D) New customers — keyed by createdAt, excluding soft-deleted.
        prisma.customer.findMany({
          where: {
            userId: user.id,
            deletedAt: null,
            createdAt: { gte: twelveMonthsAgo },
          },
          select: { createdAt: true },
        }),
      ]);

    // Pre-fill the 12-month window (oldest first) with zeroed buckets, and an
    // index map so aggregation is a single pass per result set (no nested loops).
    const idx = new Map<string, number>();
    const months: MonthOut[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      const key = toMonthKey(d);
      idx.set(key, i);
      months.push({
        month: key,
        label: `${d.toLocaleString("en-US", { month: "short" })} '${String(
          d.getFullYear()
        ).slice(2)}`,
        pledgesAdded: 0,
        pledgesReleased: 0,
        loanAmountGiven: 0,
        totalAmountReceived: 0,
        newCustomers: 0,
        totalInterestReceived: 0,
      });
    }

    // A → pledgesAdded + loanAmountGiven, by pledgeDate.
    for (const p of pledgesCreated) {
      const i = idx.get(toMonthKey(p.pledgeDate));
      if (i === undefined) continue; // ignore out-of-window outliers (e.g. future-dated)
      months[i].pledgesAdded += 1;
      months[i].loanAmountGiven += Number(p.loanAmount);
    }

    // B → pledgesReleased, by releaseDate.
    for (const p of pledgesReleased) {
      if (!p.releaseDate) continue;
      const i = idx.get(toMonthKey(p.releaseDate));
      if (i === undefined) continue;
      months[i].pledgesReleased += 1;
    }

    // C → totalAmountReceived + totalInterestReceived, by createdAt. The audit's
    // createdAt is the wall-clock release time (≈ the business release date — close
    // enough for monthly bucketing). receivableAmount/totalInterest null-coalesce to 0.
    for (const a of releaseAudits) {
      const i = idx.get(toMonthKey(a.createdAt));
      if (i === undefined) continue;
      months[i].totalAmountReceived += Number(a.receivableAmount ?? 0);
      months[i].totalInterestReceived += Number(a.totalInterest ?? 0);
    }

    // D → newCustomers, by createdAt.
    for (const c of newCustomers) {
      const i = idx.get(toMonthKey(c.createdAt));
      if (i === undefined) continue;
      months[i].newCustomers += 1;
    }

    // Summary: months[10] = previous, months[11] = current (last two after sort).
    const previous = months[10];
    const current = months[11];
    const metric = (key: keyof MonthData): SummaryMetric => ({
      current: current[key],
      previous: previous[key],
      changePercent: changePercent(current[key], previous[key]),
    });

    return NextResponse.json({
      months,
      summary: {
        pledgesAdded: metric("pledgesAdded"),
        pledgesReleased: metric("pledgesReleased"),
        loanAmountGiven: metric("loanAmountGiven"),
        totalAmountReceived: metric("totalAmountReceived"),
        newCustomers: metric("newCustomers"),
        totalInterestReceived: metric("totalInterestReceived"),
      },
    });
  } catch (err) {
    console.error("MONTHLY PERFORMANCE ERROR:", err);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
