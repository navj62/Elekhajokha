"use client";

import { type CSSProperties } from "react";
import { Inbox } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types — inlined to match the /api/dashboard/aging-analysis shape   */
/* ------------------------------------------------------------------ */
export interface AgingBucket {
  label: string;
  ageRange: string;
  count: number;
  principal: number;
  owed: number;
  avgLtv: number | null;
  underwaterCount: number;
  pctOfPrincipal: number;
  pctOfOwed: number;
}

export interface AgingAnalysisData {
  totalActivePledges: number;
  totalPrincipal: number;
  totalOwed: number;
  buckets: AgingBucket[];
  insights: {
    oldestBucketPrincipalShare: number;
    oldestBucketOwedShare: number;
    capitalStuck: number;
    capitalStuckShare: number;
  };
}

const cardStyle: CSSProperties = {
  backgroundColor: "var(--card)",
  border: "1px solid var(--border)",
};

const OLIVE = "#565C3F";

const inr = (n: number) => n.toLocaleString("en-IN");

// Semantic LTV color per the spec thresholds.
function ltvColor(ltv: number): string {
  if (ltv < 65) return "#4D6B2A"; // green
  if (ltv < 75) return "#8A6B17"; // yellow
  if (ltv <= 90) return "#9A4B14"; // orange
  return "#B91C1C"; // red
}

/* ------------------------------------------------------------------ */
/*  Card                                                               */
/* ------------------------------------------------------------------ */
export function AgingAnalysisCard({ data }: { data: AgingAnalysisData }) {
  const { buckets, insights, totalActivePledges, totalPrincipal, totalOwed } =
    data;

  /* ── Empty state ─────────────────────────────────────────────── */
  if (totalActivePledges === 0) {
    return (
      <div className="rounded-[18px] p-7" style={cardStyle}>
        <div
          className="w-full flex flex-col items-center justify-center py-16"
          style={{ color: "var(--muted-foreground-subtle)" }}
        >
          <Inbox size={32} className="mb-2 opacity-20" />
          <span className="text-[13px] font-medium">
            No active pledges to analyze.
          </span>
        </div>
      </div>
    );
  }

  const headers = [
    "Age",
    "Pledges",
    "Principal",
    "Owed",
    "Avg LTV",
    "Underwater",
    "% of Book",
  ];

  return (
    <div className="rounded-[18px] p-7" style={cardStyle}>
      {/* ── Header row ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h3
            className="text-[18px] font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            Aging Analysis
          </h3>
          <p className="text-[13px]" style={{ color: "var(--muted-foreground-subtle)" }}>
            Active loan book by pledge age
          </p>
        </div>

        {insights.capitalStuckShare > 30 && (
          <span
            className="shrink-0 rounded-full px-3 py-1 text-[11px] font-medium"
            style={{ backgroundColor: "#FFEDD5", color: "#9A4B14" }}
          >
            ₹{inr(insights.capitalStuck)} stuck in 180+ days
          </span>
        )}
      </div>

      {/* ── Table ──────────────────────────────────────────────── */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {headers.map((h, i) => (
                <th
                  key={h}
                  className="text-[10px] uppercase tracking-wider font-bold pb-2"
                  style={{
                    color: "var(--muted-foreground-subtle)",
                    textAlign: i === 0 ? "left" : "right",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {buckets.map((b, idx) => {
              const empty = b.count === 0;
              const isLast = idx === buckets.length - 1;
              const rowStyle: CSSProperties = isLast
                ? {}
                : { borderBottom: "1px solid var(--border)" };
              const muted = { color: "var(--muted-foreground-subtle)" };

              return (
                <tr key={b.ageRange} style={rowStyle} className="text-[14px]">
                  {/* Age */}
                  <td
                    className="py-3 text-left font-medium"
                    style={{ color: "var(--foreground)" }}
                  >
                    {b.label}
                  </td>

                  {/* Pledges */}
                  <td className="py-3 text-right tabular-nums" style={muted}>
                    {empty ? (
                      <span style={muted}>—</span>
                    ) : (
                      <span style={{ color: "var(--foreground)" }}>
                        {b.count}
                      </span>
                    )}
                  </td>

                  {/* Principal */}
                  <td className="py-3 text-right tabular-nums">
                    {empty ? (
                      <span style={muted}>—</span>
                    ) : (
                      <span style={{ color: "var(--foreground)" }}>
                        ₹{inr(b.principal)}
                      </span>
                    )}
                  </td>

                  {/* Owed */}
                  <td className="py-3 text-right tabular-nums">
                    {empty ? (
                      <span style={muted}>—</span>
                    ) : (
                      <span style={{ color: "var(--foreground)" }}>
                        ₹{inr(b.owed)}
                      </span>
                    )}
                  </td>

                  {/* Avg LTV */}
                  <td className="py-3 text-right tabular-nums font-medium">
                    {b.avgLtv === null ? (
                      <span style={muted}>—</span>
                    ) : (
                      <span style={{ color: ltvColor(b.avgLtv) }}>
                        {b.avgLtv.toFixed(1)}%
                      </span>
                    )}
                  </td>

                  {/* Underwater */}
                  <td className="py-3 text-right tabular-nums">
                    {empty ? (
                      <span style={muted}>—</span>
                    ) : (
                      <span
                        style={{
                          color:
                            b.underwaterCount > 0
                              ? "#B91C1C"
                              : "var(--foreground)",
                        }}
                      >
                        {b.underwaterCount}
                      </span>
                    )}
                  </td>

                  {/* % of Book + concentration bar */}
                  <td className="py-3 text-right tabular-nums">
                    {empty ? (
                      <span style={muted}>—</span>
                    ) : (
                      <div className="flex flex-col items-end gap-1">
                        <span style={{ color: "var(--foreground)" }}>
                          {b.pctOfPrincipal.toFixed(1)}%
                        </span>
                        <div
                          className="h-1 rounded w-full"
                          style={{
                            maxWidth: 64,
                            backgroundColor: "var(--border)",
                          }}
                        >
                          <div
                            className="h-1 rounded"
                            style={{
                              width: `${Math.min(b.pctOfPrincipal, 100)}%`,
                              backgroundColor: OLIVE,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Footer row ─────────────────────────────────────────── */}
      <div
        className="mt-5 text-[13px]"
        style={{ color: "var(--muted-foreground-subtle)" }}
      >
        Total: {totalActivePledges} pledges{" · "}
        Principal: ₹{inr(totalPrincipal)}
        {" · "}
        Owed: ₹{inr(totalOwed)}
      </div>
    </div>
  );
}
