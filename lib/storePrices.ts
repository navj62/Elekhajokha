// lib/storePrices.ts

import {prisma }from "@/lib/prisma";
import { fetchMetalPricesUsd } from "./fetchPrices";
import { getOrUpdateUsdToInr } from "./getOrUpdateUsdToInr";

const OUNCE_TO_GRAM = 31.1035;
const IMPORT_DUTY = 0.15; // 15%

// Cron runs every 2hrs — skip if last store was < 1hr 50min ago
// 10min buffer prevents double-writes from clock drift
const MIN_INTERVAL_MS = (1 * 60 + 50) * 60 * 1000;

const round2 = (n: number) => Math.round(n * 100) / 100;

export async function updatePrices() {
  /* ---- Duplicate protection — before any API calls ---------------- */
  const lastEntry = await prisma.metalPrice.findFirst({
    orderBy: { createdAt: "desc" },
  });

  if (lastEntry) {
    const msSinceLast = Date.now() - lastEntry.createdAt.getTime();
    if (msSinceLast < MIN_INTERVAL_MS) {
      console.log(
        `⏭️  Skipping — last update was ${Math.round(msSinceLast / 60000)}min ago`
      );
      return { skipped: true };
    }
  }

  /* ---- USD/INR — 1 Alpha Vantage call/day, cached in DB ----------- */
  let usdToInr: number;
  try {
    usdToInr = await getOrUpdateUsdToInr();
  } catch {
    // Alpha Vantage failed — fall back to last stored rate
    const last = await prisma.exchangeRate.findFirst({
      orderBy: { createdAt: "desc" },
    });
    if (!last) throw new Error("No USD→INR rate available — Alpha Vantage failed and DB has no fallback");

    const ageHrs = Math.round(
      (Date.now() - last.createdAt.getTime()) / 3600000
    );
    console.warn(
      `⚠️  Using stale USD→INR fallback: ${last.rate} (${ageHrs}h old)`
    );
    // ✅ Number() — Prisma Float needs explicit cast
    usdToInr = Number(last.rate);
  }

  /* ---- Metal prices — Yahoo Finance, parallel, timeout-protected -- */
  // fetchYahooPrice already has a 5s AbortController timeout internally
  // so no outer Promise.race needed here
  const { goldUsd, silverUsd } = await fetchMetalPricesUsd();

  // ✅ Guard NaN and zero — fetchYahooPrice validates too, but be explicit
  if (!goldUsd || !silverUsd || goldUsd <= 0 || silverUsd <= 0) {
    throw new Error(
      `Invalid metal prices received — gold: ${goldUsd}, silver: ${silverUsd}`
    );
  }

  /* ---- Convert to INR/gram ---------------------------------------- */
  /* ---- Convert to INR/gram ---------------------------------------- */
const goldBase   = (goldUsd   / OUNCE_TO_GRAM) * usdToInr;
const silverBase = (silverUsd / OUNCE_TO_GRAM) * usdToInr;

// Apply import duty
const goldPerGram   = round2(goldBase   * (1 + IMPORT_DUTY));
const silverPerGram = round2(silverBase * (1 + IMPORT_DUTY));

  /* ---- Store ------------------------------------------------------ */
  await prisma.metalPrice.createMany({
    data: [
      { metal: "GOLD",   usdPerOunce: goldUsd,   inrPerGram: goldPerGram   },
      { metal: "SILVER", usdPerOunce: silverUsd, inrPerGram: silverPerGram },
    ],
  });

  console.log(
    `✅ Stored — ` +
    `Gold: ₹${goldPerGram}/g ($${goldUsd.toFixed(2)}/oz)  ` +
    `Silver: ₹${silverPerGram}/g ($${silverUsd.toFixed(2)}/oz)  ` +
    `Rate: 1 USD = ₹${usdToInr}`
  );

  return { goldPerGram, silverPerGram, goldUsd, silverUsd, usdToInr };
}