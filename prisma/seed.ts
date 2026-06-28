/**
 * Seed script: imports 10 pledge entries from the physical ledger photo
 * (S.No. 1–10, dated 5/6/26 and 8/6/26) into the E-Lekha-Jokha schema.
 *
 * USAGE:
 *   npx ts-node seed-ledger-entries.ts
 *   (or wire into your existing prisma/seed.ts and run `npx prisma db seed`)
 *
 * BEFORE RUNNING — check the CONFIG block below. Everything there is an
 * assumption I made because the ledger photo doesn't carry this info.
 * See the full list of assumptions in the chat response.
 */

import { PrismaClient, MetalType, PledgeStatus, CompoundingDuration } from '@prisma/client';
import 'dotenv/config';
import { PrismaNeon } from '@prisma/adapter-neon';
import ws from 'ws';
import { neonConfig } from '@neondatabase/serverless';

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

neonConfig.webSocketConstructor = ws as unknown as typeof WebSocket;

// ───────────────────────────────────────────────────────────
// CONFIG — edit these before running
// ───────────────────────────────────────────────────────────

// The internal `id` (primary key) of the shop owner these pledges belong to.
const OWNER_ID = 'b121d4e7-6be0-4b0a-8009-3670f09d32a3';

// Purity assumptions (% pure metal by weight) — the ledger gives no
// purity/karat info, so these are placeholders. Indian retail norms:
// 22K gold ≈ 91.6%, sterling silver ≈ 92.5%. Adjust if your actual
// items are 18K, 24K, or unbranded/lower-purity silver.
const GOLD_PURITY = 91.6;
const SILVER_PURITY = 92.5;

// Loan terms — per your instructions: 24% interest, yearly compounding.
const DEFAULT_INTEREST_RATE = 24.0; // percent
const DEFAULT_COMPOUNDING: CompoundingDuration = 'YEARLY';
const DEFAULT_ALLOW_COMPOUNDING = true;

// All 10 entries show no release date in the photo → treated as ACTIVE.
const DEFAULT_STATUS: PledgeStatus = 'ACTIVE';

// ───────────────────────────────────────────────────────────
// LEDGER DATA — transcribed from the photo
// ───────────────────────────────────────────────────────────

interface LedgerEntry {
  customerName: string;
  region: string; // ledger's "Address" column — see note in chat re: region vs address
  pledgeDate: string; // ISO date, parsed as DD/MM/YY
  loanAmount: number;
  itemType: string;
  itemName: string;
  metalType: MetalType;
  weightGrams: number; // assumed unit = grams throughout (see chat note)
  quantity: number;
}

const LEDGER_ENTRIES: LedgerEntry[] = [
  {
    customerName: 'रामसुरेश मेहता',
    region: 'रतागढ़',
    pledgeDate: '2026-06-08',
    loanAmount: 6000,
    itemType: 'Anklet Pair (Payal)',
    itemName: 'चांदी घुंघरू वाली पायल जोड़ी (silver ghungroo anklet pair)',
    metalType: 'SILVER',
    weightGrams: 250,
    quantity: 1,
  },
  {
    customerName: 'प्यारेलाल यशवंत बोरसे',
    region: 'एमजी नगर',
    pledgeDate: '2026-06-08',
    loanAmount: 7000,
    itemType: 'Bracelet',
    itemName: 'चांदी ब्रेसलेट, RS मार्क (silver bracelet, RS hallmark)',
    metalType: 'SILVER',
    weightGrams: 59,
    quantity: 1,
  },
  {
    customerName: 'जितेंद्र गौतम तायडे',
    region: 'एमजी नगर',
    pledgeDate: '2026-06-08',
    loanAmount: 1500,
    itemType: 'Gold Item (Boxed)',
    // "भ.वाली" is an abbreviation I couldn't confidently expand — kept verbatim.
    itemName: 'सोना भ.वाली, डब्बी में (item code unclear in source — kept verbatim, boxed)',
    metalType: 'GOLD',
    weightGrams: 1,
    quantity: 1,
  },
  {
    customerName: 'प्रहलाद बिसन ससाने',
    region: 'अंबाडा',
    pledgeDate: '2026-06-08',
    loanAmount: 6000,
    itemType: 'Mangalsutra',
    itemName: 'सोना मंगलसूत्र, 1 मणी, नकली माला में (1 gold bead, artificial/fake chain)',
    metalType: 'GOLD',
    weightGrams: 0.7,
    quantity: 1,
  },
  {
    customerName: 'शुभम अनिल थाटे',
    region: 'नेहरु नगर',
    pledgeDate: '2026-06-08',
    loanAmount: 7000,
    itemType: 'Dorla (Mangalsutra-style necklace)',
    itemName: 'सोना डोरला, 1 मणी, 8 माला में',
    metalType: 'GOLD',
    weightGrams: 2,
    quantity: 1,
  },
  {
    customerName: 'प्रदीप शालिग्राम सेलू',
    region: 'नेपानगर',
    pledgeDate: '2026-06-08',
    loanAmount: 10000,
    itemType: 'Mangalsutra',
    itemName: 'सोना मंगलसूत्र, 2 मणी, 40 पोत में',
    metalType: 'GOLD',
    weightGrams: 4,
    quantity: 2,
  },
  {
    customerName: 'अमर दत्तू कोंगे',
    region: 'शास्त्री नगर',
    pledgeDate: '2026-06-05',
    loanAmount: 5000,
    itemType: 'Bracelet',
    itemName: 'चांदी ब्रेसलेट, CB मार्क (silver bracelet, CB hallmark)',
    metalType: 'SILVER',
    weightGrams: 90,
    quantity: 1,
  },
  {
    customerName: 'शेख फरीद शेख इकबाल',
    region: 'सात नंबर गेट',
    pledgeDate: '2026-06-05',
    loanAmount: 9000,
    itemType: 'Gold Beads (Mani)',
    itemName: 'सोना मणी, 10 पुड़ी में, डब्बी में',
    metalType: 'GOLD',
    weightGrams: 0.9,
    quantity: 10,
  },
  {
    customerName: 'मीराबाई रमेश पाटील',
    region: '90 प्लाट',
    pledgeDate: '2026-06-05',
    loanAmount: 6000,
    itemType: 'Gold Item (Boxed Pair)',
    itemName: 'सोना भ.वाली जोड़ी, डब्बी में (item code unclear in source — kept verbatim, boxed pair)',
    metalType: 'GOLD',
    weightGrams: 0.9,
    quantity: 1,
  },
  {
    customerName: 'सुनंदा बाई सुरेश इंगले',
    region: 'नेपानगर',
    pledgeDate: '2026-06-05',
    loanAmount: 1000,
    itemType: 'Chain with Locket',
    itemName: 'चांदी लॉकेट वाली चैन',
    metalType: 'SILVER',
    weightGrams: 25,
    quantity: 1,
  },
];

