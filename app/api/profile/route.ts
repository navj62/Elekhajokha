import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { uploadImage } from "@/lib/upload";
import { Gender } from "@prisma/client";

/* ------------------------------------------------------------------ */
/*  GET /api/profile                                                    */
/* ------------------------------------------------------------------ */
export async function GET() {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkUserId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        email: true,
        mobile: true,
        shopName: true,
        address: true,
        gender: true,
        profileImageUrl: true,
        subscriptionStatus: true,
         subscriptionPlan: true,  
        subscriptionEndDate: true,
        createdAt: true,
        _count: {
          select: {
            customers: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Count active pledges across all customers of this user
    const activePledges = await prisma.pledge.count({
      where: {
        status: "ACTIVE",
        customer: { userId: user.id },
      },
    });

    return NextResponse.json({
      ...user,
      totalCustomers: user._count.customers,
      activePledges,
    });
  } catch (err) {
    console.error("PROFILE GET ERROR:", err);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}

/* ------------------------------------------------------------------ */
/*  PATCH /api/profile  — update profile details                       */
/* ------------------------------------------------------------------ */

export async function PATCH(req: Request) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkUserId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    /* ✅ Use FormData instead of JSON */
    const formData = await req.formData();

    const firstName = formData.get("firstName")?.toString();
    const lastName  = formData.get("lastName")?.toString();
    const mobile    = formData.get("mobile")?.toString();
    const shopName  = formData.get("shopName")?.toString();
    const address   = formData.get("address")?.toString();
    const gender    = formData.get("gender")?.toString();
    const imageFile = formData.get("profileImage");

    /* ✅ Gender mapping */
    const genderMap = {
      MALE: "Male",
      FEMALE: "Female",
      OTHER: "Other",
    };

    const genderEnum =
      gender && genderMap[gender as keyof typeof genderMap]
        ? (genderMap[gender as keyof typeof genderMap] as Gender)
        : (gender as Gender | null);

    /* ✅ Validation */
    if (mobile && !/^[0-9]{10}$/.test(mobile)) {
      return NextResponse.json(
        { error: "Invalid mobile number" },
        { status: 400 }
      );
    }

    /* ☁️ Upload image if present */
    let profileImageUrl: string | undefined;

    if (imageFile instanceof File && imageFile.size > 0) {
      profileImageUrl = await uploadImage(
        imageFile,
        `ELEKHAJOKHA/profile/${user.id}`
      );
    }

    /* 💾 Update DB */
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(firstName !== undefined && { firstName }),
        ...(lastName  !== undefined && { lastName }),
        ...(mobile    !== undefined && { mobile }),
        ...(shopName  !== undefined && { shopName }),
        ...(address   !== undefined && { address }),
        ...(gender    !== undefined && { gender: genderEnum }),
        ...(profileImageUrl && { profileImageUrl }), // ✅ only if uploaded
      },
    });

    return NextResponse.json(updated);

  } catch (err) {
    console.error("PROFILE PATCH ERROR:", err);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}