// app/api/customers/route.ts

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { Gender } from "@prisma/client";

const VALID_GENDERS: Gender[] = ["Male", "Female", "Other"];

/* ------------------------------------------------------------------ */
/*  GET /api/customers                                                  */
/*  Fetch all customers for the logged-in user                        */
/* ------------------------------------------------------------------ */
export async function GET() {
  try {
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

    const customers = await prisma.customer.findMany({
      where: {
        userId:    user.id,
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
      select: {
        id:        true,
        name:      true,
        address:   true, // ✅ kept
        region:    true, // ✅ added
        createdAt: true,
      },
    });

    return NextResponse.json({ customers });
  } catch (err) {
    console.error("GET CUSTOMERS ERROR:", err);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}

/* ------------------------------------------------------------------ */
/*  POST /api/customers                                                 */
/*  Create customer via JSON body                                      */
/* ------------------------------------------------------------------ */
export async function POST(req: Request) {
  try {
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

    const body = await req.json();
    const {
      name, address, region,
      mobile, aadharNo, remark,
      gender, customerImg, idProofImg,
    } = body;

    // ✅ region is now required alongside name and address
    if (!name?.trim() || !address?.trim() || !region?.trim()) {
      return NextResponse.json(
        { error: "Name, address and region are required" },
        { status: 400 }
      );
    }

    // ✅ Validate gender against enum
    const validatedGender = VALID_GENDERS.includes(gender as Gender)
      ? (gender as Gender)
      : null;

    const customer = await prisma.customer.create({
      data: {
        userId:      user.id,
        name:        name.trim(),
        address:     address.trim(),
        region:      region.trim(), // ✅ added
        mobile:      mobile?.trim() || null,
        aadharNo:    aadharNo?.trim() || null,
        remark:      remark?.trim() || null,
        gender:      validatedGender,
        customerImg: customerImg || null,
        idProofImg:  idProofImg  || null,
      },
    });

    return NextResponse.json({ customer }, { status: 201 });
  } catch (err) {
    console.error("CREATE CUSTOMER ERROR:", err);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}