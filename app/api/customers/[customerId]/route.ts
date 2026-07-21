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
            netWeightOfGold:   true,
            netWeightOfSilver: true,

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
      address:     customer.address,
      region:      customer.region,
      mobile:      customer.mobile,
      aadharNo:    customer.aadharNo,
      remark:      customer.remark,
      createdAt:   customer.createdAt,
      isPortalBlocked: customer.isPortalBlocked,
      customerImg: customer.customerImg,
      idProofImg:  customer.idProofImg,
      viewToken:   customer.viewToken,

      pledges: customer.pledges.map((pledge: typeof customer.pledges[number]) => {
        const firstItem = pledge.items[0];

        const itemLabel = firstItem
          ? firstItem.itemName || `${firstItem.itemType} (${firstItem.metalType?.charAt(0) + firstItem.metalType?.slice(1).toLowerCase()})`
          : null;

        return {
          id: pledge.id,
          status: pledge.status,
          pledgeDate: pledge.pledgeDate.toISOString(),
          loanAmount: Number(pledge.loanAmount),
          releaseDate: pledge.releaseDate?.toISOString() || null,
          netWeightOfGold: Number(pledge.netWeightOfGold),
          netWeightOfSilver: Number(pledge.netWeightOfSilver),
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

export async function PATCH(req: Request, context: RouteContext) {
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

    const { customerId } = await context.params;
    if (!customerId) {
      return NextResponse.json({ error: "Customer ID required" }, { status: 400 });
    }

    const body = await req.json();
    const { name, address, region, mobile, aadharNo, remark } = body;

    // Partial update — undefined means "leave unchanged". Validate any field
    // that IS provided, mirroring add-customer's rules for the overlapping fields.
    for (const [field, value] of [
      ["name", name],
      ["address", address],
      ["region", region],
    ] as const) {
      if (value !== undefined) {
        if (typeof value !== "string" || !value.trim())
          return NextResponse.json(
            { error: "VALIDATION", message: `${field} is required and cannot be empty` },
            { status: 400 }
          );
        if (value.trim().length > 200)
          return NextResponse.json(
            { error: "VALIDATION", message: `${field} must be at most 200 characters` },
            { status: 400 }
          );
      }
    }

    if (mobile !== undefined && mobile !== null && String(mobile).trim() !== "") {
      if (typeof mobile !== "string" || !/^\d{10}$/.test(mobile.trim()))
        return NextResponse.json(
          { error: "VALIDATION", message: "Mobile number must be exactly 10 digits" },
          { status: 400 }
        );
    }

    if (aadharNo !== undefined && aadharNo !== null && typeof aadharNo === "string" && aadharNo.trim().length > 20)
      return NextResponse.json(
        { error: "VALIDATION", message: "Aadhaar number must be at most 20 characters" },
        { status: 400 }
      );

    if (remark !== undefined && remark !== null && typeof remark === "string" && remark.length > 2000)
      return NextResponse.json(
        { error: "VALIDATION", message: "Remark must be at most 2000 characters" },
        { status: 400 }
      );

    const updated = await prisma.customer.updateMany({
      where: { id: customerId, userId: user.id, deletedAt: null },
      data: {
        ...(name     !== undefined && { name:     typeof name === "string" ? name.trim() : name }),
        ...(address  !== undefined && { address:  typeof address === "string" ? address.trim() : address }),
        ...(region   !== undefined && { region:   typeof region === "string" ? region.trim() : region }),
        ...(mobile   !== undefined && { mobile:   typeof mobile === "string" ? (mobile.trim() || null) : mobile }),
        ...(aadharNo !== undefined && { aadharNo: typeof aadharNo === "string" ? (aadharNo.trim() || null) : aadharNo }),
        ...(remark   !== undefined && { remark:   typeof remark === "string" ? (remark.trim() || null) : remark }),
      },
    });

    if (updated.count === 0) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("CUSTOMER PATCH ERROR:", err);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}