import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { recordCashEntries, errorTag, DAY_CLOSED } from "@/lib/cashBook";
import {
  isIsoDay,
  parseCashAmount,
  parseCashDirection,
  parseCashMode,
  parseCashNote,
} from "@/lib/cashBookShared";

/* ------------------------------------------------------------------ */
/*  POST /api/cash-book/entries — add a MANUAL entry to today's page    */
/*  Body: { date, direction, amount, mode?, note? }. Kind, user and the */
/*  recorded day are server-decided; `date` must still be today → 409.  */
/* ------------------------------------------------------------------ */
export async function POST(req: Request) {
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

    const body = await req.json().catch(() => null);
    if (!body || !isIsoDay(body.date))
      return NextResponse.json({ error: "VALIDATION", message: "date must be YYYY-MM-DD." }, { status: 400 });

    const bad = (message: string) => NextResponse.json({ error: "VALIDATION", message }, { status: 400 });
    const direction = parseCashDirection(body.direction);
    if (!direction.ok) return bad(direction.message);
    const amount = parseCashAmount(body.amount);
    if (!amount.ok) return bad(amount.message);
    const mode = parseCashMode(body.mode ?? "CASH");
    if (!mode.ok) return bad(mode.message);
    const note = parseCashNote(body.note);
    if (!note.ok) return bad(note.message);

    try {
      const [id] = await recordCashEntries(
        prisma,
        user.id,
        [{ kind: "MANUAL", direction: direction.value, amount: amount.value, mode: mode.value, note: note.value }],
        { expectDay: body.date },
      );
      return NextResponse.json({ id }, { status: 201 });
    } catch (err) {
      if (err instanceof Error && err.message === DAY_CLOSED)
        return NextResponse.json(
          { error: "DAY_CLOSED", message: "That day has closed. Refresh to see today." },
          { status: 409 }
        );
      throw err;
    }
  } catch (err) {
    console.error("CASH ENTRY ADD ERROR:", errorTag(err));
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
