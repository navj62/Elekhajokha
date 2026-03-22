// app/api/reports/pledges/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generatePDF } from "@/lib/generatePDF";
import { auth } from "@clerk/nextjs/server";

export async function GET() {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkUserId } });
    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    const pledges = await prisma.pledge.findMany({
      where: { customer: { userId: user.id, deletedAt: null } },
      include: { customer: { select: { name: true, mobile: true } } },
    });

    const rows = pledges.map(
      (p, i) => `${i + 1}. ${p.customer.name} | ₹${p.loanAmount} | ${p.status}`
    );

    const pdfBuffer = await generatePDF("Pledge Report", rows);
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=pledges.pdf",
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}