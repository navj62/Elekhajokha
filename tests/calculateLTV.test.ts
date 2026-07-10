import { describe, it, expect } from "vitest";
import { calculateLTV, getRiskTier } from "@/lib/calculateLTV";

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
