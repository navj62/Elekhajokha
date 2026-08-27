// lib/weights.ts
//
// Pure-metal weight derivation. Server-side derivation is authoritative
// (Invariant 3): netWeightOfMetal is NEVER trusted from the client. This helper
// exists so the create-pledge route and the create-pledge form's on-screen
// preview cannot drift — the number the owner sees while typing is the number
// the server will store.

/**
 * Pure-metal content of one pledge item, in grams, rounded to 3 dp.
 *
 * `round(netWeight × purity/100, 3dp)`. Per-item rounding happens HERE, before
 * any summing, so the round-then-sum order of the stored per-item values and
 * the pledge's netWeightOfGold/netWeightOfSilver aggregates match exactly
 * (Invariant 2). Accepts `unknown` because callers hand it raw form strings.
 */
export function metalContent(netWeight: unknown, purity: unknown): number {
  return Math.round(Number(netWeight) * (Number(purity) / 100) * 1000) / 1000;
}
