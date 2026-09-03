import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET() {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { clerkUserId },
      select: { id: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const [defaults, custom] = await Promise.all([
      prisma.pledgeItemType.findMany({
        where: { isDefault: true },
        orderBy: { label: "asc" },
        select: { id: true, label: true, isDefault: true },
      }),
      prisma.pledgeItemType.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "asc" },
        select: { id: true, label: true, isDefault: true },
      }),
    ]);

    return NextResponse.json({ defaults, custom });
  } catch (err) {
    console.error("GET /api/item-types failed:", err);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { clerkUserId },
      select: { id: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const body = await req.json();
    const label = String(body?.label ?? "").trim();

    if (!label) return NextResponse.json({ error: "Label is required" }, { status: 400 });
    if (label.length > 50) return NextResponse.json({ error: "Max 50 characters" }, { status: 400 });

    // Layer 1 — the RULE. Stricter than the DB constraint on purpose: it is
    // case-insensitive, and it also rejects a label that collides with a system
    // default (which the constraint cannot see, since defaults live under a
    // different userId). This is what produces the friendly 409 in the normal
    // case. It is check-then-act, so it cannot be the guarantee.
    const duplicate = await prisma.pledgeItemType.findFirst({
      where: {
        label: { equals: label, mode: "insensitive" },
        OR: [{ isDefault: true }, { userId: user.id }],
      },
    });
    if (duplicate) {
      return NextResponse.json(
        { error: "DUPLICATE", message: "This item type already exists." },
        { status: 409 }
      );
    }

    // Layer 2 — the GUARANTEE. @@unique([userId, label]) closes the window
    // between the check above and this write, which a double-submit on a slow
    // connection can otherwise slip through. The loser of that race gets P2002;
    // it must be indistinguishable from the ordinary duplicate above, so the
    // response shape and status are identical.
    try {
      const created = await prisma.pledgeItemType.create({
        data: { label, isDefault: false, userId: user.id },
        select: { id: true, label: true, isDefault: true },
      });

      return NextResponse.json(created, { status: 201 });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        return NextResponse.json(
          { error: "DUPLICATE", message: "This item type already exists." },
          { status: 409 }
        );
      }
      throw err;
    }
  } catch (err) {
    console.error("POST /api/item-types failed:", err);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
