// lib/import/ai/mask.ts
//
// Masks a sample of the sheet BEFORE anything is sent to the AI provider.
// Pure functions, no I/O. Rules (docs/import-feature.md §6):
//  - header row plus at most 20 data rows;
//  - Aadhaar numbers never leave: a column is dropped when its header says
//    Aadhaar or any sampled cell is a 12-digit number, and stray 12-digit runs
//    inside other cells are removed;
//  - mobile numbers are reduced to their shape (98XXXXXX10);
//  - names and addresses keep the first letter of each word, every other
//    letter becomes *, and in addresses every digit becomes X.
//
// Which column holds names is decided from the header (English + Hindi
// keywords). A column with no recognised header is masked cell by cell when
// the cell looks like a person's name and the column has >= 5 distinct values
// in the sample. This errs toward over-masking.
//
// Never log the output of this module.

import type { CellValue } from "../parse";

export const MAX_SAMPLE_ROWS = 20;
export const MAX_CELL_CHARS = 200;
const MIN_DISTINCT_FOR_NAME_COLUMN = 5;

export type ColumnKind = "aadhaar" | "address" | "name" | "exempt" | "unlabelled";

const AADHAAR_HEADER = /a{1,2}dh?a{1,2}r|uidai|\buid\b|आधार/iu;
const ADDRESS_HEADER = /address|\baddr\b|residence|पता|पत्ता|निवास/iu;
// Ids, serial numbers and item/metal/type/status columns are never person names,
// even when the header also contains "name" (e.g. "itemname", "Contact ID").
const EXEMPT_HEADER =
  /\bid\b|\bcid\b|\bref\b|\bno\b|serial|\bsr\b|item|article|ornament|jewel|metal|\btype\b|status|वस्तु|सामान|जेवर|धातु|प्रकार|स्थिति|क्र/iu;
const NAME_HEADER =
  /name|party|customer|client|owner|person|contact|father|mother|spouse|husband|wife|holder|borrower|नाम|ग्राहक|पिता|माता|पति|पत्नी|पार्टी|मालिक|संपर्क|कर्जदार|उधारकर्ता/iu;

/** Order matters: Aadhaar, then address, then exempt, then name. */
export function classifyHeader(header: string): ColumnKind {
  const h = header.normalize("NFC");
  if (AADHAAR_HEADER.test(h)) return "aadhaar";
  if (ADDRESS_HEADER.test(h)) return "address";
  if (EXEMPT_HEADER.test(h)) return "exempt";
  if (NAME_HEADER.test(h)) return "name";
  return "unlabelled";
}

// 1 to 4 words made only of letters/marks (plus . ' - for initials and hyphens).
const NAME_LIKE = /^[\p{L}\p{M}.'’-]+(?: [\p{L}\p{M}.'’-]+){0,3}$/u;
const WHOLE_AADHAAR = /^(?:\d{12}|\d{4}[ -]\d{4}[ -]\d{4})$/;

export function cellToText(value: CellValue | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/\u0000/g, "").replace(/\s+/g, " ").trim();
}

/** First letter of each word kept, other letters (and combining marks) become *. */
export function maskLetters(text: string): string {
  return text.replace(/[\p{L}\p{M}]+/gu, (word) => {
    const [first = "", ...rest] = Array.from(word);
    return first + rest.map(() => "*").join("");
  });
}

export function maskAddress(text: string): string {
  return maskLetters(text).replace(/\p{Nd}/gu, "X");
}

const digitsOf = (s: string) => s.replace(/\D/g, "");

/** 9876543210 -> 98XXXXXX10 (first two and last two digits kept). */
function phoneShape(digits: string): string {
  return digits.slice(0, 2) + "X".repeat(Math.max(digits.length - 4, 0)) + digits.slice(-2);
}

/**
 * Removes Aadhaar-shaped digit runs entirely and reduces phone-shaped runs to
 * their shape. Any 12-digit run is treated as Aadhaar, including a phone number
 * written with a 91 prefix: over-redacting is the safe direction.
 */
export function scrubDigitRuns(text: string): string {
  return text
    .replace(/(?<!\d)\d{4}[ -]\d{4}[ -]\d{4}(?!\d)/g, "")
    .replace(/(?<!\d)\d{10,13}(?!\d)/g, (run) => (run.length === 12 ? "" : phoneShape(run)))
    .replace(/(?<!\d)(?:\+?91[ -]?)?\d{5}[ -]\d{5}(?!\d)/g, (run) => phoneShape(digitsOf(run)));
}

export type MaskedSample = {
  headers: string[];
  rows: string[][];
  /** Classification per column, exposed for tests and diagnostics. */
  kinds: ColumnKind[];
};

export type MaskInput = {
  headers: readonly string[];
  rows: readonly { cells: readonly CellValue[] }[];
};

export function maskSample(table: MaskInput): MaskedSample {
  const sample = table.rows.slice(0, MAX_SAMPLE_ROWS);
  const raw = sample.map((row) => table.headers.map((_, c) => cellToText(row.cells[c])));

  const kinds: ColumnKind[] = table.headers.map((header, c) => {
    const byHeader = classifyHeader(header);
    if (byHeader === "aadhaar") return "aadhaar";
    // Any 12-digit cell marks the whole column as Aadhaar, whatever the header says.
    if (raw.some((row) => WHOLE_AADHAAR.test(row[c] ?? ""))) return "aadhaar";
    return byHeader;
  });

  const distinct = table.headers.map((_, c) => new Set(raw.map((row) => row[c]).filter(Boolean)).size);

  const rows = raw.map((row) =>
    row.map((text, c) => {
      if (text === "") return "";
      const kind = kinds[c];
      if (kind === "aadhaar") return "";
      let out = text;
      if (kind === "address") out = maskAddress(out);
      else if (kind === "name") out = maskLetters(out);
      else if (
        kind === "unlabelled" &&
        (distinct[c] ?? 0) >= MIN_DISTINCT_FOR_NAME_COLUMN &&
        NAME_LIKE.test(out)
      ) {
        out = maskLetters(out);
      }
      out = scrubDigitRuns(out);
      return out.length > MAX_CELL_CHARS ? out.slice(0, MAX_CELL_CHARS) : out;
    }),
  );

  return { headers: [...table.headers], rows, kinds };
}
