import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { editCashEntry, deleteManualCashEntry, errorTag, type CashEntryEdit } from "@/lib/cashBook";
import {
  isIsoDay,
  parseCashAmount,
  parseCashDirection,
  parseCashMode,
  parseCashNote,
} from "@/lib/cashBookShared";

type RouteContext = { params: Promise<{ id: string }> };

const DAY_CLOSED_RESPONSE = () =>
  NextResponse.json(
    { error: "DAY_CLOSED", message: "That day has closed. Refresh to see today." },
    { status: 409 }
  );

async function resolveUserId() {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) return null;
  const user = await prisma.user.findUnique({ where: { clerkUserId }, select: { id: true } });
  return user?.id ?? null;
}

/**
 * Why a guarded write matched no row. Read AFTER the write failed, purely to
 * pick the message — the write itself already enforced every rule.
 */
async function whyNotWritten(userId: string, id: string) {
  const entry = await prisma.cashEntry.findFirst({
    where:  { id, userId },
    select: { date: true, reversedBy: { select: { id: true } } },
  });
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (entry.reversedBy)
    return NextResponse.json(
      { error: "ENTRY_REVERSED", message: "This entry was reversed and can no longer change." },
      { status: 409 }
    );
  // Entry on another day, or the page's day is no longer today.
  return DAY_CLOSED_RESPONSE();
}

/* ------------------------------------------------------------------ */
/*  PATCH /api/cash-book/entries/[id]                                   */
/*  Body: { date, amount?, mode?, note?, direction? }                   */
/*  Any entry on today's page: amount, mode, note (REVERSAL: mode and   */
/*  note only). MANUAL also direction. originalAmount never changes.    */
/* ------------------------------------------------------------------ */
export async function PATCH(req: Request, context: RouteContext) {
  try {
    const userId = await resolveUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await context.params;
    const body = await req.json().catch(() => null);
    if (!body || !isIsoDay(body.date))
      return NextResponse.json({ error: "VALIDATION", message: "date must be YYYY-MM-DD." }, { status: 400 });

    // kind is immutable, so reading it first to pick the validation rules is
    // safe; everything that CAN change (day, reversal) is checked in the write.
    const entry = await prisma.cashEntry.findFirst({ where: { id, userId }, select: { kind: true } });
    if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const bad = (message: string) => NextResponse.json({ error: "VALIDATION", message }, { status: 400 });
    const edit: CashEntryEdit = {};
    if ("amount" in body) {
      if (entry.kind === "REVERSAL") return bad("A reversal's amount always matches the entry it cancels.");
      // Manual entries need > 0; an automatic one may be 0 (a ₹0 sale settlement).
      const v = parseCashAmount(body.amount, { allowZero: entry.kind !== "MANUAL" });
      if (!v.ok) return bad(v.message);
      edit.amount = v.value;
    }
    if ("mode" in body) {
      const v = parseCashMode(body.mode);
      if (!v.ok) return bad(v.message);
      edit.mode = v.value;
    }
    if ("note" in body) {
      const v = parseCashNote(body.note);
      if (!v.ok) return bad(v.message);
      edit.note = v.value;
    }
    if ("direction" in body) {
      if (entry.kind !== "MANUAL") return bad("Only manual entries can change direction.");
      const v = parseCashDirection(body.direction);
      if (!v.ok) return bad(v.message);
      edit.direction = v.value;
    }
    if (Object.keys(edit).length === 0) return bad("Nothing to update.");

    const ok = await editCashEntry(prisma, userId, id, body.date, edit);
    if (!ok) return whyNotWritten(userId, id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("CASH ENTRY EDIT ERROR:", errorTag(err));
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}

/* ------------------------------------------------------------------ */
/*  DELETE /api/cash-book/entries/[id]?date=YYYY-MM-DD                  */
/*  MANUAL entries on today's page only. Automatic entries are never    */
/*  deleted — edit the amount instead.                                  */
/* ------------------------------------------------------------------ */
export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const userId = await resolveUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await context.params;
    const date = req.nextUrl.searchParams.get("date");
    if (!isIsoDay(date))
      return NextResponse.json({ error: "VALIDATION", message: "date must be YYYY-MM-DD." }, { status: 400 });

    const ok = await deleteManualCashEntry(prisma, userId, id, date);
    if (ok) return NextResponse.json({ success: true });

    const entry = await prisma.cashEntry.findFirst({ where: { id, userId }, select: { kind: true } });
    if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (entry.kind !== "MANUAL")
      return NextResponse.json(
        { error: "NOT_DELETABLE", message: "Automatic entries can't be deleted. Edit the amount instead." },
        { status: 409 }
      );
    return DAY_CLOSED_RESPONSE();
  } catch (err) {
    console.error("CASH ENTRY DELETE ERROR:", errorTag(err));
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
