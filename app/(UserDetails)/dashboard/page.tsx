"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import {
  Users,
  Archive,
  DollarSign,
  IndianRupee,
  RefreshCw,
  ArrowRight,
  BarChart3,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { getStatusKey } from "@/lib/translations";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  MonthlyPerformanceSection,
  MonthlyPerformanceSkeleton,
} from "@/components/dashboard/MonthlyPerformanceSection";
import {
  AgingAnalysisSection,
  AgingAnalysisSkeleton,
} from "@/components/dashboard/AgingAnalysisSection";
import { RegionsExplorerOverlay } from "@/components/dashboard/RegionsExplorerOverlay";
import {
  AgingSpineSection,
  AgingSpineSkeleton,
} from "@/components/dashboard/spine/AgingSpineSection";

/* ================================================================== */
/*  Types                                                               */
/* ================================================================== */

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
  mtd: {
    newPledges: number;
    releasedPledges: number;
    loanAmount: number;
  };
  stats?: {
    totalCustomers: number;
    totalActivePledges: number;
    totalActiveLoanAmount: number;
    totalReleasedLoanAmount: number;
    totalBalanceAmount: number;
  };
  recentPledges?: {
    id: string;
    pledgeId?: string;
    customerName: string;
    initials?: string;
    pledgeDate: string;
    loanAmount: number;
    releaseDate: string | null;
    status: string;
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
  tasks?: {
    id: string;
    text: string;
    done: boolean;
  }[];
  charts?: {
    pledges: { month: string; added: number; released: number }[];
    loans: { month: string; disbursed: number; recovered: number }[];
    customers: { month: string; added: number }[];
    loanSummary: {
      totalDisbursed: number;
      totalRecovered: number;
      recoveryRate: number;
    };
  };
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
/*  Custom Chart Tooltip                                                */
/* ================================================================== */

interface ChartTooltipProps {
  active?: boolean;
  label?: string | number;
  payload?: Array<{ color?: string; name?: string; value?: number | string }>;
}

function ChartTooltipContent({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #ECEAE4",
        borderRadius: 10,
        padding: "10px 14px",
        boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
        fontSize: 12,
        fontWeight: 500,
      }}
    >
      <p style={{ fontWeight: 700, marginBottom: 4, color: "#2C2C2C" }}>{label}</p>
      {payload.map((entry, i: number) => (
        <p key={i} style={{ color: entry.color, margin: "2px 0" }}>
          {entry.name}: {typeof entry.value === "number" && entry.value >= 1000
            ? `₹${(entry.value).toLocaleString("en-IN")}`
            : entry.value}
        </p>
      ))}
    </div>
  );
}

/* ================================================================== */
/*  Loan Overview (Tabbed Chart)                                        */
/* ================================================================== */

type ChartTab = "pledges" | "loanAmount" | "customers";

