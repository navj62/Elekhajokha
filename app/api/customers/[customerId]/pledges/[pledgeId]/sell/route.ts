import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { isOpenPledgeStatus } from "@/lib/pledgeConstants";
import { buildPledgeSale, writePledgeSale, PLEDGE_NOT_OPEN } from "@/lib/pledgeSale";
import { recordCashEntries, errorTag } from "@/lib/cashBook";

type RouteContext = {
  params: Promise<{ customerId: string; pledgeId: string }>;
};

export async function POST(req: Request, context: RouteContext) {
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

    const { customerId, pledgeId } = await context.params;

    const pledge = await prisma.pledge.findFirst({
      where: {
        id:         pledgeId,
        customerId,
        customer:   { userId: user.id },
      },
      include: {
        items: {
          select:  { itemType: true, metalType: true, itemName: true, purity: true, grossWeight: true },
          // Earliest-added item first: it supplies itemType, metalType and rate.
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        },
        customer: { select: { name: true } },
      },
    });

    if (!pledge)
      return NextResponse.json({ error: "Pledge not found" }, { status: 404 });

    if (!isOpenPledgeStatus(pledge.status)) {
      return NextResponse.json(
        { error: "NOT_ACTIVE", message: "Only active or overdue pledges can be added to inventory." },
        { status: 409 }
      );
    }

    const body = await req.json();
    const { buyPrice, notes, saleDate } = body;

    if (typeof buyPrice !== "number" || isNaN(buyPrice) || buyPrice < 0) {
      return NextResponse.json({ error: "buyPrice must be a number >= 0" }, { status: 400 });
    }

    if (!saleDate) {
      return NextResponse.json({ error: "saleDate is required" }, { status: 400 });
    }

    const saleDateObj = new Date(saleDate);
    if (isNaN(saleDateObj.getTime())) {
      return NextResponse.json({ error: "Invalid saleDate" }, { status: 400 });
    }

    if (saleDateObj <= new Date(pledge.pledgeDate)) {
      return NextResponse.json({ error: "saleDate must be after pledgeDate" }, { status: 400 });
    }

    if (notes !== undefined && notes !== null && typeof notes === "string" && notes.length > 2000) {
      return NextResponse.json({ error: "VALIDATION", message: "Notes must be at most 2000 characters" }, { status: 400 });
    }

    // ── Fetch metal prices once ───────────────────────────────────────
    const [goldPrice, silverPrice] = await Promise.all([
      prisma.metalPrice.findFirst({ where: { metal: "GOLD"   }, orderBy: { createdAt: "desc" } }),
      prisma.metalPrice.findFirst({ where: { metal: "SILVER" }, orderBy: { createdAt: "desc" } }),
    ]);

    // Owed, valuation and every row to write — the shared sale core.
    const sale = buildPledgeSale({
      ownerId: user.id,
      pledge: {
        ...pledge,
        customerName: pledge.customer.name,
      },
      items:    pledge.items,
      saleDate: saleDateObj,
      buyPrice,
      prices: {
        goldPpg:   goldPrice   ? parseFloat(goldPrice.inrPerGram.toString())   : null,
        silverPpg: silverPrice ? parseFloat(silverPrice.inrPerGram.toString()) : null,
      },
      notes: typeof notes === "string" ? notes : null,
    });

    // ── Atomic transaction ────────────────────────────────────────────
    try {
      await prisma.$transaction(async (tx) => {
        const cashEntry = await writePledgeSale(tx, sale);
        await recordCashEntries(tx, user.id, [cashEntry]);
      }, { timeout: 30000 });
    } catch (err: unknown) {
      if (err instanceof Error && err.message === PLEDGE_NOT_OPEN) {
        return NextResponse.json(
          { error: "NOT_ACTIVE", message: "Pledge is no longer active." },
          { status: 409 }
        );
      }
      throw err;
    }

    return NextResponse.json({ success: true, message: "Pledge added to inventory." });

  } catch (err) {
    console.error("PLEDGE SELL ERROR:", errorTag(err));
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
