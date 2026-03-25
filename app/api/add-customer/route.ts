import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { Gender } from "@prisma/client";
import { uploadImage } from "@/lib/upload";

export async function POST(req: Request) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json(
        { error: "Unauthorized: Clerk user missing" },
        { status: 401 }
      );
    }

    // 🔑 Map Clerk user → internal User
    const user = await prisma.user.findUnique({
      where: { clerkUserId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found in database" },
        { status: 404 }
      );
    }

    const formData = await req.formData();

    // 🔴 REQUIRED FIELDS
    const name = formData.get("name");
    const address = formData.get("address");

    if (!name || !address) {
      return NextResponse.json(
        { error: "Name and address are required" },
        { status: 400 }
      );
    }

    // 🟢 OPTIONAL FIELDS
    const mobile = formData.get("mobile")?.toString() || null;
    const aadharNo = formData.get("aadharNo")?.toString() || null;
    const remark = formData.get("remarks")?.toString() || null;

    // ✅ SAFE ENUM HANDLING
    const rawGender = formData.get("gender");
    const gender =
      rawGender === "Male" ||
      rawGender === "Female" ||
      rawGender === "Other"
        ? (rawGender as Gender)
        : null;


    // 🖼️ FILE HANDLING (Cloudinary)
    const customerImgFile = formData.get("userImg");
    const idProofImgFile = formData.get("idProofImg");

    let customerImg: string | null = null;
    let idProofImg: string | null = null;

    // Upload customer image
    if (customerImgFile instanceof File && customerImgFile.size > 0) {
      customerImg = await uploadImage(
        customerImgFile,
        `ELEKHAJOKHA/customers/${user.id}`
      );
    }

    // Upload ID proof
    if (idProofImgFile instanceof File && idProofImgFile.size > 0) {
      idProofImg = await uploadImage(
        idProofImgFile,
        `ELEKHAJOKHA/idProofs/${user.id}`
      );
    }

    // 💾 CREATE CUSTOMER
    const customer = await prisma.customer.create({
      data: {
        name: name.toString(),
        address: address.toString(),
        mobile,
        aadharNo,
        remark,
        gender,
        customerImg,
        idProofImg,
        userId: user.id,
      },
    });

    return NextResponse.json(
      { success: true, customer },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("❌ ADD CUSTOMER ERROR:", error);

    return NextResponse.json(
      {
        error: "Failed to add customer",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
