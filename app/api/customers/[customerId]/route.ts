// app/api/customers/[customerId]/route.ts

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ customerId: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
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

    const { customerId } = await context.params;
    if (!customerId) {
      return NextResponse.json({ error: "Customer ID required" }, { status: 400 });
    }

    /* ---- Query --------------------------------------------------- */
    const customer = await prisma.customer.findFirst({
      where: {
        id:        customerId,
        userId:    user.id,
        deletedAt: null,
      },
      include: {
        pledges: {
          orderBy: { createdAt: "desc" },
          select: {
            id:          true,
            status:      true,
            pledgeDate:  true,
            loanAmount:  true,
            releaseDate: true,

            // First item for display label
            items: {
              take:   1,
              select: {
                itemName:  true,
                itemType:  true,
                metalType: true,
              },
            },

            // Total item count without fetching all
            _count: {
              select: { items: true },
            },
          },
        },
      },
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    /* ---- Format -------------------------------------------------- */
    const formatted = {
      id:          customer.id,
      name:        customer.name,
      address:     customer.address, // ✅ kept
      region:      customer.region,  // ✅ added
      mobile:      customer.mobile,
      aadharNo:    customer.aadharNo,
      remark:      customer.remark,
      customerImg: customer.customerImg,
      idProofImg:  customer.idProofImg,
      viewToken:   customer.viewToken,
      pledges: customer.pledges.map((pledge) => {
  const firstItem = pledge.items[0];

  const itemLabel = firstItem
    ? firstItem.itemName ||
      `${firstItem.itemType?.charAt(0) + firstItem.itemType?.slice(1).toLowerCase()} (${
        firstItem.metalType?.charAt(0) + firstItem.metalType?.slice(1).toLowerCase()
      })`
    : null;

  return {
    id: pledge.id,
    status: pledge.status,
    pledgeDate: pledge.pledgeDate.toISOString(), // ✅ fixed
    loanAmount: Number(pledge.loanAmount),       // ✅ fixed
    releaseDate: pledge.releaseDate?.toISOString() || null, // ✅ fixed
    itemLabel,
    itemCount: pledge._count.items,
  };
}),
    };

    return NextResponse.json({ customer: formatted });
  } catch (err) {
    console.error("CUSTOMER DETAIL ERROR:", err);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}