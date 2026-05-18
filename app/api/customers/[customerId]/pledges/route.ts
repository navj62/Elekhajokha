import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { uploadImage } from "@/lib/upload";
import { Prisma } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { clerkUserId },
      select: { id: true },
    });
    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    const formData = await req.formData();

    const customerId          = formData.get("customerId")?.toString();
    const loanAmount          = formData.get("loanAmount")?.toString();
    const interestRate        = formData.get("interestRate")?.toString();
    const compoundingDuration = formData.get("compoundingDuration")?.toString();
    const pledgeDate          = formData.get("pledgeDate")?.toString();
    const remark              = formData.get("remark")?.toString() || null;
    const netWeightOfGold     = formData.get("netWeightOfGold")?.toString() || "0";
    const netWeightOfSilver   = formData.get("netWeightOfSilver")?.toString() || "0";
    const itemsRaw            = formData.get("items")?.toString();
    const imageFile           = formData.get("itemPhoto");

    if (!customerId || !loanAmount || !interestRate || !compoundingDuration || !pledgeDate || !itemsRaw)
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

    // ← Parse items array from JSON
    let items: any[];
    try {
      items = JSON.parse(itemsRaw);
    } catch {
      return NextResponse.json({ error: "Invalid items data" }, { status: 400 });
    }

    if (!Array.isArray(items) || items.length === 0)
      return NextResponse.json({ error: "At least one item required" }, { status: 400 });

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, userId: user.id },
    });
    if (!customer)
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });

    let itemPhoto: string | null = null;
    if (imageFile instanceof File && imageFile.size > 0) {
      itemPhoto = await uploadImage(imageFile, `ELEKHAJOKHA/pledges/${customerId}`);
    }

    // ← Create pledge + all items in one transaction
    const pledge = await prisma.pledge.create({
      data: {
        customerId,
        pledgeDate:          new Date(pledgeDate),
        loanAmount:          new Prisma.Decimal(loanAmount),
        interestRate:        new Prisma.Decimal(interestRate),
        compoundingDuration: compoundingDuration as any,
        netWeightOfGold:     new Prisma.Decimal(netWeightOfGold),
        netWeightOfSilver:   new Prisma.Decimal(netWeightOfSilver),
        status:              "ACTIVE",
        remark,
        itemPhoto,
        // ← Creates all PledgeItem rows in the same query
        items: {
          create: items.map((item) => ({
            itemType:         item.itemType,
            metalType:        item.metalType,
            itemName:         item.itemName || null,
            quantity:         Number(item.quantity) || 1,
            grossWeight:      new Prisma.Decimal(item.grossWeight),
            netWeight:        new Prisma.Decimal(item.netWeight),
            purity:           new Prisma.Decimal(item.purity),
            netWeightOfMetal: new Prisma.Decimal(item.netWeightOfMetal),
          })),
        },
      },
      include: { items: true },
    });

    return NextResponse.json(pledge, { status: 201 });

  } catch (err: any) {
    console.error("PLEDGE CREATE ERROR:", err);
    return NextResponse.json({ error: "Server Error", message: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { clerkUserId },
      select: { id: true },
    });
    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get("customerId");

    const pledges = await prisma.pledge.findMany({
      where: {
        customer: { userId: user.id },
        ...(customerId ? { customerId } : {}),
      },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(pledges);

  } catch (err) {
    console.error("PLEDGE LIST ERROR:", err);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}