// app/api/ltv/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { calculateLTV } from "@/lib/calculateLTV";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
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

    /* ---- Search param -------------------------------------------- */
    const search = req.nextUrl.searchParams.get("search")?.trim() ?? "";

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

    const hasPrices = !!(goldPrice || silverPrice);
    const goldPpg   = goldPrice   ? parseFloat(goldPrice.inrPerGram.toString())   : null;
    const silverPpg = silverPrice ? parseFloat(silverPrice.inrPerGram.toString()) : null;

    /* ---- Fetch ALL pledges + filtered pledges in parallel -------- */
    // Two queries: allPledges for summary, filteredPledges for the table
    // This ensures summary always reflects the full portfolio
    const baseWhere = {
      status:   "ACTIVE",
      customer: { userId: user.id },
    } as const;

    const [allPledges, filteredPledges] = await Promise.all([
      prisma.pledge.findMany({
        where:   baseWhere,
        include: { customer: { select: { id: true, name: true } } },
        orderBy: { pledgeDate: "desc" },
      }),
      search
        ? prisma.pledge.findMany({
            where: {
              ...baseWhere,
              customer: {
                userId: user.id,
                name:   { contains: search, mode: "insensitive" },
              },
            },
            include: { customer: { select: { id: true, name: true } } },
            orderBy: { pledgeDate: "desc" },
          })
        : null, // null means no search — reuse allPledges
    ]);

    // If no search, filtered = all (same reference, no extra work)
    const pledgesToShow = filteredPledges ?? allPledges;

    const today = new Date();

    /* ---- Compute LTV — reusable mapper -------------------------- */
    function computeRows(pledges: typeof allPledges) {
      return pledges.map((pledge) => {
        const principal         = Number(pledge.loanAmount);
        const rate              = Number(pledge.interestRate);
        const netWeightOfGold   = Number(pledge.netWeightOfGold);
        const netWeightOfSilver = Number(pledge.netWeightOfSilver);

        const result = calculateLTV({
          principal,
          rate,
          pledgeDate:          new Date(pledge.pledgeDate),
          currentDate:         today,
          allowCompounding:    pledge.allowCompounding,
          compoundingDuration: pledge.compoundingDuration as "MONTHLY" | "HALFYEARLY" | "YEARLY",
          goldWeight:          netWeightOfGold,
          silverWeight:        netWeightOfSilver,
          goldPrice:           goldPpg,
          silverPrice:         silverPpg,
        });

        const accruedInterest =
          Math.round((result.amountOwed - principal) * 100) / 100;

        return {
          pledgeId:         pledge.id,
          customerId:       pledge.customer.id,
          customerName:     pledge.customer.name,
          pledgeDate:       pledge.pledgeDate,
          netWeightOfGold,
          netWeightOfSilver,
          principal,
          accruedInterest,
          amountOwed:       result.amountOwed,
          goldPpg,
          silverPpg,
          marketValue:      result.marketValue,
          priceUpdatedAt:   goldPrice?.createdAt ?? silverPrice?.createdAt ?? null,
          ltv:              result.ltv,
          riskTier:         result.riskTier,
        };
      });
    }

    /* ---- Compute rows for both sets ----------------------------- */
    const allRows      = computeRows(allPledges);      // used for summary
    const filteredRows = computeRows(pledgesToShow);   // used for table

    /* ---- Sort filtered rows: riskiest first, nulls last --------- */
    filteredRows.sort((a, b) => {
      if (a.ltv === null && b.ltv === null) return 0;
      if (a.ltv === null) return 1;
      if (b.ltv === null) return -1;
      return b.ltv - a.ltv || b.amountOwed - a.amountOwed;
    });

    /* ---- Summary always from allRows (full portfolio) ------------ */
    const buildSummary = (rows: typeof allRows) => {
      const totalLent        = rows.reduce((s, r) => s + r.principal,          0);
      const totalOwed        = rows.reduce((s, r) => s + r.amountOwed,         0);
      const totalMarketValue = rows.reduce((s, r) => s + (r.marketValue ?? 0), 0);

      const tierCounts = {
        SAFE:       rows.filter((r) => r.riskTier === "SAFE").length,
        WATCH:      rows.filter((r) => r.riskTier === "WATCH").length,
        AT_RISK:    rows.filter((r) => r.riskTier === "AT_RISK").length,
        UNDERWATER: rows.filter((r) => r.riskTier === "UNDERWATER").length,
        NO_PRICE:   rows.filter((r) => r.riskTier === null).length,
      };

      const pricedRows = rows.filter((r) => r.ltv !== null);
      const avgLtv =
        pricedRows.length > 0
          ? Math.round(
              (pricedRows.reduce((s, r) => s + r.ltv!, 0) / pricedRows.length) * 100
            ) / 100
          : null;

      return {
        totalPledges:     rows.length,
        totalLent:        Math.round(totalLent        * 100) / 100,
        totalOwed:        Math.round(totalOwed        * 100) / 100,
        totalMarketValue: Math.round(totalMarketValue * 100) / 100,
        avgLtv,
        tierCounts,
      };
    };

    /* ---- Empty state (no pledges at all) ------------------------- */
    if (allRows.length === 0) {
      return NextResponse.json(
        {
          hasPrices,
          goldPricePerGram:   goldPpg,
          silverPricePerGram: silverPpg,
          priceUpdatedAt:     goldPrice?.createdAt ?? silverPrice?.createdAt ?? null,
          summary: buildSummary([]),
          pledges: [],
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    /* ---- Response ----------------------------------------------- */
    return NextResponse.json(
      {
        hasPrices,
        goldPricePerGram:   goldPpg,
        silverPricePerGram: silverPpg,
        priceUpdatedAt:     goldPrice?.createdAt ?? silverPrice?.createdAt ?? null,
        summary:            buildSummary(allRows),    // ✅ always full portfolio
        pledges:            filteredRows,             // ✅ search-filtered table rows
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("GET /api/ltv failed:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}