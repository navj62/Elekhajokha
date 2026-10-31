// lib/reports/reportExport.ts
//
// Turns the shared report rows (lib/reports/reportQueries.ts) into a
// format-neutral table — the tab's columns, in the tab's order, with the tab's
// labels — and renders it as .xlsx (exceljs) or PDF (generateReportPDF).
// Each cell carries a raw value for Excel and a display string that mirrors
// exactly what the Reports page prints for it.
import ExcelJS from "exceljs";
import { getRiskTier, type RiskTier } from "@/lib/calculateLTV";
import { generateReportPDF, type ReportPdfAlign } from "@/lib/generatePDF";
import {
  fmtReportDate,
  type CustomerReportRow,
  type CustomerReportTotals,
  type PledgeReportRow,
  type PledgeReportTotals,
} from "@/lib/reports/reportQueries";
import {
  REPORT_RISK_TIER_LABEL,
  riskTiersLabel,
  type ReportRiskTier,
} from "@/lib/reports/riskTierFilter";

export type ReportTab = "active" | "released" | "customers";

export const PDF_ROW_LIMIT = 1000;

type ColumnKind = "text" | "date" | "money" | "weight" | "pct" | "int";

type ExportColumn = {
  header: string;
  kind: ColumnKind;
  pdfWidth: number;
  /** Excel-only column (e.g. Risk Tier, which the screen shows inside Risk Score). */
  excelOnly?: boolean;
};

type ExportCell = {
  value: string | number | Date | null;
  display: string;
  color?: string;
};

export type ReportShop = { shopName: string | null; address: string | null; mobile: string | null };

export type ExportContext = {
  shop: ReportShop;
  startDate: string | null; // "YYYY-MM-DD" as sent by the tab
  endDate: string | null;
  activeOnly: boolean;
  generatedAt: Date;
};

export type ExportTable = {
  title: string;
  fileStem: string;
  filters: string;
  columns: ExportColumn[];
  rows: ExportCell[][];
  totals: ExportCell[];
  summary: { label: string; value: string }[];
};

// ── Display helpers — identical output to app/reports/page.tsx ──────────────

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
});
const formatINR = (n: number) => inrFormatter.format(n);
const grams = (n: number) => `${n.toFixed(2)}g`;

// Same palette as the page's ltvColor / riskTierColor; tiers come from
// getRiskTier so the boundaries can't drift from the rest of the app.
const LTV_TIER_HEX: Record<RiskTier, string> = {
  SAFE: "#4D6B2A",
  WATCH: "#8A6B17",
  AT_RISK: "#9A4B14",
  UNDERWATER: "#B91C1C",
};
const CUSTOMER_TIER_HEX: Record<CustomerReportRow["riskTier"], string> = {
  SAFE: "#4D6B2A",
  WATCH: "#8A6B17",
  AT_RISK: "#9A4B14",
  CRITICAL: "#B91C1C",
};
const NULL_HEX = "#9E9E9E";
const REPORT_TIER_HEX: Record<ReportRiskTier, string> = { ...LTV_TIER_HEX, UNKNOWN: NULL_HEX };
const formatRiskTier = (tier: string) => (tier === "AT_RISK" ? "AT RISK" : tier);

/**
 * Calendar date as the tab displays it (fmtReportDate uses the server's local
 * zone), re-expressed as UTC midnight — Excel stores dates without a zone, so
 * this is what makes the cell show the same day as the screen.
 */
