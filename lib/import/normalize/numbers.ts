// lib/import/normalize/numbers.ts
//
// Numbers -> plain text like "12500.50" (docs/import-feature.md §7).
// Strips ₹/Rs and spaces, accepts Indian ("1,25,000") and Western ("125,000")
// thousands separators, converts Devanagari digits and removes Excel float
// noise (0.30000000000000004 -> "0.3"). Never uses floats for arithmetic.

import {
  type NormCtx,
  type NormResult,
  cleanText,
  errorIssue,
  fixed,
  isEmptyCell,
  ok,
  toAsciiDigits,
} from "./result";

const PLAIN = /^\d+(?:\.\d*)?$|^\.\d+$/;
const WESTERN = /^\d{1,3}(?:,\d{3})+(?:\.\d*)?$/;
const INDIAN = /^\d{1,2}(?:,\d{2})*,\d{3}(?:\.\d*)?$/;

/** Largest magnitude a spreadsheet number can carry here without losing digits. */
const MAX_SAFE_MAGNITUDE = 1e15;

/**
 * Text form of a JS number from a spreadsheet cell. toPrecision(15) drops
 * binary noise (0.1 + 0.2 -> "0.3") while keeping every digit a person typed.
 */
function numberCellToText(n: number): { text: string; noise: boolean } | null {
  if (!Number.isFinite(n) || Math.abs(n) >= MAX_SAFE_MAGNITUDE) return null;
  const clean = trimTrailingZeros(Math.abs(n).toPrecision(15));
  const sign = n < 0 ? "-" : "";
  return { text: sign + clean, noise: clean !== String(Math.abs(n)) };
}

function trimTrailingZeros(text: string): string {
  if (!text.includes(".")) return text;
  return text.replace(/0+$/, "").replace(/\.$/, "");
}

/** Removes currency marks and spaces; returns the bare numeric text. */
function stripDecoration(text: string): string {
  return text
    .replace(/[₹]/g, "")
    .replace(/\b(?:rs|inr|rupees?)\b\.?/gi, "")
    .replace(/रु(?:पये|पया)?\.?/g, "")
    .replace(/\/-/g, "")
    .replace(/\s+/g, "");
}

export type NumberOptions = {
  /** Allow a leading minus sign (default false: ledger amounts are positive). */
  allowNegative?: boolean;
};

/**
 * Normalizes one cell to a plain decimal string.
 * Blank cells and "NULL"/"-" placeholders give { value: null }.
 */
export function normalizeNumber(
  raw: unknown,
  ctx: NormCtx,
  options: NumberOptions = {},
): NormResult<string | null> {
  if (isEmptyCell(raw)) return ok(null);

  if (typeof raw === "boolean") return errorIssue(ctx, "Expected a number, found Yes/No");

  let text: string;
  let noise = false;
  if (typeof raw === "number") {
    const fromCell = numberCellToText(raw);
    if (!fromCell) return errorIssue(ctx, "Number is too large or not valid");
    text = fromCell.text;
    noise = fromCell.noise;
  } else if (typeof raw === "string") {
    text = stripDecoration(toAsciiDigits(cleanText(raw)));
  } else {
    return errorIssue(ctx, "Expected a number");
  }

  let negative = false;
  if (text.startsWith("-")) {
    negative = true;
    text = text.slice(1);
  } else if (text.startsWith("(") && text.endsWith(")")) {
    negative = true;
    text = text.slice(1, -1);
  }

  let separatorsRemoved = false;
  if (text.includes(",")) {
    if (WESTERN.test(text) || INDIAN.test(text)) {
      text = text.replace(/,/g, "");
      separatorsRemoved = true;
    } else if (/^\d+,\d{1,2}$/.test(text)) {
      // "12,5" could be a decimal comma or a typo. Never guess.
      return errorIssue(ctx, "Unclear use of a comma in this number. Use a dot for decimals");
    } else {
      return errorIssue(ctx, "Not a valid number");
    }
  }

  if (!PLAIN.test(text)) return errorIssue(ctx, "Not a valid number");

  if (negative && !options.allowNegative) {
    return errorIssue(ctx, "Negative amounts are not allowed");
  }

  // Canonical form: "5." -> "5", ".5" -> "0.5", "007" -> "7".
  const [rawInt = "", fracPart = ""] = text.split(".");
  const intPart = rawInt.replace(/^0+(?=\d)/, "") || "0";
  const canonical = (negative ? "-" : "") + intPart + (fracPart ? "." + fracPart : "");

  const original = typeof raw === "string" ? raw.trim() : null;
  if (noise) return fixed(canonical, "Removed spreadsheet rounding noise");
  if (original !== null && original !== canonical) {
    const why = separatorsRemoved ? "Removed thousands separators" : "Cleaned up the number";
    return fixed(canonical, why);
  }
  return ok(canonical);
}
