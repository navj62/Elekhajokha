"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, AlertCircle, Inbox } from "lucide-react";

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */

// Exact rupees only. Abbreviation hides interest accrual when amounts are
// close, and every figure on this page is one the owner compares.
function formatExact(n: number): string {
  return Math.round(n).toLocaleString("en-IN");
}

/* ─────────────────────────────────────────────
   Types (mirrors API response)
───────────────────────────────────────────── */

type RiskTier   = "SAFE" | "WATCH" | "AT_RISK" | "CRITICAL";
type TTUStatus  = "underwater" | "soon" | "ok" | "unknown" | "released";
type PledgeTier = "SAFE" | "WATCH" | "AT_RISK" | "UNDERWATER";

interface TimeToUnderwater {
  days:   number | null;
  label:  string;
  status: TTUStatus;
}

interface ProcessedPledge {
  id:               string;
  name:             string;
  pledgeDate:       string;
  status:           "ACTIVE" | "RELEASED" | "OVERDUE" | "SOLD";
  loanAmount:       number;
  amountOwed:       number;
  marketValue:      number | null;
  ltv:              number | null;
  risk:             PledgeTier;
  goldWeight:       number;
  silverWeight:     number;
  timeToUnderwater: TimeToUnderwater;
}

// Human label for which metals a pledge actually holds (handles mixed pledges).
function metalLabel(goldWeight: number, silverWeight: number): string {
  const hasGold = goldWeight > 0;
  const hasSilver = silverWeight > 0;
  if (hasGold && hasSilver) return "Gold + Silver";
  if (hasGold) return "Gold";
  if (hasSilver) return "Silver";
  return "—";
}

interface Alert {
  pledgeId:   string;
  pledgeName: string;
  risk:       string;
  message:    string;
}

interface SummaryData {
  customer: {
    id:                string;
    name:              string;
    region:            string | null;
    riskScore:         number;
    riskTier:          RiskTier;
    riskBreakdown:     {
      ltv:              number;
      velocity:         number;
      timeToUnderwater: number;
      concentration:    number;
      age:              number;
    };
    lifetimeInterestEarned:  number;
    lifetimeReleasedPledges: number;
  };
  metrics: {
    totalLoanAmount:   number;
    totalAmountOwed:   number;
    totalGoldWeight:   number;
    totalSilverWeight: number;
    activePledges:     number;
    releasedPledges:   number;
    underwaterPledges: number;
    overallLTV:        number | null;
    totalMarketValue:  number;
    estimatedCoverage: number | null;
  };
  pledges: ProcessedPledge[];
  alerts:  Alert[];
}

/* ─────────────────────────────────────────────
   Config
───────────────────────────────────────────── */

/* Risk tiers map onto the shared low/medium/high/critical token ramp:
   low = SAFE, medium = WATCH, high = AT_RISK, critical = UNDERWATER/CRITICAL.
   Surfaces carry the fill, -foreground the text — both are defined for light
   and dark in globals.css, so these badges follow the theme. */
const TIER_CONFIG: Record<RiskTier, { label: string; bg: string; text: string }> = {
  SAFE:     { label: "Safe",     bg: "var(--risk-low-surface)",      text: "var(--risk-low-foreground)" },
  WATCH:    { label: "Watch",    bg: "var(--risk-medium-surface)",   text: "var(--risk-medium-foreground)" },
  AT_RISK:  { label: "At Risk",  bg: "var(--risk-high-surface)",     text: "var(--risk-high-foreground)" },
  CRITICAL: { label: "Critical", bg: "var(--risk-critical-surface)", text: "var(--risk-critical-foreground)" },
};

const PLEDGE_TIER_CONFIG: Record<PledgeTier, { label: string; bg: string; text: string }> = {
  SAFE:       { label: "Safe",       bg: "var(--risk-low-surface)",      text: "var(--risk-low-foreground)" },
  WATCH:      { label: "Watch",      bg: "var(--risk-medium-surface)",   text: "var(--risk-medium-foreground)" },
  AT_RISK:    { label: "At Risk",    bg: "var(--risk-high-surface)",     text: "var(--risk-high-foreground)" },
  UNDERWATER: { label: "Underwater", bg: "var(--risk-critical-surface)", text: "var(--risk-critical-foreground)" },
};

/* OVERDUE is not a status this page builds new UI around, but the entry stays:
   dropping it would fall through to the ACTIVE style and silently mislabel a
   real overdue row as active. */
