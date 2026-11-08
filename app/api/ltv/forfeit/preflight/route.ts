import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { errorTag } from "@/lib/cashBook";
import {
  ForfeitRejection,
  evaluateForfeit,
  forfeitPledgeSelect,
  parseForfeitBody,
  readSalePrices,
} from "@/lib/pledgeForfeit";

/* ------------------------------------------------------------------ */
/*  POST /api/ltv/forfeit/preflight                                    */
/*  Read-only preview for the bulk-forfeit review sheet. Runs the same */
/*  checks as the execute route; writes nothing.                       */
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

    const requested = parseForfeitBody(await req.json().catch(() => null));

    const [pledges, prices] = await Promise.all([
      prisma.pledge.findMany({
        where:  { id: { in: requested.map((r) => r.pledgeId) }, customer: { userId: user.id } },
        select: forfeitPledgeSelect,
      }),
      readSalePrices(prisma),
    ]);

    const { previews, totals } = evaluateForfeit({
      ownerId: user.id,
      requested,
      pledges,
      now: new Date(),
      prices,
    });

    return NextResponse.json({ pledges: previews, totals }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    if (err instanceof ForfeitRejection)
      return NextResponse.json(err.body, { status: err.status });
    console.error("FORFEIT PREFLIGHT ERROR:", errorTag(err));
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
