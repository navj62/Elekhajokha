"use client";

// The aging spine — the dashboard's organizing structure.
//
// Time runs left to right across the active loan book. Position encodes age,
// segment width encodes money at stake (owed, not pledge count — three pledges
// holding ₹8L outweigh forty holding ₹40k), and fill encodes the bucket's risk
// tier. Selecting a segment is the page's only filter control.
//
// The five buckets ALWAYS render, including empty ones: the segments are a time
// axis, and an axis with gaps in it stops meaning age. Empty buckets hold their
// place at a floor width and are inert.

import { type CSSProperties } from "react";
import { getRiskTier } from "@/lib/calculateLTV";
import { tierOrUnknown, inr, type RiskTier } from "./tier";
import type { SpineBucket } from "./types";

// Every bucket gets this share of the bar before money is distributed, so the
// axis stays legible and complete at any distribution.
const FLOOR_SHARE = 8;

interface Props {
  buckets: SpineBucket[];
  totalOwed: number;
  selected: string | null;
  onSelect: (ageRange: string | null) => void;
}

function segmentWidths(buckets: SpineBucket[], totalOwed: number): number[] {
  const flexible = 100 - FLOOR_SHARE * buckets.length;
  if (totalOwed <= 0) {
    return buckets.map(() => 100 / buckets.length);
  }
  return buckets.map((b) => FLOOR_SHARE + (b.owed / totalOwed) * flexible);
}

/** A bucket's tier, derived from its average LTV through the shared helper. */
function bucketTier(b: SpineBucket): RiskTier | null {
  return b.avgLtv === null ? null : getRiskTier(b.avgLtv);
}

export function AgingSpine({ buckets, totalOwed, selected, onSelect }: Props) {
  const widths = segmentWidths(buckets, totalOwed);

  return (
    <div>
      {/* ── The bar ─────────────────────────────────────────────── */}
      <div className="flex items-stretch gap-[3px]" role="group" aria-label="Active loan book by pledge age">
        {buckets.map((b, i) => {
          const empty = b.count === 0;
          const tier = tierOrUnknown(bucketTier(b));
          const isSelected = selected === b.ageRange;
          const dimmed = selected !== null && !isSelected;
          const { Icon } = tier;

          const barStyle: CSSProperties = {
            width: `${widths[i]}%`,
            backgroundColor: empty ? "var(--muted)" : tier.color,
            opacity: dimmed ? 0.4 : 1,
            borderTopLeftRadius: i === 0 ? 10 : 3,
            borderBottomLeftRadius: i === 0 ? 10 : 3,
            borderTopRightRadius: i === buckets.length - 1 ? 10 : 3,
            borderBottomRightRadius: i === buckets.length - 1 ? 10 : 3,
            transition: "opacity 320ms cubic-bezier(0.16,1,0.3,1), transform 320ms cubic-bezier(0.16,1,0.3,1)",
            transform: isSelected ? "translateY(-3px)" : "translateY(0)",
          };

          if (empty) {
            return (
              <div
                key={b.ageRange}
                style={barStyle}
                className="h-[92px] flex items-center justify-center"
                aria-label={`${b.label}: no active pledges`}
              >
                <span
                  className="text-[13px] font-medium"
                  style={{ color: "var(--muted-foreground-subtle)" }}
                  aria-hidden
                >
                  —
                </span>
              </div>
            );
          }

          return (
            <button
              key={b.ageRange}
              type="button"
              onClick={() => onSelect(isSelected ? null : b.ageRange)}
              aria-pressed={isSelected}
              aria-label={`${b.label}: ${b.count} pledges, ${inr(b.owed)} owed, ${tier.label}${
                b.underwaterCount > 0 ? `, ${b.underwaterCount} underwater` : ""
              }`}
              style={barStyle}
              className="h-[92px] flex flex-col items-center justify-center gap-1.5 cursor-pointer
                         focus-visible:outline-2 focus-visible:outline-offset-2
                         focus-visible:outline-[var(--ring)] hover:brightness-105"
            >
              <Icon
                size={18}
                strokeWidth={2.2}
                aria-hidden
                style={{ color: "var(--card)" }}
              />
              {b.underwaterCount > 0 && (
                <span
                  className="text-[11px] font-bold tabular-nums px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: "var(--card)", color: tier.color }}
                >
                  {b.underwaterCount} underwater
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Axis labels ─────────────────────────────────────────── */}
      <div className="flex items-start gap-[3px] mt-3">
        {buckets.map((b, i) => {
          const empty = b.count === 0;
          const tier = tierOrUnknown(bucketTier(b));
          const isSelected = selected === b.ageRange;

          return (
            <div
              key={b.ageRange}
              style={{ width: `${widths[i]}%` }}
              className="px-0.5 min-w-0"
            >
              <p
                className="text-[11px] font-bold tracking-wide truncate"
                style={{
                  color: isSelected ? "var(--foreground)" : "var(--muted-foreground)",
                }}
              >
                {b.label}
              </p>
              {empty ? (
                <p className="text-[11px]" style={{ color: "var(--muted-foreground-subtle)" }}>
                  No pledges
                </p>
              ) : (
                <>
                  <p
                    className="text-[13px] font-semibold tabular-nums truncate"
                    style={{ color: "var(--foreground)" }}
                  >
                    {inr(b.owed)}
                  </p>
                  <p
                    className="text-[11px] tabular-nums truncate"
                    style={{ color: "var(--muted-foreground-subtle)" }}
                  >
                    {b.count} {b.count === 1 ? "pledge" : "pledges"} · {tier.label}
                  </p>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
