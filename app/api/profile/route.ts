import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

/* ------------------------------------------------------------------ */
/*  GET /api/profile                                                    */
/* ------------------------------------------------------------------ */
export async function GET() {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkUserId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        email: true,
        mobile: true,
        shopName: true,
        address: true,
        gender: true,
        profileImageUrl: true,
        subscriptionStatus: true,
         subscriptionPlan: true,  
        subscriptionEndDate: true,
        createdAt: true,
        _count: {
          select: {
            customers: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Count active pledges across all customers of this user
    const activePledges = await prisma.pledge.count({
      where: {
        status: "ACTIVE",
        customer: { userId: user.id },
      },
    });

    return NextResponse.json({
      ...user,
      totalCustomers: user._count.customers,
      activePledges,
    });
  } catch (err) {
    console.error("PROFILE GET ERROR:", err);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}

/* ------------------------------------------------------------------ */
/*  PATCH /api/profile  — update profile details                       */
/* ------------------------------------------------------------------ */
export async function PATCH(req: Request) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkUserId },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await req.json();
    const { firstName, lastName, mobile, shopName, address, gender } = body;

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(firstName  !== undefined && { firstName  }),
        ...(lastName   !== undefined && { lastName   }),
        ...(mobile     !== undefined && { mobile     }),
        ...(shopName   !== undefined && { shopName   }),
        ...(address    !== undefined && { address    }),
        ...(gender     !== undefined && { gender     }),
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("PROFILE PATCH ERROR:", err);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}