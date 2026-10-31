// app/api/reports/export/route.ts
//
// GET /api/reports/export?tab=active|released|customers&format=xlsx|pdf
//     &startDate=YYYY-MM-DD&endDate=YYYY-MM-DD[&activeOnly=true]
//
// The one export path for the Reports page. Reuses the tabs' own query
// functions (lib/reports/reportQueries.ts) with the tabs' own filters, so a
// file always holds exactly the rows and totals on screen. Differences from
// the tab, by design:
//   • xlsx has NO row cap — it exports past the tab's 5,000-row
//     TOO_MANY_RECORDS limit.
//   • pdf refuses above PDF_ROW_LIMIT (1,000) with PDF_ROW_LIMIT. Without a
//     tier filter that's decided by a count, before any rows are loaded; with
//     one (Active tab, `tiers=`) it's the FILTERED count, which needs each
//     row's LTV first — so a tier filter can bring an export under the limit.
import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import {
  countCustomerReport,
  countPledgeReport,
  customerReportTotals,
  getActivePledgeReport,
  getCustomerReportRows,
  getPledgeReportRows,
  parseDateRange,
  pledgeReportTotals,
} from "@/lib/reports/reportQueries";
import {
  PDF_ROW_LIMIT,
  activePledgesTable,
  buildReportPdf,
  buildReportXlsx,
  customersTable,
  exportFileName,
  releasedPledgesTable,
  type ExportContext,
  type ExportTable,
  type ReportTab,
} from "@/lib/reports/reportExport";
import { parseRiskTiers } from "@/lib/reports/riskTierFilter";

const TABS: readonly ReportTab[] = ["active", "released", "customers"];
const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkUserId } });
    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    const sp = req.nextUrl.searchParams;
    const tab = sp.get("tab") as ReportTab | null;
    const format = sp.get("format");
    if (!tab || !TABS.includes(tab))
      return NextResponse.json(
        { error: "INVALID_TAB", message: "tab must be 'active', 'released' or 'customers'." },
        { status: 400 }
      );
    if (format !== "xlsx" && format !== "pdf")
      return NextResponse.json(
        { error: "INVALID_FORMAT", message: "format must be 'xlsx' or 'pdf'." },
        { status: 400 }
      );

    const startDate = sp.get("startDate");
    const endDate = sp.get("endDate");
    const activeOnly = tab === "customers" && sp.get("activeOnly") === "true";
    const tiers = tab === "active" ? parseRiskTiers(sp.get("tiers")) : [];

    // Same validation as each tab's route.
    const parsed = parseDateRange(startDate, endDate);
    if (!parsed.ok)
      return NextResponse.json({ error: parsed.error, message: parsed.message }, { status: 400 });
    const { range } = parsed;
    if (tab !== "customers" && range.start && range.end && range.start > range.end) {
      return NextResponse.json(
        { error: "INVALID_RANGE", message: "startDate must be on or before endDate." },
        { status: 400 }
      );
    }

    const pdfLimitResponse = (count: number) =>
      NextResponse.json(
        {
          error: "PDF_ROW_LIMIT",
          count,
          limit: PDF_ROW_LIMIT,
          message: `This report has ${count.toLocaleString("en-IN")} rows. PDF export is limited to ${PDF_ROW_LIMIT.toLocaleString("en-IN")} rows — please narrow the date range, or use Export to Excel.`,
        },
        { status: 400 }
      );

    // Fast path: refuse an over-limit PDF from a count alone, unless a tier
    // filter could shrink it (that's checked after the rows are computed).
    if (format === "pdf" && tiers.length === 0) {
      const count =
        tab === "customers"
          ? await countCustomerReport(user.id, range, activeOnly)
          : await countPledgeReport(user.id, tab, range);
      if (count > PDF_ROW_LIMIT) return pdfLimitResponse(count);
    }

    let table: ExportTable;
    if (tab === "customers") {
      const rows = await getCustomerReportRows(user.id, range, activeOnly);
      table = customersTable(rows, customerReportTotals(rows), activeOnly);
    } else if (tab === "active") {
      const report = await getActivePledgeReport(user.id, range, tiers);
      if (format === "pdf" && report.rows.length > PDF_ROW_LIMIT) return pdfLimitResponse(report.rows.length);
      table = activePledgesTable(report.rows, report.totals, tiers);
    } else {
      const rows = await getPledgeReportRows(user.id, tab, range);
      table = releasedPledgesTable(rows, pledgeReportTotals(rows));
    }

    const ctx: ExportContext = {
      shop: { shopName: user.shopName, address: user.address, mobile: user.mobile },
      startDate,
      endDate,
      activeOnly,
      generatedAt: new Date(),
    };

    const body = format === "xlsx" ? await buildReportXlsx(table, ctx) : await buildReportPdf(table, ctx);
    const filename = exportFileName(table.fileStem, ctx, format);

    return new NextResponse(new Uint8Array(body), {
      headers: {
        "Content-Type": format === "xlsx" ? XLSX_TYPE : "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Report export failed:", err instanceof Error ? err.message : "unknown error");
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
