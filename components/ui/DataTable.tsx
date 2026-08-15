"use client";

import * as React from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  DataTable — one table, two presentations.                          */
/*                                                                     */
/*  lg:+  : a real <table>, as today.                                  */
/*  < lg  : card-per-row. Each row collapses into a stacked card.      */
/*                                                                     */
/*  Why cards and not horizontal scroll: at 380px a table shows two or */
/*  three columns, and in this app the columns pushed off-screen are   */
/*  the ones that decide things — Receivable, LTV, Interest. An owner  */
/*  confirming a bulk release must not be able to commit without ever  */
/*  seeing the receivable. A card shows every field of one row at      */
/*  once, each one labelled.                                           */
/*                                                                     */
/*  Note on the old markup this replaces: the 19 hand-rolled tables    */
/*  all wrapped `<table class="w-full">` in `overflow-x-auto`, which   */
/*  does nothing — a full-width table shrinks to its container instead */
/*  of scrolling. Those wrappers were decorative; the columns crushed. */
/*                                                                     */
/*  EXCEPTION — do not convert /reports/pledges and /reports/customers.*/
/*  They are print-shaped PDF previews; nobody decides anything there, */
/*  they download. Those two keep a scrolling table with an explicit   */
/*  min-w-.                                                            */
/*                                                                     */
/*  CARD CONTRACT (uniform across every consumer):                     */
/*    role "identity" — line 1. The card is the primary tap target     */
/*                      wherever the table row was clickable.          */
/*    role "primary"  — line 2, the one decision-driving number, at    */
/*                      display size. Declared per table.              */
/*    role "trailing" — status / risk badge, top-right. Use            */
/*                      <StatusBadge>, which is always word + colour.  */
/*    role "body"     — everything else, as label/value pairs.         */
/*    role "hidden"   — desktop-only (row numbers, spacer columns).    */
/*    actions         — one row of >= 44px LABELLED buttons at the     */
/*                      card foot. Icon-only + title= does not survive */
/*                      the trip to touch; use the word.               */
/*    selection       — >= 44px tap zone; once anything is selected,   */
/*                      the whole card toggles instead of navigating.  */
/*                                                                     */
/*  Money: cells render exact `toLocaleString("en-IN")` values. Never  */
/*  abbreviate inside a card — formatCurrencyAbbr is for axis labels   */
/*  and at-a-glance KPIs, not for amounts being compared or acted on.  */
/* ------------------------------------------------------------------ */

export type ColumnRole = "identity" | "primary" | "trailing" | "body" | "hidden";

export interface DataTableColumn<T> {
  key: string;
  /** Table header text. Also the card's label unless `label` overrides it. */
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  /** Card placement. Defaults to "body". */
  role?: ColumnRole;
  /** Card label, when the table header is too terse or too long for a card. */
  label?: React.ReactNode;
  align?: "left" | "right" | "center";
  headerClassName?: string;
  cellClassName?: string;
}

export interface DataTableSelection<T> {
  selectedIds: readonly string[];
  onToggle: (id: string, next: boolean) => void;
  /** Omit to hide the header select-all checkbox. */
  onToggleAll?: (next: boolean) => void;
  /** Rows that cannot be selected — e.g. already-closed pledges. */
  isSelectable?: (row: T) => boolean;
}

export interface DataTableProps<T> {
  rows: readonly T[];
  columns: readonly DataTableColumn<T>[];
  /**
   * Desktop column sequence, by key. Defaults to `columns` order.
   *
   * `columns` is ordered for the CARD contract — identity, then the
   * decision-driving number, then the badge — which is rarely the order the
   * desktop table already shows. Set this to the table's existing sequence
   * so converting a page does not silently reshuffle columns for owners who
   * have been reading them in one order for months. Cards ignore it: they
   * position by role, not by index.
   *
   * Keys not listed keep their declared order and are appended.
   */
  tableOrder?: readonly string[];
  rowId: (row: T) => string;
  /** Accessible name for both the table and the card list. */
  label: string;
  /** Accessible name for a row's tap target. Falls back to `label`. */
  rowLabel?: (row: T) => string;
  /** Makes the row and the whole card navigate. */
  rowHref?: (row: T) => string;
  /** Alternative to rowHref for non-navigation row taps. */
  onRowClick?: (row: T) => void;
  /** Row actions. Buttons are stretched to >= 44px on the card foot. */
  actions?: (row: T) => React.ReactNode;
  actionsHeader?: React.ReactNode;
  selection?: DataTableSelection<T>;
  empty?: React.ReactNode;
  className?: string;
}

const ALIGN: Record<NonNullable<DataTableColumn<unknown>["align"]>, string> = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
};

/* ------------------------------------------------------------------ */
/*  Checkbox with a 44px tap zone around a 20px box.                   */
/*  The visual size stays small; only the target grows.                */
/* ------------------------------------------------------------------ */
function CheckZone({
  checked,
  disabled,
  onChange,
  label,
  className,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  label: string;
  className?: string;
}) {
  return (
    <span className={cn("pointer-events-auto -m-2 inline-flex size-11 shrink-0 items-center justify-center", className)}>
      <input
        type="checkbox"
        aria-label={label}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        onClick={(e) => e.stopPropagation()}
        className="size-5 cursor-pointer accent-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-40"
      />
    </span>
  );
}

