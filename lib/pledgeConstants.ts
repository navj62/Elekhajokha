// lib/pledgeConstants.ts
//
// Pledge-lifecycle invariants that MUST agree across every route, script and
// screen that closes or counts a pledge. They lived as copy-pasted literals in
// 20+ places; a divergent copy is a financial-integrity bug, not a style issue.

/**
 * Stamped onto every `PledgeAudit` row (and the matching `Pledge` row) at
 * release and at sale-to-inventory.
 *
 * BUMPING THIS CHANGES THE MEANING OF EVERY AUDIT ROW WRITTEN AFTERWARD.
 * Rows keep the version they were written with, so reporting code can tell
 * "computed by the old formula" from "computed by the new one" — that only
 * works if the bump accompanies a real change to the interest/valuation math.
 * Never bump it as part of a refactor.
 */
export const CALCULATION_VERSION = 1;

/**
 * The open, non-terminal pledge statuses. A pledge in one of these can still be
 * released (single or bulk) or sold to inventory; RELEASED and SOLD are
 * terminal. Every closure/transition guard must accept BOTH — an ACTIVE-only
 * guard on a closure path is a bug.
 *
 * NOTE: nothing in the codebase currently writes OVERDUE (there is no maturity
 * -date concept). It stays in this list deliberately, so the day one lands
 * nothing has to be re-audited.
 *
 * Prisma's `in` wants a mutable array, so pass `[...OPEN_PLEDGE_STATUSES]` at
 * query sites. For a plain comparison use `isOpenPledgeStatus` below.
 *
 * The raw SQL in app/api/dashboard/regions-explorer/route.ts cannot interpolate
 * this const and spells the pair out as SQL literals. Those must change with it.
 */
export const OPEN_PLEDGE_STATUSES = ["ACTIVE", "OVERDUE"] as const;

export type OpenPledgeStatus = (typeof OPEN_PLEDGE_STATUSES)[number];

/** True when a pledge status is open (ACTIVE or OVERDUE), i.e. still closable. */
export function isOpenPledgeStatus(status: string): boolean {
  return (OPEN_PLEDGE_STATUSES as readonly string[]).includes(status);
}
