// lib/getOrUpdateUsdToInr.ts

import {prisma} from "@/lib/prisma";
import { fetchUsdToInr } from "./fetchPrices";

// 23hrs — safe buffer so rate is always fresh even if cron fires slightly early
const EXCHANGE_RATE_TTL_MS = 23 * 60 * 60 * 1000;

export async function getOrUpdateUsdToInr(): Promise<number> {
  const last = await prisma.exchangeRate.findFirst({
    where:   { from: "USD", to: "INR" },
    orderBy: { createdAt: "desc" },
  });

  if (last) {
    const ageMs  = Date.now() - last.createdAt.getTime();
    const ageMin = Math.round(ageMs / 60000);

    if (ageMs < EXCHANGE_RATE_TTL_MS) {
      console.log(`♻️  Using cached USD→INR: ${last.rate} (${ageMin}min old)`);
      // ✅ Explicit Number() — Prisma Float can come back oddly typed
      return Number(last.rate);
    }
  }

  console.log("🔄 Fetching fresh USD→INR from Alpha Vantage");

  // Let network/API errors propagate — updatePrices() handles them
  const rate = await fetchUsdToInr();

  // ✅ Race condition guard — re-check with a fresh timestamp
  // (using Date.now() here, not the one captured before the fetch,
  //  because the fetch itself takes ~300–500ms)
  const latest = await prisma.exchangeRate.findFirst({
    where:   { from: "USD", to: "INR" },
    orderBy: { createdAt: "desc" },
  });

  if (latest && Date.now() - latest.createdAt.getTime() < EXCHANGE_RATE_TTL_MS) {
    console.log(
      `⚠️  Another process already updated USD→INR — using their value: ${latest.rate}`
    );
    return Number(latest.rate);
  }

  // Store the fresh rate — non-fatal if this fails (caller still gets the value)
  try {
    await prisma.exchangeRate.create({
      data: { from: "USD", to: "INR", rate },
    });
    console.log(`✅ USD→INR stored: ${rate}`);
  } catch (err: unknown) {
    // Don't rethrow — the rate is valid, just couldn't persist it this run.
    // Next run will re-fetch and try again.
    console.error(
      "⚠️  Failed to store USD→INR (will retry next run):",
      err instanceof Error ? err.message : err
    );
  }

  return rate;
}