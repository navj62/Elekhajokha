// app/api/reports/customers/route.ts
import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateCustomerPDF } from "@/lib/generatePDF";
import { auth } from "@clerk/nextjs/server";
import { computeCustomerRiskScore } from "@/lib/customerRiskScore";
import { calculateLTV, daysToUnderwater } from "@/lib/calculateLTV";
import { OPEN_PLEDGE_STATUSES, isOpenPledgeStatus } from "@/lib/pledgeConstants";
import type { CompoundingDuration } from "@prisma/client";

function istBoundary(dateStr: string, endOfDay: boolean): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }
  const suffix = endOfDay ? "T23:59:59.999+05:30" : "T00:00:00.000+05:30";
  const d = new Date(`${dateStr}${suffix}`);
  return isNaN(d.getTime()) ? null : d;
}

export async function GET(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkUserId } });
    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    const sp = req.nextUrl.searchParams;
    const format = sp.get("format");
    const startDateStr = sp.get("startDate");
    const endDateStr = sp.get("endDate");
    // Opt-in: restrict the list to customers holding at least one open pledge.
    // Absent/anything-but-"true" preserves the unfiltered default.
    const activeOnly = sp.get("activeOnly") === "true";

    let startBoundary: Date | undefined;
    let endBoundary: Date | undefined;
    if (startDateStr) {
      const d = istBoundary(startDateStr, false);
      if (!d)
        return NextResponse.json({ error: "INVALID_DATE", message: "Invalid startDate." }, { status: 400 });
      startBoundary = d;
    }
    if (endDateStr) {
      const d = istBoundary(endDateStr, true);
      if (!d)
        return NextResponse.json({ error: "INVALID_DATE", message: "Invalid endDate." }, { status: 400 });
      endBoundary = d;
    }

    // Fetch metal prices once for risk score LTV computation
    const [goldPrice, silverPrice] = await Promise.all([
      prisma.metalPrice.findFirst({
        where: { metal: "GOLD" },
        orderBy: { createdAt: "desc" },
        select: { inrPerGram: true },
      }),
      prisma.metalPrice.findFirst({
        where: { metal: "SILVER" },
        orderBy: { createdAt: "desc" },
        select: { inrPerGram: true },
      }),
    ]);
    const goldPpg = goldPrice ? Number(goldPrice.inrPerGram) : null;
    const silverPpg = silverPrice ? Number(silverPrice.inrPerGram) : null;
    const now = new Date();

    const customers = await prisma.customer.findMany({
      where: {
        userId: user.id,
        deletedAt: null,
        ...(activeOnly
          ? { pledges: { some: { status: { in: [...OPEN_PLEDGE_STATUSES] } } } }
          : {}),
        ...(startBoundary || endBoundary
          ? {
              createdAt: {
                ...(startBoundary ? { gte: startBoundary } : {}),
                ...(endBoundary ? { lte: endBoundary } : {}),
              },
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        mobile: true,
        address: true,
        createdAt: true,
        pledges: {
          select: {
            status: true,
            loanAmount: true,
            interestRate: true,
            pledgeDate: true,
            allowCompounding: true,
            compoundingDuration: true,
            netWeightOfGold: true,
            netWeightOfSilver: true,
            lastMarketValue: true,
          },
        },
      },
    });

    const fmtDate = (d: Date) =>
      d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

    const result = customers.map((c) => {
      // Only open pledges — count and current loan outstanding.
      // OVERDUE is open (non-terminal) like ACTIVE; RELEASED and SOLD are terminal.
      const activePledges = c.pledges.filter(
        (p) => isOpenPledgeStatus(p.status)
      );
      const pledgeCount = activePledges.length;
      const totalLoan = activePledges.reduce((s, p) => s + Number(p.loanAmount), 0);

      let totalAmountOwed = 0;
      let totalMarketValue = 0;
      let largestPledgeMarketValue = 0;
      let daysToUnderwaterWorst: number | null = null;

      for (const p of activePledges) {
        const loanAmount = Number(p.loanAmount);
        const interestRate = Number(p.interestRate);
        const goldW = Number(p.netWeightOfGold);
        const silverW = Number(p.netWeightOfSilver);

        const ltvResult = calculateLTV({
          principal: loanAmount,
          rate: interestRate,
          pledgeDate: new Date(p.pledgeDate),
          currentDate: now,
          allowCompounding: p.allowCompounding,
          compoundingDuration: p.compoundingDuration as CompoundingDuration,
          goldWeight: goldW,
          silverWeight: silverW,
          goldPrice: goldPpg,
          silverPrice: silverPpg,
        });
        const receivableAmount = ltvResult.amountOwed;
        totalAmountOwed += receivableAmount;

        // Prefer live prices; fall back to cached lastMarketValue
        const marketValue =
          ltvResult.marketValue ??
          (p.lastMarketValue != null ? Number(p.lastMarketValue) : null);

        if (marketValue !== null) {
          totalMarketValue += marketValue;
          if (marketValue > largestPledgeMarketValue) largestPledgeMarketValue = marketValue;
          const dtu = daysToUnderwater(loanAmount, interestRate, receivableAmount, marketValue);
          if (dtu !== null) {
            if (dtu === 0 || daysToUnderwaterWorst === null || dtu < daysToUnderwaterWorst) {
              daysToUnderwaterWorst = dtu;
            }
          }
        }
      }

      const currentLtv =
        totalMarketValue > 0
          ? parseFloat(((totalAmountOwed / totalMarketValue) * 100).toFixed(2))
          : null;

      const avgPledgeAgeMonths =
        activePledges.length === 0
          ? 0
          : activePledges.reduce((sum, p) => {
              return sum + (now.getTime() - new Date(p.pledgeDate).getTime()) / (1000 * 60 * 60 * 24 * 30.4375);
            }, 0) / activePledges.length;

      const { score: riskScore, tier: riskTier } = computeCustomerRiskScore({
        currentLtv,
        ltvThirtyDaysAgo: null, // velocity component omitted for report efficiency
        daysToUnderwaterWorst,
        largestPledgeMarketValue,
        totalMarketValue,
        avgPledgeAgeMonths,
      });

      return {
        id: c.id,
        name: c.name,
        mobile: c.mobile,
        address: c.address,
        createdAt: fmtDate(c.createdAt),
        pledgeCount,
        totalLoan,
        riskScore,
        riskTier,
      };
    });

    if (format === "pdf") {
      const rows = result.map((c, i) => ({
        index: i + 1,
        name: c.name,
        mobile: c.mobile ?? "—",
        pledgeCount: c.pledgeCount,
        totalLoan: c.totalLoan,
        createdAt: c.createdAt,
        riskScore: c.riskScore,
        riskTier: c.riskTier,
      }));
      const pdfBuffer = await generateCustomerPDF("Customer Report", rows);
      return new NextResponse(new Uint8Array(pdfBuffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": "attachment; filename=customers.pdf",
        },
      });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
