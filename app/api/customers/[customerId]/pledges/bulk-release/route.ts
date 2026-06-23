import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { Prisma, CompoundingDuration } from "@prisma/client";
import { calculateHybridInterest } from "@/lib/interest";

type RouteContext = {
  params: Promise<{ customerId: string }>;
};

const VALID_COMPOUNDING = ["MONTHLY", "HALFYEARLY", "YEARLY"] as const;
const CALCULATION_VERSION = 1; // ← MUST match single-release (route.ts:14)

type InputPledge = {
  id: string;
  allowCompounding: boolean;
  compoundingDuration: CompoundingDuration;
};

function safeAllow(v: unknown): boolean {
  return typeof v === "boolean" ? v : false;
}
function safeDuration(v: unknown): CompoundingDuration {
  return VALID_COMPOUNDING.includes(v as CompoundingDuration)
    ? (v as CompoundingDuration)
    : "MONTHLY";
}

/* ------------------------------------------------------------------ */
/*  POST /api/customers/[customerId]/pledges/bulk-release             */
/*  All-or-nothing batch release. Mirrors single-release per pledge. */
/* ------------------------------------------------------------------ */
export async function POST(req: Request, context: RouteContext) {
  try {
    /* ---- Auth (mirror single-release) ---------------------------- */
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where:  { clerkUserId },
      select: { id: true },
    });
    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { customerId } = await context.params;

    /* ---- Customer ownership guard -------------------------------- */
    const customer = await prisma.customer.findFirst({
      where:  { id: customerId, userId: user.id, deletedAt: null },
      select: { id: true },
    });
    if (!customer)
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });

    const body = await req.json().catch(() => null);
    const releaseDate: unknown = body?.releaseDate;
    const rawPledges: unknown = body?.pledges;

    /* ---- BODY SHAPE ---------------------------------------------- */
    if (typeof releaseDate !== "string" || isNaN(new Date(releaseDate).getTime())) {
      return NextResponse.json(
        { error: "VALIDATION", message: "releaseDate must be a valid ISO date." },
        { status: 400 }
      );
    }
    if (
      !Array.isArray(rawPledges) ||
      rawPledges.length < 1 ||
      rawPledges.length > 50 ||
      !rawPledges.every((p) => p && typeof p.id === "string" && p.id.length > 0)
    ) {
      return NextResponse.json(
        { error: "VALIDATION", message: "pledges must be 1-50 entries with string ids." },
        { status: 400 }
      );
    }

    const inputPledges: InputPledge[] = (rawPledges as Array<Record<string, unknown>>).map((p) => ({
      id:                  p.id as string,
      allowCompounding:    safeAllow(p.allowCompounding),
      compoundingDuration: safeDuration(p.compoundingDuration),
    }));

    const ids = inputPledges.map((p) => p.id);
    const releaseDateObj = new Date(releaseDate);

    /* ================================================================
       DEFENSE-IN-DEPTH VALIDATION — same 4 steps as preflight, since
       the client could have tampered with inputs after preflight.
    ================================================================ */

    /* ---- STEP: OWNERSHIP (one query) ----------------------------- */
    const pledges = await prisma.pledge.findMany({
      where: {
        id:         { in: ids },
        customerId,
        customer:   { userId: user.id },
      },
      select: { id: true, pledgeDate: true, status: true },
    });

    if (pledges.length < ids.length) {
      return NextResponse.json(
        {
          error:     "OWNERSHIP_VIOLATION",
          message:   "One or more pledges do not belong to this customer.",
          found:     pledges.length,
          requested: ids.length,
        },
        { status: 403 }
      );
    }

    /* ---- STEP: STATUS (all ACTIVE or OVERDUE) -------------------- */
    const offendingIds = pledges.filter((p) => p.status !== "ACTIVE" && p.status !== "OVERDUE").map((p) => p.id);
    if (offendingIds.length > 0) {
      return NextResponse.json(
        {
          error:        "ALREADY_RELEASED",
          message:      "One or more selected pledges are already released.",
          offendingIds,
        },
        { status: 409 }
      );
    }

    /* ---- STEP: RELEASE DATE (strict, after every pledge) --------- */
    const latestPledgeDate = pledges.reduce(
      (max, p) => (p.pledgeDate > max ? p.pledgeDate : max),
      pledges[0].pledgeDate
    );
    if (releaseDateObj <= latestPledgeDate) {
      const suggested = new Date(latestPledgeDate);
      suggested.setDate(suggested.getDate() + 1);
      return NextResponse.json(
        {
          error:            "INVALID_RELEASE_DATE",
          message:          "Release date must be after the latest pledge date.",
          latestPledgeDate: latestPledgeDate.toISOString(),
          suggestedMinDate: suggested.toISOString(),
        },
        { status: 400 }
      );
    }

    /* ---- STEP: METAL PRICES (fetch once, pre-transaction) -------- */
    const [gp, sp] = await Promise.all([
      prisma.metalPrice.findFirst({ where: { metal: "GOLD"   }, orderBy: { createdAt: "desc" } }),
      prisma.metalPrice.findFirst({ where: { metal: "SILVER" }, orderBy: { createdAt: "desc" } }),
    ]);
    if (
      (gp ? parseFloat(gp.inrPerGram.toString()) : null) === null &&
      (sp ? parseFloat(sp.inrPerGram.toString()) : null) === null
    ) {
      return NextResponse.json(
        { error: "NO_METAL_PRICES", message: "Metal prices unavailable. Try again shortly." },
        { status: 503 }
      );
    }

    /* ================================================================
       EXECUTION — single transaction, all-or-nothing.
    ================================================================ */
    const releasedIds: string[] = [];
    let totalReceivable = 0;

    try {
      await prisma.$transaction(
        async (tx) => {
          // Re-fetch metal prices INSIDE the transaction for consistency.
          const [goldPrice, silverPrice] = await Promise.all([
            tx.metalPrice.findFirst({ where: { metal: "GOLD"   }, orderBy: { createdAt: "desc" } }),
            tx.metalPrice.findFirst({ where: { metal: "SILVER" }, orderBy: { createdAt: "desc" } }),
          ]);
          const goldPpg   = goldPrice   ? parseFloat(goldPrice.inrPerGram.toString())   : null;
          const silverPpg = silverPrice ? parseFloat(silverPrice.inrPerGram.toString()) : null;

          for (const inputPledge of inputPledges) {
            // Fetch the pledge fresh inside the transaction.
            const pledge = await tx.pledge.findFirst({
              where: {
                id:       inputPledge.id,
                customerId,
                customer: { userId: user.id },
              },
            });
            if (!pledge) throw new Error("OWNERSHIP_VIOLATION:" + inputPledge.id);
            if (pledge.status !== "ACTIVE" && pledge.status !== "OVERDUE") throw new Error("ALREADY_RELEASED:" + pledge.id);

            const calc = calculateHybridInterest(
              Number(pledge.loanAmount),
              Number(pledge.interestRate),
              new Date(pledge.pledgeDate),
              releaseDateObj,
              inputPledge.allowCompounding,
              inputPledge.compoundingDuration
            );

            const ngold   = Number(pledge.netWeightOfGold);
            const nsilver = Number(pledge.netWeightOfSilver);

            let marketValue: number | null = null;
            if (goldPpg !== null || silverPpg !== null) {
              marketValue = ((goldPpg ?? 0) * ngold) + ((silverPpg ?? 0) * nsilver);
            }
            const ltvAtRelease =
              marketValue !== null && marketValue > 0
                ? Math.round((calc.receivableAmount / marketValue) * 10000) / 100
                : null;

            // Double-release guard (MIRRORS single-release exactly).
            const result = await tx.pledge.updateMany({
              where: { id: pledge.id, status: { in: ["ACTIVE", "OVERDUE"] } },
              data: {
                status:              "RELEASED",
                releaseDate:         releaseDateObj,
                allowCompounding:    inputPledge.allowCompounding,
                compoundingDuration: inputPledge.compoundingDuration,
                durationMonths:      new Prisma.Decimal(calc.T),
                calculationVersion:  CALCULATION_VERSION,
                totalInterest:       new Prisma.Decimal(calc.totalInterest),
                receivableAmount:    new Prisma.Decimal(calc.receivableAmount),
              },
            });
            if (result.count === 0) throw new Error("ALREADY_RELEASED:" + pledge.id);

            // Audit row (MIRRORS single-release field-for-field).
            await tx.pledgeAudit.create({
              data: {
                pledgeId:            pledge.id,
                action:              "RELEASED",
                principal:           pledge.loanAmount,
                interestRate:        pledge.interestRate,
                allowCompounding:    inputPledge.allowCompounding,
                compoundingDuration: inputPledge.compoundingDuration,
                calculationVersion:  CALCULATION_VERSION,
                durationMonths:      new Prisma.Decimal(calc.T),
                totalInterest:       new Prisma.Decimal(calc.totalInterest),
                receivableAmount:    new Prisma.Decimal(calc.receivableAmount),
                netWeightOfGold:     new Prisma.Decimal(ngold),
                netWeightOfSilver:   new Prisma.Decimal(nsilver),
                goldPricePerGram:    goldPpg   !== null ? new Prisma.Decimal(goldPpg)            : null,
                silverPricePerGram:  silverPpg !== null ? new Prisma.Decimal(silverPpg)          : null,
                marketValueAtRelease: marketValue   !== null ? new Prisma.Decimal(marketValue)   : null,
                ltvAtRelease:        ltvAtRelease  !== null ? new Prisma.Decimal(ltvAtRelease)    : null,
                releaseDate:         releaseDateObj,
              },
            });

            releasedIds.push(pledge.id);
            totalReceivable += calc.receivableAmount;
          }
        },
        { timeout: 30000 }
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.startsWith("ALREADY_RELEASED:")) {
        return NextResponse.json(
          {
            error:       "ALREADY_RELEASED",
            offendingId: msg.split(":")[1],
            message:     "One or more pledges were already released. Please refresh and try again.",
          },
          { status: 409 }
        );
      }
      if (msg.startsWith("OWNERSHIP_VIOLATION:")) {
        return NextResponse.json(
          { error: "OWNERSHIP_VIOLATION", message: "Pledge does not belong to this customer." },
          { status: 403 }
        );
      }
      console.error("BULK RELEASE ERROR:", err);
      return NextResponse.json({ error: "Server Error" }, { status: 500 });
    }

    return NextResponse.json({
      success:        true,
      releasedCount:  releasedIds.length,
      releasedIds,
      totalReceivable,
    });
  } catch (err) {
    console.error("BULK RELEASE ERROR:", err);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
