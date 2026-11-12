// Parser and normalizer tests on the files in samples/ (all synthetic data).
// Expected header rows and data-row counts are owned by the product owner
// (docs/import-samples.md). Run also with TZ=Asia/Kolkata.

import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import {
  type CellValue,
  type MergedRange,
  type Table,
  extractTable,
  findHeaderRow,
  listSheets,
  readSheet,
} from "../../lib/import/parse";
import { detectDateOrder, normalizeDate } from "../../lib/import/normalize/dates";
import { detectRateUnit } from "../../lib/import/normalize/interestRate";
import { normalizeMobile } from "../../lib/import/normalize/mobile";
import { normalizeNumber } from "../../lib/import/normalize/numbers";
import { isIssue } from "../../lib/import/normalize/result";
import { normalizeText } from "../../lib/import/normalize/text";
import { normalizeWeight } from "../../lib/import/normalize/weight";

const SAMPLES = path.resolve(__dirname, "../../samples");

type Loaded = { sheets: string[]; headerRowNumber: number; table: Table; merges: MergedRange[]; rows: CellValue[][] };

async function load(fileName: string): Promise<Loaded> {
  const buffer = readFileSync(path.join(SAMPLES, fileName));
  const listed = await listSheets(buffer, fileName);
  const sheet = await readSheet(buffer, fileName, listed.sheets[0]?.name);
  const headerIndex = findHeaderRow(sheet.rows);
  if (headerIndex === null) throw new Error(`no header row in ${fileName}`);
  const table = extractTable(sheet.rows, headerIndex);
  return { sheets: listed.sheets.map((s) => s.name), headerRowNumber: headerIndex + 1, table, merges: sheet.merges, rows: sheet.rows };
}

const column = (t: Table, header: string): CellValue[] => {
  const i = t.headers.indexOf(header);
  if (i < 0) throw new Error(`no column ${header}`);
  return t.rows.map((r) => r.cells[i] ?? null);
};

const ctx = (field: string) => ({ rowRef: "r", field });

describe("1_php_ledger_export.csv", () => {
  let f: Loaded;
  beforeAll(async () => {
    f = await load("1_php_ledger_export.csv");
  });

  it("has header row 1 and 60 data rows", () => {
    expect(f.sheets).toEqual(["CSV"]);
    expect(f.headerRowNumber).toBe(1);
    expect(f.table.rows).toHaveLength(60);
    expect(f.table.headers).toHaveLength(18);
    expect(f.table.headers.slice(0, 3)).toEqual(["cid", "shopname", "customername"]);
    expect(f.table.skipped).toEqual({ blank: 0, total: 0, note: 0, repeatedHeader: 0 });
    expect(f.merges).toEqual([]);
  });

  it("numbers rows by sheet row: first data row is 2, last is 61", () => {
    expect(f.table.rows[0]?.rowNumber).toBe(2);
    expect(f.table.rows.at(-1)?.rowNumber).toBe(61);
  });

  it("keeps every value as raw text (no Date, no number)", () => {
    for (const r of f.table.rows) for (const c of r.cells) expect(typeof c === "string" || c === null).toBe(true);
    expect(column(f.table, "loanamount")[0]).toBe("2000.00");
    expect(column(f.table, "pledgedate")[0]).toBe("2025-04-15");
  });

  it("strips the stray NUL bytes", () => {
    for (const r of f.table.rows) for (const c of r.cells) expect(String(c)).not.toContain("\u0000");
  });

  it("reads Hindi text intact", () => {
    expect(column(f.table, "itemname")).toContain("चांदी भ. कड़ा १");
  });

  it("dates need no day/month question; NULL and 0000-00-00 are empty", () => {
    expect(detectDateOrder(column(f.table, "pledgedate"))).toEqual({ status: "NOT_NEEDED" });
    const release = column(f.table, "releasedate").map((v) => normalizeDate(v, ctx("releaseDate")));
    expect(release.every((r) => !isIssue(r))).toBe(true);
    expect(release.filter((r) => !isIssue(r) && r.value === null)).toHaveLength(21); // 11 NULL + 10 zero dates
    expect(release.filter((r) => !isIssue(r) && r.value !== null)).toHaveLength(39);
  });

  it("every rate is below 6, so the per-month/per-year question applies", () => {
    expect(detectRateUnit(column(f.table, "interestrate"))).toEqual({ status: "ASK", reason: "ALL_BELOW_6" });
  });

  it("amounts and weights normalize; only unit-less or zero cells are odd", () => {
    for (const v of column(f.table, "loanamount")) expect(isIssue(normalizeNumber(v, ctx("loanAmount")))).toBe(false);
    const weights = column(f.table, "weight").map((v) => normalizeWeight(v, ctx("grossWeight")));
    expect(weights.filter(isIssue)).toHaveLength(0);
    expect(weights[0]).toMatchObject({ value: "2" }); // वज़न २ ग्राम
    expect(weights.filter((w) => !isIssue(w) && w.value === null)).toHaveLength(2);
    const grams = column(f.table, "weight").findIndex((v) => v === "4 gm");
    expect(weights[grams]).toMatchObject({ value: "4" });
  });

  it("flags the names and addresses that were lost in the export", () => {
    const names = column(f.table, "customername").map((v) => normalizeText(v, ctx("name")));
    const addresses = column(f.table, "address").map((v) => normalizeText(v, ctx("address")));
    expect(names.filter(isIssue)).toHaveLength(3);
    expect(addresses.filter(isIssue)).toHaveLength(2);
    for (const issue of [...names, ...addresses].filter(isIssue)) {
      expect(issue.kind).toBe("error");
      expect(issue.message).toContain("lost");
    }
  });
});

