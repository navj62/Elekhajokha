"use client";

import React, { Suspense, useState, useEffect, useCallback, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, FileSpreadsheet, FileText, Loader2, X } from "lucide-react";
import { StatusBadge, type BadgeTone } from "@/components/ui/DataTable";
import {
  REPORT_RISK_TIERS,
  REPORT_RISK_TIER_LABEL,
  parseRiskTiers,
  type ReportRiskTier,
} from "@/lib/reports/riskTierFilter";

type ReportKind = "customers" | "active" | "released";
const REPORT_KINDS: readonly ReportKind[] = ["customers", "active", "released"];

const TIER_TONE: Record<ReportRiskTier, BadgeTone> = {
  SAFE: "safe",
  WATCH: "watch",
  AT_RISK: "at-risk",
  UNDERWATER: "critical",
  UNKNOWN: "unknown",
};
const TIER_DOT: Record<ReportRiskTier, string> = {
  SAFE: "bg-risk-low",
  WATCH: "bg-risk-medium",
  AT_RISK: "bg-risk-high",
  UNDERWATER: "bg-risk-critical",
  UNKNOWN: "bg-status-released",
};
type ExportFormat = "xlsx" | "pdf";

// Query string for /api/reports/export — the tab plus exactly the filters
// that tab sends to its own route, so a file always matches what's on screen.
function exportQueryFor(
  tab: ReportKind,
  startDate: string,
  endDate: string,
  activeOnly: boolean,
  tiers: readonly ReportRiskTier[]
) {
  const params = new URLSearchParams({ tab });
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);
  if (tab === "customers" && activeOnly) params.set("activeOnly", "true");
  if (tab === "active" && tiers.length) params.set("tiers", tiers.join(","));
  return params.toString();
}

// ── Types ──────────────────────────────────────────────────────────────────
interface CustomerRow {
  id: string;
  name: string;
  mobile: string | null;
  address: string | null;
  pledgeCount: number;
  totalLoan: number;
  createdAt: string;
  riskScore: number;
  riskTier: "SAFE" | "WATCH" | "AT_RISK" | "CRITICAL";
}

interface PledgeRow {
  index: number;
  customerName: string;
  pledgeDate: string;
  releaseDate: string | null;
  itemType: string;
  itemName: string;
  netWeight: number;
  netWeightOfGold: number;
  netWeightOfSilver: number;
  loanAmount: number;
  interestAccrued: number;
  receivableAmount: number | null;
  marketValue: number | null;
  ltv: number | null;
  riskTier?: ReportRiskTier; // Active tab only
  status: string;
}

interface TableTotals {
  count: number;
  goldWeight: number;
  silverWeight: number;
  netWeight: number;
  interestAccrued: number;
  receivableAmount: number;
  loanAmount: number;
}

// LTV thresholds mirror the financial-summary page colors.
function ltvColor(ltv: number | null): string {
  if (ltv === null) return "#9E9E9E";
  if (ltv < 65) return "#4D6B2A";
  if (ltv <= 75) return "#8A6B17";
  if (ltv <= 90) return "#9A4B14";
  return "#B91C1C";
}

function riskTierColor(tier: string): string {
  switch (tier) {
    case "SAFE":     return "#4D6B2A";
    case "WATCH":    return "#8A6B17";
    case "AT_RISK":  return "#9A4B14";
    case "CRITICAL": return "#B91C1C";
    default:         return "#9E9E9E";
  }
}

function formatRiskTier(tier: string): string {
  switch (tier) {
    case "AT_RISK":  return "AT RISK";
    case "CRITICAL": return "CRITICAL";
    default:         return tier;
  }
}

