// lib/import/normalize/dates.ts
//
// Dates -> "YYYY-MM-DD" (docs/import-feature.md §7). Day/month order is
// decided per column (detectDateOrder), never per cell and never guessed:
// a value that could be read both ways, in a column that gave no hint,
// becomes a question for the owner.

import {
  type NormCtx,
  type NormResult,
  cleanText,
  errorIssue,
  fixed,
  isEmptyCell,
  ok,
  questionIssue,
  toAsciiDigits,
} from "./result";

export type DateOrder = "DMY" | "MDY";

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
  may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8,
  sep: 9, sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11,
  dec: 12, december: 12,
  // Hindi (nukta removed, see monthKey)
  "जनवरी": 1, "फरवरी": 2, "मार्च": 3, "अप्रैल": 4, "मई": 5, "जून": 6,
  "जुलाई": 7, "अगस्त": 8, "सितंबर": 9, "सितम्बर": 9, "अक्टूबर": 10,
  "अक्तूबर": 10, "नवंबर": 11, "नवम्बर": 11, "दिसंबर": 12, "दिसम्बर": 12,
};

function monthKey(word: string): string {
  // Remove the nukta (U+093C) so फ़रवरी and फरवरी match; compare lower case.
  return word.normalize("NFC").replace(/़/g, "").toLowerCase();
}

function monthFromWord(word: string): number | null {
  return MONTHS[monthKey(word)] ?? null;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function buildIso(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return `${String(year).padStart(4, "0")}-${pad(month)}-${pad(day)}`;
}

/**
 * Four-digit years are taken as written. Two-digit years pivot on the current
 * year: yy at or below the current yy is 20yy, above it is 19yy (in 2026,
 * "26" is 2026 and "27" is 1927).
 */
function fullYear(text: string, now: Date): { year: number; twoDigit: boolean } {
  const n = Number(text);
  if (text.length !== 2) return { year: n, twoDigit: false };
  const currentYy = now.getUTCFullYear() % 100;
  return { year: (n <= currentYy ? 2000 : 1900) + n, twoDigit: true };
}

function twoDigitNote(year: number, text: string): string {
  return `Read the 2-digit year ${text} as ${year}`;
}

/** Excel serial day numbers (1900 system) that are plausible as dates: 1927..2173. */
const SERIAL_MIN = 10_000;
const SERIAL_MAX = 80_000;

function serialToIso(serial: number): string | null {
  if (!Number.isFinite(serial) || serial < SERIAL_MIN || serial > SERIAL_MAX) return null;
  const ms = Date.UTC(1899, 11, 30) + Math.floor(serial) * 86_400_000;
  const d = new Date(ms);
  return buildIso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

const NUMERIC_PARTS = /^(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{4}|\d{2})$/;
const YEAR_FIRST = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T ].*)?$/;
const DAY_MONTHNAME_YEAR = /^(\d{1,2})[-/. ]+(\p{L}[\p{L}\p{M}]*)\.?[-/., ]+(\d{4}|\d{2})$/u;
const MONTHNAME_DAY_YEAR = /^(\p{L}[\p{L}\p{M}]*)\.?[ -/]+(\d{1,2})(?:st|nd|rd|th)?,?[ -/]+(\d{4}|\d{2})$/u;

/** Result of looking at a whole column of date text. */
export type DateOrderDetection =
  | { status: "DMY" | "MDY" }
  /** Every date is unambiguous (ISO, month names, equal day/month) or there are none. */
  | { status: "NOT_NEEDED" }
  /** Dates exist but each could be read both ways. Ask the owner (file-wide). */
  | { status: "AMBIGUOUS" }
  /** Some values prove day-first and others month-first. Ask the owner. */
  | { status: "CONFLICT" };

/**
 * Decides day/month order for one column. Any first part above 12 proves
 * dd/mm; any second part above 12 proves mm/dd; proof of both is a conflict.
 */
export function detectDateOrder(values: readonly unknown[]): DateOrderDetection {
  let dayFirst = false;
  let monthFirst = false;
  let undecided = false;
  for (const raw of values) {
    if (typeof raw !== "string") continue;
    const m = NUMERIC_PARTS.exec(toAsciiDigits(cleanText(raw)));
    if (!m) continue;
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (a > 12 && b <= 12) dayFirst = true;
    else if (b > 12 && a <= 12) monthFirst = true;
    else if (a <= 12 && b <= 12 && a !== b) undecided = true;
  }
  if (dayFirst && monthFirst) return { status: "CONFLICT" };
  if (dayFirst) return { status: "DMY" };
  if (monthFirst) return { status: "MDY" };
  if (undecided) return { status: "AMBIGUOUS" };
  return { status: "NOT_NEEDED" };
}