function LoanOverview({ charts }: { charts?: DashboardData["charts"] }) {
  const [activeTab, setActiveTab] = useState<ChartTab>("pledges");
  const [isTransitioning, setIsTransitioning] = useState(false);

  const switchTab = (tab: ChartTab) => {
    if (tab === activeTab) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setActiveTab(tab);
      setTimeout(() => setIsTransitioning(false), 50);
    }, 200);
  };

  const tabs: { key: ChartTab; label: string }[] = [
    { key: "pledges", label: "Pledges" },
    { key: "loanAmount", label: "Loan Amount" },
    { key: "customers", label: "Customers" },
  ];

  const pledgesData = charts?.pledges || [];
  const loansData = charts?.loans || [];
  const customersData = charts?.customers || [];

  const { totalDisbursed, totalRecovered, recoveryRate } = charts?.loanSummary || {
    totalDisbursed: 0,
    totalRecovered: 0,
    recoveryRate: 0,
  };

  const hasPledges = pledgesData.some(d => d.added > 0 || d.released > 0);
  const hasLoans = loansData.some(d => d.disbursed > 0 || d.recovered > 0);
  const hasCustomers = customersData.some(d => d.added > 0);

  return (
    <div
      className="rounded-[18px] p-7 flex flex-col h-full"
      style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-1">
        <div>
          <h2 className="text-[17px] font-bold" style={{ color: "var(--foreground)" }}>
            Loan Overview
          </h2>
          <p className="text-[12px] font-medium mt-0.5" style={{ color: "var(--muted-foreground-subtle)" }}>
            Monthly disbursement vs collection performance
          </p>
        </div>
        {/* Tab switcher */}
        <div
          className="flex items-center gap-0 rounded-full p-[3px]"
          style={{ backgroundColor: "var(--background)" }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => switchTab(tab.key)}
              className="px-4 py-[6px] rounded-full text-[11px] font-bold transition-all duration-200"
              style={{
                backgroundColor: activeTab === tab.key ? "#565C3F" : "transparent",
                color: activeTab === tab.key ? "#fff" : "var(--muted-foreground-subtle)",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loan Amount summary strip */}
      {activeTab === "loanAmount" && hasLoans && (
        <div
          className="grid grid-cols-3 gap-4 mt-4 mb-2 px-1 transition-all duration-300"
          style={{ opacity: isTransitioning ? 0 : 1 }}
        >
          <div className="text-center">
            <p className="text-[10px] font-bold tracking-wider text-[var(--muted-foreground-subtle)] uppercase">
              Total Disbursed
            </p>
            <p className="text-[16px] md:text-[20px] font-bold mt-0.5" style={{ color: "var(--foreground)" }}>
              ₹{totalDisbursed >= 100000 ? (totalDisbursed / 100000).toFixed(1) + "L" : totalDisbursed.toLocaleString("en-IN")}
            </p>
          </div>
          <div className="text-center border-x" style={{ borderColor: "var(--border)" }}>
            <p className="text-[10px] font-bold tracking-wider text-[var(--muted-foreground-subtle)] uppercase">
              Recovered
            </p>
            <p className="text-[16px] md:text-[20px] font-bold mt-0.5" style={{ color: "var(--foreground)" }}>
              ₹{totalRecovered >= 100000 ? (totalRecovered / 100000).toFixed(1) + "L" : totalRecovered.toLocaleString("en-IN")}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-bold tracking-wider text-[var(--muted-foreground-subtle)] uppercase">
              Recovery Rate
            </p>
            <p className="text-[16px] md:text-[20px] font-bold mt-0.5" style={{ color: "var(--foreground)" }}>
              {recoveryRate.toFixed(1)}%
            </p>
          </div>
        </div>
      )}

      {/* Chart area */}
      <div
        className="mt-3 transition-all duration-300 flex-1 min-h-[300px]"
        style={{
          opacity: isTransitioning ? 0 : 1,
          transform: isTransitioning ? "translateY(8px)" : "translateY(0)",
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          {activeTab === "pledges" ? (
            hasPledges ? (
              <BarChart data={pledgesData} barGap={3} barSize={18}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ECEAE4" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fontWeight: 700, fill: "#9E9E9E" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#9E9E9E" }}
                  axisLine={false}
                  tickLine={false}
                  width={30}
                  allowDecimals={false}
                />
                <Tooltip content={<ChartTooltipContent />} cursor={{ fill: "rgba(0,0,0,0.02)" }} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11, fontWeight: 600, paddingTop: 12 }}
                />
                <Bar
                  dataKey="added"
                  name="Pledges Added"
                  fill="#565C3F"
                  radius={[4, 4, 0, 0]}
                  animationDuration={600}
                />
                <Bar
                  dataKey="released"
                  name="Pledges Released"
                  fill="#DADBCF"
                  radius={[4, 4, 0, 0]}
                  animationDuration={600}
                />
              </BarChart>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-[var(--muted-foreground-subtle)]">
                <Archive size={32} className="mb-2 opacity-20" />
                <span className="text-[13px] font-medium">No pledge activity available.</span>
              </div>
            )
          ) : activeTab === "loanAmount" ? (
            hasLoans ? (
              <BarChart data={loansData} barGap={3} barSize={18}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ECEAE4" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fontWeight: 700, fill: "#9E9E9E" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#9E9E9E" }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                  tickFormatter={(v) => {
                    if (v >= 100000) return `${(v / 100000).toFixed(0)}L`;
                    if (v >= 1000) return `${(v / 1000).toFixed(0)}K`;
                    return v;
                  }}
                />
                <Tooltip content={<ChartTooltipContent />} cursor={{ fill: "rgba(0,0,0,0.02)" }} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11, fontWeight: 600, paddingTop: 12 }}
                />
                <Bar
                  dataKey="disbursed"
                  name="Loan Disbursed"
                  fill="#565C3F"
                  radius={[4, 4, 0, 0]}
                  animationDuration={600}
                />
                <Bar
                  dataKey="recovered"
                  name="Amount Recovered"
                  fill="#DADBCF"
                  radius={[4, 4, 0, 0]}
                  animationDuration={600}
                />
              </BarChart>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-[var(--muted-foreground-subtle)]">
                <DollarSign size={32} className="mb-2 opacity-20" />
                <span className="text-[13px] font-medium">No loan data available.</span>
              </div>
            )
          ) : (
            hasCustomers ? (
              <BarChart data={customersData} barSize={24}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ECEAE4" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fontWeight: 700, fill: "#9E9E9E" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#9E9E9E" }}
                  axisLine={false}
                  tickLine={false}
                  width={30}
                  allowDecimals={false}
                />
                <Tooltip content={<ChartTooltipContent />} cursor={{ fill: "rgba(0,0,0,0.02)" }} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11, fontWeight: 600, paddingTop: 12 }}
                />
                <Bar
                  dataKey="added"
                  name="Customers Added"
                  fill="#565C3F"
                  radius={[4, 4, 0, 0]}
                  animationDuration={600}
                />
              </BarChart>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-[var(--muted-foreground-subtle)]">
                <Users size={32} className="mb-2 opacity-20" />
                <span className="text-[13px] font-medium">No customer growth data available.</span>
              </div>
            )
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
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

  return (
    <div className="h-[160px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={72} paddingAngle={2} stroke="none">
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
          <Tooltip formatter={(value, name) => [tooltipFormatter(Number(value)), String(name)]} />
        </PieChart>
      </ResponsiveContainer>
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
  const [rates, setRates] = useState<MarketRates | null>(null);
  const [ratesLoading, setRatesLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [inventory, setInventory] = useState<{ marketValue: number | null; inStockCount: number } | null>(null);
  const [regionsExplorerOpen, setRegionsExplorerOpen] = useState(false);

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

  /* ---- Fetch market rates ---- */
  const loadRates = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setRatesLoading(true);
    try {
      const res = await fetch(`/api/market-rates?t=${Date.now()}`);
      const data = await res.json();
      if (res.ok) setRates(data);
    } catch (err) {
      console.error("Rates error:", err);
    } finally {
      setRatesLoading(false);
      setRefreshing(false);
    }
  }, []);

  /* ---- Fetch live inventory analytics (not stored in FinancialSnapshot) ---- */
  const loadInventory = useCallback(async () => {
    try {
      const res = await fetch("/api/inventory/analytics", { cache: "no-store" });
      if (res.ok) {
        const d = await res.json();
        setInventory({ marketValue: d.stock.marketValue, inStockCount: d.stock.count });
      }
    } catch (e) {
      console.error("Inventory analytics error:", e);
    }
  }, []);

  useEffect(() => {
    loadSnapshot();
    loadRates();
    loadInventory();
  }, [loadSnapshot, loadRates, loadInventory]);

  const statsToUse = dashboard?.stats || {
    totalCustomers: 0,
    totalActivePledges: 0,
    totalActiveLoanAmount: 0,
    totalReleasedLoanAmount: 0,
    totalBalanceAmount: 0,
  };

  const pledgesToUse = dashboard?.recentPledges || [];

  // No price on record shows nothing. A placeholder rate here would be a made-up
  // number on the one surface whose whole claim is live valuation.
  const goldPriceDisplay = rates?.gold
    ? `₹${(Number(rates.gold.inrPerGram) * 10).toLocaleString("en-IN")} / 10g`
    : "—";
  const silverPriceDisplay = rates?.silver
    ? `₹${Number(rates.silver.inrPerGram).toLocaleString("en-IN", { maximumFractionDigits: 2 })} / g`
    : "—";

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
    <div className="min-h-screen" style={{ backgroundColor: "var(--background)", fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── Greeting ── */}
      <section className="mb-6">
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
            />
          </Suspense>
        )}
      </section>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  Aging table — the spine's tabular companion                */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section className="mb-10">
        <Suspense fallback={<AgingAnalysisSkeleton />}>
          <AgingAnalysisSection />
        </Suspense>
      </section>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  Market Rate Strip                                          */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div
        className="rounded-[14px] mx-0 mb-6 px-5 py-3 flex items-center justify-between"
        style={{
          backgroundColor: "var(--card-alt)",
          border: "1px solid var(--border)",
        }}
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <BarChart3 size={14} style={{ color: "#565C3F" }} />
            <span className="text-[11px] font-bold tracking-wide" style={{ color: "#565C3F" }}>
              Market Rates:
            </span>
          </div>
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#FBBF24" }} />
              <span className="text-[12px] font-semibold" style={{ color: "var(--foreground)" }}>
                Gold: {goldPriceDisplay}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#9CA3AF" }} />
              <span className="text-[12px] font-semibold" style={{ color: "var(--foreground)" }}>
                Silver: {silverPriceDisplay}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={() => loadRates(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors hover:bg-white/60 disabled:opacity-50"
          style={{ color: "var(--muted-foreground)" }}
        >
          <RefreshCw size={11} className={refreshing ? "animate-spin" : ""} />
          REFRESH
        </button>
      </div>

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
                <AnimatedCounter
                  value={statsToUse.totalBalanceAmount || 0}
                  format={formatRupees}
                />
              </span>
              {/* Right divider */}
              <div className="absolute right-0 top-6 bottom-6 w-px bg-[var(--border)]" />
            </div>

            {/* Inventory Value (live) */}
            <div className="flex-1 p-6 flex flex-col items-center justify-center relative">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 size={16} style={{ color: "#565C3F" }} strokeWidth={2.2} />
                <span className="text-[10px] font-bold tracking-wider uppercase" style={{ color: "var(--muted-foreground-subtle)" }}>
                  INVENTORY VALUE
                </span>
              </div>
              <span className="text-[24px] font-bold" style={{ color: "var(--foreground)" }}>
                {inventory && inventory.marketValue !== null
                  ? formatRupees(inventory.marketValue)
                  : "—"}
              </span>
              {/* Right divider */}
              <div className="absolute right-0 top-6 bottom-6 w-px bg-[var(--border)]" />
            </div>

            {/* Items in Stock (live) */}
            <div className="flex-1 p-6 flex flex-col items-center justify-center">
              <div className="flex items-center gap-2 mb-2">
                <Archive size={16} style={{ color: "#565C3F" }} strokeWidth={2.2} />
                <span className="text-[10px] font-bold tracking-wider uppercase" style={{ color: "var(--muted-foreground-subtle)" }}>
                  ITEMS IN STOCK
                </span>
              </div>
              <span className="text-[24px] font-bold" style={{ color: "var(--foreground)" }}>
                {inventory ? inventory.inStockCount.toLocaleString(locale) : "—"}
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
            pledgesToUse.map((p: any, i: number) => {
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

      {/* Font import */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
      `}</style>
    </div>
  );
}