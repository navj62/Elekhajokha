"use client";

// Bulk-forfeit review window for the LTV page. Loads the read-only preflight
// for the selected pledges, lets the owner lower each inventory price
// (0 ≤ price ≤ owed), and confirms the forfeit in one request. Mount it with a
// fresh `key` per Review click: all state below starts over each time.
import * as React from "react";
import { AlertTriangle, Loader2, RotateCcw } from "lucide-react";

import Sheet from "@/components/ui/Sheet";
import { Input } from "@/components/ui/input";
import { btnPrimary, btnSecondary, fmtINR } from "@/components/ui/DetailParts";
import { weightText } from "@/lib/inventoryDisplay";
import {
  checkForfeitPrice,
  forfeitRequestItems,
  isEdited,
  owedInput,
  reviewTotals,
} from "@/lib/forfeitReview";
import { cn } from "@/lib/utils";

interface Preview {
  pledgeId: string;
  customerName: string;
  pledgeDate: string;
  itemSummary: string;
  grossWeight: number;
  netWeightOfGold: number;
  netWeightOfSilver: number;
  marketValue: number | null;
  owed: number;
}

/** A rejected request: what to say, and which pledges it names. */
interface Problem {
  reason: string;
  ids: string[];
}

const REASON: Record<string, string> = {
  NOT_OPEN:             "These pledges are already closed:",
  NOT_OWNED:            "These pledges could not be found:",
  FUTURE_PLEDGE_DATE:   "These pledges are dated in the future:",
  BUY_PRICE_ABOVE_OWED: "The amount owed has changed for:",
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

function problemFrom(body: { error?: string; message?: string; offendingIds?: unknown } | null): Problem {
  const ids = Array.isArray(body?.offendingIds) ? body.offendingIds.filter((x): x is string => typeof x === "string") : [];
  const reason = (body?.error && REASON[body.error]) || body?.message || "Something went wrong. Nothing was changed — try again.";
  return { reason, ids };
}

export interface ForfeitReviewSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The selected pledge ids, in selection order. */
  pledgeIds: string[];
  /** Names and dates from the list, for naming pledges if the preflight fails. */
  listInfo: Map<string, { customerName: string; pledgeDate: string }>;
  onDone: (count: number) => void;
}

