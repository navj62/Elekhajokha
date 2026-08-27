// scripts/backfill-released-audits.ts
//
// One-time backfill of missing PledgeAudit rows for historical RELEASED
// pledges that the ledger migration seeded WITHOUT audit rows.
//
// WHY: the financial-summary route and the monthly-performance charts read
// released money ONLY from PledgeAudit where action='RELEASED'. The migration
// seed wrote the money onto Pledge.totalInterest / Pledge.receivableAmount and
// never created audit rows, so those two surfaces show nothing. This script
// writes the audit rows the read paths expect. It does NOT change any read path.
//
// SCOPE: writes to PledgeAudit ONLY. Pledge rows are read-only here.
//
// createdAt is set to Pledge.releaseDate on purpose — monthly-performance
// buckets on PledgeAudit.createdAt, so the now() default would dump every
// backfilled release (2019→2026) into the current month.
//
// IDEMPOTENT: the `pledgeAudits: { none: {} }` anti-join means a second run
// selects zero pledges and writes nothing. Safe to re-run after an interruption.
//
// Run (dry-run first — does everything EXCEPT write):
//   DATABASE_URL="<url>" npx tsx scripts/backfill-released-audits.ts --dry-run
//   DATABASE_URL="<url>" npx tsx scripts/backfill-released-audits.ts
//
// Or with a local env file:
//   DOTENV_CONFIG_PATH=.env npx tsx -r dotenv/config scripts/backfill-released-audits.ts --dry-run

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { CALCULATION_VERSION } from "@/lib/pledgeConstants";

const DRY_RUN = process.argv.includes("--dry-run");

// Owner whose ledger was migrated. Tenant scoping is enforced through the
// customer relation (Invariant 1) — never by trusting a pledge id directly.
const OWNER_ID = "b931d19d-2967-4eba-8938-23001518c58f";

const CHUNK_SIZE = 500;
const SAMPLE_COUNT = 5;

const dec = (d: Prisma.Decimal | null) => (d === null ? null : new Prisma.Decimal(d));

