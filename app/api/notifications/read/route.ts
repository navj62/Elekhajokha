// app/api/notifications/read/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// ─────────────────────────────────────────────
// PATCH /api/notifications/read
//
// Body (optional):
//   { ids: ["id1", "id2"] }  → mark specific alerts as read
//   {} or empty body         → mark ALL unread as read
// ─────────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Resolve internal user ──
  const user = await prisma.user.findUnique({
    where: { clerkUserId },
    select: { id: true },
  });
  
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // ── Parse body ──
  // Gracefully handle empty bodies without crashing
  const body = await req.json().catch(() => ({}));
  const ids = Array.isArray(body?.ids) ? body.ids : undefined;

  // ── Mark as read ──
  // If ids are provided, update only those. Otherwise, update all unread for this user.
  const result = await prisma.pledgeAlert.updateMany({
    where: {
      userId: user.id,
      isRead: false,
      ...(ids ? { id: { in: ids } } : {}),
    },
    data: { isRead: true },
  });

  return NextResponse.json({ updated: result.count });
}