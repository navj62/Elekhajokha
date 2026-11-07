import { describe, it, expect } from "vitest";
import {
  ACTIVE_COLUMN_KEYS,
  LOCKED_ACTIVE_COLUMNS,
  activeColumnsParam,
  parseActiveColumnsParam,
  parseStoredHiddenColumns,
  visibleActiveColumns,
} from "@/lib/reports/activeColumns";

describe("parseStoredHiddenColumns (localStorage value)", () => {
  it("missing, corrupt or non-array → nothing hidden (all columns)", () => {
    for (const raw of [null, "", "{", "not json", "42", '{"a":1}', "null", '"loanAmount"'])
      expect(parseStoredHiddenColumns(raw)).toEqual([]);
  });

  it("drops unknown keys, locked keys and non-strings; keeps column order", () => {
    expect(parseStoredHiddenColumns('["status","bogus",7,"customer","grossWeight","status"]'))
      .toEqual(["grossWeight", "status"]);
  });
});

describe("parseActiveColumnsParam (export query)", () => {
  it("absent → every column; empty → locked only", () => {
    expect(parseActiveColumnsParam(null)).toEqual({ ok: true, visible: [...ACTIVE_COLUMN_KEYS] });
    expect(parseActiveColumnsParam("")).toEqual({ ok: true, visible: [...LOCKED_ACTIVE_COLUMNS] });
  });

  it("any unknown key → not ok", () => {
    expect(parseActiveColumnsParam("loanAmount,Loan").ok).toBe(false);
  });
});

describe("activeColumnsParam (what the page sends)", () => {
  it("is omitted when nothing is hidden, and round-trips otherwise", () => {
    expect(activeColumnsParam([])).toBeNull();
    const hidden = ["ltv", "itemType"] as const;
    const parsed = parseActiveColumnsParam(activeColumnsParam(hidden));
    expect(parsed).toEqual({ ok: true, visible: visibleActiveColumns(hidden) });
  });
});
