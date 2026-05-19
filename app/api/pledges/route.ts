import { NextRequest, NextResponse } from "next/server";
import { auth }                      from "@clerk/nextjs/server";
import { prisma }                    from "@/lib/prisma";
import { ItemType, MetalType, PledgeStatus, Prisma } from "@prisma/client";
import { uploadImage }               from "@/lib/upload";

/* ------------------------------------------------------------------ */
/* Shared constants                                                    */
/* ------------------------------------------------------------------ */
const VALID_ITEM_TYPES = [
  "NECKLACE", "CHAIN", "RING", "BANGLE", "BRACELET",
  "EARRING", "ANKLET", "PENDANT", "COIN", "BAR", "OTHER",
] as const;

const VALID_METAL_TYPES = ["GOLD", "SILVER"]                      as const;
const VALID_COMPOUNDING = ["MONTHLY", "HALFYEARLY", "YEARLY"]     as const;

type ItemTypeValue       = typeof VALID_ITEM_TYPES[number];
type MetalTypeValue      = typeof VALID_METAL_TYPES[number];
type CompoundingDuration = typeof VALID_COMPOUNDING[number];

/* ------------------------------------------------------------------ */
/* Shared helpers                                                      */
/* ------------------------------------------------------------------ */
function titleCase(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function parseEnum<T extends string>(
  raw: string | null,
  values: readonly T[]
): T | undefined {
  if (!raw) return undefined;
  return (values as readonly string[]).includes(raw) ? (raw as T) : undefined;
}

/* ------------------------------------------------------------------ */
/* GET /api/pledges                                                    */
/* */
/* Query params:                                                       */
/* metalType  — GOLD | SILVER                                       */
/* itemType   — NECKLACE | RING | BANGLE | …                       */
/* status     — ACTIVE | RELEASED | OVERDUE                        */
/* take       — page size (default 30, max 100)                    */
/* cursor     — last pledge id for cursor pagination               */
/* ------------------------------------------------------------------ */
const DEFAULT_TAKE = 30;
const MAX_TAKE     = 100;

export async function GET(req: NextRequest) {
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

    /* ---- Params -------------------------------------------------- */
    const { searchParams } = req.nextUrl;

    const metalType = parseEnum(searchParams.get("metalType"), VALID_METAL_TYPES);
    const itemType  = parseEnum(searchParams.get("itemType"),  VALID_ITEM_TYPES);
    const status    = parseEnum(searchParams.get("status"),    Object.values(PledgeStatus) as PledgeStatus[]);
    const cursor    = searchParams.get("cursor") ?? undefined;
    const take      = Math.min(
      parseInt(searchParams.get("take") ?? String(DEFAULT_TAKE), 10) || DEFAULT_TAKE,
      MAX_TAKE
    );

    /* ---- Where clause -------------------------------------------- */
    const where: Prisma.PledgeWhereInput = {
      customer: { userId: user.id },
      ...(status && { status }),

      // `some` on items — a pledge with [NECKLACE(GOLD), RING(SILVER)]
      // appears in BOTH itemType=NECKLACE and itemType=RING filters
      ...((metalType || itemType) && {
        items: {
          some: {
            ...(metalType && { metalType }),
            ...(itemType  && { itemType  }),
          },
        },
      }),
    };

    /* ---- Query --------------------------------------------------- */
    const pledges = await prisma.pledge.findMany({
      where,
      take:    take + 1, // fetch one extra to detect hasMore
      orderBy: { createdAt: "desc" },
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),

      select: {
        id:                true,
        pledgeDate:        true,
        status:            true,
        loanAmount:        true,
        netWeightOfGold:   true,
        netWeightOfSilver: true,
        remark:            true,
        customer: {
          select: { id: true, name: true },
        },
        items: {
          select: {
            itemType:  true,
            metalType: true,
            itemName:  true,
            quantity:  true,
          },
        },
      },
    });

    /* ---- Pagination ---------------------------------------------- */
    const hasMore    = pledges.length > take;
    const page       = hasMore ? pledges.slice(0, take) : pledges;
    const nextCursor = hasMore ? page[page.length - 1].id : null;

    /* ---- Format -------------------------------------------------- */
    const result = page.map((p) => ({
      id:                p.id,
      customerName:      p.customer.name,
      customerId:        p.customer.id,
      pledgeDate:        p.pledgeDate,
      status:            p.status,
      loanAmount:        Number(p.loanAmount),
      netWeightOfGold:   Number(p.netWeightOfGold),
      netWeightOfSilver: Number(p.netWeightOfSilver),
      remark:            p.remark,
      itemCount:         p.items.length,
      totalItems:        p.items.reduce((s, i) => s + i.quantity, 0),
      // Deduplicated — pledge with [NECKLACE, RING] shows both
      itemTypes:         [...new Set(p.items.map((i) => i.itemType))].map(titleCase),
      metalTypes:        [...new Set(p.items.map((i) => i.metalType))].map(titleCase),
    }));

    return NextResponse.json({ pledges: result, hasMore, nextCursor });

  } catch (err) {
    console.error("GET /api/pledges failed:", err);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}

/* ------------------------------------------------------------------ */
/* Types for POST                                                      */
/* ------------------------------------------------------------------ */
interface RawItem {
  itemType:         string;
  metalType:        string;
  itemName?:        string;
  quantity:         number;
  grossWeight:      number;
  netWeight:        number;
  purity:           number;
  netWeightOfMetal: number;
}

