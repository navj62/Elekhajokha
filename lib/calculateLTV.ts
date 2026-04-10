// lib/calculateLTV.ts
import { calculateHybridInterest } from "@/lib/interest";

export type RiskTier = "SAFE" | "WATCH" | "AT_RISK" | "UNDERWATER";

export function getRiskTier(ltv: number): RiskTier {
  if (ltv <= 65) return "SAFE";
  if (ltv <= 75) return "WATCH";
  if (ltv <= 90) return "AT_RISK";
  return "UNDERWATER";
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

  const hasGold   = input.goldWeight   > 0 && input.goldPrice   !== null;
  const hasSilver = input.silverWeight > 0 && input.silverPrice !== null;

  if (!hasGold && !hasSilver) {
    return { amountOwed, marketValue: null, ltv: null, riskTier: null };
  }

 const goldValue =
  input.goldWeight > 0 && input.goldPrice != null
    ? input.goldWeight * input.goldPrice
    : 0;

const silverValue =
  input.silverWeight > 0 && input.silverPrice != null
    ? input.silverWeight * input.silverPrice
    : 0;

const marketValue = goldValue + silverValue;

  const ltv = marketValue > 0
    ? Math.round((amountOwed / marketValue) * 10000) / 100
    : null;

  return {
    amountOwed,
    marketValue: Math.round(marketValue * 100) / 100,
    ltv,
    riskTier: ltv !== null ? getRiskTier(ltv) : null,
  };
}