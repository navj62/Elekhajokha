// app/api/customers/route.ts

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

/* ------------------------------------------------------------------ */
/*  GET /api/customers                                                  */
/*  Fetch all customers for the logged-in user                        */
/* ------------------------------------------------------------------ */
export async function GET() {
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

    const customers = await prisma.customer.findMany({
      where: {
        userId:    user.id,
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
      select: {
        id:        true,
        name:      true,
        address:   true, // ✅ kept
        region:    true, // ✅ added
        createdAt: true,
      },
    });

    return NextResponse.json({ customers });
  } catch (err) {
    console.error("GET CUSTOMERS ERROR:", err);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