/**
 * Normalizes one date cell. `order` is the column's day/month order from
 * detectDateOrder (or the owner's answer). `now` is only for the two-digit
 * year pivot (tests pass a fixed value). Blank, "NULL", "-" and the
 * database zero date "0000-00-00" give { value: null }.
 */
export function normalizeDate(
  raw: unknown,
  ctx: NormCtx,
  order?: DateOrder,
  now: Date = new Date(),
): NormResult<string | null> {
  if (isEmptyCell(raw)) return ok(null);

  if (typeof raw === "number") {
    const iso = serialToIso(raw);
    return iso
      ? fixed(iso, "Converted an Excel date number")
      : errorIssue(ctx, "Not a valid date");
  }
  if (typeof raw !== "string") return errorIssue(ctx, "Not a valid date");

  const text = toAsciiDigits(cleanText(raw));
  if (/^0{4}[-/.]0{1,2}[-/.]0{1,2}/.test(text)) return ok(null);

  const isoMatch = YEAR_FIRST.exec(text);
  if (isoMatch) {
    const iso = buildIso(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]));
    if (!iso) return errorIssue(ctx, "Not a real calendar date");
    return iso === text ? ok(iso) : fixed(iso, "Rewritten as YYYY-MM-DD");
  }

  const named = DAY_MONTHNAME_YEAR.exec(text);
  if (named) {
    const month = monthFromWord(named[2]);
    if (month === null) return errorIssue(ctx, "Month name not recognised");
    const { year, twoDigit } = fullYear(named[3] ?? "", now);
    const iso = buildIso(year, month, Number(named[1]));
    if (!iso) return errorIssue(ctx, "Not a real calendar date");
    return fixed(iso, twoDigit ? twoDigitNote(year, named[3] ?? "") : "Rewritten as YYYY-MM-DD");
  }

  const monthFirstNamed = MONTHNAME_DAY_YEAR.exec(text);
  if (monthFirstNamed) {
    const month = monthFromWord(monthFirstNamed[1]);
    if (month === null) return errorIssue(ctx, "Month name not recognised");
    const { year, twoDigit } = fullYear(monthFirstNamed[3] ?? "", now);
    const iso = buildIso(year, month, Number(monthFirstNamed[2]));
    if (!iso) return errorIssue(ctx, "Not a real calendar date");
    return fixed(iso, twoDigit ? twoDigitNote(year, monthFirstNamed[3] ?? "") : "Rewritten as YYYY-MM-DD");
  }

  const numeric = NUMERIC_PARTS.exec(text);
  if (numeric) {
    const a = Number(numeric[1]);
    const b = Number(numeric[2]);
    const { year, twoDigit } = fullYear(numeric[3] ?? "", now);
    let resolved: DateOrder | null = order ?? null;
    if (!resolved) {
      if (a > 12 && b <= 12) resolved = "DMY";
      else if (b > 12 && a <= 12) resolved = "MDY";
      else if (a === b) resolved = "DMY";
    }
    if (!resolved) {
      const dmy = buildIso(year, b, a);
      const mdy = buildIso(year, a, b);
      const options = [dmy, mdy].filter((o): o is string => o !== null);
      return questionIssue(
        ctx,
        "Is this day/month or month/day? This date can be read both ways",
        options,
        dmy ?? undefined,
      );
    }
    const iso = resolved === "DMY" ? buildIso(year, b, a) : buildIso(year, a, b);
    if (!iso) {
      return errorIssue(
        ctx,
        resolved === "DMY"
          ? "Not a real date when read as day/month/year"
          : "Not a real date when read as month/day/year",
      );
    }
    const note = twoDigit
      ? twoDigitNote(year, numeric[3] ?? "") + " and rewrote as YYYY-MM-DD"
      : "Rewritten as YYYY-MM-DD";
    return fixed(iso, note);
  }

  return errorIssue(ctx, "Not a valid date");
}
