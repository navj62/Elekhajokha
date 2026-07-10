import { describe, it, expect } from "vitest";
import { computeCustomerRiskScore, type CustomerRiskScoreInput } from "@/lib/customerRiskScore";

// -----------------------------------------------------------------------------
// computeCustomerRiskScore — composite 0..100 per-customer score (CLAUDE.md):
//   ltv              0..40   : currentLtv===null ? 0 : min(40, currentLtv/100*40)
//   velocity        -10..25  : (delta/30)*25 clamped, 0 if either LTV null
//   timeToUnderwater 0..25   : <=0 ? 25 : max(0, 25 - days/30)
//   concentration    0..10   : total<=0 ? 0 : largest/total*10
//   age              0..5    : min(5, avgMonths/12*5)
//   score = round(clamp(sum, 0, 100))
//   tier: <=30 SAFE, <=50 WATCH, <=75 AT_RISK, else CRITICAL
// -----------------------------------------------------------------------------

const benign: CustomerRiskScoreInput = {
  currentLtv: null,
  ltvThirtyDaysAgo: null,
  daysToUnderwaterWorst: null,
  largestPledgeMarketValue: 0,
  totalMarketValue: 0,
  avgPledgeAgeMonths: 0,
};

describe("computeCustomerRiskScore — components", () => {
  it("all-null / empty inputs score 0 and are SAFE", () => {
    const r = computeCustomerRiskScore(benign);
    expect(r.score).toBe(0);
    expect(r.tier).toBe("SAFE");
    expect(r.breakdown).toMatchObject({
      ltv: 0,
      velocity: 0,
      timeToUnderwater: 0,
      concentration: 0,
      age: 0,
    });
  });

  it("saturates every component and clamps score to 100 (CRITICAL)", () => {
    // ltv=40, velocity=25, ttu=25, concentration=10, age=5 => raw 105 -> 100
    const r = computeCustomerRiskScore({
      currentLtv: 100,
      ltvThirtyDaysAgo: 0,
      daysToUnderwaterWorst: 0,
      largestPledgeMarketValue: 1000,
      totalMarketValue: 1000,
      avgPledgeAgeMonths: 12,
    });
    expect(r.score).toBe(100);
    expect(r.tier).toBe("CRITICAL");
    expect(r.breakdown.ltv).toBeCloseTo(40, 2);
    expect(r.breakdown.velocity).toBeCloseTo(25, 2);
    expect(r.breakdown.timeToUnderwater).toBeCloseTo(25, 2);
    expect(r.breakdown.concentration).toBeCloseTo(10, 2);
    expect(r.breakdown.age).toBeCloseTo(5, 2);
  });

  it("ltv component caps at 40 even when currentLtv > 100", () => {
    const r = computeCustomerRiskScore({ ...benign, currentLtv: 200 });
    expect(r.breakdown.ltv).toBeCloseTo(40, 2);
    expect(r.score).toBe(40); // only ltv contributes
    expect(r.tier).toBe("WATCH");
  });

  it("velocity floors at -10 for a rapidly improving customer", () => {
    // currentLtv 50 -> ltv 20; delta = 50-80 = -30 -> velocity -25 -> floored -10
    const r = computeCustomerRiskScore({ ...benign, currentLtv: 50, ltvThirtyDaysAgo: 80 });
    expect(r.breakdown.velocity).toBeCloseTo(-10, 2);
    expect(r.score).toBe(10); // 20 + (-10)
    expect(r.tier).toBe("SAFE");
  });

  it("negative raw total clamps up to 0", () => {
    // currentLtv 0 -> ltv 0; delta -30 -> velocity -10; sum -10 -> clamp 0
    const r = computeCustomerRiskScore({ ...benign, currentLtv: 0, ltvThirtyDaysAgo: 30 });
    expect(r.score).toBe(0);
    expect(r.tier).toBe("SAFE");
  });

  it("timeToUnderwater decays linearly and never goes negative", () => {
    // days=150 -> 25 - 150/30 = 20
    expect(
      computeCustomerRiskScore({ ...benign, daysToUnderwaterWorst: 150 }).breakdown.timeToUnderwater,
    ).toBeCloseTo(20, 2);
    // days far out -> clamped to 0, not negative
    expect(
      computeCustomerRiskScore({ ...benign, daysToUnderwaterWorst: 900 }).breakdown.timeToUnderwater,
    ).toBe(0);
    // already underwater -> full 25
    expect(
      computeCustomerRiskScore({ ...benign, daysToUnderwaterWorst: 0 }).breakdown.timeToUnderwater,
    ).toBeCloseTo(25, 2);
  });

  it("concentration is 0 when totalMarketValue <= 0 (no divide-by-zero)", () => {
    const r = computeCustomerRiskScore({
      ...benign,
      largestPledgeMarketValue: 500,
      totalMarketValue: 0,
    });
    expect(r.breakdown.concentration).toBe(0);
    expect(Number.isFinite(r.score)).toBe(true);
  });

  it("concentration scales with the largest/total ratio", () => {
    // 500/1000 * 10 = 5
    const r = computeCustomerRiskScore({
      ...benign,
      largestPledgeMarketValue: 500,
      totalMarketValue: 1000,
    });
    expect(r.breakdown.concentration).toBeCloseTo(5, 2);
  });

  it("age component caps at 5", () => {
    const r = computeCustomerRiskScore({ ...benign, avgPledgeAgeMonths: 36 });
    expect(r.breakdown.age).toBeCloseTo(5, 2);
  });
});

describe("computeCustomerRiskScore — tier thresholds", () => {
  it("score exactly 30 is still SAFE (inclusive lower boundary)", () => {
    // ttu(days=150)=20 + concentration(500/1000)=5 + age(36mo)=5 = 30
    const r = computeCustomerRiskScore({
      currentLtv: null,
      ltvThirtyDaysAgo: null,
      daysToUnderwaterWorst: 150,
      largestPledgeMarketValue: 500,
      totalMarketValue: 1000,
      avgPledgeAgeMonths: 36,
    });
    expect(r.score).toBe(30);
    expect(r.tier).toBe("SAFE");
  });

  it("ltv-only 40 lands in WATCH", () => {
    const r = computeCustomerRiskScore({ ...benign, currentLtv: 100 });
    expect(r.score).toBe(40);
    expect(r.tier).toBe("WATCH");
  });

  it("ltv 40 + ttu 25 = 65 lands in AT_RISK", () => {
    const r = computeCustomerRiskScore({ ...benign, currentLtv: 100, daysToUnderwaterWorst: 0 });
    expect(r.score).toBe(65);
    expect(r.tier).toBe("AT_RISK");
  });
});