// ───────────────────────────────────────────────────────────
// SEED LOGIC
// ───────────────────────────────────────────────────────────

function purityFor(metalType: MetalType): number {
  return metalType === 'GOLD' ? GOLD_PURITY : SILVER_PURITY;
}

async function main() {
  const owner = await prisma.user.findUnique({
    where: { id: OWNER_ID },
  });

  if (!owner) {
    throw new Error(
      `No user found with id="${OWNER_ID}". ` +
        `Update OWNER_ID at the top of this script.`,
    );
  }

  // Ensure a PledgeItemType row exists for every distinct item type used
  // below, so they show up in your item-type dropdown going forward.
  const uniqueItemTypes = Array.from(
    new Set(LEDGER_ENTRIES.map((e) => e.itemType)),
  );

  for (const label of uniqueItemTypes) {
    const existing = await prisma.pledgeItemType.findFirst({
      where: { label, userId: owner.id },
    });
    if (!existing) {
      await prisma.pledgeItemType.create({
        data: { label, userId: owner.id, isDefault: false },
      });
      console.log(`Created item type: ${label}`);
    }
  }

  await prisma.$transaction(async (tx) => {
    for (const entry of LEDGER_ENTRIES) {
      const purity = purityFor(entry.metalType);
      const netWeightOfMetal = Number(
        (entry.weightGrams * (purity / 100)).toFixed(3),
      );

      const customer = await tx.customer.create({
        data: {
          userId: owner.id,
          name: entry.customerName,
          region: entry.region,
          // Ledger only gave one locality field; duplicated into `address`
          // since the schema requires both. Replace with a real street
          // address if/when you collect one.
          address: entry.region,
        },
      });

      const pledge = await tx.pledge.create({
        data: {
          customerId: customer.id,
          pledgeDate: new Date(entry.pledgeDate),
          loanAmount: entry.loanAmount,
          interestRate: DEFAULT_INTEREST_RATE,
          compoundingDuration: DEFAULT_COMPOUNDING,
          allowCompounding: DEFAULT_ALLOW_COMPOUNDING,
          status: DEFAULT_STATUS,
          netWeightOfGold: entry.metalType === 'GOLD' ? netWeightOfMetal : 0,
          netWeightOfSilver: entry.metalType === 'SILVER' ? netWeightOfMetal : 0,
        },
      });

      await tx.pledgeItem.create({
        data: {
          pledgeId: pledge.id,
          itemType: entry.itemType,
          metalType: entry.metalType,
          itemName: entry.itemName,
          quantity: entry.quantity,
          grossWeight: entry.weightGrams,
          netWeight: entry.weightGrams,
          purity,
          netWeightOfMetal,
        },
      });

      console.log(`Seeded pledge for ${entry.customerName} (₹${entry.loanAmount})`);
    }
  });

  console.log(`\nDone — ${LEDGER_ENTRIES.length} pledges seeded for user ${owner.username}.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });