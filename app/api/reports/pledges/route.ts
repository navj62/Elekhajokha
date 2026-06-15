// app/api/reports/pledges/route.ts
import { NextResponse, NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generatePledgePDF } from "@/lib/generatePDF";
import { calculateLTV } from "@/lib/calculateLTV";
import { auth } from "@clerk/nextjs/server";

type CompoundingDuration = "MONTHLY" | "HALFYEARLY" | "YEARLY";
const round2 = (n: number) => Math.round(n * 100) / 100;

const ROW_CAP = 5000; // Vercel Hobby 10s safety margin

// Parse an IST-day boundary. <input type="date"> sends "YYYY-MM-DD" with no
// timezone; treat it as an India/Kolkata (+05:30) wall-clock boundary.
function istBoundary(dateStr: string, endOfDay: boolean): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    // Fall back to permissive parse for full ISO strings.
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
    const statusParam = sp.get("status"); // "active" | "released" | null (legacy = all)
    const startDateStr = sp.get("startDate");
    const endDateStr = sp.get("endDate");

    // ── Validate status (when provided) ───────────────────────────
    if (statusParam !== null && statusParam !== "active" && statusParam !== "released") {
      return NextResponse.json(
        { error: "INVALID_STATUS", message: "status must be 'active' or 'released'." },
        { status: 400 }
      );
    }

    // ── Validate dates (when provided) ────────────────────────────
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
    if (startBoundary && endBoundary && startBoundary > endBoundary) {
      return NextResponse.json(
        { error: "INVALID_RANGE", message: "startDate must be on or before endDate." },
        { status: 400 }
      );
    }

    // ── Build where + orderBy (ownership always scoped via relation) ──
    const base: Prisma.PledgeWhereInput = {
      customer: { userId: user.id, deletedAt: null },
    };

    let where: Prisma.PledgeWhereInput;
    let orderBy: Prisma.PledgeOrderByWithRelationInput;

    if (statusParam === "active") {
      const pledgeDate: Prisma.DateTimeFilter = {};
      if (startBoundary) pledgeDate.gte = startBoundary;
      if (endBoundary) pledgeDate.lte = endBoundary;
      where = {
        ...base,
        status: "ACTIVE",
        ...(startBoundary || endBoundary ? { pledgeDate } : {}),
      };
      orderBy = { pledgeDate: "desc" };
    } else if (statusParam === "released") {
      const releaseDate: Prisma.DateTimeFilter = {};
      if (startBoundary) releaseDate.gte = startBoundary;
      if (endBoundary) releaseDate.lte = endBoundary;
      where = {
        ...base,
        status: "RELEASED",
        ...(startBoundary || endBoundary ? { releaseDate } : {}),
      };
      orderBy = { releaseDate: "desc" };
    } else {
      // Legacy "all" path — used by the Reports stats strip. Unfiltered, uncapped.
      where = base;
      orderBy = { pledgeDate: "desc" };
    }

    // ── Hard cap (only on the filtered variants) ──────────────────
    if (statusParam !== null) {
      const count = await prisma.pledge.count({ where });
      if (count > ROW_CAP) {
        return NextResponse.json(
          {
            error: "TOO_MANY_RECORDS",
            count,
            message: `Filter returns ${count} records, exceeding the ${ROW_CAP} limit. Please narrow your date range.`,
          },
          { status: 400 }
        );
      }
    }

    // "NECKLACE" → "Necklace"
    const titleCase = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();
    const fmtDate = (d: Date | string | null) =>
      d
        ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
        : null;
    const labelOf = (
      items: { itemName: string | null; itemType: string; metalType: string }[],
      itemCount: number
    ) => {
      const firstItem = items[0];
      const extraItems = itemCount - 1;
      return {
        itemName: firstItem
          ? (firstItem.itemName?.trim() || titleCase(firstItem.metalType)) +
            (extraItems > 0 ? ` +${extraItems}` : "")
          : "—",
        itemType: firstItem ? firstItem.itemType : "—",
      };
    };

    const commonInclude = {
      customer: { select: { name: true, mobile: true } },
      // itemType/itemName live on PledgeItem, not Pledge. One row per pledge, so
      // fetch the first item as a representative label and count the rest for "+N".
      items: { take: 1, select: { itemName: true, itemType: true, metalType: true } },
      _count: { select: { items: true } },
    } satisfies Prisma.PledgeInclude;

    type ReportRow = {
      index: number;
      customerName: string;
      pledgeDate: string;
      releaseDate: string | null;
      itemType: string;
      itemName: string;
      netWeight: number;        // combined (released only)
      netWeightOfGold: number;  // separate (active only)
      netWeightOfSilver: number;// separate (active only)
      loanAmount: number;
      interestAccrued: number;
      receivableAmount: number | null;
      marketValue: number | null;
      ltv: number | null;
      status: string;
    };

    type Totals = {
      count: number;
      goldWeight: number;
      silverWeight: number;
      netWeight: number;
      interestAccrued: number;
      receivableAmount: number;
      loanAmount: number;
    };

    let result: ReportRow[];

    if (statusParam === "released") {
      // RELEASED — pull the finalized values from the canonical RELEASED audit
      // snapshot; fall back to the Pledge row for legacy pledges with no audit.
      const pledges = await prisma.pledge.findMany({
        where,
        orderBy,
        include: {
          ...commonInclude,
          pledgeAudits: {
            where: { action: "RELEASED" },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              totalInterest: true,
              netWeightOfGold: true,
              netWeightOfSilver: true,
              ltvAtRelease: true,
            },
          },
        },
      });

      result = pledges.map((p, i) => {
        const { itemName, itemType } = labelOf(p.items, p._count.items);
        const audit = p.pledgeAudits[0];

        const interestAccrued = audit
          ? Number(audit.totalInterest)
          : Number(p.totalInterest ?? 0);
        const netWeight = audit
          ? Number(audit.netWeightOfGold) + Number(audit.netWeightOfSilver)
          : Number(p.netWeightOfGold) + Number(p.netWeightOfSilver);
        const ltv = audit?.ltvAtRelease != null ? Number(audit.ltvAtRelease) : null;

        return {
          index: i + 1,
          customerName: p.customer?.name ?? "—",
          pledgeDate: fmtDate(p.pledgeDate)!,
          releaseDate: fmtDate(p.releaseDate),
          itemType,
          itemName,
          netWeight: round2(netWeight),
          netWeightOfGold: 0,   // combined in released; not split
          netWeightOfSilver: 0,
          loanAmount: Number(p.loanAmount),
          interestAccrued: round2(interestAccrued),
          receivableAmount: p.receivableAmount ? Number(p.receivableAmount) : null,
          marketValue: null,
          ltv,
          status: p.status,
        };
      });
    } else if (statusParam === "active") {
      // ACTIVE — live interest + LTV via the canonical calculateLTV helper
      // (same path the financial-summary page uses). Prices fetched ONCE.
      const [goldPrice, silverPrice] = await Promise.all([
        prisma.metalPrice.findFirst({ where: { metal: "GOLD" }, orderBy: { createdAt: "desc" } }),
        prisma.metalPrice.findFirst({ where: { metal: "SILVER" }, orderBy: { createdAt: "desc" } }),
      ]);
      const goldPpg = goldPrice ? parseFloat(goldPrice.inrPerGram.toString()) : null;
      const silverPpg = silverPrice ? parseFloat(silverPrice.inrPerGram.toString()) : null;
      const now = new Date();

      const pledges = await prisma.pledge.findMany({ where, orderBy, include: commonInclude });

      result = pledges.map((p, i) => {
        const { itemName, itemType } = labelOf(p.items, p._count.items);
        const goldWeight = Number(p.netWeightOfGold);
        const silverWeight = Number(p.netWeightOfSilver);

        const ltvResult = calculateLTV({
          principal: Number(p.loanAmount),
          rate: Number(p.interestRate),
          pledgeDate: new Date(p.pledgeDate),
          currentDate: now,
          allowCompounding: p.allowCompounding,
          compoundingDuration: p.compoundingDuration as CompoundingDuration,
          goldWeight,
          silverWeight,
          goldPrice: goldPpg,
          silverPrice: silverPpg,
        });
        // amountOwed = principal + accrued interest (single source of truth).
        const interestAccrued = ltvResult.amountOwed - Number(p.loanAmount);

        return {
          index: i + 1,
          customerName: p.customer?.name ?? "—",
          pledgeDate: fmtDate(p.pledgeDate)!,
          releaseDate: null,
          itemType,
          itemName,
          netWeight: 0,  // not used for active; split into gold/silver below
          netWeightOfGold: round2(goldWeight),
          netWeightOfSilver: round2(silverWeight),
          loanAmount: Number(p.loanAmount),
          interestAccrued: round2(interestAccrued),
          receivableAmount: round2(ltvResult.amountOwed),
          marketValue: ltvResult.marketValue,
          ltv: ltvResult.ltv,
          status: p.status,
        };
      });
    } else {
      // Legacy "all" path — stats strip only. No interest/weight/LTV computation.
      const pledges = await prisma.pledge.findMany({ where, orderBy, include: commonInclude });

      result = pledges.map((p, i) => {
        const { itemName, itemType } = labelOf(p.items, p._count.items);
        return {
          index: i + 1,
          customerName: p.customer?.name ?? "—",
          pledgeDate: fmtDate(p.pledgeDate)!,
          releaseDate: fmtDate(p.releaseDate),
          itemType,
          itemName,
          netWeight: 0,
          netWeightOfGold: 0,
          netWeightOfSilver: 0,
          loanAmount: Number(p.loanAmount),
          interestAccrued: 0,
          receivableAmount: p.receivableAmount ? Number(p.receivableAmount) : null,
          marketValue: null,
          ltv: null,
          status: p.status,
        };
      });
    }

    // ── Compute totals (for active/released variants) ─────────────
    let totals: Totals | null = null;
    if (statusParam !== null) {
      totals = {
        count: result.length,
        goldWeight: round2(result.reduce((s, r) => s + r.netWeightOfGold, 0)),
        silverWeight: round2(result.reduce((s, r) => s + r.netWeightOfSilver, 0)),
        netWeight: round2(result.reduce((s, r) => s + r.netWeight, 0)),
        interestAccrued: round2(result.reduce((s, r) => s + r.interestAccrued, 0)),
        receivableAmount: round2(result.reduce((s, r) => s + (r.receivableAmount ?? r.loanAmount), 0)),
        loanAmount: round2(result.reduce((s, r) => s + r.loanAmount, 0)),
      };
    }

    if (format === "pdf") {
      const variantLabel =
        statusParam === "released" ? "Released Pledges Report"
        : statusParam === "active" ? "Active Pledges Report"
        : "Pledge Report";
      const period =
        startDateStr || endDateStr
          ? `Period: ${startDateStr ?? "…"} to ${endDateStr ?? "…"}`
          : "All time";
      const title = `${variantLabel}  —  ${period}`;

      const pdfBuffer = await generatePledgePDF(title, result, statusParam === "released" ? "released" : "active");
      return new NextResponse(new Uint8Array(pdfBuffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": "attachment; filename=pledges.pdf",
        },
      });
    }

    // Legacy "all" path returns bare array so the stats strip consumer is unaffected.
    if (statusParam === null) return NextResponse.json(result);

    return NextResponse.json({ rows: result, totals });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
