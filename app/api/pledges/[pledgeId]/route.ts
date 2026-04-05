import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { calculateHybridInterest } from "@/lib/interest";
type RouteContext = {
  params: Promise<{ pledgeId: string }>;
};


export async function PATCH(req: Request, context: RouteContext) {
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

    const { pledgeId } = await context.params;
    if (!pledgeId) {
      return NextResponse.json({ error: "Pledge ID required" }, { status: 400 });
    }

    const pledge = await prisma.pledge.findFirst({
      where: { id: pledgeId, customer: { userId: user.id } },
    });

    if (!pledge) {
      return NextResponse.json({ error: "Pledge not found" }, { status: 404 });
    }

    if (pledge.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Only active pledges can be released" },
        { status: 400 }
      );
    }

    const body = await req.json();

    const {
      releaseDate,
      allowCompounding,
      compoundingDuration,
      calculationVersion,
    } = body;

    if (!releaseDate) {
      return NextResponse.json(
        { error: "Release date required" },
        { status: 400 }
      );
    }

    // ✅ SAFE CALCULATION (backend only)
    const principal = parseFloat(pledge.loanAmount.toString());
    const rate = parseFloat(pledge.interestRate.toString());

    const calc = calculateHybridInterest(
      principal,
      rate,
      new Date(pledge.pledgeDate),
      new Date(releaseDate),
      allowCompounding,
      compoundingDuration
    );

    // ✅ UPDATE PLEDGE
    const updated = await prisma.pledge.update({
      where: { id: pledgeId },
      data: {
        status: "RELEASED",
        releaseDate: new Date(releaseDate),

        allowCompounding,
        compoundingDuration,

        durationMonths: calc.T,
        calculationVersion: calculationVersion ?? 1,

        totalInterest: calc.totalInterest,
        receivableAmount: calc.receivableAmount,
      },
    });

    // ✅ AUDIT LOG (VERY IMPORTANT)
    await prisma.pledgeAudit.create({
      data: {
        pledgeId: pledge.id,

        action: "RELEASED",

        principal: pledge.loanAmount,
        interestRate: pledge.interestRate,

        allowCompounding,
        compoundingDuration,

        calculationVersion: calculationVersion ?? 1,
        durationMonths: calc.T,

        totalInterest: calc.totalInterest,
        receivableAmount: calc.receivableAmount,

        releaseDate: new Date(releaseDate),
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("PLEDGE RELEASE ERROR:", err);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}

export async function GET(_req: Request, context: RouteContext) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkUserId },
      select: { id: true, username: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { pledgeId } = await context.params;
    if (!pledgeId) {
      return NextResponse.json({ error: "Pledge ID required" }, { status: 400 });
    }

    const pledge = await prisma.pledge.findFirst({
      where: {
        id: pledgeId,
        customer: { userId: user.id },
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
    });

    if (!pledge) {
      return NextResponse.json({ error: "Pledge not found" }, { status: 404 });
    }

    return NextResponse.json({
      pledge,
      user: { id: user.id, username: user.username },
    });
  } catch (err) {
    console.error("PLEDGE DETAIL ERROR:", err);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
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

    const { pledgeId } = await context.params;
    if (!pledgeId) {
      return NextResponse.json({ error: "Pledge ID required" }, { status: 400 });
    }

    const pledge = await prisma.pledge.findFirst({
      where: {
        id: pledgeId,
        customer: { userId: user.id },
      },
      select: { id: true },
    });

    if (!pledge) {
      return NextResponse.json({ error: "Pledge not found" }, { status: 404 });
    }

    await prisma.pledge.delete({ where: { id: pledgeId } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("PLEDGE DELETE ERROR:", err);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
