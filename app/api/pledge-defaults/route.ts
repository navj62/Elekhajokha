// app/api/pledge-defaults/route.ts
//
// GET — the signed-in shop's pledge defaults, used only to PRE-FILL the
// new-pledge form. Returns just the three fields; null means "no default".
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import type { PledgeDefaults } from "@/lib/pledgeDefaults";

export async function GET() {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { clerkUserId },
      select: {
        defaultInterestRate: true,
        defaultAllowCompounding: true,
        defaultCompoundingDuration: true,
      },
    });
    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    const body: PledgeDefaults = {
      defaultInterestRate: user.defaultInterestRate?.toString() ?? null,
      defaultAllowCompounding: user.defaultAllowCompounding,
      defaultCompoundingDuration: user.defaultCompoundingDuration,
    };
    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("PLEDGE DEFAULTS GET ERROR:", err instanceof Error ? err.message : "unknown error");
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
