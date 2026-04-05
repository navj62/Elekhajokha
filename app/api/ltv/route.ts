// app/api/ltv/route.ts

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {prisma} from "@/lib/prisma";
import { calculateHybridInterest } from "@/lib/interest";

export const dynamic = "force-dynamic";

/* ------------------------------------------------------------------ */
/*  Risk tier thresholds                                               */
/* ------------------------------------------------------------------ */
export type RiskTier = "SAFE" | "WATCH" | "AT_RISK" | "UNDERWATER";

function getRiskTier(ltv: number): RiskTier {
  if (ltv < 70)  return "SAFE";
  if (ltv < 85)  return "WATCH";
  if (ltv < 100) return "AT_RISK";
  return "UNDERWATER";
}

/* ------------------------------------------------------------------ */
/*  GET /api/ltv                                                       */
/* ------------------------------------------------------------------ */
export async function GET() {
  try {
    /* ---- Auth ---------------------------------------------------- */
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where:  { clerkUserId },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    /* ---- Latest metal prices ------------------------------------- */
    const [goldPrice, silverPrice] = await Promise.all([
      prisma.metalPrice.findFirst({
        where:   { metal: "GOLD" },
        orderBy: { createdAt: "desc" },
      }),
      prisma.metalPrice.findFirst({
        where:   { metal: "SILVER" },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    // Warn but don't block — UI will show a banner
    const hasPrices = goldPrice || silverPrice;

    /* ---- All active pledges for this user ------------------------ */
    const pledges = await prisma.pledge.findMany({
      where: {
        status:   "ACTIVE",
        customer: { userId: user.id },
      },
      include: {
        customer: {
          select: { id: true, name: true },
        },
      },
      orderBy: { pledgeDate: "desc" },
    });

    const today = new Date();

    /* ---- Compute LTV for each pledge ----------------------------- */
    const rows = pledges.map((pledge) => {
      const principal    = parseFloat(pledge.loanAmount.toString());
      const rate         = parseFloat(pledge.interestRate.toString());
      const netWeightOfMetal = parseFloat(pledge.netWeightOfMetal.toString());

      /* -- Amount owed today --------------------------------------- */
      const { receivableAmount: amountOwed, T } = calculateHybridInterest(
        principal,
        rate,
        new Date(pledge.pledgeDate),
        today,
        pledge.allowCompounding,
        pledge.compoundingDuration as "MONTHLY" | "HALFYEARLY" | "YEARLY"
      );

      /* -- Market value ------------------------------------------- */
      // Pick price based on itemType
      const priceRecord =
        pledge.itemType === "GOLD" ? goldPrice : silverPrice;

      const inrPerGram  = priceRecord
        ? parseFloat(priceRecord.inrPerGram.toString())
        : null;

      const marketValue = inrPerGram !== null
        ? Math.round(inrPerGram * netWeightOfMetal * 100) / 100
        : null;

      /* -- LTV ---------------------------------------------------- */
      const ltv =
        marketValue && marketValue > 0
          ? Math.round((amountOwed / marketValue) * 10000) / 100 // 2 decimal places
          : null;

      const riskTier = ltv !== null ? getRiskTier(ltv) : null;

      return {
        // Pledge identity
        pledgeId:   pledge.id,
        customerId: pledge.customer.id,
        customerName: pledge.customer.name,
        itemName:   pledge.itemName,
        itemType:   pledge.itemType,
        pledgeDate: pledge.pledgeDate,

        // Weight
        netWeightOfMetal,

        // Financials
        principal,
        amountOwed,
        durationMonths: T,

        // Market
        inrPerGram,
        marketValue,
        priceUpdatedAt: priceRecord?.createdAt ?? null,

        // Risk
        ltv,
        riskTier,
      };
    });

    /* ---- Sort: riskiest first (nulls last) ----------------------- */
    rows.sort((a, b) => {
      if (a.ltv === null && b.ltv === null) return 0;
      if (a.ltv === null) return 1;
      if (b.ltv === null) return -1;
      return b.ltv - a.ltv;
    });

    /* ---- Summary totals ----------------------------------------- */
    const totalPledges    = rows.length;
    const totalLent       = rows.reduce((s, r) => s + r.principal, 0);
    const totalOwed       = rows.reduce((s, r) => s + r.amountOwed, 0);
    const totalMarketValue = rows.reduce(
      (s, r) => s + (r.marketValue ?? 0), 0
    );

    const tierCounts = {
      SAFE:       rows.filter((r) => r.riskTier === "SAFE").length,
      WATCH:      rows.filter((r) => r.riskTier === "WATCH").length,
      AT_RISK:    rows.filter((r) => r.riskTier === "AT_RISK").length,
      UNDERWATER: rows.filter((r) => r.riskTier === "UNDERWATER").length,
      NO_PRICE:   rows.filter((r) => r.riskTier === null).length,
    };

    // Weighted average LTV (only pledges with a price)
    const pricedRows = rows.filter((r) => r.ltv !== null);
    const avgLtv =
      pricedRows.length > 0
        ? Math.round(
            pricedRows.reduce((s, r) => s + r.ltv!, 0) / pricedRows.length
          )
        : null;

    return NextResponse.json(
      {
        hasPrices,
        goldPricePerGram:   goldPrice   ? parseFloat(goldPrice.inrPerGram.toString())   : null,
        silverPricePerGram: silverPrice ? parseFloat(silverPrice.inrPerGram.toString()) : null,
        priceUpdatedAt:     goldPrice?.createdAt ?? silverPrice?.createdAt ?? null,

        summary: {
          totalPledges,
          totalLent:        Math.round(totalLent       * 100) / 100,
          totalOwed:        Math.round(totalOwed       * 100) / 100,
          totalMarketValue: Math.round(totalMarketValue * 100) / 100,
          avgLtv,
          tierCounts,
        },

        pledges: rows,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("GET /api/ltv failed:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}