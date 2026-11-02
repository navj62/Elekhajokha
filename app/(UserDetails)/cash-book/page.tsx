"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Lock,
  Plus,
  Trash2,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Sheet from "@/components/ui/Sheet";
import StickyActions from "@/components/ui/StickyActions";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/Skeleton";
import { Card, Row, fmtINR, btnPrimary, btnSecondary } from "@/components/ui/DetailParts";
import {
  CASH_MODES,
  CASH_MODE_LABEL,
  CASH_NOTE_MAX,
  isIsoDay,
  parseCashAmount,
  num,
  fmtSigned,
  type CashDirectionValue,
  type CashModeValue,
} from "@/lib/cashBookShared";
import type { CashDayJson, CashEntryJson } from "@/lib/cashBook";

/* ------------------------------------------------------------------ */
/*  Cash book — one IST day per page. Today is editable until midnight; */
/*  every earlier day is read-only. All rules are enforced server-side  */
/*  (lib/cashBook.ts); this page only mirrors them for the controls.    */
/* ------------------------------------------------------------------ */

type DayData = { day: CashDayJson; entries: CashEntryJson[] };

function addDays(day: string, n: number) {
  const d = new Date(`${day}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function fmtDay(day: string, long = false) {
  return new Date(`${day}T12:00:00+05:30`).toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    ...(long ? { weekday: "long", year: "numeric" } : {}),
  });
}
function fmtTime(iso: string | Date) {
  return new Date(iso).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit" });
}
function fmtSignedAmount(direction: CashDirectionValue, amount: string) {
  return `${direction === "IN" ? "+" : "−"}${fmtINR(Number(amount))}`;
}

function sourceHref(e: CashEntryJson): { href: string; label: string } | null {
  if (e.pledgeId && e.customerId) return { href: `/customers/${e.customerId}/pledges/${e.pledgeId}`, label: "Open pledge" };
  if (e.inventoryItemId) return { href: `/inventory/${e.inventoryItemId}`, label: "Open item" };
  return null;
}

async function send(url: string, method: string, body?: unknown): Promise<{ ok: boolean; status: number; message: string | null }> {
  try {
    const res = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) return { ok: true, status: res.status, message: null };
    return { ok: false, status: res.status, message: typeof data?.message === "string" ? data.message : "Couldn't save. Try again." };
  } catch {
    return { ok: false, status: 0, message: "Couldn't save. Check your connection and try again." };
  }
}

/* ── Small pieces ─────────────────────────────────────────────────── */

function ModeChip({ mode }: { mode: CashModeValue }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold tracking-wide",
        mode === "CASH" ? "bg-status-active-surface text-status-active-foreground" : "bg-muted text-muted-foreground",
      )}
    >
      {CASH_MODE_LABEL[mode]}
    </span>
  );
}

function ChoiceGroup<T extends string>({
  legend, value, options, onChange, labels,
}: {
  legend: string; value: T; options: readonly T[]; onChange: (v: T) => void; labels: Record<T, string>;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-[13px] font-semibold text-foreground">{legend}</legend>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={legend}>
        {options.map((o) => (
          <button
            key={o}
            type="button"
            role="radio"
            aria-checked={value === o}
            onClick={() => onChange(o)}
            className={cn(
              "min-h-11 px-4 rounded-full border text-[13px] font-semibold transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
              value === o ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border hover:bg-accent",
            )}
          >
            {labels[o]}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function AmountField({ label, value, onChange, invalid, autoFocus = true }: {
  label: string; value: string; onChange: (v: string) => void; invalid: boolean; autoFocus?: boolean;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[13px] font-semibold text-foreground">{label}</span>
      <Input
        type="text"
        inputMode="decimal"
        placeholder="e.g. 5000"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid}
        className="h-11"
        autoFocus={autoFocus}
      />
    </label>
  );
}

function NoteField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[13px] font-semibold text-foreground">
        Note <span className="font-normal text-muted-foreground-subtle">(optional)</span>
      </span>
      <Input type="text" maxLength={CASH_NOTE_MAX} value={value} onChange={(e) => onChange(e.target.value)} className="h-11" />
    </label>
  );
}

function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return <p role="alert" className="p-3 rounded-[12px] bg-risk-critical-surface text-[13px] text-risk-critical-foreground">{message}</p>;
}

function SheetFooter({ formId, saving, onCancel, label = "Save" }: { formId: string; saving: boolean; onCancel: () => void; label?: string }) {
  return (
    <div className="flex w-full gap-2 lg:justify-end">
      <button type="button" onClick={onCancel} disabled={saving} className={cn(btnSecondary, "flex-1 lg:flex-none disabled:opacity-50")}>
        Cancel
      </button>
      <button type="submit" form={formId} disabled={saving} className={cn(btnPrimary, "flex-1 lg:flex-none disabled:opacity-50")}>
        {saving && <Loader2 size={15} className="animate-spin" aria-hidden />} {label}
      </button>
    </div>
  );
}

const DIRECTION_LABEL: Record<CashDirectionValue, string> = { IN: "Cash in", OUT: "Cash out" };

/* ── Page ─────────────────────────────────────────────────────────── */

function CashBookDay() {
  const router = useRouter();
  const params = useSearchParams();
  const rawDate = params.get("date");
  const requested = rawDate && isIsoDay(rawDate) ? rawDate : null;
  const key = requested ?? "today";

  const [data, setData] = useState<DayData | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  const loading = loadedKey !== `${key}#${reloadTick}`;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/cash-book${requested ? `?date=${requested}` : ""}`, { cache: "no-store" });
        const body = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok || !body?.day) {
          setLoadError(typeof body?.message === "string" ? body.message : "Couldn't load the cash book.");
        } else {
          setData(body);
          setLoadError(null);
        }
      } catch {
        if (!cancelled) setLoadError("Couldn't load the cash book. Check your connection.");
      } finally {
        if (!cancelled) setLoadedKey(`${key}#${reloadTick}`);
      }
    })();
    return () => { cancelled = true; };
  }, [requested, key, reloadTick]);

  const reload = useCallback(() => setReloadTick((n) => n + 1), []);

  /* ── Sheets ── */
  const [sheet, setSheet] = useState<null | "add" | "opening" | "count" | { entry: CashEntryJson }>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fAmount, setFAmount] = useState("");
  const [fDirection, setFDirection] = useState<CashDirectionValue>("IN");
  const [fMode, setFMode] = useState<CashModeValue>("CASH");
  const [fNote, setFNote] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const day = data?.day ?? null;
  const entries = data?.entries ?? [];
  const isToday = !!day?.isToday;

  function openSheet(next: NonNullable<typeof sheet>) {
    setFormError(null);
    setConfirmDelete(false);
    if (next === "add") { setFAmount(""); setFDirection("OUT"); setFMode("CASH"); setFNote(""); }
    if (next === "opening") setFAmount(day?.opening ?? "");
    if (next === "count") setFAmount("");
    if (typeof next === "object") {
      setFAmount(next.entry.amount);
      setFDirection(next.entry.direction);
      setFMode(next.entry.mode);
      setFNote(next.entry.note ?? "");
    }
    setSheet(next);
  }

  async function run(url: string, method: string, body?: unknown) {
    setSaving(true);
    setFormError(null);
    const r = await send(url, method, body);
    setSaving(false);
    if (r.ok) { setSheet(null); reload(); return; }
    setFormError(r.message);
    // The day rolled over under the page: show today's page instead.
    if (r.status === 409) reload();
  }

  function amountOrError(allowZero = false) {
    const v = parseCashAmount(fAmount, { allowZero });
    if (!v.ok) setFormError(v.message);
    return v.ok ? v.value : null;
  }

  function submitAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!day) return;
    const amount = amountOrError();
    if (amount === null) return;
    run("/api/cash-book/entries", "POST", { date: day.date, direction: fDirection, amount, mode: fMode, note: fNote });
  }
  function submitOpening(e: React.FormEvent) {
    e.preventDefault();
    if (!day) return;
    const amount = amountOrError(true);
    if (amount === null) return;
    run("/api/cash-book/day", "PATCH", { date: day.date, openingCash: amount });
  }
  function submitCount(e: React.FormEvent) {
    e.preventDefault();
    if (!day) return;
    const amount = amountOrError(true);
    if (amount === null) return;
    run("/api/cash-book/day", "PATCH", { date: day.date, countedCash: amount });
  }
  function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!day || !sheet || typeof sheet !== "object") return;
    const entry = sheet.entry;
    const body: Record<string, unknown> = { date: day.date, note: fNote };
    // A reversal's amount and mode mirror the entry it cancels; only its note changes.
    if (entry.kind !== "REVERSAL") {
      body.mode = fMode;
      // Only a pledge sold to the shop can be ₹0 ("debt settled, no cash").
      const amount = amountOrError(entry.kind === "PLEDGE_SOLD");
      if (amount === null) return;
      if (amount !== entry.amount) body.amount = amount;
    }
    if (entry.kind === "MANUAL") body.direction = fDirection;
    if ((entry.note ?? "") === fNote.trim()) delete body.note;
    if (Object.keys(body).length === 1) { setSheet(null); return; } // nothing changed
    run(`/api/cash-book/entries/${entry.id}`, "PATCH", body);
  }
  function deleteEntry() {
    if (!day || !sheet || typeof sheet !== "object") return;
    if (!confirmDelete) { setConfirmDelete(true); return; }
    run(`/api/cash-book/entries/${sheet.entry.id}?date=${day.date}`, "DELETE");
  }

  const goTo = (d: string | null) => router.push(d ? `/cash-book?date=${d}` : "/cash-book");

  /* ── Render ── */
  const showSkeleton = loading && !data;

  return (
    <>
      <div className="max-w-[900px] mx-auto lg:px-8 pt-4 lg:pt-8 pb-6 lg:pb-16 text-foreground flex flex-col gap-4 lg:gap-6">

        {/* Header */}
        <section className="rounded-[24px] bg-card-alt p-4 lg:p-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/dashboard"
              aria-label="Back to dashboard"
              className="size-11 shrink-0 inline-flex items-center justify-center rounded-full border border-border bg-card text-foreground hover:bg-accent transition-colors"
            >
              <ArrowLeft size={18} aria-hidden />
            </Link>
            <div className="min-w-0">
              <h1 className="flex items-center gap-2 text-[20px] lg:text-[26px] leading-tight font-bold text-foreground">
                <Wallet size={22} className="text-primary shrink-0" aria-hidden /> Cash book
              </h1>
              <p className="mt-1 text-[13px] font-medium text-muted-foreground-subtle">
                {day ? (isToday ? `Today · ${fmtDay(day.date, true)}` : fmtDay(day.date, true)) : " "}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <nav aria-label="Choose day" className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => day && goTo(addDays(day.date, -1))}
                disabled={!day}
                aria-label={day ? `Previous day, ${fmtDay(addDays(day.date, -1))}` : "Previous day"}
                className="size-11 inline-flex items-center justify-center rounded-full border border-border bg-card hover:bg-accent disabled:opacity-40"
              >
                <ChevronLeft size={18} aria-hidden />
              </button>
              {!isToday && day && (
                <button type="button" onClick={() => goTo(null)} className={cn(btnSecondary, "px-4")}>Today</button>
              )}
              <button
                type="button"
                onClick={() => day && goTo(addDays(day.date, 1) === day.today ? null : addDays(day.date, 1))}
                disabled={!day || isToday}
                aria-label={day && !isToday ? `Next day, ${fmtDay(addDays(day.date, 1))}` : "Next day"}
                className="size-11 inline-flex items-center justify-center rounded-full border border-border bg-card hover:bg-accent disabled:opacity-40"
              >
                <ChevronRight size={18} aria-hidden />
              </button>
            </nav>
            {isToday && (
              <div className="hidden lg:flex items-center gap-2 ml-2">
                <button type="button" onClick={() => openSheet("count")} className={btnSecondary}>Count drawer</button>
                <button type="button" onClick={() => openSheet("add")} className={btnPrimary}><Plus size={15} aria-hidden /> Add entry</button>
              </div>
            )}
          </div>
        </section>

        {loadError && (
          <p role="alert" className="p-3 rounded-[12px] bg-risk-critical-surface text-[13px] text-risk-critical-foreground">
            {loadError}{" "}
            <button type="button" onClick={reload} className="underline font-semibold min-h-11">Try again</button>
          </p>
        )}

        {day && !isToday && (
          <p role="status" className="flex items-center gap-2 px-4 py-3 rounded-[16px] bg-muted text-[13px] font-semibold text-muted-foreground">
            <Lock size={15} aria-hidden /> This day is closed. It can be viewed but not changed.
          </p>
        )}

        {showSkeleton && (
          <div className="flex flex-col gap-4" aria-hidden>
            <Skeleton className="h-56 w-full rounded-[24px]" />
            <Skeleton className="h-40 w-full rounded-[24px]" />
          </div>
        )}

        {day && (
          <div className={cn("flex flex-col gap-4 lg:gap-6 transition-opacity", loading && "opacity-60")} aria-busy={loading}>

            {/* Drawer */}
            <section className="rounded-[24px] bg-primary text-primary-foreground p-5 lg:p-7">
              <p className="text-[12px] font-bold tracking-wider uppercase opacity-80">
                {isToday ? "Expected in drawer" : "Expected at close"}
              </p>
              <p className="mt-2 text-[32px] lg:text-[40px] font-bold leading-none tabular-nums break-words">
                {day.expected === null ? "—" : fmtINR(num(day.expected))}
              </p>
              {day.opening === null && (
                <p className="mt-2 text-[13px] opacity-90">Opening not set{isToday ? " — set it to see the drawer total." : "."}</p>
              )}
              {day.countedCash !== null && (
                <p className="mt-2 text-[13px] opacity-90">
                  Counted {fmtINR(num(day.countedCash))}
                  {day.countedAt && ` at ${fmtTime(day.countedAt)}`}
                  {day.countDifference !== null && (
                    Number(day.countDifference) === 0
                      ? " · matches"
                      : <> · <span className="font-bold">{fmtSigned(day.countDifference)}</span> vs expected</>
                  )}
                </p>
              )}
              {day.negativeDrawer && (
                <p role="status" className="mt-3 inline-flex items-start gap-2 rounded-[12px] bg-risk-critical-surface px-3 py-2 text-[12.5px] font-semibold text-risk-critical-foreground">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden />
                  More cash went out than the drawer held. Check the opening and entries.
                </p>
              )}
            </section>

            {/* Totals */}
            <Card title="Totals">
              <dl className="px-5 lg:px-6 pb-3">
                <Row
                  label="Opening"
                  sub={
                    day.openingEdited && day.carriedOpening !== null
                      ? `Edited · carried ${fmtINR(num(day.carriedOpening))} (${fmtSigned(day.openingDifference ?? "0")})`
                      : day.opening !== null && day.carriedOpening === null
                        ? "Entered by you"
                        : day.opening !== null ? "Carried from the last day" : undefined
                  }
                  value={
                    <span className="inline-flex items-center gap-2">
                      {day.opening === null ? <span className="text-muted-foreground-subtle">Not set</span> : fmtINR(num(day.opening))}
                      {isToday && (
                        <button
                          type="button"
                          onClick={() => openSheet("opening")}
                          className="min-h-11 px-3 rounded-full text-[12.5px] font-bold text-primary hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                        >
                          {day.opening === null ? "Set" : "Edit"}
                        </button>
                      )}
                    </span>
                  }
                />
                <Row label="Cash in" value={`+${fmtINR(num(day.cashIn))}`} />
                <Row label="Cash out" value={`−${fmtINR(num(day.cashOut))}`} />
                <Row
                  label="UPI / bank"
                  sub="Not in the drawer"
                  value={`+${fmtINR(num(day.otherIn))} / −${fmtINR(num(day.otherOut))}`}
                />
              </dl>
            </Card>

            {/* Entries */}
            <Card title={`Entries${entries.length ? ` (${entries.length})` : ""}`}>
              {entries.length === 0 ? (
                <p className="px-5 lg:px-6 pb-5 text-[13px] text-muted-foreground-subtle">
                  {isToday ? "Nothing recorded yet today. Loans, releases, sales and payments appear here as they happen." : "Nothing was recorded on this day."}
                </p>
              ) : (
                <ol className="pb-2">
                  {entries.map((e) => {
                    const labels = [
                      e.partyName,
                      e.kind === "INVENTORY_SOLD" || e.kind === "INVENTORY_BOUGHT" ? e.itemDescription : null,
                      e.eventDate ? `dated ${fmtDay(e.eventDate)}` : null,
                    ].filter(Boolean) as string[];
                    return (
                      <li key={e.id} className="border-t border-border first:border-t-0">
                        <button
                          type="button"
                          onClick={() => openSheet({ entry: e })}
                          className="w-full min-h-11 flex items-start justify-between gap-3 px-5 lg:px-6 py-3 text-left hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/50"
                        >
                          <span className="flex gap-3 min-w-0">
                            <span className="w-[58px] shrink-0 pt-0.5 text-[12px] font-medium text-muted-foreground-subtle tabular-nums">{fmtTime(e.createdAt)}</span>
                            <span className="min-w-0">
                              <span className={cn("block text-[14px] font-semibold text-foreground", e.reversed && "line-through decoration-1")}>{e.title}</span>
                              {labels.length > 0 && (
                                <span className="block text-[12.5px] text-muted-foreground break-words">{labels.join(" · ")}</span>
                              )}
                              {(e.amountEdited || e.reversed || e.note) && (
                                <span className="block text-[12px] text-muted-foreground-subtle break-words">
                                  {[
                                    e.amountEdited ? `edited · was ${fmtINR(Number(e.originalAmount))}` : null,
                                    e.reversed ? "reversed" : null,
                                    e.note,
                                  ].filter(Boolean).join(" · ")}
                                </span>
                              )}
                            </span>
                          </span>
                          <span className="shrink-0 flex flex-col items-end gap-1">
                            <span className={cn("text-[14px] font-bold tabular-nums", e.direction === "IN" ? "text-status-active-foreground" : "text-foreground")}>
                              {fmtSignedAmount(e.direction, e.amount)}
                            </span>
                            <ModeChip mode={e.mode} />
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              )}
            </Card>
          </div>
        )}
      </div>

      {isToday && (
        <StickyActions className="lg:hidden">
          <button type="button" onClick={() => openSheet("count")} className={cn(btnSecondary, "flex-1 px-3")}>Count drawer</button>
          <button type="button" onClick={() => openSheet("add")} className={cn(btnPrimary, "flex-1 px-3")}><Plus size={15} aria-hidden /> Add entry</button>
        </StickyActions>
      )}

      {/* Add entry */}
      <Sheet
        open={sheet === "add"}
        onOpenChange={(o) => !o && setSheet(null)}
        title="Add entry"
        description="Recorded on today's page."
        dismissible={!saving}
        footer={<SheetFooter formId="cash-add" saving={saving} onCancel={() => setSheet(null)} />}
      >
        <form id="cash-add" onSubmit={submitAdd} className="flex flex-col gap-5" noValidate>
          <ChoiceGroup legend="Direction" value={fDirection} options={["IN", "OUT"] as const} onChange={setFDirection} labels={DIRECTION_LABEL} />
          <AmountField label="Amount (₹)" value={fAmount} onChange={setFAmount} invalid={formError !== null} />
          <ChoiceGroup legend="Mode" value={fMode} options={CASH_MODES} onChange={setFMode} labels={CASH_MODE_LABEL} />
          <NoteField value={fNote} onChange={setFNote} />
          <FormError message={formError} />
        </form>
      </Sheet>

      {/* Opening */}
      <Sheet
        open={sheet === "opening"}
        onOpenChange={(o) => !o && setSheet(null)}
        title="Opening cash"
        description={day?.carriedOpening != null ? `Carried from the last day: ${fmtINR(num(day.carriedOpening))}` : "Cash in the drawer when the day began."}
        dismissible={!saving}
        footer={<SheetFooter formId="cash-opening" saving={saving} onCancel={() => setSheet(null)} />}
      >
        <form id="cash-opening" onSubmit={submitOpening} className="flex flex-col gap-5" noValidate>
          <AmountField label="Opening (₹)" value={fAmount} onChange={setFAmount} invalid={formError !== null} />
          {day?.openingEdited && day.carriedOpening !== null && (
            <button
              type="button"
              onClick={() => run("/api/cash-book/day", "PATCH", { date: day.date, openingCash: null })}
              disabled={saving}
              className={cn(btnSecondary, "self-start disabled:opacity-50")}
            >
              Use carried {fmtINR(num(day.carriedOpening))}
            </button>
          )}
          <FormError message={formError} />
        </form>
      </Sheet>

      {/* Count drawer */}
      <Sheet
        open={sheet === "count"}
        onOpenChange={(o) => !o && setSheet(null)}
        title="Count drawer"
        description={day?.expected != null ? `Expected: ${fmtINR(num(day.expected))}` : "Count the cash in the drawer."}
        dismissible={!saving}
        footer={<SheetFooter formId="cash-count" saving={saving} onCancel={() => setSheet(null)} />}
      >
        <form id="cash-count" onSubmit={submitCount} className="flex flex-col gap-5" noValidate>
          <AmountField label="Counted cash (₹)" value={fAmount} onChange={setFAmount} invalid={formError !== null} />
          <p className="text-[12px] text-muted-foreground-subtle">You can count again any time before midnight; the latest count is kept.</p>
          <FormError message={formError} />
        </form>
      </Sheet>

      {/* Entry detail / edit */}
      {sheet && typeof sheet === "object" && (() => {
        const e = sheet.entry;
        const src = sourceHref(e);
        const editable = e.editable && isToday;
        return (
          <Sheet
            open
            onOpenChange={(o) => !o && setSheet(null)}
            title={e.title}
            description={[e.partyName, `${fmtSignedAmount(e.direction, e.amount)} · ${fmtTime(e.createdAt)}`].filter(Boolean).join(" · ")}
            dismissible={!saving}
            footer={editable ? <SheetFooter formId="cash-edit" saving={saving} onCancel={() => setSheet(null)} /> : undefined}
          >
            <div className="flex flex-col gap-5">
              <dl>
                {e.eventDate && <Row label="Action dated" value={fmtDay(e.eventDate, true)} />}
                {e.amountEdited && <Row label="Original amount" value={fmtINR(Number(e.originalAmount))} />}
                {e.reversed && <Row label="Status" value="Reversed (pledge deleted)" />}
                {e.kind === "REVERSAL" && <Row label="Cancels" value="An entry of a deleted pledge" />}
                {(!editable || e.kind === "REVERSAL") && <Row label="Mode" value={<ModeChip mode={e.mode} />} />}
                {!editable && e.note && <Row label="Note" value={e.note} />}
              </dl>

              {editable ? (
                <form id="cash-edit" onSubmit={submitEdit} className="flex flex-col gap-5" noValidate>
                  {e.kind === "MANUAL" && (
                    <ChoiceGroup legend="Direction" value={fDirection} options={["IN", "OUT"] as const} onChange={setFDirection} labels={DIRECTION_LABEL} />
                  )}
                  {e.kind !== "REVERSAL" && (
                    <AmountField label="Amount (₹)" value={fAmount} onChange={setFAmount} invalid={formError !== null} autoFocus={false} />
                  )}
                  {e.kind !== "REVERSAL" && (
                    <ChoiceGroup legend="Mode" value={fMode} options={CASH_MODES} onChange={setFMode} labels={CASH_MODE_LABEL} />
                  )}
                  <NoteField value={fNote} onChange={setFNote} />
                  {e.kind !== "MANUAL" && (
                    <p className="text-[12px] text-muted-foreground-subtle">
                      Recorded automatically. You can change it until midnight; the original amount is kept.
                    </p>
                  )}
                  <FormError message={formError} />
                </form>
              ) : (
                <>
                  <p className="text-[12px] text-muted-foreground-subtle">
                    {isToday ? "This entry was reversed and can no longer change." : "This day is closed."}
                  </p>
                  <FormError message={formError} />
                </>
              )}

              <div className="flex flex-wrap gap-2">
                {src && (
                  <Link href={src.href} className={cn(btnSecondary, "px-4")}>
                    {src.label} <ArrowRight size={14} aria-hidden />
                  </Link>
                )}
                {editable && e.deletable && (
                  <button
                    type="button"
                    onClick={deleteEntry}
                    disabled={saving}
                    className={cn(
                      "inline-flex min-h-11 items-center justify-center gap-2 px-5 rounded-full text-[13px] font-bold transition-colors disabled:opacity-50",
                      confirmDelete ? "bg-risk-critical-surface text-risk-critical-foreground" : "text-risk-critical-foreground hover:bg-risk-critical-surface",
                    )}
                  >
                    <Trash2 size={15} aria-hidden /> {confirmDelete ? "Tap again to delete" : "Delete entry"}
                  </button>
                )}
              </div>
            </div>
          </Sheet>
        );
      })()}
    </>
  );
}

export default function CashBookPage() {
  return (
    <Suspense fallback={<div className="max-w-[900px] mx-auto lg:px-8 pt-4 lg:pt-8"><Skeleton className="h-56 w-full rounded-[24px]" /></div>}>
      <CashBookDay />
    </Suspense>
  );
}
