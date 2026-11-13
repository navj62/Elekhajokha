# Import — AI mapping eval

Run: 2026-11-13 10:03 UTC · Model: `openai/gpt-oss-120b` · Provider host: `api.groq.com`

Answer keys: `samples/expected/*.json`, written and confirmed by the owner. Run with `npx tsx lib/import/ai/runMappingEval.ts`.
This report contains headers, field keys and scores only; no cell values.
Files scored: 4 of 4. A file that ended in manual mapping (provider error) is listed but not scored.

## Overall

| Measure | Result |
|---|---|
| Field accuracy (all 28 fields × 4 files, null = null counts) | 106/112 = 94.6% |
| Mapped-field recall (fields the key maps to a column) | 27/31 = 87.1% |
| False mappings (key says null, model chose a column) | 2 |
| Layout | 4/4 = 100.0% |
| Response mode | strict json_schema: 4 · json_object fallback: 0 · manual: 0 |
| Questions raised (model + confidence < 0.8) | 31 |

## Per file

| File | Outcome | Attempts | Fields | Mapped recall | False mappings | Layout (expected → got) | Questions | Time |
|---|---|---|---|---|---|---|---|---|
| `1_php_ledger_export.csv` | ok (json_schema) | 1 | 26/28 (92.9%) | 12/14 | 0 | ROW_PER_PLEDGE → ROW_PER_PLEDGE ✓ | 8 | 6.3 s |
| `2_jeweller_contacts_masked.xlsx` | ok (json_schema) | 2 | 28/28 (100.0%) | 3/3 | 0 | CUSTOMERS_ONLY → CUSTOMERS_ONLY ✓ | 3 | 4.0 s |
| `3_jeweller_contacts_dirty.csv` | ok (json_schema) | 1 | 28/28 (100.0%) | 4/4 | 0 | CUSTOMERS_ONLY → CUSTOMERS_ONLY ✓ | 1 | 3.3 s |
| `4_messy_ledger_hindi.xlsx` | ok (json_schema) | 2 | 24/28 (85.7%) | 8/10 | 2 | ROW_PER_PLEDGE → ROW_PER_PLEDGE ✓ | 19 | 6.1 s |

## Mismatches

### `1_php_ledger_export.csv`

| Field | Expected | Model |
|---|---|---|
| `item.itemType` | `itemname` | null |
| `item.netWeight` | `weight` | null |

### `2_jeweller_contacts_masked.xlsx`

None.

### `3_jeweller_contacts_dirty.csv`

None.

### `4_messy_ledger_hindi.xlsx`

| Field | Expected | Model |
|---|---|---|
| `pledge.pledgeRef` | null | `क्र.सं.` |
| `pledge.durationMonths` | null | `अवधि (१५ दिन)` |
| `item.itemType` | `वस्तु` | null |
| `item.netWeight` | `वज़न` | null |

