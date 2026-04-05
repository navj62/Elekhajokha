// app/api/start-trial/route.ts
import { NextResponse }       from "next/server";
import { auth }               from "@clerk/nextjs/server";
import { prisma }             from "@/lib/prisma";
import { SubscriptionStatus } from "@prisma/client";

const TRIAL_DAYS = 15;
const GRACE_MS   = 10 * 60 * 1000; // 10 minutes

// Statuses that always block trial — "created" handled separately via grace window
const BLOCKED_STATUSES: SubscriptionStatus[] = [
  SubscriptionStatus.active,
  SubscriptionStatus.trial,
  SubscriptionStatus.halted,
];

export async function POST(request: Request) {
  let userId: string | null = null;

  try {
    ({ userId } = await auth());

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHENTICATED" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where:  { clerkUserId: userId },
      select: {
        subscriptionStatus:    true,
        hadTrial:              true,
        subscriptionCreatedAt: true, // needed for grace window check
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found", code: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    // ── 1. hadTrial check — permanent gate, checked first ─────────────────
    if (user.hadTrial) {
      return NextResponse.json(
        { error: "Free trial already used", code: "TRIAL_ALREADY_USED" },
        { status: 400 }
      );
    }

    // ── 2. "created" handled separately via grace window ──────────────────
    // Within grace window  → genuinely mid-payment → block with clear message
    // Outside grace window → payment was abandoned  → allow trial
    // null subscriptionCreatedAt → fresh/old account → allow trial
    if (user.subscriptionStatus === SubscriptionStatus.created) {
      const ageMs = user.subscriptionCreatedAt
        ? Date.now() - user.subscriptionCreatedAt.getTime()
        : Infinity;

      if (ageMs < GRACE_MS) {
        return NextResponse.json(
          {
            error: "Payment in progress. Complete it or wait a few minutes.",
            code:  "PAYMENT_IN_PROGRESS",
          },
          { status: 400 }
        );
      }
      // Grace expired → abandoned payment → fall through and allow trial
    }

    // ── 3. Block all other non-eligible statuses ───────────────────────────
    if (BLOCKED_STATUSES.includes(user.subscriptionStatus)) {
      return NextResponse.json(
        { error: "Trial not available for your account", code: "TRIAL_BLOCKED" },
        { status: 400 }
      );
    }

    // ── 4. Compute trial window ────────────────────────────────────────────
    const now          = new Date();
    const trialEndDate = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

    // ── 5. Atomic update — race condition guard ────────────────────────────
    // hadTrial: false in WHERE means only one concurrent request wins.
    // Second request gets count=0 and returns 409.
    const updated = await prisma.user.updateMany({
      where: { clerkUserId: userId, hadTrial: false },
      data:  {
        subscriptionStatus:  SubscriptionStatus.trial,
        subscriptionEndDate: trialEndDate,
        subscriptionPlan:    null,
        hadTrial:            true, // permanent — survives all future status changes
      },
    });

    if (updated.count === 0) {
      return NextResponse.json(
        { error: "Trial already activated", code: "TRIAL_CONFLICT" },
        { status: 409 }
      );
    }

    // ── 6. Audit log ───────────────────────────────────────────────────────
    const rawIp = request.headers.get("x-forwarded-for");
    const ip    = rawIp ? rawIp.split(",")[0].trim() : "unknown";

    console.log("[TRIAL_STARTED]", {
      userId,
      ip,
      trialEndDate,
      startedAt: now.toISOString(),
    });

    return NextResponse.json({
      success:    true,
      trialEnd:   trialEndDate,
      days:       TRIAL_DAYS,
      redirectTo: "/dashboard",
    });

  } catch (error) {
    console.error("[TRIAL_START_ERROR]", { userId: userId ?? "unknown", error });
    return NextResponse.json(
      { error: "Failed to start trial", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}