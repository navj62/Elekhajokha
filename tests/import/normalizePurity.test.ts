import { describe, expect, it } from "vitest";
import { normalizePurity } from "../../lib/import/normalize/purity";
import { isIssue } from "../../lib/import/normalize/result";

const ctx = { rowRef: "row 2", field: "purity" };
const p = (raw: unknown, mode?: "karat" | "fineness" | "percent") => normalizePurity(raw, ctx, mode);

describe("normalizePurity", () => {
  it("is empty for blanks", () => {
    expect(p(null)).toEqual({ value: null });
    expect(p("")).toEqual({ value: null });
  });

  it("converts standard karats with the hallmark table", () => {
    const expected: Record<number, string> = { 24: "99.9", 22: "91.6", 21: "87.5", 20: "83.3", 18: "75.0", 14: "58.3", 9: "37.5" };
    for (const [karat, percent] of Object.entries(expected)) {
      expect(p(Number(karat))).toMatchObject({ value: percent });
    }
  });

  it("converts a non-standard karat exactly, to 2 decimals", () => {
    expect(p(23)).toMatchObject({ value: "95.83" });
    expect(p(10)).toMatchObject({ value: "41.67" });
  });

  it("reads karat markers", () => {
    for (const raw of ["22K", "22 KT", "22k", "22 carat", "22 Karat", "२२ कैरेट"]) {
      expect(p(raw)).toMatchObject({ value: "91.6" });
    }
    expect(p("18K")).toMatchObject({ value: "75.0" });
  });

  it("converts fineness to percent", () => {
    expect(p(916)).toMatchObject({ value: "91.6" });
    expect(p("750")).toMatchObject({ value: "75.0" });
    expect(p("999")).toMatchObject({ value: "99.9" });
    expect(p("585")).toMatchObject({ value: "58.5" });
    expect(p("९१६")).toMatchObject({ value: "91.6" });
  });

  it("keeps percent values and marks nothing as fixed", () => {
    expect(p("91.6")).toEqual({ value: "91.6" });
    expect(p(100)).toEqual({ value: "100" });
    expect(p("75")).toEqual({ value: "75" });
    expect(p("91.6%")).toMatchObject({ value: "91.6" });
  });

  it("asks when the value fits no range", () => {
    for (const raw of [30, 49, 200, 499, 7, 0.5, 1000.5]) {
      const issue = p(raw);
      expect(isIssue(issue) && issue.kind).toBe("question");
    }
    const q = p(30);
    expect(isIssue(q) && q.options).toHaveLength(3);
  });

  it("respects a forced reading from the column or the owner", () => {
    expect(p(22, "karat")).toMatchObject({ value: "91.6" });
    expect(p(75, "percent")).toMatchObject({ value: "75" });
    expect(isIssue(p(916, "karat"))).toBe(true);
    expect(isIssue(p(120, "percent"))).toBe(true);
  });

  it("errors on zero, negatives and text", () => {
    expect(isIssue(p(0))).toBe(true);
    expect(isIssue(p("-22"))).toBe(true);
    expect(isIssue(p("pure"))).toBe(true);
  });
});
