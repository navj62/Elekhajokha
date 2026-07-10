import { describe, it, expect } from "vitest";
import { calculateHybridInterest } from "@/lib/interest";

// -----------------------------------------------------------------------------
// calculateHybridInterest — single source of truth for "amount owed".
//
// Business rules (from CLAUDE.md + lib/interest.ts):
//   - Monthly rate R = annualRate / 12 / 100.
//   - Whole calendar months T_months, plus a leftover-day bucket:
//       diffDays <= 2  -> +0
//       diffDays <= 15 -> +0.5
//       else           -> +1
//     with a hard floor of T = max(0.5, ...).
//   - Simple:      amount = P * (1 + R*T)
//   - Compounding: amount = P * (1 + R*cycle)^fullCycles * (1 + R*remainingMonths)
//   - amount rounded to 2 dp; totalInterest = round(amount - P).
//
// Every expected value below is derived from these formulas BY HAND, not
// snapshotted from the current output.
// -----------------------------------------------------------------------------

const D = (s: string) => new Date(s);

describe("calculateHybridInterest — simple interest", () => {
  it("12 months @ 12% simple = 12% of principal", () => {
    // R = 0.01/mo, T = 12, amount = 10000 * (1 + 0.01*12) = 11200
    const r = calculateHybridInterest(10000, 12, D("2025-01-01"), D("2026-01-01"), false);
    expect(r.T).toBe(12);
    expect(r.receivableAmount).toBe(11200);
    expect(r.totalInterest).toBe(1200);
  });

  it("10-year (very long) duration @ 12% simple", () => {
    // T = 120, amount = 10000 * (1 + 0.01*120) = 22000
    const r = calculateHybridInterest(10000, 12, D("2015-01-01"), D("2025-01-01"), false);
    expect(r.T).toBe(120);
    expect(r.receivableAmount).toBe(22000);
    expect(r.totalInterest).toBe(12000);
  });

  it("rate 0% returns principal unchanged", () => {
    const r = calculateHybridInterest(6500, 0, D("2025-01-01"), D("2026-01-01"), false);
    expect(r.receivableAmount).toBe(6500);
    expect(r.totalInterest).toBe(0);
  });
});

describe("calculateHybridInterest — compounding", () => {
  it("YEARLY: exactly one full cycle equals simple interest for that cycle", () => {
    // T = 12, cycle = 12 -> fullCycles=1, remaining=0
    // amount = 10000 * (1.12)^1 * 1 = 11200
    const r = calculateHybridInterest(10000, 12, D("2025-01-01"), D("2026-01-01"), true, "YEARLY");
    expect(r.receivableAmount).toBe(11200);
  });

  it("YEARLY: 18 months = 1 full cycle + 6-month simple leftover", () => {
    // T = 18, fullCycles=1, remaining=6
    // amount = 10000 * 1.12 * (1 + 0.01*6) = 10000 * 1.12 * 1.06 = 11872
    const r = calculateHybridInterest(10000, 12, D("2025-01-01"), D("2026-07-01"), true, "YEARLY");
    expect(r.T).toBe(18);
    expect(r.receivableAmount).toBe(11872);
    expect(r.totalInterest).toBe(1872);
  });

  it("compounding yields strictly more than simple over the same 18 months", () => {
    const c = calculateHybridInterest(10000, 12, D("2025-01-01"), D("2026-07-01"), true, "YEARLY");
    const s = calculateHybridInterest(10000, 12, D("2025-01-01"), D("2026-07-01"), false);
    // simple over T=18: 10000 * (1 + 0.01*18) = 11800
    expect(s.receivableAmount).toBe(11800);
    expect(c.receivableAmount).toBeGreaterThan(s.receivableAmount);
  });

  it("MONTHLY: 12 monthly cycles = P * (1.01)^12", () => {
    // A = 10000 * 1.01^12 = 11268.2503... -> 11268.25 at 2 dp
    const r = calculateHybridInterest(10000, 12, D("2025-01-01"), D("2026-01-01"), true, "MONTHLY");
    expect(r.receivableAmount).toBeCloseTo(11268.25, 2);
  });

  it("YEARLY: 10 full years = P * (1.12)^10", () => {
    // A = 10000 * 1.12^10 = 31058.482... -> 31058.48 at 2 dp
    const r = calculateHybridInterest(10000, 12, D("2015-01-01"), D("2025-01-01"), true, "YEARLY");
    expect(r.receivableAmount).toBeCloseTo(31058.48, 1);
  });
});

