"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, RefreshCw, AlertTriangle,
  ShieldCheck, Eye, Flame, Waves,
  ArrowUpDown, Search, X, Filter,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
type RiskTier = "SAFE" | "WATCH" | "AT_RISK" | "UNDERWATER" | null;
type FilterTab = "ALL" | RiskTier;

interface PledgeRow {
  pledgeId: string;
  customerId: string;
  customerName: string;
  pledgeDate: string;
  netWeightOfGold: number;
  netWeightOfSilver: number;
  principal: number;
  accruedInterest: number;
  amountOwed: number;
  goldPpg: number | null;
  silverPpg: number | null;
  marketValue: number | null;
  ltv: number | null;
  riskTier: RiskTier;
}

interface TierCounts {
  SAFE: number;
  WATCH: number;
  AT_RISK: number;
  UNDERWATER: number;
  NO_PRICE: number;
}

interface Summary {
  totalPledges: number;
  totalLent: number;
  totalOwed: number;
  totalMarketValue: number;
  avgLtv: number | null;
  tierCounts: TierCounts;
}

interface LtvData {
  hasPrices: boolean;
  goldPricePerGram: number | null;
  silverPricePerGram: number | null;
  priceUpdatedAt: string | null;
  summary: Summary;
  pledges: PledgeRow[];
}

/* ------------------------------------------------------------------ */
/*  Tier config — Linen Ledger palette                                  */
/* ------------------------------------------------------------------ */
const TIER_CFG = {
  SAFE: { label: "Safe", range: "(0–65%)", hex: "#555B3F", dot: "bg-[#555B3F]", badge: "bg-[#E8EBD8] text-[#555B3F]", icon: ShieldCheck },
  WATCH: { label: "Watch", range: "(66–75%)", hex: "#C9A14B", dot: "bg-[#C9A14B]", badge: "bg-[#FDF4DC] text-[#8B6914]", icon: Eye },
  AT_RISK: { label: "At Risk", range: "(76–90%)", hex: "#D97706", dot: "bg-[#D97706]", badge: "bg-[#FEF3C7] text-[#92400E]", icon: Flame },
  UNDERWATER: { label: "Underwater", range: "(> 90%)", hex: "#DC2626", dot: "bg-[#DC2626]", badge: "bg-[#FEE2E2] text-[#991B1B]", icon: Waves },
} as const;

