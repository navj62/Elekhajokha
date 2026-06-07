// app/api/dashboard/region-search/route.ts
//
// GET /api/dashboard/region-search?q=<text>
// Returns regions (for the logged-in user) whose name contains <text>,
// case-insensitive, with a customer count each. Same INITCAP(LOWER(TRIM()))
// folding as the dashboard's top-regions, so "indOrE" and "indore" match and
// merge into one "Indore" bucket.
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
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

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().toLowerCase();
  if (!q) {
    return NextResponse.json({ regions: [] });
  }

  // POSITION(substr IN string) is a LITERAL substring match (returns 0 when
  // absent) — so user input needs no LIKE-wildcard escaping. Both sides are
  // lowercased, making the match case-insensitive.
  const regions = await prisma.$queryRaw<{ region: string; count: number }[]>`
    SELECT INITCAP(LOWER(TRIM(region))) AS region, COUNT(*)::int AS count
    FROM "customers"
    WHERE "userId" = ${user.id}
      AND "deletedAt" IS NULL
      AND TRIM(region) <> ''
      AND POSITION(${q} IN LOWER(TRIM(region))) > 0
    GROUP BY INITCAP(LOWER(TRIM(region)))
    ORDER BY count DESC, region ASC
    LIMIT 10
  `;

  return NextResponse.json({ regions });
}
