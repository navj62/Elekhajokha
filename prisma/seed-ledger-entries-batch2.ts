/**
 * Seed script: imports 16 pledge entries from the physical ledger photo
 * (S.No. 12–27; dated 2/6/26 – 4/6/26) into the E-Lekha-Jokha schema.
 *
 * NOTE: S.No. 1–10 were already seeded via the original seed.ts and exist
 * in the database — they are intentionally NOT repeated here to avoid
 * duplicate customers/pledges.
 *
 * S.No. 11 (सतीश लखननाल चौकसे — interest-only note against an existing
 * pledge, no item/collateral) was excluded — doesn't fit the Pledge model.
 * Handle it separately as a Transaction against whichever pledge it refers
 * to, if/when that pledge is identified.
 *
 * USAGE:
 *   npx tsx prisma/seed-ledger-entries-batch2.ts
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
// CONFIG
// ───────────────────────────────────────────────────────────

const OWNER_ID = 'b121d4e7-6be0-4b0a-8009-3670f09d32a3';

const GOLD_PURITY = 91.6;
const SILVER_PURITY = 92.5;

const DEFAULT_INTEREST_RATE = 24.0;
const DEFAULT_COMPOUNDING: CompoundingDuration = 'YEARLY';
const DEFAULT_ALLOW_COMPOUNDING = true;
const DEFAULT_STATUS: PledgeStatus = 'ACTIVE';

// ───────────────────────────────────────────────────────────
// LEDGER DATA — S.No. 12–27 only
// ───────────────────────────────────────────────────────────

interface LedgerEntry {
  customerName: string;
  region: string;
  pledgeDate: string;
  loanAmount: number;
  itemType: string;
  itemName: string;
  metalType: MetalType;
  weightGrams: number;
  quantity: number;
}

const LEDGER_ENTRIES: LedgerEntry[] = [
  {
    customerName: 'सुरेंद्र देवनाथ दहाड़',
    region: '7 नंबर गेट',
    pledgeDate: '2026-06-04',
    loanAmount: 4000,
    itemType: 'Bracelet',
    itemName: 'चांदी ब्रेसलेट (silver bracelet)',
    metalType: 'SILVER',
    weightGrams: 55,
    quantity: 1,
  },
  {
    customerName: 'मीना बबन कामले',
    region: '7 नंबर गेट',
    pledgeDate: '2026-06-04',
    loanAmount: 1200,
    itemType: 'Gold Beads (Mani)',
    itemName: 'सोना मणी, 26 पोत (26 gold beads)',
    metalType: 'GOLD',
    weightGrams: 1,
    quantity: 26,
  },
  {
    customerName: 'मनुबाई प्रकाश वानखेड़े',
    region: 'मनोज टॉकीज',
    pledgeDate: '2026-06-04',
    loanAmount: 9000,
    itemType: 'Silver Item (Patli)',
    itemName: 'चांदी भ.पाटली, नग 1 (item code unclear in source — kept verbatim)',
    metalType: 'SILVER',
    weightGrams: 99,
    quantity: 1,
  },
  {
    customerName: 'पार्वताबाई बाबु वाणी',
    region: 'मनोज टॉकीज',
    pledgeDate: '2026-06-04',
    loanAmount: 2000,
    itemType: 'Silver Item (Ferwa)',
    itemName: 'चांदी फेरवा जोड़ी (item code unclear in source — kept verbatim)',
    metalType: 'SILVER',
    weightGrams: 24,
    quantity: 1,
  },
  {
    customerName: 'अनिल रामदास तायडे',
    region: 'आदर्श कॉलोनी',
    pledgeDate: '2026-06-04',
    loanAmount: 1800,
    itemType: 'Anklet Pair (Payal)',
    itemName: 'चांदी पायल जोड़ी (silver anklet pair)',
    metalType: 'SILVER',
    weightGrams: 35,
    quantity: 1,
  },
  {
    customerName: 'फकीरा दामु',
    region: 'ताप्ती एनीकट',
    pledgeDate: '2026-06-03',
    loanAmount: 11000,
    itemType: 'Mangalsutra',
    itemName: 'सोना मंगलसूत्र, 2 मणी, 4 पोत में',
    metalType: 'GOLD',
    weightGrams: 1.4,
    quantity: 2,
  },
  {
    customerName: 'विवेक विजय चौहान',
    region: 'नेपानगर',
    pledgeDate: '2026-06-03',
    loanAmount: 5000,
    itemType: 'Earring (Bali)',
    itemName: 'सोना जेंट्स फैंसी बाली (men\'s fancy gold earring)',
    metalType: 'GOLD',
    weightGrams: 1.1,
    quantity: 1,
  },
  {
    customerName: 'युवराज कमलसिंह चौहान',
    region: 'अंबाडा',
    pledgeDate: '2026-06-03',
    loanAmount: 8000,
    itemType: 'Silver Item (Todiya + Kangan)',
    itemName: 'चांदी पो.टडिया जोड़ी 1, कंगनी जोड़ी 1 (combined weight, not split per item)',
    metalType: 'SILVER',
    weightGrams: 160,
    quantity: 2,
  },
  {
    customerName: 'संजु मालसिंह',
    region: 'बदनापुर',
    pledgeDate: '2026-06-03',
    loanAmount: 11000,
    itemType: 'Bangle (Kada)',
    itemName: 'चांदी बोरवाला कड़ा, RBS मार्क (silver kada, RBS hallmark)',
    metalType: 'SILVER',
    weightGrams: 185,
    quantity: 1,
  },
  {
    customerName: 'राजेश भीमा जाधव',
    region: 'अंबाडा',
    pledgeDate: '2026-06-03',
    loanAmount: 5000,
    itemType: 'Chain with Locket',
    itemName: 'चांदी लॉकेट वाली चैन, नग 2 (silver locket chain, 2 pieces)',
    metalType: 'SILVER',
    weightGrams: 53,
    quantity: 2,
  },
  {
    customerName: 'जैनाबाई संपत कोरकू',
    region: 'भातखेड़ा',
    pledgeDate: '2026-06-03',
    loanAmount: 2500,
    itemType: 'Anklet Pair (Payal)',
    itemName: 'चांदी पायल, नग 3 (silver anklets, 3 pieces)',
    metalType: 'SILVER',
    weightGrams: 70,
    quantity: 3,
  },
  {
    customerName: 'गौतम कृष्णा तायडे',
    region: 'नेपानगर',
    pledgeDate: '2026-06-03',
    loanAmount: 3000,
    itemType: 'Silver Item (Ferwa)',
    itemName: 'चांदी फेरवा जोड़ी 2 (item code unclear in source — kept verbatim)',
    metalType: 'SILVER',
    weightGrams: 35,
    quantity: 2,
  },
  {
    customerName: 'मोहित भास्कर महाजन',
    region: 'शिवाजी नगर',
    pledgeDate: '2026-06-03',
    loanAmount: 1000,
    itemType: 'Bracelet',
    itemName: 'चांदी ब्रेसलेट (silver bracelet)',
    metalType: 'SILVER',
    weightGrams: 14,
    quantity: 1,
  },
  {
    customerName: 'फूलसिंह भाया',
    region: 'लाल पड़ाव',
    pledgeDate: '2026-06-02',
    loanAmount: 3000,
    itemType: 'Bangle (Churi)',
    itemName: 'चांदी चूड़ी, नग 2 (silver bangles, 2 pieces)',
    metalType: 'SILVER',
    weightGrams: 48,
    quantity: 2,
  },
  {
    customerName: 'अर्जुन बौंदरसिंह',
    region: 'डबाली',
    pledgeDate: '2026-06-02',
    loanAmount: 3000,
    itemType: 'Chain with Locket',
    itemName: 'चांदी हल्की लाकेटवाली चैन (light silver locket chain)',
    metalType: 'SILVER',
    weightGrams: 50,
    quantity: 1,
  },
  {
    customerName: 'राधाबाई फतु',
    region: 'डबाली खुर्द',
    pledgeDate: '2026-06-02',
    loanAmount: 2000,
    itemType: 'Chain with Locket',
    itemName: 'चांदी लॉकेट वाली चैन (silver locket chain)',
    metalType: 'SILVER',
    weightGrams: 44,
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
      `No user found with id="${OWNER_ID}". Update OWNER_ID at the top of this script.`,
    );
  }

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

  const existingNames = await prisma.customer.findMany({
    where: {
      userId: owner.id,
      name: { in: LEDGER_ENTRIES.map((e) => e.customerName) },
    },
    select: { name: true },
  });

  if (existingNames.length > 0) {
    console.warn(
      `\n⚠ WARNING: ${existingNames.length} of these customer names already exist for this owner:`,
    );
    existingNames.forEach((c) => console.warn(`  - ${c.name}`));
    console.warn(
      `Running this script will create DUPLICATE customers/pledges for these names.\n` +
        `Press Ctrl+C now to abort, or wait 5 seconds to continue anyway.\n`,
    );
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  await prisma.$transaction(
    async (tx) => {
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
    },
    { timeout: 30000, maxWait: 10000 },
  );

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