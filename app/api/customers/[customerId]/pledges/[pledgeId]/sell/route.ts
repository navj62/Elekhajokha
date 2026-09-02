import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { calculateHybridInterest } from "@/lib/interest";
import {
  CALCULATION_VERSION,
  OPEN_PLEDGE_STATUSES,
  isOpenPledgeStatus,
} from "@/lib/pledgeConstants";

type RouteContext = {
  params: Promise<{ customerId: string; pledgeId: string }>;
};

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
          select: { itemType: true, metalType: true, itemName: true, purity: true, grossWeight: true },
        },
      },
    });

    if (!pledge)
      return NextResponse.json({ error: "Pledge not found" }, { status: 404 });

    if (!isOpenPledgeStatus(pledge.status)) {
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

    if (notes !== undefined && notes !== null && typeof notes === "string" && notes.length > 2000) {
      return NextResponse.json({ error: "VALIDATION", message: "Notes must be at most 2000 characters" }, { status: 400 });
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

    // Market-value convention - must match every closure path (single release,
    // bulk release, sell) and the bulk preview. Store null unless the value is
    // POSITIVE: a computed 0 means "could not value" (no price for the metal
    // actually held), never "worth nothing" - pledge items are always GOLD or
    // SILVER with server-validated positive weight. Audit rows are immutable,
    // so a 0 written here could never be corrected. Revisit if MetalType ever
    // gains OTHER on the pledge side: "priced at zero" and "unpriceable" would
    // then be genuinely different states.
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

    // Gross weight = sum of the pledge's per-item physical gross weights (items
    // already loaded above — no extra query). The pledge aggregate only stores
    // net weights, so gross is reconstructed from the items. Net weights are the
    // financially meaningful values and are copied separately from the pledge
    // aggregates, preserving both metals for a mixed gold+silver pledge.
    const grossWeight = pledge.items.reduce(
      (sum, it) => sum + Number(it.grossWeight),
      0,
    );

    // ── Atomic transaction ────────────────────────────────────────────
    try {
      await prisma.$transaction(async (tx) => {
        // Double-status guard — accepts ACTIVE or OVERDUE
        const result = await tx.pledge.updateMany({
          where: { id: pledgeId, status: { in: [...OPEN_PLEDGE_STATUSES] } },
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

        // Reuse the goldPpg/silverPpg already fetched above — no extra query.
        // metalType here is the PledgeItem enum serialised as "GOLD"/"SILVER" (uppercase).
        const acquiredMetalRate =
          metalType === "GOLD"   ? goldPpg :
          metalType === "SILVER" ? silverPpg :
          null;

        await tx.inventoryItem.create({
          data: {
            ownerId:           user.id,
            sourceType:        "PLEDGE_SALE",
            sourcePledgeId:    pledgeId,
            description,
            itemType,
            metalType,
            purity:            purity !== null ? new Prisma.Decimal(purity.toString()) : null,
            grossWeight:       new Prisma.Decimal(grossWeight),
            netWeightOfGold:   pledge.netWeightOfGold,
            netWeightOfSilver: pledge.netWeightOfSilver,
            photoUrl:          pledge.itemPhoto ?? null,
            acquiredAt:        saleDateObj,
            acquiredCost:      new Prisma.Decimal(buyPrice),
            amountOwedAt:      new Prisma.Decimal(calc.receivableAmount),
            acquiredMetalRate: acquiredMetalRate !== null
              ? new Prisma.Decimal(acquiredMetalRate) : null,
            notes:             typeof notes === "string" && notes.trim() ? notes.trim() : null,
            status:            "IN_STOCK",
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