describe("2_jeweller_contacts_masked.xlsx", () => {
  let f: Loaded;
  beforeAll(async () => {
    f = await load("2_jeweller_contacts_masked.xlsx");
  });

  it("has sheet Contacts, header row 1 and 55 data rows", () => {
    expect(f.sheets).toEqual(["Contacts"]);
    expect(f.headerRowNumber).toBe(1);
    expect(f.table.rows).toHaveLength(55);
    expect(f.table.headers).toEqual([
      "Contact ID", "Shop Name", "Contact Person", "Phone (masked)", "City", "District", "Speciality", "Years Known", "Last Deal Date", "Active",
    ]);
    expect(f.table.skipped).toEqual({ blank: 0, total: 0, note: 0, repeatedHeader: 0 });
    expect(f.merges).toEqual([]);
  });

  it("reads Excel date cells as YYYY-MM-DD, with no timezone shift", () => {
    const dates = column(f.table, "Last Deal Date");
    expect(dates[0]).toBe("2025-05-21");
    expect(dates[1]).toBe("2025-11-30");
    for (const d of dates) expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("keeps numbers as numbers", () => {
    expect(column(f.table, "Years Known")[0]).toBe(17);
  });

  it("every phone is masked, so every one is an error", () => {
    const results = column(f.table, "Phone (masked)").map((v) => normalizeMobile(v, ctx("mobile")));
    expect(results.every((r) => isIssue(r) && r.kind === "error")).toBe(true);
  });
});

describe("3_jeweller_contacts_dirty.csv", () => {
  let f: Loaded;
  beforeAll(async () => {
    f = await load("3_jeweller_contacts_dirty.csv");
  });

  it("has header row 1 and 60 data rows", () => {
    expect(f.sheets).toEqual(["CSV"]);
    expect(f.headerRowNumber).toBe(1);
    expect(f.table.rows).toHaveLength(60);
    expect(f.table.headers).toEqual(["sr", "firm", "owner / contact", "mobile", "alt mobile", "town", "remarks"]);
  });

  it("drops the BOM, so the first header is exactly 'sr'", () => {
    expect(f.table.headers[0]).toBe("sr");
    expect(f.table.headers[0]?.charCodeAt(0)).toBe("s".charCodeAt(0));
  });

  it("keeps Hindi and mixed-case text", () => {
    expect(column(f.table, "owner / contact")).toContain("मीना भट्ट");
    expect(column(f.table, "town").some((t) => t === "Nepanagar ")).toBe(true);
  });

  it("every present phone number is masked, so none passes", () => {
    for (const header of ["mobile", "alt mobile"]) {
      const results = column(f.table, header).map((v) => normalizeMobile(v, ctx("mobile")));
      for (const r of results) expect(isIssue(r) ? r.kind === "error" : r.value === null).toBe(true);
    }
  });
});

describe("4_messy_ledger_hindi.xlsx", () => {
  let f: Loaded;
  beforeAll(async () => {
    f = await load("4_messy_ledger_hindi.xlsx");
  });

  it("has sheet खाता बही, header row 5 and 58 data rows", () => {
    expect(f.sheets).toEqual(["खाता बही"]);
    expect(f.headerRowNumber).toBe(5);
    expect(f.table.rows).toHaveLength(58);
    expect(f.table.headers).toEqual([
      "क्र.सं.", "दुकान", "ग्राहक का नाम", "पता", "ऋण राशि (₹)", "गिरवी दिनांक", "ब्याज दर (%)", "वस्तु", "वज़न",
      "छुड़ाने का दिनांक", "अवधि (१५ दिन)", "कुल ब्याज (₹)", "प्राप्य राशि (₹)",
    ]);
  });

  it("skips one blank row, one total row and one note row", () => {
    expect(f.table.skipped).toEqual({ blank: 1, total: 1, note: 1, repeatedHeader: 0 });
  });

  it("data rows run from sheet row 6 to 63, with none of the junk rows", () => {
    const numbers = f.table.rows.map((r) => r.rowNumber);
    expect(numbers[0]).toBe(6);
    expect(numbers.at(-1)).toBe(63);
    expect(numbers).toHaveLength(58);
    for (const junk of [1, 2, 3, 4, 5, 64, 65, 66]) expect(numbers).not.toContain(junk);
    expect(column(f.table, "क्र.सं.")).toEqual(Array.from({ length: 58 }, (_, i) => i + 1));
  });

  it("returns the merged ranges as metadata, with the shop value only in each top-left cell", () => {
    expect(f.merges).toEqual(
      expect.arrayContaining([
        { top: 1, left: 1, bottom: 1, right: 13 }, // title
        { top: 4, left: 1, bottom: 4, right: 4 }, // grouping band
        { top: 6, left: 2, bottom: 25, right: 2 }, // shop block 1
        { top: 26, left: 2, bottom: 45, right: 2 }, // shop block 2
        { top: 46, left: 2, bottom: 63, right: 2 }, // shop block 3
      ]),
    );
    const shop = column(f.table, "दुकान");
    expect(shop[0]).toBe("श्री गणेश फाइनेंस"); // row 6, top-left
    expect(shop[1]).toBeNull(); // row 7, inside the merge
    expect(shop[20]).toBe("महालक्ष्मी बैंकर्स"); // row 26
    expect(shop[40]).toBe("दादा जी पेढ़ी"); // row 46
    // Phase 3 can rebuild the fill-down from the ranges.
    expect(shop.filter((v) => v !== null)).toHaveLength(3);
  });

  it("reads Excel date cells as YYYY-MM-DD", () => {
    expect(column(f.table, "गिरवी दिनांक")[0]).toBe("2026-04-03");
    expect(column(f.table, "छुड़ाने का दिनांक")[1]).toBe("2026-04-13");
    for (const v of column(f.table, "गिरवी दिनांक")) expect(v).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("amounts: numbers and 4 comma-text amounts all normalize", () => {
    const amounts = column(f.table, "ऋण राशि (₹)");
    expect(amounts.filter((v) => typeof v === "string")).toHaveLength(4);
    const results = amounts.map((v) => normalizeNumber(v, ctx("loanAmount")));
    expect(results.every((r) => !isIssue(r))).toBe(true);
    const text = amounts.findIndex((v) => v === "15,000");
    expect(results[text]).toMatchObject({ value: "15000" });
  });

  it("weights in Devanagari digits parse; unit-less 'वज़न १.५००' is 1.5 g", () => {
    const weights = column(f.table, "वज़न").map((v) => normalizeWeight(v, ctx("grossWeight")));
    expect(weights.filter(isIssue)).toHaveLength(0);
    expect(weights[0]).toMatchObject({ value: "25" });
    const unitless = column(f.table, "वज़न").filter((v) => v === "वज़न १.५००");
    expect(unitless).toHaveLength(4);
    expect(normalizeWeight(unitless[0], ctx("grossWeight"))).toMatchObject({ value: "1.5" });
  });

  it("rates are 2 or 3 (or 0), so the per-month/per-year question applies", () => {
    expect(detectRateUnit(column(f.table, "ब्याज दर (%)"))).toEqual({ status: "ASK", reason: "ALL_BELOW_6" });
  });

  it("customer names are never lost-in-export; four are simply blank", () => {
    const names = column(f.table, "ग्राहक का नाम").map((v) => normalizeText(v, ctx("name")));
    expect(names.filter(isIssue)).toHaveLength(0);
    expect(names.filter((n) => !isIssue(n) && n.value === null)).toHaveLength(4);
  });
});
