"use client";

// Container for the dashboard's lead section: exposure, spine, drill-down.
//
// The dashboard page fetches /api/dashboard/aging-analysis once, in parallel
// with the snapshot, and passes the result here and to the aging table below
// (AgingAnalysisSection). Snapshot figures arrive as props for the same reason.
//
// Uses useSearchParams, so the page must mount this inside <Suspense>.

import { useCallback, type CSSProperties } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { ExposureHeader } from "./ExposureHeader";
import { AgingSpine } from "./AgingSpine";
import { SpineDrilldown } from "./SpineDrilldown";
import type { AgingFetch } from "./types";

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
  aging: AgingFetch;
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

export function AgingSpineSection({ snapshot, ltvChange, aging }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selected = searchParams.get(BUCKET_PARAM);

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

  if (aging.status === "loading") return <AgingSpineSkeleton />;

  if (aging.status === "error") {
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

  const { data } = aging;

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
