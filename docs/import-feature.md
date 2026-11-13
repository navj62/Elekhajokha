# Excel/CSV Import — Build Brief (v2, matched to the repo)

Feature for E-Lekha-Jokha: a shop owner uploads their own Excel or CSV ledger, reviews and fixes it in an editable preview, answers questions about anything unclear, and imports customers, pledges and pledge items into their account.

Read this whole file and `CLAUDE.md` before starting any phase. Work on **one phase per session**, on branch `feature/excel-import`, and **show a plan before writing code**.

---

## 1. Rules for the coding model

1. **Ask, don't decide.** Any product decision not settled in section 3 is mine. Stop and ask me with the AskUserQuestion tool: 2–4 options, your recommendation first, trade-offs for each. Never pick silently and never write a guess into code.
2. **Fixed contracts.** `lib/import/targetSchema.ts` and `tests/import/targetSchema.test.ts` are the contract. Do not change them without asking me first and explaining why.
3. **Every phase ends green:** `npx tsc --noEmit`, `npm test`, the CI lint config (`npx eslint . --config eslint.config.ci.mjs`) with no new errors, no new strict-lint errors in new files, and `npm run build`.
4. **Isolation and security rules** are in sections 13 and 14 and in `CLAUDE.md`. They override anything else in this file.
5. **Reuse, don't duplicate.** Use the existing helpers listed in section 11. Do not re-implement interest, weights or the interest-rate rule.
6. **Small commits** with clear messages. End each phase with: what was built, files changed, how it was tested, decisions you made on your own, open questions.

---

## 2. Scope of version 1

- **In:** `.xlsx` and `.csv`, up to **2,000 data rows** and **5 MB**.
- **Out (later):** PDFs, scanned registers and photos, background job queues, importing payment/transaction history.

---

## 3. Settled decisions

| Topic | Decision |
|---|---|
| Uncertainty | Whenever something is ambiguous, ask the user. Never guess. |
| Review | In-app editable preview. |
| Rows still broken at import | User can **exclude** rows; excluded rows are dropped. Included rows must have zero errors and zero open questions. |
| Scope of files | Version 1 can import customers only, from files with no pledge columns. |
| Status | Defaults to `ACTIVE`. `OVERDUE` is never imported. Phase 3 rule per row: use the status column when the row has a value; otherwise `RELEASED` if the release date is present, else `ACTIVE`. |
| Interest | Rate is **percent per year** (`calculateHybridInterest` takes an annual rate). Interest figures in the file are ignored. |
| Financial terms | Never guessed. Missing rate or compounding → ask once for the whole file. |
| Customer matching | By normalized name (`normalizeNameKey`), ignoring deleted customers. Same name + same region in the file = same customer. Same name, different region → ask. Name matches an existing customer → **always ask** (link or create new). No match → create. |
| Decimals | Money, weight, purity, rate stay strings until the database layer (`Prisma.Decimal`). Sums use Decimal, never JS floats. |
| Purity | Percent, e.g. 91.6 (`Decimal(5,2)`). |
| Cash book | **Imported pledges write no `CashEntry`.** These loans were paid out in the past. |
| Item types | Checked against the shop's `PledgeItemType` catalogue (`isDefault OR userId`), case-insensitively. **Unknown type → ask per type:** map to an existing type, or approve creating it as a new custom type for the shop. |
| Dates | **Backdate:** `Pledge.createdAt` = pledge date; a newly created `Customer.createdAt` = their earliest imported pledge date. Existing (linked) customers are not changed. Items follow the pledge route's convention (1 ms apart). |
| Audit | Every imported pledge gets one `PledgeAudit` row with a **new `IMPORTED` action** (additive enum value). |
| Traceability | `Import` and `ImportedRecord` tables, as `CLAUDE.md` requires. **No new columns on existing tables**, no text tags in `remark`. |
| Parser | `exceljs` (already a production dependency). Do not add SheetJS to runtime. |
| Locks and rate limits | Database-based (no Redis in this project). |
| AI model | Free tier, behind an OpenAI-compatible interface configured by env vars (section 6). |

---

## 4. The workflow

```
Upload → Parse → AI mapping → Mapping review → Normalize + validate
       → File-wide questions → Editable preview → Chunked commit → Summary + undo
```

