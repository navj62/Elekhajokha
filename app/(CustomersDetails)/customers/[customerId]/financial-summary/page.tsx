"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertCircle, Inbox } from "lucide-react";
import { isOpenPledgeStatus } from "@/lib/pledgeConstants";

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */

// Exact rupees only. Abbreviation hides interest accrual when amounts are
// close, and every figure on this page is one the owner compares.
function rupees(n: number): string {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// Days are the honest unit for a pledge term — a "4 month" label rounds away
// the part-month the interest engine actually charges for.
function formatDuration(days: number): string {
  return `${days.toLocaleString("en-IN")} day${days === 1 ? "" : "s"}`;
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

const TXN_LABEL: Record<string, string> = {
  REPAYMENT_PRINCIPAL: "Principal repayment",
  REPAYMENT_INTEREST: "Interest repayment",
  TOPUP: "Top-up",
};

/* ─────────────────────────────────────────────
   Types (mirrors API response)
───────────────────────────────────────────── */

type RiskTier = "SAFE" | "WATCH" | "AT_RISK" | "CRITICAL";
type PledgeTier = "SAFE" | "WATCH" | "AT_RISK" | "UNDERWATER";

interface OpenPledge {
  id: string;
  name: string;
  pledgeDate: string;
  status: "ACTIVE" | "RELEASED" | "OVERDUE" | "SOLD";
  loanAmount: number;
  amountOwed: number;
  marketValue: number | null;
  ltv: number | null;
  risk: PledgeTier;
  goldWeight: number;
  silverWeight: number;
}

interface Settlement {
  id: string;
  pledgeId: string;
  name: string;
  pledgeDate: string;
  settledOn: string;
  daysHeld: number;
  principal: number;
  interestEarned: number;
  ltvAtRelease: number | null;
  returnPct: number | null;
}

interface SoldItem {
  pledgeId: string;
  inventoryItemId: string | null;
  name: string;
  pledgeDate: string;
  closedOn: string | null;
  amountOwedAt: number | null;
  acquiredCost: number | null;
  netPosition: number | null;
  cashToCustomer: number | null;
  resold: boolean;
}

interface SummaryData {
  customer: {
    name: string;
    region: string | null;
    lifetimeReleasedPledges: number;
  };
  risk: {
    score: number;
    tier: RiskTier;
    worstLtv: number | null;
    longestDaysHeld: number | null;
    daysToUnderwaterWorst: number | null;
  };
  metrics: {
    totalLoanAmount: number;
    totalAmountOwed: number;
    totalGoldWeight: number;
    totalSilverWeight: number;
    activePledges: number;
    overallLTV: number | null;
    totalMarketValue: number;
  };
  realised: {
    principalSettled: number;
    interestEarned: number;
    amountReceived: number;
    returnPct: number | null;
    avgDaysHeld: number | null;
  };
  disposition: {
    open: number;
    released: number;
    sold: number;
    settlementsCovered: number;
  };
  repayments: {
    byType: { type: string; count: number; amount: number }[];
    total: number;
    count: number;
  };
  settlements: Settlement[];
  soldToShop: SoldItem[];
  pledges: OpenPledge[];
}

/* ─────────────────────────────────────────────
   Config
───────────────────────────────────────────── */

/* Risk tiers map onto the shared low/medium/high/critical token ramp:
   low = SAFE, medium = WATCH, high = AT_RISK, critical = UNDERWATER.
   Surfaces carry the fill, -foreground the text — both are defined for light
   and dark in globals.css, so these badges follow the theme. */
/* Customer tiers run SAFE / WATCH / AT_RISK / CRITICAL — a different top end
   from the per-pledge ladder, which ends at UNDERWATER. Both share the ramp. */
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
  ACTIVE:  { bg: "var(--status-active-surface)",  text: "var(--status-active-foreground)" },
  OVERDUE: { bg: "var(--status-overdue-surface)", text: "var(--status-overdue-foreground)" },
};

// Thresholds mirror getRiskTier (≤65 / ≤75 / ≤90) — display only; the tier
// itself is always server-derived.
function ltvColor(ltv: number | null): string {
  if (ltv === null) return "var(--muted-foreground-subtle)";
  if (ltv < 65) return "var(--risk-low-foreground)";
  if (ltv <= 75) return "var(--risk-medium-foreground)";
  if (ltv <= 90) return "var(--risk-high-foreground)";
  return "var(--risk-critical-foreground)";
}

/* ─────────────────────────────────────────────
   Primitives
───────────────────────────────────────────── */

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
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

/**
 * One labelled figure inside a card. Label sits left, figure right, and the
 * qualifier hangs under the figure it qualifies. Keeping the numbers in a
 * single right-aligned column is what makes a card of these scannable —
 * the owner reads down the amounts, not across the labels.
 */
function StatLine({
  label,
  value,
  sub,
  tone,
  last = false,
}: {
  label: string;
  value: string;
  sub?: string | null;
  tone?: string;
  last?: boolean;
}) {
  return (
    <div
      className="flex items-start justify-between gap-6 py-3"
      style={last ? undefined : { borderBottom: "1px solid var(--border)" }}
    >
      <span className="text-[12px] font-medium pt-0.5" style={{ color: "var(--muted-foreground)" }}>
        {label}
      </span>
      <span className="text-right shrink-0">
        <span
          className="block text-[17px] font-bold tabular-nums leading-tight"
          style={{ color: tone ?? "var(--foreground)" }}
        >
          {value}
        </span>
        {sub && (
          <span
            className="block text-[10px] leading-snug mt-0.5"
            style={{ color: "var(--muted-foreground-subtle)" }}
          >
            {sub}
          </span>
        )}
      </span>
    </div>
  );
}

function TableShell({
  label,
  note,
  children,
}: {
  label: string;
  note?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className="rounded-[18px] overflow-hidden"
      style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
    >
      <div className="px-7 py-5" style={{ borderBottom: "1px solid var(--border)" }}>
        <SectionLabel>{label}</SectionLabel>
        {note && (
          <p className="text-[11px] mt-1.5" style={{ color: "var(--muted-foreground-subtle)" }}>
            {note}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}

function Th({ children, align = "left" }: { children: ReactNode; align?: "left" | "right" }) {
  return (
    <th
      className={`px-5 py-3 text-[10px] font-bold tracking-wider uppercase whitespace-nowrap ${
        align === "right" ? "text-right" : "text-left"
      }`}
      style={{ color: "var(--muted-foreground-subtle)" }}
    >
      {children}
    </th>
  );
}

function EmptyRow({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 gap-3">
      <Inbox size={28} style={{ color: "var(--muted-foreground-subtle)", opacity: 0.25 }} />
      <p className="text-[13px] font-medium" style={{ color: "var(--muted-foreground-subtle)" }}>
        {message}
      </p>
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
      <div className="h-12 rounded-[18px] animate-pulse" style={pulse} />
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-72 rounded-[18px] animate-pulse" style={pulse} />
        ))}
      </div>
      <div className="h-64 rounded-[18px] animate-pulse" style={pulse} />
      <div className="h-64 rounded-[18px] animate-pulse" style={pulse} />
    </div>
  );
}

/* ================================================================
   Page
================================================================ */

export default function FinancialSummaryPage() {
  const params = useParams<{ customerId: string }>();
  const router = useRouter();
  const customerId = params?.customerId;

  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) return <Skeleton />;

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

  const { customer, risk, metrics, realised, disposition, repayments, settlements, soldToShop } = data;

  const tierConf = TIER_CONFIG[risk.tier] ?? TIER_CONFIG.WATCH;

  const openPledges = data.pledges.filter(
    (p) => isOpenPledgeStatus(p.status)
  );

  // Weights read as one line under the collateral figure rather than as two
  // more cards — they qualify that number, they are not peers of it.
  const weightSub =
    metrics.totalGoldWeight === 0 && metrics.totalSilverWeight === 0
      ? "no pledged metal"
      : [
          metrics.totalGoldWeight > 0 ? `${metrics.totalGoldWeight}g gold` : null,
          metrics.totalSilverWeight > 0 ? `${metrics.totalSilverWeight}g silver` : null,
        ]
          .filter(Boolean)
          .join(" · ");

  const hasSettlements = settlements.length > 0;
  const settlementGap = disposition.released - disposition.settlementsCovered;

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
              {customer.name}
              {customer.region ? ` · ${customer.region}` : ""}
            </p>
            {/* Disposition is metadata about the relationship, not a figure to
                compare — it belongs on the name, not in cards of its own. */}
            <p className="text-[12px] mt-0.5" style={{ color: "var(--muted-foreground-subtle)" }}>
              {disposition.open} open · {disposition.released} released ·{" "}
              {disposition.sold} sold
            </p>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          The three summary cards

          3-up only at xl. Between lg and xl the sidebar leaves ~684px for
          three cards, which is too narrow for a label and a figure on one
          line: labels wrapped to three lines and the figure column, which
          cannot shrink, pushed its qualifier outside the card border.
      ══════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* ── Risk ── */}
        <Card className="!p-6">
          <SectionLabel>Risk</SectionLabel>
          <div className="flex items-center gap-3 mt-3 mb-1">
            <span className="text-[32px] font-bold tabular-nums leading-none" style={{ color: "var(--foreground)" }}>
              {risk.score}
            </span>
            {/* Tier is named in text as well as coloured — risk must never be
                communicated by colour alone. */}
            <span
              className="text-[11px] font-bold px-2.5 py-1 rounded-full"
              style={{ backgroundColor: tierConf.bg, color: tierConf.text }}
            >
              {tierConf.label}
            </span>
          </div>
          <p className="text-[10px] mb-3" style={{ color: "var(--muted-foreground-subtle)" }}>
            composite score out of 100
          </p>

          <StatLine
            label="Overall LTV"
            value={metrics.overallLTV !== null ? `${metrics.overallLTV.toFixed(1)}%` : "—"}
            tone={ltvColor(metrics.overallLTV)}
          />
          <StatLine
            label="Worst pledge LTV"
            value={risk.worstLtv !== null ? `${risk.worstLtv.toFixed(1)}%` : "—"}
            tone={ltvColor(risk.worstLtv)}
          />
          <StatLine
            label="Longest held"
            value={risk.longestDaysHeld !== null ? formatDuration(risk.longestDaysHeld) : "—"}
            sub="of the open pledges"
            last={risk.daysToUnderwaterWorst === null}
          />
          {/* Only shown when there is something to say. A simple-interest
              estimate, so it is labelled as approximate rather than presented
              as a date the owner can bank on. */}
          {risk.daysToUnderwaterWorst !== null && (
            <StatLine
              label="Nearest underwater"
              value={
                risk.daysToUnderwaterWorst === 0
                  ? "Already"
                  : `~${formatDuration(risk.daysToUnderwaterWorst)}`
              }
              sub="approximate"
              tone={
                risk.daysToUnderwaterWorst === 0
                  ? "var(--risk-critical-foreground)"
                  : risk.daysToUnderwaterWorst <= 90
                  ? "var(--risk-high-foreground)"
                  : undefined
              }
              last
            />
          )}
        </Card>

        {/* ── Open position ── */}
        <Card className="!p-6">
          <SectionLabel>Open position</SectionLabel>
          <div className="mt-3">
            <StatLine
              label="Principal Out"
              value={rupees(metrics.totalLoanAmount)}
              sub={`across ${metrics.activePledges} open pledge${metrics.activePledges === 1 ? "" : "s"}`}
            />
            <StatLine
              label="Amount Owed"
              value={rupees(metrics.totalAmountOwed)}
              sub="incl. accrued interest"
            />
            <StatLine
              label="Collateral Value"
              // A missing metal price is a real state, not a zero.
              value={metrics.totalMarketValue > 0 ? rupees(metrics.totalMarketValue) : "—"}
              sub={weightSub}
            />
            <StatLine
              label="Overall LTV"
              value={metrics.overallLTV !== null ? `${metrics.overallLTV.toFixed(1)}%` : "—"}
              sub={
                metrics.overallLTV !== null
                  ? "owed against collateral"
                  : "no metal price on record"
              }
              tone={ltvColor(metrics.overallLTV)}
              last
            />
          </div>
        </Card>

        {/* ── Realised performance ── */}
        <Card className="!p-6">
          <SectionLabel>Realised performance</SectionLabel>
          <div className="mt-3">
            <StatLine
              label="Interest Earned"
              // "—" not "₹0": nothing settled yet is a different fact from
              // settled and earned nothing.
              value={hasSettlements ? rupees(realised.interestEarned) : "—"}
              sub={
                hasSettlements
                  ? `from ${customer.lifetimeReleasedPledges} settled pledge${
                      customer.lifetimeReleasedPledges === 1 ? "" : "s"
                    }`
                  : "no settled pledges yet"
              }
              tone={hasSettlements ? "var(--primary)" : undefined}
            />
            <StatLine
              label="Return on Principal"
              value={realised.returnPct !== null ? `${realised.returnPct.toFixed(1)}%` : "—"}
              sub="interest ÷ principal advanced"
            />
            <StatLine
              label="Avg Duration"
              value={realised.avgDaysHeld !== null ? formatDuration(realised.avgDaysHeld) : "—"}
              sub="pledge to release"
            />
            <StatLine
              label="Principal Settled"
              value={hasSettlements ? rupees(realised.principalSettled) : "—"}
              sub="returned and closed"
              last
            />
          </div>
        </Card>
      </div>

      {/* ══════════════════════════════════════════════
          Open pledges
      ══════════════════════════════════════════════ */}
      <div className="pt-4">
        <TableShell label="Open pledges">
          {openPledges.length === 0 ? (
            <EmptyRow message="No open pledges." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px] text-left">
                <thead>
                  <tr style={{ backgroundColor: "var(--card-alt)", borderBottom: "1px solid var(--border)" }}>
                    <Th>Item</Th>
                    <Th>Pledged</Th>
                    <Th align="right">Principal</Th>
                    <Th align="right">Owed</Th>
                    <Th align="right">Collateral</Th>
                    <Th align="right">LTV</Th>
                    <Th>Risk</Th>
                    <Th>Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {openPledges.map((p) => {
                    const tier = PLEDGE_TIER_CONFIG[p.risk];
                    const statusStyle = STATUS_STYLE[p.status] ?? STATUS_STYLE.ACTIVE;
                    return (
                      <tr key={p.id} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td className="px-5 py-4 font-medium whitespace-nowrap" style={{ color: "var(--foreground)" }}>
                          {p.name}
                          <div className="text-[11px] font-normal mt-0.5" style={{ color: "var(--muted-foreground-subtle)" }}>
                            {metalLabel(p.goldWeight, p.silverWeight)}
                          </div>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap" style={{ color: "var(--muted-foreground)" }}>
                          {formatDate(p.pledgeDate)}
                        </td>
                        <td className="px-5 py-4 tabular-nums text-right" style={{ color: "var(--muted-foreground)" }}>
                          {rupees(p.loanAmount)}
                        </td>
                        <td className="px-5 py-4 tabular-nums text-right font-medium" style={{ color: "var(--foreground)" }}>
                          {rupees(p.amountOwed)}
                        </td>
                        <td className="px-5 py-4 tabular-nums text-right" style={{ color: "var(--muted-foreground)" }}>
                          {p.marketValue !== null ? (
                            rupees(p.marketValue)
                          ) : (
                            <span style={{ color: "var(--muted-foreground-subtle)" }}>—</span>
                          )}
                        </td>
                        <td className="px-5 py-4 tabular-nums text-right font-semibold">
                          {p.ltv !== null ? (
                            <span style={{ color: ltvColor(p.ltv) }}>{p.ltv.toFixed(1)}%</span>
                          ) : (
                            <span style={{ color: "var(--muted-foreground-subtle)" }}>—</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          {p.ltv === null || !tier ? (
                            <span style={{ color: "var(--muted-foreground-subtle)" }}>—</span>
                          ) : (
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
                              style={{ backgroundColor: tier.bg, color: tier.text }}
                            >
                              {tier.label}
                            </span>
                          )}
                        </td>
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
        </TableShell>
      </div>

      {/* ══════════════════════════════════════════════
          Settlement history
      ══════════════════════════════════════════════ */}
      <TableShell
        label="Settlement history"
        note={
          // Say it plainly when the table cannot account for every release,
          // rather than letting the totals imply full coverage.
          settlementGap > 0
            ? `${settlementGap} earlier release${settlementGap === 1 ? "" : "s"} has no settlement record and is not counted in the figures above.`
            : null
        }
      >
        {!hasSettlements ? (
          <EmptyRow message="No pledges settled yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] text-left">
              <thead>
                <tr style={{ backgroundColor: "var(--card-alt)", borderBottom: "1px solid var(--border)" }}>
                  <Th>Item</Th>
                  <Th>Pledged</Th>
                  <Th>Settled</Th>
                  <Th align="right">Held</Th>
                  <Th align="right">Principal</Th>
                  <Th align="right">Interest Earned</Th>
                  <Th align="right">Return</Th>
                  <Th align="right">LTV at Release</Th>
                </tr>
              </thead>
              <tbody>
                {settlements.map((s) => (
                  <tr key={s.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td className="px-5 py-4 font-medium whitespace-nowrap">
                      <Link
                        href={`/customers/${customerId}/pledges/${s.pledgeId}`}
                        className="hover:underline underline-offset-2"
                        style={{ color: "var(--foreground)" }}
                      >
                        {s.name}
                      </Link>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap" style={{ color: "var(--muted-foreground)" }}>
                      {formatDate(s.pledgeDate)}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap" style={{ color: "var(--muted-foreground)" }}>
                      {formatDate(s.settledOn)}
                    </td>
                    <td className="px-5 py-4 tabular-nums text-right whitespace-nowrap" style={{ color: "var(--muted-foreground)" }}>
                      {formatDuration(s.daysHeld)}
                    </td>
                    <td className="px-5 py-4 tabular-nums text-right" style={{ color: "var(--muted-foreground)" }}>
                      {rupees(s.principal)}
                    </td>
                    <td className="px-5 py-4 tabular-nums text-right font-semibold" style={{ color: "var(--primary)" }}>
                      {rupees(s.interestEarned)}
                    </td>
                    <td className="px-5 py-4 tabular-nums text-right font-medium" style={{ color: "var(--foreground)" }}>
                      {s.returnPct !== null ? `${s.returnPct.toFixed(1)}%` : "—"}
                    </td>
                    <td className="px-5 py-4 tabular-nums text-right" style={{ color: ltvColor(s.ltvAtRelease) }}>
                      {s.ltvAtRelease !== null ? `${s.ltvAtRelease.toFixed(1)}%` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </TableShell>

      {/* ══════════════════════════════════════════════
          Sold to shop (only when it happened)
      ══════════════════════════════════════════════ */}
      {soldToShop.length > 0 && (
        <TableShell
          label="Sold to shop"
          note={
            <>
              Acquisition cost is the shop&apos;s cost basis, not the cash handed over.{" "}
              <Link
                href="/inventory"
                className="font-medium underline underline-offset-2"
                style={{ color: "var(--primary)" }}
              >
                View in Inventory →
              </Link>
            </>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] text-left">
              <thead>
                <tr style={{ backgroundColor: "var(--card-alt)", borderBottom: "1px solid var(--border)" }}>
                  <Th>Item</Th>
                  <Th>Pledged</Th>
                  <Th>Closed</Th>
                  <Th align="right">Amount Owed</Th>
                  <Th align="right">Acquisition Cost</Th>
                  <Th align="right">Cash Paid</Th>
                  <Th align="right">Net Position</Th>
                  <Th>Inventory</Th>
                </tr>
              </thead>
              <tbody>
                {soldToShop.map((s) => (
                  <tr key={s.pledgeId} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td className="px-5 py-4 font-medium whitespace-nowrap">
                      <Link
                        href={`/customers/${customerId}/pledges/${s.pledgeId}`}
                        className="hover:underline underline-offset-2"
                        style={{ color: "var(--foreground)" }}
                      >
                        {s.name}
                      </Link>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap" style={{ color: "var(--muted-foreground)" }}>
                      {formatDate(s.pledgeDate)}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap" style={{ color: "var(--muted-foreground)" }}>
                      {s.closedOn ? formatDate(s.closedOn) : "—"}
                    </td>
                    <td className="px-5 py-4 tabular-nums text-right" style={{ color: "var(--muted-foreground)" }}>
                      {s.amountOwedAt !== null ? rupees(s.amountOwedAt) : "—"}
                    </td>
                    <td className="px-5 py-4 tabular-nums text-right" style={{ color: "var(--foreground)" }}>
                      {s.acquiredCost !== null ? rupees(s.acquiredCost) : "—"}
                    </td>
                    <td className="px-5 py-4 tabular-nums text-right" style={{ color: "var(--muted-foreground)" }}>
                      {s.cashToCustomer !== null ? rupees(s.cashToCustomer) : "—"}
                    </td>
                    <td
                      className="px-5 py-4 tabular-nums text-right font-semibold"
                      style={{
                        color:
                          s.netPosition === null
                            ? "var(--muted-foreground-subtle)"
                            : s.netPosition < 0
                            ? "var(--risk-critical-foreground)"
                            : "var(--foreground)",
                      }}
                    >
                      {s.netPosition !== null ? rupees(s.netPosition) : "—"}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      {s.inventoryItemId ? (
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={
                            s.resold
                              ? {
                                  backgroundColor: "var(--status-sold-surface)",
                                  color: "var(--status-sold-foreground)",
                                }
                              : {
                                  backgroundColor: "var(--status-active-surface)",
                                  color: "var(--status-active-foreground)",
                                }
                          }
                        >
                          {s.resold ? "RESOLD" : "IN STOCK"}
                        </span>
                      ) : (
                        <span style={{ color: "var(--muted-foreground-subtle)" }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TableShell>
      )}

      {/* ══════════════════════════════════════════════
          Repayments received (only when any exist)
      ══════════════════════════════════════════════ */}
      {repayments.count > 0 && (
        <TableShell
          label="Repayments received"
          note="Recorded receipts against open pledges. These are a ledger — they do not reduce the amount owed above."
        >
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] text-left">
              <thead>
                <tr style={{ backgroundColor: "var(--card-alt)", borderBottom: "1px solid var(--border)" }}>
                  <Th>Type</Th>
                  <Th align="right">Entries</Th>
                  <Th align="right">Amount</Th>
                </tr>
              </thead>
              <tbody>
                {repayments.byType.map((r) => (
                  <tr key={r.type} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td className="px-5 py-4 font-medium" style={{ color: "var(--foreground)" }}>
                      {TXN_LABEL[r.type] ?? r.type}
                    </td>
                    <td className="px-5 py-4 tabular-nums text-right" style={{ color: "var(--muted-foreground)" }}>
                      {r.count.toLocaleString("en-IN")}
                    </td>
                    <td className="px-5 py-4 tabular-nums text-right font-medium" style={{ color: "var(--foreground)" }}>
                      {rupees(r.amount)}
                    </td>
                  </tr>
                ))}
                <tr style={{ backgroundColor: "var(--card-alt)" }}>
                  <td className="px-5 py-3 text-[11px] font-bold tracking-wider uppercase" style={{ color: "var(--muted-foreground-subtle)" }}>
                    Total
                  </td>
                  <td className="px-5 py-3 tabular-nums text-right text-[11px] font-bold" style={{ color: "var(--muted-foreground-subtle)" }}>
                    {repayments.count.toLocaleString("en-IN")}
                  </td>
                  <td className="px-5 py-3 tabular-nums text-right font-bold" style={{ color: "var(--foreground)" }}>
                    {rupees(repayments.total)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </TableShell>
      )}
    </div>
  );
}
