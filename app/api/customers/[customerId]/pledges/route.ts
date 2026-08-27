import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { uploadImage } from "@/lib/upload";
import { metalContent } from "@/lib/weights";
import { Prisma, MetalType, CompoundingDuration } from "@prisma/client";

type RouteContext = {
  params: Promise<{ customerId: string }>;
};

const VALID_METAL_TYPES = Object.values(MetalType) as string[];
const VALID_COMPOUNDING = ["MONTHLY", "HALFYEARLY", "YEARLY"] as const;

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

    // Validate compounding against the allowlist (mirrors the release paths).
    if (!VALID_COMPOUNDING.includes(compoundingDuration as (typeof VALID_COMPOUNDING)[number]))
      return NextResponse.json(
        { error: "VALIDATION", message: "Invalid compounding duration" },
        { status: 400 }
      );

    if (remark !== null && remark.length > 2000)
      return NextResponse.json(
        { error: "VALIDATION", message: "Remark must be at most 2000 characters" },
        { status: 400 }
      );

    // ── Bounds: keep money inputs sane before they reach interest/LTV math ──
    // Compare on Number(), but keep the original strings for Decimal storage.
    const loanAmountNum   = Number(loanAmount);
    const interestRateNum = Number(interestRate);

    if (isNaN(loanAmountNum) || loanAmountNum <= 0 || loanAmountNum > 10_00_00_000)
      return NextResponse.json(
        { error: "Loan amount must be greater than 0 and at most 10,00,00,000" },
        { status: 400 }
      );

    if (isNaN(interestRateNum) || interestRateNum < 0 || interestRateNum > 100)
      return NextResponse.json(
        { error: "Interest rate must be between 0 and 100" },
        { status: 400 }
      );

    // ── Items ─────────────────────────────────────────────────────
    const itemsRaw = formData.get("items")?.toString();
    if (!itemsRaw)
      return NextResponse.json({ error: "Missing items" }, { status: 400 });

    // Untrusted parsed JSON from the client; each field is validated/coerced
    // below. Proper typing belongs to the planned Zod validation layer.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let rawItems: any[];
    try {
      rawItems = JSON.parse(itemsRaw);
    } catch {
      return NextResponse.json({ error: "Invalid items JSON" }, { status: 400 });
    }

    if (!Array.isArray(rawItems) || rawItems.length === 0)
      return NextResponse.json({ error: "At least one item required" }, { status: 400 });

    // ── Validate itemType labels exist in PledgeItemType table ───
    const uniqueLabels = [...new Set(rawItems.map((i) => String(i.itemType ?? "").trim()))];
    if (uniqueLabels.some((l) => !l)) {
      return NextResponse.json({ error: "Invalid item data", details: ["itemType is required"] }, { status: 400 });
    }
    const validLabelRows = await prisma.pledgeItemType.findMany({
      where: {
        label: { in: uniqueLabels },
        OR: [{ isDefault: true }, { userId: user.id }],
      },
      select: { label: true },
    });
    const validLabels = new Set(validLabelRows.map((r) => r.label));
    const badLabels = uniqueLabels.filter((l) => !validLabels.has(l));
    if (badLabels.length) {
      return NextResponse.json(
        { error: "Invalid item data", details: badLabels.map((l) => `Invalid itemType: "${l}"`) },
        { status: 400 }
      );
    }

    // ── Validate each item ────────────────────────────────────────
    const itemErrors: string[] = [];
    rawItems.forEach((item, i) => {
      if (!VALID_METAL_TYPES.includes(item.metalType))
        itemErrors.push(`Item[${i}]: invalid metalType "${item.metalType}"`);
      // netWeightOfMetal is no longer trusted from the payload — it's derived
      // server-side from netWeight × purity, so only the inputs are validated.
      for (const f of ["grossWeight", "netWeight", "purity"]) {
        const v = Number(item[f]);
        if (item[f] === undefined || item[f] === "" || isNaN(v))
          itemErrors.push(`Item[${i}]: missing or invalid "${f}"`);
        else if (!isFinite(v))
          itemErrors.push(`Item[${i}]: "${f}" must be a finite number`);
        else if (v <= 0)
          itemErrors.push(`Item[${i}]: "${f}" must be greater than 0`);
        else if (f === "purity" && v > 100)
          itemErrors.push(`Item[${i}]: "purity" must be at most 100`);
        else if ((f === "grossWeight" || f === "netWeight") && v > 100000)
          itemErrors.push(`Item[${i}]: "${f}" must be at most 100000 grams`);
      }
      if (Number(item.netWeight) > Number(item.grossWeight))
        itemErrors.push(`Item[${i}]: "netWeight" must not exceed "grossWeight"`);
      if (item.itemName !== undefined && item.itemName !== null && String(item.itemName).length > 200)
        itemErrors.push(`Item[${i}]: "itemName" must be at most 200 characters`);
    });

    if (itemErrors.length)
      return NextResponse.json({ error: "Invalid item data", details: itemErrors }, { status: 400 });

    // ── Upload single pledge photo ────────────────────────────────
    let itemPhoto: string | null = null;
    if (imageFile instanceof File && imageFile.size > 0) {
      itemPhoto = await uploadImage(imageFile, `ELEKHAJOKHA/pledges/${customerId}`);
    }

    // Derive pure-metal content server-side instead of trusting the client
    // (Invariant 3). metalContent rounds each item to 3 dp BEFORE summing, and
    // is the same helper the create-pledge form previews with.

    // ── Compute totals from items ─────────────────────────────────
    const netWeightOfGold = rawItems
      .filter(i => i.metalType === "GOLD")
      .reduce((sum, i) => sum + metalContent(i.netWeight, i.purity), 0);

    const netWeightOfSilver = rawItems
      .filter(i => i.metalType === "SILVER")
      .reduce((sum, i) => sum + metalContent(i.netWeight, i.purity), 0);

    // ── Create pledge + items in one transaction ──────────────────
    const pledge = await prisma.pledge.create({
      data: {
        customerId,
        pledgeDate:          new Date(pledgeDate),
        loanAmount:          toDecimal(loanAmount),
        interestRate:        toDecimal(interestRate),
        compoundingDuration: compoundingDuration as CompoundingDuration,
        status:              "ACTIVE",
        remark,
        itemPhoto,
        netWeightOfGold:    new Prisma.Decimal(netWeightOfGold),
        netWeightOfSilver:  new Prisma.Decimal(netWeightOfSilver),
        items: {
          create: rawItems.map(item => ({
            itemType:         String(item.itemType).trim(),
            metalType:        item.metalType as MetalType,
            itemName:         item.itemName  || null,
            quantity:         Number(item.quantity) || 1,
            grossWeight:      toDecimal(item.grossWeight),
            netWeight:        toDecimal(item.netWeight),
            purity:           toDecimal(item.purity),
            netWeightOfMetal: new Prisma.Decimal(metalContent(item.netWeight, item.purity).toFixed(3)),
          })),
        },
      },
      include: { items: true },
    });

    return NextResponse.json(pledge, { status: 201 });

  } catch (err) {
    console.error("PLEDGE CREATE ERROR:", err);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
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