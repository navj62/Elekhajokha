"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Wallet } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { fmtINR } from "@/components/ui/DetailParts";
import type { CashDayJson } from "@/lib/cashBook";

/* ------------------------------------------------------------------ */
/*  Today's cash — dashboard summary of the cash book (/cash-book).     */
/*  One request, one query (GET /api/cash-book/summary). Refetches when */
/*  the tab regains focus, so a sale made on another device shows up.   */
/* ------------------------------------------------------------------ */

const num = (s: string | null) => (s === null ? null : Number(s));

function fmtSigned(s: string) {
  const n = Number(s);
  return `${n > 0 ? "+" : n < 0 ? "−" : ""}${fmtINR(Math.abs(n))}`;
}

function SummaryRow({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2 border-t border-border first:border-t-0">
      <dt className="min-w-0 text-[12.5px] text-muted-foreground">
        {label}
        {sub && <span className="block text-[11.5px] text-muted-foreground-subtle">{sub}</span>}
      </dt>
      <dd className="text-[13.5px] font-bold text-foreground tabular-nums text-right">{value}</dd>
    </div>
  );
}

export default function TodayCashCard() {
  const [day, setDay] = useState<CashDayJson | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/cash-book/summary", { cache: "no-store" });
        const body = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok || !body?.day) { setState("error"); return; }
        setDay(body.day);
        setState("ready");
      } catch {
        if (!cancelled) setState("error");
      }
    }
    load();
    const onVisible = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { cancelled = true; document.removeEventListener("visibilitychange", onVisible); };
  }, []);

  return (
    <section
      aria-labelledby="today-cash-title"
      className="rounded-[18px] p-5 bg-card border border-border"
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 id="today-cash-title" className="flex items-center gap-2 text-[14px] font-bold text-foreground">
          <Wallet size={16} className="text-primary" aria-hidden />
          Today&apos;s cash
        </h3>
      </div>

      {state === "loading" && (
        <div className="space-y-3" aria-hidden>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
          <Skeleton className="h-8 w-full" />
        </div>
      )}

      {state === "error" && (
        <p className="py-3 text-[12.5px] text-muted-foreground-subtle">Couldn&apos;t load today&apos;s cash.</p>
      )}

      {state === "ready" && day && (
        <>
          <dl>
            <SummaryRow
              label="Opening"
              sub={day.openingEdited ? "edited" : undefined}
              value={day.opening === null ? <span className="font-semibold text-muted-foreground-subtle">Not set</span> : fmtINR(num(day.opening))}
            />
            <SummaryRow label="Cash in" value={`+${fmtINR(num(day.cashIn))}`} />
            <SummaryRow label="Cash out" value={`−${fmtINR(num(day.cashOut))}`} />
          </dl>

          <div className="mt-2 rounded-[14px] bg-muted px-4 py-3">
            <p className="text-[11px] font-bold tracking-wider uppercase text-muted-foreground-subtle">Expected in drawer</p>
            <p className="mt-0.5 text-[22px] font-bold leading-tight text-foreground tabular-nums">
              {day.expected === null ? "—" : fmtINR(num(day.expected))}
            </p>
            {day.countedCash !== null && (
              <p className="mt-1 text-[12px] text-muted-foreground">
                Counted {fmtINR(num(day.countedCash))}
                {day.countDifference !== null && Number(day.countDifference) !== 0 && (
                  <> · <span className="font-bold text-foreground">{fmtSigned(day.countDifference)}</span></>
                )}
                {day.countDifference !== null && Number(day.countDifference) === 0 && " · matches"}
              </p>
            )}
          </div>

          {day.opening === null && (
            <p className="mt-3 text-[12px] text-muted-foreground-subtle">Set today&apos;s opening cash to see the drawer total.</p>
          )}

          {day.negativeDrawer && (
            <p role="status" className="mt-3 flex items-start gap-2 rounded-[12px] bg-risk-critical-surface px-3 py-2 text-[12px] font-semibold text-risk-critical-foreground">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden />
              More cash went out than the drawer held.
            </p>
          )}
        </>
      )}

      <Link
        href="/cash-book"
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-secondary px-5 text-[13px] font-bold text-secondary-foreground transition-opacity hover:opacity-90 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        Open cash book <ArrowRight size={14} aria-hidden />
      </Link>
    </section>
  );
}
