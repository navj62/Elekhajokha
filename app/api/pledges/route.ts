import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client"; // ✅ ADDED

/* ------------------------------------------------------------------ */
/* Constants */
/* ------------------------------------------------------------------ */
const VALID_ITEM_TYPES = [
  "NECKLACE", "CHAIN", "RING", "BANGLE", "BRACELET",
  "EARRING", "ANKLET", "PENDANT", "COIN", "BAR", "OTHER",
] as const;

const VALID_METAL_TYPES = ["GOLD", "SILVER"] as const;
const VALID_COMPOUNDING = ["MONTHLY", "HALFYEARLY", "YEARLY"] as const;

type ItemType = typeof VALID_ITEM_TYPES[number];
type MetalType = typeof VALID_METAL_TYPES[number];
type CompoundingDuration = typeof VALID_COMPOUNDING[number];

/* ------------------------------------------------------------------ */
/* Types */
/* ------------------------------------------------------------------ */
interface RawItem {
  itemType: string;
  metalType: string;
  itemName?: string;
  quantity: number;
  grossWeight: number;
  netWeight: number;
  purity: number;
  netWeightOfMetal: number;
}

/* ------------------------------------------------------------------ */
/* POST */
/* ------------------------------------------------------------------ */
export async function POST(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { clerkUserId },
      select: { id: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const fd = await req.formData();

    const customerId = fd.get("customerId") as string;
    const pledgeDate = fd.get("pledgeDate") as string;
    const loanAmount = fd.get("loanAmount") as string;
    const interestRate = fd.get("interestRate") as string;
    const compoundingDuration = fd.get("compoundingDuration") as string;
    const allowCompoundingRaw = fd.get("allowCompounding") as string;
    const netWeightOfGoldRaw = fd.get("netWeightOfGold") as string;
    const netWeightOfSilverRaw = fd.get("netWeightOfSilver") as string;
    const durationMonthsRaw = fd.get("durationMonths") as string; // ✅ ADDED
    const itemsRaw = fd.get("items") as string;
    const remark = fd.get("remark") as string | null;
    const imageFile = fd.get("itemPhoto") as File | null;

    if (!customerId || !pledgeDate || !loanAmount || !interestRate || !compoundingDuration || !itemsRaw) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!VALID_COMPOUNDING.includes(compoundingDuration as CompoundingDuration)) {
      return NextResponse.json({ error: "Invalid compounding duration" }, { status: 400 });
    }

    const loanAmountNum = parseFloat(loanAmount);
    const interestRateNum = parseFloat(interestRate);
    const netWeightOfGold = parseFloat(netWeightOfGoldRaw || "0");
    const netWeightOfSilver = parseFloat(netWeightOfSilverRaw || "0");
    const durationMonths = durationMonthsRaw ? parseFloat(durationMonthsRaw) : null; // ✅ ADDED
    const allowCompounding = allowCompoundingRaw !== "false";

    if (isNaN(loanAmountNum) || loanAmountNum <= 0) {
      return NextResponse.json({ error: "Invalid loan amount" }, { status: 400 });
    }
    if (isNaN(interestRateNum) || interestRateNum <= 0) {
      return NextResponse.json({ error: "Invalid interest rate" }, { status: 400 });
    }

    // ✅ ADDED (metal validation)
    if (netWeightOfGold === 0 && netWeightOfSilver === 0) {
      return NextResponse.json(
        { error: "No valid metal weight" },
        { status: 400 }
      );
    }

    let items: RawItem[];
    try {
      items = JSON.parse(itemsRaw);
    } catch {
      return NextResponse.json({ error: "Invalid items JSON" }, { status: 400 });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "At least one item is required" }, { status: 400 });
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const label = `Item ${i + 1}`;

      if (!VALID_ITEM_TYPES.includes(item.itemType as ItemType)) {
        return NextResponse.json({ error: `${label}: Invalid item type` }, { status: 400 });
      }
      if (!VALID_METAL_TYPES.includes(item.metalType as MetalType)) {
        return NextResponse.json({ error: `${label}: Invalid metal type` }, { status: 400 });
      }
      if (!item.grossWeight || item.grossWeight <= 0) {
        return NextResponse.json({ error: `${label}: Invalid gross weight` }, { status: 400 });
      }
      if (!item.netWeight || item.netWeight <= 0) {
        return NextResponse.json({ error: `${label}: Invalid net weight` }, { status: 400 });
      }
      if (item.netWeight > item.grossWeight) {
        return NextResponse.json(
          { error: `${label}: Net weight cannot exceed gross weight` },
          { status: 400 }
        );
      }
      if (!item.purity || item.purity <= 0 || item.purity > 100) {
        return NextResponse.json({ error: `${label}: Invalid purity` }, { status: 400 });
      }

      // ✅ ADDED (quantity validation)
      if (item.quantity && item.quantity <= 0) {
        return NextResponse.json(
          { error: `${label}: Invalid quantity` },
          { status: 400 }
        );
      }

      item.netWeightOfMetal = parseFloat(
        (item.netWeight * (item.purity / 100)).toFixed(3)
      );
    }

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, userId: user.id },
    });
    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    let itemPhoto: string | null = null;

    if (imageFile && imageFile.size > 0) {
      // ✅ ADDED (file validation)
      const ext = imageFile.name.split(".").pop()?.toLowerCase();
      if (!["jpg", "jpeg", "png", "webp"].includes(ext || "")) {
        return NextResponse.json(
          { error: "Invalid image type" },
          { status: 400 }
        );
      }

      const uploadDir = path.join(process.cwd(), "public", "uploads", "pledges");
      await mkdir(uploadDir, { recursive: true });

      const filename = `${customerId}-${Date.now()}.${ext}`;
      await writeFile(
        path.join(uploadDir, filename),
        Buffer.from(await imageFile.arrayBuffer())
      );
      itemPhoto = `/uploads/pledges/${filename}`;
    }

    const pledge = await prisma.$transaction(async (tx) => {
      const created = await tx.pledge.create({
        data: {
          customerId,
          pledgeDate: new Date(pledgeDate),

          // ✅ FIXED (Decimal safety)
          loanAmount: new Prisma.Decimal(loanAmountNum),
          interestRate: new Prisma.Decimal(interestRateNum),

          compoundingDuration: compoundingDuration as CompoundingDuration,
          allowCompounding,

          netWeightOfGold: new Prisma.Decimal(netWeightOfGold),
          netWeightOfSilver: new Prisma.Decimal(netWeightOfSilver),

          durationMonths: durationMonths
            ? new Prisma.Decimal(durationMonths)
            : null,

          status: "ACTIVE",
          calculationVersion: 1,
          remark: remark || null,
          itemPhoto,
        },
      });

      await tx.pledgeItem.createMany({
        data: items.map((item) => ({
          pledgeId: created.id,
          itemType: item.itemType as ItemType,
          metalType: item.metalType as MetalType,
          itemName: item.itemName || null,
          quantity: item.quantity ?? 1,
          grossWeight: item.grossWeight,
          netWeight: item.netWeight,
          purity: item.purity,
          netWeightOfMetal: item.netWeightOfMetal,
        })),
      });

      // ✅ ADDED (Audit entry)
      await tx.pledgeAudit.create({
        data: {
          pledgeId: created.id,
          action: "CREATED",

          principal: new Prisma.Decimal(loanAmountNum),
          interestRate: new Prisma.Decimal(interestRateNum),

          allowCompounding,
          compoundingDuration: compoundingDuration as CompoundingDuration,

          calculationVersion: 1,
          durationMonths: durationMonths
            ? new Prisma.Decimal(durationMonths)
            : null,

          netWeightOfGold: new Prisma.Decimal(netWeightOfGold),
          netWeightOfSilver: new Prisma.Decimal(netWeightOfSilver),

          totalInterest: new Prisma.Decimal(0),
          receivableAmount: new Prisma.Decimal(0),
        },
      });

      return tx.pledge.findUnique({
        where: { id: created.id },
        include: { items: true },
      });
    });

    return NextResponse.json(pledge, { status: 201 });

  } catch (err) {
    console.error("PLEDGE CREATE ERROR:", err);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}