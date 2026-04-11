import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { SubscriptionStatus } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    if (!signature) {
      return NextResponse.json({ error: "No signature" }, { status: 400 });
    }

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET!)
      .update(body)
      .digest("hex");

    if (signature !== expectedSignature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(body);
    const subscription = event.payload?.subscription?.entity;
    const subscriptionId: string = subscription?.id;

    if (!subscriptionId) {
      return NextResponse.json({ received: true });
    }

    console.log("Webhook:", event.event, subscriptionId);

    const user = await prisma.user.findFirst({
      where: { razorpaySubscriptionId: subscriptionId },
    });

    if (!user) {
      console.error("User not found:", subscriptionId);
      return NextResponse.json({ received: true });
    }

    const endDate = subscription?.current_end
      ? new Date(subscription.current_end * 1000)
      : null;

    switch (event.event) {
      case "subscription.activated":
      case "subscription.charged": {
        if (user.subscriptionStatus === SubscriptionStatus.active) break;

        await prisma.user.update({
          where: { id: user.id },
          data: {
            subscriptionStatus: SubscriptionStatus.active,
            subscriptionEndDate: endDate,
          },
        });

        console.log("✅ Active →", subscriptionId);
        break;
      }

      case "subscription.halted": {
        await prisma.user.update({
          where: { id: user.id },
          data: { subscriptionStatus: SubscriptionStatus.halted },
        });

        console.log("❌ Halted →", subscriptionId);
        break;
      }

      case "subscription.completed": {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            subscriptionStatus: SubscriptionStatus.expired,
            subscriptionEndDate: new Date(),
          },
        });

        console.log("🔚 Expired →", subscriptionId);
        break;
      }

      default:
        console.log("Unhandled:", event.event);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }
}