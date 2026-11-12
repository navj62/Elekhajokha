// lib/import/parse.ts
//
// Reads an uploaded .xlsx or .csv into rows of plain cell values
// (docs/import-feature.md §4 step 2, §14 "Uploads"). Pure: no database, no
// network, no AI. Server-side only (exceljs is a Node library).
//
//  - The real type comes from the CONTENT ("PK" = xlsx), and must agree with
//    the extension.
//  - xlsx is read in two passes. Pass 1 inspects the zip itself: every entry
//    is inflated under a cap equal to its declared size, and rows, columns and
//    cells are counted from the sheet XML, so an oversized or "bomb" file is
//    stopped early. Pass 2 loads the workbook for values. (exceljs's streaming
//    reader is not used: it cannot tell date cells from numbers, spools sheets
//    to temp files, and fails on some valid files.)
//  - Formula cells give their cached value. Nothing is ever evaluated.
//  - xlsx dates become "YYYY-MM-DD" with no timezone shift.
//  - CSV values stay raw text: exceljs would otherwise turn dates into Date
//    objects (shifted by the local timezone), "1e3" into a number and drop
//    leading zeros, so conversion is switched off with an identity map.
//
// Errors carry a stable code and a generic message. They never contain file
// contents, names or numbers from the file.

import ExcelJS from "exceljs";
import { Readable } from "node:stream";
import { inflateRawSync } from "node:zlib";

export const IMPORT_LIMITS = {
  maxBytes: 5 * 1024 * 1024,
  maxDataRows: 2000,
  /** Physical rows, header and junk included: 2,000 data rows plus room for titles and totals. */
  maxPhysicalRows: 2200,
  maxSheets: 20,
  maxColumns: 60,
  maxCells: 150_000,
  /** A real 5 MB spreadsheet expands to a few tens of MB at most. */
  maxZipEntries: 300,
  maxUncompressedBytes: 100 * 1024 * 1024,
} as const;

export type ParseErrorCode =
  | "EMPTY_FILE"
  | "FILE_TOO_LARGE"
  | "UNSUPPORTED_TYPE"
  | "TYPE_MISMATCH"
  | "UNSUPPORTED_ENCODING"
  | "CORRUPT_FILE"
  | "TOO_MANY_SHEETS"
  | "TOO_MANY_COLUMNS"
  | "TOO_MANY_ROWS"
  | "TOO_MANY_CELLS"
  | "ZIP_TOO_LARGE"
  | "SHEET_NOT_FOUND"
  | "NO_HEADER_ROW";

const MESSAGES: Record<ParseErrorCode, string> = {
  EMPTY_FILE: "The file is empty.",
  FILE_TOO_LARGE: "The file is larger than 5 MB.",
  UNSUPPORTED_TYPE: "Only .xlsx and .csv files can be imported.",
  TYPE_MISMATCH: "The file contents do not match its extension.",
  UNSUPPORTED_ENCODING: "This CSV is not UTF-8. Save it again as 'CSV UTF-8' and upload it.",
  CORRUPT_FILE: "The file could not be read. It may be damaged.",
  TOO_MANY_SHEETS: "The workbook has too many sheets.",
  TOO_MANY_COLUMNS: "The sheet has too many columns.",
  TOO_MANY_ROWS: "The sheet has more than 2,000 data rows.",
  TOO_MANY_CELLS: "The sheet has too much data.",
  ZIP_TOO_LARGE: "The file expands to an unreasonable size.",
  SHEET_NOT_FOUND: "That sheet does not exist in this file.",
  NO_HEADER_ROW: "No header row could be found in this sheet.",
};

export class ImportParseError extends Error {
  readonly code: ParseErrorCode;
  constructor(code: ParseErrorCode) {
    super(MESSAGES[code]);
    this.name = "ImportParseError";
    this.code = code;
  }
}

/** One cell as the parser hands it on. xlsx date cells are already "YYYY-MM-DD" strings. */
export type CellValue = string | number | boolean | null;
export type FileKind = "xlsx" | "csv";

