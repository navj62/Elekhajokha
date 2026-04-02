// app/api/access/route.ts
import { NextResponse }       from "next/server";
import { auth }               from "@clerk/nextjs/server";
import { prisma }             from "@/lib/prisma";
import { SubscriptionStatus } from "@prisma/client";

// ── Constants ─────────────────────────────────────────────────────────────────
const MS_PER_DAY      = 1000 * 60 * 60 * 24;
const GRACE_PERIOD_MS = 10 * 60 * 1000; // 10 min grace window after create-subscription

// Maps Prisma enum → frontend-safe reason string for "inactive" status.
// Never send raw DB enums to the client — rename-safe.
const INACTIVE_REASON_MAP: Partial<Record<SubscriptionStatus, string>> = {
  [SubscriptionStatus.halted]:    "payment_failed",      
  [SubscriptionStatus.expired]:   "expired",
  [SubscriptionStatus.trial]:     "trial_expired",   // safety net
};

// ── Route Handler ─────────────────────────────────────────────────────────────
export async function GET() {
  let userId: string | null = null;

  try {
    ({ userId } = await auth());

    // ── 401 Unauthenticated ───────────────────────────────────────────────
    if (!userId) {
      return NextResponse.json(
        // user_not_found / unauthenticated — no DB user yet, hadTrial defaults to false
        { hasAccess: false, status: "unauthenticated", hadTrial: false },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where:  { clerkUserId: userId },
      select: {
        subscriptionStatus:    true,
        subscriptionPlan:      true,
        subscriptionEndDate:   true,
        subscriptionCreatedAt: true,
        isActive:              true,
        deletedAt:             true,
        hadTrial:              true, // required — SubscribePage reads this on every response
      },
    });

    // ── 404 User not in DB ────────────────────────────────────────────────
    // No hadTrial available — SubscribePage defaults it to false safely
    if (!user) {
      return NextResponse.json(
        { hasAccess: false, status: "user_not_found", hadTrial: false },
        { status: 404 }
      );
    }

    // ── 403 Account suspended / soft-deleted ──────────────────────────────
    // Check BEFORE subscription status — suspended accounts never get access
    // regardless of payment state.
    if (!user.isActive || user.deletedAt !== null) {
      return NextResponse.json(
        { hasAccess: false, status: "account_suspended", hadTrial: user.hadTrial },
        { status: 403 }
      );
    }

    const now = new Date();

    // ── 🔵 TRIAL ──────────────────────────────────────────────────────────
    if (user.subscriptionStatus === SubscriptionStatus.trial) {
      const isExpired =
        !!user.subscriptionEndDate &&
        user.subscriptionEndDate.getTime() < now.getTime();

      if (isExpired) {
        return NextResponse.json(
          { hasAccess: false, status: "trial_expired", hadTrial: user.hadTrial },
          { status: 402 }
        );
      }

      return NextResponse.json({
        hasAccess: true,
        status:    "trial",
        hadTrial:  user.hadTrial,
        daysLeft:  user.subscriptionEndDate
          ? Math.ceil((user.subscriptionEndDate.getTime() - now.getTime()) / MS_PER_DAY)
          : null,
        endDate:   user.subscriptionEndDate,
      });
    }

    // ── 🟡 CREATED (payment pending — grace window) ───────────────────────
    // Grace window gives the webhook time to fire after a real payment.
    // Without a time limit, any user who calls create-subscription without
    // paying would have hasAccess: true forever.
    if (user.subscriptionStatus === SubscriptionStatus.created) {
      if (!user.subscriptionCreatedAt) {
        console.error(
          `[/api/access] userId:${userId} — status=created but subscriptionCreatedAt is null`
        );
        return NextResponse.json(
          { hasAccess: false, status: "invalid_state", hadTrial: user.hadTrial },
          { status: 409 }
        );
      }

      const ageMs = now.getTime() - user.subscriptionCreatedAt.getTime();

      if (ageMs < GRACE_PERIOD_MS) {
        // Payment genuinely in progress — tell frontend to poll
        return NextResponse.json({
          hasAccess: true,
          status:    "processing",
          hadTrial:  user.hadTrial,
        });
      }

      // Grace window expired — webhook never came, payment likely abandoned
      return NextResponse.json(
        { hasAccess: false, status: "payment_timeout", hadTrial: user.hadTrial },
        { status: 402 }
      );
    }

    // ── 🟢 ACTIVE ─────────────────────────────────────────────────────────
    if (user.subscriptionStatus === SubscriptionStatus.active) {
      const isExpired =
        !!user.subscriptionEndDate &&
        user.subscriptionEndDate.getTime() < now.getTime();

      // Active in DB but end date passed — webhook may have missed a renewal
      if (isExpired) {
        return NextResponse.json(
          { hasAccess: false, status: "expired", hadTrial: user.hadTrial },
          { status: 402 }
        );
      }

      return NextResponse.json({
        hasAccess: true,
        status:    "active",
        hadTrial:  user.hadTrial,
        plan:      user.subscriptionPlan,
        endDate:   user.subscriptionEndDate,
        // null = webhook fired but end date not set yet — handle gracefully on frontend
        daysLeft:  user.subscriptionEndDate
          ? Math.ceil((user.subscriptionEndDate.getTime() - now.getTime()) / MS_PER_DAY)
          : null,
      });
    }

    // ── 🔴 INACTIVE — halted / cancelled / any unhandled state ────────────
    // Map raw Prisma enum to a frontend-safe reason string.
    // Falls back to "unknown" for future enum values not yet in the map.
    return NextResponse.json(
      {
        hasAccess: false,
        status:    "inactive",
        hadTrial:  user.hadTrial,
        reason:    INACTIVE_REASON_MAP[user.subscriptionStatus] ?? "unknown",
      },
      { status: 402 }
    );

  } catch (err) {
    console.error(`[/api/access] userId:${userId ?? "unknown"} —`, err);
    return NextResponse.json(
      // hadTrial unknown on server error — default to false
      { hasAccess: false, status: "server_error", hadTrial: false },
      { status: 500 }
    );
  }
}