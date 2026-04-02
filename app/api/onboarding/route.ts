import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Gender } from "@prisma/client";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { shopName, address, mobile, gender } = await req.json();

    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);

    const username =
      clerkUser.username ??
      clerkUser.emailAddresses[0]?.emailAddress.split("@")[0];

    const firstName = clerkUser.firstName ?? null;
    const lastName = clerkUser.lastName ?? null;
    const email = clerkUser.emailAddresses[0]?.emailAddress ?? null;

    const genderEnum = Gender[gender as keyof typeof Gender];

    // ✅ 🔥 FIX: Check duplicate mobile
    const existingMobileUser = await prisma.user.findUnique({
      where: { mobile },
    });

    if (
      existingMobileUser &&
      existingMobileUser.clerkUserId !== userId
    ) {
      return NextResponse.json(
        { error: "Mobile number already in use" },
        { status: 400 }
      );
    }

    const user = await prisma.user.upsert({
      where: { clerkUserId: userId },
      create: {
        clerkUserId: userId,
        username,
        email,
        firstName,
        lastName,
        shopName,
        address,
        mobile,
        gender: genderEnum,
        profileImageUrl: clerkUser.imageUrl,
      },
      update: {
        shopName,
        address,
        mobile,
        gender: genderEnum,
        profileImageUrl: clerkUser.imageUrl,
        firstName,
        lastName,
      },
    });

    return NextResponse.json({ success: true, user });
  } catch (err) {
    console.error("🔥 ONBOARDING ERROR:", err);

    // ✅ Optional: Better Prisma error handling
    if (
      err instanceof Error &&
      "code" in err &&
      (err as any).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Duplicate field value (likely mobile)" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}