// ─── Type detection ──────────────────────────────────────────────────────────

const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04];
const OLE_MAGIC = [0xd0, 0xcf, 0x11, 0xe0]; // legacy .xls

function startsWith(buf: Buffer, magic: number[]): boolean {
  return magic.every((byte, i) => buf[i] === byte);
}

function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot < 0 ? "" : fileName.slice(dot).toLowerCase();
}

/**
 * Real type from content; the extension must be .xlsx or .csv and must agree.
 * Throws ImportParseError.
 */
export function detectFileKind(buffer: Buffer, fileName: string): FileKind {
  if (buffer.length === 0) throw new ImportParseError("EMPTY_FILE");
  if (buffer.length > IMPORT_LIMITS.maxBytes) throw new ImportParseError("FILE_TOO_LARGE");

  const ext = extensionOf(fileName);
  if (ext !== ".xlsx" && ext !== ".csv") throw new ImportParseError("UNSUPPORTED_TYPE");

  let kind: FileKind;
  if (startsWith(buffer, ZIP_MAGIC)) {
    kind = "xlsx";
  } else if (startsWith(buffer, OLE_MAGIC)) {
    throw new ImportParseError("UNSUPPORTED_TYPE");
  } else {
    // Text. UTF-16 (BOM, or a NUL after most characters) and binary files are
    // refused. A few stray NUL bytes in otherwise valid UTF-8 are tolerated:
    // some exports emit them, and decodeCsv strips them.
    const head = buffer.subarray(0, 8192);
    const utf16Bom =
      (head[0] === 0xff && head[1] === 0xfe) || (head[0] === 0xfe && head[1] === 0xff);
    let nuls = 0;
    for (const byte of head) if (byte === 0) nuls++;
    if (utf16Bom || nuls > head.length * 0.05) throw new ImportParseError("UNSUPPORTED_ENCODING");
    kind = "csv";
  }
  if ((kind === "xlsx") !== (ext === ".xlsx")) throw new ImportParseError("TYPE_MISMATCH");
  return kind;
}

// ─── xlsx: zip inspection (pass 1) ───────────────────────────────────────────

type ZipEntry = {
  name: string;
  method: number;
  compressed: number;
  uncompressed: number;
  headerOffset: number;
};

/**
 * Lists the zip's central directory without inflating anything. Rejects too
 * many entries and a declared total size that is unreasonable. ZIP64 is
 * refused: a 5 MB spreadsheet never needs it.
 */
