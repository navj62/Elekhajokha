// app/api/reports/pledges/route.ts
import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import {
  PLEDGE_ROW_CAP,
  countPledgeReport,
  getActivePledgeReport,
  getPledgeReportRows,
  parseDateRange,
  pledgeReportTotals,
  toPledgeReportJson,
} from "@/lib/reports/reportQueries";
import { parseRiskTiers } from "@/lib/reports/riskTierFilter";

// Exports of these tabs go through /api/reports/export, which shares the same
// query functions — keep any filter change in lib/reports/reportQueries.ts.
export async function GET(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkUserId } });
    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    const sp = req.nextUrl.searchParams;
    const statusParam = sp.get("status"); // "active" | "released" | null (legacy = all)

    // ── Validate status (when provided) ───────────────────────────
    if (statusParam !== null && statusParam !== "active" && statusParam !== "released") {
      return NextResponse.json(
        { error: "INVALID_STATUS", message: "status must be 'active' or 'released'." },
        { status: 400 }
      );
    }

    // ── Validate dates (when provided) ────────────────────────────
    const parsed = parseDateRange(sp.get("startDate"), sp.get("endDate"));
    if (!parsed.ok)
      return NextResponse.json({ error: parsed.error, message: parsed.message }, { status: 400 });
    const { range } = parsed;
    if (range.start && range.end && range.start > range.end) {
      return NextResponse.json(
        { error: "INVALID_RANGE", message: "startDate must be on or before endDate." },
        { status: 400 }
      );
    }

    // ── Hard cap (only on the filtered variants) ──────────────────
    if (statusParam !== null) {
      const count = await countPledgeReport(user.id, statusParam, range);
      if (count > PLEDGE_ROW_CAP) {
        return NextResponse.json(
          {
            error: "TOO_MANY_RECORDS",
            count,
            message: `Filter returns ${count} records, exceeding the ${PLEDGE_ROW_CAP} limit. Please narrow your date range.`,
          },
          { status: 400 }
        );
      }
    }

    // Active tab: optional risk-tier filter (`tiers=AT_RISK,UNDERWATER`; unknown
    // values ignored). Filtered rows, their totals, and pre-filter chip counts.
    if (statusParam === "active") {
      const report = await getActivePledgeReport(user.id, range, parseRiskTiers(sp.get("tiers")));
      return NextResponse.json({
        rows: toPledgeReportJson(report.rows),
        totals: report.totals,
        tierCounts: report.tierCounts,
      });
    }

    const rows = await getPledgeReportRows(user.id, statusParam, range);
    const result = toPledgeReportJson(rows);

    // Legacy "all" path returns bare array so the stats strip consumer is unaffected.
    if (statusParam === null) return NextResponse.json(result);

    return NextResponse.json({ rows: result, totals: pledgeReportTotals(rows) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
