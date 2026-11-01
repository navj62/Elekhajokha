import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import {
  getCashDaySummary,
  getCashDayEntries,
  serializeCashDay,
  serializeCashEntry,
  errorTag,
} from "@/lib/cashBook";
import { isIsoDay } from "@/lib/cashBookShared";

/* ------------------------------------------------------------------ */
/*  GET /api/cash-book[?date=YYYY-MM-DD] — one day's page              */
/*  Default today (IST, decided by Postgres). Past days are read-only; */
/*  future days are refused. Two queries: summary + entries.           */
/* ------------------------------------------------------------------ */
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

    const dateParam = req.nextUrl.searchParams.get("date");
    if (dateParam !== null && !isIsoDay(dateParam))
      return NextResponse.json({ error: "INVALID_DATE", message: "date must be YYYY-MM-DD." }, { status: 400 });

    // With an explicit date both queries can run at once; for "today" the
    // entries query needs the date Postgres decided.
    const [summary, entriesForParam] = await Promise.all([
      getCashDaySummary(prisma, user.id, dateParam),
      dateParam ? getCashDayEntries(prisma, user.id, dateParam) : Promise.resolve(null),
    ]);
    if (summary.date > summary.today)
      return NextResponse.json({ error: "FUTURE_DATE", message: "That day hasn't happened yet." }, { status: 400 });

    const entries = entriesForParam ?? (await getCashDayEntries(prisma, user.id, summary.date));
    const day = serializeCashDay(summary);

    return NextResponse.json({
      day,
      entries: entries.map((e) => serializeCashEntry(e, day.isToday)),
    });
  } catch (err) {
    console.error("CASH BOOK DAY ERROR:", errorTag(err));
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
