import { describe, expect, it } from "vitest";
import { applyRateUnit, detectRateUnit, normalizeRate } from "../../lib/import/normalize/interestRate";
import { isIssue } from "../../lib/import/normalize/result";

const ctx = { rowRef: "row 5", field: "interestRate" };

describe("normalizeRate", () => {
  it("reads rates as written in the file", () => {
    expect(normalizeRate("2.00", ctx)).toEqual({ value: "2.00" });
    expect(normalizeRate(3, ctx)).toEqual({ value: "3" });
    expect(normalizeRate("2%", ctx)).toMatchObject({ value: "2" });
    expect(normalizeRate("२.५ %", ctx)).toMatchObject({ value: "2.5" });
    expect(normalizeRate("24 percent", ctx)).toMatchObject({ value: "24" });
  });
  it("is empty for blanks and errors on zero, negatives and text", () => {
    expect(normalizeRate("", ctx)).toEqual({ value: null });
    for (const raw of ["0", "0.00", "-2", "two"]) expect(isIssue(normalizeRate(raw, ctx))).toBe(true);
  });
});

describe("detectRateUnit", () => {
  it("asks when every rate is below 6", () => {
    expect(detectRateUnit(["2.00", "2.00", "3.00", 2])).toEqual({ status: "ASK", reason: "ALL_BELOW_6" });
  });
  it("treats rates of 6 or more as yearly", () => {
    expect(detectRateUnit(["12", "24", "36"])).toEqual({ status: "YEARLY" });
    expect(detectRateUnit(["6"])).toEqual({ status: "YEARLY" });
  });
  it("asks when small and large rates are mixed", () => {
    expect(detectRateUnit(["2", "24"])).toEqual({ status: "ASK", reason: "MIXED" });
  });
  it("ignores blanks, zero rates and bad cells; none left means no answer needed", () => {
    expect(detectRateUnit(["0.00", null, "", "abc"])).toEqual({ status: "NONE" });
    expect(detectRateUnit(["0.00", "2.00"])).toEqual({ status: "ASK", reason: "ALL_BELOW_6" });
    expect(detectRateUnit([])).toEqual({ status: "NONE" });
  });
});

describe("applyRateUnit", () => {
  it("keeps a yearly rate and runs the app's rate rule", () => {
    expect(applyRateUnit("24", "YEARLY", ctx)).toEqual({ value: "24" });
    expect(applyRateUnit("18.5", "YEARLY", ctx)).toEqual({ value: "18.5" });
  });
  it("multiplies a monthly rate by 12 and says so", () => {
    expect(applyRateUnit("2", "MONTHLY", ctx)).toEqual({ value: "24", fixed: "Converted 2% per month to 24% per year" });
    expect(applyRateUnit("1.5", "MONTHLY", ctx)).toMatchObject({ value: "18" });
    expect(applyRateUnit("2.25", "MONTHLY", ctx)).toMatchObject({ value: "27" });
  });
  it("applies checkInterestRate: above 100 and over 2 decimals are errors", () => {
    expect(isIssue(applyRateUnit("9", "MONTHLY", ctx))).toBe(true);
    expect(isIssue(applyRateUnit("101", "YEARLY", ctx))).toBe(true);
    expect(isIssue(applyRateUnit("12.345", "YEARLY", ctx))).toBe(true);
    expect(applyRateUnit("100", "YEARLY", ctx)).toEqual({ value: "100" });
  });
});
