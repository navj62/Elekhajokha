"use client";

// Portfolio exposure, stated as the relationship it actually is: what the book
// is owed, against what the metal behind it is worth. The LTV is that ratio, so
// both figures are shown rather than a single headline number.
//
// Every figure here is the risk cron's, not live — the freshness stamp says so
// in the same breath. Stale figures and live prices are never mixed into one
// register (the live rate strip lives elsewhere on the page and is labelled).

import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { getRiskTier } from "@/lib/calculateLTV";
import { tierOf, inr, type RiskTier } from "./tier";

interface Props {
  overallLtv: number | null;
  totalAmountOwed: number;
  totalMarketValue: number;
  ltvChange: number | null;
  calculatedAt: string;
  tierCounts: {
    safe: number;
    watch: number;
    atRisk: number;
    underwater: number;
  };
}

const TALLY: { key: keyof Props["tierCounts"]; tier: RiskTier }[] = [
  { key: "safe", tier: "SAFE" },
  { key: "watch", tier: "WATCH" },
  { key: "atRisk", tier: "AT_RISK" },
  { key: "underwater", tier: "UNDERWATER" },
];

function freshness(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    day: "numeric",
    month: "short",
  });
}

export function ExposureHeader({
  overallLtv,
  totalAmountOwed,
  totalMarketValue,
  ltvChange,
  calculatedAt,
  tierCounts,
}: Props) {
  const tier = overallLtv === null ? null : tierOf(getRiskTier(overallLtv));

  // For LTV, up is worse: more owed against the same metal.
  const rising = ltvChange !== null && ltvChange > 0;
  const falling = ltvChange !== null && ltvChange < 0;
  const DeltaIcon = rising ? ArrowUpRight : falling ? ArrowDownRight : Minus;
  const deltaColor = rising
    ? "var(--risk-critical-foreground)"
    : falling
      ? "var(--risk-low-foreground)"
      : "var(--muted-foreground-subtle)";

  return (
    <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
      {/* ── The ratio ───────────────────────────────────────────── */}
      <div className="min-w-0">
        <div className="flex items-baseline gap-3 flex-wrap">
          <span
            className="text-[46px] leading-none font-bold tabular-nums tracking-tight"
            // The -foreground token, not the solid tier colour: the solid
            // medium/high values sit near 2.3:1 on the light ground, under the
            // 3:1 floor for large text.
            style={{ color: tier ? tier.foreground : "var(--muted-foreground-subtle)" }}
          >
            {overallLtv === null ? "—" : `${overallLtv.toFixed(1)}%`}
          </span>
          <span className="text-[15px] font-medium" style={{ color: "var(--muted-foreground)" }}>
            loan-to-value
          </span>

          {ltvChange !== null && (
            <span
              className="inline-flex items-center gap-1 text-[13px] font-semibold tabular-nums"
              style={{ color: deltaColor }}
            >
              <DeltaIcon size={15} strokeWidth={2.4} aria-hidden />
              {ltvChange > 0 ? "+" : ""}
              {ltvChange.toFixed(1)} since yesterday
            </span>
          )}
        </div>

        <p className="text-[14px] mt-3" style={{ color: "var(--foreground)" }}>
          <span className="font-semibold tabular-nums">{inr(totalAmountOwed)}</span>
          <span style={{ color: "var(--muted-foreground)" }}> owed against </span>
          <span className="font-semibold tabular-nums">{inr(totalMarketValue)}</span>
          <span style={{ color: "var(--muted-foreground)" }}> of metal held</span>
        </p>

        <p className="text-[12px] mt-1.5" style={{ color: "var(--muted-foreground-subtle)" }}>
          Valued {freshness(calculatedAt)}
        </p>
      </div>

      {/* ── Tier tally ──────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        {TALLY.map(({ key, tier: t }) => {
          const presentation = tierOf(t);
          const { Icon } = presentation;
          const count = tierCounts[key];

          return (
            <div
              key={key}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2"
              style={{ backgroundColor: presentation.surface, color: presentation.foreground }}
            >
              <Icon size={14} strokeWidth={2.4} aria-hidden />
              <span className="text-[16px] font-bold tabular-nums">{count}</span>
              <span className="text-[12px] font-medium">{presentation.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
