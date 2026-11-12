// lib/import/subscription.ts
//
// Server-side subscription check for import routes. It repeats the decision
// rules of app/api/access/route.ts, in the same order and with the same
// constants, and gives the same hasAccess answer.
//
// Unlike that route it is READ-ONLY: it never creates a user, never calls
// Razorpay (no self-heal) and never writes lastGraceExpiredAt. Known
// difference: a paid user still at `created` after the grace window is
// refused here until /api/access heals the row (the app calls it on every
// page load through useAccess).
//
// tests/import/accessParity.test.ts runs the real route and this function on
// the same user states and fails if they ever disagree. If the rules in the
// access route change, change them here too.

import { SubscriptionStatus } from "@prisma/client";

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const GRACE_PERIOD_MS = 10 * 60 * 1000;

/** The User columns the decision reads. */
export type ImportAccessUser = {
  subscriptionStatus: SubscriptionStatus;
  subscriptionEndDate: Date | null;
  subscriptionCreatedAt: Date | null;
  lastGraceExpiredAt: Date | null;
  isActive: boolean;
  deletedAt: Date | null;
};

export type ImportAccessStatus =
  | "account_suspended"
  | "trial"
  | "trial_expired"
  | "processing"
  | "payment_required"
  | "payment_timeout"
  | "active"
  | "expired"
  | "inactive";

export type ImportAccess = { hasAccess: boolean; status: ImportAccessStatus };

export function evaluateImportAccess(user: ImportAccessUser, now: Date): ImportAccess {
  // Suspended or soft-deleted accounts never get access, whatever they paid.
  if (!user.isActive || user.deletedAt !== null) {
    return { hasAccess: false, status: "account_suspended" };
  }

  const nowMs = now.getTime();
  const endPassed =
    !!user.subscriptionEndDate && user.subscriptionEndDate.getTime() < nowMs;

  if (user.subscriptionStatus === SubscriptionStatus.trial) {
    return endPassed
      ? { hasAccess: false, status: "trial_expired" }
      : { hasAccess: true, status: "trial" };
  }

  if (user.subscriptionStatus === SubscriptionStatus.created) {
    // A `created` row with no timestamp is treated as expired.
    if (!user.subscriptionCreatedAt) {
      return { hasAccess: false, status: "expired" };
    }

    const ageMs = nowMs - user.subscriptionCreatedAt.getTime();
    if (ageMs < GRACE_PERIOD_MS) {
      // Anti-farming: no fresh window within 24h of a wasted one.
      if (
        user.lastGraceExpiredAt !== null &&
        nowMs - user.lastGraceExpiredAt.getTime() < MS_PER_DAY
      ) {
        return { hasAccess: false, status: "payment_required" };
      }
      return { hasAccess: true, status: "processing" };
    }

    return { hasAccess: false, status: "payment_timeout" };
  }

  if (user.subscriptionStatus === SubscriptionStatus.active) {
    return endPassed
      ? { hasAccess: false, status: "expired" }
      : { hasAccess: true, status: "active" };
  }

  // halted, expired, or any future status.
  return { hasAccess: false, status: "inactive" };
}
