// app/api/reports/customers/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generatePDF } from "@/lib/generatePDF";

export async function GET() {
  try {
    const customers = await prisma.customer.findMany();
    const rows = customers.map(
      (c, i) => `${i + 1}. ${c.name} | ${c.mobile} | ${c.address}`
    );
    const pdfBuffer = await generatePDF("Customer Report", rows);
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=customers.pdf",
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}