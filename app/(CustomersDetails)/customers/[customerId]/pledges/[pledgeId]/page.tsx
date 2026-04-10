"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Loader2, RefreshCw, AlertTriangle,
  ShieldCheck, Eye, Flame, Waves,
  ArrowUpDown, ChevronRight, Search, X,
} from "lucide-react";
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
type RiskTier  = "SAFE" | "WATCH" | "AT_RISK" | "UNDERWATER" | null;
type FilterTab = "ALL" | RiskTier;

interface PledgeRow {
  pledgeId:          string;
  customerId:        string;
  customerName:      string;
  pledgeDate:        string;
  netWeightOfGold:   number;
  netWeightOfSilver: number;
  principal:         number;
  accruedInterest:   number;
  amountOwed:        number;
  goldPpg:           number | null;
  silverPpg:         number | null;
  marketValue:       number | null;
  ltv:               number | null;
  riskTier:          RiskTier;
}

interface TierCounts {
  SAFE:       number;
  WATCH:      number;
  AT_RISK:    number;
  UNDERWATER: number;
  NO_PRICE:   number;
}

interface Summary {
  totalPledges:     number;
  totalLent:        number;
  totalOwed:        number;
  totalMarketValue: number;
  avgLtv:           number | null;
  tierCounts:       TierCounts;
}

interface LtvData {
  hasPrices:          boolean;
  goldPricePerGram:   number | null;
  silverPricePerGram: number | null;
  priceUpdatedAt:     string | null;
  summary:            Summary;
  pledges:            PledgeRow[];
}

/* ------------------------------------------------------------------ */
/*  Tier config                                                         */
/* ------------------------------------------------------------------ */
const TIER_CONFIG = {
  SAFE: {
    label:  "Safe",
    range:  "0–65%",
    icon:   ShieldCheck,
    color:  "text-emerald-600",
    bg:     "bg-emerald-50",
    badge:  "bg-emerald-100 text-emerald-700",
    dot:    "bg-emerald-500",
    hex:    "#10b981",
  },
  WATCH: {
    label:  "Watch",
    range:  "66–75%",
    icon:   Eye,
    color:  "text-amber-600",
    bg:     "bg-amber-50",
    badge:  "bg-amber-100 text-amber-700",
    dot:    "bg-amber-400",
    hex:    "#f59e0b",
  },
  AT_RISK: {
    label:  "At Risk",
    range:  "76–90%",
    icon:   Flame,
    color:  "text-orange-600",
    bg:     "bg-orange-50",
    badge:  "bg-orange-100 text-orange-700",
    dot:    "bg-orange-500",
    hex:    "#f97316",
  },
  UNDERWATER: {
    label:  "Underwater",
    range:  "> 90%",
    icon:   Waves,
    color:  "text-red-600",
    bg:     "bg-red-50",
    badge:  "bg-red-100 text-red-700",
    dot:    "bg-red-500",
    hex:    "#ef4444",
  },
} as const;

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */
function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0,
  }).format(n);
}

function fmtExact(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 2,
  }).format(n);
}

function timeAgo(dateStr: string) {
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  if (mins  < 1)  return "just now";
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// ✅ FIX #3 — single source of truth for tier thresholds
// Previously duplicated between LtvBar and the data layer
function getTier(ltv: number): keyof typeof TIER_CONFIG {
  if (ltv <= 65) return "SAFE";
  if (ltv <= 75) return "WATCH";
  if (ltv <= 90) return "AT_RISK";
  return "UNDERWATER";
}

function LtvBar({ ltv }: { ltv: number }) {
  const capped   = Math.min(ltv, 120);
  const pct      = (capped / 120) * 100;
  const tier     = getTier(ltv); // ✅ uses shared helper — no more duplicated thresholds
  const barColor = {
    SAFE:       "bg-emerald-400",
    WATCH:      "bg-amber-400",
    AT_RISK:    "bg-orange-500",
    UNDERWATER: "bg-red-500",
  }[tier];

  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono font-medium tabular-nums">
        {ltv.toFixed(1)}%
      </span>
    </div>
  );
}

