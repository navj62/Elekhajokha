import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { clerkUserId },
      select: { id: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { id } = await context.params;

    const type = await prisma.pledgeItemType.findFirst({
      where: { id, userId: user.id },
    });

    if (!type) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (type.isDefault) return NextResponse.json({ error: "Cannot delete system default types" }, { status: 403 });

    await prisma.pledgeItemType.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/item-types/[id] failed:", err);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