const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  ACTIVE:   { bg: "var(--status-active-surface)",   text: "var(--status-active-foreground)" },
  OVERDUE:  { bg: "var(--status-overdue-surface)",  text: "var(--status-overdue-foreground)" },
  RELEASED: { bg: "var(--status-released-surface)", text: "var(--status-released-foreground)" },
};

// Thresholds mirror getRiskTier (≤65 / ≤75 / ≤90) — display only; the tier
// itself is always server-derived.
function ltvColor(ltv: number | null, status: string): string {
  if (status === "RELEASED" || ltv === null) return "var(--muted-foreground-subtle)";
  if (ltv < 65)  return "var(--risk-low-foreground)";
  if (ltv <= 75) return "var(--risk-medium-foreground)";
  if (ltv <= 90) return "var(--risk-high-foreground)";
  return "var(--risk-critical-foreground)";
}

function ttuColor(status: TTUStatus): string {
  if (status === "underwater") return "var(--risk-critical-foreground)";
  if (status === "soon")       return "var(--risk-high-foreground)";
  if (status === "ok")         return "var(--foreground)";
  return "var(--muted-foreground-subtle)";
}

// Dots are non-text marks, so they take the accent tokens rather than the
// -foreground text variants.
function alertDotColor(risk: string): string {
  if (risk === "UNDERWATER") return "var(--risk-critical)";
  if (risk === "AT_RISK")    return "var(--risk-high)";
  return "var(--risk-medium)";
}

/* ─────────────────────────────────────────────
   LTV Arc gauge (preserved from original)
───────────────────────────────────────────── */

function LTVArc({ pct }: { pct: number }) {
  const r = 60, cx = 90, cy = 90;
  const start = -210;
  const end   = start + Math.min(pct / 100, 1) * 240;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const arc   = (a: number) =>
    `${cx + r * Math.cos(toRad(a))},${cy + r * Math.sin(toRad(a))}`;
  const large = end - start > 180 ? 1 : 0;

  return (
    <div className="relative w-[180px] h-[110px] mx-auto">
      <svg width={180} height={110} viewBox="0 0 180 110">
        <path
          d={`M ${arc(start)} A ${r} ${r} 0 1 1 ${arc(start + 240)}`}
          fill="none" stroke="var(--border)" strokeWidth={12} strokeLinecap="round"
        />
        <path
          d={`M ${arc(start)} A ${r} ${r} 0 ${large} 1 ${arc(end)}`}
          fill="none" stroke="var(--primary)" strokeWidth={12} strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-3">
        <div className="text-[36px] font-semibold leading-none tracking-tight" style={{ color: "var(--foreground)" }}>
          {(pct ?? 0).toFixed(1)}
          <span className="text-[20px] font-medium ml-0.5" style={{ color: "var(--muted-foreground-subtle)" }}>%</span>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Skeleton
───────────────────────────────────────────── */

function Skeleton() {
  const pulse = { backgroundColor: "var(--border)" };
  return (
    <div className="max-w-[1200px] mx-auto pb-16 mt-4 space-y-4">
      <div className="h-10 rounded-[18px] animate-pulse" style={pulse} />
      <div className="grid grid-cols-1 lg:grid-cols-[60fr_40fr] gap-4">
        <div className="h-48 rounded-[18px] animate-pulse" style={pulse} />
        <div className="h-48 rounded-[18px] animate-pulse" style={pulse} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-24 rounded-[18px] animate-pulse" style={pulse} />
        ))}
      </div>
      <div className="h-72 rounded-[18px] animate-pulse" style={pulse} />
      <div className="h-40 rounded-[18px] animate-pulse" style={pulse} />
    </div>
  );
}

/* ─────────────────────────────────────────────
   Primitives
───────────────────────────────────────────── */

