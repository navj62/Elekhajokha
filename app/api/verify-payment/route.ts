// app/api/razorpay/verify-payment/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { SubscriptionStatus } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    // ✅ 1. Auth check
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ✅ 2. Parse body
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

    // ✅ 3. Signature verification (robust)
    const secret = process.env.RAZORPAY_KEY_SECRET!;

    const body1 = `${razorpay_payment_id}|${razorpay_subscription_id}`;
    const body2 = `${razorpay_subscription_id}|${razorpay_payment_id}`;

    const expected1 = crypto
      .createHmac("sha256", secret)
      .update(body1)
      .digest("hex");

    const expected2 = crypto
      .createHmac("sha256", secret)
      .update(body2)
      .digest("hex");

    if (
      razorpay_signature !== expected1 &&
      razorpay_signature !== expected2
    ) {
      return NextResponse.json(
        { error: "Invalid payment signature" },
        { status: 400 }
      );
    }

    // ✅ 4. Fetch user
    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // ✅ 5. Validate subscription ownership
    if (user.razorpaySubscriptionId !== razorpay_subscription_id) {
      return NextResponse.json(
        { error: "Subscription mismatch" },
        { status: 400 }
      );
    }

    // ✅ 6. Prevent duplicate activation
    if (user.subscriptionStatus === SubscriptionStatus.active) {
      return NextResponse.json({ success: true });
    }

    // ✅ 7. Calculate expiry
    const now = new Date();
    const endDate = new Date(now);

    if (user.subscriptionPlan === "halfyearly") {
      endDate.setMonth(endDate.getMonth() + 6);
    } else if (user.subscriptionPlan === "yearly") {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    // ✅ 8. Update DB
    await prisma.user.update({
      where: { clerkUserId: userId },
      data: {
        subscriptionStatus: SubscriptionStatus.active,
        subscriptionEndDate: endDate,
        razorpayPaymentId: razorpay_payment_id, // 🔥 important
      },
    });

    console.log(
      `✅ Payment verified: ${userId} → ${user.subscriptionPlan} until ${endDate}`
    );

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("verify-payment error:", error);

    return NextResponse.json(
      { error: "Verification failed" },
      { status: 500 }
    );
  }
}