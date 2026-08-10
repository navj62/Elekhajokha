"use client";

// Named pledges behind a selected spine segment, worst LTV first.
//
// This is where the spine stops being a chart and becomes a worklist: every row
// is a real pledge the owner can open and act on.

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { tierOrUnknown, inr } from "./tier";
import type { SpineBucket } from "./types";

function ageLabel(days: number): string {
  if (days < 31) return `${days}d`;
  const months = Math.floor(days / 30);
  return `${months}mo`;
}

export function SpineDrilldown({ bucket }: { bucket: SpineBucket }) {
  // One authored reveal: the list settles in rather than appearing.
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "translateY(0)" : "translateY(-6px)",
        transition: "opacity 380ms cubic-bezier(0.16,1,0.3,1), transform 380ms cubic-bezier(0.16,1,0.3,1)",
      }}
    >
      <div className="flex items-baseline justify-between gap-4 mb-3">
        <h3 className="text-[15px] font-semibold" style={{ color: "var(--foreground)" }}>
          {bucket.label}
        </h3>
        <p className="text-[12px] tabular-nums" style={{ color: "var(--muted-foreground-subtle)" }}>
          {bucket.count} {bucket.count === 1 ? "pledge" : "pledges"} · {inr(bucket.owed)} owed
        </p>
      </div>

      <ul className="flex flex-col">
        {bucket.pledges.map((p) => {
          const tier = tierOrUnknown(p.riskTier);
          const { Icon } = tier;

          return (
            <li key={p.id}>
              <Link
                href={`/customers/${p.customerId}/pledges/${p.id}`}
                className="group flex items-center gap-4 py-3 px-3 -mx-3 rounded-lg
                           transition-colors hover:bg-[var(--card-alt)]
                           focus-visible:outline-2 focus-visible:outline-offset-2
                           focus-visible:outline-[var(--ring)]"
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                {/* Tier — glyph and word, never color alone */}
                <span
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-md px-2 py-1"
                  style={{ backgroundColor: tier.surface, color: tier.foreground }}
                >
                  <Icon size={13} strokeWidth={2.4} aria-hidden />
                  <span className="text-[11px] font-bold whitespace-nowrap">{tier.label}</span>
                </span>

                <span
                  className="flex-1 min-w-0 text-[14px] font-medium truncate"
                  style={{ color: "var(--foreground)" }}
                >
                  {p.customerName}
                </span>

                <span
                  className="shrink-0 text-[12px] tabular-nums w-12 text-right"
                  style={{ color: "var(--muted-foreground-subtle)" }}
                >
                  {ageLabel(p.ageDays)}
                </span>

                <span
                  className="shrink-0 text-[12px] tabular-nums w-16 text-right font-semibold"
                  style={{ color: p.ltv === null ? "var(--muted-foreground-subtle)" : tier.foreground }}
                >
                  {p.ltv === null ? "—" : `${p.ltv.toFixed(1)}%`}
                </span>

                <span
                  className="shrink-0 text-[14px] tabular-nums w-28 text-right font-semibold"
                  style={{ color: "var(--foreground)" }}
                >
                  {inr(p.owed)}
                </span>

                <ChevronRight
                  size={15}
                  aria-hidden
                  className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: "var(--muted-foreground-subtle)" }}
                />
              </Link>
            </li>
          );
        })}
      </ul>

      {bucket.pledgesTruncated && (
        <p className="text-[12px] mt-3" style={{ color: "var(--muted-foreground-subtle)" }}>
          Showing the {bucket.pledges.length} highest-LTV pledges in this range.
        </p>
      )}
    </div>
  );
}
