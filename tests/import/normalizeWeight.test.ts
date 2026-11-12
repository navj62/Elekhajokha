import { describe, expect, it } from "vitest";
import { detectWeightUnitFromHeader, normalizeWeight } from "../../lib/import/normalize/weight";
import { isIssue } from "../../lib/import/normalize/result";

const ctx = { rowRef: "row 9", field: "grossWeight" };
const w = (raw: unknown, unit?: "g" | "kg" | "mg" | "tola") => normalizeWeight(raw, ctx, unit);

describe("normalizeWeight", () => {
  it("is empty for blanks", () => {
    expect(w(null)).toEqual({ value: null });
    expect(w("NULL")).toEqual({ value: null });
  });

  it("treats a bare number as grams, unchanged", () => {
    expect(w(4)).toEqual({ value: "4" });
    expect(w("12.345")).toEqual({ value: "12.345" });
    expect(w("00")).toMatchObject({ value: "0" });
  });

  it("removes float noise on number cells", () => {
    expect(w(0.1 + 0.2)).toMatchObject({ value: "0.3" });
  });

  it("reads grams from text in English and Hindi", () => {
    expect(w("4 gm")).toMatchObject({ value: "4" });
    expect(w("4gm")).toMatchObject({ value: "4" });
    expect(w("10 grams")).toMatchObject({ value: "10" });
    expect(w("2.5 g")).toMatchObject({ value: "2.5" });
    expect(w("वज़न ४ ग्राम")).toMatchObject({ value: "4" });
    expect(w("वजन २५ ग्राम")).toMatchObject({ value: "25" });
    expect(w("वज़न १०० ग्राम")).toMatchObject({ value: "100" });
    expect(w("Wt: 3.5 gm")).toMatchObject({ value: "3.5" });
  });

  it("keeps a bare Hindi-labelled number as grams", () => {
    expect(w("वज़न १.५००")).toMatchObject({ value: "1.5" });
  });

  it("marks values read out of text as fixed", () => {
    expect(w("वज़न ४ ग्राम")).toEqual({ value: "4", fixed: "Read the weight in grams from the text" });
  });

  it("converts kg and mg to grams, rounded to 3 decimals", () => {
    expect(w("1.5 kg")).toMatchObject({ value: "1500" });
    expect(w("0.25 किलो")).toMatchObject({ value: "250" });
    expect(w("500 mg")).toMatchObject({ value: "0.5" });
    expect(w("1234 mg")).toMatchObject({ value: "1.234" });
    expect(w("1.2345 mg")).toMatchObject({ value: "0.001" });
  });

  it("uses the column unit when the cell has none, and the cell unit when it has one", () => {
    expect(w("2", "kg")).toMatchObject({ value: "2000" });
    expect(w("500 gm", "kg")).toMatchObject({ value: "500" });
  });

  it("never converts tola: it becomes a question", () => {
    for (const raw of ["2 tola", "२ तोला", "1.5 तोले"]) {
      const issue = w(raw);
      expect(isIssue(issue) && issue.kind).toBe("question");
    }
    const byColumn = w("2", "tola");
    expect(isIssue(byColumn) && byColumn.kind).toBe("question");
  });

  it("asks about an unknown unit", () => {
    const issue = w("5 ratti");
    expect(isIssue(issue) && issue.kind).toBe("question");
    expect(isIssue(issue) && issue.options).toEqual(["Grams", "Kilograms", "Milligrams"]);
  });

  it("errors on no number, several numbers, negatives and non-text", () => {
    for (const raw of ["heavy", "4 gm 500 mg", "4/5", "-3", true, {}]) {
      expect(isIssue(w(raw))).toBe(true);
    }
  });
});

describe("detectWeightUnitFromHeader", () => {
  it("finds a unit named in the header", () => {
    expect(detectWeightUnitFromHeader("Weight (kg)")).toBe("kg");
    expect(detectWeightUnitFromHeader("वज़न (ग्राम)")).toBe("g");
    expect(detectWeightUnitFromHeader("Wt in grams")).toBe("g");
    expect(detectWeightUnitFromHeader("Weight (Tola)")).toBe("tola");
  });
  it("returns null when the header says nothing", () => {
    expect(detectWeightUnitFromHeader("Weight")).toBeNull();
    expect(detectWeightUnitFromHeader("वज़न")).toBeNull();
    expect(detectWeightUnitFromHeader("Net g")).toBeNull();
  });
});
