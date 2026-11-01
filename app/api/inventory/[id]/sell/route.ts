import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { saleDateError, buyerMobileError } from "@/lib/inventorySale";
import { recordCashEntries, errorTag } from "@/lib/cashBook";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where:  { clerkUserId },
      select: { id: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { id } = await context.params;

    const item = await prisma.inventoryItem.findFirst({
      where: { id, ownerId: user.id },
    });

    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (item.status !== "IN_STOCK") {
      return NextResponse.json(
        { error: "ALREADY_SOLD", message: "Item is already sold." },
        { status: 409 }
      );
    }

    const body = await req.json();
    const { soldPrice, soldAt, buyerName, buyerMobile, saleNotes } = body;

    if (typeof soldPrice !== "number" || isNaN(soldPrice) || soldPrice <= 0)
      return NextResponse.json({ error: "soldPrice must be > 0" }, { status: 400 });

    const soldAtDate = new Date(soldAt);
    if (!soldAt || isNaN(soldAtDate.getTime()))
      return NextResponse.json({ error: "Invalid soldAt" }, { status: 400 });

    const dateError = saleDateError(soldAtDate, item.acquiredAt, new Date());
    if (dateError)
      return NextResponse.json({ error: "VALIDATION", message: dateError }, { status: 400 });

    if (typeof buyerName === "string" && buyerName.length > 200)
      return NextResponse.json({ error: "VALIDATION", message: "Buyer name must be at most 200 characters" }, { status: 400 });
    if (typeof buyerMobile === "string" && buyerMobile.length > 20)
      return NextResponse.json({ error: "VALIDATION", message: "Buyer mobile must be at most 20 characters" }, { status: 400 });
    const mobileError = buyerMobileError(buyerMobile);
    if (mobileError)
      return NextResponse.json({ error: "VALIDATION", message: mobileError }, { status: 400 });
    if (typeof saleNotes === "string" && saleNotes.length > 2000)
      return NextResponse.json({ error: "VALIDATION", message: "Sale notes must be at most 2000 characters" }, { status: 400 });

    // Atomic guard: the status predicate lives in the WHERE clause so two
    // concurrent sells can't both pass an app-code check and overwrite each
    // other. Mirrors the pledge release / pledge-sell updateMany pattern.
    // The sale and its INVENTORY_SOLD cash entry commit together.
    const price = new Prisma.Decimal(soldPrice).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    const buyer = typeof buyerName === "string" ? buyerName.trim() || null : null;
    try {
      await prisma.$transaction(async (tx) => {
        const result = await tx.inventoryItem.updateMany({
          where: {
            id,
            ownerId: user.id,
            status:  "IN_STOCK",
          },
          data: {
            status:      "SOLD",
            soldAt:      soldAtDate,
            soldPrice:   price,
            buyerName:   buyer,
            buyerMobile: typeof buyerMobile === "string" ? buyerMobile.trim() || null : null,
            saleNotes:   typeof saleNotes  === "string" ? saleNotes.trim()  || null : null,
          },
        });
        if (result.count === 0) throw new Error("ALREADY_SOLD");

        await recordCashEntries(tx, user.id, [{
          kind:            "INVENTORY_SOLD",
          direction:       "IN",
          amount:          price,
          partyName:       buyer,
          inventoryItemId: id,
          eventAt:         soldAtDate,
        }]);
      });
    } catch (err) {
      if (err instanceof Error && err.message === "ALREADY_SOLD")
        return NextResponse.json(
          { error: "ALREADY_SOLD", message: "Item is already sold." },
          { status: 409 }
        );
      throw err;
    }

    const updated = await prisma.inventoryItem.findFirst({
      where: { id, ownerId: user.id },
    });

    return NextResponse.json({ item: updated });
  } catch (err) {
    console.error("POST /api/inventory/[id]/sell failed:", errorTag(err));
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
