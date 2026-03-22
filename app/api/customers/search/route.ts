// app/api/customers/search/route.ts

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { PledgeStatus } from "@prisma/client";

export async function GET(req: Request) {
  try {
    // 🔐 AUTH
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 👤 USER
    const user = await prisma.user.findUniqueOrThrow({
      where: { clerkUserId },
      select: { id: true },
    });

    // 🔍 PARAMS
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("q")?.trim() || "";
    const filter = searchParams.get("filter") || "all";
    const pledgeStatusParam = searchParams.get("status");

    // ✅ SAFE ENUM CONVERSION
    const validStatus = Object.values(PledgeStatus).includes(
      pledgeStatusParam as PledgeStatus
    )
      ? (pledgeStatusParam as PledgeStatus)
      : undefined;

    // 🧱 BASE WHERE
    const whereClause: any = {
      userId: user.id,
      deletedAt: null,
    };

    // 🔎 SEARCH LOGIC
    if (search) {
      if (filter === "name") {
        whereClause.name = { contains: search, mode: "insensitive" };
      } else if (filter === "address") {
        whereClause.address = { contains: search, mode: "insensitive" };
      } else if (filter === "itemName") {
        whereClause.pledges = {
          some: {
            itemName: { contains: search, mode: "insensitive" },
            ...(validStatus && { status: validStatus }),
          },
        };
      } else {
        // GLOBAL SEARCH
        whereClause.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { address: { contains: search, mode: "insensitive" } },
          {
            pledges: {
              some: {
                itemName: { contains: search, mode: "insensitive" },
                ...(validStatus && { status: validStatus }),
              },
            },
          },
        ];
      }
    } else if (validStatus) {
      whereClause.pledges = {
        some: { status: validStatus },
      };
    }

    // 🚀 OPTIMIZED QUERY
    const customers = await prisma.customer.findMany({
      where: whereClause,
      take: 20,
      orderBy: { createdAt: "desc" },

      select: {
        id: true,
        name: true,

        // ⚡ fast count
        _count: {
          select: { pledges: true },
        },

        // ⚡ only latest pledge
        pledges: {
          where: validStatus ? { status: validStatus } : undefined,
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            itemName: true,
          },
        },
      },
    });

    // ✅ FORMAT RESPONSE
    const result = customers.map((cust) => ({
      id: cust.id,
      name: cust.name,
      pledgeCount: cust._count.pledges,
      latestItem: cust.pledges[0]?.itemName || null,
    }));

    return NextResponse.json({ customers: result });
  } catch (err) {
    console.error("CUSTOMER SEARCH ERROR:", err);
    return NextResponse.json(
      { error: "Server Error" },
      { status: 500 }
    );
  }
}