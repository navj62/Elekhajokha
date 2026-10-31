// app/api/customers/[customerId]/open-pledges/route.ts
//
// GET — one customer's open (ACTIVE + OVERDUE) pledges, oldest first, for the
// quick-action Release sheet. `dueToday` comes from calculateHybridInterest
// with each pledge's OWN stored settings — the same defaults the single and
// bulk release screens start from — so the amount shown here is what those
// screens will show for today. Read-only: nothing is released here.
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { calculateHybridInterest } from "@/lib/interest";
import { OPEN_PLEDGE_STATUSES } from "@/lib/pledgeConstants";

type RouteContext = { params: Promise<{ customerId: string }> };

export type OpenPledge = {
  id: string;
  status: string;
  itemLabel: string;
  pledgeDate: string;
  loanAmount: number;
  dueToday: number;
};

const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

export async function GET(_req: Request, context: RouteContext) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkUserId }, select: { id: true } });
    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { customerId } = await context.params;

    // Ownership through the tenant, never the id alone (Invariant 1).
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, userId: user.id, deletedAt: null },
      select: { id: true, name: true, mobile: true },
    });
    if (!customer)
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });

    const pledges = await prisma.pledge.findMany({
      where: { customerId: customer.id, status: { in: [...OPEN_PLEDGE_STATUSES] } },
      orderBy: [{ pledgeDate: "asc" }, { id: "asc" }],
      select: {
        id: true,
        status: true,
        pledgeDate: true,
        loanAmount: true,
        interestRate: true,
        allowCompounding: true,
        compoundingDuration: true,
        items: { take: 1, orderBy: { id: "asc" }, select: { itemName: true, itemType: true, metalType: true } },
        _count: { select: { items: true } },
      },
    });

    const now = new Date();
    const rows: OpenPledge[] = pledges.map((p) => {
      const first = p.items[0];
      const base = first ? first.itemName?.trim() || `${first.itemType} (${titleCase(first.metalType)})` : "Pledge";
      const extra = p._count.items - 1;
      const { receivableAmount } = calculateHybridInterest(
        Number(p.loanAmount),
        Number(p.interestRate),
        new Date(p.pledgeDate),
        now,
        p.allowCompounding,
        p.compoundingDuration
      );
      return {
        id: p.id,
        status: p.status,
        itemLabel: extra > 0 ? `${base} +${extra}` : base,
        pledgeDate: p.pledgeDate.toISOString(),
        loanAmount: Number(p.loanAmount),
        dueToday: receivableAmount,
      };
    });

    return NextResponse.json(
      { customer, pledges: rows },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("OPEN PLEDGES ERROR:", err instanceof Error ? err.message : "unknown error");
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
