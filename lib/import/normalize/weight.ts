// lib/import/normalize/weight.ts
//
// Weight -> grams as plain text, at most 3 decimals (docs/import-feature.md §7).
// Reads the number and the unit out of cells like "वज़न ४ ग्राम" or "4 gm".
// A cell with no unit is grams (the app's unit) unless the column says
// otherwise. Tola is never converted automatically: it becomes a question.

import {
  divideInt,
  formatDecimal,
  multiply,
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

export type WeightUnit = "g" | "kg" | "mg" | "tola";

const UNIT_WORDS: Record<WeightUnit, string[]> = {
  g: ["g", "gm", "gms", "gr", "grm", "gram", "grams", "ग्राम", "ग्रा", "ग्रम", "ग्राम्", "ग"],
  kg: ["kg", "kgs", "kilo", "kilos", "kilogram", "kilograms", "किलो", "किग्रा", "किलोग्राम"],
  mg: ["mg", "mgs", "milligram", "milligrams", "मिग्रा", "मिलीग्राम"],
  tola: ["tola", "tolas", "tol", "तोला", "तोले", "तोल"],
};

const WORD_TO_UNIT = new Map<string, WeightUnit>();
for (const [unit, words] of Object.entries(UNIT_WORDS) as [WeightUnit, string[]][]) {
  for (const word of words) WORD_TO_UNIT.set(word, unit);
}

/** Labels people write before the number ("वज़न", "wt", "weight"). Letters only, so they can be dropped. */
const LABEL = /^(?:वज़न|वजन|वज्न|भार|wt|weight|wgt)\s*[:\-=]?\s*/i;

const NUMBER_TOKEN = /(?:\d[\d,]*(?:\.\d+)?|\.\d+)/g;

function unitKey(word: string): string {
  return word.normalize("NFC").replace(/़/g, "").replace(/[.\s]+$/g, "").toLowerCase();
}

/**
 * Reads a unit out of a column header: "Weight (kg)", "वज़न (ग्राम)", "wt in grams".
 * Returns null when the header says nothing, so the caller can ask.
 */
export function detectWeightUnitFromHeader(header: string): WeightUnit | null {
  const text = toAsciiDigits(cleanText(header));
  const words = text.split(/[^\p{L}\p{M}]+/u).filter(Boolean);
  for (const word of words) {
    const unit = WORD_TO_UNIT.get(unitKey(word));
    if (unit && word.length > 1) return unit;
  }
  return null;
}

function toGrams(amount: string, unit: "g" | "kg" | "mg"): string | null {
  const parsed = parseDecimal(amount);
  if (!parsed) return null;
  let grams;
  if (unit === "g") grams = parsed;
  else if (unit === "kg") grams = multiply(parsed, wholeNumber(1000));
  else grams = divideInt(parsed, BigInt(1000), 3);
  return trimDecimal(formatDecimal(roundDecimal(grams, 3)));
}

/**
 * @param columnUnit  Unit stated by the column header or the owner's answer.
 *                    Used when the cell itself has no unit. Default: grams.
 */
export function normalizeWeight(
  raw: unknown,
  ctx: NormCtx,
  columnUnit: WeightUnit = "g",
): NormResult<string | null> {
  if (isEmptyCell(raw)) return ok(null);

  let amountInput: string | number;
  let cellUnit: WeightUnit | null = null;
  let hadWords = false;

  if (typeof raw === "number") {
    amountInput = raw;
  } else if (typeof raw === "string") {
    let text = toAsciiDigits(cleanText(raw));
    text = text.replace(LABEL, "");
    if (/(?:^|\s)-\s*[\d.]/.test(text)) return errorIssue(ctx, "A weight cannot be negative");
    const tokens = text.match(NUMBER_TOKEN) ?? [];
    if (tokens.length === 0) return errorIssue(ctx, "No weight found in this cell");
    if (tokens.length > 1) {
      return errorIssue(ctx, "More than one number in this weight cell. Enter a single weight");
    }
    const rest = text.replace(NUMBER_TOKEN, " ").replace(/[()[\]:=\-_/]/g, " ").trim();
    if (rest) {
      hadWords = true;
      const unit = WORD_TO_UNIT.get(unitKey(rest.replace(/\s+/g, "")));
      if (!unit) {
        return questionIssue(
          ctx,
          `Unknown weight unit "${rest.slice(0, 20)}". Which unit is this weight in?`,
          ["Grams", "Kilograms", "Milligrams"],
        );
      }
      cellUnit = unit;
    }
    amountInput = tokens[0] ?? "";
  } else {
    return errorIssue(ctx, "Not a valid weight");
  }

  const numeric = normalizeNumber(amountInput, ctx);
  if (isIssue(numeric)) return numeric;
  if (numeric.value === null) return ok(null);

  const unit = cellUnit ?? columnUnit;
  if (unit === "tola") {
    return questionIssue(
      ctx,
      "This weight is in tola. Tola is not converted automatically. Enter the weight in grams",
    );
  }

  const grams = toGrams(numeric.value, unit);
  if (grams === null) return errorIssue(ctx, "Not a valid weight");

  if (unit === "g" && !hadWords && grams === numeric.value) return numeric;
  const note =
    unit === "g" ? "Read the weight in grams from the text" : `Converted from ${unit} to grams`;
  return fixed(grams, note);
}
