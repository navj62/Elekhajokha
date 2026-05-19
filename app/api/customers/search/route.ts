// app/api/customers/search/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth }                      from "@clerk/nextjs/server";
import { prisma }                    from "@/lib/prisma";
import { PledgeStatus, ItemType, Prisma } from "@prisma/client";

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */
const MAX_RESULTS  = 50;  // hard cap — increase if needed
const DEFAULT_TAKE = 20;  // default page size

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Capitalise first letter, lowercase the rest: "NECKLACE" → "Necklace" */
function titleCase(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/** Build a human-readable item label from DB fields */
function buildItemLabel(item: {
  itemName:  string | null;
  itemType:  string;
  metalType: string;
}): string {
  return item.itemName?.trim() || `${titleCase(item.itemType)} (${titleCase(item.metalType)})`;
}

/** Safe PledgeStatus parse — returns undefined if invalid */
function parsePledgeStatus(raw: string | null): PledgeStatus | undefined {
  if (!raw) return undefined;
  return Object.values(PledgeStatus).includes(raw as PledgeStatus)
    ? (raw as PledgeStatus)
    : undefined;
}

/* ------------------------------------------------------------------ */
/*  Route                                                               */
/* ------------------------------------------------------------------ */
export async function GET(req: NextRequest) {
  try {
    /* ---- Auth ---------------------------------------------------- */
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ✅ findUnique instead of findUniqueOrThrow — controlled 404
    const user = await prisma.user.findUnique({
      where:  { clerkUserId },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    /* ---- Params -------------------------------------------------- */
    const { searchParams } = req.nextUrl;
    const search      = searchParams.get("q")?.trim()      ?? "";
    const filter      = searchParams.get("filter")         ?? "all";
    const take        = Math.min(
      parseInt(searchParams.get("take") ?? String(DEFAULT_TAKE), 10) || DEFAULT_TAKE,
      MAX_RESULTS
    );
    const validStatus = parsePledgeStatus(searchParams.get("status"));

    /* ---- Build where clause -------------------------------------- */
    // ✅ Typed as Prisma.CustomerWhereInput — no `any`
    const where: Prisma.CustomerWhereInput = {
      userId:    user.id,
      deletedAt: null,
    };

    if (search) {
      // ✅ Prisma enums don't support contains/insensitive — must pre-filter to valid values
      // e.g. search "neck" → matchingItemTypes = ["NECKLACE"]
      // e.g. search "ring" → matchingItemTypes = ["RING", "EARRING"]
      const matchingItemTypes = Object.values(ItemType).filter((t) =>
        t.toLowerCase().includes(search.toLowerCase())
      );

      // Build OR clauses — itemType clause only added when there are matching enum values
      // (avoids passing an empty `in: []` which Prisma rejects)
      const itemOrClauses: Prisma.PledgeItemWhereInput[] = [
        { itemName: { contains: search, mode: "insensitive" } },
        ...(matchingItemTypes.length > 0
          ? [{ itemType: { in: matchingItemTypes } }]
          : []),
      ];

      const itemsWhere: Prisma.PledgeItemListRelationFilter = {
        some: { OR: itemOrClauses },
      };

      const pledgesWithItems: Prisma.PledgeListRelationFilter = {
        some: {
          ...(validStatus && { status: validStatus }),
          items: itemsWhere,
        },
      };

      switch (filter) {
        case "name":
          where.name = { contains: search, mode: "insensitive" };
          break;

        case "region":
          where.region = { contains: search, mode: "insensitive" };
          break;

        case "itemName":
        case "itemType":
          where.pledges = pledgesWithItems;
          break;

        default: // "all" — search across all fields
          where.OR = [
            { name:    { contains: search, mode: "insensitive" } },
            { region:  { contains: search, mode: "insensitive" } },
            { pledges: pledgesWithItems },
          ];
      }
    } else if (validStatus) {
      // No search term but status filter set
      where.pledges = { some: { status: validStatus } };
    }

    /* ---- Query --------------------------------------------------- */
    const customers = await prisma.customer.findMany({
      where,
      take:    take + 1, // fetch one extra to detect if there are more results
      orderBy: { createdAt: "desc" },

      select: {
        id:     true,
        name:   true,
        region: true,

        // ✅ Count only pledges matching the status filter — not all pledges
        _count: {
          select: {
            pledges: validStatus
              ? { where: { status: validStatus } }
              : true,
          },
        },

        // Latest pledge → latest item for the label
        pledges: {
          where:   validStatus ? { status: validStatus } : undefined,
          orderBy: { createdAt: "desc" },
          take:    1,
          select: {
            items: {
              orderBy: { id: "desc" },
              take:    1,
              select: {
                itemName:  true,
                itemType:  true,
                metalType: true,
              },
            },
          },
        },
      },
    });

    /* ---- Pagination detection ------------------------------------ */
    // ✅ fetch take+1, slice back to take — tells frontend if more exist
    const hasMore = customers.length > take;
    const page    = hasMore ? customers.slice(0, take) : customers;

    /* ---- Format response ---------------------------------------- */
    const result = page.map((cust) => {
      const latestItem = cust.pledges[0]?.items[0];

      return {
        id:          cust.id,
        name:        cust.name,
        region:      cust.region,
        pledgeCount: cust._count.pledges,
        latestItem:  latestItem ? buildItemLabel(latestItem) : null,
      };
    });

    return NextResponse.json(
      {
        customers: result,
        hasMore,
        count: result.length,
      },
      {
        headers: {
          // ✅ Short cache — search results can be stale for 10s in browser
          // but must revalidate with server (no serving stale from CDN)
          "Cache-Control": "private, max-age=10, must-revalidate",
        },
      }
    );
  } catch (err) {
    console.error("CUSTOMER SEARCH ERROR:", err);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}