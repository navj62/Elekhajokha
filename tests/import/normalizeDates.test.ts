import { describe, expect, it } from "vitest";
import { detectDateOrder, normalizeDate } from "../../lib/import/normalize/dates";
import { isIssue } from "../../lib/import/normalize/result";

const ctx = { rowRef: "row 3", field: "pledgeDate" };

describe("normalizeDate", () => {
  it("keeps ISO dates as they are", () => {
    expect(normalizeDate("2026-04-03", ctx)).toEqual({ value: "2026-04-03" });
  });

  it("rewrites other year-first forms and drops a time part", () => {
    expect(normalizeDate("2026/4/3", ctx)).toMatchObject({ value: "2026-04-03" });
    expect(normalizeDate("2026-04-03T10:20:30", ctx)).toMatchObject({ value: "2026-04-03" });
    expect(normalizeDate("2026-04-03 00:00:00", ctx)).toMatchObject({ value: "2026-04-03" });
  });

  it("treats blanks, NULL and the zero date as empty", () => {
    for (const raw of [null, "", "NULL", "0000-00-00", "0000-00-00 00:00:00", "-"]) {
      expect(normalizeDate(raw, ctx)).toEqual({ value: null });
    }
  });

  it("reads day/month/year when the column order is DMY", () => {
    expect(normalizeDate("03/04/2026", ctx, "DMY")).toMatchObject({ value: "2026-04-03" });
    expect(normalizeDate("3-4-2026", ctx, "DMY")).toMatchObject({ value: "2026-04-03" });
    expect(normalizeDate("03.04.2026", ctx, "DMY")).toMatchObject({ value: "2026-04-03" });
  });

  it("reads month/day/year when the column order is MDY", () => {
    expect(normalizeDate("04/03/2026", ctx, "MDY")).toMatchObject({ value: "2026-04-03" });
  });

  it("errors when a value contradicts the column order", () => {
    const issue = normalizeDate("04/25/2026", ctx, "DMY");
    expect(isIssue(issue) && issue.kind).toBe("error");
  });

  it("proves the order itself when one part is above 12", () => {
    expect(normalizeDate("25/04/2026", ctx)).toMatchObject({ value: "2026-04-25" });
    expect(normalizeDate("04/25/2026", ctx)).toMatchObject({ value: "2026-04-25" });
  });

  it("is not ambiguous when day equals month", () => {
    expect(normalizeDate("05/05/2026", ctx)).toMatchObject({ value: "2026-05-05" });
  });

  it("asks a question for an ambiguous date with no column order", () => {
    const issue = normalizeDate("03/04/2026", ctx);
    expect(isIssue(issue)).toBe(true);
    if (isIssue(issue)) {
      expect(issue.kind).toBe("question");
      expect(issue.options).toEqual(["2026-04-03", "2026-03-04"]);
      expect(issue.suggestion).toBe("2026-04-03");
    }
  });

  it("reads two-digit years as 20yy and says so", () => {
    const result = normalizeDate("03/04/26", ctx, "DMY");
    expect(result).toMatchObject({ value: "2026-04-03" });
    expect("fixed" in result && result.fixed).toContain("2-digit year");
  });

  it("reads English month names", () => {
    expect(normalizeDate("03-Apr-2026", ctx)).toMatchObject({ value: "2026-04-03" });
    expect(normalizeDate("3 April 2026", ctx)).toMatchObject({ value: "2026-04-03" });
    expect(normalizeDate("Apr 3, 2026", ctx)).toMatchObject({ value: "2026-04-03" });
    expect(normalizeDate("Sept 9 2026", ctx)).toMatchObject({ value: "2026-09-09" });
  });

  it("reads Hindi month names and Devanagari digits", () => {
    expect(normalizeDate("01-अप्रैल-2026", ctx)).toMatchObject({ value: "2026-04-01" });
    expect(normalizeDate("31 अक्टूबर 2026", ctx)).toMatchObject({ value: "2026-10-31" });
    expect(normalizeDate("१५-फ़रवरी-२०२६", ctx)).toMatchObject({ value: "2026-02-15" });
    expect(normalizeDate("०३/०४/२०२६", ctx, "DMY")).toMatchObject({ value: "2026-04-03" });
  });

  it("rejects dates that do not exist", () => {
    for (const raw of ["2026-02-30", "31/04/2026", "2026-13-01", "32-Jan-2026"]) {
      expect(isIssue(normalizeDate(raw, ctx, "DMY"))).toBe(true);
    }
    expect(normalizeDate("29/02/2024", ctx, "DMY")).toMatchObject({ value: "2024-02-29" });
    expect(isIssue(normalizeDate("29/02/2025", ctx, "DMY"))).toBe(true);
  });

  it("converts plausible Excel serial numbers and marks them fixed", () => {
    expect(normalizeDate(45798, ctx)).toEqual({ value: "2025-05-21", fixed: "Converted an Excel date number" });
    expect(isIssue(normalizeDate(12, ctx))).toBe(true);
    expect(isIssue(normalizeDate(20260403, ctx))).toBe(true);
  });

  it("rejects text that is not a date, without echoing it", () => {
    const issue = normalizeDate("next tuesday", ctx);
    expect(isIssue(issue)).toBe(true);
    if (isIssue(issue)) expect(issue.message).not.toContain("tuesday");
  });
});

describe("detectDateOrder", () => {
  it("finds day-first from a first part above 12", () => {
    expect(detectDateOrder(["03/04/2026", "25/04/2026"])).toEqual({ status: "DMY" });
  });
  it("finds month-first from a second part above 12", () => {
    expect(detectDateOrder(["03/04/2026", "04/25/2026"])).toEqual({ status: "MDY" });
  });
  it("reports a conflict when both are proven", () => {
    expect(detectDateOrder(["25/04/2026", "04/25/2026"])).toEqual({ status: "CONFLICT" });
  });
  it("reports ambiguous when every date fits both readings", () => {
    expect(detectDateOrder(["03/04/2026", "05/06/2026", null, "2026-01-01"])).toEqual({ status: "AMBIGUOUS" });
  });
  it("is not needed for ISO, named months, equal parts or an empty column", () => {
    expect(detectDateOrder(["2026-04-03", "03-Apr-2026", "05/05/2026"])).toEqual({ status: "NOT_NEEDED" });
    expect(detectDateOrder([])).toEqual({ status: "NOT_NEEDED" });
  });
  it("one provable value settles the whole column, even beside ambiguous ones", () => {
    expect(detectDateOrder(["03/04/2026", "13/04/2026", "05/06/2026"])).toEqual({ status: "DMY" });
  });
});
