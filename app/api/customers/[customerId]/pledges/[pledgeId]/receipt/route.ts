// app/api/customers/[customerId]/pledges/[pledgeId]/receipt/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateReceiptPDF } from "@/lib/generatePDF";
import { auth } from "@clerk/nextjs/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ customerId: string; pledgeId: string }> } // ← Promise
) {
  try {
    const { customerId, pledgeId } = await params; // ← await it

    const { userId: clerkUserId } = await auth();
    if (!clerkUserId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

const user = await prisma.user.findUnique({
  where: { clerkUserId },
  select: {
    id: true,
    username: true,
    shopName: true,
    address: true,
    mobile: true,
    shopownerTerms: true, // ← must be here
    customerTerms: true,  // ← must be here
  },
});
    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

const pledge = await prisma.pledge.findFirst({
  where: {
    id: pledgeId,
    customerId: customerId,
    customer: { userId: user.id },   // ← enforce ownership through the relation
  },
  include: {
    customer: { select: { name: true, address: true } },
    items: true,
  },
});
if (!pledge)
  return NextResponse.json({ error: "Pledge not found" }, { status: 404 });

const itemSummary = pledge.items
  .map((item) => item.itemName ?? item.itemType)
  .join(", ");

const totalNetWeight = pledge.items
  .reduce((sum, item) => sum + Number(item.netWeight), 0)
  .toFixed(3);

    
const pdfBuffer = await generateReceiptPDF({
  transactionId: pledge.id.slice(-6).toUpperCase(),
  pledgeDate: new Date(pledge.pledgeDate).toLocaleDateString("en-IN", {
    day: "2-digit", month: "2-digit", year: "numeric",
  }),
  customerName: pledge.customer.name,
  customerAddress: pledge.customer.address,
  loanAmount: Number(pledge.loanAmount),
  itemName: itemSummary || "—",
  itemWeight: `${totalNetWeight} gram`,
  remark: pledge.remark,
  username: user.username ?? "Name",
  shopName: user.shopName ?? "Shop",
  shopAddress: user.address ?? "",
  shopMobile: user.mobile ?? "",
  itemPhoto: pledge.itemPhoto ?? null,
  shopownerTerms: user.shopownerTerms ?? null, // ← fix
  customerTerms: user.customerTerms ?? null,   // ← fix
});

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=receipt-${pledgeId.slice(-6)}.pdf`,
      },
    });
  } catch (err) {
    console.error("RECEIPT ERROR:", err);
    return NextResponse.json({ error: "Failed to generate receipt" }, { status: 500 });
  }
}