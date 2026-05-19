import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { SubscriptionStatus, SubscriptionPlan } from "@prisma/client";

const razorpay = new Razorpay({
  key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

const PLANS = {
  YEARLY: process.env.RAZORPAY_PLAN_YEARLY!,
  HALF_YEARLY: process.env.RAZORPAY_PLAN_HALF_YEARLY!,
};

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!PLANS.YEARLY || !PLANS.HALF_YEARLY) {
      throw new Error("Missing Razorpay plan IDs in env");
    }

    const { plan } = await req.json();
    if (!plan || !PLANS[plan as keyof typeof PLANS]) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    console.log("Creating subscription:", { userId, plan });

    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.subscriptionStatus === SubscriptionStatus.active) {
      return NextResponse.json(
        { error: "Already an active member" },
        { status: 400 }
      );
    }

    if (
      user.subscriptionStatus === SubscriptionStatus.created &&
      user.razorpaySubscriptionId
    ) {
      return NextResponse.json({
        success: true,
        subscriptionId: user.razorpaySubscriptionId,
        reused: true,
      });
    }

    const subscription = await razorpay.subscriptions.create({
      plan_id: PLANS[plan as keyof typeof PLANS],
      customer_notify: 1,
      total_count: 1,
      notes: {
        clerkUserId: userId,
        plan,
      },
    });

    await prisma.user.update({
      where: { clerkUserId: userId },
      data: {
        razorpaySubscriptionId: subscription.id,
        subscriptionStatus: SubscriptionStatus.created,
        subscriptionPlan:
          plan === "YEARLY"
            ? SubscriptionPlan.yearly
            : SubscriptionPlan.halfyearly,
      },
    });

    return NextResponse.json({
      success: true,
      subscriptionId: subscription.id,
      plan,
    });

  } catch (error: any) {
    console.error("create-subscription error:", error);

    return NextResponse.json(
      { error: "Failed to create subscription" },
      { status: 500 }
    );
  }
}