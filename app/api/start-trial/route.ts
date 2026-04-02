// app/api/start-trial/route.ts
import { NextResponse }       from "next/server";
import { auth }               from "@clerk/nextjs/server";
import { prisma }             from "@/lib/prisma";
import { SubscriptionStatus } from "@prisma/client";
 // single source of truth

// ── Blocked statuses ──────────────────────────────────────────────────────────
// Any of these means the user is not eligible for a fresh trial.
// "created" is included — user started a payment flow but didn't finish.
const TRIAL_DAYS = 15;
const BLOCKED_STATUSES: SubscriptionStatus[] = [
  SubscriptionStatus.active,
  SubscriptionStatus.trial,
  SubscriptionStatus.halted,
  SubscriptionStatus.created, // mid-payment — block trial until resolved
];

// ── Route handler ─────────────────────────────────────────────────────────────
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
      select: { subscriptionStatus: true, hadTrial: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found", code: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    // hadTrial check first — this is the canonical "already used" gate
    if (user.hadTrial) {
      return NextResponse.json(
        { error: "Free trial already used", code: "TRIAL_ALREADY_USED" },
        { status: 400 }
      );
    }

    // Block any non-fresh subscription state
    if (BLOCKED_STATUSES.includes(user.subscriptionStatus)) {
      return NextResponse.json(
        { error: "Trial not available for your account", code: "TRIAL_BLOCKED" },
        { status: 400 }
      );
    }

    // Compute trial window
    const now          = new Date();
    const trialEndDate = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

    // Atomic update — hadTrial: false in WHERE is the race condition guard.
    // If two requests arrive simultaneously, only one will match and update.
    const updated = await prisma.user.updateMany({
      where: { clerkUserId: userId, hadTrial: false },
      data:  {
        subscriptionStatus:  SubscriptionStatus.trial,
        subscriptionEndDate: trialEndDate,
        subscriptionPlan:    null,
        hadTrial:            true,
      },
    });

    // 0 rows = race condition — another request won the update
    if (updated.count === 0) {
      return NextResponse.json(
        { error: "Trial already activated", code: "TRIAL_CONFLICT" },
        { status: 409 }
      );
    }

    // x-forwarded-for can be "client, proxy1, proxy2" — take only the first IP.
    // Used for logging only — never trust this for security decisions.
    const rawIp = request.headers.get("x-forwarded-for");
    const ip    = rawIp ? rawIp.split(",")[0].trim() : "unknown";

    console.log("[TRIAL_STARTED]", {
      userId,
      ip,
      trialEndDate,
      startedAt: now.toISOString(), // audit-friendly, grep-able in logs
    });

    return NextResponse.json({
      success:    true,
      trialEnd:   trialEndDate,
      days:       TRIAL_DAYS,
      redirectTo: "/dashboard", // frontend follows this, not hardcoded
    });

  } catch (error) {
    console.error("[TRIAL_START_ERROR]", { userId: userId ?? "unknown", error });
    return NextResponse.json(
      { error: "Failed to start trial", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}