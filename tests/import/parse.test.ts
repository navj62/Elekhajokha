import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import {
  IMPORT_LIMITS,
  ImportParseError,
  detectFileKind,
  extractTable,
  findHeaderRow,
  listSheets,
  readSheet,
  type CellValue,
} from "../../lib/import/parse";

// ─── helpers ────────────────────────────────────────────────────────────────

async function xlsx(build: (wb: ExcelJS.Workbook) => void): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  build(wb);
  return Buffer.from(await wb.xlsx.writeBuffer());
}

const csv = (text: string) => Buffer.from(text, "utf8");

async function codeOf(promise: Promise<unknown>): Promise<string | undefined> {
  try {
    await promise;
    return undefined;
  } catch (error) {
    return error instanceof ImportParseError ? error.code : `NOT_PARSE_ERROR:${String(error)}`;
  }
}

function codeOfSync(fn: () => unknown): string | undefined {
  try {
    fn();
    return undefined;
  } catch (error) {
    return error instanceof ImportParseError ? error.code : "NOT_PARSE_ERROR";
  }
}

// ─── type detection ─────────────────────────────────────────────────────────

describe("detectFileKind", () => {
  it("detects xlsx by the PK signature and csv by text", async () => {
    const book = await xlsx((wb) => wb.addWorksheet("A").addRow(["x"]));
    expect(detectFileKind(book, "ledger.xlsx")).toBe("xlsx");
    expect(detectFileKind(csv("a,b\n1,2\n"), "ledger.csv")).toBe("csv");
    expect(detectFileKind(book, "LEDGER.XLSX")).toBe("xlsx");
  });

  it("rejects a mismatch between content and extension, both ways", async () => {
    const book = await xlsx((wb) => wb.addWorksheet("A").addRow(["x"]));
    expect(codeOfSync(() => detectFileKind(book, "ledger.csv"))).toBe("TYPE_MISMATCH");
    expect(codeOfSync(() => detectFileKind(csv("a,b\n"), "ledger.xlsx"))).toBe("TYPE_MISMATCH");
  });

  it("rejects other extensions, legacy .xls, empty and oversized files", () => {
    expect(codeOfSync(() => detectFileKind(csv("a"), "x.pdf"))).toBe("UNSUPPORTED_TYPE");
    expect(codeOfSync(() => detectFileKind(csv("a"), "noextension"))).toBe("UNSUPPORTED_TYPE");
    const ole = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    expect(codeOfSync(() => detectFileKind(ole, "old.xls"))).toBe("UNSUPPORTED_TYPE");
    expect(codeOfSync(() => detectFileKind(ole, "old.xlsx"))).toBe("UNSUPPORTED_TYPE");
    expect(codeOfSync(() => detectFileKind(Buffer.alloc(0), "a.csv"))).toBe("EMPTY_FILE");
    expect(codeOfSync(() => detectFileKind(Buffer.alloc(IMPORT_LIMITS.maxBytes + 1, 0x61), "a.csv"))).toBe("FILE_TOO_LARGE");
  });

  it("rejects UTF-16 by BOM and by NUL density, but tolerates a few stray NULs", () => {
    const utf16 = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from("a,b\n1,2\n", "utf16le")]);
    expect(codeOfSync(() => detectFileKind(utf16, "a.csv"))).toBe("UNSUPPORTED_ENCODING");
    const noBom = Buffer.from("a,b\n1,2\n", "utf16le");
    expect(codeOfSync(() => detectFileKind(noBom, "a.csv"))).toBe("UNSUPPORTED_ENCODING");
    const padding = "name,address\n" + "Ramesh Kumar,Bus Stand\n".repeat(50);
    expect(detectFileKind(Buffer.from(padding + "1,\u0000x\n"), "a.csv")).toBe("csv");
  });

  it("rejects a zip that is not a workbook", async () => {
    const wb = new ExcelJS.Workbook();
    wb.addWorksheet("A").addRow(["x"]);
    const real = Buffer.from(await wb.xlsx.writeBuffer());
    // Rename the workbook entry in both its local and central headers.
    const fake = Buffer.from(real);
    let at = fake.indexOf("xl/workbook.xml");
    while (at >= 0) {
      fake.write("xl/workbookXXX", at, "utf8");
      at = fake.indexOf("xl/workbook.xml", at + 1);
    }
    expect(await codeOf(listSheets(fake, "a.xlsx"))).toBe("UNSUPPORTED_TYPE");
    expect(await codeOf(listSheets(Buffer.from("PK\u0003\u0004garbage-not-a-zip"), "a.xlsx"))).toBe("CORRUPT_FILE");
  });
});

