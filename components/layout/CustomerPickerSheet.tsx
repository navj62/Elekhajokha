"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronRight, Search, UserPlus } from "lucide-react";

import { Sheet } from "@/components/ui/Sheet";
import { StatusBadge } from "@/components/ui/DataTable";
import { fmtDate, fmtINR } from "@/components/ui/DetailParts";
import { pledgeAddHref } from "./navConfig";

/* ------------------------------------------------------------------ */
/*  Quick-action customer picker — shared by Add Pledge and Release.   */
/*                                                                      */
/*  Before typing : GET /api/customers/recent (Release: ?openOnly=1)   */
/*  Typing        : GET /api/customers/search?q=…&take=20              */
/*                  (Release: &filterBy=OPEN = ACTIVE + OVERDUE)       */
/*  Add      → closes and routes to the new-pledge form (?from=quick). */
/*  Release  → step 2 in the SAME sheet: the customer's open pledges   */
/*             (GET /api/customers/[id]/open-pledges); the footer       */
/*             routes to the EXISTING single or bulk release screen.   */
/*             Nothing is released here.                               */
/* ------------------------------------------------------------------ */

export type PickerMode = "add" | "release";

const SEARCH_TAKE = 20;
const DEBOUNCE_MS = 250;

interface PickerCustomer {
  id: string;
  name: string;
  mobile: string | null;
  region: string | null;
  openPledgeCount: number;
}

interface OpenPledge {
  id: string;
  status: string;
  itemLabel: string;
  pledgeDate: string;
  loanAmount: number;
  dueToday: number;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function SkeletonRows({ tall = false }: { tall?: boolean }) {
  return (
    <div className="space-y-2 py-1" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className={`skeleton w-full rounded-xl ${tall ? "h-[76px]" : "h-14"}`} />
      ))}
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center">
      <p className="text-[13px] text-risk-critical-foreground">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="min-h-11 rounded-[12px] border border-border bg-card px-5 text-[13px] font-semibold text-foreground transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        Retry
      </button>
    </div>
  );
}

/** Arrow-key movement between [data-nav-row] buttons inside `container`. */
function moveFocus(container: HTMLElement | null, from: Element | null, dir: 1 | -1) {
  if (!container) return false;
  const rows = Array.from(container.querySelectorAll<HTMLElement>("[data-nav-row]"));
  if (!rows.length) return false;
  const i = from ? rows.indexOf(from as HTMLElement) : -1;
  const next = i === -1 ? (dir === 1 ? 0 : rows.length - 1) : Math.min(Math.max(i + dir, 0), rows.length - 1);
  rows[next].focus();
  return true;
}

/* ================================================================== */
/*  Step 2 (Release) — the chosen customer's open pledges              */
/* ================================================================== */

