// lib/import/normalize/mobile.ts
//
// Mobile -> 10 digits, no +91 and no leading 0 (docs/import-feature.md §7).
// Also splits cells that hold a name and a number together.

import {
  type NormCtx,
  type NormResult,
  cleanText,
  errorIssue,
  fixed,
  isEmptyCell,
  ok,
  questionIssue,
  toAsciiDigits,
} from "./result";

const MASK_CHARS = /[xX*#]/;

/** Digits of one phone number with country code and trunk zero removed, or null. */
function cleanDigits(text: string): string | null {
  let digits = text.replace(/\D/g, "");
  if (digits.startsWith("0091")) digits = digits.slice(4);
  else if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

const SEPARATORS = /\s*(?:[/,;|]|\bor\b|\band\b|या|और)\s*/i;

export function normalizeMobile(raw: unknown, ctx: NormCtx): NormResult<string | null> {
  if (isEmptyCell(raw)) return ok(null);

  let text: string;
  if (typeof raw === "number") {
    if (!Number.isFinite(raw) || raw < 0) return errorIssue(ctx, "Not a valid mobile number");
    text = String(Math.trunc(raw));
  } else if (typeof raw === "string") {
    text = toAsciiDigits(cleanText(raw));
  } else {
    return errorIssue(ctx, "Not a valid mobile number");
  }

  if (MASK_CHARS.test(text)) {
    return errorIssue(ctx, "The number is masked or incomplete, so it cannot be used");
  }

  const parts = text.split(SEPARATORS).filter((p) => /\d/.test(p));
  if (parts.length > 1) {
    const valid = parts.map(cleanDigits).filter((d): d is string => d !== null);
    const unique = [...new Set(valid)];
    if (unique.length > 1) {
      return questionIssue(ctx, "More than one mobile number in this cell. Which one should be used?", unique, unique[0]);
    }
    if (unique.length === 1 && valid.length === parts.length) {
      return fixed(unique[0], "Found the same number more than once");
    }
  }

  const digits = cleanDigits(text);
  if (!digits) return errorIssue(ctx, "Enter a 10-digit Indian mobile number");

  const original = typeof raw === "string" ? raw.trim() : String(raw);
  return original === digits ? ok(digits) : fixed(digits, "Removed spaces, dashes or the country code");
}

export type NameAndMobile = { name: string; mobile: string | null };

/** A phone-looking run: optional +91/0091/0, then 10 digits that may be spaced or dashed. */
const PHONE_RUN = /(?:\+?\s*91[\s-]*|0091[\s-]*|0[\s-]*)?[6-9](?:[\s-]?\d){9}/g;

/**
 * Splits a cell like "रमेश 98765 43210" or "Ramesh - 9876543210" into the
 * name and the number. A cell with no number gives the name alone. Two
 * different numbers are a question; the cell is never split by guessing.
 */
export function splitNameAndMobile(raw: unknown, ctx: NormCtx): NormResult<NameAndMobile> {
  if (typeof raw === "number") return errorIssue(ctx, "Expected a name, found a number");
  if (typeof raw !== "string" || isEmptyCell(raw)) return errorIssue(ctx, "This field is required");

  const text = toAsciiDigits(cleanText(raw));
  const runs = text.match(PHONE_RUN) ?? [];
  const numbers = runs.map(cleanDigits).filter((d): d is string => d !== null);
  const unique = [...new Set(numbers)];

  if (unique.length === 0) return ok({ name: text, mobile: null });
  if (unique.length > 1) {
    return questionIssue(ctx, "More than one mobile number next to this name. Which one should be used?", unique, unique[0]);
  }

  let name = text;
  for (const run of runs) name = name.replace(run, " ");
  name = name
    .replace(/[()[\]:,;|]|\s[-–—]\s|^[-–—]\s|\s[-–—]$/g, " ")
    .replace(/\b(?:mob|mobile|ph|phone|cell|no|मो|मोबाइल|फोन)\b\.?:?/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!name) return errorIssue(ctx, "No name found next to the mobile number");
  return fixed({ name, mobile: unique[0] }, "Split the name and the mobile number");
}
