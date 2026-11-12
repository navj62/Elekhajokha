import { describe, expect, it } from "vitest";
import { normalizeMobile, splitNameAndMobile } from "../../lib/import/normalize/mobile";
import { isIssue } from "../../lib/import/normalize/result";

const ctx = { rowRef: "row 4", field: "mobile" };
const m = (raw: unknown) => normalizeMobile(raw, ctx);

describe("normalizeMobile", () => {
  it("is empty for blanks", () => {
    expect(m(null)).toEqual({ value: null });
    expect(m("")).toEqual({ value: null });
  });

  it("keeps a clean 10-digit number", () => {
    expect(m("9876543210")).toEqual({ value: "9876543210" });
  });

  it("strips +91, 91, 0091, a leading 0, spaces, dashes and dots", () => {
    for (const raw of ["+91 98765 43210", "+91-9876543210", "919876543210", "0091 9876543210", "09876543210", "98765-43210", "98765.43210", "(98765) 43210", " 9876543210 "]) {
      expect(m(raw)).toMatchObject({ value: "9876543210" });
    }
  });

  it("reads numeric cells (Excel drops the leading zero and the plus)", () => {
    expect(m(9876543210)).toEqual({ value: "9876543210" });
    expect(m(919876543210)).toMatchObject({ value: "9876543210" });
  });

  it("converts Devanagari digits", () => {
    expect(m("९८७६५ ४३२१०")).toMatchObject({ value: "9876543210" });
  });

  it("errors on masked numbers", () => {
    for (const raw of ["98XXXXXX10", "XXXXX XXX342", "+91-XXXXX-XX374", "0XXXXXXXX812", "98*****210"]) {
      const issue = m(raw);
      expect(isIssue(issue) && issue.kind).toBe("error");
    }
  });

  it("errors on wrong length or a first digit below 6", () => {
    for (const raw of ["12345", "98765432", "98765432100", "5876543210", "abcdefghij"]) {
      expect(isIssue(m(raw))).toBe(true);
    }
  });

  it("asks which number to use when a cell holds two different numbers", () => {
    const issue = m("9876543210 / 9123456780");
    expect(isIssue(issue) && issue.kind).toBe("question");
    expect(isIssue(issue) && issue.options).toEqual(["9876543210", "9123456780"]);
    expect(isIssue(issue) && issue.suggestion).toBe("9876543210");
    expect(isIssue(m("9876543210, 9123456780"))).toBe(true);
  });

  it("collapses the same number written twice", () => {
    expect(m("9876543210 / 98765 43210")).toMatchObject({ value: "9876543210" });
  });
});

describe("splitNameAndMobile", () => {
  const s = (raw: unknown) => splitNameAndMobile(raw, { rowRef: "row 4", field: "name" });

  it("leaves a cell with no number as the name alone", () => {
    expect(s("Ramesh Kumar")).toEqual({ value: { name: "Ramesh Kumar", mobile: null } });
    expect(s("रमेश कुमार")).toEqual({ value: { name: "रमेश कुमार", mobile: null } });
  });

  it("splits a name and a trailing number", () => {
    expect(s("Ramesh Kumar 9876543210")).toMatchObject({ value: { name: "Ramesh Kumar", mobile: "9876543210" } });
    expect(s("रमेश कुमार 98765 43210")).toMatchObject({ value: { name: "रमेश कुमार", mobile: "9876543210" } });
  });

  it("splits a leading number and common separators", () => {
    expect(s("9876543210 - Ramesh")).toMatchObject({ value: { name: "Ramesh", mobile: "9876543210" } });
    expect(s("Ramesh (9876543210)")).toMatchObject({ value: { name: "Ramesh", mobile: "9876543210" } });
    expect(s("Ramesh, +91 98765 43210")).toMatchObject({ value: { name: "Ramesh", mobile: "9876543210" } });
    expect(s("Ramesh Mob: 09876543210")).toMatchObject({ value: { name: "Ramesh", mobile: "9876543210" } });
  });

  it("does not eat digits that are part of the name", () => {
    expect(s("Shop No 7 Ramesh")).toMatchObject({ value: { name: "Shop No 7 Ramesh", mobile: null } });
  });

  it("asks when two different numbers sit beside a name", () => {
    const issue = s("Ramesh 9876543210 9123456780");
    expect(isIssue(issue) && issue.kind).toBe("question");
  });

  it("errors when only a number is present, or the cell is empty", () => {
    expect(isIssue(s("9876543210"))).toBe(true);
    expect(isIssue(s(""))).toBe(true);
    expect(isIssue(s(null))).toBe(true);
  });
});