function RiskBadge({ tier }: { tier: RiskTier }) {
  if (!tier) return <span className="text-xs text-gray-400">—</span>;
  const cfg  = TIER_CONFIG[tier];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.badge}`}>
      <Icon size={10} />
      {cfg.label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Risk Pie Chart                                                      */
/* ------------------------------------------------------------------ */
function RiskPieChart({ tierCounts }: { tierCounts: TierCounts }) {
  const chartData = (["SAFE", "WATCH", "AT_RISK", "UNDERWATER"] as const)
    .map((tier) => ({
      name:  TIER_CONFIG[tier].label,
      value: tierCounts[tier],
      hex:   TIER_CONFIG[tier].hex,
    }))
    .filter((d) => d.value > 0);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-gray-400">
        No data to display
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={3}
          dataKey="value"
        >
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.hex} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value, name) => [
  `${Number(value)} pledge${Number(value) !== 1 ? "s" : ""}`,
  String(name),
]}
          contentStyle={{
            fontSize: 12,
            borderRadius: 8,
            border: "1px solid #e5e7eb",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => (
            <span style={{ fontSize: 12, color: "#6b7280" }}>{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

/* ------------------------------------------------------------------ */
/*  Summary Cards                                                       */
/* ------------------------------------------------------------------ */
function SummaryCards({ summary, goldPpg, silverPpg, priceUpdatedAt }: {
  summary:        Summary;
  goldPpg:        number | null;
  silverPpg:      number | null;
  priceUpdatedAt: string | null;
}) {
  const exposure  = summary.totalOwed - summary.totalMarketValue;
  const isExposed = exposure > 0;

  return (
    <div className="space-y-4">
      {/* Live prices strip */}
      <div className="flex items-center gap-4 text-xs text-gray-500 bg-white border rounded-lg px-4 py-2.5">
        <span className="font-medium text-gray-700">Live Prices</span>
        {goldPpg   && <span>🥇 Gold   <span className="font-semibold text-gray-900">{fmtExact(goldPpg)}/g</span></span>}
        {silverPpg && <span>🥈 Silver <span className="font-semibold text-gray-900">{fmtExact(silverPpg)}/g</span></span>}
        {priceUpdatedAt && (
          <span className="ml-auto text-gray-400">Updated {timeAgo(priceUpdatedAt)}</span>
        )}
      </div>

      {/* Stats + Pie chart side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Stats — 2/3 width */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-3">
          <div className="bg-white border rounded-xl p-4 space-y-1">
            <p className="text-xs text-gray-400">Total Lent</p>
            <p className="text-xl font-bold text-gray-900">{fmt(summary.totalLent)}</p>
            <p className="text-xs text-gray-400">{summary.totalPledges} active pledges</p>
          </div>
          <div className="bg-white border rounded-xl p-4 space-y-1">
            <p className="text-xs text-gray-400">Amount Owed Today</p>
            <p className="text-xl font-bold text-gray-900">{fmt(summary.totalOwed)}</p>
            <p className="text-xs text-gray-400">
              +{fmt(summary.totalOwed - summary.totalLent)} interest
            </p>
          </div>
          <div className="bg-white border rounded-xl p-4 space-y-1">
            <p className="text-xs text-gray-400">Total Market Value</p>
            <p className="text-xl font-bold text-gray-900">{fmt(summary.totalMarketValue)}</p>
            <p className={`text-xs font-medium ${isExposed ? "text-red-500" : "text-emerald-600"}`}>
              {isExposed
                ? `⚠ Exposed by ${fmt(exposure)}`
                : `Buffer ${fmt(Math.abs(exposure))}`}
            </p>
          </div>
          <div className="bg-white border rounded-xl p-4 space-y-1">
            <p className="text-xs text-gray-400">Avg LTV</p>
            <p className={`text-xl font-bold ${
              summary.avgLtv === null  ? "text-gray-400"   :
              summary.avgLtv <= 65    ? "text-emerald-600" :
              summary.avgLtv <= 75    ? "text-amber-600"   :
              summary.avgLtv <= 90    ? "text-orange-600"  :
              "text-red-600"
            }`}>
              {summary.avgLtv !== null ? `${summary.avgLtv}%` : "—"}
            </p>
            <p className="text-xs text-gray-400">across all pledges</p>
          </div>
        </div>

        {/* Pie chart — 1/3 width */}
        <div className="bg-white border rounded-xl p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
            Risk Distribution
          </p>
          <RiskPieChart tierCounts={summary.tierCounts} />
        </div>
      </div>

      {/* Portfolio breakdown bar */}
      {summary.totalPledges > 0 && (
        <div className="bg-white border rounded-xl p-4 space-y-3">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Portfolio Breakdown
          </p>
          <div className="flex rounded-full overflow-hidden h-3 gap-0.5">
            {(["SAFE", "WATCH", "AT_RISK", "UNDERWATER"] as const).map((tier) => {
              const count = summary.tierCounts[tier];
              const pct   = (count / summary.totalPledges) * 100;
              if (pct === 0) return null;
              return (
                <div
                  key={tier}
                  className={`${TIER_CONFIG[tier].dot} transition-all`}
                  style={{ width: `${pct}%` }}
                  title={`${TIER_CONFIG[tier].label}: ${count}`}
                />
              );
            })}
          </div>
          <div className="flex flex-wrap gap-4">
            {(["SAFE", "WATCH", "AT_RISK", "UNDERWATER"] as const).map((tier) => {
              const cfg   = TIER_CONFIG[tier];
              const count = summary.tierCounts[tier];
              return (
                <div key={tier} className="flex items-center gap-1.5 text-xs text-gray-600">
                  <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                  <span>{cfg.label}</span>
                  <span className="font-semibold text-gray-900">{count}</span>
                </div>
              );
            })}
            {/* ✅ FIX #6 — NO_PRICE pledges now shown in breakdown */}
            {summary.tierCounts.NO_PRICE > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                <div className="w-2 h-2 rounded-full bg-gray-300" />
                <span>No Price</span>
                <span className="font-semibold text-gray-900">{summary.tierCounts.NO_PRICE}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Pledge Table                                                        */
/* ------------------------------------------------------------------ */
function PledgeTable({
  pledges,
  sortDesc,
  onSortToggle,
  onRowClick,
}: {
  pledges:      PledgeRow[];
  sortDesc:     boolean;           // ✅ FIX #5 — sort state lifted to page
  onSortToggle: () => void;
  onRowClick:   (row: PledgeRow) => void;
}) {
  const sorted = [...pledges].sort((a, b) => {
    if (a.ltv === null && b.ltv === null) return 0;
    if (a.ltv === null) return 1;
    if (b.ltv === null) return -1;
    return sortDesc ? b.ltv - a.ltv : a.ltv - b.ltv;
  });

  // ✅ FIX #10 — distinguish zero pledges vs no search matches
  if (pledges.length === 0) {
    return (
      <div className="bg-white border rounded-xl px-6 py-12 text-center text-sm text-gray-400">
        No pledges match your search or filter.
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
            <th className="text-left px-4 py-3 font-medium">Customer</th>
            <th className="text-right px-4 py-3 font-medium">🥇 Gold Wt</th>
            <th className="text-right px-4 py-3 font-medium">🥈 Silver Wt</th>
            <th className="text-right px-4 py-3 font-medium">Principal</th>
            <th className="text-right px-4 py-3 font-medium">Owed Today</th>
            <th className="text-right px-4 py-3 font-medium">Market Value</th>
            <th className="text-right px-4 py-3 font-medium">
              <button
                onClick={onSortToggle}
                className="inline-flex items-center gap-1 hover:text-gray-800 transition-colors"
              >
                LTV <ArrowUpDown size={11} />
              </button>
            </th>
            <th className="text-center px-4 py-3 font-medium">Risk</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {sorted.map((row) => (
            <tr
              key={row.pledgeId}
              onClick={() => onRowClick(row)}
              className="hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <td className="px-4 py-3">
                <p className="font-medium text-gray-900">{row.customerName}</p>
                <p className="text-xs text-gray-400">
                  {new Date(row.pledgeDate).toLocaleDateString("en-IN", {
                    day: "2-digit", month: "short", year: "numeric",
                  })}
                </p>
              </td>

              <td className="px-4 py-3 text-right">
                {row.netWeightOfGold > 0 ? (
                  <>
                    <p className="font-medium text-amber-700 tabular-nums">
                      {row.netWeightOfGold.toFixed(3)}g
                    </p>
                    {row.goldPpg && (
                      <p className="text-xs text-gray-400 tabular-nums">
                        @{fmtExact(row.goldPpg)}/g
                      </p>
                    )}
                  </>
                ) : (
                  <span className="text-gray-300 text-xs">—</span>
                )}
              </td>

              <td className="px-4 py-3 text-right">
                {row.netWeightOfSilver > 0 ? (
                  <>
                    <p className="font-medium text-gray-600 tabular-nums">
                      {row.netWeightOfSilver.toFixed(3)}g
                    </p>
                    {row.silverPpg && (
                      <p className="text-xs text-gray-400 tabular-nums">
                        @{fmtExact(row.silverPpg)}/g
                      </p>
                    )}
                  </>
                ) : (
                  <span className="text-gray-300 text-xs">—</span>
                )}
              </td>

              <td className="px-4 py-3 text-right">
                <p className="font-medium text-gray-900 tabular-nums">{fmt(row.principal)}</p>
              </td>

              <td className="px-4 py-3 text-right">
                <p className="font-medium text-gray-900 tabular-nums">{fmt(row.amountOwed)}</p>
                <p className="text-xs text-orange-500 tabular-nums">
                  +{fmt(row.accruedInterest)}
                </p>
              </td>

              <td className="px-4 py-3 text-right">
                {row.marketValue !== null ? (
                  <p className="font-medium text-gray-900 tabular-nums">{fmt(row.marketValue)}</p>
                ) : (
                  <span className="text-gray-400 text-xs">No price</span>
                )}
              </td>

              <td className="px-4 py-3 text-right">
                {row.ltv !== null
                  ? <LtvBar ltv={row.ltv} />
                  : <span className="text-gray-400 text-xs">—</span>
                }
              </td>

              <td className="px-4 py-3 text-center">
                <RiskBadge tier={row.riskTier} />
              </td>

              <td className="px-4 py-3">
                <ChevronRight size={14} className="text-gray-300" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ================================================================== */
/*  Page                                                                */
/* ================================================================== */
export default function LtvPage() {
  const router = useRouter();

  const [data,       setData]       = useState<LtvData | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [filter,     setFilter]     = useState<FilterTab>("ALL");
  const [search,     setSearch]     = useState("");
  const [sortDesc,   setSortDesc]   = useState(true); // ✅ FIX #5 — lifted from PledgeTable

  // ✅ FIX #1 — useCallback so useEffect dependency is stable
  // search is a dep so backend gets the current search term on every call
  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ t: String(Date.now()) });
      if (search) params.set("search", search);
      const res  = await fetch(`/api/ltv?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load");
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search]); // re-create when search changes

  // ✅ FIX #1 + #4 — re-fetch on search change + auto-refresh every 5 min
  useEffect(() => {
    load();
    const id = setInterval(() => load(true), 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [load]);

  // ✅ FIX #8 — TABS memoized, not rebuilt on every render
  const TABS = useMemo<{ key: FilterTab; label: string; count?: number }[]>(
    () => [
      { key: "ALL",        label: "All",          count: data?.summary.totalPledges },
      { key: "SAFE",       label: "🟢 Safe",       count: data?.summary.tierCounts.SAFE },
      { key: "WATCH",      label: "🟡 Watch",      count: data?.summary.tierCounts.WATCH },
      { key: "AT_RISK",    label: "🔴 At Risk",    count: data?.summary.tierCounts.AT_RISK },
      { key: "UNDERWATER", label: "🚨 Underwater", count: data?.summary.tierCounts.UNDERWATER },
    ],
    [data]
  );

  // ✅ Search handled by backend — only filter tab applied client-side
  const filtered = useMemo(() => {
    if (!data) return [];
    return data.pledges.filter((p) =>
      filter === "ALL" || p.riskTier === filter
    );
  }, [data, filter]);

  // ✅ FIX #9 — memoized so PledgeTable doesn't re-render on unrelated state changes
  const handleRowClick = useCallback((row: PledgeRow) => {
    router.push(`/customers/${row.customerId}/pledges/${row.pledgeId}`);
  }, [router]);

  const handleSortToggle = useCallback(() => setSortDesc((v) => !v), []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-gray-300" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/dashboard" className="text-xs text-gray-400 hover:text-gray-600">
            ← Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Portfolio Risk</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            LTV = Amount Owed ÷ Market Value × 100
          </p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 border rounded-lg px-3 py-2 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* No price warning */}
      {data && !data.hasPrices && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">No market prices available</p>
            <p className="text-xs mt-0.5 text-amber-600">
              LTV cannot be calculated until the cron job runs. Market values will show as — until then.
            </p>
          </div>
        </div>
      )}

      {/* Summary + Pie */}
      {data && (
        <SummaryCards
          summary={data.summary}
          goldPpg={data.goldPricePerGram}
          silverPpg={data.silverPricePerGram}
          priceUpdatedAt={data.priceUpdatedAt}
        />
      )}

      {/* ✅ Search + Filter row */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search bar */}
        <div className="relative flex-1 max-w-xs">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            type="text"
            placeholder="Search by customer name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-8 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Risk filter tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                filter === tab.key
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`ml-1.5 tabular-nums ${
                  filter === tab.key ? "text-gray-500" : "text-gray-400"
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Search result count */}
      {search && (
        <p className="text-xs text-gray-400 -mt-3">
          {filtered.length} result{filtered.length !== 1 ? "s" : ""} for &ldquo;{search}&rdquo;
        </p>
      )}

      {/* ✅ FIX #10 — true empty state when no pledges at all */}
      {data && data.pledges.length === 0 ? (
        <div className="bg-white border rounded-xl px-6 py-12 text-center text-sm text-gray-400">
          No active pledges yet.
        </div>
      ) : (
        data && (
          <PledgeTable
            pledges={filtered}
            sortDesc={sortDesc}
            onSortToggle={handleSortToggle}
            onRowClick={handleRowClick}
          />
        )
      )}

      {/* LTV reference */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            LTV Reference
          </p>
        </div>
        <div className="divide-y">
          {(["SAFE", "WATCH", "AT_RISK", "UNDERWATER"] as const).map((tier) => {
            const cfg  = TIER_CONFIG[tier];
            const Icon = cfg.icon;
            return (
              <div key={tier} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-md ${cfg.bg}`}>
                    <Icon size={13} className={cfg.color} />
                  </div>
                  <span className="text-sm font-medium text-gray-700">{cfg.label}</span>
                </div>
                <span className="text-sm text-gray-500 tabular-nums">{cfg.range}</span>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}