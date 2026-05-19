// app/api/market-rates/route.ts

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// ✅ Cache for 60 seconds (safe for your use case)
export const revalidate = 60;

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    

    const [gold, silver] = await Promise.all([
      prisma.metalPrice.findFirst({
        where: { metal: "GOLD" },
        orderBy: { createdAt: "desc" },
      }),
      prisma.metalPrice.findFirst({
        where: { metal: "SILVER" },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    let cache: any = null;
let lastFetch = 0;

if (Date.now() - lastFetch < 60000 && cache) {
  return NextResponse.json(cache);
}

const data = { gold, silver };
cache = data;
lastFetch = Date.now();
    return NextResponse.json(
      { gold, silver },
      {
        headers: {
          // ✅ CDN caching (VERY IMPORTANT)
          "Cache-Control": "private, s-maxage=60, stale-while-revalidate=120",
        },
      }
    );
  } catch (err) {
    console.error("GET /api/market-rates failed:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}