// ─── xlsx ───────────────────────────────────────────────────────────────────

describe("xlsx reading", () => {
  it("lists the real sheet names, in tab order", async () => {
    const book = await xlsx((wb) => {
      wb.addWorksheet("खाता बही").addRow(["a"]);
      wb.addWorksheet("Rates & Terms").addRow(["b"]);
    });
    const listed = await listSheets(book, "a.xlsx");
    expect(listed.kind).toBe("xlsx");
    expect(listed.sheets.map((s) => s.name)).toEqual(["खाता बही", "Rates & Terms"]);
  });

  it("returns rows as arrays; row N is rows[N-1] and blank rows are kept", async () => {
    const book = await xlsx((wb) => {
      const ws = wb.addWorksheet("S");
      ws.addRow(["Title"]);
      ws.addRow([]);
      ws.addRow(["name", "amount"]);
      ws.addRow(["Ramesh", 5000]);
    });
    const { rows, sheetName } = await readSheet(book, "a.xlsx");
    expect(sheetName).toBe("S");
    expect(rows).toEqual([["Title", null], [null, null], ["name", "amount"], ["Ramesh", 5000]]);
  });

  it("needs a sheet name when there are several, and rejects an unknown one", async () => {
    const book = await xlsx((wb) => {
      wb.addWorksheet("A").addRow(["1"]);
      wb.addWorksheet("B").addRow(["2"]);
    });
    expect(await codeOf(readSheet(book, "a.xlsx"))).toBe("SHEET_NOT_FOUND");
    expect(await codeOf(readSheet(book, "a.xlsx", "C"))).toBe("SHEET_NOT_FOUND");
    expect((await readSheet(book, "a.xlsx", "B")).rows).toEqual([["2"]]);
  });

  it("turns date cells into YYYY-MM-DD with no timezone shift", async () => {
    const book = await xlsx((wb) => {
      const ws = wb.addWorksheet("S");
      ws.addRow([new Date(Date.UTC(2026, 3, 3)), new Date(Date.UTC(2026, 0, 1)), new Date(Date.UTC(2025, 11, 31, 23, 59))]);
    });
    const { rows } = await readSheet(book, "a.xlsx");
    // Same result under any TZ, including Asia/Kolkata (+05:30), where a local-time
    // read of UTC midnight would still give the right day but 23:59 UTC would not.
    expect(rows[0]).toEqual(["2026-04-03", "2026-01-01", "2025-12-31"]);
  });

  it("returns the cached result of a formula and never evaluates it", async () => {
    const book = await xlsx((wb) => {
      const ws = wb.addWorksheet("S");
      ws.getCell("A1").value = { formula: "1+2", result: 42 };
      ws.getCell("B1").value = { formula: "A1*1000", result: undefined as unknown as number };
      ws.getCell("C1").value = { formula: 'HYPERLINK("http://x","y")', result: "label" };
      ws.getCell("D1").value = { formula: "1/0", result: { error: "#DIV/0!" } } as ExcelJS.CellFormulaValue;
    });
    const { rows } = await readSheet(book, "a.xlsx");
    expect(rows[0]).toEqual([42, null, "label", null]);
  });

  it("flattens rich text and hyperlinks, and keeps numbers, booleans and text", async () => {
    const book = await xlsx((wb) => {
      const ws = wb.addWorksheet("S");
      ws.getCell("A1").value = { richText: [{ text: "Hel" }, { text: "lo", font: { bold: true } }] };
      ws.getCell("B1").value = { text: "link text", hyperlink: "https://example.com" };
      ws.getCell("C1").value = true;
      ws.getCell("D1").value = 12.5;
      ws.getCell("E1").value = "०३४";
    });
    const { rows } = await readSheet(book, "a.xlsx");
    expect(rows[0]).toEqual(["Hello", "link text", true, 12.5, "०३४"]);
  });

  it("returns merged ranges as metadata (1-based, inclusive) beside the top-left value", async () => {
    const book = await xlsx((wb) => {
      const ws = wb.addWorksheet("S");
      ws.addRow(["Shop", "Name"]);
      ws.addRow(["Alpha", "A"]);
      ws.addRow([null, "B"]);
      ws.addRow([null, "C"]);
      ws.mergeCells("A2:A4");
      ws.mergeCells("C1:E1");
    });
    const { rows, merges } = await readSheet(book, "a.xlsx");
    expect(merges).toEqual(
      expect.arrayContaining([
        { top: 2, left: 1, bottom: 4, right: 1 },
        { top: 1, left: 3, bottom: 1, right: 5 },
      ]),
    );
    expect(merges).toHaveLength(2);
    expect(rows[1]?.[0]).toBe("Alpha");
    expect(rows[2]?.[0]).toBeNull();
    expect(rows[3]?.[0]).toBeNull();
  });

  it("returns no merges for an unmerged sheet and for a CSV", async () => {
    const book = await xlsx((wb) => wb.addWorksheet("S").addRow(["a", "b"]));
    expect((await readSheet(book, "a.xlsx")).merges).toEqual([]);
    expect((await readSheet(csv("a,b\n1,2\n"), "a.csv")).merges).toEqual([]);
  });

  it("keeps a merged value once, in its first cell", async () => {
    const book = await xlsx((wb) => {
      const ws = wb.addWorksheet("S");
      ws.mergeCells("A1:D1");
      ws.getCell("A1").value = "Monthly ledger";
      ws.addRow(["a", "b", "c", "d"]);
    });
    const { rows } = await readSheet(book, "a.xlsx");
    expect(rows[0]).toEqual(["Monthly ledger", null, null, null]);
  });
});

