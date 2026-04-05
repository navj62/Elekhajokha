"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Loader2,
  RefreshCw,
  AlertTriangle,
  ShieldCheck,
  Eye,
  Flame,
  Waves,
  ArrowUpDown,
  ChevronRight,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
type RiskTier = "SAFE" | "WATCH" | "AT_RISK" | "UNDERWATER" | null;
type FilterTab = "ALL" | RiskTier;

interface PledgeRow {
  pledgeId:        string;
  customerId:      string;
  customerName:    string;
  itemName:        string;
  itemType:        "GOLD" | "SILVER";
  pledgeDate:      string;
  netWeightOfMetal: number;
  principal:       number;
  accruedInterest: number;
  amountOwed:      number;
  durationMonths:  number;
  inrPerGram:      number | null;
  marketValue:     number | null;
  ltv:             number | null;
  riskTier:        RiskTier;
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
    label:    "Safe",
    range:    "0–65%",
    icon:     ShieldCheck,
    color:    "text-emerald-600",
    bg:       "bg-emerald-50",
    border:   "border-emerald-200",
    badge:    "bg-emerald-100 text-emerald-700",
    dot:      "bg-emerald-500",
  },
  WATCH: {
    label:    "Watch",
    range:    "66–75%",
    icon:     Eye,
    color:    "text-amber-600",
    bg:       "bg-amber-50",
    border:   "border-amber-200",
    badge:    "bg-amber-100 text-amber-700",
    dot:      "bg-amber-400",
  },
  AT_RISK: {
    label:    "At Risk",
    range:    "76–90%",
    icon:     Flame,
    color:    "text-orange-600",
    bg:       "bg-orange-50",
    border:   "border-orange-200",
    badge:    "bg-orange-100 text-orange-700",
    dot:      "bg-orange-500",
  },
  UNDERWATER: {
    label:    "Underwater",
    range:    "> 90%",
    icon:     Waves,
    color:    "text-red-600",
    bg:       "bg-red-50",
    border:   "border-red-200",
    badge:    "bg-red-100 text-red-700",
    dot:      "bg-red-500",
  },
} as const;

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */
function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style:                "currency",
    currency:             "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtExact(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style:                "currency",
    currency:             "INR",
    maximumFractionDigits: 2,
  }).format(n);
}

function timeAgo(dateStr: string): string {
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  if (mins  < 1)  return "just now";
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function LtvBar({ ltv }: { ltv: number }) {
  const capped = Math.min(ltv, 120); // cap bar at 120% visual max
  const pct    = (capped / 120) * 100;
  const tier   = ltv <= 65 ? "SAFE" : ltv <= 75 ? "WATCH" : ltv <= 90 ? "AT_RISK" : "UNDERWATER";
  const barColor = {
    SAFE:       "bg-emerald-400",
    WATCH:      "bg-amber-400",
    AT_RISK:    "bg-orange-500",
    UNDERWATER: "bg-red-500",
  }[tier];

  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-mono font-medium tabular-nums">
        {ltv.toFixed(1)}%
      </span>
    </div>
  );
}

