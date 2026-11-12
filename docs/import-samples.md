# Import samples — what is in `samples/`

Facts read from the four sample files with the Phase 1 parser (and by opening them). All names, numbers and shops in them are synthetic.
Row numbers are the sheet's own (row 1 = first line of the file).

> **Expected header row and data-row count are proposed, not confirmed.** They become test expectations only after the owner confirms them (see the "To confirm" table at the bottom).

| | `1_php_ledger_export.csv` | `2_jeweller_contacts_masked.xlsx` | `3_jeweller_contacts_dirty.csv` | `4_messy_ledger_hindi.xlsx` |
|---|---|---|---|---|
| **What it is** | Export from a PHP pledge system | Directory of jeweller contacts (not a ledger) | Directory of jeweller contacts (not a ledger) | Monthly pledge ledger, hand-built in Excel |
| **Format** | CSV, UTF-8, no BOM, LF line endings | xlsx, one sheet `Contacts` | CSV, UTF-8 **with BOM**, CRLF line endings | xlsx, one sheet `खाता बही` |
| **Header row** | Row 1 (18 columns) | Row 1 (10 columns) | Row 1 (7 columns) | **Row 5** (13 columns) |
| **Data rows** | 60 (rows 2–61) | 55 (rows 2–56) | 60 (rows 2–61) | 58 pledges (rows 6–63) + 1 footnote row the parser cannot tell apart = 59 returned |
| **Layout** | One row per pledge, **one item per row** (`itemname` + `weight` hold a single item) | No pledges, loans or items | No pledges, loans or items | One row per pledge, **one item per row** (`वस्तु` + `वज़न`) |
| **Pledge number** | Yes: `cid` (60 distinct) | No (`Contact ID` `JC-001`…, a contact id) | No (`sr` has repeats, 57 distinct) | Serial number `क्र.सं.` 1–58 (a running number, not a pledge id) |
| **Date format** | `YYYY-MM-DD` text. Open pledges: release date is the text `NULL` (11 rows) or `0000-00-00` (10 rows) | Real Excel date cells (`Last Deal Date`) | No date column | Real Excel date cells (pledge and release dates) |
| **Weight style** | Text: `वज़न २ ग्राम` (Devanagari digits), `10 gm`, `3 gm`; `00` in 7 rows; empty in 2 rows | None | None | Text `वज़न ४ ग्राम` / `वजन २ ग्राम` (two spellings of "weight"); `वज़न १.५००` with **no unit** in 4 rows |
| **Purity style** | **None.** Metal is in `type` (`Gold` 10, `Silver` 15, empty 35); otherwise only in the item name (`सोना…`, `चांदी…`, `gold chain`, `Ring`) | None | None | **None.** Metal only in the item name; `Ring`, `Payal (N)`, `Kandora`, `Hasli (RS)` etc. do not say which metal |
| **Money** | `2000.00` text with 2 decimals | None | None | Numbers, but **4 amounts are text with commas** (`15,000`, `1,500`, `6,000`, `3,000`) |
| **Interest rate** | `2.00` in 55 rows, `3.00` in 1, **`0.00` in 4** → all under 6, so the per-month/per-year question applies; 0.00 is invalid | None | None | `2` or `3` in 56 rows, **`0` in 2** → same |
| **Junk rows** | None | None | None | Rows 1–2 merged title and subtitle, row 3 blank, row 4 grouping band (`ग्राहक विवरण`, `ऋण विवरण`, …), **row 64 total `कुल योग`**, row 65 blank, **row 66 a footnote** (one long text cell). The `दुकान` (shop) column is merged down, so only the first row of each block has the value (3 shops) |
| **Language** | Hindi + English (same people written in both scripts) | English | Hindi + English (`मीना भट्ट` and `Meena Bhatt` both appear) | Hindi + English (same person in both scripts, e.g. `Dilip Kothari` / `दिलीप कोठारी`) |
| **Encoding / data problems** | **14 stray NUL bytes** (the parser strips them). **3 customer names and 2 addresses are literally `?????`** (characters lost in the export, not recoverable). Leading spaces in some names. 4 different shop names (`shop_alpha`, `shop_beta`, `shop_gamma`, `demo`) in one file | None | BOM at the start (parser strips it). All phone numbers are masked (`XXXXX XXX297`, `+91-XXXXX-XX374`, `91XXXXXXX840`, `0XXXXXXXX324`). Town spelled with different case and trailing spaces (`Nepanagar `, `nepanagar`) | 4 blank customer names (rows 10, 15, 17, 62). 2 rows with rate 0. The footnote row (66) is not a pledge |

## What the parser does with each (Phase 1)

- **1:** NULs removed; `NULL`, `0000-00-00` and blanks are "empty" for the date and number normalizers; weights parse with the weight normalizer; `?????` stays as is (Phase 3 must flag it).
- **2, 4:** Excel dates arrive as `YYYY-MM-DD`; merged cells keep their value in the top-left cell only (so the 13-cell title row has one filled cell and is skipped); in sample 4 the header is found on row 5 because the band on row 4 is sparse.
- **3:** BOM stripped; masked phones are an error from `normalizeMobile` ("masked or incomplete").
- **4:** `extractTable` drops the blank row and the total row and counts them. It **keeps** the footnote row 66, because dropping a single-cell row would also drop a real row that has only one cell filled. Phase 3 will see it as a row with no loan amount and no date.

## Findings for later phases

- Sample 1 and 4 have **no purity column**. Purity is required by the target schema, so the mapping step must ask ("purity not in the file"), the same way it asks for a missing rate.
- Sample 1 and 4 need **metal inferred from the item name** (or asked). Phase 3 question.
- Sample 4's shop column is merged down; blanking the repeats loses the shop on rows 2–25. `Shop` is not a target field, so nothing is lost for the import itself, but a future "fill down" option would need the parser to keep merge ranges.
- Duplicate customers across scripts (Hindi vs English spelling of the same name) will not match by `normalizeNameKey`. That is expected; Phase 3 treats them as different customers.

## To confirm before these go into tests

| File | Header row (sheet row) | Data rows returned by `extractTable` |
|---|---|---|
| `1_php_ledger_export.csv` | 1 | 60 |
| `2_jeweller_contacts_masked.xlsx` | 1 | 55 |
| `3_jeweller_contacts_dirty.csv` | 1 | 60 |
| `4_messy_ledger_hindi.xlsx` | 5 | 59 (58 pledges + the footnote row 66) |
