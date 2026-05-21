"use client";

import { SignOutButton, UserButton } from "@clerk/nextjs";
import { useEffect, useState, useCallback } from "react";
import { Loader2, TrendingUp, TrendingDown, Minus, RefreshCw, ArrowRight } from "lucide-react";
import Link from "next/link";
import { NotificationBell } from "@/components/NotificationBell";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface MetalPrice {
  id:          string;
  metal:       "GOLD" | "SILVER";
  usdPerOunce: number;
  inrPerGram:  number;
  createdAt:   string;
}

interface MarketRates {
  gold:   MetalPrice | null;
  silver: MetalPrice | null;
}

interface FinancialSnapshot {
  totalLoanAmount:   string;
  totalAmountOwed:   string;
  totalInterestOwed: string;
  totalMarketValue:  string;
  overallLtv:        string | null;
  totalGoldWeight:   string;
  totalSilverWeight: string;
  totalPledges:      number;
  activePledges:     number;
  releasedPledges:   number;
  overduePledges:    number;
  safePledges:       number;
  watchPledges:      number;
  atRiskPledges:     number;
  underwaterPledges: number;
  calculatedAt:      string;
}

interface DashboardData {
  snapshot: FinancialSnapshot | null;
  trend: {
    ltvChange:  number | null;
    direction:  "up" | "down" | "flat" | null;
  };
  mtd: {
    newPledges:      number;
    releasedPledges: number;
    loanAmount:      number;
  };
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function fmtINR(val: string | number, compact = false): string {
  const n = Number(val);
  if (compact) {
    if (n >= 10_00_000) return `₹${(n / 10_00_000).toFixed(2)}L`;
    if (n >= 1_00_000)  return `₹${(n / 1_00_000).toFixed(1)}L`;
    if (n >= 1_000)     return `₹${(n / 1_000).toFixed(1)}K`;
  }
  return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
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

function ltvColor(ltv: number): string {
  if (ltv <= 65) return "#16a34a";
  if (ltv <= 75) return "#d97706";
  if (ltv <= 90) return "#dc2626";
  return "#7c3aed";
}

function ltvLabel(ltv: number): string {
  if (ltv <= 65) return "Safe";
  if (ltv <= 75) return "Watch";
  if (ltv <= 90) return "At Risk";
  return "Underwater";
}

/* ------------------------------------------------------------------ */
/*  Skeleton                                                            */
/* ------------------------------------------------------------------ */

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`bg-[#f0eeea] rounded animate-pulse ${className}`} />
  );
}

/* ------------------------------------------------------------------ */
/*  Metal Card                                                          */
/* ------------------------------------------------------------------ */

