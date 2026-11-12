import { describe, expect, it } from "vitest";
import { isLostInExport, normalizeText } from "../../lib/import/normalize/text";
import { isIssue } from "../../lib/import/normalize/result";

const ctx = { rowRef: "row 2", field: "name" };

describe("normalizeText", () => {
  it("trims and collapses spaces", () => {
    expect(normalizeText("  Ramesh   Kumar ", ctx)).toEqual({ value: "Ramesh Kumar" });
    expect(normalizeText("रमेश कुमार", ctx)).toEqual({ value: "रमेश कुमार" });
    expect(normalizeText("\u00A0बस स्टैंड\u00A0", ctx)).toEqual({ value: "बस स्टैंड" });
  });

  it("is empty for blanks", () => {
    expect(normalizeText(null, ctx)).toEqual({ value: null });
    expect(normalizeText("   ", ctx)).toEqual({ value: null });
  });

  it("turns text made only of ? into an issue saying it was lost in export", () => {
    for (const raw of ["?????", "?", " ????? ", "? ? ?", "??????????"]) {
      const result = normalizeText(raw, ctx);
      expect(isIssue(result)).toBe(true);
      if (isIssue(result)) {
        expect(result).toMatchObject({ rowRef: "row 2", field: "name", kind: "error" });
        expect(result.message).toContain("lost");
      }
    }
  });

  it("does the same for the replacement character U+FFFD", () => {
    for (const raw of ["\uFFFD\uFFFD\uFFFD", "\uFFFD", "?\uFFFD? \uFFFD"]) {
      expect(isIssue(normalizeText(raw, ctx))).toBe(true);
    }
  });

  it("never lets such a value through as a name or address", () => {
    expect(normalizeText("?????", { rowRef: "row 9", field: "address" })).not.toHaveProperty("value");
  });

  it("keeps real text that merely contains a question mark or a replacement character", () => {
    expect(normalizeText("Ramesh?", ctx)).toEqual({ value: "Ramesh?" });
    expect(normalizeText("R\uFFFDmesh", ctx)).toEqual({ value: "R\uFFFDmesh" });
    expect(normalizeText("Shop 7 ?", ctx)).toEqual({ value: "Shop 7 ?" });
  });

  it("isLostInExport needs at least one ? or U+FFFD", () => {
    expect(isLostInExport("???")).toBe(true);
    expect(isLostInExport("   ")).toBe(false);
    expect(isLostInExport("")).toBe(false);
    expect(isLostInExport("a?")).toBe(false);
  });
});