function RiskBadge({ tier }: { tier: RiskTier }) {
  if (!tier) return <span className="text-xs text-gray-400">—</span>;
  const cfg = TIER_CONFIG[tier];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.badge}`}>
      <Icon size={10} />
      {cfg.label}
    </span>
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
  const exposure = summary.totalOwed - summary.totalMarketValue;
  const isExposed = exposure > 0;

  return (
    <div className="space-y-4">
      {/* Market prices strip */}
      <div className="flex items-center gap-4 text-xs text-gray-500 bg-white border rounded-lg px-4 py-2.5">
        <span className="font-medium text-gray-700">Live Prices</span>
        {goldPpg && (
          <span>🥇 Gold <span className="font-semibold text-gray-900">{fmtExact(goldPpg)}/g</span></span>
        )}
        {silverPpg && (
          <span>🥈 Silver <span className="font-semibold text-gray-900">{fmtExact(silverPpg)}/g</span></span>
        )}
        {priceUpdatedAt && (
          <span className="ml-auto text-gray-400">Updated {timeAgo(priceUpdatedAt)}</span>
        )}
      </div>

      {/* Main summary grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
            summary.avgLtv === null ? "text-gray-400" :
            summary.avgLtv <= 65   ? "text-emerald-600" :
            summary.avgLtv <= 75   ? "text-amber-600"   :
            summary.avgLtv <= 90   ? "text-orange-600"  :
            "text-red-600"
          }`}>
            {summary.avgLtv !== null ? `${summary.avgLtv}%` : "—"}
          </p>
          <p className="text-xs text-gray-400">across all pledges</p>
        </div>
      </div>

      {/* Tier breakdown bar */}
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
                  className={TIER_CONFIG[tier].dot + " transition-all"}
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
  onRowClick,
}: {
  pledges:    PledgeRow[];
  onRowClick: (row: PledgeRow) => void;
}) {
  const [sortDesc, setSortDesc] = useState(true); // highest LTV first by default

  const sorted = [...pledges].sort((a, b) => {
    if (a.ltv === null && b.ltv === null) return 0;
    if (a.ltv === null) return 1;
    if (b.ltv === null) return -1;
    return sortDesc ? b.ltv - a.ltv : a.ltv - b.ltv;
  });

  if (pledges.length === 0) {
    return (
      <div className="bg-white border rounded-xl px-6 py-12 text-center text-sm text-gray-400">
        No pledges in this category.
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
            <th className="text-left px-4 py-3 font-medium">Customer</th>
            <th className="text-left px-4 py-3 font-medium">Item</th>
            <th className="text-right px-4 py-3 font-medium">Principal</th>
            <th className="text-right px-4 py-3 font-medium">Owed Today</th>
            <th className="text-right px-4 py-3 font-medium">Market Value</th>
            <th className="text-right px-4 py-3 font-medium">
              <button
                onClick={() => setSortDesc((v) => !v)}
                className="inline-flex items-center gap-1 hover:text-gray-800 transition-colors"
              >
                LTV
                <ArrowUpDown size={11} />
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

              <td className="px-4 py-3">
                <p className="text-gray-700">{row.itemName}</p>
                <p className="text-xs text-gray-400">
                  {row.itemType === "GOLD" ? "🥇" : "🥈"} {row.netWeightOfMetal.toFixed(3)}g
                </p>
              </td>

              <td className="px-4 py-3 text-right">
                <p className="font-medium text-gray-900 tabular-nums">
                  {fmt(row.principal)}
                </p>
              </td>

              <td className="px-4 py-3 text-right">
                <p className="font-medium text-gray-900 tabular-nums">
                  {fmt(row.amountOwed)}
                </p>
                <p className="text-xs text-orange-500 tabular-nums">
                  +{fmt(row.accruedInterest)}
                </p>
              </td>

              <td className="px-4 py-3 text-right">
                {row.marketValue !== null ? (
                  <p className="font-medium text-gray-900 tabular-nums">
                    {fmt(row.marketValue)}
                  </p>
                ) : (
                  <span className="text-gray-400 text-xs">No price</span>
                )}
                {row.inrPerGram && (
                  <p className="text-xs text-gray-400 tabular-nums">
                    @{fmtExact(row.inrPerGram)}/g
                  </p>
                )}
              </td>

              <td className="px-4 py-3 text-right">
                {row.ltv !== null ? (
                  <LtvBar ltv={row.ltv} />
                ) : (
                  <span className="text-gray-400 text-xs">—</span>
                )}
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

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const res  = await fetch(`/api/ltv?t=${Date.now()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load");
      setData(json);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = data?.pledges.filter((p) =>
    filter === "ALL" ? true : p.riskTier === filter
  ) ?? [];

  const TABS: { key: FilterTab; label: string; count?: number }[] = [
    { key: "ALL",        label: "All",        count: data?.summary.totalPledges },
    { key: "SAFE",       label: "🟢 Safe",      count: data?.summary.tierCounts.SAFE },
    { key: "WATCH",      label: "🟡 Watch",     count: data?.summary.tierCounts.WATCH },
    { key: "AT_RISK",    label: "🔴 At Risk",   count: data?.summary.tierCounts.AT_RISK },
    { key: "UNDERWATER", label: "🚨 Underwater",count: data?.summary.tierCounts.UNDERWATER },
  ];

  function handleRowClick(row: PledgeRow) {
    router.push(`/customers/${row.customerId}/pledges/${row.pledgeId}`);
  }

  /* ---- Loading --------------------------------------------------- */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-gray-300" size={32} />
      </div>
    );
  }

  /* ---- Error ----------------------------------------------------- */
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

      {/* ---- Header ---------------------------------------------- */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/dashboard"
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            ← Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">
            Portfolio Risk
          </h1>
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

      {/* ---- No price warning ------------------------------------ */}
      {data && !data.hasPrices && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">No market prices available</p>
            <p className="text-xs mt-0.5 text-amber-600">
              LTV cannot be calculated until the cron job runs and fetches gold/silver prices.
              Market values will show as — until then.
            </p>
          </div>
        </div>
      )}

      {/* ---- Summary --------------------------------------------- */}
      {data && (
        <SummaryCards
          summary={data.summary}
          goldPpg={data.goldPricePerGram}
          silverPpg={data.silverPricePerGram}
          priceUpdatedAt={data.priceUpdatedAt}
        />
      )}

      {/* ---- Filter tabs ----------------------------------------- */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
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

      {/* ---- Table ---------------------------------------------- */}
      {data && (
        <PledgeTable
          pledges={filtered}
          onRowClick={handleRowClick}
        />
      )}

      {/* ---- LTV reference table --------------------------------- */}
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