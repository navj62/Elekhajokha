// app/api/verify-payment/route.ts
//
// Synchronous post-checkout verification. The Razorpay checkout `handler`
// POSTs the three returned fields here; we verify the signature, then confirm
// the subscription really is live with Razorpay's API (never trust the client's
// word that payment succeeded) before flipping the user to `active`.
//
// This is the PRIMARY activation path. The webhook (webhook/razorpay) is the
// async fallback that also handles renewals/halts. Both must agree on the same
// `subscriptionEndDate` source — Razorpay's `current_end` — so we use it here.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import crypto from "crypto";
import Razorpay from "razorpay";
import { prisma } from "@/lib/prisma";
import { SubscriptionStatus } from "@prisma/client";
import { constantTimeEqual } from "@/lib/constantTimeEqual";
import { subscriptionGrantsAccess, subscriptionEndDate } from "@/lib/razorpaySubscription";

export async function POST(req: NextRequest) {
  try {
    // ── 1. Auth ──────────────────────────────────────────────────────────
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── 2. Parse body ────────────────────────────────────────────────────
    const {
      razorpay_payment_id,
      razorpay_subscription_id,
      razorpay_signature,
    } = await req.json();

    if (
      !razorpay_payment_id ||
      !razorpay_subscription_id ||
      !razorpay_signature
    ) {
      return NextResponse.json(
        { error: "Missing payment fields" },
        { status: 400 }
      );
    }

    // ── 3. Secrets present? Fail closed if not. ─────────────────────────
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    if (!keySecret || !keyId) {
      console.error("verify-payment: Razorpay keys are not configured");
      return NextResponse.json(
        { error: "Server misconfiguration" },
        { status: 500 }
      );
    }

    // ── 4. Signature verification (constant-time) ────────────────────────
    // Razorpay subscription signatures are HMAC-SHA256(payment_id|subscription_id);
    // we also accept the reverse ordering some integrations emit.
    const expected1 = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpay_payment_id}|${razorpay_subscription_id}`)
      .digest("hex");

    const expected2 = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpay_subscription_id}|${razorpay_payment_id}`)
      .digest("hex");

    const signatureValid =
      constantTimeEqual(razorpay_signature, expected1) ||
      constantTimeEqual(razorpay_signature, expected2);

    if (!signatureValid) {
      return NextResponse.json({ error: "signature_invalid" }, { status: 400 });
    }

    // ── 5. Resolve user + confirm they own this subscription ─────────────
    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.razorpaySubscriptionId !== razorpay_subscription_id) {
      return NextResponse.json(
        { error: "subscription_mismatch" },
        { status: 400 }
      );
    }

    // ── 6. Idempotent: already active → nothing to do ────────────────────
    if (user.subscriptionStatus === SubscriptionStatus.active) {
      return NextResponse.json({ success: true, status: "active" });
    }

    // ── 7. Authoritative check with Razorpay ─────────────────────────────
    // A valid signature only proves the response is genuinely from Razorpay,
    // not that the mandate/charge succeeded. Fetch the subscription and confirm
    // its real status before granting access.
    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

    let sub;
    try {
      sub = await razorpay.subscriptions.fetch(razorpay_subscription_id);
    } catch (e) {
      console.error("verify-payment: subscription fetch failed", e);
      return NextResponse.json(
        { error: "subscription_not_found" },
        { status: 404 }
      );
    }

    // Paid = active/authenticated, OR a completed one-time charge (total_count=1
    // settles to `completed` seconds after payment). See lib/razorpaySubscription.
    if (!subscriptionGrantsAccess(sub)) {
      return NextResponse.json(
        { error: "payment_not_verified" },
        { status: 402 }
      );
    }

    // ── 8. End date from Razorpay's clock (same source as the webhook) ────
    const endDate = subscriptionEndDate(sub);

    // ── 9. Activate. Clear lastGraceExpiredAt so the grace-window anti-farm
    //      guard never blocks a user who just legitimately paid. ──────────
    await prisma.user.update({
      where: { clerkUserId: userId },
      data: {
        subscriptionStatus: SubscriptionStatus.active,
        subscriptionEndDate: endDate,
        razorpayPaymentId: razorpay_payment_id,
        lastGraceExpiredAt: null,
      },
    });

    console.log(
      `✅ Payment verified: ${userId} → ${user.subscriptionPlan} ` +
      `(sub ${sub.status}) until ${endDate?.toISOString() ?? "n/a"}`
    );

    return NextResponse.json({ success: true, status: "active" });
  } catch (error) {
    console.error("verify-payment error:", error);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
