export interface CustomerRiskScoreInput {
  currentLtv: number | null;
  ltvThirtyDaysAgo: number | null;
  daysToUnderwaterWorst: number | null;
  largestPledgeMarketValue: number;
  totalMarketValue: number;
  avgPledgeAgeMonths: number;
}

export interface CustomerRiskScoreOutput {
  score: number;
  tier: "SAFE" | "WATCH" | "AT_RISK" | "CRITICAL";
  breakdown: {
    ltv: number;
    velocity: number;
    timeToUnderwater: number;
    concentration: number;
    age: number;
  };
}

export function computeCustomerRiskScore(
  input: CustomerRiskScoreInput
): CustomerRiskScoreOutput {
  const {
    currentLtv,
    ltvThirtyDaysAgo,
    daysToUnderwaterWorst,
    largestPledgeMarketValue,
    totalMarketValue,
    avgPledgeAgeMonths,
  } = input;

  // 0–40 pts: LTV pressure
  const ltv =
    currentLtv === null ? 0 : Math.min(40, (currentLtv / 100) * 40);

  // -10–25 pts: interest-accrual velocity (negative = improving customer)
  let velocity = 0;
  if (currentLtv !== null && ltvThirtyDaysAgo !== null) {
    const delta = currentLtv - ltvThirtyDaysAgo;
    velocity = Math.max(-10, Math.min(25, (delta / 30) * 25));
  }

  // 0–25 pts: proximity to UNDERWATER threshold
  let timeToUnderwater = 0;
  if (daysToUnderwaterWorst !== null) {
    timeToUnderwater =
      daysToUnderwaterWorst <= 0
        ? 25
        : Math.max(0, 25 - daysToUnderwaterWorst / 30);
  }

  // 0–10 pts: single-pledge concentration risk
  const concentration =
    totalMarketValue <= 0
      ? 0
      : (largestPledgeMarketValue / totalMarketValue) * 10;

  // 0–5 pts: long-outstanding pledge age (proxy for rollover risk)
  const age = Math.min(5, (avgPledgeAgeMonths / 12) * 5);

  const rawScore = ltv + velocity + timeToUnderwater + concentration + age;
  const score = Math.round(Math.max(0, Math.min(100, rawScore)));

  const tier =
    score <= 30
      ? "SAFE"
      : score <= 50
      ? "WATCH"
      : score <= 75
      ? "AT_RISK"
      : "CRITICAL";

  return {
    score,
    tier,
    breakdown: {
      ltv: parseFloat(ltv.toFixed(2)),
      velocity: parseFloat(velocity.toFixed(2)),
      timeToUnderwater: parseFloat(timeToUnderwater.toFixed(2)),
      concentration: parseFloat(concentration.toFixed(2)),
      age: parseFloat(age.toFixed(2)),
    },
  };
}
