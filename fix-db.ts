import { Client } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined");
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  await client.connect();

  try {
    console.log("Checking if ItemType enum exists...");
    const res = await client.query(`SELECT 1 FROM pg_type WHERE typname = 'ItemType'`);
    
    if (res.rows.length === 0) {
      console.log("Creating ItemType enum...");
      await client.query(`CREATE TYPE "public"."ItemType" AS ENUM ('NECKLACE', 'CHAIN', 'RING', 'BANGLE', 'BRACELET', 'EARRING', 'ANKLET', 'PENDANT', 'COIN', 'BAR', 'OTHER');`);
    } else {
      console.log("ItemType enum already exists.");
    }

    console.log("Altering pledge_items.itemType column...");
    await client.query(`ALTER TABLE "pledge_items" ALTER COLUMN "itemType" TYPE "public"."ItemType" USING "itemType"::text::"public"."ItemType";`);
    
    console.log("Successfully updated database schema without data loss.");
  } catch (error) {
    console.error("Error applying manual schema fix:", error);
  } finally {
    await client.end();
  }
}

main();
