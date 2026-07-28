// app/api/pledges/route.ts  (GET handler — add alongside your existing POST)

import { NextRequest, NextResponse } from "next/server";
import { auth }                      from "@clerk/nextjs/server";
import { prisma }                    from "@/lib/prisma";
import { MetalType, PledgeStatus, Prisma } from "@prisma/client";

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

/**
 * Parse one side of the loanAmount range filter.
 *
 * Lenient-coerce, matching this route's existing `take` / `parseEnum`
 * behaviour: anything unusable is treated as an omitted param rather than
 * a 400. A negative bound is meaningless for a loan amount, so it is
 * treated as unset too. This is what guarantees NaN / Infinity / a bare
 * "-" can never reach Prisma.
 *
 * Returns the validated STRING rather than a number: loanAmount is
 * Decimal(12,2), and a JS float cannot always represent a 2dp rupee value
 * exactly — which would make an exact-match range (min === max) silently
 * miss. Prisma's DecimalFilter accepts `string` for gte/lte and hands it
 * to the driver uncast, so the comparison stays exact.
 *
 * The regex admits only plain non-negative decimals, which rules out
 * negatives, scientific notation ("5e3") and decimal.js-hostile forms
 * ("5.", ".5") without needing a float round-trip to sanitise them.
 */
function parseLoanBound(raw: string | null): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return undefined;
  if (!Number.isFinite(Number(trimmed))) return undefined;
  return trimmed;
}

/* ------------------------------------------------------------------ */
/*  GET /api/pledges                                                    */
/*                                                                      */
/*  Query params:                                                       */
/*    metalType  — GOLD | SILVER                                       */
/*    itemType   — NECKLACE | RING | BANGLE | …                       */
/*    status     — ACTIVE | RELEASED | OVERDUE                        */
/*    minLoan    — inclusive lower bound on loanAmount (optional)     */
/*    maxLoan    — inclusive upper bound on loanAmount (optional)     */
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
    const itemType   = searchParams.get("itemType")?.trim() || undefined;
    const status     = parseEnum(searchParams.get("status"),     Object.values(PledgeStatus));
    const minLoan    = parseLoanBound(searchParams.get("minLoan"));
    const maxLoan    = parseLoanBound(searchParams.get("maxLoan"));
    const cursor     = searchParams.get("cursor") ?? undefined;
    const take       = Math.min(
      parseInt(searchParams.get("take") ?? String(DEFAULT_TAKE), 10) || DEFAULT_TAKE,
      MAX_TAKE
    );

    /* ---- Where clause -------------------------------------------- */
    const where: Prisma.PledgeWhereInput = {
      customer: { userId: user.id },
      ...(status && { status }),

      // Loan-amount range. A sibling key, so it ANDs with the tenant scope
      // above and with any status / item filters below — never an OR.
      // Either side may be absent: min only → "N and above", max only →
      // "N and below", both equal → exact match on that Decimal value.
      ...((minLoan !== undefined || maxLoan !== undefined) && {
        loanAmount: {
          ...(minLoan !== undefined ? { gte: minLoan } : {}),
          ...(maxLoan !== undefined ? { lte: maxLoan } : {}),
        },
      }),

      // ✅ Key insight: a pledge with multiple items must appear in
      // filters for ALL its item types. Using `some` on `items` ensures
      // a pledge with [NECKLACE(GOLD), RING(SILVER)] shows up in both
      // itemType=NECKLACE AND itemType=RING AND metalType=GOLD AND metalType=SILVER
      ...((metalType || itemType) && {
        items: {
          some: {
            ...(metalType && { metalType }),
            ...(itemType  && { itemType: { equals: itemType } }),
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
        itemTypes:        itemTypes,
        metalTypes:       metalTypes.map(titleCase),  // ["Gold", "Silver"]
      };
    });

    return NextResponse.json({ pledges: result, hasMore, nextCursor });

  } catch (err) {
    console.error("GET /api/pledges failed:", err);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}