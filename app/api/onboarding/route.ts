import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Gender } from "@prisma/client";
import { uploadImage } from "@/lib/upload";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();

    const shopName = formData.get("shopName")?.toString();
    const address = formData.get("address")?.toString();
    const mobile = formData.get("mobile")?.toString();
    const gender = formData.get("gender")?.toString();
    const imageFile = formData.get("profileImage");

    if (!shopName || !address || !mobile || !gender) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);

    const baseUsername =
      clerkUser.username ??
      clerkUser.emailAddresses[0]?.emailAddress.split("@")[0];

    const username = `${baseUsername}_${userId.slice(0, 6)}`;

    const firstName = clerkUser.firstName ?? null;
    const lastName = clerkUser.lastName ?? null;
    const email = clerkUser.emailAddresses[0]?.emailAddress ?? null;

    let genderEnum: Gender | null = null;

    if (gender === "Male" || gender === "Female" || gender === "Other") {
      genderEnum = gender;
    }

    /* ☁️ Upload image to Cloudinary */
    let profileImageUrl: string | null = null;

    if (imageFile instanceof File && imageFile.size > 0) {
      profileImageUrl = await uploadImage(
        imageFile,
        `ELEKHAJOKHA/profile/${userId}`
      );
    }

    /* 💾 Save user */
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
        profileImageUrl,
      },
      update: {
        shopName,
        address,
        mobile,
        gender: genderEnum,
        profileImageUrl,
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