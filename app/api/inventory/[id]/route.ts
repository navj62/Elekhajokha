import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
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
      where:   { id, ownerId: user.id },
      include: {
        sourcePledge: {
          select: {
            id: true,
            customerId: true,
            customer: { select: { name: true } },
          },
        },
      },
    });

    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ item });
  } catch (err) {
    console.error("GET /api/inventory/[id] failed:", err);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
