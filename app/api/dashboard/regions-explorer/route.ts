// app/api/dashboard/regions-explorer/route.ts
//
// Backs the "View All Regions" overlay (components/dashboard/RegionsExplorerOverlay.tsx).
// Three modes, selected via ?mode=:
//   regions   — paginated list of regions with customer/active-pledge counts
//   customers — paginated list of customers within one region
//   search    — regions matching <q> (with a few preview customers each) + direct customer matches
//
// Region names are folded via INITCAP(LOWER(TRIM(region))) so case/whitespace
// variants ("indOrE", " Indore ") merge into one bucket — same convention as
// app/api/dashboard/region-search/route.ts.
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { OPEN_PLEDGE_STATUSES } from "@/lib/pledgeConstants";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 15;
const MAX_LIMIT = 50;
const SEARCH_REGION_LIMIT = 5;
const SEARCH_PREVIEW_PER_REGION = 3;
const SEARCH_DIRECT_MATCH_LIMIT = 10;

function clampLimit(raw: string | null): number {
  const n = parseInt(raw ?? "", 10);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_LIMIT;
  return Math.min(n, MAX_LIMIT);
}

function clampCursor(raw: string | null): number {
  const n = parseInt(raw ?? "", 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function foldRegionName(region: string): string {
  return region
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

export async function GET(req: NextRequest) {
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

    const { searchParams } = req.nextUrl;
    const mode = searchParams.get("mode") ?? "regions";

    if (mode === "regions") {
      const limit = clampLimit(searchParams.get("limit"));
      const cursor = clampCursor(searchParams.get("cursor"));

      // The open-status pair below is spelled out as SQL literals: a TS const
      // cannot be interpolated into raw SQL safely. Keep it in sync with
      // OPEN_PLEDGE_STATUSES in lib/pledgeConstants.ts.
      const regions = await prisma.$queryRaw<
        { name: string; customerCount: number; activePledges: number }[]
      >`
        SELECT INITCAP(LOWER(TRIM(c.region))) AS name,
               COUNT(DISTINCT c.id)::int AS "customerCount",
               COUNT(p.id) FILTER (WHERE p.status IN ('ACTIVE', 'OVERDUE'))::int AS "activePledges"
        FROM "customers" c
        LEFT JOIN "pledges" p ON p."customerId" = c.id
        WHERE c."userId" = ${user.id}
          AND c."deletedAt" IS NULL
          AND TRIM(c.region) <> ''
        GROUP BY INITCAP(LOWER(TRIM(c.region)))
        ORDER BY "customerCount" DESC, name ASC
        LIMIT ${limit} OFFSET ${cursor}
      `;

      return NextResponse.json({
        regions,
        nextCursor: regions.length === limit ? cursor + limit : null,
      });
    }

    if (mode === "customers") {
      const region = searchParams.get("region")?.trim() ?? "";
      if (!region) {
        return NextResponse.json({ error: "region is required" }, { status: 400 });
      }
      const limit = clampLimit(searchParams.get("limit"));
      const cursor = clampCursor(searchParams.get("cursor"));

      const customers = await prisma.$queryRaw<
        {
          id: string;
          name: string;
          mobile: string | null;
          customerImg: string | null;
          region: string;
          activePledges: number;
          totalLoanAmount: number;
        }[]
      >`
        -- Open-status pair as SQL literals; sync with OPEN_PLEDGE_STATUSES
        -- in lib/pledgeConstants.ts (a TS const cannot be interpolated here).
        SELECT c.id, c.name, c.mobile, c."customerImg" AS "customerImg",
               INITCAP(LOWER(TRIM(c.region))) AS region,
               COUNT(p.id) FILTER (WHERE p.status IN ('ACTIVE', 'OVERDUE'))::int AS "activePledges",
               COALESCE(SUM(p."loanAmount") FILTER (WHERE p.status IN ('ACTIVE', 'OVERDUE')), 0)::float AS "totalLoanAmount"
        FROM "customers" c
        LEFT JOIN "pledges" p ON p."customerId" = c.id
        WHERE c."userId" = ${user.id}
          AND c."deletedAt" IS NULL
          AND LOWER(TRIM(c.region)) = LOWER(TRIM(${region}))
        GROUP BY c.id
        ORDER BY "totalLoanAmount" DESC, c.name ASC
        LIMIT ${limit} OFFSET ${cursor}
      `;

      return NextResponse.json({
        customers,
        nextCursor: customers.length === limit ? cursor + limit : null,
      });
    }

    if (mode === "search") {
      const q = (searchParams.get("q") ?? "").trim().toLowerCase();
      if (!q) {
        return NextResponse.json({ matchedRegions: [], directCustomerMatches: [] });
      }

      // Matched regions (folded), same substring-match convention as region-search.
      // The open-status pair below is spelled out as SQL literals: a TS const
      // cannot be interpolated into raw SQL safely. Keep it in sync with
      // OPEN_PLEDGE_STATUSES in lib/pledgeConstants.ts.
      const matchedRegionRows = await prisma.$queryRaw<
        { name: string; customerCount: number; activePledges: number }[]
      >`
        SELECT INITCAP(LOWER(TRIM(c.region))) AS name,
               COUNT(DISTINCT c.id)::int AS "customerCount",
               COUNT(p.id) FILTER (WHERE p.status IN ('ACTIVE', 'OVERDUE'))::int AS "activePledges"
        FROM "customers" c
        LEFT JOIN "pledges" p ON p."customerId" = c.id
        WHERE c."userId" = ${user.id}
          AND c."deletedAt" IS NULL
          AND TRIM(c.region) <> ''
          AND POSITION(${q} IN LOWER(TRIM(c.region))) > 0
        GROUP BY INITCAP(LOWER(TRIM(c.region)))
        ORDER BY "customerCount" DESC, name ASC
        LIMIT ${SEARCH_REGION_LIMIT}
      `;

      const matchedRegionNames = matchedRegionRows.map((r) => r.name);

      const previewRows = matchedRegionNames.length
        ? await prisma.$queryRaw<
            {
              id: string;
              name: string;
              mobile: string | null;
              customerImg: string | null;
              region: string;
              activePledges: number;
              totalLoanAmount: number;
              rn: number;
            }[]
          >`
            -- Open-status pair as SQL literals (3 occurrences below); sync with
            -- OPEN_PLEDGE_STATUSES in lib/pledgeConstants.ts.
            WITH ranked AS (
              SELECT c.id, c.name, c.mobile, c."customerImg" AS "customerImg",
                     INITCAP(LOWER(TRIM(c.region))) AS region,
                     COUNT(p.id) FILTER (WHERE p.status IN ('ACTIVE', 'OVERDUE'))::int AS "activePledges",
                     COALESCE(SUM(p."loanAmount") FILTER (WHERE p.status IN ('ACTIVE', 'OVERDUE')), 0)::float AS "totalLoanAmount",
                     ROW_NUMBER() OVER (
                       PARTITION BY INITCAP(LOWER(TRIM(c.region)))
                       ORDER BY COALESCE(SUM(p."loanAmount") FILTER (WHERE p.status IN ('ACTIVE', 'OVERDUE')), 0) DESC, c.name ASC
                     ) AS rn
              FROM "customers" c
              LEFT JOIN "pledges" p ON p."customerId" = c.id
              WHERE c."userId" = ${user.id}
                AND c."deletedAt" IS NULL
                AND INITCAP(LOWER(TRIM(c.region))) IN (${Prisma.join(matchedRegionNames)})
              GROUP BY c.id
            )
            SELECT * FROM ranked WHERE rn <= ${SEARCH_PREVIEW_PER_REGION}
          `
        : [];

      const previewsByRegion = new Map<
        string,
        { id: string; name: string; mobile: string | null; customerImg: string | null; activePledges: number; totalLoanAmount: number }[]
      >();
      for (const row of previewRows) {
        const list = previewsByRegion.get(row.region) ?? [];
        list.push({
          id: row.id,
          name: row.name,
          mobile: row.mobile,
          customerImg: row.customerImg,
          activePledges: row.activePledges,
          totalLoanAmount: row.totalLoanAmount,
        });
        previewsByRegion.set(row.region, list);
      }

      const matchedRegions = matchedRegionRows.map((r) => ({
        name: r.name,
        customerCount: r.customerCount,
        activePledges: r.activePledges,
        previewCustomers: previewsByRegion.get(r.name) ?? [],
      }));

      const directMatches = await prisma.customer.findMany({
        where: {
          userId: user.id,
          deletedAt: null,
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { mobile: { contains: q, mode: "insensitive" } },
          ],
        },
        take: SEARCH_DIRECT_MATCH_LIMIT,
        select: {
          id: true,
          name: true,
          mobile: true,
          customerImg: true,
          region: true,
          pledges: {
            where: { status: { in: [...OPEN_PLEDGE_STATUSES] } },
            select: { loanAmount: true },
          },
        },
      });

      const directCustomerMatches = directMatches.map((c) => ({
        id: c.id,
        name: c.name,
        mobile: c.mobile,
        customerImg: c.customerImg,
        region: c.region ? foldRegionName(c.region) : "",
        activePledges: c.pledges.length,
        totalLoanAmount: c.pledges.reduce((sum, p) => sum + Number(p.loanAmount), 0),
      }));

      return NextResponse.json({ matchedRegions, directCustomerMatches });
    }

    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  } catch (err) {
    console.error("REGIONS EXPLORER ERROR:", err);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
