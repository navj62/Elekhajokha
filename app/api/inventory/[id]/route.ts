import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where:  { clerkUserId },
      select: { id: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { id } = await context.params;

    const item = await prisma.inventoryItem.findFirst({
      where:   { id, ownerId: user.id },
      include: {
        // Settlement data for PLEDGE_SALE items. Reached only through an item
        // the where clause above has already proven this user owns.
        sourcePledge: {
          select: {
            id: true,
            customerId: true,
            customer: { select: { name: true } },
            pledgeDate:       true,
            loanAmount:       true,
            interestRate:     true,
            releaseDate:      true,
            totalInterest:    true,
            receivableAmount: true,
            durationMonths:   true,
            // The immutable record written by the sell route. Absent for
            // legacy sales that predate the audit trail.
            pledgeAudits: {
              where:   { action: "SOLD" },
              orderBy: { createdAt: "desc" },
              take:    1,
              select: {
                principal:            true,
                totalInterest:        true,
                receivableAmount:     true,
                durationMonths:       true,
                releaseDate:          true,
                goldPricePerGram:     true,
                silverPricePerGram:   true,
                marketValueAtRelease: true,
                ltvAtRelease:         true,
              },
            },
          },
        },
      },
    });

    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ item });
  } catch (err) {
    console.error("GET /api/inventory/[id] failed:", err);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
