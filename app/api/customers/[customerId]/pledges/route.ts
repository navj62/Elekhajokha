import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { uploadImage } from "@/lib/upload";
import { Prisma, ItemType, MetalType } from "@prisma/client";

type RouteContext = {
  params: Promise<{ customerId: string }>;
};

const VALID_ITEM_TYPES  = Object.values(ItemType)  as string[];
const VALID_METAL_TYPES = Object.values(MetalType) as string[];

function toDecimal(value: unknown): Prisma.Decimal {
  const str = String(value ?? "").trim();
  if (!str || isNaN(Number(str))) throw new Error(`Invalid decimal: "${value}"`);
  return new Prisma.Decimal(str);
}

/* ------------------------------------------------------------------ */
/*  POST /api/customers/[customerId]/pledges                           */
/* ------------------------------------------------------------------ */
export async function POST(req: NextRequest, context: RouteContext) {
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

    // ✅ customerId from route params, not form body
    const { customerId } = await context.params;

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, userId: user.id },
    });
    if (!customer)
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });

    const formData = await req.formData();

    const loanAmount          = formData.get("loanAmount")?.toString();
    const interestRate        = formData.get("interestRate")?.toString();
    const compoundingDuration = formData.get("compoundingDuration")?.toString();
    const pledgeDate          = formData.get("pledgeDate")?.toString();
    const remark              = formData.get("remark")?.toString() || null;
    const imageFile           = formData.get("itemPhoto");

    if (!loanAmount || !interestRate || !compoundingDuration || !pledgeDate)
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

    // ── Items ─────────────────────────────────────────────────────
    const itemsRaw = formData.get("items")?.toString();
    if (!itemsRaw)
      return NextResponse.json({ error: "Missing items" }, { status: 400 });

    let rawItems: any[];
    try {
      rawItems = JSON.parse(itemsRaw);
    } catch {
      return NextResponse.json({ error: "Invalid items JSON" }, { status: 400 });
    }

    if (!Array.isArray(rawItems) || rawItems.length === 0)
      return NextResponse.json({ error: "At least one item required" }, { status: 400 });

    // ── Validate each item ────────────────────────────────────────
    const itemErrors: string[] = [];
    rawItems.forEach((item, i) => {
      if (!VALID_ITEM_TYPES.includes(item.itemType))
        itemErrors.push(`Item[${i}]: invalid itemType "${item.itemType}"`);
      if (!VALID_METAL_TYPES.includes(item.metalType))
        itemErrors.push(`Item[${i}]: invalid metalType "${item.metalType}"`);
      for (const f of ["grossWeight", "netWeight", "purity", "netWeightOfMetal"]) {
        if (item[f] === undefined || item[f] === "" || isNaN(Number(item[f])))
          itemErrors.push(`Item[${i}]: missing or invalid "${f}"`);
      }
    });

    if (itemErrors.length)
      return NextResponse.json({ error: "Invalid item data", details: itemErrors }, { status: 400 });

    // ── Upload single pledge photo ────────────────────────────────
    let itemPhoto: string | null = null;
    if (imageFile instanceof File && imageFile.size > 0) {
      itemPhoto = await uploadImage(imageFile, `ELEKHAJOKHA/pledges/${customerId}`);
    }

    // ── Compute totals from items ─────────────────────────────────
    const netWeightOfGold = rawItems
      .filter(i => i.metalType === "GOLD")
      .reduce((sum, i) => sum + Number(i.netWeightOfMetal), 0);

    const netWeightOfSilver = rawItems
      .filter(i => i.metalType === "SILVER")
      .reduce((sum, i) => sum + Number(i.netWeightOfMetal), 0);

    // ── Create pledge + items in one transaction ──────────────────
    const pledge = await prisma.pledge.create({
      data: {
        customerId,
        pledgeDate:          new Date(pledgeDate),
        loanAmount:          toDecimal(loanAmount),
        interestRate:        toDecimal(interestRate),
        compoundingDuration: compoundingDuration as any,
        status:              "ACTIVE",
        remark,
        itemPhoto,
        netWeightOfGold:    new Prisma.Decimal(netWeightOfGold),
        netWeightOfSilver:  new Prisma.Decimal(netWeightOfSilver),
        items: {
          create: rawItems.map(item => ({
            itemType:         item.itemType  as ItemType,
            metalType:        item.metalType as MetalType,
            itemName:         item.itemName  || null,
            quantity:         Number(item.quantity) || 1,
            grossWeight:      toDecimal(item.grossWeight),
            netWeight:        toDecimal(item.netWeight),
            purity:           toDecimal(item.purity),
            netWeightOfMetal: toDecimal(item.netWeightOfMetal),
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

/* ------------------------------------------------------------------ */
/*  GET /api/customers/[customerId]/pledges                            */
/* ------------------------------------------------------------------ */
export async function GET(req: NextRequest, context: RouteContext) {
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

    const { customerId } = await context.params;

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, userId: user.id },
    });
    if (!customer)
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });

    const pledges = await prisma.pledge.findMany({
      where: { customerId },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(pledges);

  } catch (err) {
    console.error("PLEDGE LIST ERROR:", err);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}