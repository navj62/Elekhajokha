// lib/import/normalize/purity.ts
//
// Purity -> percent (docs/import-feature.md §7), e.g. 22K -> "91.6".
//   8-24    karats       (hallmark table for the standard ones)
//   500-999 fineness     (916 -> 91.6)
//   50-100  percent
// Anything else, or a value that fits no range, is a question. A unit written
// in the cell ("22K", "91.6%") settles the reading without a range guess.

import {
  divideInt,
  formatDecimal,
  multiply,
  padDecimal,
  parseDecimal,
  roundDecimal,
  trimDecimal,
  wholeNumber,
} from "./decimal";
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
  questionIssue,
  toAsciiDigits,
} from "./result";

export type PurityMode = "karat" | "fineness" | "percent";

/** Indian hallmark fineness for the standard gold karats, as percent. */
export const KARAT_TO_PERCENT: Readonly<Record<number, string>> = {
  24: "99.9",
  22: "91.6",
  21: "87.5",
  20: "83.3",
  18: "75.0",
  14: "58.3",
  9: "37.5",
};

const KARAT_SUFFIX = /\s*(?:k|kt|karat|carat|ct|कैरेट|केरेट|कैरट|कैरेट्स)\.?$/i;
const PERCENT_SUFFIX = /\s*(?:%|percent|प्रतिशत)$/i;

export const PURITY_QUESTION_OPTIONS = ["Karat (e.g. 22)", "Fineness (e.g. 916)", "Percent (e.g. 91.6)"];

function fromKarat(karatText: string): string | null {
  const n = Number(karatText);
  if (Number.isInteger(n) && KARAT_TO_PERCENT[n]) return KARAT_TO_PERCENT[n];
  const parsed = parseDecimal(karatText);
  if (!parsed) return null;
  // karat / 24 * 100, exact then rounded to 2 dp.
  const percent = divideInt(multiply(parsed, wholeNumber(100)), BigInt(24), 2);
  return trimDecimal(formatDecimal(percent));
}

function fromFineness(finenessText: string): string | null {
  const parsed = parseDecimal(finenessText);
  if (!parsed) return null;
  // fineness / 10, one decimal place minimum: 916 -> "91.6", 750 -> "75.0".
  const percent = padDecimal(roundDecimal({ n: parsed.n, scale: parsed.scale + 1 }, 2), 1);
  return formatDecimal(percent);
}

/**
 * @param mode  When the column header or the owner already says which reading
 *              applies, pass it: the range guess is skipped.
 */
export function normalizePurity(
  raw: unknown,
  ctx: NormCtx,
  mode?: PurityMode,
): NormResult<string | null> {
  if (isEmptyCell(raw)) return ok(null);

  let forced: PurityMode | undefined = mode;
  let body: unknown = raw;
  if (typeof raw === "string") {
    let text = toAsciiDigits(cleanText(raw));
    if (KARAT_SUFFIX.test(text)) {
      text = text.replace(KARAT_SUFFIX, "");
      forced = "karat";
    } else if (PERCENT_SUFFIX.test(text)) {
      text = text.replace(PERCENT_SUFFIX, "");
      forced = "percent";
    }
    body = text;
  }

  const numeric = normalizeNumber(body, ctx);
  if (isIssue(numeric)) return numeric;
  const text = numeric.value;
  if (text === null) return ok(null);
  const value = Number(text);
  if (!(value > 0)) return errorIssue(ctx, "Purity must be greater than zero");

  const what = forced ?? (value >= 8 && value <= 24 ? "karat" : value >= 500 && value <= 999 ? "fineness" : value >= 50 && value <= 100 ? "percent" : null);

  if (what === null) {
    return questionIssue(
      ctx,
      "Is this purity in karats, fineness (like 916) or percent? It does not fit a standard range",
      PURITY_QUESTION_OPTIONS,
    );
  }

  if (what === "karat") {
    if (value > 24) return errorIssue(ctx, "Karat cannot be above 24");
    const percent = fromKarat(text);
    return percent ? fixed(percent, `Converted ${text} karat to percent`) : errorIssue(ctx, "Not a valid purity");
  }
  if (what === "fineness") {
    if (value > 1000) return errorIssue(ctx, "Fineness cannot be above 1000");
    const percent = fromFineness(text);
    return percent ? fixed(percent, `Converted fineness ${text} to percent`) : errorIssue(ctx, "Not a valid purity");
  }
  if (value > 100) return errorIssue(ctx, "Percent cannot be above 100");
  return numeric.fixed ? numeric : ok(text);
}
