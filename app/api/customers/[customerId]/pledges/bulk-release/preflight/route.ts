import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { calculateHybridInterest } from "@/lib/interest";
import { isOpenPledgeStatus } from "@/lib/pledgeConstants";

type RouteContext = {
  params: Promise<{ customerId: string }>;
};

/* ------------------------------------------------------------------ */
/*  POST /api/customers/[customerId]/pledges/bulk-release/preflight    */
/*  Read-only validation + interest/LTV preview for a batch release.  */
/* ------------------------------------------------------------------ */
export async function POST(req: Request, context: RouteContext) {
  try {
    /* ---- Auth (mirror single-release) ---------------------------- */
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where:  { clerkUserId },
      select: { id: true },
    });
    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { customerId } = await context.params;

    /* ---- Customer ownership guard -------------------------------- */
    const customer = await prisma.customer.findFirst({
      where:  { id: customerId, userId: user.id, deletedAt: null },
      select: { id: true, name: true, mobile: true, address: true },
    });
    if (!customer)
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });

    const body = await req.json().catch(() => null);

    /* ---- STEP 1: BODY SHAPE -------------------------------------- */
    const pledgeIds: unknown = body?.pledgeIds;
    const releaseDate: unknown = body?.releaseDate;

    if (
      !Array.isArray(pledgeIds) ||
      pledgeIds.length < 1 ||
      pledgeIds.length > 50 ||
      !pledgeIds.every((id) => typeof id === "string" && id.length > 0)
    ) {
      return NextResponse.json(
        { error: "VALIDATION", message: "pledgeIds must be 1-50 non-empty strings." },
        { status: 400 }
      );
    }

    if (typeof releaseDate !== "string" || isNaN(new Date(releaseDate).getTime())) {
      return NextResponse.json(
        { error: "VALIDATION", message: "releaseDate must be a valid ISO date." },
        { status: 400 }
      );
    }

    const ids = pledgeIds as string[];
    const releaseDateObj = new Date(releaseDate);

    /* ---- STEP 2: OWNERSHIP (one query) --------------------------- */
    const pledges = await prisma.pledge.findMany({
      where: {
        id:         { in: ids },
        customerId,
        customer:   { userId: user.id },
      },
      select: {
        id:                  true,
        pledgeDate:          true,
        status:              true,
        loanAmount:          true,
        interestRate:        true,
        allowCompounding:    true,
        compoundingDuration: true,
        netWeightOfGold:     true,
        netWeightOfSilver:   true,
        items: {
          select: { itemName: true, itemType: true, metalType: true },
          take:   1,
        },
      },
    });

    if (pledges.length < ids.length) {
      return NextResponse.json(
        {
          error:     "OWNERSHIP_VIOLATION",
          message:   "One or more pledges do not belong to this customer.",
          found:     pledges.length,
          requested: ids.length,
        },
        { status: 403 }
      );
    }

    /* ---- STEP 3: STATUS (all ACTIVE or OVERDUE) ------------------ */
    const offendingIds = pledges
      .filter((p) => !isOpenPledgeStatus(p.status))
      .map((p) => p.id);

    if (offendingIds.length > 0) {
      return NextResponse.json(
        {
          error:        "ALREADY_RELEASED",
          message:      "One or more selected pledges are already released.",
          offendingIds,
        },
        { status: 409 }
      );
    }

    /* ---- STEP 4: RELEASE DATE (strict, after every pledge) ------- */
    const latestPledgeDate = pledges.reduce(
      (max, p) => (p.pledgeDate > max ? p.pledgeDate : max),
      pledges[0].pledgeDate
    );

    if (releaseDateObj <= latestPledgeDate) {
      const suggested = new Date(latestPledgeDate);
      suggested.setDate(suggested.getDate() + 1);
      return NextResponse.json(
        {
          error:            "INVALID_RELEASE_DATE",
          message:          "Release date must be after the latest pledge date.",
          latestPledgeDate: latestPledgeDate.toISOString(),
          suggestedMinDate: suggested.toISOString(),
        },
        { status: 400 }
      );
    }

    /* ---- STEP 5: METAL PRICES (fetch once) ----------------------- */
    const [goldPrice, silverPrice] = await Promise.all([
      prisma.metalPrice.findFirst({ where: { metal: "GOLD"   }, orderBy: { createdAt: "desc" } }),
      prisma.metalPrice.findFirst({ where: { metal: "SILVER" }, orderBy: { createdAt: "desc" } }),
    ]);

    const goldPpg   = goldPrice   ? parseFloat(goldPrice.inrPerGram.toString())   : null;
    const silverPpg = silverPrice ? parseFloat(silverPrice.inrPerGram.toString()) : null;

    if (goldPpg === null && silverPpg === null) {
      return NextResponse.json(
        { error: "NO_METAL_PRICES", message: "Metal prices unavailable. Try again shortly." },
        { status: 503 }
      );
    }

    /* ---- COMPUTE PREVIEW (stored compounding defaults) ----------- */
    let sumPrincipal  = 0;
    let sumInterest   = 0;
    let sumReceivable = 0;

    const previewPledges = pledges.map((pledge) => {
      const calc = calculateHybridInterest(
        Number(pledge.loanAmount),
        Number(pledge.interestRate),
        new Date(pledge.pledgeDate),
        releaseDateObj,
        pledge.allowCompounding,
        pledge.compoundingDuration
      );

      const ngold   = Number(pledge.netWeightOfGold);
      const nsilver = Number(pledge.netWeightOfSilver);

      const mv =
        goldPpg === null && silverPpg === null
          ? null
          : ((goldPpg ?? 0) * ngold) + ((silverPpg ?? 0) * nsilver);

      const ltv =
        mv !== null && mv > 0
          ? Math.round((calc.receivableAmount / mv) * 10000) / 100
          : null;

      const firstItem = pledge.items[0];
      const assetLabel =
        firstItem?.itemName ??
        (firstItem ? `${firstItem.itemType} (${firstItem.metalType})` : "Pledge");

      sumPrincipal  += Number(pledge.loanAmount);
      sumInterest   += calc.totalInterest;
      sumReceivable += calc.receivableAmount;

      return {
        id:                  pledge.id,
        pledgeDate:          pledge.pledgeDate.toISOString(),
        durationMonths:      calc.T,
        loanAmount:          Number(pledge.loanAmount),
        interestRate:        Number(pledge.interestRate),
        allowCompounding:    pledge.allowCompounding,
        compoundingDuration: pledge.compoundingDuration,
        assetLabel,
        previewInterest:     calc.totalInterest,
        previewReceivable:   calc.receivableAmount,
        previewMarketValue:  mv,
        previewLtv:          ltv,
      };
    });

    /* ---- "as-of" timestamp for the price snapshot ---------------- */
    const priceUpdatedAt =
      (goldPrice?.createdAt ?? silverPrice?.createdAt)?.toISOString() ?? null;

    return NextResponse.json({
      success:      true,
      customerName: customer.name,
      customer: {
        name:    customer.name,
        mobile:  customer.mobile,
        address: customer.address,
      },
      pledges:      previewPledges,
      totals: {
        principal:  sumPrincipal,
        interest:   sumInterest,
        receivable: sumReceivable,
        count:      previewPledges.length,
      },
      prices: {
        goldPerGram:   goldPpg,
        silverPerGram: silverPpg,
        updatedAt:     priceUpdatedAt,
      },
      latestPledgeDate: latestPledgeDate.toISOString(),
    });
  } catch (err) {
    console.error("BULK RELEASE PREFLIGHT ERROR:", err);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