describe("xlsx limits", () => {
  it("stops a sheet with too many rows", async () => {
    const book = await xlsx((wb) => {
      const ws = wb.addWorksheet("S");
      for (let i = 0; i < IMPORT_LIMITS.maxPhysicalRows + 5; i++) ws.addRow([i]);
    });
    expect(await codeOf(listSheets(book, "a.xlsx"))).toBe("TOO_MANY_ROWS");
    expect(await codeOf(readSheet(book, "a.xlsx", "S"))).toBe("TOO_MANY_ROWS");
  });

  it("stops a sheet with too many columns", async () => {
    const book = await xlsx((wb) => {
      wb.addWorksheet("S").addRow(Array.from({ length: IMPORT_LIMITS.maxColumns + 1 }, (_, i) => i));
    });
    expect(await codeOf(listSheets(book, "a.xlsx"))).toBe("TOO_MANY_COLUMNS");
  });

  it("stops a workbook with too many cells", async () => {
    const book = await xlsx((wb) => {
      for (let s = 0; s < 4; s++) {
        const ws = wb.addWorksheet(`S${s}`);
        for (let r = 0; r < 700; r++) ws.addRow(Array.from({ length: 60 }, (_, c) => c));
      }
    });
    expect(await codeOf(listSheets(book, "a.xlsx"))).toBe("TOO_MANY_CELLS");
  });

  it("stops a workbook with too many sheets", async () => {
    const book = await xlsx((wb) => {
      for (let i = 0; i < IMPORT_LIMITS.maxSheets + 1; i++) wb.addWorksheet(`S${i}`).addRow([i]);
    });
    expect(await codeOf(listSheets(book, "a.xlsx"))).toBe("TOO_MANY_SHEETS");
  });

  it("refuses a zip whose declared uncompressed size is unreasonable, before inflating", async () => {
    const real = await xlsx((wb) => wb.addWorksheet("S").addRow(["x"]));
    const forged = Buffer.from(real);
    // Central directory entry: signature 0x02014b50, uncompressed size at +24.
    const cd = forged.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
    forged.writeUInt32LE(IMPORT_LIMITS.maxUncompressedBytes + 1, cd + 24);
    expect(await codeOf(listSheets(forged, "a.xlsx"))).toBe("ZIP_TOO_LARGE");
  });

  it("refuses a file whose end-of-zip record is missing", async () => {
    const real = await xlsx((wb) => wb.addWorksheet("S").addRow(["x"]));
    expect(await codeOf(listSheets(real.subarray(0, real.length - 30), "a.xlsx"))).toBe("CORRUPT_FILE");
  });

  it("never puts file contents in an error message", async () => {
    const book = await xlsx((wb) => {
      const ws = wb.addWorksheet("SecretSheetName");
      for (let i = 0; i < IMPORT_LIMITS.maxPhysicalRows + 5; i++) ws.addRow(["SecretCustomerName"]);
    });
    try {
      await listSheets(book, "secret-file.xlsx");
      throw new Error("should have failed");
    } catch (error) {
      expect(String((error as Error).message)).not.toMatch(/Secret|secret/);
    }
  });
});

