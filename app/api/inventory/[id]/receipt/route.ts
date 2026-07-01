import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { generateInventoryPurchasePDF } from "@/lib/generatePDF";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where:  { clerkUserId },
      select: { id: true, shopName: true, mobile: true, address: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { id } = await context.params;

    const item = await prisma.inventoryItem.findFirst({
      where: { id, ownerId: user.id },
    });
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const format = new URL(req.url).searchParams.get("format");

    if (format === "pdf") {
      const shop = {
        shopName: user.shopName,
        mobile:   user.mobile,
        address:  user.address,
      };
      const pdfItem = {
        id:                item.id,
        description:       item.description,
        itemType:          item.itemType,
        metalType:         item.metalType,
        purity:            item.purity            != null ? String(item.purity)            : null,
        grossWeight:       String(item.grossWeight),
        netWeightOfGold:   String(item.netWeightOfGold),
        netWeightOfSilver: String(item.netWeightOfSilver),
        acquiredCost:      String(item.acquiredCost),
        acquiredAt:        item.acquiredAt.toISOString(),
        acquiredMetalRate: item.acquiredMetalRate  != null ? String(item.acquiredMetalRate) : null,
        sellerName:        item.sellerName,
        sellerIdNum:       item.sellerIdNum,
        notes:             item.notes,
      };

      const buf = await generateInventoryPurchasePDF(pdfItem, shop);
      const shortId = id.slice(-8).toLowerCase();
      const dateStr = item.acquiredAt.toISOString().slice(0, 10);

      return new NextResponse(new Uint8Array(buf), {
        status: 200,
        headers: {
          "Content-Type":        "application/pdf",
          "Content-Disposition": `attachment; filename="purchase-receipt_${shortId}_${dateStr}.pdf"`,
        },
      });
    }

    return NextResponse.json({
      item: {
        ...item,
        purity:            item.purity            != null ? String(item.purity)            : null,
        grossWeight:       String(item.grossWeight),
        netWeightOfGold:   String(item.netWeightOfGold),
        netWeightOfSilver: String(item.netWeightOfSilver),
        acquiredCost:      String(item.acquiredCost),
        amountOwedAt:      item.amountOwedAt      != null ? String(item.amountOwedAt)      : null,
        acquiredMetalRate: item.acquiredMetalRate  != null ? String(item.acquiredMetalRate) : null,
        soldPrice:         item.soldPrice          != null ? String(item.soldPrice)         : null,
      },
      shop: {
        shopName: user.shopName,
        mobile:   user.mobile,
        address:  user.address,
      },
    });
  } catch (err) {
    console.error("GET /api/inventory/[id]/receipt failed:", err);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