export function DataTable<T>({
  rows,
  columns,
  tableOrder,
  rowId,
  label,
  rowLabel,
  rowHref,
  onRowClick,
  actions,
  actionsHeader,
  selection,
  empty,
  className,
}: DataTableProps<T>) {
  const identity = columns.find((c) => c.role === "identity") ?? columns[0];
  const primary = columns.find((c) => c.role === "primary");
  const trailing = columns.find((c) => c.role === "trailing");
  const bodyCols = columns.filter((c) => {
    const role = c.role ?? "body";
    return role === "body";
  });

  /* Desktop column sequence. Same column objects, reordered — so identity
     lookups by reference still hold. Cards are unaffected: they read roles. */
  const tableColumns = React.useMemo(() => {
    if (!tableOrder?.length) return columns;
    const remaining = new Map(columns.map((c) => [c.key, c]));
    const ordered: DataTableColumn<T>[] = [];
    for (const key of tableOrder) {
      const col = remaining.get(key);
      if (col) {
        ordered.push(col);
        remaining.delete(key);
      } else if (process.env.NODE_ENV !== "production") {
        console.warn(`DataTable "${label}": tableOrder key "${key}" matches no column.`);
      }
    }
    for (const col of columns) if (remaining.has(col.key)) ordered.push(col);
    return ordered;
  }, [columns, tableOrder, label]);

  const selectedSet = React.useMemo(
    () => new Set(selection?.selectedIds ?? []),
    [selection?.selectedIds],
  );
  /* Once anything is selected the list is "in selection mode": a card tap
     toggles rather than navigates, so a selecting owner cannot lose the
     screen by mis-hitting a card. */
  const selectionMode = !!selection && selectedSet.size > 0;

  const selectableRows = selection ? rows.filter((r) => selection.isSelectable?.(r) ?? true) : [];
  const allSelected =
    selectableRows.length > 0 && selectableRows.every((r) => selectedSet.has(rowId(r)));

  if (rows.length === 0 && empty) {
    return <>{empty}</>;
  }

  return (
    <div className={className}>
      {/* ══════════════════ Desktop: a real table ══════════════════ */}
      <div className="hidden overflow-hidden rounded-2xl border border-border lg:block">
        <table className="w-full border-collapse text-left text-[13px]">
          <caption className="sr-only">{label}</caption>
          <thead>
            <tr className="border-b border-border bg-card-alt">
              {selection && (
                <th scope="col" className="w-[52px] py-3 pl-4 pr-2">
                  {selection.onToggleAll ? (
                    <CheckZone
                      checked={allSelected}
                      disabled={selectableRows.length === 0}
                      onChange={(next) => selection.onToggleAll?.(next)}
                      label={allSelected ? "Deselect all rows" : "Select all rows"}
                    />
                  ) : (
                    <span className="sr-only">Select</span>
                  )}
                </th>
              )}
              {tableColumns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={cn(
                    "px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground-subtle",
                    ALIGN[c.align ?? "left"],
                    c.headerClassName,
                  )}
                >
                  {c.header}
                </th>
              ))}
              {actions && (
                <th scope="col" className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground-subtle">
                  {actionsHeader ?? "Actions"}
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const id = rowId(row);
              const href = rowHref?.(row);
              const selectable = selection?.isSelectable?.(row) ?? true;
              return (
                <tr
                  key={id}
                  onClick={onRowClick && !selectionMode ? () => onRowClick(row) : undefined}
                  className={cn(
                    "border-b border-border last:border-b-0",
                    (href || onRowClick) && "cursor-pointer hover:bg-accent/40",
                    selectedSet.has(id) && "bg-accent/60",
                  )}
                >
                  {selection && (
                    <td className="py-3 pl-4 pr-2 align-middle">
                      <CheckZone
                        checked={selectedSet.has(id)}
                        disabled={!selectable}
                        onChange={(next) => selection.onToggle(id, next)}
                        label={`Select ${rowLabel?.(row) ?? id}`}
                      />
                    </td>
                  )}
                  {tableColumns.map((c) => (
                    <td
                      key={c.key}
                      className={cn(
                        "px-4 py-4 align-middle text-foreground",
                        ALIGN[c.align ?? "left"],
                        c.cellClassName,
                      )}
                    >
                      {href && c === identity ? (
                        <Link href={href} className="hover:underline">
                          {c.cell(row)}
                        </Link>
                      ) : (
                        c.cell(row)
                      )}
                    </td>
                  ))}
                  {actions && (
                    <td className="px-4 py-4 text-right align-middle">
                      <div className="flex items-center justify-end gap-2">{actions(row)}</div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ══════════════════ Mobile: card per row ══════════════════ */}
      <ul aria-label={label} className="flex flex-col gap-3 lg:hidden">
        {rows.map((row) => {
          const id = rowId(row);
          const href = rowHref?.(row);
          const selected = selectedSet.has(id);
          const selectable = selection?.isSelectable?.(row) ?? true;
          const name = rowLabel?.(row) ?? label;

          /* The whole card is the tap target, laid over the content rather
             than wrapped around it — wrapping would nest the action buttons
             inside a link, which is invalid and unusable with a screen
             reader. Content is pointer-events-none so taps fall through to
             this overlay; actions and checkboxes opt back in. */
          const overlay = selectionMode ? (
            <button
              type="button"
              aria-label={`${selected ? "Deselect" : "Select"} ${name}`}
              aria-pressed={selected}
              disabled={!selectable}
              onClick={() => selection?.onToggle(id, !selected)}
              className="absolute inset-0 z-0 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
            />
          ) : href ? (
            <Link
              href={href}
              aria-label={name}
              className="absolute inset-0 z-0 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
            />
          ) : onRowClick ? (
            <button
              type="button"
              aria-label={name}
              onClick={() => onRowClick(row)}
              className="absolute inset-0 z-0 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
            />
          ) : null;

          return (
            <li
              key={id}
              className={cn(
                "relative rounded-2xl border bg-card transition-colors",
                selected ? "border-primary bg-accent/50" : "border-border",
              )}
            >
              {overlay}

              <div className="pointer-events-none relative z-10 p-4">
                {/* ── Line 1: identity, plus selection and the badge ── */}
                <div className="flex items-start gap-3">
                  {selection && (
                    <CheckZone
                      checked={selected}
                      disabled={!selectable}
                      onChange={(next) => selection.onToggle(id, next)}
                      label={`Select ${name}`}
                      className="mt-0.5"
                    />
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] font-bold leading-snug text-foreground">
                      {identity?.cell(row)}
                    </div>

                    {/* ── Line 2: the decision-driving number ── */}
                    {primary && (
                      <div className="mt-1.5">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground-subtle">
                          {primary.label ?? primary.header}
                        </div>
                        <div className="mt-0.5 text-[22px] font-bold leading-none tabular-nums text-foreground">
                          {primary.cell(row)}
                        </div>
                      </div>
                    )}
                  </div>

                  {trailing && <div className="shrink-0">{trailing.cell(row)}</div>}
                </div>

                {/* ── Body: label/value pairs ── */}
                {bodyCols.length > 0 && (
                  <dl className="mt-3.5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-3.5">
                    {bodyCols.map((c) => (
                      <div key={c.key} className="min-w-0">
                        <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground-subtle">
                          {c.label ?? c.header}
                        </dt>
                        <dd className="mt-1 text-[13.5px] font-semibold tabular-nums break-words text-foreground">
                          {c.cell(row)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}

                {/* ── Actions: >= 44px, labelled, side by side ── */}
                {actions && (
                  <div className="pointer-events-auto mt-3.5 flex items-stretch gap-2 border-t border-border pt-3.5 [&>*]:min-h-11 [&>*]:flex-1">
                    {actions(row)}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  StatusBadge — the card contract's trailing slot.                   */
/*                                                                     */
/*  Word + colour, always. Risk tier drives money decisions and is     */
/*  read at a glance, so it is never communicated by colour alone.     */
/*  Tones map 1:1 onto the --status-* / --risk-* token families, which */
/*  carry their own dark-mode values.                                  */
/* ------------------------------------------------------------------ */

export type BadgeTone =
  | "active"
  | "released"
  | "sold"
  | "overdue"
  | "safe"
  | "watch"
  | "at-risk"
  | "critical";

const TONE_SURFACE: Record<BadgeTone, string> = {
  active: "bg-status-active-surface text-status-active-foreground",
  released: "bg-status-released-surface text-status-released-foreground",
  sold: "bg-status-sold-surface text-status-sold-foreground",
  // OVERDUE is dead in production — no pledge is ever marked it. Retained
  // only because the enum and the token family still exist.
  overdue: "bg-status-overdue-surface text-status-overdue-foreground",
  safe: "bg-risk-low-surface text-risk-low-foreground",
  watch: "bg-risk-medium-surface text-risk-medium-foreground",
  "at-risk": "bg-risk-high-surface text-risk-high-foreground",
  critical: "bg-risk-critical-surface text-risk-critical-foreground",
};

const TONE_DOT: Record<BadgeTone, string> = {
  active: "bg-status-active",
  released: "bg-status-released",
  sold: "bg-status-sold",
  overdue: "bg-status-overdue",
  safe: "bg-risk-low",
  watch: "bg-risk-medium",
  "at-risk": "bg-risk-high",
  critical: "bg-risk-critical",
};

export function StatusBadge({
  tone,
  children,
  className,
}: {
  tone: BadgeTone;
  /** The word. Required — a bare colour is not a status. */
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold whitespace-nowrap",
        TONE_SURFACE[tone],
        className,
      )}
    >
      <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", TONE_DOT[tone])} />
      {children}
    </span>
  );
}

export default DataTable;
