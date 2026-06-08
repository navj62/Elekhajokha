// app/api/access/route.ts
import { NextResponse }       from "next/server";
import { auth }               from "@clerk/nextjs/server";
import Razorpay               from "razorpay";
import { prisma }             from "@/lib/prisma";
import { SubscriptionStatus } from "@prisma/client";
import { subscriptionGrantsAccess, subscriptionEndDate } from "@/lib/razorpaySubscription";

// ── Constants ─────────────────────────────────────────────────────────────────
const MS_PER_DAY      = 1000 * 60 * 60 * 24;
const GRACE_PERIOD_MS = 10 * 60 * 1000; // 10 min grace window after create-subscription

// Razorpay client for the self-heal path — returns null (rather than throwing)
// if keys are unset, so a misconfiguration never breaks the access check.
function getRazorpayClient(): Razorpay | null {
  const key_id     = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) return null;
  return new Razorpay({ key_id, key_secret });
}

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

    let user = await prisma.user.findUnique({
      where:  { clerkUserId: userId },
      select: {
        subscriptionStatus:     true,
        subscriptionPlan:       true,
        subscriptionEndDate:    true,
        subscriptionCreatedAt:  true,
        razorpaySubscriptionId: true, // needed for the created→active self-heal
        lastGraceExpiredAt:     true,
        isActive:               true,
        deletedAt:              true,
        hadTrial:               true, // required — SubscribePage reads this on every response
      },
    });

    // ── 404 User not in DB ────────────────────────────────────────────────
    // No hadTrial available — SubscribePage defaults it to false safely

if (!user) {
  user = await prisma.user.create({
    data: {
      clerkUserId: userId,
      username: userId,
      isActive: true,
      hadTrial: false,
      subscriptionStatus: SubscriptionStatus.expired,
    },
    select: {
      subscriptionStatus: true,
      subscriptionPlan: true,
      subscriptionEndDate: true,
      subscriptionCreatedAt: true,
      razorpaySubscriptionId: true,
      lastGraceExpiredAt: true,
      isActive: true,
      deletedAt: true,
      hadTrial: true,
    },
  });
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
        // Data inconsistency (a row born `created` with no timestamp). Treat it
        // as `expired` — a no-access-but-VALID state the client can act on —
        // and return 200, NEVER a 409 the client would poll forever.
        console.error(
          `[/api/access] userId:${userId} — status=created but subscriptionCreatedAt is null; treating as expired`
        );
        return NextResponse.json(
          { hasAccess: false, status: "expired", hadTrial: user.hadTrial },
          { status: 200 }
        );
      }

      // ── SELF-HEAL ──────────────────────────────────────────────────────
      // If neither verify-payment nor the webhook updated this row but Razorpay
      // already reports the subscription live, fix it here and grant access.
      // Cheap by construction: only runs in the `created` branch and only when
      // a Razorpay subscription id exists. A Razorpay API failure must NOT block
      // a user still inside the grace window — on any error we fall through to
      // the normal grace/timeout logic below.
      if (user.razorpaySubscriptionId) {
        const razorpay = getRazorpayClient();
        if (razorpay) {
          try {
            const sub = await razorpay.subscriptions.fetch(user.razorpaySubscriptionId);
            if (subscriptionGrantsAccess(sub)) {
              const endDate = subscriptionEndDate(sub);

              await prisma.user.update({
                where: { clerkUserId: userId },
                data: {
                  subscriptionStatus:  SubscriptionStatus.active,
                  subscriptionEndDate: endDate,
                  lastGraceExpiredAt:  null,
                },
              });

              console.log(`[/api/access] self-healed ${userId} → active (sub ${sub.status})`);

              return NextResponse.json({
                hasAccess: true,
                status:    "active",
                hadTrial:  user.hadTrial,
                plan:      user.subscriptionPlan,
                endDate,
                daysLeft:  endDate
                  ? Math.ceil((endDate.getTime() - now.getTime()) / MS_PER_DAY)
                  : null,
              });
            }
          } catch (err) {
            console.error(`[/api/access] self-heal fetch failed for ${userId}:`, err);
            // fall through to grace/timeout logic
          }
        }
      }

      const ageMs = now.getTime() - user.subscriptionCreatedAt.getTime();

      if (ageMs < GRACE_PERIOD_MS) {
        // Anti-farming: refuse a fresh window if a prior window was wasted
        // (created, never paid) within the last 24h — otherwise a non-paying
        // user could mint subscriptions in a loop for endless free windows.
        if (
          user.lastGraceExpiredAt !== null &&
          now.getTime() - user.lastGraceExpiredAt.getTime() < MS_PER_DAY
        ) {
          return NextResponse.json(
            { hasAccess: false, status: "payment_required", hadTrial: user.hadTrial },
            { status: 402 }
          );
        }

        // Payment genuinely in progress — tell frontend to poll
        return NextResponse.json({
          hasAccess: true,
          status:    "processing",
          hadTrial:  user.hadTrial,
        });
      }

      // Grace window expired — webhook never came, payment likely abandoned.
      // Stamp the expiry ONCE per window (anchored to this subscriptionCreatedAt)
      // so repeated polls don't slide the 24h cooldown forward.
      const stampedThisWindow =
        user.lastGraceExpiredAt !== null &&
        user.lastGraceExpiredAt.getTime() >= user.subscriptionCreatedAt.getTime();

      if (!stampedThisWindow) {
        await prisma.user.update({
          where: { clerkUserId: userId },
          data:  { lastGraceExpiredAt: now },
        });
      }

      return NextResponse.json(
        { hasAccess: false, status: "payment_timeout", hadTrial: user.hadTrial },
        { status: 402 }
      );
    }

    // ── 🟢 ACTIVE ─────────────────────────────────────────────────────────
    if (user.subscriptionStatus === SubscriptionStatus.active) {
      // Paying clears any wasted-window mark (one write, then no-op).
      if (user.lastGraceExpiredAt !== null) {
        await prisma.user.update({
          where: { clerkUserId: userId },
          data:  { lastGraceExpiredAt: null },
        });
      }

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