function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[18px] p-7 ${className}`}
      style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
    >
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p
      className="text-[10px] font-bold tracking-wider uppercase"
      style={{ color: "var(--muted-foreground-subtle)" }}
    >
      {children}
    </p>
  );
}

/* ================================================================
   Page
================================================================ */

export default function FinancialSummaryPage() {
  const params     = useParams<{ customerId: string }>();
  const router     = useRouter();
  const customerId = params?.customerId;

  const [data,         setData]         = useState<SummaryData | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [whyOpen,      setWhyOpen]      = useState(false);
  const [showReleased, setShowReleased] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/customers/${customerId}/financial-summary`);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? `Failed to load (${res.status})`);
      }
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load financial summary.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (customerId) load();
  }, [customerId]);

  /* ── Loading ── */
  if (loading) return <Skeleton />;

  /* ── Error ── */
  if (error || !data) {
    return (
      <div className="max-w-[1200px] mx-auto mt-4">
        <Card className="flex flex-col items-center justify-center py-16 gap-4">
          <AlertCircle size={32} style={{ color: "var(--muted-foreground-subtle)", opacity: 0.4 }} />
          <p className="text-[13px] font-medium" style={{ color: "var(--muted-foreground-subtle)" }}>
            Could not load financial summary.
          </p>
          <button
            onClick={load}
            className="text-[13px] underline underline-offset-2 font-medium"
            style={{ color: "var(--primary)" }}
          >
            Try again
          </button>
        </Card>
      </div>
    );
  }

  const { customer, metrics, pledges, alerts } = data;
  const tierConf      = TIER_CONFIG[customer.riskTier] ?? TIER_CONFIG.WATCH;
  const bd            = customer.riskBreakdown;
  const breakdownSum  = (bd.ltv + bd.velocity + bd.timeToUnderwater + bd.concentration + bd.age).toFixed(1);

  const activePledges   = pledges.filter((p) => p.status === "ACTIVE" || p.status === "OVERDUE");
  const releasedPledges = pledges.filter((p) => p.status === "RELEASED");
  const visiblePledges  = showReleased
    ? [...activePledges, ...releasedPledges]
    : activePledges;

  /* ── Render ── */
  return (
    <div className="max-w-[1200px] mx-auto pb-16 mt-4 space-y-4">

      {/* ── PAGE HEADER ── */}
      <div className="mb-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center w-9 h-9 rounded-full shrink-0 transition-colors"
            style={{ backgroundColor: "var(--accent)", color: "var(--accent-foreground)" }}
            aria-label="Go back"
          >
            <ArrowLeft size={16} strokeWidth={2.5} />
          </button>
          <div>
            <h1
              className="text-[22px] font-semibold tracking-tight leading-tight"
              style={{ color: "var(--foreground)" }}
            >
              Financial Summary
            </h1>
            <p className="text-[12px]" style={{ color: "var(--muted-foreground-subtle)" }}>
              Risk &amp; exposure overview
            </p>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          SECTION 1 — Header: two cards
      ══════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-[60fr_40fr] gap-4">

        {/* Left: customer identity + composite risk score */}
        <Card>
          <p className="text-2xl font-semibold mb-0.5" style={{ color: "var(--foreground)" }}>
            {customer.name}
          </p>
          <p className="text-sm mb-6" style={{ color: "var(--muted-foreground-subtle)" }}>
            {customer.region ?? "Location unknown"}
          </p>

          {/* Score + tier badge */}
          <div className="flex items-center gap-4 mb-4">
            <span
              className="text-5xl font-bold tabular-nums leading-none"
              style={{ color: "var(--foreground)" }}
            >
              {customer.riskScore}
            </span>
            <span
              className="text-[12px] font-bold px-3 py-1 rounded-full"
              style={{ backgroundColor: tierConf.bg, color: tierConf.text }}
            >
              {tierConf.label}
            </span>
          </div>

          {/* Collapsible "Why this score?" */}
          <div>
            <button
              onClick={() => setWhyOpen((o) => !o)}
              className="flex items-center gap-1 text-[12px] font-medium"
              style={{ color: "var(--primary)" }}
            >
              Why this score?
              <span
                className="transition-transform duration-200 inline-block"
                style={{ transform: whyOpen ? "rotate(180deg)" : "rotate(0deg)" }}
              >
                ▾
              </span>
            </button>

            {whyOpen && (
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
                {(
                  [
                    { key: "LTV",                label: "LTV",                value: bd.ltv },
                    { key: "Velocity",           label: "Velocity",           value: bd.velocity },
                    { key: "TimeToUnderwater",   label: "Time-to-Underwater", value: bd.timeToUnderwater },
                    { key: "Concentration",      label: "Concentration",      value: bd.concentration },
                    { key: "Age",                label: "Age",                value: bd.age },
                  ] as const
                ).map(({ key, label, value }) => (
                  <span key={key} className="text-[11px]" style={{ color: "var(--muted-foreground-subtle)" }}>
                    {label}{" "}
                    <span className="font-semibold" style={{ color: "var(--muted-foreground)" }}>
                      {value.toFixed(1)}
                    </span>
                  </span>
                ))}
                <span className="text-[11px]" style={{ color: "var(--muted-foreground-subtle)" }}>
                  ={" "}
                  <span className="font-semibold" style={{ color: "var(--muted-foreground)" }}>
                    ~{breakdownSum}
                  </span>
                </span>
              </div>
            )}
          </div>
        </Card>

        {/* Right: LTV arc gauge + coverage */}
        <Card className="flex flex-col items-center justify-center text-center">
          <SectionLabel>Overall Portfolio LTV</SectionLabel>
          <div className="mt-4 mb-2">
            <LTVArc pct={metrics.overallLTV ?? 0} />
          </div>
          <p
            className="text-3xl font-bold tabular-nums mt-4"
            style={{ color: "var(--foreground)" }}
          >
            {metrics.estimatedCoverage !== null
              ? `${metrics.estimatedCoverage.toFixed(1)}%`
              : "—"}
          </p>
          <p className="text-[12px] mt-0.5" style={{ color: "var(--muted-foreground-subtle)" }}>
            of amount owed
          </p>
          <p className="text-[11px] mt-3 px-2" style={{ color: "var(--muted-foreground-subtle)" }}>
            {(metrics.overallLTV ?? 0).toFixed(1)}% LTV · coverage of ₹{formatExact(metrics.totalAmountOwed)}
          </p>
        </Card>
      </div>

      {/* ══════════════════════════════════════════════
          SECTION 2 — KPI Strip
      ══════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
        {(
          [
            {
              key:   "loan",
              label: "Loan Amount",
              value: "₹" + Math.round(metrics.totalLoanAmount).toLocaleString("en-IN"),
              sub:   null,
              red:   false,
              color: null,
            },
            {
              key:   "owed",
              label: "Total Owed",
              value: "₹" + Math.round(metrics.totalAmountOwed).toLocaleString("en-IN"),
              sub:   "incl. accrued interest",
              red:   false,
              color: null,
            },
            {
              key:   "pledges",
              label: "Active Pledges",
              value: String(metrics.activePledges),
              sub:   null,
              red:   false,
              color: null,
            },
            {
              key:   "gold",
              label: "Gold Weight",
              value: `${metrics.totalGoldWeight}g`,
              sub:   null,
              red:   false,
              color: null,
            },
            {
              key:   "silver",
              label: "Silver Weight",
              value: `${metrics.totalSilverWeight}g`,
              sub:   null,
              red:   false,
              color: null,
            },
            {
              key:   "underwater",
              label: "Underwater",
              value: String(metrics.underwaterPledges),
              sub:   null,
              red:   metrics.underwaterPledges > 0,
              color: null,
            },
            {
              key:   "interest",
              label: "Interest Earned",
              // EXACT (not abbreviated) — this is the most meaningful number
              // on the page for evaluating customer profitability.
              // Show "—" when nothing has been redeemed yet (≠ "₹0").
              value:
                customer.lifetimeReleasedPledges === 0
                  ? "—"
                  : "₹" +
                    Math.round(customer.lifetimeInterestEarned).toLocaleString("en-IN"),
              sub:
                customer.lifetimeReleasedPledges === 0
                  ? "no released pledges yet"
                  : `from ${customer.lifetimeReleasedPledges} released pledge${
                      customer.lifetimeReleasedPledges === 1 ? "" : "s"
                    }`,
              red:   false,
              color: customer.lifetimeReleasedPledges === 0 ? null : "var(--primary)",
            },
          ] as const
        ).map(({ key, label, value, sub, red, color }) => (
          <Card key={key} className="flex flex-col gap-1 !p-5">
            <SectionLabel>{label}</SectionLabel>
            <p
              className="text-2xl font-bold tabular-nums"
              style={{
                color: color ?? (red ? "var(--risk-critical-foreground)" : "var(--foreground)"),
              }}
            >
              {value}
            </p>
            {sub && (
              <p className="text-[10px]" style={{ color: "var(--muted-foreground-subtle)" }}>
                {sub}
              </p>
            )}
          </Card>
        ))}
      </div>

      {/* ══════════════════════════════════════════════
          SECTION 3 — Active Pledges Table
      ══════════════════════════════════════════════ */}
      <div
        className="rounded-[18px] overflow-hidden"
        style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
      >
        {/* Table toolbar */}
        <div
          className="flex items-center justify-between px-7 py-5"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <SectionLabel>Active Pledges</SectionLabel>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div
              className="relative w-8 h-4 rounded-full transition-colors"
              style={{ backgroundColor: showReleased ? "var(--primary)" : "var(--border)" }}
              onClick={() => setShowReleased((v) => !v)}
            >
              <div
                className="absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all"
                style={{ left: showReleased ? "18px" : "2px" }}
              />
            </div>
            <span className="text-[11px] font-medium" style={{ color: "var(--muted-foreground-subtle)" }}>
              Show released
            </span>
          </label>
        </div>

        {/* Empty state */}
        {activePledges.length === 0 && !showReleased ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Inbox size={32} style={{ color: "var(--muted-foreground-subtle)", opacity: 0.2 }} />
            <p className="text-[13px] font-medium" style={{ color: "var(--muted-foreground-subtle)" }}>
              No active pledges.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] text-left">
              <thead>
                <tr style={{ backgroundColor: "var(--card-alt)", borderBottom: "1px solid var(--border)" }}>
                  {["Asset", "Principal", "Owed", "Market Value", "LTV", "Risk", "Time to Underwater", "Status"].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-[10px] font-bold tracking-wider uppercase whitespace-nowrap"
                      style={{ color: "var(--muted-foreground-subtle)" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visiblePledges.map((p) => {
                  const isReleased  = p.status === "RELEASED";
                  const pledgeTier  = PLEDGE_TIER_CONFIG[p.risk as PledgeTier];
                  const ltvDisplay  = isReleased || p.ltv === null ? null : p.ltv;
                  const statusStyle = STATUS_STYLE[p.status] ?? STATUS_STYLE.ACTIVE;

                  return (
                    <tr
                      key={p.id}
                      className={isReleased ? "opacity-60" : ""}
                      style={{ borderBottom: "1px solid var(--border)" }}
                    >
                      {/* Asset */}
                      <td className="px-5 py-4 font-medium whitespace-nowrap" style={{ color: "var(--foreground)" }}>
                        {p.name}
                        <div className="text-[11px] font-normal mt-0.5" style={{ color: "var(--muted-foreground-subtle)" }}>
                          {metalLabel(p.goldWeight, p.silverWeight)}
                        </div>
                      </td>

                      {/* Principal */}
                      <td className="px-5 py-4 tabular-nums" style={{ color: "var(--muted-foreground)" }}>
                        ₹{Math.round(p.loanAmount).toLocaleString("en-IN")}
                      </td>

                      {/* Owed */}
                      <td className="px-5 py-4 tabular-nums font-medium" style={{ color: "var(--foreground)" }}>
                        ₹{Math.round(p.amountOwed).toLocaleString("en-IN")}
                      </td>

                      {/* Market Value */}
                      <td className="px-5 py-4 tabular-nums" style={{ color: "var(--muted-foreground)" }}>
                        {p.marketValue !== null
                          ? `₹${Math.round(p.marketValue).toLocaleString("en-IN")}`
                          : <span style={{ color: "var(--muted-foreground-subtle)" }}>—</span>}
                      </td>

                      {/* LTV */}
                      <td className="px-5 py-4 tabular-nums font-semibold">
                        {ltvDisplay !== null ? (
                          <span style={{ color: ltvColor(ltvDisplay, p.status) }}>
                            {ltvDisplay.toFixed(1)}%
                          </span>
                        ) : (
                          <span style={{ color: "var(--muted-foreground-subtle)" }}>—</span>
                        )}
                      </td>

                      {/* Risk */}
                      <td className="px-5 py-4">
                        {isReleased || !pledgeTier ? (
                          <span style={{ color: "var(--muted-foreground-subtle)" }}>—</span>
                        ) : (
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
                            style={{ backgroundColor: pledgeTier.bg, color: pledgeTier.text }}
                          >
                            {pledgeTier.label}
                          </span>
                        )}
                      </td>

                      {/* Time to Underwater — label used directly, no reformatting */}
                      <td className="px-5 py-4 whitespace-nowrap font-medium">
                        <span style={{ color: ttuColor(p.timeToUnderwater.status) }}>
                          {p.timeToUnderwater.label}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}
                        >
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════
          SECTION 4 — Risk Alerts (conditional)
      ══════════════════════════════════════════════ */}
      {alerts.length > 0 && (
        <Card>
          <SectionLabel>Risk Alerts</SectionLabel>
          <div className="mt-5 space-y-3">
            {alerts.map((alert, i) => (
              <div
                key={`${alert.pledgeId}-${i}`}
                className="flex items-start gap-3 p-4 rounded-[12px]"
                style={{
                  backgroundColor: "var(--card-alt)",
                  border: "1px solid var(--border)",
                }}
              >
                {/* Severity dot */}
                <div
                  className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                  style={{ backgroundColor: alertDotColor(alert.risk) }}
                />
                <div>
                  <p className="text-[13px] font-medium" style={{ color: "var(--foreground)" }}>
                    {alert.pledgeName}
                  </p>
                  <p className="text-[12px] mt-0.5 leading-relaxed" style={{ color: "var(--muted-foreground-subtle)" }}>
                    {alert.message}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

    </div>
  );
}
