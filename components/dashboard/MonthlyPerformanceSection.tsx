"use client";

// NOTE: The Part-B spec described this as an async server component. The dashboard
// page (app/(UserDetails)/dashboard/page.tsx) is a Client Component ("use client"),
// and an async Server Component cannot be rendered as a child of a Client Component
// (async client components are unsupported) — doing so breaks the build. So this is a
// Client Component that fetches the route in an effect, matching how the existing
// dashboard already loads /api/dashboard/snapshot. The Suspense boundary + skeleton
// requested in Part C are preserved on the page; loading is also handled here.

import { useEffect, useState, type CSSProperties } from "react";
import { BarChart3 } from "lucide-react";
import {
  MonthlyPerformanceCharts,
  type MonthlyPerformanceData,
} from "./MonthlyPerformanceCharts";

const cardStyle: CSSProperties = {
  backgroundColor: "var(--card-bg)",
  border: "1px solid var(--border-light)",
};

const pulseBlock: CSSProperties = { backgroundColor: "var(--border-light)" };

/* ------------------------------------------------------------------ */
/*  Skeleton — mirrors the loaded layout's height/structure            */
/* ------------------------------------------------------------------ */
export function MonthlyPerformanceSkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      {/* Section header */}
      <div className="space-y-2">
        <div className="h-3 w-24 rounded animate-pulse" style={pulseBlock} />
        <div className="h-5 w-52 rounded animate-pulse" style={pulseBlock} />
      </div>

      {/* Chart A */}
      <div className="rounded-[18px] p-7" style={cardStyle}>
        <div className="h-4 w-44 rounded animate-pulse mb-4" style={pulseBlock} />
        <div className="h-[320px] rounded-xl animate-pulse" style={pulseBlock} />
      </div>

      {/* Charts B & C */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-[18px] p-7" style={cardStyle}>
            <div className="h-4 w-36 rounded animate-pulse mb-4" style={pulseBlock} />
            <div className="h-[240px] rounded-xl animate-pulse" style={pulseBlock} />
          </div>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-[16px] p-5" style={cardStyle}>
            <div className="h-2.5 w-16 rounded animate-pulse" style={pulseBlock} />
            <div className="h-5 w-20 rounded animate-pulse mt-2" style={pulseBlock} />
            <div className="h-3 w-10 rounded animate-pulse mt-2" style={pulseBlock} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Graceful empty / error state (matches existing dashboard pattern)  */
/* ------------------------------------------------------------------ */
function EmptyState() {
  return (
    <div className="rounded-[18px] p-7" style={cardStyle}>
      <div
        className="w-full flex flex-col items-center justify-center py-16"
        style={{ color: "var(--text-muted)" }}
      >
        <BarChart3 size={32} className="mb-2 opacity-20" />
        <span className="text-[13px] font-medium">
          No monthly performance data available yet.
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section — fetches the rollup, renders charts / skeleton / empty    */
/* ------------------------------------------------------------------ */
export function MonthlyPerformanceSection() {
  const [data, setData] = useState<MonthlyPerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/dashboard/monthly-performance", {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("request failed");
        const json: MonthlyPerformanceData = await res.json();
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

  if (loading) return <MonthlyPerformanceSkeleton />;
  if (error || !data || !data.months?.length) return <EmptyState />;
  return <MonthlyPerformanceCharts data={data} />;
}
