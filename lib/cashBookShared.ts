/**
 * Cash book — the client-safe half: input rules, the opening/drawer
 * arithmetic, labels. No Prisma import, so the day page and the dashboard
 * card can use exactly the rules the server enforces.
 *
 * The server half (SQL, locking, writes) is lib/cashBook.ts.
 */

export const CASH_DIRECTIONS = ["IN", "OUT"] as const;
export const CASH_MODES = ["CASH", "UPI", "BANK"] as const;
export const CASH_KINDS = [
  "PLEDGE_CREATED",
  "PLEDGE_RELEASED",
  "PLEDGE_SOLD",
  "INVENTORY_BOUGHT",
  "INVENTORY_SOLD",
  "REPAYMENT",
  "TOPUP",
  "REVERSAL",
  "MANUAL",
] as const;

export type CashDirectionValue = (typeof CASH_DIRECTIONS)[number];
export type CashModeValue = (typeof CASH_MODES)[number];
export type CashKindValue = (typeof CASH_KINDS)[number];

/** ₹10,00,00,000 — same ceiling as a pledge's loan amount. */
export const CASH_MAX_AMOUNT = 100_000_000;
export const CASH_NOTE_MAX = 500;

/* ------------------------------------------------------------------ */
/*  Input parsing                                                       */
/* ------------------------------------------------------------------ */

export type Parsed<T> = { ok: true; value: T } | { ok: false; message: string };

const MONEY_RE = /^\d{1,10}(\.\d{1,2})?$/;

/**
 * A rupee amount from a request body: a plain decimal with at most 2
 * decimals, at most CASH_MAX_AMOUNT, and > 0 unless `allowZero`. Accepts a
 * number or a string, and returns the canonical string the DB stores, so no
 * float ever reaches a money column.
 */
export function parseCashAmount(value: unknown, opts: { allowZero?: boolean } = {}): Parsed<string> {
  const raw = typeof value === "number" ? (Number.isFinite(value) ? String(value) : "") : typeof value === "string" ? value.trim() : "";
  if (!MONEY_RE.test(raw)) return { ok: false, message: "Enter an amount with at most 2 decimal places." };
  const n = Number(raw);
  if (n > CASH_MAX_AMOUNT) return { ok: false, message: "Amount must be at most ₹10,00,00,000." };
  if (n === 0 && !opts.allowZero) return { ok: false, message: "Amount must be greater than 0." };
  return { ok: true, value: n.toFixed(2) };
}

export function parseCashDirection(value: unknown): Parsed<CashDirectionValue> {
  return CASH_DIRECTIONS.includes(value as CashDirectionValue)
    ? { ok: true, value: value as CashDirectionValue }
    : { ok: false, message: "Direction must be IN or OUT." };
}

export function parseCashMode(value: unknown): Parsed<CashModeValue> {
  return CASH_MODES.includes(value as CashModeValue)
    ? { ok: true, value: value as CashModeValue }
    : { ok: false, message: "Mode must be CASH, UPI or BANK." };
}

/** Optional note: trimmed, blank → null, at most CASH_NOTE_MAX characters. */
export function parseCashNote(value: unknown): Parsed<string | null> {
  if (value === undefined || value === null) return { ok: true, value: null };
  if (typeof value !== "string") return { ok: false, message: "Note must be text." };
  const t = value.trim();
  if (t.length > CASH_NOTE_MAX) return { ok: false, message: `Note must be at most ${CASH_NOTE_MAX} characters.` };
  return { ok: true, value: t || null };
}

/** A strict YYYY-MM-DD calendar date (rejects 2026-02-31). */
export function isIsoDay(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return false;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.getUTCFullYear() === Number(m[1]) && d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3]);
}

/* ------------------------------------------------------------------ */
/*  Day arithmetic                                                      */
/* ------------------------------------------------------------------ */
// Work in integer paise so a sum of 2-dp strings is exact.
const toPaise = (s: string) => Math.round(Number(s) * 100);
const fromPaise = (p: number) => (p / 100).toFixed(2);

export interface DayFigures {
  /** Carried from the previous day (counted cash, else expected closing). */
  carriedOpening: string | null;
  /** Owner's edit of the opening, if any. */
  openingOverride: string | null;
  cashIn: string;
  cashOut: string;
  countedCash: string | null;
}

export interface ResolvedDay {
  opening: string | null;
  /** Override set and different from what was carried. */
  openingEdited: boolean;
  /** override − carried, when edited and both are known. */
  openingDifference: string | null;
  /** opening + cash in − cash out; null while the opening is not set. */
  expected: string | null;
  /** counted − expected, when both are known. */
  countDifference: string | null;
  negativeDrawer: boolean;
}

export function resolveDay(d: DayFigures): ResolvedDay {
  const opening = d.openingOverride ?? d.carriedOpening;
  const openingEdited =
    d.openingOverride !== null && d.carriedOpening !== null && toPaise(d.openingOverride) !== toPaise(d.carriedOpening);
  const openingDifference = openingEdited
    ? fromPaise(toPaise(d.openingOverride!) - toPaise(d.carriedOpening!))
    : null;
  const expectedP = opening === null ? null : toPaise(opening) + toPaise(d.cashIn) - toPaise(d.cashOut);
  const expected = expectedP === null ? null : fromPaise(expectedP);
  const countDifference =
    d.countedCash !== null && expectedP !== null ? fromPaise(toPaise(d.countedCash) - expectedP) : null;
  return {
    opening,
    openingEdited,
    openingDifference,
    expected,
    countDifference,
    negativeDrawer: expectedP !== null && expectedP < 0,
  };
}

/* ------------------------------------------------------------------ */
/*  Labels                                                              */
/* ------------------------------------------------------------------ */
// TODO(i18n): English-only, like the other redesigned pages.
export const CASH_KIND_LABEL: Record<CashKindValue, string> = {
  PLEDGE_CREATED: "Loan given",
  PLEDGE_RELEASED: "Pledge released",
  PLEDGE_SOLD: "Pledge sold to shop",
  INVENTORY_BOUGHT: "Item bought",
  INVENTORY_SOLD: "Item sold",
  REPAYMENT: "Repayment",
  TOPUP: "Top-up",
  REVERSAL: "Reversal",
  MANUAL: "Manual entry",
};

export const CASH_MODE_LABEL: Record<CashModeValue, string> = {
  CASH: "Cash",
  UPI: "UPI",
  BANK: "Bank",
};

/** A PLEDGE_SOLD entry for ₹0: the debt cancelled and no cash changed hands. */
export function cashEntryTitle(kind: CashKindValue, amount: string): string {
  if (kind === "PLEDGE_SOLD" && toPaise(amount) === 0) return "Debt settled, no cash";
  return CASH_KIND_LABEL[kind];
}
