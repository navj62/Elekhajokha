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
        profileImageUrl: clerkUser.imageUrl, // ✅ SAVE IMAGE URL
      },
      update: {
        shopName,
        address,
        mobile,
        gender: genderEnum,                 // ✅ FORCE UPDATE
        profileImageUrl: clerkUser.imageUrl, // ✅ FORCE UPDATE
        firstName,
        lastName,
      },
    });

    return NextResponse.json({ success: true, user });
  } catch (err) {
    console.error("🔥 ONBOARDING ERROR:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
