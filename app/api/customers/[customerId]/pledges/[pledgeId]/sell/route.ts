import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { calculateHybridInterest } from "@/lib/interest";

type RouteContext = {
  params: Promise<{ customerId: string; pledgeId: string }>;
};

const CALCULATION_VERSION = 1;

export async function POST(req: Request, context: RouteContext) {
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
        customerId,
        customer:   { userId: user.id },
      },
      include: {
        items: {
          select: { itemType: true, metalType: true, itemName: true, purity: true },
        },
      },
    });

    if (!pledge)
      return NextResponse.json({ error: "Pledge not found" }, { status: 404 });

    if (pledge.status !== "ACTIVE" && pledge.status !== "OVERDUE") {
      return NextResponse.json(
        { error: "NOT_ACTIVE", message: "Only active or overdue pledges can be added to inventory." },
        { status: 409 }
      );
    }

    const body = await req.json();
    const { buyPrice, notes, saleDate } = body;

    if (typeof buyPrice !== "number" || isNaN(buyPrice) || buyPrice < 0) {
      return NextResponse.json({ error: "buyPrice must be a number >= 0" }, { status: 400 });
    }

    if (!saleDate) {
      return NextResponse.json({ error: "saleDate is required" }, { status: 400 });
    }

    const saleDateObj = new Date(saleDate);
    if (isNaN(saleDateObj.getTime())) {
      return NextResponse.json({ error: "Invalid saleDate" }, { status: 400 });
    }

    if (saleDateObj <= new Date(pledge.pledgeDate)) {
      return NextResponse.json({ error: "saleDate must be after pledgeDate" }, { status: 400 });
    }

    // ── Compute amount owed at time of sale ───────────────────────────
    const calc = calculateHybridInterest(
      Number(pledge.loanAmount),
      Number(pledge.interestRate),
      new Date(pledge.pledgeDate),
      saleDateObj,
      pledge.allowCompounding,
      pledge.compoundingDuration,
    );

    // ── Fetch metal prices once ───────────────────────────────────────
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

    // ── Derive inventory item details from first pledge item ──────────
    const firstItem    = pledge.items[0];
    const description  = firstItem?.itemName ?? "Pledged item";
    const itemType     = firstItem?.itemType ?? "Other";
    const metalType    = String(firstItem?.metalType ?? "GOLD");
    const purity       = firstItem?.purity ?? null;
    const weightGrams  = netWeightOfGold + netWeightOfSilver;

    // ── Atomic transaction ────────────────────────────────────────────
    try {
      await prisma.$transaction(async (tx) => {
        // Double-status guard — accepts ACTIVE or OVERDUE
        const result = await tx.pledge.updateMany({
          where: { id: pledgeId, status: { in: ["ACTIVE", "OVERDUE"] } },
          data: {
            status:             "SOLD",
            releaseDate:        saleDateObj,
            salePrice:          new Prisma.Decimal(buyPrice),
            calculationVersion: CALCULATION_VERSION,
            totalInterest:      new Prisma.Decimal(calc.totalInterest),
            receivableAmount:   new Prisma.Decimal(calc.receivableAmount),
            durationMonths:     new Prisma.Decimal(calc.T),
          },
        });

        if (result.count === 0) throw new Error("NOT_ACTIVE");

        // Audit trail — mirrors the release audit field-for-field
        await tx.pledgeAudit.create({
          data: {
            pledgeId,
            action:               "SOLD",
            principal:            pledge.loanAmount,
            interestRate:         pledge.interestRate,
            allowCompounding:     pledge.allowCompounding,
            compoundingDuration:  pledge.compoundingDuration,
            calculationVersion:   CALCULATION_VERSION,
            durationMonths:       new Prisma.Decimal(calc.T),
            totalInterest:        new Prisma.Decimal(calc.totalInterest),
            receivableAmount:     new Prisma.Decimal(calc.receivableAmount),
            netWeightOfGold:      pledge.netWeightOfGold,
            netWeightOfSilver:    pledge.netWeightOfSilver,
            goldPricePerGram:     goldPpg   !== null ? new Prisma.Decimal(goldPpg)             : null,
            silverPricePerGram:   silverPpg !== null ? new Prisma.Decimal(silverPpg)           : null,
            marketValueAtRelease: marketValueAtRelease !== null ? new Prisma.Decimal(marketValueAtRelease) : null,
            ltvAtRelease:         ltvAtRelease !== null ? new Prisma.Decimal(ltvAtRelease)     : null,
            releaseDate:          saleDateObj,
          },
        });

        await tx.inventoryItem.create({
          data: {
            ownerId:        user.id,
            sourceType:     "PLEDGE_SALE",
            sourcePledgeId: pledgeId,
            description,
            itemType,
            metalType,
            purity:         purity !== null ? new Prisma.Decimal(purity.toString()) : null,
            weightGrams:    new Prisma.Decimal(weightGrams),
            photoUrl:       pledge.itemPhoto ?? null,
            acquiredAt:     saleDateObj,
            acquiredCost:   new Prisma.Decimal(buyPrice),
            amountOwedAt:   new Prisma.Decimal(calc.receivableAmount),
            notes:          typeof notes === "string" && notes.trim() ? notes.trim() : null,
            status:         "IN_STOCK",
          },
        });
      }, { timeout: 30000 });
    } catch (err: unknown) {
      if (err instanceof Error && err.message === "NOT_ACTIVE") {
        return NextResponse.json(
          { error: "NOT_ACTIVE", message: "Pledge is no longer active." },
          { status: 409 }
        );
      }
      throw err;
    }

    return NextResponse.json({ success: true, message: "Pledge added to inventory." });

  } catch (err) {
    console.error("PLEDGE SELL ERROR:", err);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