// ─── csv ────────────────────────────────────────────────────────────────────

describe("csv reading", () => {
  it("has one sheet named CSV", async () => {
    expect((await listSheets(csv("a,b\n1,2\n"), "a.csv")).sheets).toEqual([{ name: "CSV" }]);
  });

  it("drops a UTF-8 BOM so the first header is clean", async () => {
    const { rows } = await readSheet(csv("﻿name,date\nA,2026-04-03\n"), "a.csv");
    expect(rows[0]).toEqual(["name", "date"]);
    expect(rows[0]?.[0]).toBe("name");
  });

  it("keeps every value as raw text: no date, number or leading-zero conversion", async () => {
    const text = 'name,date,amt,phone,code,sci\nA,03/04/2026,"1,25,000",0098765,007,1e3\nB,2026-04-03,12.50,+91 98765 43210,"0012",1.10\n';
    const { rows } = await readSheet(csv(text), "a.csv");
    expect(rows[1]).toEqual(["A", "03/04/2026", "1,25,000", "0098765", "007", "1e3"]);
    expect(rows[2]).toEqual(["B", "2026-04-03", "12.50", "+91 98765 43210", "0012", "1.10"]);
    for (const row of rows) for (const cell of row) expect(typeof cell === "string" || cell === null).toBe(true);
  });

  it("keeps ISO dates unshifted under any timezone", async () => {
    const { rows } = await readSheet(csv("d\n2026-04-03\n"), "a.csv");
    expect(rows[1]).toEqual(["2026-04-03"]);
  });

  it("reads Hindi text, quoted commas and multi-line cells; blank cells are null", async () => {
    const { rows } = await readSheet(csv('नाम,पता,note\n"शर्मा, रमेश","बस\nस्टैंड",\n'), "a.csv");
    expect(rows[1]).toEqual(["शर्मा, रमेश", "बस\nस्टैंड", null]);
  });

  it("detects a semicolon or tab delimiter", async () => {
    expect((await readSheet(csv("a;b;c\n1;2;3\n"), "a.csv")).rows[1]).toEqual(["1", "2", "3"]);
    expect((await readSheet(csv("a\tb\tc\n1\t2\t3\n"), "a.csv")).rows[1]).toEqual(["1", "2", "3"]);
  });

  it("keeps blank lines as blank rows so row numbers match the file", async () => {
    const { rows } = await readSheet(csv("a,b\n\n1,2\n"), "a.csv");
    expect(rows).toEqual([["a", "b"], [null, null], ["1", "2"]]);
  });

  it("strips stray NUL bytes from values", async () => {
    const padding = "a,b\n" + "Ramesh Kumar,Bus Stand\n".repeat(50);
    const { rows } = await readSheet(Buffer.from(padding + "1,\u0000x\n"), "a.csv");
    expect(rows[51]).toEqual(["1", "x"]);
  });

  it("rejects invalid UTF-8 with UNSUPPORTED_ENCODING", async () => {
    const latin1 = Buffer.concat([Buffer.from("name\n"), Buffer.from([0x52, 0xe9, 0x6d, 0x79])]);
    expect(await codeOf(readSheet(latin1, "a.csv"))).toBe("UNSUPPORTED_ENCODING");
    expect(await codeOf(listSheets(latin1, "a.csv"))).toBe("UNSUPPORTED_ENCODING");
  });

  it("enforces the row and column limits", async () => {
    const tall = "a\n" + "x\n".repeat(IMPORT_LIMITS.maxPhysicalRows + 5);
    expect(await codeOf(readSheet(csv(tall), "a.csv"))).toBe("TOO_MANY_ROWS");
    const wide = Array.from({ length: IMPORT_LIMITS.maxColumns + 1 }, (_, i) => `c${i}`).join(",") + "\n";
    expect(await codeOf(readSheet(csv(wide), "a.csv"))).toBe("TOO_MANY_COLUMNS");
  });
});