function listZipEntries(buffer: Buffer): ZipEntry[] {
  const minEocd = 22;
  let eocd = -1;
  const searchFrom = Math.max(0, buffer.length - (minEocd + 0xffff));
  for (let i = buffer.length - minEocd; i >= searchFrom; i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new ImportParseError("CORRUPT_FILE");

  const entryCount = buffer.readUInt16LE(eocd + 10);
  const dirSize = buffer.readUInt32LE(eocd + 12);
  const dirOffset = buffer.readUInt32LE(eocd + 16);
  if (entryCount === 0xffff || dirSize === 0xffffffff || dirOffset === 0xffffffff) {
    throw new ImportParseError("ZIP_TOO_LARGE");
  }
  if (entryCount > IMPORT_LIMITS.maxZipEntries) throw new ImportParseError("ZIP_TOO_LARGE");
  if (dirOffset + dirSize > buffer.length) throw new ImportParseError("CORRUPT_FILE");

  const entries: ZipEntry[] = [];
  let pos = dirOffset;
  let total = 0;
  for (let i = 0; i < entryCount; i++) {
    if (pos + 46 > buffer.length || buffer.readUInt32LE(pos) !== 0x02014b50) {
      throw new ImportParseError("CORRUPT_FILE");
    }
    const uncompressed = buffer.readUInt32LE(pos + 24);
    const nameLength = buffer.readUInt16LE(pos + 28);
    const extraLength = buffer.readUInt16LE(pos + 30);
    const commentLength = buffer.readUInt16LE(pos + 32);
    if (uncompressed === 0xffffffff) throw new ImportParseError("ZIP_TOO_LARGE");
    total += uncompressed;
    if (total > IMPORT_LIMITS.maxUncompressedBytes) throw new ImportParseError("ZIP_TOO_LARGE");
    entries.push({
      name: buffer.toString("utf8", pos + 46, pos + 46 + nameLength),
      method: buffer.readUInt16LE(pos + 10),
      compressed: buffer.readUInt32LE(pos + 20),
      uncompressed,
      headerOffset: buffer.readUInt32LE(pos + 42),
    });
    pos += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

/**
 * Inflates one entry, never producing more than its declared size. A file
 * whose real content is bigger than it claims (a zip bomb) fails here, before
 * the workbook loader ever sees it.
 */
function inflateEntry(buffer: Buffer, entry: ZipEntry): Buffer {
  const { headerOffset, method, compressed, uncompressed } = entry;
  if (headerOffset + 30 > buffer.length || buffer.readUInt32LE(headerOffset) !== 0x04034b50) {
    throw new ImportParseError("CORRUPT_FILE");
  }
  const dataStart =
    headerOffset + 30 + buffer.readUInt16LE(headerOffset + 26) + buffer.readUInt16LE(headerOffset + 28);
  if (dataStart + compressed > buffer.length) throw new ImportParseError("CORRUPT_FILE");
  const raw = buffer.subarray(dataStart, dataStart + compressed);
  if (method === 0) return raw;
  if (method !== 8) throw new ImportParseError("CORRUPT_FILE");
  try {
    return inflateRawSync(raw, { maxOutputLength: Math.max(uncompressed, 1) });
  } catch (error) {
    if ((error as { code?: string }).code === "ERR_BUFFER_TOO_LARGE") {
      throw new ImportParseError("ZIP_TOO_LARGE");
    }
    throw new ImportParseError("CORRUPT_FILE");
  }
}

const XML_ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

function decodeXmlText(text: string): string {
  return text.replace(/&(#x[0-9a-fA-F]+|#\d+|amp|lt|gt|quot|apos);/g, (_, ref: string) => {
    if (ref.startsWith("#x")) return String.fromCodePoint(parseInt(ref.slice(2), 16));
    if (ref.startsWith("#")) return String.fromCodePoint(parseInt(ref.slice(1), 10));
    return XML_ENTITIES[ref] ?? "";
  });
}

function columnNumber(letters: string): number {
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
}

/** Highest row and column holding a value, and how many cells hold one. */
function measureSheetXml(xml: string): { rows: number; columns: number; cells: number } {
  let rows = 0;
  let columns = 0;
  let cells = 0;
  // <c r="B7" ...>...</c> has content; <c r="B7" s="3"/> is an empty styled cell.
  for (const match of xml.matchAll(/<c\b([^>]*?)(\/?)>/g)) {
    if (match[2] === "/") continue;
    const ref = /\br="([A-Z]{1,3})(\d+)"/.exec(match[1] ?? "");
    if (!ref) continue;
    cells++;
    rows = Math.max(rows, Number(ref[2]));
    columns = Math.max(columns, columnNumber(ref[1] ?? ""));
  }
  return { rows, columns, cells };
}

/**
 * Pass 1 of reading an xlsx. Looks at the zip itself, inflating every entry
 * under a hard size cap, and checks the sheets against the row, column and
 * cell limits as it goes, so an oversized or "bomb" file is stopped early.
 * Also returns the sheet names in tab order, read from xl/workbook.xml.
 */
function inspectXlsx(buffer: Buffer): { sheetNames: string[] } {
  const entries = listZipEntries(buffer);
  const workbookEntry = entries.find((e) => e.name === "xl/workbook.xml");
  if (!workbookEntry) throw new ImportParseError("UNSUPPORTED_TYPE");

  const workbookXml = inflateEntry(buffer, workbookEntry).toString("utf8");
  const sheetNames: string[] = [];
  for (const match of workbookXml.matchAll(/<(?:\w+:)?sheet\b[^>]*?\bname="([^"]*)"/g)) {
    sheetNames.push(decodeXmlText(match[1] ?? ""));
  }
  if (sheetNames.length === 0) throw new ImportParseError("CORRUPT_FILE");
  if (sheetNames.length > IMPORT_LIMITS.maxSheets) throw new ImportParseError("TOO_MANY_SHEETS");

  let totalCells = 0;
  for (const entry of entries) {
    if (entry === workbookEntry) continue;
    const content = inflateEntry(buffer, entry);
    if (!/^xl\/worksheets\/sheet\d+\.xml$/.test(entry.name)) continue;
    const shape = measureSheetXml(content.toString("utf8"));
    totalCells += shape.cells;
    if (shape.rows > IMPORT_LIMITS.maxPhysicalRows) throw new ImportParseError("TOO_MANY_ROWS");
    if (shape.columns > IMPORT_LIMITS.maxColumns) throw new ImportParseError("TOO_MANY_COLUMNS");
    if (totalCells > IMPORT_LIMITS.maxCells) throw new ImportParseError("TOO_MANY_CELLS");
  }
  return { sheetNames };
}

// ─── xlsx: values (pass 2) ───────────────────────────────────────────────────

function isoFromDate(date: Date): string | null {
  if (Number.isNaN(date.getTime())) return null;
  // exceljs builds dates from the serial number in UTC, so UTC parts are the
  // spreadsheet's own date. Local-time getters would shift it.
  const year = date.getUTCFullYear();
  if (year < 1900) {
    // A time-only cell (fraction of a day): keep the time, not a fake date.
    const hh = String(date.getUTCHours()).padStart(2, "0");
    const mm = String(date.getUTCMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  }
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${String(year).padStart(4, "0")}-${m}-${d}`;
}

/** Plain value of one exceljs cell value (formula, rich text, link, date, error). */
function plainValue(value: ExcelJS.CellValue): CellValue {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return isoFromDate(value);
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "object") {
    const v = value as unknown as Record<string, unknown>;
    if ("error" in v) return null; // #N/A, #DIV/0!: no usable value
    if ("formula" in v || "sharedFormula" in v) {
      // Cached result only. The formula text is never read or run.
      return plainValue((v.result ?? null) as ExcelJS.CellValue);
    }
    if (Array.isArray(v.richText)) {
      return (v.richText as { text?: string }[]).map((part) => part.text ?? "").join("");
    }
    if (typeof v.text === "string") return v.text; // hyperlink
    if (v.text && typeof v.text === "object") return plainValue(v.text as ExcelJS.CellValue);
  }
  return null;
}

async function loadXlsxSheet(buffer: Buffer, sheetName: string): Promise<CellValue[][]> {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  } catch {
    throw new ImportParseError("CORRUPT_FILE");
  }
  const sheet = workbook.worksheets.find((s) => s.name === sheetName);
  if (!sheet) throw new ImportParseError("SHEET_NOT_FOUND");

  const rows: CellValue[][] = [];
  const lastRow = sheet.rowCount;
  const lastColumn = Math.min(sheet.columnCount, IMPORT_LIMITS.maxColumns);
  for (let r = 1; r <= lastRow; r++) {
    const row = sheet.getRow(r);
    const cells: CellValue[] = [];
    for (let c = 1; c <= lastColumn; c++) {
      const cell = row.getCell(c);
      // A merged range repeats the top-left value in every cell. Keep it once.
      cells.push(cell.type === ExcelJS.ValueType.Merge ? null : plainValue(cell.value));
    }
    rows.push(cells);
  }
  return rows;
}

// ─── csv ─────────────────────────────────────────────────────────────────────

function decodeCsv(buffer: Buffer): string {
  try {
    // fatal: true rejects invalid UTF-8; the BOM is dropped by default.
    // NUL characters are removed: they are export junk and Postgres text cannot hold them.
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer).replace(/\u0000/g, "");
  } catch {
    throw new ImportParseError("UNSUPPORTED_ENCODING");
  }
}

/** Comma, semicolon or tab, whichever is most common in the first line. */
function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r\n|\n|\r/, 1)[0] ?? "";
  let best = ",";
  let bestCount = 0;
  for (const candidate of [",", ";", "\t"]) {
    const count = firstLine.split(candidate).length - 1;
    if (count > bestCount) {
      best = candidate;
      bestCount = count;
    }
  }
  return best;
}

async function loadCsv(buffer: Buffer): Promise<CellValue[][]> {
  const text = decodeCsv(buffer);
  const workbook = new ExcelJS.Workbook();
  let sheet: ExcelJS.Worksheet;
  try {
    sheet = await workbook.csv.read(Readable.from([text]), {
      // Identity map: keep every value as the raw text from the file.
      map: (value: unknown) => value,
      parserOptions: { delimiter: detectDelimiter(text) },
    } as Parameters<typeof workbook.csv.read>[1]);
  } catch {
    throw new ImportParseError("CORRUPT_FILE");
  }

  if (sheet.rowCount > IMPORT_LIMITS.maxPhysicalRows) throw new ImportParseError("TOO_MANY_ROWS");
  if (sheet.columnCount > IMPORT_LIMITS.maxColumns) throw new ImportParseError("TOO_MANY_COLUMNS");
  if (sheet.rowCount * sheet.columnCount > IMPORT_LIMITS.maxCells) throw new ImportParseError("TOO_MANY_CELLS");

  const rows: CellValue[][] = [];
  for (let r = 1; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const cells: CellValue[] = [];
    for (let c = 1; c <= sheet.columnCount; c++) {
      const value = row.getCell(c).value;
      cells.push(typeof value === "string" && value === "" ? null : (value as CellValue) ?? null);
    }
    rows.push(cells);
  }
  return rows;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export type SheetInfo = { name: string };
export const CSV_SHEET_NAME = "CSV";

/** Validates the file and lists its sheets. A CSV has one sheet, named "CSV". */
export async function listSheets(
  buffer: Buffer,
  fileName: string,
): Promise<{ kind: FileKind; sheets: SheetInfo[] }> {
  const kind = detectFileKind(buffer, fileName);
  if (kind === "csv") {
    decodeCsv(buffer);
    return { kind, sheets: [{ name: CSV_SHEET_NAME }] };
  }
  const { sheetNames } = inspectXlsx(buffer);
  return { kind, sheets: sheetNames.map((name) => ({ name })) };
}

/**
 * Rows of one sheet as arrays of cell values. Row N of the sheet is
 * `rows[N - 1]`, so junk, blank and title rows are included: use
 * findHeaderRow and extractTable to separate them from the data.
 * `sheetName` may be left out for a CSV or a one-sheet workbook.
 */
export async function readSheet(
  buffer: Buffer,
  fileName: string,
  sheetName?: string,
): Promise<{ kind: FileKind; sheetName: string; rows: CellValue[][] }> {
  const kind = detectFileKind(buffer, fileName);
  if (kind === "csv") {
    return { kind, sheetName: CSV_SHEET_NAME, rows: await loadCsv(buffer) };
  }
  const { sheetNames } = inspectXlsx(buffer);
  const chosen = sheetName ?? (sheetNames.length === 1 ? sheetNames[0] : undefined);
  if (chosen === undefined || !sheetNames.includes(chosen)) {
    throw new ImportParseError("SHEET_NOT_FOUND");
  }
  return { kind, sheetName: chosen, rows: await loadXlsxSheet(buffer, chosen) };
}

// ─── Header row and table extraction ─────────────────────────────────────────

export function cellText(value: CellValue): string {
  if (value === null) return "";
  return String(value).replace(/\s+/g, " ").trim();
}

function filled(row: readonly CellValue[]): number {
  return row.reduce<number>((n, v) => (cellText(v) === "" ? n : n + 1), 0);
}

function looksLikeLabel(value: CellValue): boolean {
  const text = cellText(value);
  if (text === "" || typeof value === "number" || typeof value === "boolean") return false;
  if (/^[\d\s.,₹%/:-]+$/.test(text)) return false; // numbers, dates, ids made of digits
  return true;
}

const HEADER_SCAN_ROWS = 30;

/**
 * 0-based index of the header row, or null. Skips title rows (one filled
 * cell), blank rows and grouping bands (sparse labels above the real
 * headers): the header is the first row that is almost as full as the
 * fullest of the first rows, made of distinct text labels, and followed by a
 * row with data under most of them.
 */
export function findHeaderRow(rows: readonly (readonly CellValue[])[]): number | null {
  const scan = rows.slice(0, HEADER_SCAN_ROWS);
  const widest = scan.reduce((max, row) => Math.max(max, filled(row)), 0);
  if (widest < 2) return null;

  for (let i = 0; i < scan.length; i++) {
    const row = scan[i];
    if (!row) continue;
    const count = filled(row);
    if (count < 2 || count < widest * 0.6) continue;

    const labels = row.filter((v) => cellText(v) !== "");
    if (labels.filter(looksLikeLabel).length < labels.length * 0.8) continue;
    const distinct = new Set(labels.map((v) => cellText(v).toLowerCase())).size;
    if (distinct < labels.length * 0.8) continue;

    const next = rows.slice(i + 1, i + 6).find((r) => filled(r) > 0);
    if (!next || filled(next) < count * 0.4) continue;
    return i;
  }
  return null;
}

/** Whole-cell "total" labels, English and Hindi. Whole cell only: "कुलदीप" is a name. */
const TOTAL_LABEL =
  /^(?:grand\s+total|sub\s*-?\s*total|total|totals|कुल\s+योग|कुल|योग|जोड़|जोड)\s*[:.\-]*$/i;

export function isTotalRow(row: readonly CellValue[]): boolean {
  return row.some((v) => typeof v === "string" && TOTAL_LABEL.test(cellText(v)));
}

export type TableRow = { rowNumber: number; cells: CellValue[] };
export type Table = {
  headerRowNumber: number;
  headers: string[];
  rows: TableRow[];
  skipped: { blank: number; total: number; repeatedHeader: number };
};

/**
 * Cuts the data rows out of a sheet: headers from the header row (empty ones
 * named "Column N", duplicates suffixed), then every row below it except
 * blank rows, total rows and repeated header rows. Row numbers are the
 * sheet's own, so they can be shown to the owner. Enforces the 2,000 data
 * row limit.
 */
export function extractTable(
  rows: readonly (readonly CellValue[])[],
  headerIndex: number,
): Table {
  const headerRow = rows[headerIndex];
  if (!headerRow) throw new ImportParseError("NO_HEADER_ROW");

  let width = headerRow.length;
  while (width > 0 && cellText(headerRow[width - 1] ?? null) === "") width--;

  const seen = new Map<string, number>();
  const headers: string[] = [];
  for (let c = 0; c < width; c++) {
    let name = cellText(headerRow[c] ?? null) || `Column ${c + 1}`;
    const key = name.toLowerCase();
    const count = (seen.get(key) ?? 0) + 1;
    seen.set(key, count);
    if (count > 1) name = `${name} (${count})`;
    headers.push(name);
  }
  const headerKey = headers.map((h) => h.toLowerCase()).join("\u0001");

  const skipped = { blank: 0, total: 0, repeatedHeader: 0 };
  const out: TableRow[] = [];
  for (let i = headerIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    if (filled(row) === 0) {
      skipped.blank++;
      continue;
    }
    if (isTotalRow(row)) {
      skipped.total++;
      continue;
    }
    const cells = Array.from({ length: width }, (_, c) => row[c] ?? null);
    if (cells.map((v) => cellText(v).toLowerCase()).join("\u0001") === headerKey) {
      skipped.repeatedHeader++;
      continue;
    }
    out.push({ rowNumber: i + 1, cells });
    if (out.length > IMPORT_LIMITS.maxDataRows) throw new ImportParseError("TOO_MANY_ROWS");
  }
  return { headerRowNumber: headerIndex + 1, headers, rows: out, skipped };
}
