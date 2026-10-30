// lib/calculateLTV.ts
import { calculateHybridInterest } from "@/lib/interest";

export type RiskTier = "SAFE" | "WATCH" | "AT_RISK" | "UNDERWATER";

/**
 * Upper LTV % bound (inclusive) of each tier below UNDERWATER. The one place
 * these numbers live — getRiskTier and any UI that draws tier markers read
 * them from here.
 */
export const RISK_TIER_BOUNDARIES = {
  SAFE:    65,
  WATCH:   75,
  AT_RISK: 90,
} as const;

export function getRiskTier(ltv: number): RiskTier {
  if (ltv <= RISK_TIER_BOUNDARIES.SAFE)    return "SAFE";
  if (ltv <= RISK_TIER_BOUNDARIES.WATCH)   return "WATCH";
  if (ltv <= RISK_TIER_BOUNDARIES.AT_RISK) return "AT_RISK";
  return "UNDERWATER";
}

/**
 * Days until an open pledge's amount owed overtakes its market value.
 *
 * NOTE: simple-interest approximation; understates time-to-underwater
 * for compounding pledges by 5-15% typically. Display-only — the
 * canonical interest engine (calculateHybridInterest) is the source
 * of truth for amounts owed.
 *
 * `thresholdPct` is the LTV % that counts as underwater. It defaults to 100
 * (amount owed reaches market value), which every existing caller relies on;
 * pass RISK_TIER_BOUNDARIES.AT_RISK to project to the UNDERWATER tier instead.
 *
 * Returns null when there is no market value or no accrual to project from,
 * and 0 when the pledge is already past the threshold.
 */
export function daysToUnderwater(
  loanAmount: number,
  interestRate: number, // annual %
  amountOwed: number,
  marketValue: number | null,
  thresholdPct: number = 100
): number | null {
  if (marketValue === null) return null;
  const target = marketValue * (thresholdPct / 100);
  if (amountOwed >= target) return 0;

  const dailyRate = interestRate / 100 / 365;
  const dailyAccrual = loanAmount * dailyRate;
  if (dailyAccrual <= 0) return null;

  return Math.ceil((target - amountOwed) / dailyAccrual);
}

/**
 * Market value of pure-metal net weights at the given INR/gram prices.
 *
 * A metal with zero weight or no price contributes nothing; when neither
 * metal can be priced the result is null ("could not value"), never 0.
 * Unrounded — callers round for display. calculateLTV is built on this, so
 * every valuation in the app shares one rule.
 */
export function marketValue(
  goldWeight:  number,
  silverWeight: number,
  goldPrice:   number | null,
  silverPrice: number | null,
): number | null {
  const goldValue   = goldWeight   > 0 && goldPrice   != null ? goldWeight   * goldPrice   : null;
  const silverValue = silverWeight > 0 && silverPrice != null ? silverWeight * silverPrice : null;
  if (goldValue === null && silverValue === null) return null;

  return (goldValue ?? 0) + (silverValue ?? 0);
}

interface LTVInput {
  principal:           number;
  rate:                number;
  pledgeDate:          Date;
  currentDate:         Date;
  allowCompounding:    boolean;
  compoundingDuration: "MONTHLY" | "HALFYEARLY" | "YEARLY";
  goldWeight:          number; // netWeightOfGold
  silverWeight:        number; // netWeightOfSilver
  goldPrice:           number | null; // null if no price in DB yet
  silverPrice:         number | null;
}

interface LTVResult {
  amountOwed:   number;
  marketValue:  number | null;
  ltv:          number | null;
  riskTier:     RiskTier | null;
}

export function calculateLTV(input: LTVInput): LTVResult {
  const { receivableAmount: amountOwed } = calculateHybridInterest(
    input.principal,
    input.rate,
    input.pledgeDate,
    input.currentDate,
    input.allowCompounding,
    input.compoundingDuration
  );

  const value = marketValue(
    input.goldWeight, input.silverWeight, input.goldPrice, input.silverPrice,
  );

  if (value === null) {
    return { amountOwed, marketValue: null, ltv: null, riskTier: null };
  }

  const ltv = value > 0
    ? Math.round((amountOwed / value) * 10000) / 100
    : null;

  return {
    amountOwed,
    marketValue: Math.round(value * 100) / 100,
    ltv,
    riskTier: ltv !== null ? getRiskTier(ltv) : null,
  };
}