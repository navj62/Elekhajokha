// app/api/reports/customers/route.ts
import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateCustomerPDF } from "@/lib/generatePDF";
import { auth } from "@clerk/nextjs/server";

export async function GET(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkUserId } });
    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format");

    const customers = await prisma.customer.findMany({
      where: { userId: user.id, deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        mobile: true,
        address: true,
        pledges: { select: { loanAmount: true } },
      },
    });

    const result = customers.map((c) => ({
      id: c.id,
      name: c.name,
      mobile: c.mobile,
      address: c.address,
      pledgeCount: c.pledges.length,
      totalLoan: c.pledges.reduce((sum, p) => sum + Number(p.loanAmount), 0),
    }));

    if (format === "pdf") {
      const rows = result.map((c, i) => ({
        index: i + 1,
        name: c.name,
        mobile: c.mobile ?? "—",
        pledgeCount: c.pledgeCount,
        totalLoan: c.totalLoan,
      }));
      const pdfBuffer = await generateCustomerPDF("Customer Report", rows);
      return new NextResponse(new Uint8Array(pdfBuffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": "attachment; filename=customers.pdf",
        },
      });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}