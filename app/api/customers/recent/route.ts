// app/api/customers/recent/route.ts
//
// GET /api/customers/recent[?openOnly=1]
// The 8 customers with the most recent pledge activity, for the quick-action
// customer picker's "Recent customers" list.
//
// Activity = a pledge created or changed (release/sale go through updateMany,
// which bumps @updatedAt; the nightly risk cron writes via raw SQL and does
// not). Ties — e.g. the ~9.7k ledger-imported pledges that share one import
// timestamp — break by name, then id, so the order is total and stable.
// openOnly=1 keeps only customers holding an ACTIVE or OVERDUE pledge.
//
// One parameterized aggregate; measured 2–3.5 ms on a 2.8k-pledge tenant, so
// no index or schema change. Tenant-scoped through customers."userId".
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { OPEN_PLEDGE_STATUSES } from "@/lib/pledgeConstants";

const RECENT_LIMIT = 8;

export type RecentCustomer = {
  id: string;
  name: string;
  mobile: string | null;
  region: string | null;
  openPledgeCount: number;
};

export async function GET(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkUserId }, select: { id: true } });
    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    const openOnly = req.nextUrl.searchParams.get("openOnly") === "1";
    const open = Prisma.join([...OPEN_PLEDGE_STATUSES]);

    const rows = await prisma.$queryRaw<RecentCustomer[]>`
      SELECT c.id,
             c.name,
             c.mobile,
             COALESCE(NULLIF(c.region, ''), c.address) AS region,
             (COUNT(*) FILTER (WHERE p.status::text IN (${open})))::int AS "openPledgeCount"
      FROM customers c
      JOIN pledges p ON p."customerId" = c.id
      WHERE c."userId" = ${user.id}
        AND c."deletedAt" IS NULL
      GROUP BY c.id
      ${openOnly ? Prisma.sql`HAVING COUNT(*) FILTER (WHERE p.status::text IN (${open})) > 0` : Prisma.empty}
      ORDER BY MAX(GREATEST(p."createdAt", p."updatedAt")) DESC, c.name ASC, c.id ASC
      LIMIT ${RECENT_LIMIT}
    `;

    return NextResponse.json({ customers: rows }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("RECENT CUSTOMERS ERROR:", err instanceof Error ? err.message : "unknown error");
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
