"use client";

// Container for the dashboard's lead section: exposure, spine, drill-down.
//
// Fetches /api/dashboard/aging-analysis in an effect (the dashboard page is a
// Client Component, so an async Server Component cannot mount as its child —
// same pattern as AgingAnalysisSection). Snapshot figures arrive as props
// because the page already fetches them.
//
// Uses useSearchParams, so the page must mount this inside <Suspense>.

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { ExposureHeader } from "./ExposureHeader";
import { AgingSpine } from "./AgingSpine";
import { SpineDrilldown } from "./SpineDrilldown";
import type { SpineData } from "./types";

const BUCKET_PARAM = "bucket";

export interface SnapshotFigures {
  overallLtv: string | null;
  totalAmountOwed: string;
  totalMarketValue: string;
  safePledges: number;
  watchPledges: number;
  atRiskPledges: number;
  underwaterPledges: number;
  calculatedAt: string;
}

interface Props {
  snapshot: SnapshotFigures | null;
  ltvChange: number | null;
}

const pulseBlock: CSSProperties = { backgroundColor: "var(--border)" };

export function AgingSpineSkeleton() {
  return (
    <div aria-hidden>
      <div className="h-11 w-56 rounded animate-pulse mb-4" style={pulseBlock} />
      <div className="h-[92px] w-full rounded-[10px] animate-pulse" style={pulseBlock} />
      <div className="h-10 w-full rounded animate-pulse mt-3" style={pulseBlock} />
    </div>
  );
}

export function AgingSpineSection({ snapshot, ltvChange }: Props) {
  const [data, setData] = useState<SpineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selected = searchParams.get(BUCKET_PARAM);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/dashboard/aging-analysis");
        if (!res.ok) throw new Error("request failed");
        const json = (await res.json()) as SpineData;
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Selection lives in the URL so a filtered view survives refresh and can be
  // handed to someone else.
  const select = useCallback(
    (ageRange: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (ageRange === null) params.delete(BUCKET_PARAM);
      else params.set(BUCKET_PARAM, ageRange);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  if (loading) return <AgingSpineSkeleton />;

  if (failed || !data) {
    return (
      <div
        className="flex items-center gap-2 text-[13px]"
        style={{ color: "var(--muted-foreground)" }}
      >
        <AlertCircle size={15} aria-hidden />
        Could not load the loan book right now.
      </div>
    );
  }

  // A selected range that no longer exists (stale link) simply shows nothing
  // expanded, rather than an error.
  const selectedBucket = data.buckets.find((b) => b.ageRange === selected) ?? null;

  return (
    <div className="flex flex-col gap-8">
      {snapshot && (
        <ExposureHeader
          overallLtv={snapshot.overallLtv === null ? null : Number(snapshot.overallLtv)}
          totalAmountOwed={Number(snapshot.totalAmountOwed)}
          totalMarketValue={Number(snapshot.totalMarketValue)}
          ltvChange={ltvChange}
          calculatedAt={snapshot.calculatedAt}
          tierCounts={{
            safe: snapshot.safePledges,
            watch: snapshot.watchPledges,
            atRisk: snapshot.atRiskPledges,
            underwater: snapshot.underwaterPledges,
          }}
        />
      )}

      <AgingSpine
        buckets={data.buckets}
        totalOwed={data.totalOwed}
        selected={selected}
        onSelect={select}
      />

      {selectedBucket && selectedBucket.count > 0 && (
        <SpineDrilldown key={selectedBucket.ageRange} bucket={selectedBucket} />
      )}
    </div>
  );
}
