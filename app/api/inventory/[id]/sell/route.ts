import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

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

    const updated = await prisma.inventoryItem.update({
      where: { id },
      data: {
        status:     "SOLD",
        soldAt:     soldAtDate,
        soldPrice:  new Prisma.Decimal(soldPrice),
        buyerName:  typeof buyerName  === "string" ? buyerName.trim()  || null : null,
        buyerMobile: typeof buyerMobile === "string" ? buyerMobile.trim() || null : null,
        saleNotes:  typeof saleNotes  === "string" ? saleNotes.trim()  || null : null,
      },
    });

    return NextResponse.json({ item: updated });
  } catch (err) {
    console.error("POST /api/inventory/[id]/sell failed:", err);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
