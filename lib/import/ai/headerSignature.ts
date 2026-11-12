// lib/import/ai/headerSignature.ts
//
// Stable fingerprint of a sheet's header row, for the future per-shop mapping
// cache. Pure. Where the cache is stored is decided in Phase 4; nothing is
// persisted here.

import { createHash } from "node:crypto";

const PLACEHOLDER = /^column \d+$/;

/**
 * Case, spacing and BOM differences do not change the signature; column order
 * and wording do. Empty headers and the parser's "Column N" placeholders are
 * ignored, so a stray blank column does not break a cache hit.
 */
export function headerSignature(headers: readonly string[]): string {
  const normalized = headers
    .map((h) => h.replace(/^﻿/, "").normalize("NFC").replace(/\s+/g, " ").trim().toLowerCase())
    .filter((h) => h !== "" && !PLACEHOLDER.test(h));
  return createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
}
