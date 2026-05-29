"use client";

import React, { useEffect, useState, useCallback } from "react";
import { SignOutButton, UserButton } from "@clerk/nextjs";
<<<<<<< HEAD
import {
  Users,
  Archive,
  Banknote,
  Navigation,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { getStatusKey } from "@/lib/translations";
=======
import { useEffect, useState, useCallback } from "react";
import { Loader2, TrendingUp, TrendingDown, Minus, RefreshCw, ArrowRight } from "lucide-react";
import Link from "next/link";
import { NotificationBell } from "@/components/NotificationBell";
>>>>>>> main

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

<<<<<<< HEAD
interface DashboardData {
  user: {
    firstName: string | null;
    lastName: string | null;
  };
  stats: {
    totalCustomers: number;
    totalActivePledges: number;
    totalActiveLoanAmount: number;
    totalReleasedLoanAmount: number;
    totalBalanceAmount: number;
  };
  recentPledges: {
    id: string;
    customerName: string;
    pledgeDate: string;
    loanAmount: number;
    releaseDate: string | null;
    status: string;
  }[];
}

=======
>>>>>>> main
interface MetalPrice {
  id: string;
  metal: "GOLD" | "SILVER";
  usdPerOunce: number;
  inrPerGram: number;
  createdAt: string;
}

interface MarketRates {
  gold: MetalPrice | null;
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

<<<<<<< HEAD
function fmtINR(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n);
=======
function fmtINR(val: string | number, compact = false): string {
  const n = Number(val);
  if (compact) {
    if (n >= 10_00_000) return `₹${(n / 10_00_000).toFixed(2)}L`;
    if (n >= 1_00_000)  return `₹${(n / 1_00_000).toFixed(1)}L`;
    if (n >= 1_000)     return `₹${(n / 1_000).toFixed(1)}K`;
  }
  return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
>>>>>>> main
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
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
<<<<<<< HEAD
/*  Animated Counter                                                    */
/* ------------------------------------------------------------------ */

function AnimatedCounter({
  value,
  duration = 2000,
  format = (v: number) => v.toString(),
}: {
  value: number;
  duration?: number;
  format?: (v: number) => React.ReactNode;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    let animationFrameId: number;

    if (value === 0) {
      setCount(0);
      return;
    }

    const animate = (currentTime: number) => {
      if (startTime === null) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCount(Math.floor(easeProgress * value));
      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        setCount(value);
      }
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [value, duration]);

  return <>{format(count)}</>;
}

/* ------------------------------------------------------------------ */
/*  Metal Rate Card                                                     */
/* ------------------------------------------------------------------ */

function MetalCard({
  label,
  emoji,
  price,
}: {
  label: string;
  emoji: string;
  price: MetalPrice | null;
}) {
  if (!price) {
    return (
      <div
        className="rounded-[20px] p-6 text-center text-sm"
        style={{
          backgroundColor: "var(--card-bg)",
          color: "var(--text-muted)",
          border: "1px solid var(--divider-soft)",
        }}
      >
        No {label} data yet — waiting for first cron run.
=======
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
>>>>>>> main
      </div>
    );
  }

  return (
<<<<<<< HEAD
    <div
      className="card-hover-depth rounded-[20px] p-6 flex flex-col gap-3"
      style={{ backgroundColor: "var(--card-bg)" }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{emoji}</span>
          <span className="text-[13px] font-bold" style={{ color: "var(--text-secondary)" }}>
            {label}
          </span>
=======
    <div className="rounded-2xl border border-[#ede9e3] bg-white p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{emoji}</span>
          <span className="text-sm font-semibold text-[#3d3730]">{label}</span>
>>>>>>> main
        </div>
        <TrendingUp size={14} className="text-[#16a34a]" />
      </div>

      <div>
<<<<<<< HEAD
        <p className="text-[26px] font-bold" style={{ color: "var(--text-primary)" }}>
          {fmtINR(price.inrPerGram)}
          <span
            className="text-[13px] font-normal ml-1"
            style={{ color: "var(--text-muted)" }}
          >
            /gram
          </span>
        </p>
        <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
=======
        <p className="text-2xl font-bold text-[#1a1814] tracking-tight">
          ₹{Number(price.inrPerGram).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
          <span className="text-xs font-normal text-[#a89f94] ml-1">/gram</span>
        </p>
        <p className="text-xs text-[#a89f94] mt-0.5">
>>>>>>> main
          ${Number(price.usdPerOunce).toFixed(2)}/oz
        </p>
      </div>

<<<<<<< HEAD
      <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
        Updated {timeAgo(price.createdAt)}
      </p>
=======
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
>>>>>>> main
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Bar Chart (mock)                                                    */
/* ------------------------------------------------------------------ */

function BarChart({ language }: { language: string }) {
  const months =
    language === "hi"
      ? ["जन", "फर", "मार्च", "अप्रै", "मई", "जून", "जुल"]
      : ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL"];
  const heights1 = [40, 60, 45, 85, 50, 95, 65];
  const heights2 = [30, 50, 25, 60, 15, 75, 50];

  return (
    <div className="flex flex-col h-[280px] w-full mt-4">
      <div className="flex-1 flex items-end justify-between gap-2 px-2 pb-2">
        {months.map((m, i) => (
          <div
            key={m}
            className="flex flex-col items-center gap-2 group flex-1 h-full justify-end"
          >
            <div className="flex items-end justify-center w-full gap-1 sm:gap-2 h-[85%] relative">
              <div
                className="w-1/2 sm:w-10 rounded-t-lg transition-all"
                style={{ height: `${heights1[i]}%`, backgroundColor: "var(--secondary-light)" }}
              />
              <div
                className="w-1/2 sm:w-10 rounded-t-lg transition-all"
                style={{ height: `${heights2[i]}%`, backgroundColor: "var(--secondary-brand)" }}
              />
            </div>
            <span
              className="text-[10px] sm:text-[11px] font-bold"
              style={{ color: "var(--text-muted)" }}
            >
              {m}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Page                                                                */
/* ================================================================== */

export default function DashboardPage() {
<<<<<<< HEAD
  /* ---- Pledge/stats state ---- */
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  /* ---- Metal rates state ---- */
  const [rates, setRates] = useState<MarketRates | null>(null);
  const [ratesLoading, setRatesLoading] = useState(true);
  const [ratesError, setRatesError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const { language, t } = useLanguage();
  const locale = language === "hi" ? "hi-IN" : "en-IN";

  /* ---- Locale helpers ---- */
  function formatCurrencyAbbr(n: number): string {
    if (n >= 10000000)
      return "₹" + (n / 10000000).toFixed(1) + (language === "hi" ? " करोड़" : " Cr");
    if (n >= 100000)
      return "₹" + (n / 100000).toFixed(1) + (language === "hi" ? " लाख" : " L");
    if (n >= 1000) return "₹" + (n / 1000).toFixed(0) + "K";
    return "₹" + n;
  }

  function formatDate(d: string): string {
    return new Date(d).toLocaleDateString(locale, {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  }

  function getStatusStyle(status: string) {
    const s = status.toLowerCase();
    if (s.includes("release")) return { bg: "bg-gray-100", text: "text-gray-600" };
    if (s.includes("process") || s.includes("pending"))
      return { bg: "bg-[#E6C97A]/20", text: "text-[#B8983E]" };
    if (s.includes("hold") || s.includes("error"))
      return { bg: "bg-[#E57373]/10", text: "text-[#E57373]" };
    return { bg: "bg-[#7C8363]/10", text: "text-[#7C8363]" };
  }

  /* ---- Fetch dashboard data ---- */
  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  /* ---- Fetch metal rates ---- */
=======
  const [rates,       setRates]       = useState<MarketRates | null>(null);
  const [dashboard,   setDashboard]   = useState<DashboardData | null>(null);
  const [ratesLoading,    setRatesLoading]    = useState(true);
  const [snapshotLoading, setSnapshotLoading] = useState(true);
  const [ratesError,      setRatesError]      = useState("");
  const [refreshing,  setRefreshing]  = useState(false);

  // ── Fetch market rates ──
>>>>>>> main
  const loadRates = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setRatesLoading(true);
    setRatesError("");
    try {
<<<<<<< HEAD
      const res = await fetch(`/api/market-rates?t=${Date.now()}`);
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed to load rates");
      setRates(d);
=======
      const res  = await fetch(`/api/market-rates?t=${Date.now()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load rates");
      setRates(data);
>>>>>>> main
    } catch (err: unknown) {
      setRatesError(err instanceof Error ? err.message : "Failed to load rates");
    } finally {
      setRatesLoading(false);
      setRefreshing(false);
    }
  }, []);
<<<<<<< HEAD

  useEffect(() => {
    loadRates();
  }, [loadRates]);

  /* ---- Mock fallbacks ---- */
  const mockStats = {
    totalCustomers: 1284,
    totalActivePledges: 856,
    totalActiveLoanAmount: 4200000,
    totalReleasedLoanAmount: 3800000,
    totalBalanceAmount: 392000,
  };

  const mockPledges = [
    {
      id: "1",
      pledgeId: "#PL-8892",
      customerName: "Eleanor Kade",
      initials: "EK",
      pledgeDate: "2023-10-12",
      loanAmount: 14500,
      releaseDate: "2023-10-15",
      status: "Released",
    },
    {
      id: "2",
      pledgeId: "#PL-8893",
      customerName: "Marcus Jensen",
      initials: "MJ",
      pledgeDate: "2023-10-14",
      loanAmount: 8200,
      releaseDate: null,
      status: "Processing",
    },
    {
      id: "3",
      pledgeId: "#PL-8894",
      customerName: "Sarah Al-Fayed",
      initials: "SA",
      pledgeDate: "2023-10-14",
      loanAmount: 22000,
      releaseDate: "2023-10-18",
      status: "On Hold",
    },
    {
      id: "4",
      pledgeId: "#PL-8895",
      customerName: "Thomas Baxter",
      initials: "TB",
      pledgeDate: "2023-10-15",
      loanAmount: 5500,
      releaseDate: "2023-10-15",
      status: "Released",
    },
  ];

  const statsToUse = data?.stats ?? mockStats;
  const pledgesToUse = data?.recentPledges ?? mockPledges;

  /* ---- Loading skeleton ---- */
  if (loading) {
    return (
      <div className="flex flex-col gap-8 dash-animate" style={{ animationDelay: "50ms" }}>
        <section className="flex justify-between items-center">
          <div>
            <div className="skeleton" style={{ width: "320px", height: "38px", marginBottom: "8px" }} />
            <div className="skeleton" style={{ width: "260px", height: "16px" }} />
          </div>
          <div className="flex items-center gap-3">
            <div className="skeleton" style={{ width: "32px", height: "32px", borderRadius: "50%" }} />
            <div className="skeleton" style={{ width: "60px", height: "14px" }} />
          </div>
        </section>
        <section className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="rounded-[20px] p-6 flex flex-col gap-4"
              style={{ backgroundColor: "var(--card-bg)" }}
            >
              <div className="flex justify-between items-start">
                <div className="skeleton" style={{ width: "20px", height: "20px", borderRadius: "50%" }} />
                <div className="skeleton" style={{ width: "40px", height: "20px", borderRadius: "4px" }} />
              </div>
              <div className="skeleton" style={{ width: "80%", height: "10px" }} />
              <div className="skeleton" style={{ width: "60%", height: "26px", marginTop: "auto" }} />
            </div>
          ))}
        </section>
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <div
              key={i}
              className="rounded-[20px] p-6 flex flex-col gap-3"
              style={{ backgroundColor: "var(--card-bg)" }}
            >
              <div className="skeleton" style={{ width: "100px", height: "14px" }} />
              <div className="skeleton" style={{ width: "160px", height: "28px" }} />
              <div className="skeleton" style={{ width: "80px", height: "11px" }} />
            </div>
          ))}
        </section>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 dash-animate" style={{ animationDelay: "50ms" }}>

      {/* ── Greeting Header + Clerk Auth ── */}
      <section className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1
            className="text-[32px] sm:text-[38px] font-bold tracking-tight mb-1"
            style={{ color: "var(--text-primary)" }}
          >
            {t("greeting")}
          </h1>
          <p className="text-[14px] font-medium" style={{ color: "var(--text-secondary)" }}>
            {t("greeting_subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {/* <UserButton /> */}
          {/* <SignOutButton>
            <button
              className="text-[13px] font-medium transition-opacity hover:opacity-70"
              style={{ color: "var(--text-secondary)" }}
            >
=======

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
>>>>>>> main
              Sign out
            </button>
          </SignOutButton> */}
        </div>
      </section>

<<<<<<< HEAD
      {/* ── Stat Cards ── */}
      <section className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div
          className="card-hover-depth rounded-[20px] p-6 flex flex-col relative"
          style={{ backgroundColor: "var(--card-bg)" }}
        >
          <div className="flex justify-between items-start mb-6">
            <Users size={20} style={{ color: "var(--secondary-brand)" }} strokeWidth={2.5} />
            <span className="text-[11px] font-bold px-2 py-1 bg-gray-100 rounded text-gray-700">
              +12%
            </span>
          </div>
          <span
            className="text-[10px] font-extrabold tracking-wider mb-2"
            style={{ color: "var(--text-secondary)" }}
          >
            {t("total_customers")}
          </span>
          <span
            className="text-[26px] font-bold mt-auto"
            style={{ color: "var(--text-primary)" }}
          >
            <AnimatedCounter
              value={statsToUse.totalCustomers}
              format={(v) => v.toLocaleString(locale)}
            />
          </span>
        </div>

        <div
          className="card-hover-depth rounded-[20px] p-6 flex flex-col relative"
          style={{ backgroundColor: "var(--card-bg)" }}
        >
          <div className="flex justify-between items-start mb-6">
            <Archive size={20} style={{ color: "var(--secondary-brand)" }} strokeWidth={2.5} />
            <span className="text-[10px] font-bold px-2 py-1 bg-gray-100/60 rounded text-gray-500">
              {t("stable")}
            </span>
          </div>
          <span
            className="text-[10px] font-extrabold tracking-wider mb-2"
            style={{ color: "var(--text-secondary)" }}
          >
            {t("active_pledges")}
          </span>
          <span
            className="text-[26px] font-bold mt-auto"
            style={{ color: "var(--text-primary)" }}
          >
            <AnimatedCounter
              value={statsToUse.totalActivePledges}
              format={(v) => v.toLocaleString(locale)}
            />
          </span>
        </div>

        <div
          className="card-hover-depth rounded-[20px] p-6 flex flex-col relative"
          style={{ backgroundColor: "var(--card-bg)" }}
        >
          <div className="flex justify-between items-start mb-6">
            <Banknote size={20} style={{ color: "var(--secondary-brand)" }} strokeWidth={2.5} />
          </div>
          <span
            className="text-[10px] font-extrabold tracking-wider mb-2"
            style={{ color: "var(--text-secondary)" }}
          >
            {t("total_loan")}
          </span>
          <span
            className="text-[26px] font-bold mt-auto"
            style={{ color: "var(--text-primary)" }}
          >
            <AnimatedCounter
              value={statsToUse.totalActiveLoanAmount}
              format={formatCurrencyAbbr}
            />
          </span>
        </div>

        <div
          className="card-hover-depth rounded-[20px] p-6 flex flex-col relative"
          style={{ backgroundColor: "var(--card-bg)" }}
        >
          <div className="flex justify-between items-start mb-6">
            <Navigation
              size={20}
              style={{ color: "var(--secondary-brand)", transform: "rotate(45deg)" }}
              strokeWidth={2.5}
            />
          </div>
          <span
            className="text-[10px] font-extrabold tracking-wider mb-2"
            style={{ color: "var(--text-secondary)" }}
          >
            {t("total_released")}
          </span>
          <span
            className="text-[26px] font-bold mt-auto"
            style={{ color: "var(--text-primary)" }}
          >
            <AnimatedCounter
              value={statsToUse.totalReleasedLoanAmount}
              format={formatCurrencyAbbr}
            />
          </span>
        </div>

        <div
          className="card-hover-depth rounded-[20px] p-6 flex flex-col relative"
          style={{ backgroundColor: "var(--card-bg)" }}
        >
          <div className="flex justify-between items-start mb-6">
            <AlertCircle
              size={20}
              style={{ color: "var(--error-color)" }}
              strokeWidth={2.5}
            />
          </div>
          <span
            className="text-[10px] font-extrabold tracking-wider mb-2"
            style={{ color: "var(--text-secondary)" }}
          >
            {t("total_balance")}
          </span>
          <span
            className="text-[26px] font-bold mt-auto"
            style={{ color: "var(--text-primary)" }}
          >
            <AnimatedCounter
              value={statsToUse.totalBalanceAmount}
              format={formatCurrencyAbbr}
            />
          </span>
        </div>
      </section>

      {/* ── Live Market Rates ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2
              className="text-[18px] font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              Live Market Rates
            </h2>
            <p className="text-[11px] font-medium mt-0.5" style={{ color: "var(--text-muted)" }}>
              Updated every 2 hours · Yahoo Finance + Alpha Vantage
            </p>
          </div>
          <button
            onClick={() => loadRates(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 text-[11px] font-bold transition-opacity hover:opacity-70 disabled:opacity-40 border rounded-full px-4 py-1.5"
            style={{
              color: "var(--text-secondary)",
              borderColor: "var(--divider-soft)",
              backgroundColor: "var(--card-bg)",
            }}
          >
            <RefreshCw size={11} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {ratesLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="animate-spin" size={28} style={{ color: "var(--text-muted)" }} />
          </div>
        ) : ratesError ? (
          <div
            className="rounded-[16px] px-5 py-4 text-[13px] font-medium"
            style={{ backgroundColor: "#FEF2F2", color: "#DC2626" }}
          >
            {ratesError}
          </div>
        ) : (
          <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${refreshing ? "opacity-50 transition-opacity" : ""}`}>
            <MetalCard label="Gold" emoji="🥇" price={rates?.gold ?? null} />
            <MetalCard label="Silver" emoji="🥈" price={rates?.silver ?? null} />
          </div>
        )}
      </section>

      {/* ── Charts + Regional Performance ── */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart */}
        <div
          className="lg:col-span-2 card-hover-depth rounded-[24px] p-8 flex flex-col h-full"
          style={{ backgroundColor: "var(--card-bg)" }}
        >
          <div className="flex justify-between items-start mb-2">
            <div>
              <h2
                className="text-[18px] font-bold mb-1"
                style={{ color: "var(--text-primary)" }}
              >
                {t("loan_overview")}
              </h2>
              <p className="text-[12px] font-medium" style={{ color: "var(--text-muted)" }}>
                {t("loan_overview_desc")}
              </p>
            </div>
            <div
              className="flex items-center gap-1 rounded-full p-[3px]"
              style={{ backgroundColor: "var(--main-bg)" }}
            >
              <button
                className="px-4 py-1.5 rounded-full text-[11px] font-bold"
                style={{
                  backgroundColor: "var(--card-bg)",
                  color: "var(--text-primary)",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
                }}
              >
                {t("monthly")}
              </button>
              <button
                className="px-4 py-1.5 rounded-full text-[11px] font-bold transition-colors hover:text-gray-800"
                style={{ color: "var(--text-muted)", backgroundColor: "transparent" }}
              >
                {t("quarterly")}
              </button>
            </div>
          </div>
          <BarChart language={language} />
        </div>

        {/* Regional Performance */}
        <div
          className="card-hover-depth rounded-[24px] p-8 flex flex-col h-full"
          style={{ backgroundColor: "#EFEFDF" }}
        >
          <h2
            className="text-[18px] font-bold mb-6"
            style={{ color: "var(--text-primary)" }}
          >
            {t("regional_performance")}
          </h2>

          <div className="space-y-5 flex-1 w-full max-w-[90%]">
            {[
              { key: "northern_district", value: 78 },
              { key: "southern_coastal", value: 42 },
              { key: "central_hub", value: 91 },
            ].map(({ key, value }) => (
              <div key={key}>
                <div className="flex justify-between text-[11px] font-bold mb-2">
                  <span style={{ color: "var(--text-primary)" }}>{t(key)}</span>
                  <span style={{ color: "var(--text-primary)" }}>
                    <AnimatedCounter value={value} format={(v) => `${v}%`} />
                  </span>
                </div>
                <div className="h-2 w-full pro-progress-bg bg-white/40">
                  <div
                    className="h-full pro-progress-fill rounded-full"
                    style={{ width: `${value}%`, backgroundColor: "var(--primary-brand)" }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8">
            <div className="w-full h-[80px] rounded-[14px] bg-gradient-to-r from-[#1E293B] to-[#0F172A] relative overflow-hidden mb-3">
              <div className="absolute inset-0 opacity-40 flex items-end justify-between px-1">
                {[...Array(30)].map((_, i) => (
                  <div
                    key={i}
                    className="w-[3px] bg-blue-300 rounded-t-sm"
                    style={{ height: `${Math.random() * 80 + 20}%`, opacity: Math.random() }}
                  />
                ))}
              </div>
            </div>
            <p
              className="text-[10px] leading-[1.6] font-medium opacity-80"
              style={{ color: "var(--primary-brand)" }}
            >
              {t("quote")}
            </p>
          </div>
        </div>
      </section>

      {/* ── Recent Pledges ── */}
      <section
        className="card-hover-depth rounded-[24px] p-8 flex flex-col"
        style={{ backgroundColor: "var(--card-bg)" }}
      >
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-[18px] font-bold" style={{ color: "var(--text-primary)" }}>
            {t("recent_pledges")}
          </h2>
          <button
            className="flex items-center gap-1.5 text-[12px] font-bold transition-opacity hover:opacity-70"
            style={{ color: "var(--text-primary)" }}
          >
            {t("view_full_ledger")}
            <ArrowRight size={14} strokeWidth={2.5} />
          </button>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr>
                {[
                  "col_no",
                  "col_customer_name",
                  "col_pledge_date",
                  "col_loan_amount",
                  "col_release_date",
                  "col_status",
                ].map((col, i) => (
                  <th
                    key={col}
                    className={`pb-4 text-[10px] font-extrabold tracking-widest border-b ${i === 5 ? "text-right" : ""}`}
                    style={{
                      color: "var(--text-muted)",
                      borderColor: "var(--divider-soft)",
                    }}
                  >
                    {t(col)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pledgesToUse.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="py-8 text-center text-[13px] font-medium"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {t("no_recent_pledges")}
                  </td>
                </tr>
              )}
              {pledgesToUse.map((p: any, i: number) => {
                const isLast = i === pledgesToUse.length - 1;
                const statusTheme = getStatusStyle(p.status);
                const pledgeId =
                  p.pledgeId ||
                  `#PL-${(p.id?.slice(-4) || String(i + 2)).toUpperCase()}`;
                const statusKey = getStatusKey(p.status);

                return (
                  <tr key={p.id}>
                    <td
                      className={`py-5 text-[12px] font-bold ${!isLast ? "border-b" : ""}`}
                      style={{
                        color: "var(--text-primary)",
                        borderColor: "var(--divider-soft)",
                      }}
                    >
                      {pledgeId}
                    </td>
                    <td
                      className={`py-5 ${!isLast ? "border-b" : ""}`}
                      style={{ borderColor: "var(--divider-soft)" }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold"
                          style={{
                            backgroundColor: "var(--sidebar-bg)",
                            color: "var(--primary-brand)",
                          }}
                        >
                          {p.initials || p.customerName?.charAt(0) || "U"}
                        </div>
                        <span
                          className="text-[13px] font-semibold"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {p.customerName}
                        </span>
                      </div>
                    </td>
                    <td
                      className={`py-5 text-[12px] font-semibold ${!isLast ? "border-b" : ""}`}
                      style={{
                        color: "var(--text-secondary)",
                        borderColor: "var(--divider-soft)",
                      }}
                    >
                      {p.pledgeDate?.includes("-")
                        ? formatDate(p.pledgeDate)
                        : p.pledgeDate}
                    </td>
                    <td
                      className={`py-5 text-[13px] font-bold ${!isLast ? "border-b" : ""}`}
                      style={{
                        color: "var(--text-primary)",
                        borderColor: "var(--divider-soft)",
                      }}
                    >
                      {typeof p.loanAmount === "number"
                        ? "₹" + p.loanAmount.toLocaleString(locale) + ".00"
                        : p.loanAmount || "₹0.00"}
                    </td>
                    <td
                      className={`py-5 text-[12px] font-semibold ${!isLast ? "border-b" : ""}`}
                      style={{
                        color: "var(--text-secondary)",
                        borderColor: "var(--divider-soft)",
                      }}
                    >
                      {p.releaseDate
                        ? p.releaseDate.includes("-")
                          ? formatDate(p.releaseDate)
                          : p.releaseDate
                        : t("pending")}
                    </td>
                    <td
                      className={`py-5 text-right flex justify-end ${!isLast ? "border-b" : ""}`}
                      style={{ borderColor: "var(--divider-soft)" }}
                    >
                      <span
                        className={`inline-flex px-3 py-1.5 rounded-full text-[10px] font-bold ${statusTheme.bg} ${statusTheme.text}`}
                      >
                        {t(statusKey)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
=======
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
>>>>>>> main
    </div>
  );
}