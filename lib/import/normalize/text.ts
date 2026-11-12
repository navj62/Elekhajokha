// lib/import/normalize/text.ts
//
// Free-text fields (names, addresses). A value made only of "?" or the
// Unicode replacement character U+FFFD is what an export leaves behind when
// it cannot write the original (Hindi) text. It is not a name: it must never
// pass as one, and the owner has to type the real value or exclude the row.

import {
  type NormCtx,
  type NormResult,
  cleanText,
  errorIssue,
  isEmptyCell,
  ok,
} from "./result";

const LOST_IN_EXPORT = /^[?\uFFFD\s]+$/;

/** True for text with no real characters, only "?" and/or "\uFFFD" (and spaces). */
export function isLostInExport(text: string): boolean {
  return LOST_IN_EXPORT.test(text) && /[?\uFFFD]/.test(text);
}

/**
 * Trims a name or address. Blank gives { value: null } (the schema decides
 * whether the field is required). "?????" gives an error issue.
 */
export function normalizeText(raw: unknown, ctx: NormCtx): NormResult<string | null> {
  if (isEmptyCell(raw)) return ok(null);
  const text = typeof raw === "number" ? String(raw) : typeof raw === "string" ? cleanText(raw) : null;
  if (text === null) return errorIssue(ctx, "Expected text");
  if (isLostInExport(text)) {
    return errorIssue(ctx, "This value was lost when the file was exported (only ? marks are left). Type the real value");
  }
  return ok(text.replace(/\s+/g, " "));
}
