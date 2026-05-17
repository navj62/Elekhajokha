// app/api/customers/[customerId]/toggle-portal/route.ts

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ customerId: string }>;
};

export async function PATCH(
  _req: Request,
  context: RouteContext
) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { clerkUserId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const { customerId } = await context.params;

    const customer = await prisma.customer.findFirst({
      where: {
        id: customerId,
        userId: user.id,
      },
      select: {
        id: true,
        isPortalBlocked: true,
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    const updated = await prisma.customer.update({
      where: { id: customer.id },
      data: {
        isPortalBlocked: !customer.isPortalBlocked,
      },
      select: {
        isPortalBlocked: true,
      },
    });

    return NextResponse.json({
      success: true,
      isPortalBlocked: updated.isPortalBlocked,
    });

  } catch (err) {
    console.error("TOGGLE PORTAL ERROR:", err);

    return NextResponse.json(
      { error: "Server Error" },
      { status: 500 }
    );
  }
}