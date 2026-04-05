import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";

/* ------------------------------------------------------------------ */
/*  POST /api/pledges                                                   */
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

    const customerId          = formData.get("customerId")          as string;
    const loanAmount          = formData.get("loanAmount")          as string;
    const itemType            = formData.get("itemType")            as string;
    const itemName            = formData.get("itemName")            as string;
    const grossWeight         = formData.get("grossWeight")         as string;
   const netWeightOfMetal    = formData.get("netWeightOfMetal")    as string; // ← add this
    const netWeight           = formData.get("netWeight")           as string;
    const purity              = formData.get("purity")              as string;
    const interestRate        = formData.get("interestRate")        as string;
    const compoundingDuration = formData.get("compoundingDuration") as string;
    const pledgeDate          = formData.get("pledgeDate")          as string;
    const remark              = formData.get("remark")              as string | null;
    const imageFile           = formData.get("itemPhoto")           as File | null;

    /* --- Validate required fields --- */
    if (
      !customerId || !loanAmount || !itemType || !itemName ||
      !grossWeight || !netWeight || !purity || !interestRate ||
      !compoundingDuration || !pledgeDate
    ) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    /* --- Ensure customer belongs to this user --- */
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, userId: user.id },
    });
    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    /* --- Save image --- */
    let itemPhoto: string | null = null;

    if (imageFile && imageFile.size > 0) {
      const uploadDir = path.join(process.cwd(), "public", "uploads", "pledges");
      await mkdir(uploadDir, { recursive: true });

      const ext      = imageFile.name.split(".").pop() ?? "jpg";
      const filename = `${customerId}-${Date.now()}.${ext}`;
      await writeFile(
        path.join(uploadDir, filename),
        Buffer.from(await imageFile.arrayBuffer())
      );

      itemPhoto = `/uploads/pledges/${filename}`;
    }

    /* --- Create pledge --- */
    const pledge = await prisma.pledge.create({
      data: {
        customerId,
        pledgeDate:           new Date(pledgeDate),
        loanAmount:           parseFloat(loanAmount),
        itemType:             itemType           as any,
        itemName,
        grossWeight:          parseFloat(grossWeight),
        netWeight:            parseFloat(netWeight),
         netWeightOfMetal:     parseFloat(netWeightOfMetal), // ← add this
        purity:               parseFloat(purity),
        interestRate:         parseFloat(interestRate),
        compoundingDuration:  compoundingDuration as any,
        status:               "ACTIVE",
        remark:               remark || null,
        itemPhoto,
      },
    });

    return NextResponse.json(pledge, { status: 201 });

  } catch (err) {
    console.error("PLEDGE CREATE ERROR:", err);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}

/* ------------------------------------------------------------------ */
/*  GET /api/pledges?customerId=xxx                                     */
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
    console.error("PLEDGE LIST ERROR:", err);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}