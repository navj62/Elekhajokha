import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { uploadImage } from "@/lib/upload";

export async function GET(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where:  { clerkUserId },
      select: { id: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const sp         = new URL(req.url).searchParams;
    const status     = sp.get("status")     ?? "in_stock";
    const sourceType = sp.get("sourceType") ?? "all";
    const metalType  = sp.get("metalType")  ?? "all";
    const sortBy     = sp.get("sortBy")     ?? "newest";

    const whereFiltered: Prisma.InventoryItemWhereInput = {
      ownerId: user.id,
      ...(status !== "all"
        ? { status: status === "in_stock" ? "IN_STOCK" : "SOLD" }
        : {}),
      ...(sourceType !== "all"
        ? { sourceType: sourceType === "pledge" ? "PLEDGE_SALE" : "DIRECT_PURCHASE" }
        : {}),
      ...(metalType !== "all"
        ? { metalType: { equals: metalType, mode: "insensitive" } }
        : {}),
    };

    const orderBy: Prisma.InventoryItemOrderByWithRelationInput =
      sortBy === "oldest"     ? { acquiredAt:  "asc"  } :
      sortBy === "value_high" ? { acquiredCost: "desc" } :
      sortBy === "value_low"  ? { acquiredCost: "asc"  } :
      { acquiredAt: "desc" };

    const [items, allStats] = await Promise.all([
      prisma.inventoryItem.findMany({
        where:   whereFiltered,
        orderBy,
        include: {
          sourcePledge: {
            select: {
              id: true,
              customerId: true,
              customer: { select: { name: true } },
            },
          },
        },
      }),
      prisma.inventoryItem.findMany({
        where:  { ownerId: user.id },
        select: { status: true, acquiredCost: true, soldPrice: true },
      }),
    ]);

    const inStock = allStats.filter((i) => i.status === "IN_STOCK");
    const sold    = allStats.filter((i) => i.status === "SOLD");

    return NextResponse.json({
      items,
      summary: {
        totalInStock:      inStock.length,
        totalSold:         sold.length,
        totalValueInStock: inStock.reduce((s, i) => s + Number(i.acquiredCost), 0),
        totalSoldRevenue:  sold.reduce((s, i) => s + Number(i.soldPrice ?? 0), 0),
      },
    });
  } catch (err) {
    console.error("GET /api/inventory failed:", err);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where:  { clerkUserId },
      select: { id: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const fd = await req.formData();

    const description  = String(fd.get("description")  ?? "").trim();
    const itemType     = String(fd.get("itemType")      ?? "").trim();
    const metalType    = String(fd.get("metalType")     ?? "").trim();
    const purityRaw    = fd.get("purity");
    const purity       = purityRaw !== null && purityRaw !== "" ? Number(purityRaw) : null;
    const weightGrams  = Number(fd.get("weightGrams"));
    const acquiredCost = Number(fd.get("acquiredCost"));
    const acquiredAt   = String(fd.get("acquiredAt")   ?? "");
    const sellerName   = String(fd.get("sellerName")   ?? "").trim() || null;
    const sellerIdNum  = String(fd.get("sellerIdNum")  ?? "").trim() || null;
    const notes        = String(fd.get("notes")        ?? "").trim() || null;
    const photoFile    = fd.get("photo");

    if (!description || description.length > 200)
      return NextResponse.json({ error: "description required, max 200 chars" }, { status: 400 });
    if (!itemType)
      return NextResponse.json({ error: "itemType is required" }, { status: 400 });
    if (!metalType)
      return NextResponse.json({ error: "metalType is required" }, { status: 400 });

    // Validate metalType against the accepted set, then store title case to
    // match the UI's display convention ("Gold"/"Silver"/"Other"). The GET
    // filter compares with mode: "insensitive", so casing never breaks filtering.
    const METAL_TITLE_CASE: Record<string, string> = {
      GOLD:   "Gold",
      SILVER: "Silver",
      OTHER:  "Other",
    };
    const normalizedMetal = metalType.trim().toUpperCase();
    if (!METAL_TITLE_CASE[normalizedMetal])
      return NextResponse.json({ error: "VALIDATION", message: "Invalid metal type." }, { status: 400 });
    const metalTypeNormalized = METAL_TITLE_CASE[normalizedMetal];

    if (purity !== null) {
      if (isNaN(purity) || purity <= 0 || purity > 100)
        return NextResponse.json({ error: "VALIDATION", message: "Purity must be between 0 and 100." }, { status: 400 });
    }

    if (isNaN(weightGrams) || weightGrams <= 0)
      return NextResponse.json({ error: "weightGrams must be > 0" }, { status: 400 });
    if (isNaN(acquiredCost) || acquiredCost < 0)
      return NextResponse.json({ error: "acquiredCost must be >= 0" }, { status: 400 });

    const acquiredAtDate = new Date(acquiredAt);
    if (isNaN(acquiredAtDate.getTime()))
      return NextResponse.json({ error: "Invalid acquiredAt" }, { status: 400 });
    if (acquiredAtDate > new Date())
      return NextResponse.json({ error: "acquiredAt cannot be in the future" }, { status: 400 });

    const validType = await prisma.pledgeItemType.findFirst({
      where: {
        label: { equals: itemType, mode: "insensitive" },
        OR:    [{ isDefault: true }, { userId: user.id }],
      },
    });
    if (!validType)
      return NextResponse.json({ error: "Invalid item type" }, { status: 400 });

    let photoUrl: string | null = null;
    if (photoFile instanceof File && photoFile.size > 0) {
      photoUrl = await uploadImage(photoFile, "ELEKHAJOKHA/inventory");
    }

    const item = await prisma.inventoryItem.create({
      data: {
        ownerId:     user.id,
        sourceType:  "DIRECT_PURCHASE",
        description,
        itemType:    validType.label,
        metalType:   metalTypeNormalized,
        purity:      purity != null ? new Prisma.Decimal(purity) : null,
        weightGrams: new Prisma.Decimal(weightGrams),
        acquiredCost: new Prisma.Decimal(acquiredCost),
        acquiredAt:  acquiredAtDate,
        sellerName,
        sellerIdNum,
        notes,
        photoUrl,
        status:      "IN_STOCK",
      },
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    console.error("POST /api/inventory failed:", err);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
