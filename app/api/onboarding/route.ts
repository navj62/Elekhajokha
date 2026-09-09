import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Gender } from "@prisma/client"
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
      clerkUser.emailAddresses[0]?.emailAddress?.split("@")[0] ??
      "user";

    const username = `${baseUsername}_${userId.slice(0, 6)}`;

    const firstName = clerkUser.firstName ?? null;
    const lastName = clerkUser.lastName ?? null;
    const email = clerkUser.emailAddresses[0]?.emailAddress ?? null;

    let genderEnum: Gender | null = null;

    if (gender === "Male" || gender === "Female" || gender === "Other") {
      genderEnum = gender as Gender;
    }

    // Optional side effect — User.profileImageUrl is nullable and
    // display-only. This upload MUST NOT be allowed to throw here: onboarding
    // is the one-time gate that creates the User row and flips Clerk's
    // onboardingComplete flag (proxy.ts redirects every unonboarded page
    // load to /onboarding). An unguarded throw on an avatar photo would lock
    // a brand-new signup out of the product until Cloudinary recovers. The
    // profile photo CAN be re-attempted later via PATCH /api/profile, so this
    // is not a permanent loss — `warnings` tells the caller regardless.
    let profileImageUrl: string | null = null;
    const warnings: string[] = [];

    if (imageFile instanceof File && imageFile.size > 0) {
      try {
        profileImageUrl = await uploadImage(
          imageFile,
          `ELEKHAJOKHA/profile/${userId}`
        );
      } catch (e) {
        console.error("ONBOARDING PHOTO UPLOAD FAILED:", e instanceof Error ? e.message : e);
        warnings.push("Profile photo could not be uploaded — you can add it later from your profile.");
      }
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

    // 👇 ADDED THIS: Tell Clerk the onboarding is finished
    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        onboardingComplete: true,
      },
    });
    // 👆 ================================================

    return NextResponse.json({
      success: true,
      user,
      ...(warnings.length ? { warnings } : {}),
    });

  } catch (err) {
    console.error("Onboarding failed:", err instanceof Error ? err.message : err);

    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}