// lib/import/normalize/interestRate.ts
//
// Interest rate (docs/import-feature.md §7). The app stores PERCENT PER YEAR.
// Ledgers often write the monthly rate (2 means 2% a month), so the unit is
// decided per file: if every rate in the column is below 6, ask. The final
// value is checked with the app's own rule, checkInterestRate.

import { checkInterestRate } from "../../interestRate";
import { multiply, formatDecimal, parseDecimal, trimDecimal, wholeNumber } from "./decimal";
import { normalizeNumber } from "./numbers";
import {
  type NormCtx,
  type NormResult,
  cleanText,
  errorIssue,
  fixed,
  isEmptyCell,
  isIssue,
  ok,
} from "./result";

export type RateUnit = "MONTHLY" | "YEARLY";

/** Rates below this are probably per month. */
export const MONTHLY_RATE_THRESHOLD = 6;

const PERCENT_SUFFIX = /\s*(?:%|percent|प्रतिशत|प्र\.?\s*श\.?)\s*$/i;

/**
 * Reads one rate cell as written in the file ("2", "2%", "२.५", 0.02 is not
 * guessed). The unit is applied later by applyRateUnit.
 */
export function normalizeRate(raw: unknown, ctx: NormCtx): NormResult<string | null> {
  if (isEmptyCell(raw)) return ok(null);
  const body = typeof raw === "string" ? cleanText(raw).replace(PERCENT_SUFFIX, "") : raw;
  const numeric = normalizeNumber(body, ctx);
  if (isIssue(numeric)) return numeric;
  if (numeric.value === null) return ok(null);
  if (!(Number(numeric.value) > 0)) return errorIssue(ctx, "Interest rate must be greater than 0");
  return numeric.fixed ? numeric : ok(numeric.value);
}

export type RateUnitDetection =
  | { status: "NONE" }
  /** Every rate is 6 or more: treated as per year. */
  | { status: "YEARLY" }
  /** Ask the owner "per month or per year?" once for the whole file. */
  | { status: "ASK"; reason: "ALL_BELOW_6" | "MIXED" };

/**
 * Looks at the whole rate column. All below 6 -> ask. A mix of small and
 * large rates is also asked: one column cannot be both units, and guessing
 * would misprice some pledges by 12 times.
 */
export function detectRateUnit(values: readonly unknown[]): RateUnitDetection {
  const rates: number[] = [];
  for (const raw of values) {
    const result = normalizeRate(raw, { rowRef: "", field: "interestRate" });
    if (isIssue(result) || result.value === null) continue;
    rates.push(Number(result.value));
  }
  if (rates.length === 0) return { status: "NONE" };
  const small = rates.filter((r) => r < MONTHLY_RATE_THRESHOLD).length;
  if (small === rates.length) return { status: "ASK", reason: "ALL_BELOW_6" };
  if (small > 0) return { status: "ASK", reason: "MIXED" };
  return { status: "YEARLY" };
}

/**
 * Converts a normalized rate to percent per year and applies the app's rate
 * rule (above 0, at most 100, at most 2 decimals).
 */
export function applyRateUnit(
  rate: string,
  unit: RateUnit,
  ctx: NormCtx,
): NormResult<string> {
  const parsed = parseDecimal(rate);
  if (!parsed) return errorIssue(ctx, "Not a valid interest rate");
  const yearly = unit === "MONTHLY" ? trimDecimal(formatDecimal(multiply(parsed, wholeNumber(12)))) : rate;
  const check = checkInterestRate(yearly);
  if (!check.ok) return errorIssue(ctx, check.message);
  return unit === "MONTHLY"
    ? fixed(check.value, `Converted ${rate}% per month to ${check.value}% per year`)
    : ok(check.value);
}
