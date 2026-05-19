// app/api/pledges/route.ts  (GET handler — add alongside your existing POST)

import { NextRequest, NextResponse } from "next/server";
import { auth }                      from "@clerk/nextjs/server";
import { prisma }                    from "@/lib/prisma";
import { ItemType, MetalType, PledgeStatus, Prisma } from "@prisma/client";

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */
const DEFAULT_TAKE = 30;
const MAX_TAKE     = 100;

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */
function parseEnum<T extends string>(
  raw: string | null,
  values: T[]
): T | undefined {
  if (!raw) return undefined;
  return values.includes(raw as T) ? (raw as T) : undefined;
}

function titleCase(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/* ------------------------------------------------------------------ */
/*  GET /api/pledges                                                    */
/*                                                                      */
/*  Query params:                                                       */
/*    metalType  — GOLD | SILVER                                       */
/*    itemType   — NECKLACE | RING | BANGLE | …                       */
/*    status     — ACTIVE | RELEASED | OVERDUE                        */
/*    take       — page size (default 30, max 100)                    */
/*    cursor     — last pledge id for cursor pagination               */
/* ------------------------------------------------------------------ */
export async function GET(req: NextRequest) {
  try {
    /* ---- Auth ---------------------------------------------------- */
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where:  { clerkUserId },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    /* ---- Params -------------------------------------------------- */
    const { searchParams } = req.nextUrl;

    const metalType  = parseEnum(searchParams.get("metalType"),  Object.values(MetalType));
    const itemType   = parseEnum(searchParams.get("itemType"),   Object.values(ItemType));
    const status     = parseEnum(searchParams.get("status"),     Object.values(PledgeStatus));
    const cursor     = searchParams.get("cursor") ?? undefined;
    const take       = Math.min(
      parseInt(searchParams.get("take") ?? String(DEFAULT_TAKE), 10) || DEFAULT_TAKE,
      MAX_TAKE
    );

    /* ---- Where clause -------------------------------------------- */
    const where: Prisma.PledgeWhereInput = {
      customer: { userId: user.id },
      ...(status && { status }),

      // ✅ Key insight: a pledge with multiple items must appear in
      // filters for ALL its item types. Using `some` on `items` ensures
      // a pledge with [NECKLACE(GOLD), RING(SILVER)] shows up in both
      // itemType=NECKLACE AND itemType=RING AND metalType=GOLD AND metalType=SILVER
      ...((metalType || itemType) && {
        items: {
          some: {
            ...(metalType  && { metalType  }),
            ...(itemType   && { itemType   }),
          },
        },
      }),
    };

    /* ---- Query --------------------------------------------------- */
    const pledges = await prisma.pledge.findMany({
      where,
      take:    take + 1,
      orderBy: { createdAt: "desc" },

      // Cursor pagination — efficient for large datasets
      ...(cursor && {
        cursor: { id: cursor },
        skip:   1,
      }),

      select: {
        id:               true,
        pledgeDate:       true,
        status:           true,
        loanAmount:       true,
        netWeightOfGold:  true,
        netWeightOfSilver:true,
        remark:           true,

        // Customer name as pledge "title"
        customer: {
          select: { id: true, name: true },
        },

        // Items — used for:
        //   1. item count
        //   2. unique item types shown in the card
        //   3. unique metal types shown in the card
        items: {
          select: {
            id:       true,
            itemType: true,
            metalType:true,
            itemName: true,
            quantity: true,
          },
        },
      },
    });

    /* ---- Pagination ---------------------------------------------- */
    const hasMore   = pledges.length > take;
    const page      = hasMore ? pledges.slice(0, take) : pledges;
    const nextCursor = hasMore ? page[page.length - 1].id : null;

    /* ---- Format -------------------------------------------------- */
    const result = page.map((p) => {
      // Deduplicate item types and metal types across all items in pledge
      const itemTypes  = [...new Set(p.items.map((i) => i.itemType))];
      const metalTypes = [...new Set(p.items.map((i) => i.metalType))];

      // Total quantity across all items
      const totalItems = p.items.reduce((sum, i) => sum + i.quantity, 0);

      return {
        id:               p.id,
        customerName:     p.customer.name,
        customerId:       p.customer.id,
        pledgeDate:       p.pledgeDate,
        status:           p.status,
        loanAmount:       Number(p.loanAmount),
        netWeightOfGold:  Number(p.netWeightOfGold),
        netWeightOfSilver:Number(p.netWeightOfSilver),
        remark:           p.remark,
        itemCount:        p.items.length,   // number of pledge item rows
        totalItems,                          // total quantity (pieces)
        itemTypes:        itemTypes.map(titleCase),   // ["Necklace", "Ring"]
        metalTypes:       metalTypes.map(titleCase),  // ["Gold", "Silver"]
      };
    });

    return NextResponse.json({ pledges: result, hasMore, nextCursor });

  } catch (err) {
    console.error("GET /api/pledges failed:", err);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}