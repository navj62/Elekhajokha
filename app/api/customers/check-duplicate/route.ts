import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// GET /api/customers/check-duplicate?name=Ramesh
export async function GET(req: NextRequest) {
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

    const name = req.nextUrl.searchParams.get("name")?.trim();
    if (!name || name.length < 2) {
      return NextResponse.json({ matches: [] });
    }

    // Search for customers whose name contains any word from the input
    // e.g. "Ramesh Kumar" → finds "Ramesh", "Kumar Sahu", "Ramesh Patel"
    const words = name.split(/\s+/).filter((w) => w.length >= 2);

    const matches = await prisma.customer.findMany({
      where: {
        userId: user.id,
        OR: words.map((word) => ({
          name: { contains: word, mode: "insensitive" },
        })),
      },
      select: { id: true, name: true, mobile: true },
      take: 5, // cap at 5 suggestions
    });

    return NextResponse.json({ matches });
  } catch (err) {
    console.error("DUPLICATE CHECK ERROR:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}