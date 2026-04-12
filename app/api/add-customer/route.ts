// app/api/add-customer/route.ts

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { Gender } from "@prisma/client";
import { uploadImage } from "@/lib/upload";
import crypto from "crypto";

const token = crypto.randomBytes(32).toString("hex");

// ✅ Matches schema enum exactly: Male | Female | Other
const VALID_GENDERS: Gender[] = ["Male", "Female", "Other"];

export async function POST(req: Request) {
  try {
    /* ---- Auth ---------------------------------------------------- */
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where:  { clerkUserId },
      select: { id: true },
    });
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userId = user.id; // ✅ now guaranteed non-null

    /* ---- Parse form data ----------------------------------------- */
    const fd = await req.formData();

    const name    = fd.get("name")?.toString().trim();
    const address = fd.get("address")?.toString().trim();
    const region  = fd.get("region")?.toString().trim();

    if (!name || !address || !region) {
      return NextResponse.json(
        { error: "Name, address and region are required" },
        { status: 400 }
      );
    }

    const mobile   = fd.get("mobile")?.toString().trim()    || null;
    // ✅ form field "aadhaarNo" → DB field "aadharNo"
    const aadharNo = fd.get("aadhaarNo")?.toString().trim() || null;
    const remark   = fd.get("remarks")?.toString().trim()   || null;

    /* ---- Mobile validation --------------------------------------- */
    if (mobile && !/^\d{10}$/.test(mobile)) {
      return NextResponse.json(
        { error: "Mobile number must be exactly 10 digits" },
        { status: 400 }
      );
    }

    /* ---- Gender — matches schema enum (Male | Female | Other) ---- */
    const rawGender = fd.get("gender")?.toString();
    const gender    = VALID_GENDERS.includes(rawGender as Gender)
      ? (rawGender as Gender)
      : null;

    /* ---- FILE HANDLING (Cloudinary) ------------------------------ */
    const customerImgFile = fd.get("userImg");
    const idProofImgFile  = fd.get("idProofImg");

    let customerImg: string | null = null;
    let idProofImg: string | null = null;

    // Upload customer image
    if (customerImgFile instanceof File && customerImgFile.size > 0) {
      customerImg = await uploadImage(
        customerImgFile,
        `ELEKHAJOKHA/customers/${userId}`
      );
    }

    // Upload ID proof
    if (idProofImgFile instanceof File && idProofImgFile.size > 0) {
      idProofImg = await uploadImage(
        idProofImgFile,
        `ELEKHAJOKHA/idProofs/${userId}`
      );
    }

    /* ---- Create customer ----------------------------------------- */
    const customer = await prisma.customer.create({
      data: {
        name,
        address,
        // ✅ region stored as-is — don't lowercase city names
        region,
        mobile,
        aadharNo,
        remark,
        gender,
        customerImg,
        idProofImg,
        userId: userId,
        viewToken: token,// to genrate link for cutomers
      },
    });

    return NextResponse.json({ success: true, customer }, { status: 201 });
  } catch (error: unknown) {
    console.error("ADD CUSTOMER ERROR:", error);
    return NextResponse.json(
      { error: "Failed to add customer" },
      { status: 500 }
    );
  }
}