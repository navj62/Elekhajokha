import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { updateCashDay, errorTag } from "@/lib/cashBook";
import { isIsoDay, parseCashAmount } from "@/lib/cashBookShared";

/* ------------------------------------------------------------------ */
/*  PATCH /api/cash-book/day — today's opening edit and drawer count    */
/*  Body: { date, openingCash?: amount | null, countedCash?: amount }   */
/*  `date` is the day the page is showing; anything but today → 409.    */
/*  openingCash null clears the edit (back to the carried value).       */
/* ------------------------------------------------------------------ */
export async function PATCH(req: Request) {
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

    const patch: { openingOverride?: string | null; countedCash?: string } = {};
    if ("openingCash" in body) {
      if (body.openingCash === null) {
        patch.openingOverride = null;
      } else {
        const v = parseCashAmount(body.openingCash, { allowZero: true });
        if (!v.ok) return NextResponse.json({ error: "VALIDATION", message: v.message }, { status: 400 });
        patch.openingOverride = v.value;
      }
    }
    if ("countedCash" in body) {
      const v = parseCashAmount(body.countedCash, { allowZero: true });
      if (!v.ok) return NextResponse.json({ error: "VALIDATION", message: v.message }, { status: 400 });
      patch.countedCash = v.value;
    }
    if (!("openingOverride" in patch) && !("countedCash" in patch))
      return NextResponse.json({ error: "VALIDATION", message: "Nothing to update." }, { status: 400 });

    const ok = await updateCashDay(prisma, user.id, body.date, patch);
    if (!ok)
      return NextResponse.json(
        { error: "DAY_CLOSED", message: "That day has closed. Refresh to see today." },
        { status: 409 }
      );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("CASH DAY UPDATE ERROR:", errorTag(err));
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
