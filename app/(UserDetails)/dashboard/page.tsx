"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import {
  Users,
  Archive,
  IndianRupee,
  ArrowRight,
  Wallet,
  Percent,
  Plus,
  Undo2,
} from "lucide-react";
import { useQuickActions } from "@/components/layout/QuickActions";
import Toast, { consumeQueuedToast } from "@/components/ui/Toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { getStatusKey } from "@/lib/translations";
import dynamic from "next/dynamic";
import {
  MonthlyPerformanceSection,
  MonthlyPerformanceSkeleton,
} from "@/components/dashboard/MonthlyPerformanceSection";
import {
  AgingAnalysisSection,
  AgingAnalysisSkeleton,
} from "@/components/dashboard/AgingAnalysisSection";
import { RegionsExplorerOverlay } from "@/components/dashboard/RegionsExplorerOverlay";
import TodayCashCard from "@/components/dashboard/TodayCashCard";
import {
  AgingSpineSection,
  AgingSpineSkeleton,
} from "@/components/dashboard/spine/AgingSpineSection";
import type { AgingFetch, SpineData } from "@/components/dashboard/spine/types";
import { dmSans } from "@/lib/fonts";


// recharts is only needed below the fold; keep it out of the initial bundle.
const LazyMetalDonut = dynamic(() => import("@/components/dashboard/MetalDonut"), { ssr: false });

/* ================================================================== */
/*  Types                                                               */
/* ================================================================== */

interface FinancialSnapshot {
  totalLoanAmount: string;
  totalAmountOwed: string;
  totalInterestOwed: string;
  totalMarketValue: string;
  overallLtv: string | null;
  totalGoldWeight: string;
  totalSilverWeight: string;
  totalPledges: number;
  activePledges: number;
  releasedPledges: number;
  overduePledges: number;
  safePledges: number;
  watchPledges: number;
  atRiskPledges: number;
  underwaterPledges: number;
  calculatedAt: string;
}

interface DashboardData {
  user?: {
    firstName: string | null;
    shopName: string | null;
  };
  snapshot: FinancialSnapshot | null;
  trend: {
    ltvChange: number | null;
    direction: "up" | "down" | "flat" | null;
  };
  stats?: {
    totalCustomers: number;
    totalActivePledges: number;
    totalActiveLoanAmount: number;
    totalReleasedLoanAmount: number;
    // null = nothing to total (no ACTIVE pledges). Renders as "—", never ₹0.
    totalBalanceAmount: number | null;
    // Same null convention as totalBalanceAmount.
    totalInterestAmount: number | null;
  };
  // Shape comes from GET /api/dashboard/snapshot → `recentPledges` (the only
  // writer of this state). `customerId` backs the row's click-through; the
  // route sends it, so it is required here.
  recentPledges?: {
    id: string;
    pledgeId?: string;
    customerName: string;
    initials?: string;
    customerId: string;
    pledgeDate: string;
    loanAmount: number;
    releaseDate: string | null;
    status: string;
    // First item's type plus a count of the rest ("Ring +2"); null when the
    // pledge has no items.
    pledgeItem: string | null;
  }[];
  portfolio: {
    goldWeightGrams: number;
    silverWeightGrams: number;
    goldPricePerGram: number;
    silverPricePerGram: number;
    goldValue: number;
    silverValue: number;
    totalMarketValue: number;
    snapshotDate: string;
  } | null;
  regions?: {
    name: string;
    count: number;
  }[];
}

/* ================================================================== */
/*  Helpers                                                             */
/* ================================================================== */

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

/* ================================================================== */
/*  Animated Counter                                                    */
/* ================================================================== */

