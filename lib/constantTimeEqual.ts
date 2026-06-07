// lib/constantTimeEqual.ts
import crypto from "crypto";

/**
 * Constant-time string comparison for secrets / signatures.
 * Returns false on length mismatch (timingSafeEqual throws otherwise).
 * Server-only — imports node:crypto.
 */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
