import { NextRequest, NextResponse } from "next/server";
import { auth }                      from "@clerk/nextjs/server";
import { prisma }                    from "@/lib/prisma";
import { MetalType, PledgeStatus, Prisma } from "@prisma/client";

/* ------------------------------------------------------------------ */
/* Constants                                                            */
/* ------------------------------------------------------------------ */
const VALID_METAL_TYPES = Object.values(MetalType)  as MetalType[];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
function titleCase(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function parseEnum<T extends string>(
  raw: string | null,
  values: readonly T[]
): T | undefined {
  if (!raw) return undefined;
  return (values as readonly string[]).includes(raw) ? (raw as T) : undefined;
}

/* ------------------------------------------------------------------ */
/* GET /api/pledges                                                    */
/*                                                                     */
/* Query params:                                                       */
/*   summary   — true → counts only (for dashboard)                   */
/*   metalType — GOLD | SILVER                                        */
/*   itemType  — NECKLACE | RING | …                                  */
/*   status    — ACTIVE | RELEASED | OVERDUE                          */
/*   take      — page size (default 30, max 100)                      */
/*   cursor    — last pledge id for cursor pagination                  */
/* ------------------------------------------------------------------ */
const DEFAULT_TAKE = 30;
const MAX_TAKE     = 100;

export async function GET(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where:  { clerkUserId },
      select: { id: true },
    });
    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { searchParams } = req.nextUrl;

    // ── Summary mode — counts only (dashboard widgets) ────────────
    if (searchParams.get("summary") === "true") {
      const [total, active, released] = await Promise.all([
        prisma.pledge.count({ where: { customer: { userId: user.id } } }),
        prisma.pledge.count({ where: { customer: { userId: user.id }, status: "ACTIVE"   } }),
        prisma.pledge.count({ where: { customer: { userId: user.id }, status: "RELEASED" } }),
      ]);
      return NextResponse.json({ total, active, released });
    }

    // ── Parse filters ─────────────────────────────────────────────
    const metalType = parseEnum(searchParams.get("metalType"), VALID_METAL_TYPES);
    const itemType  = searchParams.get("itemType")?.trim() || undefined;
    const status    = parseEnum(searchParams.get("status"),    Object.values(PledgeStatus) as PledgeStatus[]);
    const cursor    = searchParams.get("cursor") ?? undefined;
    const take      = Math.min(
      parseInt(searchParams.get("take") ?? String(DEFAULT_TAKE), 10) || DEFAULT_TAKE,
      MAX_TAKE
    );

    // ── Where clause ──────────────────────────────────────────────
    const where: Prisma.PledgeWhereInput = {
      customer: { userId: user.id },
      ...(status && { status }),
      ...((metalType || itemType) && {
        items: {
          some: {
            ...(metalType && { metalType }),
            ...(itemType  && { itemType: { equals: itemType } }),
          },
        },
      }),
    };

    // ── Query ─────────────────────────────────────────────────────
    const pledges = await prisma.pledge.findMany({
      where,
      take:    take + 1,
      orderBy: { createdAt: "desc" },
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      select: {
        id:                true,
        pledgeDate:        true,
        status:            true,
        loanAmount:        true,
        netWeightOfGold:   true,
        netWeightOfSilver: true,
        remark:            true,
        customer: {
          select: { id: true, name: true },
        },
        items: {
          select: {
            itemType:  true,
            metalType: true,
            itemName:  true,
            quantity:  true,
          },
        },
      },
    });

    // ── Pagination ────────────────────────────────────────────────
    const hasMore    = pledges.length > take;
    const page       = hasMore ? pledges.slice(0, take) : pledges;
    const nextCursor = hasMore ? page[page.length - 1].id : null;

    // ── Format response ───────────────────────────────────────────
    const result = page.map((p) => ({
      id:                p.id,
      customerId:        p.customer.id,
      customerName:      p.customer.name,
      pledgeDate:        p.pledgeDate,
      status:            p.status,
      loanAmount:        Number(p.loanAmount),
      netWeightOfGold:   Number(p.netWeightOfGold),
      netWeightOfSilver: Number(p.netWeightOfSilver),
      remark:            p.remark,
      itemCount:         p.items.length,
      totalQuantity:     p.items.reduce((s, i) => s + i.quantity, 0),
      itemTypes:         [...new Set(p.items.map((i) => i.itemType))],
      metalTypes:        [...new Set(p.items.map((i) => i.metalType))].map(titleCase),
    }));

    return NextResponse.json({ pledges: result, hasMore, nextCursor });

  } catch (err) {
    console.error("GET /api/pledges failed:", err);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
// ✅ No POST here — pledges are created under /api/customers/[customerId]/pledges