// app/api/market-rates/route.ts

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {prisma} from "@/lib/prisma";

// ✅ Force dynamic — never cache this route at the Next.js layer
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [gold, silver] = await Promise.all([
      prisma.metalPrice.findFirst({
        where:   { metal: "GOLD" },
        orderBy: { createdAt: "desc" },
      }),
      prisma.metalPrice.findFirst({
        where:   { metal: "SILVER" },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return NextResponse.json(
      { gold, silver },
      // ✅ Belt-and-suspenders: no-store header on top of force-dynamic
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("GET /api/market-rates failed:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}