export function calculateHybridInterest(
  principal: number,
  annualRate: number,
  startDate: Date,
  endDate: Date,
  allowCompounding = true,
  compoundingDuration: "MONTHLY" | "HALFYEARLY" | "YEARLY" = "YEARLY"
) {
  if (endDate <= startDate) {
    return {
      T: 0,
      totalInterest: 0,
      receivableAmount: principal,
    };
  }

  // Monthly rate
  const R = annualRate / 12 / 100;

  // Map duration → months per cycle
 const durationMap: Record<
  "MONTHLY" | "HALFYEARLY" | "YEARLY",
  number
> = {
  MONTHLY: 1,
  HALFYEARLY: 6,
  YEARLY: 12,
};
  const cycleMonths = durationMap[compoundingDuration];

  function diffMonths(d1: Date, d2: Date) {
    let months =
      (d2.getFullYear() - d1.getFullYear()) * 12 +
      (d2.getMonth() - d1.getMonth());

    const temp = new Date(d1);
    temp.setMonth(temp.getMonth() + months);

    if (temp > d2) months--;

    return months;
  }

  const months = diffMonths(startDate, endDate);

  const tempDate = new Date(startDate);
  tempDate.setMonth(tempDate.getMonth() + months);

  const diffDays = Math.floor(
    (endDate.getTime() - tempDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  const extra = diffDays <= 2 ? 0 : diffDays <= 15 ? 0.5 : 1;
  const T = Math.max(0.5, months + extra);

  let amount: number;

  if (allowCompounding) {
    const fullCycles = Math.floor(T / cycleMonths);
    const remainingMonths = Number((T % cycleMonths).toFixed(2));

    amount =
      principal *
      Math.pow(1 + R * cycleMonths, fullCycles) *
      (1 + R * remainingMonths);
  } else {
    amount = principal * (1 + R * T);
  }

  amount = Math.round(amount * 100) / 100;

  return {
  T,
  cycleMonths,
  totalInterest: Math.round((amount - principal) * 100) / 100,
  receivableAmount: amount,
};
}