import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getCashDaySummary, serializeCashDay, errorTag } from "@/lib/cashBook";

/* ------------------------------------------------------------------ */
/*  GET /api/cash-book/summary — today's totals for the dashboard card */
/*  One query (lib/cashBook.ts daySummarySql).                          */
/* ------------------------------------------------------------------ */
export async function GET() {
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

    const summary = await getCashDaySummary(prisma, user.id, null);
    return NextResponse.json({ day: serializeCashDay(summary) });
  } catch (err) {
    console.error("CASH BOOK SUMMARY ERROR:", errorTag(err));
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
