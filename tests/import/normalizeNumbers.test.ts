import { describe, expect, it } from "vitest";
import { normalizeNumber } from "../../lib/import/normalize/numbers";
import { isIssue } from "../../lib/import/normalize/result";

const ctx = { rowRef: "row 7", field: "loanAmount" };
const n = (raw: unknown) => normalizeNumber(raw, ctx);

describe("normalizeNumber", () => {
  it("passes plain numbers through unchanged", () => {
    expect(n("12500.50")).toEqual({ value: "12500.50" });
    expect(n("0")).toEqual({ value: "0" });
    expect(n(30000)).toEqual({ value: "30000" });
  });

  it("treats blanks and placeholders as empty", () => {
    for (const raw of [null, undefined, "", "   ", "NULL", "n/a", "-"]) {
      expect(n(raw)).toEqual({ value: null });
    }
  });

  it("strips rupee marks, Rs and /- and spaces", () => {
    expect(n("₹ 12,500")).toMatchObject({ value: "12500" });
    expect(n("Rs. 5000/-")).toMatchObject({ value: "5000" });
    expect(n("INR 1500.5")).toMatchObject({ value: "1500.5" });
    expect(n("रु. 2500")).toMatchObject({ value: "2500" });
    expect(n(" 1 000")).toMatchObject({ value: "1000" });
  });

  it("accepts Indian and Western thousands separators", () => {
    expect(n("1,25,000")).toEqual({ value: "125000", fixed: "Removed thousands separators" });
    expect(n("125,000")).toMatchObject({ value: "125000" });
    expect(n("12,34,56,789.25")).toMatchObject({ value: "123456789.25" });
    expect(n("5,000")).toMatchObject({ value: "5000" });
  });

  it("rejects commas in the wrong places instead of guessing", () => {
    expect(isIssue(n("1,2,3"))).toBe(true);
    expect(isIssue(n("12,34567"))).toBe(true);
    const decimalComma = n("12,5");
    expect(isIssue(decimalComma) && decimalComma.kind).toBe("error");
  });

  it("converts Devanagari digits", () => {
    expect(n("२५००")).toMatchObject({ value: "2500" });
    expect(n("१.५००")).toMatchObject({ value: "1.500" });
  });

  it("removes Excel float noise", () => {
    expect(n(0.1 + 0.2)).toEqual({ value: "0.3", fixed: "Removed spreadsheet rounding noise" });
    expect(n(1234.5600000000002)).toMatchObject({ value: "1234.56" });
    expect(n(2.675)).toEqual({ value: "2.675" });
  });

  it("canonicalises leading dot, trailing dot and leading zeros", () => {
    expect(n(".5")).toMatchObject({ value: "0.5" });
    expect(n("5.")).toMatchObject({ value: "5" });
    expect(n("007")).toMatchObject({ value: "7" });
  });

  it("rejects negatives unless allowed", () => {
    expect(isIssue(n("-5"))).toBe(true);
    expect(isIssue(n("(500)"))).toBe(true);
    expect(normalizeNumber("-5", ctx, { allowNegative: true })).toMatchObject({ value: "-5" });
  });

  it("rejects text, booleans, exponents and huge numbers", () => {
    for (const raw of ["abc", "12abc", "1e3", true, Number.NaN, Infinity, 1e20, {}]) {
      expect(isIssue(n(raw))).toBe(true);
    }
  });

  it("puts the row and field on the issue and never echoes the cell content", () => {
    const issue = n("hello world");
    expect(isIssue(issue)).toBe(true);
    if (isIssue(issue)) {
      expect(issue).toMatchObject({ rowRef: "row 7", field: "loanAmount", kind: "error" });
      expect(issue.message).not.toContain("hello");
    }
  });
});
