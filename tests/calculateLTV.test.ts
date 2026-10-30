import { describe, it, expect } from "vitest";
import {
  calculateLTV,
  marketValue,
  getRiskTier,
  daysToUnderwater,
  RISK_TIER_BOUNDARIES,
} from "@/lib/calculateLTV";

// -----------------------------------------------------------------------------
// getRiskTier — canonical per-pledge risk thresholds (CLAUDE.md Invariant 8):
//   ltv <= 65  -> SAFE
//   ltv <= 75  -> WATCH
//   ltv <= 90  -> AT_RISK
//   else       -> UNDERWATER
// -----------------------------------------------------------------------------

describe("getRiskTier — boundaries", () => {
  it("exact boundary values fall into the LOWER (inclusive) tier", () => {
    expect(getRiskTier(65)).toBe("SAFE");
    expect(getRiskTier(75)).toBe("WATCH");
    expect(getRiskTier(90)).toBe("AT_RISK");
  });

  it("just below each boundary", () => {
    expect(getRiskTier(64.99)).toBe("SAFE");
    expect(getRiskTier(74.99)).toBe("WATCH");
    expect(getRiskTier(89.99)).toBe("AT_RISK");
  });

  it("just above each boundary tips into the next tier", () => {
    expect(getRiskTier(65.01)).toBe("WATCH");
    expect(getRiskTier(75.01)).toBe("AT_RISK");
    expect(getRiskTier(90.01)).toBe("UNDERWATER");
  });

  it("mid-range representative values", () => {
    expect(getRiskTier(0)).toBe("SAFE");
    expect(getRiskTier(50)).toBe("SAFE");
    expect(getRiskTier(70)).toBe("WATCH");
    expect(getRiskTier(85)).toBe("AT_RISK");
    expect(getRiskTier(120)).toBe("UNDERWATER");
  });

  it("non-positive LTV (defensive) is treated as SAFE", () => {
    // Not normally reachable (owed & value are positive) but the fn must not throw.
    expect(getRiskTier(0)).toBe("SAFE");
    expect(getRiskTier(-5)).toBe("SAFE");
  });
});

// -----------------------------------------------------------------------------
// calculateLTV — market value = goldWeight*goldPrice + silverWeight*silverPrice,
// ltv = round(owed/marketValue * 10000)/100 (2 dp %), riskTier from getRiskTier.
// null market value/ltv/riskTier when no usable price is available.
//
// Using rate 0% so amountOwed == principal, isolating the LTV/market math.
// -----------------------------------------------------------------------------

const P = (s: string) => new Date(s);
const base = {
  rate: 0,
  pledgeDate: P("2025-01-01"),
  currentDate: P("2026-01-01"),
  allowCompounding: false,
  compoundingDuration: "YEARLY" as const,
};

describe("calculateLTV — market value & LTV", () => {
  it("gold only: LTV lands exactly on the SAFE/WATCH boundary (65)", () => {
    // market = 10*1000 = 10000; owed = 6500; ltv = 65 -> SAFE
    const r = calculateLTV({
      ...base,
      principal: 6500,
      goldWeight: 10,
      silverWeight: 0,
      goldPrice: 1000,
      silverPrice: null,
    });
    expect(r.marketValue).toBe(10000);
    expect(r.amountOwed).toBe(6500);
    expect(r.ltv).toBe(65);
    expect(r.riskTier).toBe("SAFE");
  });

  it("gold only: ltv 70 -> WATCH", () => {
    const r = calculateLTV({
      ...base,
      principal: 7000,
      goldWeight: 10,
      silverWeight: 0,
      goldPrice: 1000,
      silverPrice: null,
    });
    expect(r.ltv).toBe(70);
    expect(r.riskTier).toBe("WATCH");
  });

  it("gold + silver are summed independently into market value", () => {
    // market = 5*1000 + 10*80 = 5000 + 800 = 5800; owed = 2900; ltv = 50 -> SAFE
    const r = calculateLTV({
      ...base,
      principal: 2900,
      goldWeight: 5,
      silverWeight: 10,
      goldPrice: 1000,
      silverPrice: 80,
    });
    expect(r.marketValue).toBe(5800);
    expect(r.ltv).toBe(50);
    expect(r.riskTier).toBe("SAFE");
  });

  it("LTV is rounded to 2 decimal places", () => {
    // market = 10000, owed = 6666 -> ltv = 66.66
    const r = calculateLTV({
      ...base,
      principal: 6666,
      goldWeight: 10,
      silverWeight: 0,
      goldPrice: 1000,
      silverPrice: null,
    });
    expect(r.ltv).toBe(66.66);
  });
});