// ─── header row and table ───────────────────────────────────────────────────

const row = (...cells: CellValue[]) => cells;

describe("findHeaderRow", () => {
  it("finds a header in the first row", () => {
    const rows = [row("name", "amount", "date"), row("A", "100", "2026-01-01"), row("B", "200", "2026-01-02")];
    expect(findHeaderRow(rows)).toBe(0);
  });

  it("skips a title row, blank rows and a note line", () => {
    const rows = [
      row("Monthly ledger – April", null, null, null),
      row("Sample data", null, null, null),
      row(null, null, null, null),
      row("name", "address", "amount", "date"),
      row("A", "Bus Stand", 100, "2026-01-01"),
    ];
    expect(findHeaderRow(rows)).toBe(3);
  });

  it("skips a sparse grouping band above the real headers", () => {
    const rows = [
      row("Customer", null, null, null, "Loan", null, null, "Item", null, "Release", null, null, null),
      row("No", "Shop", "Name", "Address", "Amount", "Date", "Rate", "Item", "Weight", "Release date", "Period", "Interest", "Due"),
      row(1, "S", "A", "x", 100, "2026-04-03", 2, "Ring", "4 gm", null, null, null, null),
    ];
    expect(findHeaderRow(rows)).toBe(1);
  });

  it("does not take a row of numbers or dates for a header", () => {
    const rows = [row("1", "2", "3"), row("name", "amount", "date"), row("A", "100", "2026-01-01")];
    expect(findHeaderRow(rows)).toBe(1);
  });

  it("does not take a row with repeated labels for a header", () => {
    const rows = [row("x", "x", "x", "x"), row("name", "amount", "date", "rate"), row("A", 1, 2, 3)];
    expect(findHeaderRow(rows)).toBe(1);
  });

  it("returns null for an empty or one-column sheet", () => {
    expect(findHeaderRow([])).toBeNull();
    expect(findHeaderRow([row(null, null), row(null, null)])).toBeNull();
    expect(findHeaderRow([row("only"), row("A"), row("B")])).toBeNull();
  });

  it("treats Hindi headers like any other text", () => {
    const rows = [row("ग्राहक का नाम", "पता", "ऋण राशि"), row("रमेश", "बस स्टैंड", 5000)];
    expect(findHeaderRow(rows)).toBe(0);
  });
});

