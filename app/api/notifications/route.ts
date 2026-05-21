// app/api/notifications/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
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
  const unreadOnly = searchParams.get("unreadOnly") === "true";
  const take = Math.min(Number(searchParams.get("take") ?? 20), 50);
  const cursor = searchParams.get("cursor");

  const alerts = await prisma.pledgeAlert.findMany({
    where: {
      userId: user.id,
      ...(unreadOnly ? { isRead: false } : {}),
      ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: take + 1,
    select: {
      id: true,
      oldTier: true,
      newTier: true,
      alertType: true,
      message: true,
      isRead: true,
      createdAt: true,
      pledge: {
        select: {
          id: true,
          customerId: true,   // ← needed for /customers/[id]/pledges/[id] link
          loanAmount: true,
          lastCalculatedLtv: true,
          lastMarketValue: true,
          lastAmountOwed: true,
          // ← item names so UI can show "Gold Chain, Ring" instead of pledge ID
          items: {
            select: { itemName: true, itemType: true, metalType: true },
            take: 3, // enough for display, don't over-fetch
          },
        },
      },
      customer: {
        select: { id: true, name: true },
      },
    },
  });

  const unreadCount = await prisma.pledgeAlert.count({
    where: { userId: user.id, isRead: false },
  });

  const hasMore = alerts.length > take;
  const items = hasMore ? alerts.slice(0, take) : alerts;
  const nextCursor = hasMore ? items[items.length - 1].createdAt.toISOString() : null;

  return NextResponse.json({ alerts: items, unreadCount, hasMore, nextCursor });
}