describe("calculateLTV — null price handling", () => {
  it("no price at all -> market/ltv/riskTier null, but owed still computed", () => {
    const r = calculateLTV({
      ...base,
      principal: 5000,
      goldWeight: 10,
      silverWeight: 0,
      goldPrice: null,
      silverPrice: null,
    });
    expect(r.marketValue).toBeNull();
    expect(r.ltv).toBeNull();
    expect(r.riskTier).toBeNull();
    expect(r.amountOwed).toBe(5000);
  });

  it("silver weight present but silver price missing -> valued at 0 (falls to null here)", () => {
    // Only silver held, but no silver price -> no usable value -> null result.
    const r = calculateLTV({
      ...base,
      principal: 5000,
      goldWeight: 0,
      silverWeight: 20,
      goldPrice: 1000,
      silverPrice: null,
    });
    expect(r.marketValue).toBeNull();
    expect(r.ltv).toBeNull();
    expect(r.riskTier).toBeNull();
  });

  it("gold priced, silver held but unpriced -> market counts gold only", () => {
    // market = 10*1000 + (silver unpriced -> 0) = 10000; owed = 9100 -> ltv 91 -> UNDERWATER
    const r = calculateLTV({
      ...base,
      principal: 9100,
      goldWeight: 10,
      silverWeight: 20,
      goldPrice: 1000,
      silverPrice: null,
    });
    expect(r.marketValue).toBe(10000);
    expect(r.ltv).toBe(91);
    expect(r.riskTier).toBe("UNDERWATER");
  });
});

describe("marketValue — the shared valuation rule", () => {
  it("nothing priceable -> null, never 0", () => {
    expect(marketValue(0, 0, 1000, 100)).toBeNull();     // no weight
    expect(marketValue(10, 20, null, null)).toBeNull();  // no prices
    expect(marketValue(10, 0, null, 100)).toBeNull();    // held metal unpriced
    expect(marketValue(0, 20, 1000, null)).toBeNull();
  });

  it("skips a metal with zero weight or no price, sums the rest", () => {
    expect(marketValue(10, 20, 1000, null)).toBe(10000);
    expect(marketValue(10, 20, 1000, 100)).toBe(12000);
    expect(marketValue(0, 20, 1000, 100)).toBe(2000);
  });
});

describe("RISK_TIER_BOUNDARIES — drives getRiskTier", () => {
  it("each boundary is the inclusive top of its tier", () => {
    expect(getRiskTier(RISK_TIER_BOUNDARIES.SAFE)).toBe("SAFE");
    expect(getRiskTier(RISK_TIER_BOUNDARIES.SAFE + 0.01)).toBe("WATCH");
    expect(getRiskTier(RISK_TIER_BOUNDARIES.WATCH)).toBe("WATCH");
    expect(getRiskTier(RISK_TIER_BOUNDARIES.WATCH + 0.01)).toBe("AT_RISK");
    expect(getRiskTier(RISK_TIER_BOUNDARIES.AT_RISK)).toBe("AT_RISK");
    expect(getRiskTier(RISK_TIER_BOUNDARIES.AT_RISK + 0.01)).toBe("UNDERWATER");
  });

  it("values are the canonical 65 / 75 / 90", () => {
    expect(RISK_TIER_BOUNDARIES).toEqual({ SAFE: 65, WATCH: 75, AT_RISK: 90 });
  });
});

describe("daysToUnderwater — threshold", () => {
  // Verbatim copy of the implementation before `thresholdPct` was added.
  // The default threshold must reproduce it exactly for every existing caller.
  function legacyDaysToUnderwater(
    loanAmount: number,
    interestRate: number,
    amountOwed: number,
    marketValue: number | null
  ): number | null {
    if (marketValue === null) return null;
    if (amountOwed >= marketValue) return 0;
    const dailyRate = interestRate / 100 / 365;
    const dailyAccrual = loanAmount * dailyRate;
    if (dailyAccrual <= 0) return null;
    return Math.ceil((marketValue - amountOwed) / dailyAccrual);
  }

  it("default threshold matches the legacy result across a grid of inputs", () => {
    const loans  = [0, 1, 999.99, 10000, 250000, 1234567.89];
    const rates  = [0, 0.5, 12, 18, 24, 36.75];
    const owedF  = [0, 0.5, 1, 1.0731, 1.5];
    const values = [null, 0, 1, 15000, 333333.33, 2500000];
    let checked = 0;
    for (const loan of loans)
      for (const rate of rates)
        for (const f of owedF)
          for (const mv of values) {
            const owed = loan * f;
            expect(daysToUnderwater(loan, rate, owed, mv)).toBe(
              legacyDaysToUnderwater(loan, rate, owed, mv)
            );
            checked++;
          }
    expect(checked).toBe(loans.length * rates.length * owedF.length * values.length);
  });

  it("passing 100 explicitly is the same as the default", () => {
    expect(daysToUnderwater(10000, 24, 10500, 20000, 100)).toBe(
      daysToUnderwater(10000, 24, 10500, 20000)
    );
  });

  it("threshold 90 projects to 90% of market value", () => {
    // daily accrual = 10000 × 0.24 / 365 ≈ 6.5753
    // target = 18000 → gap 7500 → ceil(1140.6…) = 1141
    expect(daysToUnderwater(10000, 24, 10500, 20000, 90)).toBe(1141);
    // vs the 100% default: gap 9500 → 1445
    expect(daysToUnderwater(10000, 24, 10500, 20000)).toBe(1445);
  });

  it("threshold 90 returns 0 once owed reaches 90% of value", () => {
    expect(daysToUnderwater(10000, 24, 9000, 10000, 90)).toBe(0);
    expect(daysToUnderwater(10000, 24, 9500, 10000, 90)).toBe(0);
    expect(daysToUnderwater(10000, 24, 8999, 10000, 90)).toBe(1);
  });

  it("null market value stays null at any threshold", () => {
    expect(daysToUnderwater(10000, 24, 10500, null, 90)).toBeNull();
  });
});