export function ForfeitReviewSheet({ open, onOpenChange, pledgeIds, listInfo, onDone }: ForfeitReviewSheetProps) {
  const [rows, setRows] = React.useState<Preview[] | null>(null);
  const [inputs, setInputs] = React.useState<Record<string, string>>({});
  const [loadFailed, setLoadFailed] = React.useState(false);
  const [problem, setProblem] = React.useState<Problem | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    let live = true;
    fetch("/api/ltv/forfeit/preflight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: pledgeIds.map((pledgeId) => ({ pledgeId })) }),
    })
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (!live) return;
        if (!res.ok) {
          setProblem(problemFrom(body));
          setLoadFailed(true);
          return;
        }
        // Keep the order the owner picked them in.
        const byId = new Map((body.pledges as Preview[]).map((p) => [p.pledgeId, p]));
        const ordered = pledgeIds.map((id) => byId.get(id)).filter((p): p is Preview => !!p);
        setRows(ordered);
        setInputs(Object.fromEntries(ordered.map((p) => [p.pledgeId, owedInput(p.owed)])));
      })
      .catch(() => {
        if (!live) return;
        setProblem(problemFrom(null));
        setLoadFailed(true);
      });
    return () => { live = false; };
  }, [open, pledgeIds]);

  const priced = React.useMemo(
    () => (rows ?? []).map((r) => ({ pledgeId: r.pledgeId, owed: r.owed, input: inputs[r.pledgeId] ?? "" })),
    [rows, inputs],
  );
  const totals = reviewTotals(priced);
  const anyEdited = priced.some((r) => isEdited(r.input, r.owed));
  const canConfirm = !!rows && rows.length > 0 && totals.invalid === 0 && !submitting;

  const nameOf = (id: string) => {
    const r = rows?.find((x) => x.pledgeId === id) ?? listInfo.get(id);
    return r ? `${r.customerName} (${fmtDate(r.pledgeDate)})` : "a pledge no longer on this list";
  };

  const resetAll = () => setInputs(Object.fromEntries((rows ?? []).map((r) => [r.pledgeId, owedInput(r.owed)])));

  async function confirm() {
    if (!canConfirm) return;
    setSubmitting(true);
    setProblem(null);
    try {
      const res = await fetch("/api/ltv/forfeit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: forfeitRequestItems(priced) }),
      });
      const body = await res.json().catch(() => null);
      if (res.ok && body?.success) {
        onDone(body.count);
        return;
      }
      // The server's owed is newer than the preview's: adopt it, keep the
      // typed prices, and let the inline checks show what now needs fixing.
      if (body?.error === "BUY_PRICE_ABOVE_OWED" && Array.isArray(body.owed)) {
        const fresh = new Map<string, number>(body.owed.map((o: { pledgeId: string; owed: number }) => [o.pledgeId, o.owed]));
        setRows((prev) => prev?.map((r) => (fresh.has(r.pledgeId) ? { ...r, owed: fresh.get(r.pledgeId)! } : r)) ?? prev);
      }
      setProblem(problemFrom(body));
    } catch {
      setProblem(problemFrom(null));
    } finally {
      setSubmitting(false);
    }
  }

  const offending = new Set(problem?.ids ?? []);
  const count = rows?.length ?? pledgeIds.length;

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={`Review forfeit · ${count} ${count === 1 ? "pledge" : "pledges"}`}
      size="lg"
      dismissible={!submitting}
      // Full screen on mobile for this sheet only; the desktop dialog is unchanged.
      className="h-[100dvh] max-h-[100dvh] rounded-t-none border-t-0 lg:h-fit lg:max-h-[85dvh] lg:rounded-[22px] lg:border-t"
      footer={
        <div className="flex w-full flex-col gap-3">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] tabular-nums text-muted-foreground lg:text-[13px]">
            <span><b className="text-foreground">{totals.count}</b> {totals.count === 1 ? "pledge" : "pledges"}</span>
            <span>Total owed <b className="text-foreground">{fmtINR(totals.totalOwed)}</b></span>
            <span>Total cost <b className="text-foreground">{totals.totalCost === null ? "—" : fmtINR(totals.totalCost)}</b></span>
            {totals.writtenOff > 0 && (
              <span className="text-risk-high-foreground"><b>{fmtINR(totals.writtenOff)}</b> written off</span>
            )}
          </div>
          <div className="flex gap-2.5 lg:justify-end">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className={cn(btnSecondary, "flex-1 disabled:opacity-50 lg:flex-none")}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirm}
              disabled={!canConfirm}
              className={cn(btnPrimary, "flex-[2] disabled:cursor-not-allowed disabled:opacity-50 lg:flex-none")}
            >
              {submitting && <Loader2 size={15} className="animate-spin" aria-hidden />}
              {submitting ? "Forfeiting…" : "Confirm forfeit"}
            </button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-2.5 rounded-xl border border-risk-high/40 bg-risk-high-surface px-3.5 py-3 text-[13px] text-risk-high-foreground">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />
          <p>These loans will be closed and the items moved to inventory. This can&apos;t be undone.</p>
        </div>

        {problem && (
          <div role="alert" className="rounded-xl border border-risk-critical/40 bg-risk-critical-surface px-3.5 py-3 text-[13px] text-risk-critical-foreground">
            <p className="font-bold">Nothing was forfeited.</p>
            <p className="mt-0.5">
              {problem.reason}
              {problem.ids.length > 0 && <> <b>{problem.ids.map(nameOf).join(", ")}</b>.</>}
            </p>
            {problem.ids.length > 0 && <p className="mt-1">Deselect them on the list, then review again.</p>}
          </div>
        )}

        {rows === null && !loadFailed && (
          <div className="flex items-center justify-center gap-2 py-12 text-[13px] text-muted-foreground">
            <Loader2 size={16} className="animate-spin" aria-hidden /> Working out today&apos;s amounts…
          </div>
        )}

        {rows && rows.length > 0 && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={resetAll}
              disabled={!anyEdited || submitting}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-primary hover:bg-accent disabled:opacity-40"
            >
              <RotateCcw size={14} aria-hidden /> Reset all to owed
            </button>
          </div>
        )}

        {rows?.map((r) => {
          const input = inputs[r.pledgeId] ?? "";
          const check = checkForfeitPrice(input, r.owed);
          const edited = isEdited(input, r.owed);
          const writtenOff = check.ok ? Math.round((r.owed - check.value) * 100) / 100 : 0;
          const w = weightText(r);
          const msgId = `forfeit-price-msg-${r.pledgeId}`;
          return (
            <section
              key={r.pledgeId}
              className={cn(
                "rounded-2xl border bg-card p-4",
                offending.has(r.pledgeId) || !check.ok ? "border-risk-critical/60" : "border-border",
              )}
            >
              {/* 1. Customer and date */}
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate text-[14.5px] font-bold text-foreground">{r.customerName}</span>
                <span className="shrink-0 text-[12px] text-muted-foreground-subtle">Pledged {fmtDate(r.pledgeDate)}</span>
              </div>
              {/* 2. Items */}
              <p className="mt-1 text-[13px] text-muted-foreground">{r.itemSummary}</p>
              {/* 3. Weight: gross, then net Au/Ag */}
              <p className="mt-0.5 text-[12px] tabular-nums text-muted-foreground">
                {w.gross} gross{w.net ? ` · ${w.net}` : ""}
              </p>
              {/* 4–5. Market value, owed */}
              <dl className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <dt className="text-[11.5px] text-muted-foreground-subtle">Market value today</dt>
                  <dd className="text-[14px] font-semibold tabular-nums text-foreground">
                    {r.marketValue === null ? "No price" : fmtINR(Math.round(r.marketValue))}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11.5px] text-muted-foreground-subtle">Amount owed</dt>
                  <dd className="text-[14px] font-semibold tabular-nums text-foreground">{fmtINR(r.owed)}</dd>
                </div>
              </dl>
              {/* 6. Inventory price */}
              <div className="mt-3 border-t border-border pt-3">
                <label htmlFor={`forfeit-price-${r.pledgeId}`} className="text-[12px] font-semibold text-foreground">
                  Inventory price
                </label>
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="relative min-w-0 flex-1">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[14px] text-muted-foreground">₹</span>
                    <Input
                      id={`forfeit-price-${r.pledgeId}`}
                      type="text"
                      inputMode="decimal"
                      value={input}
                      disabled={submitting}
                      onChange={(e) => setInputs((prev) => ({ ...prev, [r.pledgeId]: e.target.value }))}
                      aria-invalid={!check.ok}
                      aria-describedby={msgId}
                      className="h-11 pl-7 tabular-nums"
                    />
                  </div>
                  {edited && (
                    <button
                      type="button"
                      onClick={() => setInputs((prev) => ({ ...prev, [r.pledgeId]: owedInput(r.owed) }))}
                      disabled={submitting}
                      className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-border px-3 text-[12.5px] font-semibold text-foreground hover:bg-accent disabled:opacity-50"
                    >
                      <RotateCcw size={13} aria-hidden /> Reset to owed
                    </button>
                  )}
                </div>
                <p id={msgId} className="mt-1.5 text-[12px] tabular-nums">
                  {!check.ok ? (
                    <span className="font-semibold text-risk-critical-foreground">{check.message}</span>
                  ) : writtenOff > 0 ? (
                    <span className="font-semibold text-risk-high-foreground">{fmtINR(writtenOff)} written off</span>
                  ) : (
                    <span className="text-muted-foreground-subtle">Defaults to amount owed</span>
                  )}
                </p>
              </div>
            </section>
          );
        })}
      </div>
    </Sheet>
  );
}

export default ForfeitReviewSheet;
