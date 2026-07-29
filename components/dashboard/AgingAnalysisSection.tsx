"use client";

// Mirrors MonthlyPerformanceSection: a Client Component that fetches its route in
// an effect (the dashboard page is a Client Component, so an async Server Component
// cannot be mounted as its child). The Suspense boundary + skeleton on the page are
// preserved; loading is also handled here.

import { useEffect, useState, type CSSProperties } from "react";
import { AlertCircle } from "lucide-react";
import {
  AgingAnalysisCard,
  type AgingAnalysisData,
} from "./AgingAnalysisCard";

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
/*  Section — fetches the analysis, renders card / skeleton / error    */
/* ------------------------------------------------------------------ */
export function AgingAnalysisSection() {
  const [data, setData] = useState<AgingAnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/dashboard/aging-analysis", {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("request failed");
        const json: AgingAnalysisData = await res.json();
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <AgingAnalysisSkeleton />;
  if (error || !data) return <ErrorState />;
  return <AgingAnalysisCard data={data} />;
}
