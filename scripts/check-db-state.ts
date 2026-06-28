// One-off diagnostic script. Run with: npx tsx scripts/check-db-state.ts
// Copy this file into your repo's scripts/ folder first.
import { prisma } from "../lib/prisma";

async function main() {
  console.log("=== 1. itemType column type on pledge_items ===");
  const itemTypeCol = await prisma.$queryRaw`
    SELECT column_name::text AS column_name,
           data_type::text AS data_type,
           udt_name::text AS udt_name
    FROM information_schema.columns
    WHERE table_name = 'pledge_items' AND column_name = 'itemType';
  `;
  console.log(itemTypeCol);

  console.log("\n=== 2. Distinct itemType values currently stored ===");
  try {
    const distinctValues = await prisma.$queryRaw`
      SELECT DISTINCT "itemType"::text AS "itemType" FROM pledge_items LIMIT 20;
    `;
    console.log(distinctValues);
  } catch (e) {
    console.log("Query failed:", e);
  }

  console.log("\n=== 3. All tables currently in the public schema ===");
  const tables = await prisma.$queryRaw`
    SELECT tablename::text AS tablename
    FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
  `;
  console.log(tables);

  console.log("\n=== 4. All custom enum types currently in the database ===");
  const enums = await prisma.$queryRaw`
    SELECT t.typname::text AS enum_name, e.enumlabel::text AS value
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
    ORDER BY enum_name, e.enumsortorder;
  `;
  console.log(enums);

  console.log("\n=== 5. _prisma_migrations table — applied migrations ===");
  const migrations = await prisma.$queryRaw`
    SELECT migration_name::text AS migration_name,
           finished_at::text AS finished_at
    FROM "_prisma_migrations"
    ORDER BY started_at ASC;
  `;
  console.log(migrations);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Script failed:", e);
  process.exit(1);
});