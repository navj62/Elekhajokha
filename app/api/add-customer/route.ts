// app/api/add-customer/route.ts

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { Gender } from "@prisma/client";

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

    /* ---- Image upload -------------------------------------------- */
    // Actually write files to disk — not just storing the filename
    async function saveImage(
      file: FormDataEntryValue | null,
      prefix: string
    ): Promise<string | null> {
      if (!(file instanceof File) || file.size === 0) return null;
      if (!file.type.startsWith("image/")) return null;
      if (file.size > 5 * 1024 * 1024) return null; // 5MB

      const uploadDir = path.join(process.cwd(), "public", "uploads", "customers");
      await mkdir(uploadDir, { recursive: true });

      const ext      = file.name.split(".").pop() ?? "jpg";
      const filename = `${prefix}-${userId}-${Date.now()}.${ext}`;
      await writeFile(
        path.join(uploadDir, filename),
        Buffer.from(await file.arrayBuffer())
      );
      return `/uploads/customers/${filename}`;
    }

    const [customerImg, idProofImg] = await Promise.all([
      saveImage(fd.get("userImg"),    "customer"),
      saveImage(fd.get("idProofImg"), "idproof"),
    ]);

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
        userId: user.id,
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