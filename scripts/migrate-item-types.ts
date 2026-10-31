/**
 * One-time script: convert uppercase enum strings stored in pledge_items.itemType
 * to human-readable title-case labels after the ItemType enum was dropped.
 *
 * Run against DEV (default — .env):
 *   npx tsx -r dotenv/config scripts/migrate-item-types.ts
 * Run against PRODUCTION (deliberate — see CLAUDE.md "Running against production deliberately"):
 *   ALLOW_PROD_DB=1 npx tsx --env-file=.env --env-file=.env.prod.local scripts/migrate-item-types.ts
 */

import { prisma } from "../lib/prisma";
import { assertDbTarget } from "../lib/dbGuard";

assertDbTarget(process.env.DATABASE_URL, "scripts/migrate-item-types");

async function main() {
  const result = await prisma.$executeRaw`
    UPDATE "pledge_items" SET "itemType" = CASE "itemType"
      WHEN 'RING'      THEN 'Ring'
      WHEN 'NECKLACE'  THEN 'Necklace'
      WHEN 'BANGLE'    THEN 'Bangles'
      WHEN 'CHAIN'     THEN 'Chain'
      WHEN 'EARRING'   THEN 'Earrings'
      WHEN 'BRACELET'  THEN 'Bracelet'
      WHEN 'ANKLET'    THEN 'Anklet'
      WHEN 'PENDANT'   THEN 'Pendant'
      WHEN 'COIN'      THEN 'Coin'
      WHEN 'BAR'       THEN 'Bar'
      WHEN 'OTHER'     THEN 'Other'
      ELSE "itemType"
    END
  `;

  console.log(`Updated ${result} row(s).`);

  const distinct = await prisma.$queryRaw<{ itemType: string }[]>`
    SELECT DISTINCT "itemType" FROM "pledge_items" ORDER BY "itemType"
  `;
  console.log("Distinct itemType values after migration:", distinct.map(r => r.itemType));
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
