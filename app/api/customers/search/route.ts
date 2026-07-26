// app/api/customers/search/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth }                      from "@clerk/nextjs/server";
import { prisma }                    from "@/lib/prisma";
import { PledgeStatus, Prisma } from "@prisma/client";

// Safety cap only — far above any realistic shop size, but bounded so a
// pathological account can never hang the page. The customer list page has no
// pagination UI, so the default must return the full list, not a first page.
const MAX_RESULTS  = 5000;
const DEFAULT_TAKE = MAX_RESULTS;

function titleCase(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function buildItemLabel(item: {
  itemName:  string | null;
  itemType:  string;
  metalType: string;
}): string {
  return item.itemName?.trim() || `${item.itemType} (${titleCase(item.metalType)})`;
}

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

    const { searchParams } = req.nextUrl;
    const search   = searchParams.get("q")?.trim() ?? "";
    const sortBy   = searchParams.get("sortBy")    ?? ""; // name-asc, name-desc, most-pledges, highest-loan, newest, recent-update
    const filterBy = searchParams.get("filterBy")  ?? "ALL"; // ALL, ACTIVE, RELEASED, OVERDUE, PINNED
    const take     = Math.min(
      parseInt(searchParams.get("take") ?? String(DEFAULT_TAKE), 10) || DEFAULT_TAKE,
      MAX_RESULTS
    );

    const where: Prisma.CustomerWhereInput = {
      userId:    user.id,
      deletedAt: null,
    };

    let statusFilter: PledgeStatus | undefined = undefined;
    if (filterBy === "ACTIVE") statusFilter = PledgeStatus.ACTIVE;
    if (filterBy === "RELEASED") statusFilter = PledgeStatus.RELEASED;
    if (filterBy === "OVERDUE") statusFilter = PledgeStatus.OVERDUE;
    
    if (filterBy === "PINNED") {
      where.isPinned = true;
    }

    if (search) {
      const itemOrClauses: Prisma.PledgeItemWhereInput[] = [
        { itemName: { contains: search, mode: "insensitive" } },
        { itemType: { contains: search, mode: "insensitive" } },
      ];

      const itemsWhere: Prisma.PledgeItemListRelationFilter = {
        some: { OR: itemOrClauses },
      };

      const pledgesWithItems: Prisma.PledgeListRelationFilter = {
        some: {
          ...(statusFilter && { status: statusFilter }),
          items: itemsWhere,
        },
      };

      where.OR = [
        { name:    { contains: search, mode: "insensitive" } },
        { address: { contains: search, mode: "insensitive" } },
        { region:  { contains: search, mode: "insensitive" } },
        { mobile:  { contains: search, mode: "insensitive" } },
        { pledges: pledgesWithItems },
      ];
    } else if (statusFilter) {
      where.pledges = { some: { status: statusFilter } };
    }

    const orderBy: Prisma.CustomerOrderByWithRelationInput[] = [
      { isPinned: "desc" }
    ];

    if (sortBy === "name-asc") {
      orderBy.push({ name: "asc" });
    } else if (sortBy === "name-desc") {
      orderBy.push({ name: "desc" });
    } else if (sortBy === "address-asc") {
      orderBy.push({ address: "asc" });
    } else if (sortBy === "address-desc") {
      orderBy.push({ address: "desc" });
    } else if (sortBy === "most-pledges") {
      orderBy.push({ pledges: { _count: "desc" } });
    } else if (sortBy === "recent-update") {
      orderBy.push({ updatedAt: "desc" });
    } else if (sortBy === "oldest") {
      orderBy.push({ createdAt: "asc" });
    } else if (!sortBy.startsWith("item") && sortBy !== "highest-loan") {
      orderBy.push({ createdAt: "desc" }); // "newest" or default
    }

    const customers = await prisma.customer.findMany({
      where,
      orderBy,
      take: MAX_RESULTS, // hard safety bound on the DB query itself
      select: {
        id:     true,
        name:   true,
        region: true,
        address: true,
        isPinned: true,
        createdAt: true,
        updatedAt: true,

        _count: {
          select: {
            pledges: statusFilter
              ? { where: { status: statusFilter } }
              : { where: { status: PledgeStatus.ACTIVE } },
          },
        },

        pledges: {
          where:   statusFilter ? { status: statusFilter } : undefined,
          orderBy: { createdAt: "desc" },
          // If we need to calculate highest loan, we need all pledges for this customer (that match statusFilter)
          // Since we only really need `loanAmount` for the calculation and the latest `items` for the label,
          // we fetch all pledges (matching status filter) to sum loan amount.
          select: {
            loanAmount: true,
            items: {
              orderBy: { id: "desc" },
              take:    1,
              select: {
                itemName:  true,
                itemType:  true,
                metalType: true,
              },
            },
          },
        },
      },
    });

    const mapped = customers.map((cust) => {
      const latestItem = cust.pledges[0]?.items[0];
      
      let totalLoanAmount = 0;
      cust.pledges.forEach(p => {
        totalLoanAmount += Number(p.loanAmount || 0);
      });

      return {
        id:          cust.id,
        name:        cust.name,
        region:      cust.region || cust.address, 
        isPinned:    cust.isPinned,
        pledgeCount: cust._count.pledges,
        totalLoanAmount,
        latestItem:  latestItem ? buildItemLabel(latestItem) : null,
      };
    });

    if (sortBy === "highest-loan") {
      mapped.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return b.totalLoanAmount - a.totalLoanAmount;
      });
    } else if (sortBy.startsWith("itemname")) {
      mapped.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        const nameA = a.latestItem || "";
        const nameB = b.latestItem || "";
        return sortBy === "itemname-asc" ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
      });
    } else if (sortBy.startsWith("itemtype")) {
      // Sort by Item Type Options: Gold, Silver, Diamond, Other
      // we'll boost the specific type to the top
      const targetType = sortBy.split("-")[1] || "";
      mapped.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        const itemA = (a.latestItem || "").toLowerCase();
        const itemB = (b.latestItem || "").toLowerCase();
        const hasA = itemA.includes(targetType);
        const hasB = itemB.includes(targetType);
        if (hasA && !hasB) return -1;
        if (!hasA && hasB) return 1;
        return 0; // maintain default
      });
    }

    const hasMore = mapped.length > take;
    const page    = hasMore ? mapped.slice(0, take) : mapped;

    return NextResponse.json(
      {
        customers: page,
        hasMore,
        count: mapped.length,
      },
      {
        headers: {
          "Cache-Control": "private, max-age=10, must-revalidate",
        },
      }
    );
  } catch (err) {
    console.error("CUSTOMER SEARCH ERROR:", err);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}