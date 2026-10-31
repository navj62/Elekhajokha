// app/api/reports/summary/route.ts
//
// GET — the Reports page's top-strip pledge counts (all pledges, ACTIVE
// pledges) for the signed-in shop. Counted in the database; no rows loaded.
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { pledgeStripCounts } from "@/lib/reports/reportQueries";

export async function GET() {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkUserId }, select: { id: true } });
    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    return NextResponse.json(await pledgeStripCounts(user.id), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("Report summary failed:", err instanceof Error ? err.message : "unknown");
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
