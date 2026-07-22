/**
 * Default item-type seeder.
 *
 * Idempotently ensures the 10 SYSTEM-DEFAULT PledgeItemType rows exist
 * (isDefault: true, userId: null). These are shared across every shop owner
 * and populate the "Standard" group in the pledge-create and inventory
 * item-type dropdowns. Without them a fresh production database returns
 * { defaults: [], custom: [] } from GET /api/item-types and pledge creation
 * rejects every standard label — core flow broken.
 *
 * This is what `npx prisma db seed` runs (see package.json / prisma.config.ts).
 * It contains NO customer data, NO hardcoded user IDs, NO PII, and is safe to
 * run repeatedly — it check-then-creates keyed on the label, so re-running
 * never duplicates rows.
 *
 * The ledger-import scripts (prisma/seed.ts, prisma/seed-ledger-entries-batch2.ts)
 * are separate and must be run manually via `tsx` when needed — they are NOT
 * wired to `prisma db seed`.
 *
 * USAGE:
 *   npx prisma db seed
 *   # or directly:
 *   npx tsx prisma/seed-defaults.ts
 */

import "dotenv/config";
import ws from "ws";
import { neonConfig } from "@neondatabase/serverless";
import { prisma } from "../lib/prisma";

// Neon's serverless driver needs a WebSocket constructor when run outside the
// app runtime (a plain Node/tsx process). Set before the first query executes.
neonConfig.webSocketConstructor = ws as unknown as typeof WebSocket;

// The canonical 10 system defaults — keep in sync with CLAUDE.md / seed docs.
const DEFAULT_ITEM_TYPES = [
  "Ring",
  "Necklace",
  "Bangles",
  "Chain",
  "Earrings",
  "Bracelet",
  "Anklet",
  "Pendant",
  "Bangle Set",
  "Other",
] as const;

async function main() {
  let created = 0;
  let skipped = 0;

  for (const label of DEFAULT_ITEM_TYPES) {
    // Key on the system-default identity: label + isDefault + no owner.
    const existing = await prisma.pledgeItemType.findFirst({
      where: { label, isDefault: true, userId: null },
      select: { id: true },
    });

    if (existing) {
      skipped++;
      console.log(`⏭  skipped (exists): ${label}`);
      continue;
    }

    await prisma.pledgeItemType.create({
      data: { label, isDefault: true, userId: null },
    });
    created++;
    console.log(`✅ created: ${label}`);
  }

  console.log(
    `\nDefault item types — created ${created}, skipped ${skipped} ` +
      `(${DEFAULT_ITEM_TYPES.length} total).`,
  );

  if (created === 0) {
    console.log("Already seeded — nothing to do.");
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error("seed-defaults failed:", err);
    await prisma.$disconnect();
    process.exit(1);
  });
