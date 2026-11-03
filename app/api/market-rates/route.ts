// app/api/market-rates/route.ts

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// Has no effect: auth() reads request headers, which makes this route dynamic,
// so Next never caches it. Nothing here is cached on the server.
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
    return NextResponse.json(
      { gold, silver },
      {
        headers: {
          // NOT CDN caching: `private` forbids shared caches, so s-maxage
          // and stale-while-revalidate (shared-cache directives) are ignored,
          // and with no max-age the browser does not reuse it either.
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