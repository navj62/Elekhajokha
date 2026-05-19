// app/api/reports/pledges/route.ts
import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { generatePledgePDF } from "@/lib/generatePDF";
import { auth } from "@clerk/nextjs/server";

export async function GET(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkUserId } });
    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    const format = req.nextUrl.searchParams.get("format");

    const pledges = await prisma.pledge.findMany({
      where: { customer: { userId: user.id, deletedAt: null } },
      orderBy: { pledgeDate: "desc" },
      include: {
        customer: { select: { name: true, mobile: true } },
      },
    });

    const result = pledges.map((p, i) => ({
      index: i + 1,
      customerName: p.customer?.name ?? "—",
      pledgeDate: new Date(p.pledgeDate).toLocaleDateString("en-IN", {
        day: "2-digit", month: "short", year: "numeric",
      }),
      itemType: p.itemType,
      itemName: p.itemName,
      loanAmount: Number(p.loanAmount),
      status: p.status,
      totalInterest: p.totalInterest ? Number(p.totalInterest) : null,
      receivableAmount: p.receivableAmount ? Number(p.receivableAmount) : null,
      itemPhoto: p.itemPhoto ?? null,
    }));

    if (format === "pdf") {
      const pdfBuffer = await generatePledgePDF("Pledge Report", result);
      return new NextResponse(new Uint8Array(pdfBuffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": "attachment; filename=pledges.pdf",
        },
      });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}