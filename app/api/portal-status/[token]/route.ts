import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ token: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
  try {
    const { token } = await context.params;

    const customer = await prisma.customer.findUnique({
      where: { viewToken: token },
      select: { isPortalBlocked: true },
    });

    if (!customer || customer.isPortalBlocked) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("PORTAL STATUS ERROR:", err);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}