async function main() {
  console.log(
    `\n=== Backfill RELEASED PledgeAudit rows ===\n` +
      `Mode:  ${DRY_RUN ? "DRY RUN (writes nothing)" : "LIVE WRITE"}\n` +
      `Owner: ${OWNER_ID}\n`
  );

  // Anti-join: RELEASED pledges for this owner that have NO audit row at all.
  // Tenant-scoped through `customer: { userId }`, per Invariant 1.
  const pledges = await prisma.pledge.findMany({
    where: {
      status: "RELEASED",
      customer: { userId: OWNER_ID },
      pledgeAudits: { none: {} },
    },
    orderBy: { releaseDate: "asc" },
    select: {
      id: true,
      loanAmount: true,
      interestRate: true,
      allowCompounding: true,
      compoundingDuration: true,
      totalInterest: true,
      receivableAmount: true,
      netWeightOfGold: true,
      netWeightOfSilver: true,
      releaseDate: true,
    },
  });

  console.log(`Found ${pledges.length} RELEASED pledge(s) with no audit row.`);

  // Guard: a RELEASED pledge with no releaseDate has no date to stamp onto
  // createdAt. Skip it rather than inventing a fallback (recon measured 0).
  const skipped = pledges.filter((p) => p.releaseDate === null);
  const eligible = pledges.filter(
    (p): p is typeof p & { releaseDate: Date } => p.releaseDate !== null
  );

  for (const p of skipped) {
    console.warn(`  SKIP ${p.id} — status=RELEASED but releaseDate IS NULL`);
  }

  console.log(
    `Eligible to create: ${eligible.length}` +
      (skipped.length > 0 ? `  |  skipped (null releaseDate): ${skipped.length}` : "")
  );

  if (eligible.length === 0) {
    console.log(
      `\nNothing to do.${skipped.length > 0 ? ` ${skipped.length} pledge(s) skipped — see above.` : ""}\n`
    );
    return;
  }

  // Field-for-field mirror of the live single-release audit write
  // (route.ts:123-143). Money/weights stay in Prisma.Decimal end to end —
  // never Number() (Invariant 2). The four price/valuation snapshot fields are
  // null: the migration carries no historical metal prices, and the live path
  // null-guards these same fields when no price is available (route.ts:137-140).
  const rows = eligible.map((p) => ({
    pledgeId: p.id,
    action: "RELEASED" as const,
    principal: new Prisma.Decimal(p.loanAmount),
    interestRate: new Prisma.Decimal(p.interestRate),
    allowCompounding: p.allowCompounding,
    compoundingDuration: p.compoundingDuration,
    calculationVersion: CALCULATION_VERSION,
    durationMonths: null,
    totalInterest: dec(p.totalInterest),
    receivableAmount: dec(p.receivableAmount),
    netWeightOfGold: new Prisma.Decimal(p.netWeightOfGold),
    netWeightOfSilver: new Prisma.Decimal(p.netWeightOfSilver),
    goldPricePerGram: null,
    silverPricePerGram: null,
    marketValueAtRelease: null,
    ltvAtRelease: null,
    releaseDate: p.releaseDate,
    createdAt: p.releaseDate, // ← bucketing key for monthly-performance
  }));

  if (DRY_RUN) {
    console.log(`\n--- Would create ${rows.length} PledgeAudit row(s) ---`);
    console.log(`--- First ${Math.min(SAMPLE_COUNT, rows.length)} resolved sample(s) ---\n`);

    for (const r of rows.slice(0, SAMPLE_COUNT)) {
      console.log(
        [
          `pledgeId            ${r.pledgeId}`,
          `action              ${r.action}`,
          `principal           ${r.principal.toString()}`,
          `interestRate        ${r.interestRate.toString()}`,
          `allowCompounding    ${r.allowCompounding}`,
          `compoundingDuration ${r.compoundingDuration}`,
          `calculationVersion  ${r.calculationVersion}`,
          `durationMonths      ${r.durationMonths}`,
          `totalInterest       ${r.totalInterest?.toString() ?? "null"}`,
          `receivableAmount    ${r.receivableAmount?.toString() ?? "null"}`,
          `netWeightOfGold     ${r.netWeightOfGold.toString()}`,
          `netWeightOfSilver   ${r.netWeightOfSilver.toString()}`,
          `goldPricePerGram    ${r.goldPricePerGram}`,
          `silverPricePerGram  ${r.silverPricePerGram}`,
          `marketValueAtRelease ${r.marketValueAtRelease}`,
          `ltvAtRelease        ${r.ltvAtRelease}`,
          `releaseDate         ${r.releaseDate.toISOString()}`,
          `createdAt           ${r.createdAt.toISOString()}   (= releaseDate)`,
        ]
          .map((l) => "  " + l)
          .join("\n") + "\n"
      );
    }

    const sumInterest = rows.reduce(
      (s, r) => s.add(r.totalInterest ?? 0),
      new Prisma.Decimal(0)
    );
    const sumReceivable = rows.reduce(
      (s, r) => s.add(r.receivableAmount ?? 0),
      new Prisma.Decimal(0)
    );

    console.log(`--- Totals that would land in the audit table ---`);
    console.log(`  rows              ${rows.length}`);
    console.log(`  sum totalInterest    ₹${sumInterest.toFixed(2)}`);
    console.log(`  sum receivableAmount ₹${sumReceivable.toFixed(2)}`);
    console.log(
      `  createdAt range      ${rows[0].createdAt.toISOString()} → ${rows[rows.length - 1].createdAt.toISOString()}`
    );
    console.log(`\nDRY RUN — nothing was written.\n`);
    return;
  }

  // Chunked writes, no run-wide transaction: each createMany is atomic on its
  // own, and the anti-join makes an interrupted run resumable (a re-run picks
  // up only what is still missing). Mirrors the evaluate-risk cron's pattern.
  let created = 0;
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    const res = await prisma.pledgeAudit.createMany({ data: chunk });
    created += res.count;
    console.log(`  created ${created}/${rows.length}`);
  }

  console.log(`\n=== Summary ===`);
  console.log(`Audit rows created: ${created}`);
  console.log(`Skipped (null releaseDate): ${skipped.length}`);
  console.log(`Re-run this script to verify idempotency — it should find 0.\n`);
}

main()
  .catch((err) => {
    console.error("BACKFILL FAILED:", err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
