import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { recordCashEntries, errorTag } from "@/lib/cashBook";
import { parseCashAmount } from "@/lib/cashBookShared";
import { isOpenPledgeStatus, OPEN_PLEDGE_STATUSES } from "@/lib/pledgeConstants";

type RouteContext = {
  params: Promise<{
    customerId: string;
    pledgeId:   string;
  }>;
};

const VALID_TYPES = [
  "REPAYMENT_PRINCIPAL",
  "REPAYMENT_INTEREST",
  "TOPUP",
] as const;

type TransactionType = typeof VALID_TYPES[number];

/* ------------------------------------------------------------------ */
/*  Shared: auth + pledge ownership check                              */
/* ------------------------------------------------------------------ */
async function getAuthorizedPledge(customerId: string, pledgeId: string) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) return { error: "Unauthorized", status: 401 as const };

  const user = await prisma.user.findUnique({
    where:  { clerkUserId },
    select: { id: true },
  });
  if (!user) return { error: "User not found", status: 404 as const };

  const pledge = await prisma.pledge.findFirst({
    where: {
      id:         pledgeId,
      customerId,                    // ✅ scoped to customer in URL
      customer: { userId: user.id },
    },
    select: { id: true, status: true, customer: { select: { name: true } } },
  });
  if (!pledge) return { error: "Pledge not found", status: 404 as const };

  return { pledge, userId: user.id };
}

/* ================================================================== */
/*  POST /api/customers/[customerId]/pledges/[pledgeId]/transactions   */
/* ================================================================== */
export async function POST(req: Request, context: RouteContext) {
  try {
    const { customerId, pledgeId } = await context.params;

    const result = await getAuthorizedPledge(customerId, pledgeId);
    if ("error" in result)
      return NextResponse.json({ error: result.error }, { status: result.status });

    const body = await req.json();
    const { amount, type, note, transactionDate } = body;

    if (amount === undefined || amount === null)
      return NextResponse.json({ error: "Amount is required" }, { status: 400 });

    // > 0, at most 2 decimals, at most ₹10,00,00,000 — the cash book's rule.
    const amountCheck = parseCashAmount(amount);
    if (!amountCheck.ok)
      return NextResponse.json({ error: amountCheck.message }, { status: 400 });

    // Part-payments only on open loans. Re-checked under a row lock below,
    // so a release committing in between cannot slip one in.
    if (!isOpenPledgeStatus(result.pledge.status))
      return NextResponse.json(
        { error: "PLEDGE_CLOSED", message: "Payments can only be recorded on active pledges." },
        { status: 409 }
      );

    if (!type || !VALID_TYPES.includes(type as TransactionType))
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${VALID_TYPES.join(", ")}` },
        { status: 400 }
      );

    if (note !== undefined && note !== null && typeof note === "string" && note.length > 1000)
      return NextResponse.json(
        { error: "VALIDATION", message: "Note must be at most 1000 characters" },
        { status: 400 }
      );

    let createdAt = new Date();
    if (transactionDate) {
      const parsed = new Date(transactionDate);
      if (isNaN(parsed.getTime()))
        return NextResponse.json({ error: "Invalid transaction date" }, { status: 400 });
      createdAt = parsed;
    }

    // The transaction and its REPAYMENT / TOPUP cash entry commit together.
    // `createdAt` above is the transaction's own (possibly backdated) date;
    // the cash entry lands on today and carries that date as eventDate.
    let transaction;
    try {
      transaction = await prisma.$transaction(async (tx) => {
        // FOR SHARE blocks a concurrent release/sale (an UPDATE) until commit,
        // and is taken before the day row, matching the other paths' order.
        const open = await tx.$queryRaw<{ id: string }[]>`
          SELECT p.id FROM "pledges" p
          JOIN "customers" c ON c.id = p."customerId"
          WHERE p.id = ${pledgeId} AND p."customerId" = ${customerId} AND c."userId" = ${result.userId}
            AND p.status::text IN (${Prisma.join([...OPEN_PLEDGE_STATUSES])})
          FOR SHARE OF p`;
        if (open.length === 0) throw new Error("PLEDGE_CLOSED");

        const created = await tx.transaction.create({
          data: {
            pledgeId,
            amount:    new Prisma.Decimal(amountCheck.value),
            type:      type as TransactionType,
            note:      note?.toString().trim() || null,
            createdAt,
          },
        });
        const isTopup = created.type === "TOPUP";
        await recordCashEntries(tx, result.userId, [{
          kind:          isTopup ? "TOPUP" : "REPAYMENT",
          direction:     isTopup ? "OUT" : "IN",
          amount:        created.amount,
          partyName:     result.pledge.customer.name,
          customerId,
          transactionId: created.id,
          eventAt:       createdAt,
        }]);
        return created;
      });
    } catch (err) {
      if (err instanceof Error && err.message === "PLEDGE_CLOSED")
        return NextResponse.json(
          { error: "PLEDGE_CLOSED", message: "Payments can only be recorded on active pledges." },
          { status: 409 }
        );
      throw err;
    }

    return NextResponse.json({ transaction }, { status: 201 });

  } catch (err) {
    console.error("POST /transactions error:", errorTag(err));
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/* ================================================================== */
/*  GET /api/customers/[customerId]/pledges/[pledgeId]/transactions    */
/* ================================================================== */
export async function GET(_req: Request, context: RouteContext) {
  try {
    const { customerId, pledgeId } = await context.params; // ✅ both params

    const result = await getAuthorizedPledge(customerId, pledgeId); // ✅ was missing customerId
    if ("error" in result)
      return NextResponse.json({ error: result.error }, { status: result.status });

    const transactions = await prisma.transaction.findMany({
      where:   { pledgeId },
      orderBy: { createdAt: "desc" },
      select: {
        id:        true,
        amount:    true,
        type:      true,
        note:      true,
        createdAt: true,
      },
    });

    return NextResponse.json({ transactions });

  } catch (err) {
    console.error("GET /transactions error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}