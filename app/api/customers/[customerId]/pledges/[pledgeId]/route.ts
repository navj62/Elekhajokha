import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { calculateHybridInterest } from "@/lib/interest";

type RouteContext = {
  params: Promise<{
    customerId: string; // ✅ was missing
    pledgeId:   string;
  }>;
};

const CALCULATION_VERSION = 1;
const VALID_COMPOUNDING = ["MONTHLY", "HALFYEARLY", "YEARLY"] as const;
type CompoundingDuration = typeof VALID_COMPOUNDING[number];

/* ------------------------------------------------------------------ */
/*  PATCH /api/customers/[customerId]/pledges/[pledgeId] — release     */
/* ------------------------------------------------------------------ */
export async function PATCH(req: Request, context: RouteContext) {
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

    const { customerId, pledgeId } = await context.params;

    // ✅ Verify pledge belongs to this customer AND this user
    const pledge = await prisma.pledge.findFirst({
      where: {
        id:         pledgeId,
        customerId,                       // ✅ scoped to customer in URL
        customer: { userId: user.id },
      },
    });
    if (!pledge)
      return NextResponse.json({ error: "Pledge not found" }, { status: 404 });
    if (pledge.status !== "ACTIVE")
      return NextResponse.json({ error: "Only active pledges can be released" }, { status: 400 });

    const body = await req.json();
    const { releaseDate, allowCompounding, compoundingDuration } = body;

    if (!releaseDate)
      return NextResponse.json({ error: "Release date required" }, { status: 400 });

    const releaseDateObj = new Date(releaseDate);
    if (isNaN(releaseDateObj.getTime()))
      return NextResponse.json({ error: "Invalid release date" }, { status: 400 });
    if (releaseDateObj <= new Date(pledge.pledgeDate))
      return NextResponse.json({ error: "Release date must be after pledge date" }, { status: 400 });

    const safeAllowCompounding: boolean =
      typeof allowCompounding === "boolean" ? allowCompounding : false;

    const safeCompoundingDuration: CompoundingDuration =
      VALID_COMPOUNDING.includes(compoundingDuration as CompoundingDuration)
        ? compoundingDuration as CompoundingDuration
        : "MONTHLY";

    const principal = parseFloat(pledge.loanAmount.toString());
    const rate      = parseFloat(pledge.interestRate.toString());

    const calc = calculateHybridInterest(
      principal,
      rate,
      new Date(pledge.pledgeDate),
      releaseDateObj,
      safeAllowCompounding,
      safeCompoundingDuration
    );

    // ── Fetch latest metal prices ─────────────────────────────────
    const [goldPrice, silverPrice] = await Promise.all([
      prisma.metalPrice.findFirst({ where: { metal: "GOLD"   }, orderBy: { createdAt: "desc" } }),
      prisma.metalPrice.findFirst({ where: { metal: "SILVER" }, orderBy: { createdAt: "desc" } }),
    ]);

    const goldPpg   = goldPrice   ? parseFloat(goldPrice.inrPerGram.toString())   : null;
    const silverPpg = silverPrice ? parseFloat(silverPrice.inrPerGram.toString()) : null;

    const netWeightOfGold   = parseFloat(pledge.netWeightOfGold.toString());
    const netWeightOfSilver = parseFloat(pledge.netWeightOfSilver.toString());

    const marketValueRaw =
      (goldPpg   !== null ? goldPpg   * netWeightOfGold   : 0) +
      (silverPpg !== null ? silverPpg * netWeightOfSilver : 0);

    const marketValueAtRelease = marketValueRaw > 0 ? marketValueRaw : null;
    const ltvAtRelease =
      marketValueAtRelease && marketValueAtRelease > 0
        ? Math.round((calc.receivableAmount / marketValueAtRelease) * 10000) / 100
        : null;

    // ── Transaction with race-condition guard ─────────────────────
    let updated;
    try {
      updated = await prisma.$transaction(async (tx) => {
        const result = await tx.pledge.updateMany({
          where: { id: pledgeId, status: "ACTIVE" }, // ✅ guard against double-release
          data: {
            status:              "RELEASED",
            releaseDate:         releaseDateObj,
            allowCompounding:    safeAllowCompounding,
            compoundingDuration: safeCompoundingDuration,
            durationMonths:      new Prisma.Decimal(calc.T),
            calculationVersion:  CALCULATION_VERSION,
            totalInterest:       new Prisma.Decimal(calc.totalInterest),
            receivableAmount:    new Prisma.Decimal(calc.receivableAmount),
          },
        });

        if (result.count === 0) throw new Error("ALREADY_RELEASED");

        await tx.pledgeAudit.create({
          data: {
            pledgeId,
            action:              "RELEASED",
            principal:           pledge.loanAmount,
            interestRate:        pledge.interestRate,
            allowCompounding:    safeAllowCompounding,
            compoundingDuration: safeCompoundingDuration,
            calculationVersion:  CALCULATION_VERSION,
            durationMonths:      new Prisma.Decimal(calc.T),
            totalInterest:       new Prisma.Decimal(calc.totalInterest),
            receivableAmount:    new Prisma.Decimal(calc.receivableAmount),
            netWeightOfGold:     new Prisma.Decimal(netWeightOfGold),
            netWeightOfSilver:   new Prisma.Decimal(netWeightOfSilver),
            goldPricePerGram:    goldPpg   !== null ? new Prisma.Decimal(goldPpg)            : null,
            silverPricePerGram:  silverPpg !== null ? new Prisma.Decimal(silverPpg)          : null,
            marketValueAtRelease: marketValueAtRelease !== null ? new Prisma.Decimal(marketValueAtRelease) : null,
            ltvAtRelease:        ltvAtRelease !== null ? new Prisma.Decimal(ltvAtRelease)    : null,
            releaseDate:         releaseDateObj,
          },
        });

        return tx.pledge.findUnique({
          where:   { id: pledgeId },
          include: { items: true },
        });
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.message === "ALREADY_RELEASED")
        return NextResponse.json({ error: "Pledge has already been released" }, { status: 409 });
      throw err;
    }

    return NextResponse.json({ pledge: updated });

  } catch (err) {
    console.error("PLEDGE RELEASE ERROR:", err);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}

/* ------------------------------------------------------------------ */
/*  GET /api/customers/[customerId]/pledges/[pledgeId]                 */
/* ------------------------------------------------------------------ */
export async function GET(_req: Request, context: RouteContext) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where:  { clerkUserId },
      select: { id: true, username: true },
    });
    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { customerId, pledgeId } = await context.params;

    const pledge = await prisma.pledge.findFirst({
      where: {
        id:         pledgeId,
        customerId,                       // ✅ scoped to customer in URL
        customer: { userId: user.id },
      },
      include: {
        items: true,
        customer: {
  select: { id: true, name: true, address: true, mobile: true, region: true },
}
      },
    });

    if (!pledge)
      return NextResponse.json({ error: "Pledge not found" }, { status: 404 });

    return NextResponse.json({
      pledge,
      user: { id: user.id, username: user.username },
    });

  } catch (err) {
    console.error("PLEDGE DETAIL ERROR:", err);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}

