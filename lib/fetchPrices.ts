// lib/fetchPrices.ts

// ─── Alpha Vantage (USD/INR only — free tier supports this) ──────────────────
const AV_BASE = "https://www.alphavantage.co/query";

// ─── Yahoo Finance (XAU/USD, XAG/USD — free, no key) ─────────────────────────
// GC=F → Gold futures  (USD/troy oz, ~$10–30 above spot — fine for LTV)
// SI=F → Silver futures (USD/troy oz)
const YF_BASE   = "https://query1.finance.yahoo.com/v8/finance/chart";
const YF_TIMEOUT_MS = 5000; // Yahoo can hang — abort after 5s

/* ------------------------------------------------------------------ */
/*  Startup guard — fail loudly if key is missing                     */
/* ------------------------------------------------------------------ */
if (!process.env.ALPHA_VANTAGE_API_KEY) {
  throw new Error(
    "Missing env var: ALPHA_VANTAGE_API_KEY — set it in .env.local"
  );
}
const AV_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
interface AlphaVantageResponse {
  Note?:          string;
  Information?:   string;
  "Error Message"?: string;
  "Realtime Currency Exchange Rate"?: {
    "5. Exchange Rate": string;
  };
}

interface YahooFinanceResponse {
  chart?: {
    result?: Array<{
      meta?: {
        regularMarketPrice?: number;
        currency?:           string;
        symbol?:             string;
      };
    }>;
    error?: { code: string; description: string } | null;
  };
}

export interface MetalPricesUsd {
  goldUsd:   number; // USD per troy oz
  silverUsd: number; // USD per troy oz
}

/* ------------------------------------------------------------------ */
/*  Alpha Vantage — parse response                                     */
/* ------------------------------------------------------------------ */
function extractAvRate(json: AlphaVantageResponse, label: string): number {
  if (json.Note) {
    throw new Error(`Alpha Vantage rate limit exceeded (${label})`);
  }
  if (json.Information) {
    throw new Error(
      `Alpha Vantage plan restriction (${label}): ${json.Information}`
    );
  }
  if (json["Error Message"]) {
    throw new Error(`Alpha Vantage error (${label}): ${json["Error Message"]}`);
  }

  const raw = json["Realtime Currency Exchange Rate"]?.["5. Exchange Rate"];
  if (!raw) throw new Error(`Missing rate field in response (${label})`);

  const rate = Number(raw);
  if (isNaN(rate) || rate <= 0) {
    throw new Error(`Invalid rate value "${raw}" for ${label}`);
  }

  return rate;
}

/* ------------------------------------------------------------------ */
/*  Alpha Vantage — USD/INR                                            */
/*  Budget: 1 call/day (cached in DB by getOrUpdateUsdToInr)          */
/* ------------------------------------------------------------------ */
export async function fetchUsdToInr(): Promise<number> {
  const url =
    `${AV_BASE}?function=CURRENCY_EXCHANGE_RATE` +
    `&from_currency=USD&to_currency=INR&apikey=${AV_API_KEY}`;

  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store" });
  } catch {
    throw new Error("Network error fetching USD/INR from Alpha Vantage");
  }

  if (!res.ok) throw new Error(`HTTP ${res.status} fetching USD/INR`);

  const json: AlphaVantageResponse = await res.json();
  return extractAvRate(json, "USD/INR");
}

/* ------------------------------------------------------------------ */
/*  Yahoo Finance — single ticker with timeout                         */
/*  Budget: unlimited (no key, no rate limit)                         */
/* ------------------------------------------------------------------ */
async function fetchYahooPrice(ticker: string): Promise<number> {
  const url = `${YF_BASE}/${encodeURIComponent(ticker)}`;

  // ✅ Abort after 5s — Yahoo can occasionally hang
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), YF_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url, {
      signal: controller.signal,
      cache:  "no-store", // always fetch fresh — never use cached response
      headers: {
        // Yahoo returns 403 without a browser-like User-Agent
        "User-Agent": "Mozilla/5.0 (compatible; PriceBot/1.0)",
      },
    });
  } catch (err: unknown) {
    const isTimeout =
      err instanceof Error && err.name === "AbortError";
    throw new Error(
      isTimeout
        ? `Timeout fetching ${ticker} from Yahoo Finance (>${YF_TIMEOUT_MS}ms)`
        : `Network error fetching ${ticker} from Yahoo Finance`
    );
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${ticker}`);

  const json: YahooFinanceResponse = await res.json();

  if (json.chart?.error) {
    throw new Error(
      `Yahoo Finance error for ${ticker}: ${json.chart.error.description}`
    );
  }

  const price = json.chart?.result?.[0]?.meta?.regularMarketPrice;
  if (typeof price !== "number" || isNaN(price) || price <= 0) {
    throw new Error(
      `Invalid or missing price for ${ticker} in Yahoo Finance response`
    );
  }

  return price; // USD per troy oz
}

/* ------------------------------------------------------------------ */
/*  Yahoo Finance — XAU + XAG in parallel                             */
/*  ✅ Promise.all — both fetches run simultaneously, halves latency  */
/* ------------------------------------------------------------------ */
export async function fetchMetalPricesUsd(): Promise<MetalPricesUsd> {
  const [goldUsd, silverUsd] = await Promise.all([
    fetchYahooPrice("GC=F"),
    fetchYahooPrice("SI=F"),
  ]);

  return { goldUsd, silverUsd };
}