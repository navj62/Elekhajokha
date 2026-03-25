import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { uploadImage } from "@/lib/upload";
import { Prisma } from "@prisma/client";

/* ------------------------------------------------------------------ */
/*  POST /api/pledges                                                 */
/* ------------------------------------------------------------------ */
export async function POST(req: NextRequest) {
  try {
    /* --- Auth --- */
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

    /* --- Parse form data --- */
    const formData = await req.formData();

    const customerId          = formData.get("customerId")?.toString();
    const loanAmount          = formData.get("loanAmount")?.toString();
    const itemType            = formData.get("itemType")?.toString();
    const itemName            = formData.get("itemName")?.toString();
    const grossWeight         = formData.get("grossWeight")?.toString();
    const netWeight           = formData.get("netWeight")?.toString();
    const purity              = formData.get("purity")?.toString();
    const interestRate        = formData.get("interestRate")?.toString();
    const compoundingDuration = formData.get("compoundingDuration")?.toString();
    const pledgeDate          = formData.get("pledgeDate")?.toString();
    const remark              = formData.get("remark")?.toString() || null;
    const imageFile           = formData.get("itemPhoto");

    /* --- Validate required fields --- */
    if (
      !customerId || !loanAmount || !itemType || !itemName ||
      !grossWeight || !netWeight || !purity || !interestRate ||
      !compoundingDuration || !pledgeDate
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    /* --- Ensure customer belongs to user --- */
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, userId: user.id },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    /* --- Upload image to Cloudinary --- */
    let itemPhoto: string | null = null;

    if (imageFile instanceof File && imageFile.size > 0) {
      itemPhoto = await uploadImage(
        imageFile,
        `ELEKHAJOKHA/pledges/${customerId}`
      );
    }

    /* --- Create pledge --- */
    const pledge = await prisma.pledge.create({
      data: {
        customerId,
        pledgeDate: new Date(pledgeDate),

        loanAmount: new Prisma.Decimal(loanAmount),
        itemType: itemType as any,
        itemName: itemName,

        grossWeight: new Prisma.Decimal(grossWeight),
        netWeight: new Prisma.Decimal(netWeight),
        purity: new Prisma.Decimal(purity),

        interestRate: new Prisma.Decimal(interestRate),
        compoundingDuration: compoundingDuration as any,

        status: "ACTIVE",
        remark,
        itemPhoto,
      },
    });

    return NextResponse.json(pledge, { status: 201 });

  } catch (err: any) {
    console.error("❌ PLEDGE CREATE ERROR:", err);

    return NextResponse.json(
      {
        error: "Server Error",
        message: err.message,
      },
      { status: 500 }
    );
  }
}

/* ------------------------------------------------------------------ */
/*  GET /api/pledges?customerId=xxx                                   */
/* ------------------------------------------------------------------ */
export async function GET(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get("customerId");

    const pledges = await prisma.pledge.findMany({
      where: {
        customer: { userId: user.id },
        ...(customerId ? { customerId } : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(pledges);

  } catch (err) {
    console.error("❌ PLEDGE LIST ERROR:", err);

    return NextResponse.json(
      { error: "Server Error" },
      { status: 500 }
    );
  }
}