"use client";

// The aging table below the spine. The dashboard page fetches
// /api/dashboard/aging-analysis once and hands the same result to this section
// and to the spine (AgingSpineSection), so the route is called once per load.

import { type CSSProperties } from "react";
import { AlertCircle } from "lucide-react";
import { AgingAnalysisCard } from "./AgingAnalysisCard";
import type { AgingFetch } from "./spine/types";

const cardStyle: CSSProperties = {
  backgroundColor: "var(--card)",
  border: "1px solid var(--border)",
};

const pulseBlock: CSSProperties = { backgroundColor: "var(--border)" };

/* ------------------------------------------------------------------ */
/*  Skeleton — table-shaped, 5 rows                                    */
/* ------------------------------------------------------------------ */
export function AgingAnalysisSkeleton() {
  return (
    <div className="rounded-[18px] p-7" style={cardStyle} aria-hidden>
      {/* Header */}
      <div className="space-y-2 mb-5">
        <div className="h-4 w-36 rounded animate-pulse" style={pulseBlock} />
        <div className="h-3 w-48 rounded animate-pulse" style={pulseBlock} />
      </div>

      {/* Header row */}
      <div className="h-3 w-full rounded animate-pulse mb-4" style={pulseBlock} />

      {/* 5 data rows */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-6 w-full rounded animate-pulse"
            style={pulseBlock}
          />
        ))}
      </div>

      {/* Footer */}
      <div
        className="h-3 w-64 rounded animate-pulse mt-5"
        style={pulseBlock}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Graceful error state (matches financial-summary pattern)           */
/* ------------------------------------------------------------------ */
function ErrorState() {
  return (
    <div className="rounded-[18px] p-7" style={cardStyle}>
      <div
        className="w-full flex flex-col items-center justify-center py-16"
        style={{ color: "var(--muted-foreground-subtle)" }}
      >
        <AlertCircle size={32} className="mb-2 opacity-20" />
        <span className="text-[13px] font-medium">
          Could not load aging analysis.
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section — renders card / skeleton / error from the page's fetch    */
/* ------------------------------------------------------------------ */
export function AgingAnalysisSection({ aging }: { aging: AgingFetch }) {
  if (aging.status === "loading") return <AgingAnalysisSkeleton />;
  if (aging.status === "error") return <ErrorState />;
  return <AgingAnalysisCard data={aging.data} />;
}