function MetalCard({ label, emoji, price }: { label: string; emoji: string; price: MetalPrice | null }) {
  if (!price) {
    return (
      <div className="rounded-2xl border border-[#ede9e3] bg-[#faf9f7] p-5 text-sm text-[#a89f94] text-center">
        No {label} data yet
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#ede9e3] bg-white p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{emoji}</span>
          <span className="text-sm font-semibold text-[#3d3730]">{label}</span>
        </div>
        <TrendingUp size={14} className="text-[#16a34a]" />
      </div>

      <div>
        <p className="text-2xl font-bold text-[#1a1814] tracking-tight">
          ₹{Number(price.inrPerGram).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
          <span className="text-xs font-normal text-[#a89f94] ml-1">/gram</span>
        </p>
        <p className="text-xs text-[#a89f94] mt-0.5">
          ${Number(price.usdPerOunce).toFixed(2)}/oz
        </p>
      </div>

      <p className="text-xs text-[#c4bdb5]">Updated {timeAgo(price.createdAt)}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  LTV Gauge                                                           */
/* ------------------------------------------------------------------ */

function LtvGauge({ ltv }: { ltv: number }) {
  const color  = ltvColor(ltv);
  const label  = ltvLabel(ltv);
  const capped = Math.min(ltv, 120);
  const pct    = (capped / 120) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between">
        <span className="text-3xl font-bold tracking-tight text-[#1a1814]">
          {ltv.toFixed(1)}%
        </span>
        <span
          className="text-xs font-semibold px-2 py-1 rounded-full mb-1"
          style={{ backgroundColor: color + "18", color }}
        >
          {label}
        </span>
      </div>

      {/* Track */}
      <div className="h-2 rounded-full bg-[#f0eeea] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>

      {/* Scale labels */}
      <div className="flex justify-between text-[10px] text-[#c4bdb5]">
        <span>0%</span>
        <span className="text-[#16a34a]">65</span>
        <span className="text-[#d97706]">75</span>
        <span className="text-[#dc2626]">90</span>
        <span className="text-[#7c3aed]">120%+</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Risk Tier Bar                                                       */
/* ------------------------------------------------------------------ */

function RiskTierBar({
  safe, watch, atRisk, underwater, total,
}: {
  safe: number; watch: number; atRisk: number; underwater: number; total: number;
}) {
  if (total === 0) return <p className="text-sm text-[#a89f94]">No active pledges</p>;

  const tiers = [
    { label: "Safe",       count: safe,       color: "#22c55e" },
    { label: "Watch",      count: watch,      color: "#f59e0b" },
    { label: "At Risk",    count: atRisk,     color: "#ef4444" },
    { label: "Underwater", count: underwater, color: "#8b5cf6" },
  ];

  return (
    <div className="space-y-3">
      {/* Stacked bar */}
      <div className="flex h-2.5 rounded-full overflow-hidden gap-px">
        {tiers.map((t) =>
          t.count > 0 ? (
            <div
              key={t.label}
              className="h-full transition-all duration-700"
              style={{ width: `${(t.count / total) * 100}%`, backgroundColor: t.color }}
              title={`${t.label}: ${t.count}`}
            />
          ) : null
        )}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-y-1.5 gap-x-4">
        {tiers.map((t) => (
          <div key={t.label} className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
              <span className="text-xs text-[#7a7168]">{t.label}</span>
            </div>
            <span className="text-xs font-semibold text-[#3d3730]">{t.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Stat Card                                                           */
/* ------------------------------------------------------------------ */

function StatCard({
  label, value, sub, accent = false,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-5 space-y-1 ${
      accent
        ? "border-[#e8e0d4] bg-[#fdf9f5]"
        : "border-[#ede9e3] bg-white"
    }`}>
      <p className="text-xs font-medium text-[#a89f94] uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold text-[#1a1814] tracking-tight leading-none">{value}</p>
      {sub && <p className="text-xs text-[#c4bdb5]">{sub}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Dashboard Snapshot Section                                          */
/* ------------------------------------------------------------------ */

function SnapshotSection({ data }: { data: DashboardData }) {
  const { snapshot, trend, mtd } = data;

  if (!snapshot) {
    return (
      <div className="rounded-2xl border border-[#ede9e3] bg-[#faf9f7] px-6 py-10 text-center">
        <p className="text-[#7a7168] text-sm font-medium">No snapshot yet</p>
        <p className="text-xs text-[#c4bdb5] mt-1">
          Runs after the first cron evaluation
        </p>
      </div>
    );
  }

  const ltv        = Number(snapshot.overallLtv ?? 0);
  const ltvChange  = trend.ltvChange;

  return (
    <div className="space-y-4">
      {/* Row 1 — LTV + Risk breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Overall LTV */}
        <div className="rounded-2xl border border-[#ede9e3] bg-white p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-[#a89f94] uppercase tracking-wider">
              Portfolio LTV
            </p>
            {ltvChange !== null && (
              <span className={`flex items-center gap-0.5 text-xs font-semibold ${
                trend.direction === "up"   ? "text-[#dc2626]"
                : trend.direction === "down" ? "text-[#16a34a]"
                : "text-[#a89f94]"
              }`}>
                {trend.direction === "up"   && <TrendingUp size={12} />}
                {trend.direction === "down" && <TrendingDown size={12} />}
                {trend.direction === "flat" && <Minus size={12} />}
                {Math.abs(ltvChange).toFixed(1)}% vs yesterday
              </span>
            )}
          </div>
          <LtvGauge ltv={ltv} />
          <p className="text-[10px] text-[#c4bdb5]">
            Last calculated {timeAgo(snapshot.calculatedAt)}
          </p>
        </div>

        {/* Risk breakdown */}
        <div className="rounded-2xl border border-[#ede9e3] bg-white p-5 space-y-4">
          <p className="text-xs font-medium text-[#a89f94] uppercase tracking-wider">
            Risk Distribution
          </p>
          <RiskTierBar
            safe={snapshot.safePledges}
            watch={snapshot.watchPledges}
            atRisk={snapshot.atRiskPledges}
            underwater={snapshot.underwaterPledges}
            total={snapshot.activePledges}
          />
          {snapshot.underwaterPledges > 0 && (
            <div className="flex items-center gap-2 bg-[#faf5ff] border border-[#e9d5ff] rounded-xl px-3 py-2">
              <span className="text-sm">🚨</span>
              <p className="text-xs text-[#7c3aed] font-medium">
                {snapshot.underwaterPledges} pledge{snapshot.underwaterPledges !== 1 ? "s" : ""} underwater — immediate attention needed
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Row 2 — Financial stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Amount Owed"
          value={fmtINR(snapshot.totalAmountOwed, true)}
          sub={`₹${fmtINR(snapshot.totalInterestOwed, true)} interest`}
          accent
        />
        <StatCard
          label="Market Value"
          value={fmtINR(snapshot.totalMarketValue, true)}
          sub={`${Number(snapshot.totalGoldWeight).toFixed(1)}g gold`}
        />
        <StatCard
          label="Total Pledges"
          value={String(snapshot.totalPledges)}
          sub={`${snapshot.activePledges} active`}
        />
        <StatCard
          label="This Month"
          value={`+${mtd.newPledges}`}
          sub={`${mtd.releasedPledges} released`}
        />
      </div>

      {/* Row 3 — Pledge count overview */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-[#ede9e3] bg-white p-4 text-center">
          <p className="text-2xl font-bold text-[#16a34a]">{snapshot.activePledges}</p>
          <p className="text-xs text-[#a89f94] mt-0.5">Active</p>
        </div>
        <div className="rounded-2xl border border-[#ede9e3] bg-white p-4 text-center">
          <p className="text-2xl font-bold text-[#3d3730]">{snapshot.releasedPledges}</p>
          <p className="text-xs text-[#a89f94] mt-0.5">Released</p>
        </div>
        <div className={`rounded-2xl border p-4 text-center ${
          snapshot.overduePledges > 0
            ? "border-[#fee2e2] bg-[#fef2f2]"
            : "border-[#ede9e3] bg-white"
        }`}>
          <p className={`text-2xl font-bold ${
            snapshot.overduePledges > 0 ? "text-[#dc2626]" : "text-[#3d3730]"
          }`}>
            {snapshot.overduePledges}
          </p>
          <p className="text-xs text-[#a89f94] mt-0.5">Overdue</p>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Page                                                                */
/* ================================================================== */

export default function DashboardPage() {
  const [rates,       setRates]       = useState<MarketRates | null>(null);
  const [dashboard,   setDashboard]   = useState<DashboardData | null>(null);
  const [ratesLoading,    setRatesLoading]    = useState(true);
  const [snapshotLoading, setSnapshotLoading] = useState(true);
  const [ratesError,      setRatesError]      = useState("");
  const [refreshing,  setRefreshing]  = useState(false);

  // ── Fetch market rates ──
  const loadRates = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setRatesLoading(true);
    setRatesError("");
    try {
      const res  = await fetch(`/api/market-rates?t=${Date.now()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load rates");
      setRates(data);
    } catch (err: unknown) {
      setRatesError(err instanceof Error ? err.message : "Failed to load rates");
    } finally {
      setRatesLoading(false);
      setRefreshing(false);
    }
  }, []);

  // ── Fetch dashboard snapshot ──
  const loadSnapshot = useCallback(async () => {
    setSnapshotLoading(true);
    try {
      const res  = await fetch("/api/dashboard/snapshot");
      const data = await res.json();
      if (res.ok) setDashboard(data);
    } finally {
      setSnapshotLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRates();
    loadSnapshot();
  }, [loadRates, loadSnapshot]);

  /* ---------------------------------------------------------------- */
  /*  Render                                                            */
  /* ---------------------------------------------------------------- */

  return (
    <div className="min-h-screen bg-[#f8f7f4]" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── Top bar ── */}
      <div className="sticky top-0 z-40 border-b border-[#ede9e3] bg-white/90 backdrop-blur-sm px-6 py-3.5 flex items-center justify-between">
        <h1 className="text-base font-bold text-[#1a1814] tracking-tight">
          Dashboard
        </h1>
        <div className="flex items-center gap-3">
          <NotificationBell />
          <div className="w-px h-5 bg-[#ede9e3]" />
          <UserButton />
          <SignOutButton>
            <button className="text-sm text-[#a89f94] hover:text-[#3d3730] transition-colors">
              Sign out
            </button>
          </SignOutButton>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-10">

        {/* ── Portfolio Overview ── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-[#1a1814]">
                Portfolio Overview
              </h2>
              <p className="text-xs text-[#a89f94] mt-0.5">
                Updated daily by cron · powered by live metal prices
              </p>
            </div>
            <Link
              href="/notifications"
              className="flex items-center gap-1 text-xs text-[#7a7168] hover:text-[#1a1814] transition-colors"
            >
              View alerts <ArrowRight size={12} />
            </Link>
          </div>

          {snapshotLoading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Skeleton className="h-48" />
                <Skeleton className="h-48" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />)}
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16" />)}
              </div>
            </div>
          ) : (
            <SnapshotSection data={dashboard ?? {
              snapshot: null,
              trend: { ltvChange: null, direction: null },
              mtd: { newPledges: 0, releasedPledges: 0, loanAmount: 0 },
            }} />
          )}
        </section>

        {/* ── Live Market Rates ── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-[#1a1814]">
                Live Market Rates
              </h2>
              <p className="text-xs text-[#a89f94] mt-0.5">
                Updated every 2 hours · Yahoo Finance + Alpha Vantage
              </p>
            </div>
            <button
              onClick={() => loadRates(true)}
              disabled={refreshing}
              className="flex items-center gap-1.5 text-xs text-[#7a7168] hover:text-[#1a1814] border border-[#ede9e3] rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50 bg-white"
            >
              <RefreshCw size={11} className={refreshing ? "animate-spin" : ""} />
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
          </div>

          {ratesLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Skeleton className="h-36" />
              <Skeleton className="h-36" />
            </div>
          ) : ratesError ? (
            <div className="rounded-2xl border border-[#fee2e2] bg-[#fef2f2] px-5 py-4 text-sm text-[#dc2626]">
              {ratesError}
            </div>
          ) : (
            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 transition-opacity ${refreshing ? "opacity-50" : ""}`}>
              <MetalCard label="Gold"   emoji="🥇" price={rates?.gold   ?? null} />
              <MetalCard label="Silver" emoji="🥈" price={rates?.silver ?? null} />
            </div>
          )}
        </section>

      </div>

      {/* Font import */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
      `}</style>
    </div>
  );
}