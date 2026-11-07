// lib/reports/activeColumns.ts
//
// The Active Pledges report's column picker — one definition shared by the
// Reports page, the export route and activePledgesTable, so the screen, the
// .xlsx and the PDF can never disagree about which columns exist, which are
// locked, or what a key means. Client-safe: no server imports.
import { z } from "zod";

export const ACTIVE_COLUMNS = [
  { key: "customer", header: "Customer", locked: true },
  { key: "pledgeDate", header: "Date", locked: true },
  { key: "pledge", header: "Pledge", locked: true },
  { key: "itemType", header: "Type", locked: false },
  { key: "grossWeight", header: "Gross Wt", locked: false },
  { key: "goldWeight", header: "Gold Wt", locked: false },
  { key: "silverWeight", header: "Silver Wt", locked: false },
  { key: "loanAmount", header: "Loan", locked: false },
  { key: "interestRate", header: "Rate", locked: false },
  { key: "interestAccrued", header: "Interest", locked: false },
  { key: "receivable", header: "Receivable", locked: false },
  { key: "ltv", header: "LTV", locked: false },
  { key: "riskTier", header: "Risk Tier", locked: false },
  { key: "status", header: "Status", locked: false },
] as const;

export type ActiveColumnKey = (typeof ACTIVE_COLUMNS)[number]["key"];

export const ACTIVE_COLUMN_KEYS = ACTIVE_COLUMNS.map((c) => c.key) as [ActiveColumnKey, ...ActiveColumnKey[]];
export const LOCKED_ACTIVE_COLUMNS: readonly ActiveColumnKey[] = ACTIVE_COLUMNS.filter((c) => c.locked).map((c) => c.key);

const isLocked = (k: ActiveColumnKey) => LOCKED_ACTIVE_COLUMNS.includes(k);

/** Visible keys from hidden ones: fixed order, locked columns always kept. */
export function visibleActiveColumns(hidden: readonly ActiveColumnKey[]): ActiveColumnKey[] {
  return ACTIVE_COLUMN_KEYS.filter((k) => isLocked(k) || !hidden.includes(k));
}

/** Hidden keys from visible ones, in column order (never a locked column). */
export function hiddenActiveColumns(visible: readonly ActiveColumnKey[]): ActiveColumnKey[] {
  return ACTIVE_COLUMN_KEYS.filter((k) => !isLocked(k) && !visible.includes(k));
}

export const activeColumnHeader = (k: ActiveColumnKey) => ACTIVE_COLUMNS.find((c) => c.key === k)!.header;

// ── Export query param ──────────────────────────────────────────────────────

const columnsSchema = z.array(z.enum(ACTIVE_COLUMN_KEYS));

/**
 * `columns` on /api/reports/export (Active Pledges only):
 *   absent → every column · "" → locked columns only ·
 *   any unknown key → not ok (400). Order and duplicates are ignored;
 *   locked columns are always added.
 */
export function parseActiveColumnsParam(
  raw: string | null
): { ok: true; visible: ActiveColumnKey[] } | { ok: false } {
  if (raw === null) return { ok: true, visible: [...ACTIVE_COLUMN_KEYS] };
  const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
  const parsed = columnsSchema.safeParse(parts);
  if (!parsed.success) return { ok: false };
  return { ok: true, visible: ACTIVE_COLUMN_KEYS.filter((k) => isLocked(k) || parsed.data.includes(k)) };
}

/** The query param value for a set of hidden columns, or null for "all" (param omitted). */
export function activeColumnsParam(hidden: readonly ActiveColumnKey[]): string | null {
  return hidden.length ? visibleActiveColumns(hidden).join(",") : null;
}

// ── Per-device memory (localStorage) ────────────────────────────────────────

export const activeColumnsStorageKey = (userId: string) => `reports.active.hiddenColumns:${userId}`;

/**
 * Stored value → hidden keys. Stores HIDDEN keys, so a column added later
 * shows by default. Missing, corrupt, non-array or unknown/locked entries
 * all fall back toward "every column shown".
 */
export function parseStoredHiddenColumns(raw: string | null): ActiveColumnKey[] {
  if (!raw) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  return ACTIVE_COLUMN_KEYS.filter((k) => !isLocked(k) && data.includes(k));
}