/* ------------------------------------------------------------------ */
/*  DELETE /api/customers/[customerId]/pledges/[pledgeId]              */
/* ------------------------------------------------------------------ */
export async function DELETE(req: Request, context: RouteContext) {
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

    const { customerId, pledgeId } = await context.params;

    const pledge = await prisma.pledge.findFirst({
      where: {
        id:         pledgeId,
        customerId,                       // ✅ scoped to customer in URL
        customer: { userId: user.id },
      },
      select: { id: true, status: true },
    });
    if (!pledge)
      return NextResponse.json({ error: "Pledge not found" }, { status: 404 });
    if (pledge.status === "RELEASED")
      return NextResponse.json({ error: "Released pledges cannot be deleted" }, { status: 400 });

    // Guard against silently erasing part-payment history. Deleting cascades to
    // Transaction rows, so require explicit confirmation when any exist.
    const confirmDelete =
      new URL(req.url).searchParams.get("confirmDelete") === "true";

    if (!confirmDelete) {
      const transactionCount = await prisma.transaction.count({ where: { pledgeId } });
      if (transactionCount > 0) {
        return NextResponse.json(
          {
            error: "PENDING_TRANSACTIONS",
            message:
              "This pledge has recorded part-payment(s). Deleting it will permanently erase that payment history.",
            transactionCount,
          },
          { status: 409 }
        );
      }
    }

    // PledgeItems + Transactions cascade-deleted via onDelete: Cascade
    await prisma.pledge.delete({ where: { id: pledgeId } });
    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("PLEDGE DELETE ERROR:", err);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}