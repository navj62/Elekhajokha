// lib/import/normalize/result.ts
//
// Shared result shape for every normalizer (docs/import-feature.md §7).
// A normalizer returns { value }, { value, fixed } or an ImportIssue.
// Pure and client-safe: no server imports.

import type { ImportIssue } from "../types";

/** Which row and field a problem belongs to. Used to build an ImportIssue. */
export type NormCtx = { rowRef: string; field: string };

/** `fixed` says in plain words what the normalizer changed, so the owner can see it. */
export type NormOk<T> = { value: T; fixed?: string };

export type NormResult<T> = NormOk<T> | ImportIssue;

export function isIssue<T>(result: NormResult<T>): result is ImportIssue {
  return "kind" in result;
}

export function ok<T>(value: T): NormOk<T> {
  return { value };
}

export function fixed<T>(value: T, note: string): NormOk<T> {
  return { value, fixed: note };
}

export function errorIssue(ctx: NormCtx, message: string): ImportIssue {
  return { rowRef: ctx.rowRef, field: ctx.field, kind: "error", message };
}

export function questionIssue(
  ctx: NormCtx,
  message: string,
  options?: string[],
  suggestion?: string,
): ImportIssue {
  return {
    rowRef: ctx.rowRef,
    field: ctx.field,
    kind: "question",
    message,
    ...(options && options.length > 0 ? { options } : {}),
    ...(suggestion !== undefined ? { suggestion } : {}),
  };
}

/** Text that stands for "no value" in ledgers and database exports. */
const EMPTY_WORDS = new Set(["", "null", "nil", "none", "n/a", "na", "-", "--", "—", "–"]);

/** True for blank cells and "NULL"/"N/A"/"-" style placeholders. */
export function isEmptyCell(raw: unknown): boolean {
  if (raw === null || raw === undefined) return true;
  if (typeof raw === "string") return EMPTY_WORDS.has(raw.trim().toLowerCase());
  return false;
}

const DEVANAGARI_ZERO = 0x0966;

/** Devanagari digits ०-९ to ASCII 0-9. Everything else is left alone. */
export function toAsciiDigits(text: string): string {
  return text.replace(/[०-९]/g, (ch) => String(ch.charCodeAt(0) - DEVANAGARI_ZERO));
}

/** Collapses NBSP and other unusual spaces, then trims. */
export function cleanText(text: string): string {
  return text.replace(/[  -​ ﻿]/g, " ").trim();
}
