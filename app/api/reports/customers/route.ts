// app/api/reports/customers/route.ts
import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import {
  getCustomerReportRows,
  parseDateRange,
  toCustomerReportJson,
} from "@/lib/reports/reportQueries";

// Exports of this tab go through /api/reports/export, which shares the same
// query function — keep any filter change in lib/reports/reportQueries.ts.
export async function GET(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkUserId } });
    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    const sp = req.nextUrl.searchParams;
    // Opt-in: restrict the list to customers holding at least one open pledge.
    // Absent/anything-but-"true" preserves the unfiltered default.
    const activeOnly = sp.get("activeOnly") === "true";

    const parsed = parseDateRange(sp.get("startDate"), sp.get("endDate"));
    if (!parsed.ok)
      return NextResponse.json({ error: parsed.error, message: parsed.message }, { status: 400 });

    const rows = await getCustomerReportRows(user.id, parsed.range, activeOnly);
    return NextResponse.json(toCustomerReportJson(rows));
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