function ReleaseStep({
  customer,
  reloadKey,
  onRetry,
  selected,
  setSelected,
  onLoaded,
}: {
  customer: PickerCustomer;
  reloadKey: number;
  onRetry: () => void;
  selected: Set<string>;
  setSelected: (s: Set<string>) => void;
  onLoaded: (pledges: OpenPledge[]) => void;
}) {
  const [state, setState] = React.useState<"loading" | "ready" | "error">("loading");
  const [pledges, setPledges] = React.useState<OpenPledge[]>([]);
  const listRef = React.useRef<HTMLUListElement>(null);

  React.useEffect(() => {
    const ac = new AbortController();
    fetch(`/api/customers/${customer.id}/open-pledges`, { signal: ac.signal, cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => {
        const rows: OpenPledge[] = Array.isArray(d?.pledges) ? d.pledges : [];
        setPledges(rows);
        setState("ready");
        onLoaded(rows);
        // Exactly one open pledge: pre-tick it.
        if (rows.length === 1) setSelected(new Set([rows[0].id]));
      })
      .catch((e) => {
        if (e?.name !== "AbortError") setState("error");
      });
    return () => ac.abort();
    // onLoaded/setSelected are stable setters from the parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer.id, reloadKey]);

  if (state === "error")
    return <ErrorState message="Couldn't load this customer's pledges." onRetry={onRetry} />;
  if (state === "loading") return <SkeletonRows tall />;
  if (pledges.length === 0)
    return <p className="py-8 text-center text-[13px] text-muted-foreground">This customer has no open pledges.</p>;

  const allSelected = selected.size === pledges.length;
  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  return (
    <div className="flex flex-col gap-2">
      {pledges.length >= 2 && (
        <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 text-[13px] font-semibold text-foreground hover:bg-accent">
          <input
            type="checkbox"
            checked={allSelected}
            ref={(el) => {
              if (el) el.indeterminate = selected.size > 0 && !allSelected;
            }}
            onChange={() => setSelected(allSelected ? new Set() : new Set(pledges.map((p) => p.id)))}
            className="size-5 shrink-0 accent-[var(--primary)]"
          />
          Select all ({pledges.length})
        </label>
      )}

      <ul
        ref={listRef}
        className="flex flex-col gap-2"
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            if (moveFocus(listRef.current, document.activeElement, e.key === "ArrowDown" ? 1 : -1)) e.preventDefault();
          }
        }}
      >
        {pledges.map((p) => {
          const checked = selected.has(p.id);
          const labelId = `open-pledge-${p.id}`;
          return (
            <li key={p.id}>
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 transition-colors ${
                  checked ? "border-primary bg-accent" : "border-border bg-card hover:bg-accent"
                }`}
              >
                {/* 44px hit area around the native checkbox */}
                <span className="-m-2.5 flex size-11 shrink-0 items-center justify-center">
                  <input
                    type="checkbox"
                    data-nav-row
                    checked={checked}
                    onChange={() => toggle(p.id)}
                    aria-labelledby={labelId}
                    className="size-5 accent-[var(--primary)]"
                  />
                </span>
                <span id={labelId} className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-[14px] font-semibold text-foreground">{p.itemLabel}</span>
                    {p.status === "OVERDUE" && <StatusBadge tone="overdue">Overdue</StatusBadge>}
                  </span>
                  <span className="mt-0.5 block text-[12px] text-muted-foreground">
                    Pledged {fmtDate(p.pledgeDate)} · Loan {fmtINR(p.loanAmount)}
                  </span>
                  <span className="mt-1 block text-[14px] font-bold text-foreground">Due today {fmtINR(p.dueToday)}</span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ================================================================== */
/*  The sheet                                                          */
/* ================================================================== */

export default function CustomerPickerSheet({
  open,
  mode,
  onOpenChange,
  onCloseAutoFocus,
}: {
  open: boolean;
  mode: PickerMode;
  onOpenChange: (o: boolean) => void;
  onCloseAutoFocus?: (e: Event) => void;
}) {
  const router = useRouter();
  const isRelease = mode === "release";

  const [q, setQ] = React.useState("");
  const [rows, setRows] = React.useState<PickerCustomer[]>([]);
  const [rowsFor, setRowsFor] = React.useState<string | null>(null); // the query `rows` answer
  const [loadState, setLoadState] = React.useState<"loading" | "ready" | "error">("loading");
  const [reloadKey, setReloadKey] = React.useState(0);

  // Release step 2
  const [chosen, setChosen] = React.useState<PickerCustomer | null>(null);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [pledgeTotals, setPledgeTotals] = React.useState<Map<string, number>>(new Map());
  const [stepKey, setStepKey] = React.useState(0);

  const inputRef = React.useRef<HTMLInputElement>(null);
  const backRef = React.useRef<HTMLButtonElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);

  const trimmed = q.trim();
  const queryKey = `${mode}|${trimmed}|${reloadKey}`;

  // Recent (instant) or search (debounced). Aborted on every change/close so a
  // slow response can never replace a newer one.
  React.useEffect(() => {
    if (!open || chosen) return;
    const ac = new AbortController();
    const url = trimmed
      ? `/api/customers/search?q=${encodeURIComponent(trimmed)}&take=${SEARCH_TAKE}${isRelease ? "&filterBy=OPEN" : ""}`
      : `/api/customers/recent${isRelease ? "?openOnly=1" : ""}`;
    const timer = setTimeout(
      () => {
        setLoadState("loading");
        fetch(url, { signal: ac.signal, cache: "no-store" })
          .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
          .then((d) => {
            setRows(Array.isArray(d?.customers) ? d.customers : []);
            setRowsFor(queryKey);
            setLoadState("ready");
          })
          .catch((e) => {
            if (e?.name !== "AbortError") setLoadState("error");
          });
      },
      trimmed ? DEBOUNCE_MS : 0
    );
    return () => {
      ac.abort();
      clearTimeout(timer);
    };
  }, [open, chosen, trimmed, isRelease, queryKey]);

  // Focus follows the step: the search box on step 1, the back button on step 2.
  React.useEffect(() => {
    if (!open) return;
    (chosen ? backRef : inputRef).current?.focus();
  }, [open, chosen]);

  // Reset on close (an event, not an effect) so the next open starts fresh.
  const handleOpenChange = React.useCallback(
    (o: boolean) => {
      if (!o) {
        setQ("");
        setRows([]);
        setRowsFor(null);
        setLoadState("loading");
        setChosen(null);
        setSelected(new Set());
      }
      onOpenChange(o);
    },
    [onOpenChange]
  );

  const pickCustomer = (c: PickerCustomer) => {
    if (!isRelease) {
      handleOpenChange(false);
      router.push(`${pledgeAddHref(c.id)}?from=quick`);
      return;
    }
    setSelected(new Set());
    setPledgeTotals(new Map());
    setChosen(c);
  };

  const backToSearch = () => {
    setChosen(null); // the query is kept
    setSelected(new Set());
  };

  const onPledgesLoaded = React.useCallback((ps: OpenPledge[]) => {
    setPledgeTotals(new Map(ps.map((p) => [p.id, p.dueToday])));
  }, []);

  const goRelease = () => {
    if (!chosen || selected.size === 0) return;
    const ids = Array.from(pledgeTotals.keys()).filter((id) => selected.has(id)); // oldest first
    const href =
      ids.length === 1
        ? `/customers/${chosen.id}/pledges/${ids[0]}/release?from=quick`
        : `/customers/${chosen.id}/release-bulk?ids=${ids.join(",")}&from=quick`;
    handleOpenChange(false);
    router.push(href);
  };

  const selectedTotal = Array.from(selected).reduce((s, id) => s + (pledgeTotals.get(id) ?? 0), 0);
  const fresh = rowsFor === queryKey;

  /* ---------------- header / footer per step ---------------- */
  const title = chosen ? (
    <span className="flex items-center gap-1">
      <button
        ref={backRef}
        type="button"
        onClick={backToSearch}
        aria-label="Back to customer search"
        className="-ml-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <ArrowLeft size={18} />
      </button>
      <span className="min-w-0 truncate">{chosen.name} · open pledges</span>
    </span>
  ) : isRelease ? (
    "Release pledge for…"
  ) : (
    "Add pledge for…"
  );

  const footer = chosen ? (
    <button
      type="button"
      onClick={goRelease}
      disabled={selected.size === 0}
      className="min-h-12 w-full rounded-[12px] bg-primary px-5 text-[14px] font-bold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
    >
      {selected.size === 0
        ? "Select pledges to release"
        : `Release ${plural(selected.size, "pledge", "pledges")} · ${fmtINR(selectedTotal)} →`}
    </button>
  ) : undefined;

  /* ---------------- step 1 body ---------------- */
  const searchBody = (
    <>
      <div className="sticky top-0 z-1 -mx-1 bg-card px-1 pb-3">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 focus-within:ring-[3px] focus-within:ring-ring/50">
          <Search size={16} className="shrink-0 text-muted-foreground-subtle" aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" && moveFocus(listRef.current, null, 1)) e.preventDefault();
            }}
            placeholder="Name or mobile number"
            aria-label="Search customers by name or mobile number"
            className="min-h-11 w-full bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground-subtle"
          />
        </div>
      </div>

      {!trimmed && (
        <h3 className="px-1 pb-2 text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
          Recent customers
        </h3>
      )}

      {loadState === "error" ? (
        <ErrorState message="Couldn't load customers." onRetry={() => setReloadKey((k) => k + 1)} />
      ) : !fresh && rows.length === 0 ? (
        <SkeletonRows />
      ) : fresh && rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <p className="text-[13px] text-muted-foreground">
            {trimmed
              ? `No customers match “${trimmed}”`
              : isRelease
                ? "No customers have open pledges."
                : "No customers yet."}
          </p>
          {!isRelease && (
            <Link
              href="/add-customer"
              onClick={() => handleOpenChange(false)}
              className="inline-flex min-h-11 items-center gap-2 rounded-[12px] border border-border bg-card px-5 text-[13px] font-semibold text-foreground transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <UserPlus size={16} aria-hidden="true" /> Add new customer
            </Link>
          )}
        </div>
      ) : (
        <ul
          ref={listRef}
          aria-label={trimmed ? "Matching customers" : "Recent customers"}
          aria-busy={!fresh}
          className={`-mx-1 flex flex-col gap-0.5 transition-opacity ${fresh ? "" : "opacity-60"}`}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              const dir = e.key === "ArrowDown" ? 1 : -1;
              const rowsEls = listRef.current?.querySelectorAll("[data-nav-row]");
              if (dir === -1 && rowsEls && document.activeElement === rowsEls[0]) {
                inputRef.current?.focus();
                e.preventDefault();
                return;
              }
              if (moveFocus(listRef.current, document.activeElement, dir)) e.preventDefault();
            }
          }}
        >
          {rows.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                data-nav-row
                onClick={() => pickCustomer(c)}
                className="flex min-h-14 w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] leading-normal font-semibold text-foreground">{c.name}</span>
                  {c.mobile && <span className="block text-[13px] text-foreground/80 tabular-nums">{c.mobile}</span>}
                  <span className="block truncate text-[12px] text-muted-foreground">
                    {[c.region, plural(c.openPledgeCount, "open pledge", "open pledges")].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <ChevronRight size={16} className="shrink-0 text-muted-foreground-subtle" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );

  return (
    <Sheet
      open={open}
      onOpenChange={handleOpenChange}
      title={title}
      description={chosen ? chosen.mobile ?? "No mobile number" : "Pick a customer by name or mobile number."}
      size="picker"
      footer={footer}
      onCloseAutoFocus={onCloseAutoFocus}
    >
      {/* Announces the step change to screen readers. */}
      <p className="sr-only" aria-live="polite">
        {chosen ? `Showing open pledges for ${chosen.name}. Select pledges to release.` : ""}
      </p>

      <div
        key={chosen ? `step2-${chosen.id}` : "step1"}
        className="animate-in fade-in-0 slide-in-from-right-2 duration-200 motion-reduce:animate-none"
      >
        {chosen ? (
          <ReleaseStep
            key={`${chosen.id}-${stepKey}`}
            customer={chosen}
            reloadKey={stepKey}
            onRetry={() => setStepKey((k) => k + 1)}
            selected={selected}
            setSelected={setSelected}
            onLoaded={onPledgesLoaded}
          />
        ) : (
          searchBody
        )}
      </div>
    </Sheet>
  );
}
