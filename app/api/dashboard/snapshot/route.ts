// app/api/dashboard/snapshot/route.ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// ─────────────────────────────────────────────
// GET /api/dashboard/snapshot
//
// Returns:
//   - latest FinancialSnapshot (portfolio state)
//   - yesterday's snapshot (for trend comparison)
//   - MTD pledge activity (live query — not stored)
// ─────────────────────────────────────────────

export async function GET() {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Resolve internal user ──
  const user = await prisma.user.findUnique({
    where: { clerkUserId },
    select: { id: true },
  });
  
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Note: This relies on the server's timezone (usually UTC on Vercel). 
  // For strict local-time MTD accuracy, you could eventually pass the user's timezone from the frontend.
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // ── Run all queries in parallel ──
  const [snapshots, mtdNewPledges, mtdReleasedPledges, mtdLoanAmount] =
    await Promise.all([
      // Latest 2 snapshots — today + yesterday for trend
      prisma.financialSnapshot.findMany({
        where: { userId: user.id },
        orderBy: { snapshotDate: "desc" },
        take: 2,
      }),

      // MTD: pledges created this month (live query)
      prisma.pledge.count({
        where: {
          customer: { userId: user.id },
          createdAt: { gte: startOfMonth },
        },
      }),

      // MTD: pledges released this month (live query)
      prisma.pledge.count({
        where: {
          customer: { userId: user.id },
          status: "RELEASED", // Assuming you have a status enum or string
          releaseDate: { gte: startOfMonth },
        },
      }),

      // MTD: total loan amount issued this month (live query)
      prisma.pledge.aggregate({
        where: {
          customer: { userId: user.id },
          createdAt: { gte: startOfMonth },
        },
        _sum: { loanAmount: true },
      }),
    ]);

  const today = snapshots[0] ?? null;
  const yesterday = snapshots[1] ?? null;

  // ── LTV trend: how much did overall LTV change since yesterday ──
  const ltvChange =
    today?.overallLtv !== null &&
    yesterday?.overallLtv !== null &&
    today !== null &&
    yesterday !== null
      ? Number(today.overallLtv) - Number(yesterday.overallLtv)
      : null;

  return NextResponse.json({
    // Portfolio state — from snapshot
    snapshot: today,

    // Trend comparison
    trend: {
      ltvChange: ltvChange !== null ? Math.round(ltvChange * 100) / 100 : null,
      direction:
        ltvChange === null ? null
        : ltvChange > 0 ? "up"       // LTV going up = getting riskier
        : ltvChange < 0 ? "down"     // LTV going down = improving
        : "flat",
    },

    // MTD activity — always live, never stale
    mtd: {
      newPledges:      mtdNewPledges,
      releasedPledges: mtdReleasedPledges,
      loanAmount:      Number(mtdLoanAmount._sum.loanAmount ?? 0),
    },
  });
}