function AnimatedCounter({
  value,
  duration = 1800,
  format = (v: number) => v.toString(),
}: {
  value: number;
  duration?: number;
  format?: (v: number) => React.ReactNode;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    let raf: number;
    if (value === 0) { setCount(0); return; }
    const animate = (t: number) => {
      if (startTime === null) startTime = t;
      const progress = Math.min((t - startTime) / duration, 1);
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCount(Math.floor(ease * value));
      if (progress < 1) raf = requestAnimationFrame(animate);
      else setCount(value);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <>{format(count)}</>;
}

/* ================================================================== */
/*  Customer Distribution by Region                                     */
/* ================================================================== */

function RegionDistribution({ regions = [], onViewAllRegions }: { regions?: { name: string; count: number }[]; onViewAllRegions?: () => void }) {
  const maxCount = Math.max(...regions.map((r) => r.count), 1);

  return (
    <div
      className="rounded-[18px] p-5"
      style={{ backgroundColor: "#EFEFDF", border: "1px solid var(--border)" }}
    >
      <h3 className="text-[14px] font-bold mb-5" style={{ color: "var(--foreground)" }}>
        Customer Distribution by Region
      </h3>

      {regions.length === 0 ? (
        <div className="py-6 text-center text-[12.5px] font-medium text-[var(--muted-foreground-subtle)]">
          No customer regions available.
        </div>
      ) : (
        <div className="space-y-4">
          {regions.map((r) => (
            <div key={r.name}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[12px] font-semibold" style={{ color: "var(--foreground)" }}>
                  {r.name}
                </span>
                <span className="text-[13px] font-bold" style={{ color: "var(--foreground)" }}>
                  {r.count}
                </span>
              </div>
              <div className="h-[6px] rounded-full overflow-hidden" style={{ backgroundColor: "var(--background)" }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${(r.count / maxCount) * 100}%`,
                    backgroundColor: "#8B9073",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={onViewAllRegions}
        className="flex items-center justify-between w-full mt-5 pt-3 text-[11px] font-bold transition-opacity hover:opacity-70"
        style={{ color: "#37392C", borderTop: "1px solid var(--border)" }}
      >
        <span>View All Regions</span>
        <ArrowRight size={12} />
      </button>
    </div>
  );
}

/* ================================================================== */
/*  Metal Portfolio (Weight / Value slide)                              */
/* ================================================================== */

const METAL_COLORS = { gold: "#FBBF24", silver: "#9CA3AF" };

function formatWeight(grams: number): string {
  if (grams >= 1000) return `${(grams / 1000).toFixed(2)} kg`;
  return `${grams.toFixed(1)} g`;
}

function formatMetalCurrency(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

type MetalPortfolioData = NonNullable<DashboardData["portfolio"]>;

function MetalDonut({
  goldValue,
  silverValue,
  tooltipFormatter,
}: {
  goldValue: number;
  silverValue: number;
  tooltipFormatter: (value: number) => string;
}) {
  const data = [
    { name: "Gold", value: goldValue, color: METAL_COLORS.gold },
    { name: "Silver", value: silverValue, color: METAL_COLORS.silver },
  ];

  // The fixed-height wrapper stays here, so the card keeps its size while the
  // chart chunk loads.
  return (
    <div className="h-[160px]">
      <LazyMetalDonut data={data} tooltipFormatter={tooltipFormatter} />
    </div>
  );
}

function WeightSlide({ portfolio }: { portfolio: MetalPortfolioData }) {
  const { goldWeightGrams, silverWeightGrams } = portfolio;
  const total = goldWeightGrams + silverWeightGrams;

  if (total === 0) {
    return (
      <div className="py-6 text-center text-[12.5px] font-medium text-[var(--muted-foreground-subtle)]">
        No pledged items available.
      </div>
    );
  }

  return (
    <>
      <MetalDonut goldValue={goldWeightGrams} silverValue={silverWeightGrams} tooltipFormatter={formatWeight} />
      <div className="flex items-center justify-center gap-5 mt-1">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: METAL_COLORS.gold }} />
          <span className="text-[11px] font-semibold" style={{ color: "var(--muted-foreground)" }}>
            Gold: {formatWeight(goldWeightGrams)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: METAL_COLORS.silver }} />
          <span className="text-[11px] font-semibold" style={{ color: "var(--muted-foreground)" }}>
            Silver: {formatWeight(silverWeightGrams)}
          </span>
        </div>
      </div>
    </>
  );
}

function ValueSlide({ portfolio }: { portfolio: MetalPortfolioData }) {
  const { goldValue, silverValue, totalMarketValue } = portfolio;

  if (totalMarketValue === 0) {
    return (
      <div className="py-6 text-center text-[12.5px] font-medium text-[var(--muted-foreground-subtle)]">
        No pledged items available.
      </div>
    );
  }

  return (
    <>
      <MetalDonut goldValue={goldValue} silverValue={silverValue} tooltipFormatter={formatMetalCurrency} />
      <div className="flex flex-col items-center gap-1.5 mt-1">
        <div className="flex items-center justify-center gap-5">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: METAL_COLORS.gold }} />
            <span className="text-[11px] font-semibold" style={{ color: "var(--muted-foreground)" }}>
              Gold: {formatMetalCurrency(goldValue)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: METAL_COLORS.silver }} />
            <span className="text-[11px] font-semibold" style={{ color: "var(--muted-foreground)" }}>
              Silver: {formatMetalCurrency(silverValue)}
            </span>
          </div>
        </div>
        <span className="text-[12px] font-bold" style={{ color: "var(--foreground)" }}>
          Combined: {formatMetalCurrency(totalMarketValue)}
        </span>
      </div>
    </>
  );
}

function MetalPortfolio({
  portfolio,
  snapshotDateLabel,
}: {
  portfolio: MetalPortfolioData | null;
  snapshotDateLabel: string | null;
}) {
  const [slide, setSlide] = useState<0 | 1>(0);

  return (
    <div
      className="rounded-[18px] p-5"
      style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
    >
      <h3 className="text-[14px] font-bold" style={{ color: "var(--foreground)" }}>
        Metal Portfolio
      </h3>
      <p className="text-[11px] font-medium mb-4" style={{ color: "var(--muted-foreground-subtle)" }}>
        Active pledges{snapshotDateLabel ? ` • as of ${snapshotDateLabel}` : ""}
      </p>

      {!portfolio ? (
        <div className="py-10 text-center text-[12.5px] font-medium text-[var(--muted-foreground-subtle)]">
          No data yet — updates daily
        </div>
      ) : (
        <>
          {slide === 0 ? <WeightSlide portfolio={portfolio} /> : <ValueSlide portfolio={portfolio} />}

          <div className="flex items-center justify-center gap-2 mt-4">
            {([0, 1] as const).map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSlide(i)}
                aria-label={i === 0 ? "Show weight view" : "Show value view"}
                className="rounded-full transition-all"
                style={{
                  width: slide === i ? 16 : 6,
                  height: 6,
                  backgroundColor: slide === i ? "#565C3F" : "var(--border)",
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Page Component                                                      */
/* ================================================================== */

export default function DashboardPage() {
  const { language, t } = useLanguage();
  const locale = language === "hi" ? "hi-IN" : "en-IN";
  const router = useRouter();

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(true);
  const [regionsExplorerOpen, setRegionsExplorerOpen] = useState(false);
  const { openPicker } = useQuickActions();

  // One-shot confirmation handed over by a quick-action flow
  // ("Pledge added for …" / "Released N pledges for …").
  useEffect(() => {
    consumeQueuedToast();
  }, []);

  /* ---- Fetch dashboard snapshot ---- */
  const loadSnapshot = useCallback(async () => {
    setSnapshotLoading(true);
    try {
      const res = await fetch("/api/dashboard/snapshot");
      if (res.ok) {
        const data = await res.json();
        setDashboard(data);
      }
    } catch (e) {
      console.error("Snapshot error:", e);
    } finally {
      setSnapshotLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSnapshot();
  }, [loadSnapshot]);

  /* ---- Fetch aging analysis — once, in parallel with the snapshot ---- */
  // Shared by the spine and the aging table, so the route is called once.
  const [aging, setAging] = useState<AgingFetch>({ status: "loading" });
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/dashboard/aging-analysis", { cache: "no-store" });
        if (!res.ok) throw new Error("request failed");
        const data = (await res.json()) as SpineData;
        if (!cancelled) setAging({ status: "ready", data });
      } catch {
        if (!cancelled) setAging({ status: "error" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const statsToUse = dashboard?.stats || {
    totalCustomers: 0,
    totalActivePledges: 0,
    totalActiveLoanAmount: 0,
    totalReleasedLoanAmount: 0,
    // Not 0: the snapshot fetch has not landed (or failed), so the balance is
    // unknown, not zero. Same convention as INVENTORY VALUE — render "—".
    totalBalanceAmount: null,
    totalInterestAmount: null,
  };

  const pledgesToUse = dashboard?.recentPledges || [];

  function formatDate(d: string): string {
    return new Date(d).toLocaleDateString(locale, { month: "short", day: "2-digit", year: "numeric" });
  }

  // Keyed on the pledge's real status, using the --status-* tokens so both
  // themes are covered. RELEASED and SOLD are terminal; ACTIVE and OVERDUE are
  // open. Nothing here invents a status the domain does not have.
  function getStatusStyle(status: string) {
    switch (status?.toUpperCase()) {
      case "RELEASED":
        return {
          bg: "var(--status-released-surface)",
          text: "var(--status-released-foreground)",
          accent: "var(--status-released)",
        };
      case "OVERDUE":
        return {
          bg: "var(--status-overdue-surface)",
          text: "var(--status-overdue-foreground)",
          accent: "var(--status-overdue)",
        };
      case "SOLD":
        return {
          bg: "var(--status-sold-surface)",
          text: "var(--status-sold-foreground)",
          accent: "var(--status-sold)",
        };
      default:
        return {
          bg: "var(--status-active-surface)",
          text: "var(--status-active-foreground)",
          accent: "var(--status-active)",
        };
    }
  }

  // Exact rupees. Abbreviation hides interest accrual when amounts are close,
  // so it belongs on axis labels, not on figures the owner compares.
  function formatRupees(n: number): string {
    return "₹" + Math.round(n).toLocaleString(locale);
  }

  /* ================================================================ */
  /*  Render                                                            */
  /* ================================================================ */

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--background)", fontFamily: `${dmSans.style.fontFamily}, sans-serif` }}>

      <Toast />

      {/* ── Greeting + quick actions ── */}
      <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1
            className="text-[30px] sm:text-[36px] font-bold tracking-tight mb-1"
            style={{ color: "var(--foreground)" }}
          >
            {dashboard?.user?.firstName
              ? `${getGreeting()}, ${dashboard.user.firstName}.`
              : `${getGreeting()}.`}
          </h1>
          {dashboard?.user?.shopName && (
            <p className="text-[13px] font-medium" style={{ color: "var(--muted-foreground)" }}>
              {dashboard.user.shopName}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 lg:flex lg:shrink-0">
          <button
            type="button"
            onClick={() => openPicker("add")}
            aria-haspopup="dialog"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[12px] bg-primary px-5 text-[14px] font-bold text-primary-foreground shadow-sm transition-opacity hover:opacity-90 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <Plus size={18} strokeWidth={2.5} aria-hidden="true" />
            Add Pledge
          </button>
          <button
            type="button"
            onClick={() => openPicker("release")}
            aria-haspopup="dialog"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[12px] border border-border bg-card px-5 text-[14px] font-bold text-foreground transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <Undo2 size={18} strokeWidth={2.5} aria-hidden="true" />
            Release Pledge
          </button>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  Exposure + Aging Spine — the page's lead                   */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section className="mb-10">
        {snapshotLoading ? (
          <AgingSpineSkeleton />
        ) : (
          <Suspense fallback={<AgingSpineSkeleton />}>
            <AgingSpineSection
              snapshot={dashboard?.snapshot ?? null}
              ltvChange={dashboard?.trend?.ltvChange ?? null}
              aging={aging}
            />
          </Suspense>
        )}
      </section>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  Book summary — context beneath the spine                   */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="mb-6">
        <section>
          <div
            className="rounded-[18px] p-0 flex items-center justify-between h-full"
            style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
          >
            {/* Total Customers */}
            <div className="flex-1 p-6 flex flex-col items-center justify-center relative">
              <div className="flex items-center gap-2 mb-2">
                <Users size={16} style={{ color: "#565C3F" }} strokeWidth={2.2} />
                <span className="text-[10px] font-bold tracking-wider uppercase" style={{ color: "var(--muted-foreground-subtle)" }}>
                  TOTAL CUSTOMERS
                </span>
              </div>
              <span className="text-[24px] font-bold" style={{ color: "var(--foreground)" }}>
                <AnimatedCounter value={statsToUse.totalCustomers} format={(v) => v.toLocaleString(locale)} />
              </span>
              {/* Right divider */}
              <div className="absolute right-0 top-6 bottom-6 w-px bg-[var(--border)]" />
            </div>

            {/* Active Pledges */}
            <div className="flex-1 p-6 flex flex-col items-center justify-center relative">
              <div className="flex items-center gap-2 mb-2">
                <Archive size={16} style={{ color: "#565C3F" }} strokeWidth={2.2} />
                <span className="text-[10px] font-bold tracking-wider uppercase" style={{ color: "var(--muted-foreground-subtle)" }}>
                  ACTIVE PLEDGES
                </span>
              </div>
              <span className="text-[24px] font-bold" style={{ color: "var(--foreground)" }}>
                <AnimatedCounter value={statsToUse.totalActivePledges} format={(v) => v.toLocaleString(locale)} />
              </span>
              {/* Right divider */}
              <div className="absolute right-0 top-6 bottom-6 w-px bg-[var(--border)]" />
            </div>

            {/* Total Balance */}
            <div className="flex-1 p-6 flex flex-col items-center justify-center relative">
              <div className="flex items-center gap-2 mb-2">
                <IndianRupee size={16} style={{ color: "#565C3F" }} strokeWidth={2.2} />
                <span className="text-[10px] font-bold tracking-wider uppercase" style={{ color: "var(--muted-foreground-subtle)" }}>
                  TOTAL BALANCE
                </span>
              </div>
              <span className="text-[24px] font-bold" style={{ color: "var(--foreground)" }}>
                {statsToUse.totalBalanceAmount !== null
                  ? formatRupees(statsToUse.totalBalanceAmount)
                  : "—"}
              </span>
              {/* Right divider */}
              <div className="absolute right-0 top-6 bottom-6 w-px bg-[var(--border)]" />
            </div>

            {/* Total Principal */}
            <div className="flex-1 p-6 flex flex-col items-center justify-center relative">
              <div className="flex items-center gap-2 mb-2">
                <Wallet size={16} style={{ color: "#565C3F" }} strokeWidth={2.2} />
                <span className="text-[10px] font-bold tracking-wider uppercase" style={{ color: "var(--muted-foreground-subtle)" }}>
                  TOTAL PRINCIPAL
                </span>
              </div>
              <span className="text-[24px] font-bold" style={{ color: "var(--foreground)" }}>
                {statsToUse.totalBalanceAmount !== null
                  ? formatRupees(statsToUse.totalActiveLoanAmount)
                  : "—"}
              </span>
              {/* Right divider */}
              <div className="absolute right-0 top-6 bottom-6 w-px bg-[var(--border)]" />
            </div>

            {/* Total Interest */}
            <div className="flex-1 p-6 flex flex-col items-center justify-center">
              <div className="flex items-center gap-2 mb-2">
                <Percent size={16} style={{ color: "#565C3F" }} strokeWidth={2.2} />
                <span className="text-[10px] font-bold tracking-wider uppercase" style={{ color: "var(--muted-foreground-subtle)" }}>
                  TOTAL INTEREST
                </span>
              </div>
              <span className="text-[24px] font-bold" style={{ color: "var(--foreground)" }}>
                {statsToUse.totalInterestAmount !== null
                  ? formatRupees(statsToUse.totalInterestAmount)
                  : "—"}
              </span>
            </div>
          </div>
        </section>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  Performance & portfolio context                            */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 mb-6">
        {/* Left Column */}
        <section className="h-full overflow-hidden">
          <Suspense fallback={<MonthlyPerformanceSkeleton />}>
            <MonthlyPerformanceSection />
          </Suspense>
        </section>

        {/* Right Column */}
        <section className="space-y-6">
          <TodayCashCard />
          <RegionDistribution regions={dashboard?.regions} onViewAllRegions={() => setRegionsExplorerOpen(true)} />
          <MetalPortfolio
            portfolio={dashboard?.portfolio ?? null}
            snapshotDateLabel={
              dashboard?.portfolio?.snapshotDate ? formatDate(dashboard.portfolio.snapshotDate) : null
            }
          />
        </section>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  Aging table — the spine's tabular companion                */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section className="mb-10">
        <Suspense fallback={<AgingAnalysisSkeleton />}>
          <AgingAnalysisSection aging={aging} />
        </Suspense>
      </section>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  Row 3: Recent Pledges — Premium Card Layout               */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section className="mb-6">
        {/* Section Header */}
        <div
          className="rounded-t-[18px] px-6 py-4 flex items-center justify-between"
          style={{ backgroundColor: "#EAEDDA", border: "1px solid #D4D9BD" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: "#D0D6B8" }}
            >
              <Archive size={15} style={{ color: "#4A5230" }} />
            </div>
            <div>
              <h2 className="text-[16px] font-bold" style={{ color: "#2E3318" }}>
                {t("recent_pledges")}
              </h2>
              <p className="text-[11px] font-medium" style={{ color: "#6B7A4A" }}>
                {t("Latest Pledges", { count: pledgesToUse.length > 0 ? pledgesToUse.length : "" })}
              </p>
            </div>
          </div>
          <Link
            href="/pledgeList"
            className="flex items-center gap-1.5 text-[11px] font-bold px-4 py-2 rounded-lg transition-all hover:opacity-80"
            style={{ backgroundColor: "#D0D6B8", color: "#3A4127", border: "1px solid #BCC4A0" }}
          >
            {t("view_full_ledger")}
            <ArrowRight size={12} strokeWidth={2.5} />
          </Link>
        </div>

        {/* Column Headers */}
        <div
          className="grid grid-cols-[2fr_1.5fr_1.2fr_1.2fr_1.2fr_120px] gap-4 px-6 py-3 min-w-[850px]"
          style={{ backgroundColor: "#F2F4E9", borderLeft: "1px solid #D4D9BD", borderRight: "1px solid #D4D9BD" }}
        >
          {[
            t("Customer"),
            t("col_pledge_item") === "col_pledge_item" ? "PLEDGE ITEM" : t("col_pledge_item"),
            t("col_pledge_date"),
            t("col_loan_amount"),
            t("col_release_date"),
            t("col_status"),
          ].map((col, idx) => (
            <span
              key={col}
              className={`text-[9px] font-black tracking-[0.12em] uppercase ${idx === 5 ? "text-right" : ""}`}
              style={{ color: "#7A8A55" }}
            >
              {col}
            </span>
          ))}
        </div>

        {/* Pledge Rows */}
        <div
          className="rounded-b-[18px] overflow-hidden"
          style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderTop: "none" }}
        >
          {pledgesToUse.length === 0 ? (
            <div className="py-16 text-center">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: "var(--background)" }}
              >
                <Archive size={24} style={{ color: "var(--muted-foreground-subtle)" }} />
              </div>
              <p className="text-[14px] font-semibold" style={{ color: "var(--muted-foreground-subtle)" }}>{t("no_recent_pledges")}</p>
              <p className="text-[12px] mt-1" style={{ color: "var(--muted-foreground-subtle)", opacity: 0.6 }}>{t("new_pledges_appear")}</p>
            </div>
          ) : (
            pledgesToUse.map((p, i) => {
              const isLast = i === pledgesToUse.length - 1;
              const sStyle = getStatusStyle(p.status);
              const initials =
                p.initials ||
                p.customerName
                  ?.split(" ")
                  .map((w: string) => w[0])
                  .join("")
                  .toUpperCase()
                  .substring(0, 2) ||
                "U";
              const statusKey = getStatusKey(p.status);
              const isActive = p.status?.toLowerCase().includes("active") || (!p.status?.toLowerCase().includes("release") && !p.status?.toLowerCase().includes("overdue"));
              const isOverdue = p.status?.toLowerCase().includes("overdue");

              return (
                <div
                  key={p.id}
                  onClick={() => router.push(`/customers/${p.customerId}/pledges/${p.id}`)}
                  className="grid grid-cols-[2fr_1.5fr_1.2fr_1.2fr_1.2fr_120px] gap-4 items-center px-6 py-4 transition-all duration-150 min-w-[850px] group"
                  style={{
                    borderBottom: !isLast ? "1px solid var(--border)" : "none",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.backgroundColor = "var(--background)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.backgroundColor = "transparent"; }}
                >
                  {/* Customer Name */}
                  <div className="flex items-center gap-3">
                    {/* Accent bar */}
                    <div
                      className="w-[3px] h-9 rounded-full shrink-0"
                      style={{ backgroundColor: sStyle.accent }}
                    />
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-black shrink-0"
                      style={{ backgroundColor: sStyle.bg, color: sStyle.text }}
                    >
                      {initials}
                    </div>
                    <div>
                      <p className="text-[13px] font-bold leading-tight" style={{ color: "var(--foreground)" }}>
                        {p.customerName}
                      </p>
                      {p.pledgeId && (
                        <p className="text-[10px] font-medium mt-0.5" style={{ color: "var(--muted-foreground-subtle)" }}>
                          #{p.pledgeId?.slice(-6).toUpperCase()}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Pledge Item */}
                  <div>
                    <p className="text-[12px] font-semibold" style={{ color: "var(--foreground)" }}>
                      {p.pledgeItem || "—"}
                    </p>
                  </div>

                  {/* Pledge Date */}
                  <div>
                    <p className="text-[12px] font-semibold" style={{ color: "var(--foreground)" }}>
                      {p.pledgeDate?.includes("-") ? formatDate(p.pledgeDate) : p.pledgeDate}
                    </p>
                  </div>

                  {/* Loan Amount */}
                  <div>
                    <p className="text-[14px] font-black" style={{ color: isOverdue ? "#C62828" : "var(--foreground)" }}>
                      {typeof p.loanAmount === "number"
                        ? "₹" + p.loanAmount.toLocaleString(locale)
                        : p.loanAmount || "₹0"}
                    </p>
                    {isOverdue && (
                      <p className="text-[9px] font-bold mt-0.5" style={{ color: "#EF5350" }}>OVERDUE</p>
                    )}
                  </div>

                  {/* Release Date */}
                  <div>
                    <p
                      className="text-[12px] font-semibold"
                      style={{ color: p.releaseDate ? "#2E7D32" : "var(--muted-foreground-subtle)" }}
                    >
                      {p.releaseDate
                        ? p.releaseDate.includes("-")
                          ? formatDate(p.releaseDate)
                          : p.releaseDate
                        : "—"}
                    </p>
                    {!p.releaseDate && (
                      <p className="text-[9px] font-semibold mt-0.5" style={{ color: "var(--muted-foreground-subtle)", opacity: 0.7 }}>{t("pending")}</p>
                    )}
                  </div>

                  {/* Status Badge */}
                  <div className="flex justify-end">
                    <span
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black tracking-wide"
                      style={{ backgroundColor: sStyle.bg, color: sStyle.text }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: sStyle.accent }}
                      />
                      {t(statusKey).toUpperCase()}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>


      <RegionsExplorerOverlay
        open={regionsExplorerOpen}
        onClose={() => setRegionsExplorerOpen(false)}
      />

    </div>
  );
}