function excelDate(d: Date): Date {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

const text = (s: string | null | undefined): ExportCell => ({ value: s ?? null, display: s ?? "—" });
const date = (d: Date | null): ExportCell =>
  d ? { value: excelDate(d), display: fmtReportDate(d) } : { value: null, display: "—" };
const ltvCell = (ltv: number | null): ExportCell =>
  ltv != null
    ? { value: ltv, display: `${ltv.toFixed(1)}%`, color: LTV_TIER_HEX[getRiskTier(ltv)] }
    : { value: null, display: "—", color: NULL_HEX };
// Weight and interest render "—" at zero on screen; Excel keeps the number.
const weight = (n: number): ExportCell => ({ value: n, display: n > 0 ? grams(n) : "—" });
const money = (n: number): ExportCell => ({ value: n, display: formatINR(n) });
const tierCell = (t: ReportRiskTier): ExportCell => ({
  value: REPORT_RISK_TIER_LABEL[t],
  display: REPORT_RISK_TIER_LABEL[t],
  color: REPORT_TIER_HEX[t],
});
const statusLabel = (s: string) => (s === "ACTIVE" ? "Active" : "Released");

function ymdToDisplay(s: string): string {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T00:00:00.000+05:30`) : new Date(s);
  return isNaN(d.getTime())
    ? s
    : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
}

export function dateRangeLabel(ctx: Pick<ExportContext, "startDate" | "endDate">): string {
  const { startDate, endDate } = ctx;
  if (startDate && endDate) return `${ymdToDisplay(startDate)} to ${ymdToDisplay(endDate)}`;
  if (startDate) return `From ${ymdToDisplay(startDate)}`;
  if (endDate) return `Up to ${ymdToDisplay(endDate)}`;
  return "All time";
}

function generatedLabel(d: Date): string {
  return (
    d.toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata",
    }) + " IST"
  );
}

function ymdIST(d: Date): string {
  // en-CA formats as YYYY-MM-DD.
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

export function exportFileName(stem: string, ctx: ExportContext, ext: "xlsx" | "pdf"): string {
  const range =
    ctx.startDate || ctx.endDate
      ? `${ctx.startDate || "start"}_to_${ctx.endDate || "end"}`
      : `all-time_${ymdIST(ctx.generatedAt)}`;
  // Dates are validated upstream; strip anything outside the filename-safe set anyway.
  return `${stem}_${range}.${ext}`.replace(/[^A-Za-z0-9._-]/g, "-");
}

// ── Tables ──────────────────────────────────────────────────────────────────

export function activePledgesTable(
  rows: PledgeReportRow[],
  totals: PledgeReportTotals,
  tiers: readonly ReportRiskTier[]
): ExportTable {
  return {
    title: "Active Pledges Report",
    fileStem: "active-pledges",
    filters: `Status: Active · Date range applies to pledge date · ${riskTiersLabel(tiers)}`,
    columns: [
      { header: "Customer", kind: "text", pdfWidth: 125 },
      { header: "Date", kind: "date", pdfWidth: 70 },
      { header: "Pledge", kind: "text", pdfWidth: 100 },
      { header: "Gold Wt", kind: "weight", pdfWidth: 60 },
      { header: "Silver Wt", kind: "weight", pdfWidth: 60 },
      { header: "Loan", kind: "money", pdfWidth: 80 },
      { header: "Interest", kind: "money", pdfWidth: 72 },
      { header: "Receivable", kind: "money", pdfWidth: 80 },
      { header: "LTV", kind: "pct", pdfWidth: 40 },
      { header: "Risk Tier", kind: "text", pdfWidth: 62 },
      { header: "Status", kind: "text", pdfWidth: 40 },
    ],
    rows: rows.map((p) => [
      text(p.customerName),
      date(p.pledgeDate),
      text(p.itemName),
      weight(p.netWeightOfGold),
      weight(p.netWeightOfSilver),
      money(p.loanAmount),
      { value: p.interestAccrued, display: p.interestAccrued > 0 ? formatINR(p.interestAccrued) : "—" },
      money(p.receivableAmount ?? p.loanAmount),
      ltvCell(p.ltv),
      tierCell(p.riskTier ?? "UNKNOWN"),
      text(statusLabel(p.status)),
    ]),
    totals: [
      text(`Total (${totals.count} pledge${totals.count !== 1 ? "s" : ""})`),
      text(""),
      text(""),
      { value: totals.goldWeight, display: grams(totals.goldWeight) },
      { value: totals.silverWeight, display: grams(totals.silverWeight) },
      money(totals.loanAmount),
      money(totals.interestAccrued),
      money(totals.receivableAmount),
      text(""),
      text(""),
      text(""),
    ],
    summary: [
      { label: "Pledges", value: String(totals.count) },
      { label: "Gold Wt", value: grams(totals.goldWeight) },
      { label: "Silver Wt", value: grams(totals.silverWeight) },
      { label: "Loan Amount", value: formatINR(totals.loanAmount) },
      { label: "Interest", value: formatINR(totals.interestAccrued) },
      { label: "Receivable", value: formatINR(totals.receivableAmount) },
    ],
  };
}

export function releasedPledgesTable(rows: PledgeReportRow[], totals: PledgeReportTotals): ExportTable {
  return {
    title: "Released Pledges Report",
    fileStem: "released-pledges",
    filters: "Status: Released · Date range applies to release date",
    columns: [
      { header: "Customer", kind: "text", pdfWidth: 130 },
      { header: "Date", kind: "date", pdfWidth: 66 },
      { header: "Released", kind: "date", pdfWidth: 66 },
      { header: "Pledge", kind: "text", pdfWidth: 110 },
      { header: "Net Wt", kind: "weight", pdfWidth: 60 },
      { header: "Loan", kind: "money", pdfWidth: 80 },
      { header: "Interest", kind: "money", pdfWidth: 72 },
      { header: "Receivable", kind: "money", pdfWidth: 80 },
      { header: "LTV", kind: "pct", pdfWidth: 50 },
      { header: "Status", kind: "text", pdfWidth: 48 },
    ],
    rows: rows.map((p) => [
      text(p.customerName),
      date(p.pledgeDate),
      date(p.releaseDate),
      text(p.itemName),
      weight(p.netWeight),
      money(p.loanAmount),
      { value: p.interestAccrued, display: p.interestAccrued > 0 ? formatINR(p.interestAccrued) : "—" },
      money(p.receivableAmount ?? p.loanAmount),
      ltvCell(p.ltv),
      text(statusLabel(p.status)),
    ]),
    totals: [
      text(`Total (${totals.count} pledge${totals.count !== 1 ? "s" : ""})`),
      text(""),
      text(""),
      text(""),
      { value: totals.netWeight, display: grams(totals.netWeight) },
      money(totals.loanAmount),
      money(totals.interestAccrued),
      money(totals.receivableAmount),
      text(""),
      text(""),
    ],
    summary: [
      { label: "Pledges", value: String(totals.count) },
      { label: "Loan Amount", value: formatINR(totals.loanAmount) },
      { label: "Interest", value: formatINR(totals.interestAccrued) },
      { label: "Receivable", value: formatINR(totals.receivableAmount) },
    ],
  };
}

export function customersTable(
  rows: CustomerReportRow[],
  totals: CustomerReportTotals,
  activeOnly: boolean
): ExportTable {
  return {
    title: "Customer Report",
    fileStem: "customer-report",
    filters: `Active only: ${activeOnly ? "Yes" : "No"} · Date range applies to the date the customer was added`,
    columns: [
      { header: "Name", kind: "text", pdfWidth: 150 },
      { header: "Mobile", kind: "text", pdfWidth: 90 },
      { header: "Address", kind: "text", pdfWidth: 230 },
      { header: "Pledges", kind: "int", pdfWidth: 50 },
      { header: "Loan", kind: "money", pdfWidth: 90 },
      { header: "Added On", kind: "date", pdfWidth: 72 },
      { header: "Risk Score", kind: "int", pdfWidth: 80 },
      { header: "Risk Tier", kind: "text", pdfWidth: 0, excelOnly: true },
    ],
    rows: rows.map((c) => [
      text(c.name),
      text(c.mobile),
      text(c.address),
      { value: c.pledgeCount, display: String(c.pledgeCount) },
      { value: c.totalLoan, display: c.totalLoan > 0 ? formatINR(c.totalLoan) : "—" },
      date(c.createdAt),
      {
        value: c.riskScore,
        display: `${c.riskScore} ${formatRiskTier(c.riskTier)}`,
        color: CUSTOMER_TIER_HEX[c.riskTier] ?? NULL_HEX,
      },
      text(formatRiskTier(c.riskTier)),
    ]),
    totals: [
      text(`Total (${totals.count} customer${totals.count !== 1 ? "s" : ""})`),
      text(""),
      text(""),
      { value: totals.pledgeCount, display: String(totals.pledgeCount) },
      money(totals.totalLoan),
      text(""),
      text(""),
      text(""),
    ],
    summary: [
      { label: "Customers", value: String(totals.count) },
      { label: "Pledges", value: String(totals.pledgeCount) },
      { label: "Total Loan", value: formatINR(totals.totalLoan) },
    ],
  };
}

// ── Renderers ───────────────────────────────────────────────────────────────

// Indian grouping (₹12,34,567.00), as the app displays money. Excel has no
// lakh/crore grouping, so the commas are literals chosen by magnitude via two
// conditional sections (≥ 1 crore, ≥ 1 lakh, else). Amounts ≥ 100 crore keep
// the extra digits in the leading group ("123,45,67,890.00") — still correct
// digits, just one comma short.
export const MONEY_FMT_INDIAN =
  '[>=10000000]"₹"##\\,##\\,##\\,##0.00;[>=100000]"₹"##\\,##\\,##0.00;"₹"##,##0.00';
// Negatives fall outside both conditions, and Excel's handling of the sign in
// that last section is unreliable — a negative cell gets plain grouping with
// an explicit minus instead.
export const MONEY_FMT_PLAIN = '"₹"#,##0.00;-"₹"#,##0.00';

export function moneyNumFmt(value: unknown): string {
  return typeof value === "number" && value < 0 ? MONEY_FMT_PLAIN : MONEY_FMT_INDIAN;
}

const NUM_FMT: Record<ColumnKind, string | undefined> = {
  text: undefined,
  date: "dd-mmm-yyyy",
  money: MONEY_FMT_INDIAN, // per cell — see moneyNumFmt
  weight: '0.00"g"',
  pct: '0.0"%"',
  int: "0",
};

const ALIGN: Record<ColumnKind, ReportPdfAlign> = {
  text: "left",
  date: "left",
  money: "right",
  weight: "right",
  pct: "right",
  int: "right",
};

export async function buildReportXlsx(table: ExportTable, ctx: ExportContext): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "E-Lekha-Jokha";
  wb.created = ctx.generatedAt;
  const ws = wb.addWorksheet(table.title.replace(/ Report$/, ""));

  // ── Info block ──
  const info: [string, string][] = [
    ["Report", table.title],
    ["Date range", dateRangeLabel(ctx)],
    ["Filters", table.filters],
    ["Generated", generatedLabel(ctx.generatedAt)],
  ];
  const shopRow = ws.addRow([ctx.shop.shopName?.trim() || "—"]);
  shopRow.font = { bold: true, size: 14 };
  for (const [k, v] of info) {
    const r = ws.addRow([k, v]);
    r.getCell(1).font = { bold: true };
  }
  ws.addRow([]);

  // ── Header ──
  const header = ws.addRow(table.columns.map((c) => c.header));
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF565C3F" } };
  });
  ws.views = [{ state: "frozen", ySplit: header.number }];

  // ── Rows ──
  for (const cells of table.rows) ws.addRow(cells.map((c) => c.value));

  // ── Totals ──
  const totalsRow = ws.addRow(table.totals.map((c) => (c.value === "" ? null : c.value)));
  totalsRow.font = { bold: true };
  totalsRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEAE9DF" } };
    cell.border = { top: { style: "thin" } };
  });

  // ── Column formats + widths ──
  table.columns.forEach((col, i) => {
    const column = ws.getColumn(i + 1);
    const fmt = NUM_FMT[col.kind];
    if (fmt) {
      for (let r = header.number + 1; r <= totalsRow.number; r++) {
        const cell = ws.getCell(r, i + 1);
        cell.numFmt = col.kind === "money" ? moneyNumFmt(cell.value) : fmt;
      }
    }
    column.alignment = { horizontal: ALIGN[col.kind] };
    const longest = Math.max(
      col.header.length,
      ...table.rows.map((cells) => cells[i].display.length),
      table.totals[i].display.length
    );
    column.width = Math.min(Math.max(longest + 2, 10), 50);
  });
  // The info block's labels live in column 1 — keep them left-aligned.
  for (let r = 1; r < header.number; r++) ws.getRow(r).alignment = { horizontal: "left" };

  return Buffer.from(await wb.xlsx.writeBuffer());
}

export function buildReportPdf(table: ExportTable, ctx: ExportContext): Promise<Buffer> {
  const keep = table.columns.map((c) => !c.excelOnly);
  const pick = <T,>(xs: T[]) => xs.filter((_, i) => keep[i]);
  const toPdfCell = (c: ExportCell) => ({ text: c.display, color: c.color });

  return generateReportPDF({
    shop: ctx.shop,
    title: table.title,
    metaLines: [
      `Date range: ${dateRangeLabel(ctx)}`,
      `Filters: ${table.filters}`,
      `Generated: ${generatedLabel(ctx.generatedAt)}`,
    ],
    summary: table.summary,
    columns: pick(table.columns).map((c) => ({ header: c.header, width: c.pdfWidth, align: ALIGN[c.kind] })),
    rows: table.rows.map((cells) => pick(cells).map(toPdfCell)),
    // Totals row only prints the summed columns; blank cells stay blank.
    totals: pick(table.totals).map((c) => ({ text: c.value === null || c.value === "" ? "" : c.display })),
  });
}
