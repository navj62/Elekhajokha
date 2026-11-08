import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { recordCashEntries, errorTag, type NewCashEntry } from "@/lib/cashBook";
import { writePledgeSale, PLEDGE_NOT_OPEN } from "@/lib/pledgeSale";
import {
  ForfeitRejection,
  evaluateForfeit,
  forfeitPledgeSelect,
  parseForfeitBody,
  readSalePrices,
} from "@/lib/pledgeForfeit";

/* ------------------------------------------------------------------ */
/*  POST /api/ltv/forfeit                                              */
/*  Bulk forfeit: every pledge in the body is sold to inventory in ONE */
/*  transaction, or none is. The client sends pledge ids and optional  */
/*  inventory prices only — owner, owed, prices and dates are server's.*/
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
    const ids = requested.map((r) => r.pledgeId);

    const result = await prisma.$transaction(async (tx) => {
      // Lock every requested pledge of THIS shop, in id order, in one
      // statement — before anything is read or written. Pledges are always
      // locked before today's cash-day row (taken last, by recordCashEntries),
      // and multi-pledge paths lock in id order, so overlapping forfeits and
      // releases wait for each other instead of deadlocking. COLLATE "C"
      // makes the SQL order match the JS order used everywhere else.
      await tx.$queryRaw`
        SELECT p.id FROM pledges p
        JOIN customers c ON c.id = p."customerId"
        WHERE p.id = ANY(${ids}::text[]) AND c."userId" = ${user.id}
        ORDER BY p.id COLLATE "C"
        FOR UPDATE OF p`;

      // Owed, prices and market value are recomputed here, under the lock.
      const [pledges, prices] = await Promise.all([
        tx.pledge.findMany({
          where:  { id: { in: ids }, customer: { userId: user.id } },
          select: forfeitPledgeSelect,
        }),
        readSalePrices(tx),
      ]);

      const { sales, totals } = evaluateForfeit({
        ownerId: user.id,
        requested,
        pledges,
        now: new Date(),
        prices,
      });

      const cashEntries: NewCashEntry[] = [];
      for (const sale of sales) {
        try {
          cashEntries.push(await writePledgeSale(tx, sale));
        } catch (err) {
          // The lock + status check above should make this unreachable.
          if (err instanceof Error && err.message === PLEDGE_NOT_OPEN) {
            throw new ForfeitRejection(409, {
              error: "NOT_OPEN", message: "Some pledges are already closed.", offendingIds: [sale.audit.pledgeId],
            });
          }
          throw err;
        }
      }

      // One PLEDGE_SOLD entry per pledge (₹0 unless cost > owed, which the
      // checks forbid), in ONE statement, day row locked last.
      await recordCashEntries(tx, user.id, cashEntries);

      return { ...totals, forfeitedIds: sales.map((s) => s.audit.pledgeId) };
    }, { timeout: 30000 });

    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    if (err instanceof ForfeitRejection)
      return NextResponse.json(err.body, { status: err.status });
    console.error("BULK FORFEIT ERROR:", errorTag(err));
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