const TIERS = ["SAFE", "WATCH", "AT_RISK", "UNDERWATER"] as const;

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */
function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}
function fmtExact(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n);
}
function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/* ------------------------------------------------------------------ */
/*  Donut Chart (pure SVG — no recharts needed)                         */
/* ------------------------------------------------------------------ */
function DonutChart({ tierCounts, total }: { tierCounts: TierCounts; total: number }) {
  const data = TIERS.map(t => ({ tier: t, count: tierCounts[t], hex: TIER_CFG[t].hex })).filter(d => d.count > 0);

  if (data.length === 0 || total === 0) {
    return (
      <div className="relative w-[160px] h-[160px] mx-auto">
        <svg viewBox="0 0 36 36" className="w-full h-full">
          <circle cx="18" cy="18" r="14" fill="none" stroke="#ECEAE4" strokeWidth="3.5" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[22px] font-semibold text-[#2C2C2C]">{total}</span>
          <span className="text-[9px] font-bold text-[#6F6F6F] uppercase tracking-wider">Total</span>
        </div>
      </div>
    );
  }

  let offset = 25; // start at top
  const segments = data.map(d => {
    const pct = (d.count / total) * 100;
    const seg = { ...d, pct, offset };
    offset += pct;
    return seg;
  });

  return (
    <div className="relative w-[160px] h-[160px] mx-auto">
      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
        <circle cx="18" cy="18" r="14" fill="none" stroke="#ECEAE4" strokeWidth="3.5" />
        {segments.map((s) => (
          <circle
            key={s.tier}
            cx="18" cy="18" r="14"
            fill="none"
            stroke={s.hex}
            strokeWidth="3.5"
            strokeDasharray={`${s.pct} ${100 - s.pct}`}
            strokeDashoffset={`${100 - s.offset + 25}`}
            strokeLinecap="round"
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[22px] font-semibold text-[#2C2C2C]">{total}</span>
        <span className="text-[9px] font-bold text-[#6F6F6F] uppercase tracking-wider">Total</span>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Page                                                                */
/* ================================================================== */
export default function LtvPage() {
  const router = useRouter();
  const [data, setData] = useState<LtvData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [sortDesc, setSortDesc] = useState(true);
  const [filterTier, setFilterTier] = useState<FilterTab>("ALL");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/ltv?t=${Date.now()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load");
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(() => load(true), 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [load]);

  const filtered = useMemo(() => {
    if (!data) return [];
    let rows = data.pledges.filter(p =>
      p.customerName.toLowerCase().includes(search.toLowerCase())
    );
    if (filterTier !== "ALL") {
      rows = rows.filter(p => p.riskTier === filterTier);
    }
    rows.sort((a, b) => {
      if (a.ltv === null && b.ltv === null) return 0;
      if (a.ltv === null) return 1;
      if (b.ltv === null) return -1;
      return sortDesc ? b.ltv - a.ltv : a.ltv - b.ltv;
    });
    return rows;
  }, [data, search, sortDesc, filterTier]);

  // ── Derived ──
  const s = data?.summary;
  const interestAccrued = s ? s.totalOwed - s.totalLent : 0;
  const buffer = s ? s.totalMarketValue - s.totalOwed : 0;

  // ── Safety bar widths ──
  const safetyBar = useMemo(() => {
    if (!s || s.totalPledges === 0) return TIERS.map(() => 0);
    return TIERS.map(t => (s.tierCounts[t] / s.totalPledges) * 100);
  }, [s]);

  // ── Risk label for avg LTV ──
  const avgRiskLabel = useMemo(() => {
    if (!s || s.avgLtv === null) return null;
    if (s.avgLtv <= 65) return "Highly Secure";
    if (s.avgLtv <= 75) return "Watch";
    if (s.avgLtv <= 90) return "At Risk";
    return "Underwater";
  }, [s]);

  // ── Loading state ──
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-[#555B3F]" size={28} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-[1200px] mx-auto p-6">
        <div className="rounded-[16px] border border-red-200 bg-red-50 px-5 py-4 text-[13px] text-red-700">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto pb-16 mt-4 font-sans text-[#2C2C2C]">

      {/* ── PAGE HEADER ── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[28px] font-medium tracking-tight text-[#2C2C2C] mb-2">
            Loan to Value
          </h1>
          <div className="inline-flex items-center gap-2 bg-[#F0EFDF] px-3 py-1.5 rounded-full text-[11px] font-semibold text-[#555B3F] border border-[#EAE8DD]">
            Σ LTV = Amount Owed ÷ Market Value × 100
          </div>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-[11px] font-semibold text-[#555B3F] bg-[#F0EFDF] border border-[#EAE8DD] rounded-full px-3 py-1.5 transition-colors hover:bg-[#EAE8DD] disabled:opacity-50"
        >
          <RefreshCw size={11} className={refreshing ? "animate-spin" : ""} />
          {refreshing ? "Refreshing…" : "● Refresh"}
        </button>
      </div>

      {/* ── NO PRICE WARNING ── */}
      {data && !data.hasPrices && (
        <div className="flex items-start gap-3 rounded-[16px] border border-[#E8D4B0] bg-[#FFF8ED] px-5 py-4 text-[13px] text-[#8B6914] mb-6">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">No market prices available</p>
            <p className="text-[12px] mt-0.5 opacity-80">LTV cannot be calculated until market data is fetched.</p>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ROW 1 — KPI CARDS                                             */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-[1.6fr_1fr_1fr] gap-4 mb-6">

        {/* Card 1 — Live Commodity Prices */}
        <div className="bg-white border border-[#ECEAE4] rounded-[16px] p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-[13px] font-semibold text-[#2C2C2C]">Live Commodity Prices</h3>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C5C7B8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22,7 13.5,15.5 8.5,10.5 2,17" /><polyline points="16,7 22,7 22,13" /></svg>
          </div>
          <div className="flex gap-8">
            <div>
              <p className="text-[24px] font-semibold text-[#2C2C2C] tabular-nums">
                {data?.goldPricePerGram ? fmtExact(data.goldPricePerGram) : "—"}<span className="text-[13px] font-normal text-[#6F6F6F] ml-1">/g</span>
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <div className="w-2 h-2 rounded-full bg-[#C9A14B]" />
                <span className="text-[11px] font-semibold text-[#6F6F6F]">Gold</span>
              </div>
            </div>
            <div>
              <p className="text-[24px] font-semibold text-[#2C2C2C] tabular-nums">
                {data?.silverPricePerGram ? fmtExact(data.silverPricePerGram) : "—"}<span className="text-[13px] font-normal text-[#6F6F6F] ml-1">/g</span>
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <div className="w-2 h-2 rounded-full bg-[#9E9E9E]" />
                <span className="text-[11px] font-semibold text-[#6F6F6F]">Silver</span>
              </div>
            </div>
          </div>
          {data?.priceUpdatedAt && (
            <p className="text-[11px] text-[#9E9E9E] mt-4 flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
              Updated {timeAgo(data.priceUpdatedAt)}
            </p>
          )}
        </div>

        {/* Card 2 — Total Lent */}
        <div className="bg-white border border-[#ECEAE4] rounded-[16px] p-6 flex flex-col">
          <h3 className="text-[13px] font-semibold text-[#6F6F6F] mb-3">Total Lent</h3>
          <p className="text-[28px] font-semibold text-[#2C2C2C] tabular-nums">{s ? fmt(s.totalLent) : "—"}</p>
          <div className="mt-auto pt-4 flex items-center justify-between border-t border-[#F4F3EE]">
            <span className="text-[12px] text-[#6F6F6F]">Active Pledges</span>
            <span className="inline-flex items-center justify-center w-7 h-7 bg-[#F0EFDF] rounded-[8px] text-[13px] font-semibold text-[#555B3F]">
              {s?.totalPledges ?? 0}
            </span>
          </div>
        </div>

        {/* Card 3 — Average LTV */}
        <div className="bg-[#F0EFDF] border border-[#E5E3D0] rounded-[16px] p-6 flex flex-col">
          <h3 className="text-[13px] font-semibold text-[#555B3F] mb-3">Average LTV</h3>
          <p className="text-[28px] font-semibold text-[#2C2C2C] tabular-nums">
            {s?.avgLtv !== null && s?.avgLtv !== undefined ? `${s.avgLtv}%` : "—"}
          </p>
          {avgRiskLabel && (
            <div className="mt-2 inline-flex items-center gap-1.5 w-max">
              <div className="w-2 h-2 rounded-full bg-[#555B3F]" />
              <span className="text-[11px] font-semibold text-[#555B3F]">{avgRiskLabel}</span>
            </div>
          )}
          <p className="text-[11px] text-[#6F6F6F] mt-auto pt-2">Across all pledges</p>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ROW 2 — VALUATION + RISK DISTRIBUTION                         */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-4 mb-6">

        {/* Valuation Overview */}
        <div className="bg-white border border-[#ECEAE4] rounded-[16px] p-6">
          <h3 className="text-[15px] font-semibold text-[#2C2C2C] mb-5">Valuation Overview</h3>

          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <p className="text-[12px] text-[#6F6F6F] mb-1">Amount Owed Today</p>
              <p className="text-[24px] font-semibold text-[#2C2C2C] tabular-nums">{s ? fmt(s.totalOwed) : "—"}</p>
              {s && interestAccrued > 0 && (
                <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#FEE2E2] text-[#991B1B]">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /></svg>
                  +{fmt(interestAccrued)} interest accrued
                </span>
              )}
            </div>
            <div className="border-l border-[#ECEAE4] pl-6">
              <p className="text-[12px] text-[#6F6F6F] mb-1">Total Market Value</p>
              <p className="text-[24px] font-semibold text-[#2C2C2C] tabular-nums">{s ? fmt(s.totalMarketValue) : "—"}</p>
              {s && (
                <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#E8EBD8] text-[#555B3F]">
                  ○ Buffer: {fmt(Math.abs(buffer))}
                </span>
              )}
            </div>
          </div>

          {/* LTV Safety Bar */}
          <div className="flex rounded-full overflow-hidden h-3 mb-3">
            {TIERS.map((t, i) => {
              const w = safetyBar[i];
              if (w === 0) return null;
              return (
                <div
                  key={t}
                  className={`${TIER_CFG[t].dot} transition-all`}
                  style={{ width: `${w}%` }}
                />
              );
            })}
            {(!s || s.totalPledges === 0) && <div className="bg-[#ECEAE4] w-full" />}
          </div>
          <div className="flex flex-wrap gap-5">
            {TIERS.map(t => (
              <div key={t} className="flex items-center gap-1.5 text-[11px] text-[#6F6F6F]">
                <div className={`w-2 h-2 rounded-full ${TIER_CFG[t].dot}`} />
                <span>{TIER_CFG[t].label}</span>
                <span className="font-semibold text-[#2C2C2C]">{s?.tierCounts[t] ?? 0}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Risk Distribution */}
        <div className="bg-white border border-[#ECEAE4] rounded-[16px] p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[15px] font-semibold text-[#2C2C2C]">Risk Distribution</h3>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9E9E9E" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
          </div>

          <DonutChart tierCounts={s?.tierCounts ?? { SAFE: 0, WATCH: 0, AT_RISK: 0, UNDERWATER: 0, NO_PRICE: 0 }} total={s?.totalPledges ?? 0} />

          <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-5">
            {TIERS.map(t => (
              <div key={t} className="flex items-center justify-between text-[12px]">
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${TIER_CFG[t].dot}`} />
                  <span className={t === "WATCH" || t === "AT_RISK" || t === "UNDERWATER" ? `text-[${TIER_CFG[t].hex}] font-semibold` : "text-[#2C2C2C]"}>
                    {TIER_CFG[t].label}
                  </span>
                </div>
                <span className="font-semibold tabular-nums">{s?.tierCounts[t] ?? 0}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ROW 3 — PORTFOLIO DETAILS TABLE                               */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <div className="bg-white border border-[#ECEAE4] rounded-[16px] overflow-hidden mb-6">

        {/* Table Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#F4F3EE]">
          <h3 className="text-[15px] font-semibold text-[#2C2C2C]">Portfolio Details</h3>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9E9E9E] pointer-events-none" />
              <input
                type="text"
                placeholder="Search by name"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 pr-8 py-2 text-[12px] bg-[#F5F4EF] border border-[#ECEAE4] rounded-[10px] w-[200px] focus:outline-none focus:ring-2 focus:ring-[#C5C7B8] text-[#2C2C2C] placeholder-[#9E9E9E]"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9E9E9E] hover:text-[#2C2C2C]">
                  <X size={12} />
                </button>
              )}
            </div>
            <div className="relative">
              <button 
                onClick={() => setDropdownOpen(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-2 text-[12px] font-semibold transition-colors rounded-[8px] ${filterTier !== "ALL" || dropdownOpen ? "bg-[#F0EFDF] text-[#555B3F]" : "text-[#6F6F6F] hover:text-[#2C2C2C]"}`}
              >
                <Filter size={13} /> {filterTier === "ALL" ? "Filter" : filterTier === null ? "No Price" : TIER_CFG[filterTier]?.label}
              </button>
              
              {dropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-44 bg-white border border-[#ECEAE4] rounded-[12px] shadow-lg z-50 p-1.5">
                    <button 
                      onClick={() => { setFilterTier("ALL"); setDropdownOpen(false); }}
                      className={`w-full text-left px-3 py-2 rounded-[8px] text-[12px] font-medium transition-colors ${filterTier === "ALL" ? "bg-[#F0EFDF] text-[#555B3F]" : "text-[#6F6F6F] hover:bg-[#F5F4EF]"}`}
                    >
                      All Records
                    </button>
                    <div className="h-px bg-[#F4F3EE] my-1 mx-2" />
                    {TIERS.map(t => (
                      <button 
                        key={t}
                        onClick={() => { setFilterTier(t); setDropdownOpen(false); }}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-[8px] text-[12px] font-medium transition-colors ${filterTier === t ? "bg-[#F0EFDF] text-[#555B3F]" : "text-[#6F6F6F] hover:bg-[#F5F4EF]"}`}
                      >
                        <div className={`w-2 h-2 rounded-full ${TIER_CFG[t].dot}`} />
                        {TIER_CFG[t].label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-[#3D4230] text-white text-[11px] font-semibold tracking-wider uppercase">
                <th className="text-left px-5 py-3">Customer</th>
                <th className="text-right px-5 py-3">Gold wt.</th>
                <th className="text-right px-5 py-3">Silver wt.</th>
                <th className="text-right px-5 py-3">Principal</th>
                <th className="text-right px-5 py-3">
                  <button
                    onClick={() => setSortDesc(v => !v)}
                    className="inline-flex items-center gap-1 hover:text-[#E8EBD8] transition-colors"
                  >
                    Owed Today <ArrowUpDown size={10} />
                  </button>
                </th>
                <th className="text-right px-5 py-3">Market Value</th>
                <th className="text-right px-5 py-3">LTV</th>
                <th className="text-center px-5 py-3">Risk Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-[13px] text-[#9E9E9E]">
                    {data && data.pledges.length === 0 ? "No active pledges yet." : "No pledges match your search."}
                  </td>
                </tr>
              ) : (
                filtered.map(row => (
                  <tr
                    key={row.pledgeId}
                    onClick={() => router.push(`/customers/${row.customerId}/pledges/${row.pledgeId}`)}
                    className="border-b border-[#F4F3EE] hover:bg-[#FAFAF8] cursor-pointer transition-colors"
                  >
                    {/* Customer */}
                    <td className="px-5 py-4">
                      <p className="font-semibold text-[#2C2C2C]">{row.customerName}</p>
                      <p className="text-[11px] text-[#9E9E9E] mt-0.5">
                        {new Date(row.pledgeDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </p>
                    </td>

                    {/* Gold */}
                    <td className="px-5 py-4 text-right">
                      {row.netWeightOfGold > 0 ? (
                        <>
                          <p className="font-semibold text-[#2C2C2C] tabular-nums">{row.netWeightOfGold.toFixed(3)}g</p>
                          {row.goldPpg && <p className="text-[10px] text-[#9E9E9E] tabular-nums">@ {fmtExact(row.goldPpg)}/g</p>}
                        </>
                      ) : <span className="text-[#C5C7B8]">—</span>}
                    </td>

                    {/* Silver */}
                    <td className="px-5 py-4 text-right">
                      {row.netWeightOfSilver > 0 ? (
                        <>
                          <p className="font-semibold text-[#2C2C2C] tabular-nums">{row.netWeightOfSilver.toFixed(3)}g</p>
                          {row.silverPpg && <p className="text-[10px] text-[#9E9E9E] tabular-nums">@ {fmtExact(row.silverPpg)}/g</p>}
                        </>
                      ) : <span className="text-[#C5C7B8]">—</span>}
                    </td>

                    {/* Principal */}
                    <td className="px-5 py-4 text-right font-semibold text-[#2C2C2C] tabular-nums">{fmt(row.principal)}</td>

                    {/* Owed Today */}
                    <td className="px-5 py-4 text-right">
                      <p className="font-semibold text-[#2C2C2C] tabular-nums">{fmt(row.amountOwed)}</p>
                      {row.accruedInterest > 0 && (
                        <p className="text-[10px] text-[#D97706] font-semibold tabular-nums">+{fmt(row.accruedInterest)}</p>
                      )}
                    </td>

                    {/* Market Value */}
                    <td className="px-5 py-4 text-right">
                      {row.marketValue !== null ? (
                        <p className="font-semibold text-[#2C2C2C] tabular-nums">{fmt(row.marketValue)}</p>
                      ) : <span className="text-[#9E9E9E] text-[11px]">No price</span>}
                    </td>

                    {/* LTV */}
                    <td className="px-5 py-4 text-right font-semibold tabular-nums">
                      {row.ltv !== null ? `${row.ltv.toFixed(1)}%` : "—"}
                    </td>

                    {/* Risk Status */}
                    <td className="px-5 py-4 text-center">
                      {row.riskTier ? (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold ${TIER_CFG[row.riskTier].badge}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${TIER_CFG[row.riskTier].dot}`} />
                          {TIER_CFG[row.riskTier].label}
                        </span>
                      ) : <span className="text-[#9E9E9E] text-[11px]">—</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* End of records */}
        {filtered.length > 0 && (
          <div className="text-center py-6 text-[12px] text-[#9E9E9E] italic">
            End of active records.
          </div>
        )}
      </div>

      {/* ── LTV LEGEND ── */}
      <div className="flex items-center justify-center">
        <div className="inline-flex items-center gap-5 bg-white border border-[#ECEAE4] rounded-full px-6 py-3">
          <span className="text-[10px] font-bold text-[#6F6F6F] uppercase tracking-wider mr-1">LTV Legend:</span>
          {TIERS.map(t => (
            <div key={t} className="flex items-center gap-1.5 text-[11px]">
              <div className={`w-2 h-2 rounded-full ${TIER_CFG[t].dot}`} />
              <span className="font-semibold text-[#2C2C2C]">{TIER_CFG[t].label}</span>
              <span className="text-[#9E9E9E]">{TIER_CFG[t].range}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}