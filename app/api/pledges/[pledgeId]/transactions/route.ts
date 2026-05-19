// app/api/pledges/[pledgeId]/transactions/route.ts

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ pledgeId: string }>;
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
async function getAuthorizedPledge(pledgeId: string) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) return { error: "Unauthorized", status: 401 };

  const user = await prisma.user.findUnique({
    where:  { clerkUserId },
    select: { id: true },
  });
  if (!user) return { error: "User not found", status: 404 };

  const pledge = await prisma.pledge.findFirst({
    where: {
      id:       pledgeId,
      customer: { userId: user.id },
    },
    select: { id: true, status: true },
  });
  if (!pledge) return { error: "Pledge not found", status: 404 };

  return { pledge };
}

/* ================================================================== */
/*  POST /api/pledges/[pledgeId]/transactions                          */
/*  Add a new transaction (repayment or top-up)                       */
/* ================================================================== */
export async function POST(req: Request, context: RouteContext) {
  try {
    const { pledgeId } = await context.params;
    if (!pledgeId) {
      return NextResponse.json({ error: "Pledge ID required" }, { status: 400 });
    }

    const result = await getAuthorizedPledge(pledgeId);
    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    /* ---- Parse body ---------------------------------------------- */
    const body = await req.json();
    const { amount, type, note } = body;

    /* ---- Validate ------------------------------------------------ */
    if (amount === undefined || amount === null) {
      return NextResponse.json({ error: "Amount is required" }, { status: 400 });
    }

    const amountNum = Number(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return NextResponse.json(
        { error: "Amount must be a positive number" },
        { status: 400 }
      );
    }

    if (!type || !VALID_TYPES.includes(type as TransactionType)) {
      return NextResponse.json(
        { error: `Invalid transaction type. Must be one of: ${VALID_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    /* ---- Create -------------------------------------------------- */
    const transaction = await prisma.transaction.create({
      data: {
        pledgeId,
        amount: amountNum,
        type:   type as TransactionType,
        note:   note?.toString().trim() || null,
      },
    });

    return NextResponse.json({ transaction }, { status: 201 });
  } catch (err) {
    console.error("POST /transactions error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/* ================================================================== */
/*  GET /api/pledges/[pledgeId]/transactions                           */
/*  Fetch all transactions for a pledge, newest first                  */
/* ================================================================== */
export async function GET(_req: Request, context: RouteContext) {
  try {
    const { pledgeId } = await context.params;
    if (!pledgeId) {
      return NextResponse.json({ error: "Pledge ID required" }, { status: 400 });
    }

    const result = await getAuthorizedPledge(pledgeId);
    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

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