1. **Upload.** Check type (content, not just extension) and size; create an `Import` (status `UPLOADED`). Several sheets → ask which one.
2. **Parse** with `exceljs`. Rows as arrays. Detect the header row; skip blank, title and total rows; handle UTF-8 BOM. CSV values must stay raw text (verify `exceljs` does not auto-convert dates or numbers in CSV; if it does and can't be turned off, ask me before adding a CSV library). xlsx date cells become `YYYY-MM-DD` without timezone shifts (test in Asia/Kolkata).
3. **AI mapping** (section 6). Produces a mapping, not data.
4. **Mapping review.** User sees each target field with chosen column, confidence and sample values; can change any; answers the AI's questions.
5. **Normalize + validate.** Apply mapping in code, normalize (section 7), group rows into customers/pledges/items, validate with `targetSchema.ts`, check item types against the catalogue, store staged rows with their issues.
6. **File-wide questions** (section 8).
7. **Editable preview** (section 9).
8. **Chunked commit** (section 10).
9. **Summary + undo.**

---

## 5. Data model (Phase 0)

All new; existing tables are not altered except one additive enum value.

- `Import`: id, userId (→ `User.id`, the internal id, not the Clerk id; `onDelete: Cascade`), fileName, fileSize, sheetName, status (`UPLOADED`, `MAPPED`, `IN_REVIEW`, `COMMITTING`, `COMMITTED`, `FAILED`, `UNDONE`), mapping (Json), fileAnswers (Json), counts, error, timestamps. Index on (userId, status).
- `ImportRow`: id, importId, rowNumber, kind (`CUSTOMER`/`PLEDGE`/`ITEM`), ref keys (`customerRef`, `pledgeRef`), data (Json, normalized), raw (Json), issues (Json array of `ImportIssue`), excluded (bool), timestamps. Index on (importId, kind).
- `ImportedRecord`: id, importId, importRowId, entityType (`CUSTOMER`/`PLEDGE`/`ITEM_TYPE`), entityId, action (`CREATED`/`LINKED`), createdAt. **Unique on (importId, importRowId, entityType)** — this makes commit idempotent and resumable.
- `AuditAction` enum: add `IMPORTED`.
- Uploaded files and staged rows contain personal data: delete after a retention period (ask me for the period).

```ts
type ImportIssue = {
  rowRef: string;
  field: string;
  kind: "error" | "question";
  message: string;
  options?: string[];
  suggestion?: string;
};
```

---

## 6. AI mapping step

**Provider.** One small module with an OpenAI-compatible chat call, configured by `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`. Switching providers needs only env changes. Adding these env names is fine; ask before adding any npm package for it (plain `fetch` is preferred).

**Input.** Header row plus up to 20 sample rows, **masked first**:
- Aadhaar: never sent.
- Mobile: shape only (`98XXXXXX10`).
- Names: letters replaced with `*` except the first letter of each word.
- Target field list and descriptions, generated from `targetSchema.ts`.

**Output** (validated with Zod; one retry with the validation errors; then fall back to manual mapping):
```ts
{
  layout: "ROW_PER_PLEDGE" | "ROW_PER_ITEM" | "CUSTOMERS_ONLY" | "UNSURE",
  fields: { [targetField]: { column: string | null; transform?: string; confidence: number } },
  questions: { field: string; message: string; options: string[] }[]
}
```
- Fields below a confidence threshold (start at 0.8) become questions in mapping review.
- Spreadsheet cells are **untrusted input**. The model only returns a mapping; it never triggers actions.
- Cache confirmed mappings per shop by header signature.
- On rate-limit or provider errors, fall back to manual mapping. The feature must work with no AI at all.

**Eval (Phase 2).** `samples/` holds sample files (never the real migration files in the repo root); `samples/expected/<file>.json` holds correct mappings **written by me**. `npm run eval:mapping` reports per-field accuracy. Adding that script to `package.json` needs my approval.

---

## 7. Normalizers (code, not AI)

Each returns `{ value }`, `{ value, fixed }`, or an issue.
- **Dates →** `YYYY-MM-DD`. Text dates: decide day/month order per column; any first part > 12 means dd/mm; all ambiguous → ask. Find how the existing pledge route stores `pledgeDate` (time of day, timezone) and convert the same way at commit.
- **Numbers →** strip ₹, spaces, Indian/Western thousands separators; Devanagari digits to ASCII; round Excel float noise.
- **Purity →** 8–24 = karats (22 → 91.6), 500–999 = fineness (916 → 91.6), 50–100 = percent; otherwise ask.
- **Weight →** grams. Tola or other units only when the column or user says so; otherwise ask. Gold item above `PLAUSIBLE_GOLD_ITEM_MAX_GRAMS` → question.
- **Mobile →** strip `+91`, leading `0`, spaces, dashes; split combined name+mobile cells.
- **Rate →** all rates in the file below 6 → ask "per month or per year?". Then apply the existing `checkInterestRate` rule.
- **Item type →** case-insensitive match against the catalogue; unknown → question (section 3).

---

## 8. Questions to the user

**File-wide:** sheet; layout if `UNSURE`; how to group item rows into pledges when there is no pledge number; missing rate; missing compounding; rate unit; ambiguous date order; unknown weight unit; each unknown item type (asked once per type, not per row). No region column → ask once: one region for all customers (typed by the owner), take it from each address (suggest the last part of the address, editable in the preview), or use the full address as the region.

**Row-level:** same name different region; name matches an existing customer; ambiguous purity; heavy gold item; anything the schema rejects that has a plausible fix (suggestion pre-selected).

---

## 9. Editable preview

- Built from existing primitives: `components/ui/DataTable.tsx` (table at `lg:`, cards below), `Sheet` (the only allowed modal/sheet), `StickyActions`, `Toast`, `ThemedSelect`, `ThemedDatePicker`. Follow the design tokens in `app/globals.css`.
- Sections: Customers, Pledges (with items). Every value editable; an edit re-runs normalize + validate for that row on the server and saves.
- Errors on the cell with the message; questions inline with option buttons.
- Filters: all / with problems / excluded; counts at the top.
- Per-row **Exclude**. Excluding a customer excludes their pledges (show this before confirming).
- Import enabled only when included rows have no errors and no open questions.
- Must work on phones and stay smooth at 2,000 rows (pagination or virtualization; ask me before adding a virtualization package).

---

## 10. Chunked commit

Vercel functions here get at most 60 seconds, so commit runs as **several requests driven by the browser**:

1. **Start:** re-validate everything on the server; switch status `IN_REVIEW → COMMITTING` with a compare-and-set (`updateMany` where status is `IN_REVIEW`, check count = 1). Only one `COMMITTING` import per shop: check inside a transaction that locks the `User` row (`SELECT … FOR UPDATE`).
2. **Each chunk** (start with ~50 pledges, tune by measurement) in one transaction:
   - create approved new item types (once), create or link customers, create pledges with items, one `PledgeAudit` `IMPORTED` row per pledge, and `ImportedRecord` rows;
   - skip rows that already have `ImportedRecord` (resume and double-click safe);
   - computed fields exactly as the existing pledge route sets them (`metalContent`, Decimal sums for `netWeightOfGold/Silver`, `calculationVersion` from `CALCULATION_VERSION`); leave unset what the route leaves unset;
   - backdate `createdAt` (section 3); **no `CashEntry`**.
3. **Finish:** status `COMMITTED`, counts saved. On error: `FAILED` with a safe message; **Resume** continues from the next unrecorded row.
4. **Undo:** remove everything with `ImportedRecord.action = CREATED` for this import, only if none of those pledges has later transactions, cash entries, audits other than `IMPORTED`, or edits. `PledgeAudit` is `onDelete: Restrict` on purpose, so **ask me how undo should treat `IMPORTED` audit rows before building it.**
5. **Summary:** customers created/linked, pledges and items created, item types created, rows excluded.

---

## 11. Existing code to reuse (do not modify without approval)

- Auth pattern: `auth()` → `prisma.user.findUnique({ where: { clerkUserId } })` → `user.id` (see `app/api/add-customer/route.ts`). Build an **import-only** helper in `lib/import/` with this pattern; don't refactor existing routes.
- Subscription state: logic in `app/api/access/route.ts`. Build an import-only server check that gives the same answer; if that needs extracting shared code out of `access/route.ts`, ask me first.
- Pledge creation reference: `app/api/customers/[customerId]/pledges/route.ts` (validation, item-type check, `metalContent`, item `createdAt` 1 ms apart).
- `lib/interest.ts`, `lib/calculateLTV.ts`, `lib/weights.ts` (`metalContent`), `lib/interestRate.ts` (`checkInterestRate`), `lib/pledgeConstants.ts` (`CALCULATION_VERSION`, statuses).
- DB lock patterns: `CronCheckpoint` compare-and-set in `app/api/cron/evaluate-risk/route.ts`; `SELECT … FOR UPDATE` in the pledge and cash-book paths.
- DB-test pattern: guarded by an env flag like `CASHBOOK_DB_TESTS`; add `IMPORT_DB_TESTS` the same way, and use the existing `assertDbTarget` / `ALLOW_PROD_DB` guard so tests can never run against production.

---

## 12. Phases

| Phase | Build | Done when |
|---|---|---|
| P0 | Prisma models + `IMPORTED` enum value + migration on the Neon branch; `ImportIssue` type; feature flag helper; import-only auth and subscription helpers | Migration applies cleanly on `import-dev`; existing tests still pass; helpers unit-tested |
| P1 | Parser (`exceljs`) + normalizers | Unit tests pass on all files in `samples/`; header row correct for each |
| P2 | AI mapping module + masking + eval script | Eval runs; accuracy reported per file |
| P3 | Grouping + validation + issues engine (incl. item types) | Each sample gives the expected customers/pledges/items and issues |
| P4 | API routes: upload, mapping review, answers, row edits, exclude | Route tests incl. auth, subscription, flag off → 404, cross-tenant denial |
| P5 | Mapping review, questions and preview UI | Full flow works on desktop and phone |
| P6 | Chunked commit, resume, undo | DB tests: double-click start, failure + resume, undo blocked by a later transaction |
| P7 | Hardening | Limits, rate limits, retention cleanup, cross-tenant integration test |

---

## 13. Isolation: the feature must not affect the live app

- All work on `feature/excel-import`, merged to `main` only through a pull request I review.
- Development database is the Neon branch `import-dev`. No production credentials in the project folder.
- Migrations are additive only (new tables, one new enum value). Existing columns are never changed.
- Feature flag `IMPORT_FEATURE_ENABLED`, checked on the server, off by default. With the flag off: no nav entry, import routes return 404, the app behaves exactly as today.
- No edits to existing files outside the feature folders without my approval; problems found elsewhere are logged in `docs/import-notes.md`, not fixed.
- Rollout after merge: run the migration on production, enable the flag for my own test shop first, then for real shops.

## 14. Security checklist (must hold before merge)

**Uploads**
- Only `.xlsx` and `.csv`; check content (xlsx starts with `PK`), not just the extension.
- Limits: 5 MB, 2,000 data rows, caps on columns, sheets and total cells. Prefer the `exceljs` streaming reader so oversized or compressed "bomb" files are stopped early.
- Formula cells are read as cached values; never evaluated.
- Never spread parsed objects into Prisma calls; only fields that passed `targetSchema.ts` (strict) reach the database.

**Access**
- Clerk auth, server-side subscription check, feature flag and tenant scoping on every import route (`proxy.ts` only checks sign-in).
- Never trust an id alone: every lookup is scoped, e.g. `where: { id, userId }`.
- Rate limits per shop on upload, AI mapping and commit, counted from `Import` rows (limits: ask me).

**AI**
- Only masked samples are sent; Aadhaar never. Output validated and confirmed by the user; it can never trigger actions. Works without AI.

**Data and logs**
- No personal data in logs, error messages or analytics.
- Never read or use the real migration files or `seed-*-log.json` in the repo root as fixtures.
- Uploaded files and staged rows deleted after the retention period.

**Before merge**
- Typecheck, tests (including `IMPORT_DB_TESTS` on `import-dev`), CI lint and build pass.
- Cross-tenant tests pass.
- `npm audit` shows no new high or critical issues.
- I have reviewed every changed file outside the feature folders.

## 15. Open questions to ask me when you reach them

- Retention period for uploaded files and staged rows.
- Rate-limit numbers.
- Which subscription plans get the feature.
- How undo treats `IMPORTED` audit rows.
- Whether v1 should import `RELEASED`/`SOLD` rows, or ask the owner to exclude them (only `ACTIVE` is certain).
- Customers-only files: Phase 3 (grouping and validation) and Phase 6 (commit) each need a customers-only path, since `CUSTOMERS_ONLY` files have no pledges or items to group, validate or write.
- Anything else not settled in section 3.