interface Stats {
  totalCustomers: number;
  totalActivePledges: number;
  totalActiveLoanAmount: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function formatINR(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatDate(d: Date) {
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ReportsPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Tab and tier filter live in the URL so a refresh or shared link keeps them.
  const [selectedReport, setSelectedReport] = useState<ReportKind>(() => {
    const tab = searchParams.get("tab");
    return REPORT_KINDS.includes(tab as ReportKind) ? (tab as ReportKind) : "customers";
  });
  // Active Pledges only — none selected = every tier.
  const [tiers, setTiers] = useState<ReportRiskTier[]>(() => parseRiskTiers(searchParams.get("tiers")));
  const [tierCounts, setTierCounts] = useState<Record<ReportRiskTier, number> | null>(null);

  // Data
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [pledges, setPledges] = useState<PledgeRow[]>([]); // unfiltered — stats strip only
  const [stats, setStats] = useState<Stats | null>(null);
  const [adminName, setAdminName] = useState<string>("Admin");
  const [generatedOn] = useState(() => formatDate(new Date()));

  // Filtered pledge table (active/released variants)
  const [tableRows, setTableRows] = useState<PledgeRow[]>([]);
  const [tableTotals, setTableTotals] = useState<TableTotals | null>(null);
  const [tableError, setTableError] = useState<{ count: number } | null>(null);
  const [loadingTable, setLoadingTable] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  // Customer Report only — restrict to customers holding an open (ACTIVE/OVERDUE) pledge.
  const [activeOnly, setActiveOnly] = useState(false);

  // Loading states
  const [loadingData, setLoadingData] = useState(true);
  const [loadingCustomers, setLoadingCustomers] = useState(true);

  // Export — `appliedQuery` is the export query for the data currently on
  // screen, set when a fetch lands. Exports use it (not the live inputs), and
  // stay disabled while the inputs have moved on and the table hasn't caught up.
  const [appliedQuery, setAppliedQuery] = useState<string | null>(null);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [exportError, setExportError] = useState<{ query: string; message: string } | null>(null);

  const isPledge = selectedReport !== "customers";
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // ── Fetch profile, stats, and pledges-for-stats-strip ───────────────────
  const fetchAll = useCallback(async () => {
    setLoadingData(true);
    try {
      const [profileRes, pledgesRes, dashboardRes] = await Promise.all([
        fetch("/api/profile"),
        fetch("/api/reports/pledges"),
        fetch("/api/dashboard"),
      ]);

      if (profileRes.ok) {
        const p = await profileRes.json();
        const name = [p.firstName, p.lastName].filter(Boolean).join(" ") || p.username || "Admin";
        setAdminName(name);
      }

      if (pledgesRes.ok) setPledges(await pledgesRes.json());

      if (dashboardRes.ok) {
        const d = await dashboardRes.json();
        setStats({
          totalCustomers: d.stats.totalCustomers,
          totalActivePledges: d.stats.totalActivePledges,
          totalActiveLoanAmount: d.stats.totalActiveLoanAmount,
        });
      }
    } catch (err) {
      console.error("Reports fetch error:", err);
    } finally {
      setLoadingData(false);
    }
  }, []);

  // ── Fetch customer table (filterable by createdAt date range) ────────────
  const fetchCustomers = useCallback(async () => {
    setLoadingCustomers(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (activeOnly) params.set("activeOnly", "true");
      const res = await fetch(`/api/reports/customers?${params}`);
      if (res.ok) {
        setCustomers(await res.json());
        setAppliedQuery(exportQueryFor("customers", startDate, endDate, activeOnly, []));
      } else {
        setAppliedQuery(null);
      }
    } catch (err) {
      console.error("Customer fetch error:", err);
      setAppliedQuery(null);
    } finally {
      setLoadingCustomers(false);
    }
  }, [startDate, endDate, activeOnly]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Build the query string for the filtered pledge variants ──────────────
  const buildPledgeQuery = useCallback(
    (extra?: Record<string, string>) => {
      const status = selectedReport === "released" ? "released" : "active";
      const params = new URLSearchParams({ status });
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (status === "active" && tiers.length) params.set("tiers", tiers.join(","));
      if (extra) for (const [k, v] of Object.entries(extra)) params.set(k, v);
      return params.toString();
    },
    [selectedReport, startDate, endDate, tiers]
  );

  // ── Fetch the filtered table (debounced on date typing) ──────────────────
  const fetchTable = useCallback(async () => {
    setLoadingTable(true);
    setTableError(null);
    try {
      const res = await fetch(`/api/reports/pledges?${buildPledgeQuery()}`);
      const data = await res.json();
      const query = exportQueryFor(selectedReport, startDate, endDate, false, tiers);
      if (!res.ok) {
        setTierCounts(null);
        if (data?.error === "TOO_MANY_RECORDS") {
          setTableRows([]);
          setTableTotals(null);
          setTableError({ count: data.count ?? 0 });
          // Too many to display, but Excel export has no cap — keep it available.
          setAppliedQuery(query);
        } else {
          setTableRows([]);
          setTableTotals(null);
          setAppliedQuery(null);
        }
        return;
      }
      setTableRows(data.rows ?? []);
      setTableTotals(data.totals ?? null);
      setTierCounts(data.tierCounts ?? null);
      setAppliedQuery(query);
    } catch (err) {
      console.error("Pledge table fetch error:", err);
      setTableRows([]);
      setTierCounts(null);
      setAppliedQuery(null);
    } finally {
      setLoadingTable(false);
    }
  }, [buildPledgeQuery, selectedReport, startDate, endDate, tiers]);

  // ── URL sync for tab + tier filter (called from handlers, not an effect) ──
  function syncUrl(tab: ReportKind, nextTiers: readonly ReportRiskTier[]) {
    const params = new URLSearchParams();
    if (tab !== "customers") params.set("tab", tab);
    if (tab === "active" && nextTiers.length) params.set("tiers", nextTiers.join(","));
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }
  function selectReport(tab: ReportKind) {
    setSelectedReport(tab);
    syncUrl(tab, tiers);
  }
  function toggleTier(tier: ReportRiskTier) {
    // Keep canonical order so the URL and the files' filter line are stable.
    const next = REPORT_RISK_TIERS.filter((t) => (t === tier ? !tiers.includes(t) : tiers.includes(t)));
    setTiers(next);
    syncUrl(selectedReport, next);
  }

  // Re-fetch pledge table when variant or date range changes (debounced).
  useEffect(() => {
    if (!isPledge) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchTable, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [isPledge, fetchTable]);

  // Re-fetch customer table when date range changes or on customer tab mount (debounced).
  useEffect(() => {
    if (isPledge) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchCustomers, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [isPledge, fetchCustomers]);

  // ── Quick-select date ranges (YYYY-MM-DD, local) ─────────────────────────
  const ymd = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };
  function applyQuickRange(kind: "last30" | "thisMonth" | "lastMonth") {
    const now = new Date();
    if (kind === "last30") {
      const from = new Date(now);
      from.setDate(from.getDate() - 30);
      setStartDate(ymd(from));
      setEndDate(ymd(now));
    } else if (kind === "thisMonth") {
      setStartDate(ymd(new Date(now.getFullYear(), now.getMonth(), 1)));
      setEndDate(ymd(now));
    } else {
      const firstLast = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastLast = new Date(now.getFullYear(), now.getMonth(), 0); // day 0 = last day of prev month
      setStartDate(ymd(firstLast));
      setEndDate(ymd(lastLast));
    }
  }
  function clearDates() {
    setStartDate("");
    setEndDate("");
  }

  // ── Export (Excel / PDF) ─────────────────────────────────────────────────
  const currentQuery = exportQueryFor(selectedReport, startDate, endDate, activeOnly, tiers);
  const tabLoading = isPledge ? loadingTable : loadingCustomers;
  const exportDisabled = exporting !== null || tabLoading || appliedQuery !== currentQuery;
  const visibleExportError = exportError?.query === currentQuery ? exportError.message : null;

  const handleExport = async (format: ExportFormat) => {
    if (!appliedQuery) return;
    const query = appliedQuery;
    setExporting(format);
    setExportError(null);
    try {
      const res = await fetch(`/api/reports/export?${query}&format=${format}`);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setExportError({
          query,
          message:
            data?.error === "PDF_ROW_LIMIT" && typeof data.message === "string"
              ? data.message
              : `Couldn't create the ${format === "xlsx" ? "Excel file" : "PDF"}. Please try again.`,
        });
        return;
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const filename = /filename="([^"]+)"/.exec(disposition)?.[1] ?? `report.${format}`;
      triggerDownload(blob, filename);
    } catch (err) {
      console.error("Report export error:", err);
      setExportError({ query, message: "Export failed — check your connection and try again." });
    } finally {
      setExporting(null);
    }
  };

  function triggerDownload(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  // ── Derived stats ────────────────────────────────────────────────────────
  const totalCustomers   = stats?.totalCustomers       ?? customers.length;
  const totalPledges     = pledges.length;
  const portfolioValue   = stats?.totalActiveLoanAmount ?? customers.reduce((s, c) => s + c.totalLoan, 0);
  const activePledges    = stats?.totalActivePledges   ?? pledges.filter(p => p.status === "ACTIVE").length;

  const recordCount = selectedReport === "customers" ? customers.length : tableRows.length;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="font-sans text-[#2C2C2C] max-w-[1200px] mx-auto pb-20 mt-6">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <h1 className="text-[28px] font-medium tracking-tight text-[#2C2C2C] flex items-baseline gap-4">
          Reports
          <span className="text-[14px] font-normal text-[#6F6F6F] tracking-normal">
            Customer &amp; pledge reporting center
          </span>
        </h1>
      </div>

      {/* REPORT SWITCHER */}
      <div className="flex items-center gap-2 bg-[#F0EFDF] p-1.5 rounded-full mb-6 w-max border border-[#EAE8DD]">
        {([
          { key: "customers", label: "Customer Report" },
          { key: "active",    label: "Active Pledges" },
          { key: "released",  label: "Released Pledges" },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => selectReport(key)}
            className={`px-7 py-2 rounded-full text-[12px] font-semibold transition-all ${
              selectedReport === key
                ? "bg-[#555B3F] text-white shadow-sm"
                : "text-[#6F6F6F] hover:text-[#2C2C2C]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* DATE RANGE */}
      <div className="flex flex-wrap items-end gap-4 mb-12">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold text-[#6F6F6F] uppercase tracking-wider">From</label>
            <input
              type="date"
              value={startDate}
              max={endDate || undefined}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-9 px-3 rounded-[10px] text-[13px] text-[#2C2C2C] bg-white border border-[#ECEAE4] focus:outline-none focus:ring-2 focus:ring-[#8C8F7A] transition-all"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold text-[#6F6F6F] uppercase tracking-wider">To</label>
            <input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-9 px-3 rounded-[10px] text-[13px] text-[#2C2C2C] bg-white border border-[#ECEAE4] focus:outline-none focus:ring-2 focus:ring-[#8C8F7A] transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            {([
              { key: "last30",    label: "Last 30 Days" },
              { key: "thisMonth", label: "This Month" },
              { key: "lastMonth", label: "Last Month" },
            ] as const).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => applyQuickRange(key)}
                className="h-9 px-3 rounded-full text-[12px] font-semibold text-[#6F6F6F] border border-[#ECEAE4] hover:text-[#2C2C2C] hover:border-[#D8D6C8] transition-colors"
              >
                {label}
              </button>
            ))}
            {(startDate || endDate) && (
              <button
                onClick={clearDates}
                className="h-9 px-3 rounded-full text-[12px] font-semibold text-[#9E9E9E] hover:text-[#2C2C2C] flex items-center gap-1 transition-colors"
              >
                <X size={13} /> Clear
              </button>
            )}

            {/* Customer Report only — the pledge variants filter by status via their own tab. */}
            {!isPledge && (
              <>
                <span className="w-px h-5 bg-[#ECEAE4]" aria-hidden="true" />
                <button
                  onClick={() => setActiveOnly((v) => !v)}
                  aria-pressed={activeOnly}
                  title="Show only customers with at least one active or overdue pledge"
                  className={`h-9 px-3 rounded-full text-[12px] font-semibold transition-colors ${
                    activeOnly
                      ? "bg-[#555B3F] text-white shadow-sm border border-[#555B3F]"
                      : "text-[#6F6F6F] border border-[#ECEAE4] hover:text-[#2C2C2C] hover:border-[#D8D6C8]"
                  }`}
                >
                  Active Only
                </button>
              </>
            )}
          </div>

          {/* Active Pledges only — multi-select risk-tier filter; none selected = all. */}
          {selectedReport === "active" && (
            <div className="w-full flex flex-col gap-1">
              <span id="tier-filter-label" className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Risk Tier
              </span>
              <div role="group" aria-labelledby="tier-filter-label" className="flex flex-wrap items-center gap-2">
                {REPORT_RISK_TIERS.map((tier) => {
                  const selected = tiers.includes(tier);
                  const count = !loadingTable && tierCounts ? tierCounts[tier] : null;
                  return (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => toggleTier(tier)}
                      aria-pressed={selected}
                      className={`inline-flex items-center gap-2 min-h-[44px] sm:min-h-0 sm:h-9 px-3 rounded-full border text-[12px] font-semibold transition-colors ${
                        selected
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-card text-muted-foreground border-border hover:text-foreground"
                      }`}
                    >
                      <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${TIER_DOT[tier]}`} />
                      {REPORT_RISK_TIER_LABEL[tier]}
                      {count !== null && <span className="tabular-nums">· {count}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

      {/* SUMMARY STRIP */}
      <div className="flex items-center w-full border-t border-b border-[#ECEAE4] py-10 mb-16">
        {[
          { label: "Customers",      value: loadingData ? "—" : String(totalCustomers) },
          { label: "Pledges",        value: loadingData ? "—" : String(totalPledges) },
          { label: "Portfolio Value",value: loadingData ? "—" : formatINR(portfolioValue), wide: true },
          { label: "Active Pledges", value: loadingData ? "—" : String(activePledges) },
        ].map((m, i, arr) => (
          <div
            key={m.label}
            className={`${m.wide ? "flex-[1.5]" : "flex-1"} flex flex-col items-center justify-center ${i < arr.length - 1 ? "border-r border-[#ECEAE4]" : ""}`}
          >
            <span className="text-[32px] font-semibold leading-none mb-1.5">{m.value}</span>
            <span className="text-[10px] font-semibold text-[#6F6F6F] uppercase tracking-wider">{m.label}</span>
          </div>
        ))}
      </div>

      {/* FILTERED TOTALS STRIP — pledge variants only */}
      {isPledge && tableTotals && !loadingTable && !tableError && (
        <div
          className="rounded-[12px] p-4 mb-8 border"
          style={{ background: "var(--card)", borderColor: "var(--border)" }}
        >
          <div className="flex flex-col sm:flex-row">
            {(selectedReport === "active"
              ? [
                  { label: "Pledges",      value: String(tableTotals.count) },
                  { label: "Gold Wt",      value: `${tableTotals.goldWeight.toFixed(2)}g` },
                  { label: "Silver Wt",    value: `${tableTotals.silverWeight.toFixed(2)}g` },
                  { label: "Loan Amount",  value: formatINR(tableTotals.loanAmount) },
                  { label: "Interest",     value: formatINR(tableTotals.interestAccrued) },
                  { label: "Receivable",   value: formatINR(tableTotals.receivableAmount) },
                ]
              : [
                  { label: "Pledges",      value: String(tableTotals.count) },
                  { label: "Loan Amount",  value: formatINR(tableTotals.loanAmount) },
                  { label: "Interest",     value: formatINR(tableTotals.interestAccrued) },
                  { label: "Receivable",   value: formatINR(tableTotals.receivableAmount) },
                ]
            ).map((stat, i, arr) => (
              <div
                key={stat.label}
                className={`flex-1 flex flex-col items-center justify-center py-2 sm:py-0 ${
                  i < arr.length - 1
                    ? "border-b sm:border-b-0 sm:border-r border-[#ECEAE4]"
                    : ""
                }`}
              >
                <span className="text-[20px] font-semibold text-[#2C2C2C] leading-none mb-1">{stat.value}</span>
                <span className="text-[10px] font-semibold text-[#6F6F6F] uppercase tracking-wider">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TABLE SECTION */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex items-baseline gap-3">
            <h2 className="text-[18px] font-semibold text-[#2C2C2C]">
              {selectedReport === "customers"
                ? "Customers"
                : selectedReport === "released"
                ? "Released Pledges"
                : "Active Pledges"}
            </h2>
            <span className="text-[12px] text-[#6F6F6F]">
              {selectedReport === "customers"
                ? loadingData
                  ? "Loading…"
                  : `${recordCount} total`
                : loadingTable
                ? "Loading…"
                : selectedReport === "released"
                ? `${recordCount} released record${recordCount !== 1 ? "s" : ""}`
                : `${recordCount} active record${recordCount !== 1 ? "s" : ""}`}
            </span>
          </div>

          <div className="flex w-full sm:w-auto gap-2">
            {([
              { format: "xlsx", label: "Export to Excel", Icon: FileSpreadsheet },
              { format: "pdf",  label: "Export to PDF",   Icon: FileText },
            ] as const).map(({ format, label, Icon }) => (
              <button
                key={format}
                type="button"
                onClick={() => handleExport(format)}
                disabled={exportDisabled}
                aria-busy={exporting === format}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-[10px] border border-border bg-card text-foreground text-[13px] font-semibold transition-colors hover:bg-secondary disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {exporting === format ? (
                  <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                ) : (
                  <Icon size={16} aria-hidden="true" />
                )}
                {label}
              </button>
            ))}
          </div>
        </div>

        {visibleExportError && (
          <p
            role="alert"
            className="-mt-3 mb-6 rounded-[10px] px-3 py-2 text-[13px]"
            style={{ background: "var(--risk-critical-surface)", color: "var(--risk-critical-foreground)" }}
          >
            {visibleExportError}
          </p>
        )}

        {selectedReport === "customers" ? (
          loadingCustomers ? (
            <div className="flex items-center gap-2 text-[#6F6F6F] text-[14px] py-12">
              <Loader2 size={18} className="animate-spin text-[#555B3F]" />
              Loading records…
            </div>
          ) : (
          /* ── CUSTOMER TABLE ── */
          <div className="w-full">
            <div className="grid grid-cols-[1.3fr_1fr_1.5fr_0.6fr_0.9fr_0.85fr_0.9fr] gap-3 py-3 px-3 bg-[#3D4230] rounded-t-[8px] text-[11px] font-semibold text-white tracking-wider uppercase">
              <div>Name</div>
              <div>Mobile</div>
              <div>Address</div>
              <div className="text-center">Pledges</div>
              <div className="text-right">Loan</div>
              <div className="text-right">Added On</div>
              <div className="text-right">Risk Score</div>
            </div>
            {customers.length === 0 ? (
              <div className="py-12 text-center text-[14px] text-[#9E9E9E]">No customers found.</div>
            ) : customers.map((c) => (
              <div key={c.id} className="grid grid-cols-[1.3fr_1fr_1.5fr_0.6fr_0.9fr_0.85fr_0.9fr] gap-3 px-3 py-4 border-b border-[#F4F3EE] text-[13px] items-center">
                <div className="font-semibold text-[#2C2C2C] truncate">{c.name}</div>
                <div className="text-[#6F6F6F]">{c.mobile ?? "—"}</div>
                <div className="text-[#6F6F6F] truncate">{c.address ?? "—"}</div>
                <div className="text-center">
                  <span className="inline-block bg-[#F0EFDF] text-[#555B3F] font-semibold text-[11px] px-2 py-0.5 rounded">
                    {c.pledgeCount}
                  </span>
                </div>
                <div className="text-right font-semibold text-[#555B3F]">
                  {c.totalLoan > 0 ? formatINR(c.totalLoan) : "—"}
                </div>
                <div className="text-right text-[#6F6F6F] text-[12px]">{c.createdAt}</div>
                <div className="text-right">
                  <span className="font-semibold text-[13px]" style={{ color: riskTierColor(c.riskTier) }}>
                    {c.riskScore}
                  </span>
                  <span className="ml-1 text-[10px] text-[#9E9E9E]">{formatRiskTier(c.riskTier)}</span>
                </div>
              </div>
            ))}
          </div>
          )
        ) : loadingTable ? (
          <div className="flex items-center gap-2 text-[#6F6F6F] text-[14px] py-12">
            <Loader2 size={18} className="animate-spin text-[#555B3F]" />
            Loading records…
          </div>
        ) : tableError ? (
          /* ── TOO MANY RECORDS ── */
          <div className="py-12 text-center">
            <p className="text-[14px] text-[#9E9E9E] mb-4">
              Your filter returns {tableError.count} records — too many to display. Please narrow your date range.
            </p>
            <button
              onClick={() => applyQuickRange("last30")}
              className="text-[13px] font-semibold text-[#555B3F] underline underline-offset-2 hover:text-[#4B5036] transition-colors"
            >
              Use Last 30 Days
            </button>
          </div>
        ) : (
          /* ── PLEDGE TABLE ── */
          (() => {
            const isReleasedVariant = selectedReport === "released";
            // Active:   Customer | Date | Pledge | Gold Wt | Silver Wt | Loan | Interest | Receivable | LTV | Risk Tier | Status
            // Released: Customer | Date | Released | Pledge | Net Wt | Loan | Interest | Receivable | LTV | Status
            const gridCols = isReleasedVariant
              ? "1.2fr 0.9fr 0.9fr 1fr 0.7fr 1fr 1fr 1fr 0.6fr 0.7fr"
              : "1.2fr 0.9fr 1fr 0.7fr 0.7fr 1fr 1fr 1fr 0.6fr 0.9fr 0.7fr";
            return (
            <div className="w-full">
              <div
                className="grid gap-3 py-3 px-3 bg-[#3D4230] rounded-t-[8px] text-[11px] font-semibold text-white tracking-wider uppercase"
                style={{ gridTemplateColumns: gridCols }}
              >
                <div>Customer</div>
                <div>Date</div>
                {isReleasedVariant && <div>Released</div>}
                <div>Pledge</div>
                {isReleasedVariant
                  ? <div className="text-right">Net Wt</div>
                  : <><div className="text-right">Gold Wt</div><div className="text-right">Silver Wt</div></>}
                <div className="text-right">Loan</div>
                <div className="text-right">Interest</div>
                <div className="text-right">Receivable</div>
                <div className="text-right">LTV</div>
                {!isReleasedVariant && <div className="text-right">Risk Tier</div>}
                <div className="text-right">Status</div>
              </div>
              {tableRows.length === 0 ? (
                <div className="py-12 text-center text-[14px] text-[#9E9E9E]">No pledges found.</div>
              ) : tableRows.map((p, i) => (
                <div
                  key={i}
                  className="grid gap-3 px-3 py-4 border-b border-[#F4F3EE] text-[13px] items-center"
                  style={{ gridTemplateColumns: gridCols }}
                >
                  <div className="font-semibold text-[#2C2C2C] truncate">{p.customerName}</div>
                  <div className="text-[#6F6F6F]">{p.pledgeDate}</div>
                  {isReleasedVariant && (
                    <div className="text-[#6F6F6F]">{p.releaseDate ?? "—"}</div>
                  )}
                  <div className="text-[#6F6F6F] truncate">{p.itemName}</div>
                  {isReleasedVariant ? (
                    <div className="text-right text-[#6F6F6F]">
                      {p.netWeight > 0 ? `${p.netWeight.toFixed(2)}g` : <span className="text-[#9E9E9E]">—</span>}
                    </div>
                  ) : (
                    <>
                      <div className="text-right text-[#6F6F6F]">
                        {p.netWeightOfGold > 0 ? `${p.netWeightOfGold.toFixed(2)}g` : <span className="text-[#9E9E9E]">—</span>}
                      </div>
                      <div className="text-right text-[#6F6F6F]">
                        {p.netWeightOfSilver > 0 ? `${p.netWeightOfSilver.toFixed(2)}g` : <span className="text-[#9E9E9E]">—</span>}
                      </div>
                    </>
                  )}
                  <div className="text-right font-semibold text-[#2C2C2C]">{formatINR(p.loanAmount)}</div>
                  <div className="text-right font-semibold text-[#2C2C2C]">
                    {p.interestAccrued > 0 ? formatINR(p.interestAccrued) : <span className="text-[#9E9E9E]">—</span>}
                  </div>
                  <div className="text-right font-semibold text-[#2C2C2C]">
                    {p.receivableAmount != null ? formatINR(p.receivableAmount) : formatINR(p.loanAmount)}
                  </div>
                  <div className="text-right font-semibold" style={{ color: ltvColor(p.ltv) }}>
                    {p.ltv != null ? `${p.ltv.toFixed(1)}%` : "—"}
                  </div>
                  {!isReleasedVariant && (
                    <div className="text-right">
                      <StatusBadge tone={TIER_TONE[p.riskTier ?? "UNKNOWN"]}>
                        {REPORT_RISK_TIER_LABEL[p.riskTier ?? "UNKNOWN"]}
                      </StatusBadge>
                    </div>
                  )}
                  <div className="text-right">
                    <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                      p.status === "ACTIVE"
                        ? "bg-[#F0EFDF] text-[#555B3F]"
                        : "bg-[#F4F3EE] text-[#6F6F6F]"
                    }`}>
                      {p.status === "ACTIVE" ? "Active" : "Released"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            );
          })()
        )}
      </div>

      {/* PAGINATION */}
      <div className="flex items-center justify-between py-4 text-[13px] text-[#6F6F6F] mb-12">
        <div>
          {loadingData
            ? "Loading…"
            : `Showing ${recordCount} of ${recordCount} ${selectedReport === "customers" ? "customers" : "pledges"}`}
        </div>
        <div className="flex items-center gap-4">
          <button className="p-1 hover:text-[#2C2C2C] disabled:opacity-30" disabled>
            <ArrowLeft size={16} strokeWidth={2} />
          </button>
          <button className="p-1 hover:text-[#2C2C2C] disabled:opacity-30" disabled>
            <ArrowRight size={16} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* REPORT METADATA */}
      <div className="border-t border-[#ECEAE4] pt-8 flex flex-col md:flex-row justify-between gap-6 text-[13px] leading-relaxed">
        <div className="text-[#6F6F6F]">
          <div className="mb-1">
            <span className="font-bold text-[#2C2C2C]">Generated By:</span>{" "}
            {adminName} — Admin
          </div>
          <div>
            <span className="font-bold text-[#2C2C2C]">Generated On:</span>{" "}
            {generatedOn},{" "}
            <span className="font-bold text-[#2C2C2C]">Status:</span> Official Record
          </div>
        </div>
        <div className="text-[#6F6F6F] md:text-right">
          <div className="mb-1">
            <span className="font-bold text-[#2C2C2C]">Report Type:</span>{" "}
            {selectedReport === "customers"
              ? "Customer Report"
              : selectedReport === "released"
              ? "Released Pledges Report"
              : "Active Pledges Report"}
          </div>
          <div>
            <span className="font-bold text-[#2C2C2C]">Records Included:</span>{" "}
            {recordCount} {selectedReport === "customers" ? "Customer" : "Pledge"}{recordCount !== 1 ? "s" : ""}
          </div>
        </div>
      </div>

    </div>
  );
}

// Suspense boundary for useSearchParams (tab + tier filter come from the URL).
export default function ReportsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="animate-spin text-primary" size={28} />
        </div>
      }
    >
      <ReportsPageContent />
    </Suspense>
  );
}
