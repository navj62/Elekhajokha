# Import feature — notes

## Phase 6 needs: how the existing pledge route stores `pledgeDate`

Source: `app/api/customers/[customerId]/pledges/route.ts` (read, not changed).

- The new-pledge form sends `pledgeDate` as a **`YYYY-MM-DD` string** from a native date input (the page notes that `toISOString()` must not be used to build it, because that shifts the day).
- The route does **`const pledgeDateObj = new Date(pledgeDate)`** (line ~210) with no time of day, no timezone handling and no validation.
- `new Date("YYYY-MM-DD")` is **midnight UTC** of that date (`T00:00:00.000Z`). That value is written to `Pledge.pledgeDate`, a Prisma `DateTime` (Postgres `timestamp(3)`, which holds the UTC instant).
- The same `pledgeDateObj` is passed as `eventAt` to `recordCashEntries`. Midnight UTC is 05:30 on the same calendar day in IST, so the IST day of the stored value is always the day the owner picked. (Storing local midnight IST instead would be the previous UTC day and would break this.)
- `Pledge.createdAt` is **not** set by the route (database default `now()`). The import backdates it (spec §3).
- Items are created with `createdAt = Date.now() + index` (1 ms apart), taken once before the transaction.

**For the commit (Phase 6):** build the date exactly as the route does, `new Date(ymd)` from the normalized `YYYY-MM-DD` string, so imported pledges are stored identically to hand-entered ones. For the backdated `Pledge.createdAt`, use the same value, and give items `pledgeDate.getTime() + index` so they stay 1 ms apart and after/at the pledge time. (Open point for Phase 6: whether `createdAt` should be midnight UTC or a time of day; midnight UTC is the simplest and consistent with `pledgeDate`.)

## Phase 1 decisions and findings

- **exceljs's streaming reader is not used.** Probed on the samples and on exceljs-written files: (1) it returns date cells as serial numbers with no format, because `styles.xml` may come after the sheets in the zip; (2) it reports a wrong sheet name (`Sheet1`) when `workbook.xml` comes after the sheets; (3) it crashes with a TypeError on valid files from some producers (`this.model` undefined); (4) when a sheet precedes `workbook.xml` it spools that sheet to a **temp file on disk**. The brief (§14) says to prefer it. Instead the parser inspects the zip itself in pass 1 (every entry inflated under a cap equal to its declared size; rows, columns and cells counted from the sheet XML; sheet names read from `xl/workbook.xml`), then loads values with `workbook.xlsx.load`.
- **CSV needs no extra library.** exceljs's default CSV read converts dates (to a `Date` shifted by the timezone: `2026-04-03` came back as `2026-04-02T18:30:00Z` under IST), numbers (`1e3`, `12.50`) and drops leading zeros (`0098765`). Passing `{ map: v => v }` turns all conversion off. Confirmed by tests.
- **TypeScript target is below ES2020**, so BigInt literals (`10n`) do not compile. `lib/import/normalize/decimal.ts` uses `BigInt()` calls instead. `tsconfig.json` was not touched.
- Stray NUL bytes (sample 1) are stripped from CSV text: Postgres text cannot store them.
- A merged range keeps its value only in the top-left cell; `readSheet` also returns the ranges as `merges` (`{ top, left, bottom, right }`, 1-based, inclusive) for Phase 3 to fill down.
- **Note rows:** `extractTable` skips a row with exactly one non-empty cell that is text, not a number or a date. Only in tables of 3 or more columns (my addition: in a 2-column table a one-cell row could be real data).
- **Lost-in-export text:** `normalizeText` turns a value made only of `?` / U+FFFD into an error issue. Partial damage (`Ram??`) is not detected.
- **Two-digit years** pivot on the current UTC year: yy <= current yy is 20yy, otherwise 19yy (in 2026, 26 -> 2026, 27 -> 1927). `normalizeDate` takes an optional `now` so tests are fixed. `targetSchema` rejects dates before 1990, so a 19yy guess below 1990 becomes a visible error, not a silent import.

## Found, not fixed

- `app/api/customers/[customerId]/pledges/route.ts` accepts any `pledgeDate` string (already listed in CLAUDE.md "Known gaps"). The import validates dates itself (`targetSchema.ts`: real calendar date, 1990-01-01 to tomorrow).