describe("calculateHybridInterest — duration buckets & floor", () => {
  it("endDate <= startDate returns principal, T=0", () => {
    const r = calculateHybridInterest(10000, 12, D("2025-06-01"), D("2025-06-01"), false);
    expect(r.T).toBe(0);
    expect(r.receivableAmount).toBe(10000);
    expect(r.totalInterest).toBe(0);
  });

  it("very short duration (1 day) hits the T = 0.5 floor", () => {
    // months=0, diffDays=1 (<=2 -> +0), T = max(0.5, 0) = 0.5
    // amount = 10000 * (1 + 0.01*0.5) = 10050
    const r = calculateHybridInterest(10000, 12, D("2025-01-01"), D("2025-01-02"), false);
    expect(r.T).toBe(0.5);
    expect(r.receivableAmount).toBe(10050);
  });

  it("<=2 leftover days after a whole month adds +0", () => {
    // months=1, diffDays=2 -> +0, T=1, amount = 10000 * 1.01 = 10100
    const r = calculateHybridInterest(10000, 12, D("2025-01-01"), D("2025-02-03"), false);
    expect(r.T).toBe(1);
    expect(r.receivableAmount).toBe(10100);
  });

  it("3 leftover days crosses into the +0.5 bucket", () => {
    // months=1, diffDays=3 -> +0.5, T=1.5, amount = 10000 * 1.015 = 10150
    const r = calculateHybridInterest(10000, 12, D("2025-01-01"), D("2025-02-04"), false);
    expect(r.T).toBe(1.5);
    expect(r.receivableAmount).toBe(10150);
  });

  it("exactly 15 leftover days stays in the +0.5 bucket", () => {
    // months=1, diffDays=15 -> +0.5, T=1.5
    const r = calculateHybridInterest(10000, 12, D("2025-01-01"), D("2025-02-16"), false);
    expect(r.T).toBe(1.5);
    expect(r.receivableAmount).toBe(10150);
  });

  it("16 leftover days crosses into the +1 bucket", () => {
    // months=1, diffDays=16 -> +1, T=2, amount = 10000 * 1.02 = 10200
    const r = calculateHybridInterest(10000, 12, D("2025-01-01"), D("2025-02-17"), false);
    expect(r.T).toBe(2);
    expect(r.receivableAmount).toBe(10200);
  });
});

describe("calculateHybridInterest — zero principal & precision", () => {
  it("zero principal never accrues interest", () => {
    const r = calculateHybridInterest(0, 24, D("2020-01-01"), D("2026-01-01"), true, "MONTHLY");
    expect(r.receivableAmount).toBe(0);
    expect(r.totalInterest).toBe(0);
  });

  it("receivableAmount is always rounded to at most 2 decimal places", () => {
    const r = calculateHybridInterest(10000, 12, D("2025-01-01"), D("2026-01-01"), true, "MONTHLY");
    // no float dust beyond 2 dp: value * 100 must be a whole number
    expect(Number.isInteger(Math.round(r.receivableAmount * 100))).toBe(true);
    expect(r.receivableAmount * 100).toBe(Math.round(r.receivableAmount * 100));
  });

  it("principal + totalInterest reconciles exactly to receivableAmount", () => {
    const r = calculateHybridInterest(10000, 18, D("2025-01-01"), D("2026-07-01"), true, "MONTHLY");
    expect(r.receivableAmount).toBeCloseTo(10000 + r.totalInterest, 10);
  });

  it("is deterministic — no float drift across repeated identical calls", () => {
    const inputs = [10000, 12, D("2025-01-01"), D("2026-07-01"), true, "MONTHLY"] as const;
    const first = calculateHybridInterest(...inputs);
    for (let i = 0; i < 1000; i++) {
      const again = calculateHybridInterest(...inputs);
      expect(again.receivableAmount).toBe(first.receivableAmount);
      expect(again.totalInterest).toBe(first.totalInterest);
      expect(again.T).toBe(first.T);
    }
  });
});
