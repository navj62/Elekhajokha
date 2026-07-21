import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

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
    select: { id: true, status: true },
  });
  if (!pledge) return { error: "Pledge not found", status: 404 as const };

  return { pledge };
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

    const amountNum = Number(amount);
    if (isNaN(amountNum) || amountNum <= 0)
      return NextResponse.json({ error: "Amount must be a positive number" }, { status: 400 });

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

    const transaction = await prisma.transaction.create({
      data: {
        pledgeId,
        amount:    new Prisma.Decimal(amountNum),
        type:      type as TransactionType,
        note:      note?.toString().trim() || null,
        createdAt,
      },
    });

    return NextResponse.json({ transaction }, { status: 201 });

  } catch (err) {
    console.error("POST /transactions error:", err);
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