/* ------------------------------------------------------------------ */
/* POST /api/pledges                                                   */
/* ------------------------------------------------------------------ */
export async function POST(req: NextRequest) {
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

    const fd = await req.formData();

    const customerId          = fd.get("customerId")          as string;
    const pledgeDate          = fd.get("pledgeDate")          as string;
    const loanAmount          = fd.get("loanAmount")          as string;
    const interestRate        = fd.get("interestRate")        as string;
    const compoundingDuration = fd.get("compoundingDuration") as string;
    const allowCompoundingRaw = fd.get("allowCompounding")    as string;
    const netWeightOfGoldRaw  = fd.get("netWeightOfGold")     as string;
    const netWeightOfSilverRaw= fd.get("netWeightOfSilver")   as string;
    const durationMonthsRaw   = fd.get("durationMonths")      as string;
    const itemsRaw            = fd.get("items")               as string;
    const remark              = fd.get("remark")              as string | null;
    const imageFile           = fd.get("itemPhoto")           as File | null;

    if (!customerId || !pledgeDate || !loanAmount || !interestRate || !compoundingDuration || !itemsRaw) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!VALID_COMPOUNDING.includes(compoundingDuration as CompoundingDuration)) {
      return NextResponse.json({ error: "Invalid compounding duration" }, { status: 400 });
    }

    const loanAmountNum     = parseFloat(loanAmount);
    const interestRateNum   = parseFloat(interestRate);
    const netWeightOfGold   = parseFloat(netWeightOfGoldRaw   || "0");
    const netWeightOfSilver = parseFloat(netWeightOfSilverRaw || "0");
    const durationMonths    = durationMonthsRaw ? parseFloat(durationMonthsRaw) : null;
    const allowCompounding  = allowCompoundingRaw !== "false";

    if (isNaN(loanAmountNum)   || loanAmountNum   <= 0) {
      return NextResponse.json({ error: "Invalid loan amount" },   { status: 400 });
    }
    if (isNaN(interestRateNum) || interestRateNum <= 0) {
      return NextResponse.json({ error: "Invalid interest rate" }, { status: 400 });
    }
    if (netWeightOfGold === 0 && netWeightOfSilver === 0) {
      return NextResponse.json({ error: "No valid metal weight" }, { status: 400 });
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
      const item  = items[i];
      const label = `Item ${i + 1}`;

      if (!VALID_ITEM_TYPES.includes(item.itemType as ItemTypeValue)) {
        return NextResponse.json({ error: `${label}: Invalid item type` },   { status: 400 });
      }
      if (!VALID_METAL_TYPES.includes(item.metalType as MetalTypeValue)) {
        return NextResponse.json({ error: `${label}: Invalid metal type` },  { status: 400 });
      }
      if (!item.grossWeight || item.grossWeight <= 0) {
        return NextResponse.json({ error: `${label}: Invalid gross weight` },{ status: 400 });
      }
      if (!item.netWeight || item.netWeight <= 0) {
        return NextResponse.json({ error: `${label}: Invalid net weight` },  { status: 400 });
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
      if (item.quantity && item.quantity <= 0) {
        return NextResponse.json({ error: `${label}: Invalid quantity` }, { status: 400 });
      }

      // Recompute netWeightOfMetal server-side — never trust client calculation
      item.netWeightOfMetal = parseFloat(
        (item.netWeight * (item.purity / 100)).toFixed(3)
      );
    }

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, userId: user.id },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    /* ---- Image upload (Cloudinary) ------------------------------- */
    let itemPhoto: string | null = null;

    if (imageFile instanceof File && imageFile.size > 0) {
      itemPhoto = await uploadImage(
        imageFile,
        `ELEKHAJOKHA/pledges/${customerId}`
      );
    }

    /* ---- DB transaction ------------------------------------------ */
    const pledge = await prisma.$transaction(async (tx) => {
      const created = await tx.pledge.create({
        data: {
          customerId,
          pledgeDate:          new Date(pledgeDate),
          loanAmount:          new Prisma.Decimal(loanAmountNum),
          interestRate:        new Prisma.Decimal(interestRateNum),
          compoundingDuration: compoundingDuration as CompoundingDuration,
          allowCompounding,
          netWeightOfGold:     new Prisma.Decimal(netWeightOfGold),
          netWeightOfSilver:   new Prisma.Decimal(netWeightOfSilver),
          durationMonths:      durationMonths ? new Prisma.Decimal(durationMonths) : null,
          status:              "ACTIVE",
          calculationVersion:  1,
          remark:              remark || null,
          itemPhoto,
        },
      });

  

      await tx.pledgeAudit.create({
        data: {
          pledgeId:            created.id,
          action:              "CREATED",
          principal:           new Prisma.Decimal(loanAmountNum),
          interestRate:        new Prisma.Decimal(interestRateNum),
          allowCompounding,
          compoundingDuration: compoundingDuration as CompoundingDuration,
          calculationVersion:  1,
          durationMonths:      durationMonths ? new Prisma.Decimal(durationMonths) : null,
          netWeightOfGold:     new Prisma.Decimal(netWeightOfGold),
          netWeightOfSilver:   new Prisma.Decimal(netWeightOfSilver),
          totalInterest:       new Prisma.Decimal(0),
          receivableAmount:    new Prisma.Decimal(0),
        },
      });

      return tx.pledge.findUnique({
        where:   { id: created.id },
        include: { items: true },
      });
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