describe("extractTable", () => {
  it("returns headers and data rows with the sheet's own row numbers", () => {
    const rows = [row("Title", null), row("name", "amount"), row("A", 1), row("B", 2)];
    const table = extractTable(rows, 1);
    expect(table.headerRowNumber).toBe(2);
    expect(table.headers).toEqual(["name", "amount"]);
    expect(table.rows).toEqual([{ rowNumber: 3, cells: ["A", 1] }, { rowNumber: 4, cells: ["B", 2] }]);
  });

  it("skips blank rows, total rows and repeated header rows, and counts them", () => {
    const rows = [
      row("name", "amount"),
      row("A", 1),
      row(null, null),
      row("name", "amount"),
      row("Total", 99),
      row("कुल योग", 99),
      row("B", 2),
    ];
    const table = extractTable(rows, 0);
    expect(table.rows.map((r) => r.rowNumber)).toEqual([2, 7]);
    expect(table.skipped).toEqual({ blank: 1, total: 2, note: 0, repeatedHeader: 1 });
  });

  describe("note rows", () => {
    const header = row("name", "address", "amount", "date");

    it("skips a row with one text cell, wherever the cell is, and counts it", () => {
      const rows = [
        header,
        row("A", "x", 100, "2026-01-01"),
        row("Note: some amounts are text", null, null, null),
        row(null, null, "see page 2", null),
        row("B", "y", 200, "2026-01-02"),
      ];
      const table = extractTable(rows, 0);
      expect(table.rows.map((r) => r.rowNumber)).toEqual([2, 5]);
      expect(table.skipped.note).toBe(2);
    });

    it("keeps a one-cell row whose cell is a number or a date", () => {
      const rows = [header, row(null, null, 500, null), row(null, null, null, "2026-01-02"), row("12,500", null, null, null), row("03/04/2026", null, null, null)];
      const table = extractTable(rows, 0);
      expect(table.rows).toHaveLength(4);
      expect(table.skipped.note).toBe(0);
    });

    it("keeps a row with two or more cells, even if both are text", () => {
      const rows = [header, row("Ramesh", "Bus Stand", null, null)];
      expect(extractTable(rows, 0).rows).toHaveLength(1);
    });

    it("does not apply to a table narrower than 3 columns", () => {
      const rows = [row("name", "amount"), row("Ramesh", null), row("Sita", null)];
      const table = extractTable(rows, 0);
      expect(table.rows).toHaveLength(2);
      expect(table.skipped.note).toBe(0);
    });

    it("is not confused with a total row or a blank row", () => {
      const rows = [header, row("Total", null, null, null), row(null, null, null, null), row("a long remark here", null, null, null)];
      expect(extractTable(rows, 0).skipped).toEqual({ blank: 1, total: 1, note: 1, repeatedHeader: 0 });
    });
  });

  it("does not mistake a name that starts with a total word for a total row", () => {
    const rows = [row("name", "amount"), row("कुलदीप", 5), row("Totally Gold", 6), row("Total Jewellers", 7)];
    expect(extractTable(rows, 0).rows).toHaveLength(3);
  });

  it("names empty headers and de-duplicates repeated ones", () => {
    const rows = [row("a", null, "a", "A", "b"), row(1, 2, 3, 4, 5)];
    expect(extractTable(rows, 0).headers).toEqual(["a", "Column 2", "a (2)", "A (3)", "b"]);
  });

  it("trims trailing empty columns and pads short rows", () => {
    const rows = [row("a", "b", null, null), row("1")];
    const table = extractTable(rows, 0);
    expect(table.headers).toEqual(["a", "b"]);
    expect(table.rows[0]?.cells).toEqual(["1", null]);
  });

  it("allows exactly 2,000 data rows and rejects 2,001", () => {
    const make = (n: number) => [row("a", "b"), ...Array.from({ length: n }, (_, i) => row(`x${i}`, i))];
    expect(extractTable(make(IMPORT_LIMITS.maxDataRows), 0).rows).toHaveLength(IMPORT_LIMITS.maxDataRows);
    expect(codeOfSync(() => extractTable(make(IMPORT_LIMITS.maxDataRows + 1), 0))).toBe("TOO_MANY_ROWS");
  });

  it("throws NO_HEADER_ROW for an index outside the sheet", () => {
    expect(codeOfSync(() => extractTable([], 0))).toBe("NO_HEADER_ROW");
  });
});
