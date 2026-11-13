# Import — AI mapping eval

Model run: 2026-11-13 11:13 UTC · Model: `openai/gpt-oss-120b` · Provider host: `api.groq.com`

Answer keys: `samples/expected/*.json`, written and confirmed by the owner.
Real run: `npx tsx lib/import/ai/runMappingEval.ts` · Re-score without the model: `npx tsx lib/import/ai/runMappingEval.ts --rescore`.
This report contains headers, field keys and scores only; no cell values.
Files scored: 4 of 4. A file that ended in manual mapping (provider error) is listed but not scored.

## Overall

| Measure | Result |
|---|---|
| Field accuracy (all 28 fields × 4 files, null = null counts) | 105/112 = 93.8% |
| Mapped-field recall (fields the key maps to a column) | 26/28 = 92.9% |
| False mappings (key says null, model chose a column) | 5 |
| Layout | 4/4 = 100.0% |
| Response mode | strict json_schema: 4 · json_object fallback: 0 · manual: 0 |
| Questions for the owner (model's own + confidence < 0.8) | 7 over 4 files = 1.8 per file |

## Per file

| File | Outcome | Attempts | Fields | Mapped recall | False mappings | Layout (expected → got) | Questions | Time |
|---|---|---|---|---|---|---|---|---|
| `1_php_ledger_export.csv` | ok (json_schema) | 1 | 25/28 (89.3%) | 11/12 | 2 | ROW_PER_PLEDGE → ROW_PER_PLEDGE ✓ | 1 | 5.4 s |
| `2_jeweller_contacts_masked.xlsx` | ok (json_schema) | 2 | 27/28 (96.4%) | 3/3 | 1 | CUSTOMERS_ONLY → CUSTOMERS_ONLY ✓ | 3 | 3.1 s |
| `3_jeweller_contacts_dirty.csv` | ok (json_schema) | 1 | 28/28 (100.0%) | 4/4 | 0 | CUSTOMERS_ONLY → CUSTOMERS_ONLY ✓ | 1 | 3.1 s |
| `4_messy_ledger_hindi.xlsx` | ok (json_schema) | 2 | 25/28 (89.3%) | 8/9 | 2 | ROW_PER_PLEDGE → ROW_PER_PLEDGE ✓ | 2 | 4.9 s |

## Questions per file

Fields the owner would be asked about (field keys only).

- `1_php_ledger_export.csv` (1): `pledge.pledgeRef`
- `2_jeweller_contacts_masked.xlsx` (3): `customer.address`, `customer.region`, `customer.remark`
- `3_jeweller_contacts_dirty.csv` (1): `customer.address`
- `4_messy_ledger_hindi.xlsx` (2): `item.metalType`, `pledge.durationMonths`

## Mismatches

### `1_php_ledger_export.csv`

| Field | Expected | Model |
|---|---|---|
| `pledge.remark` | null | `image_text` |
| `item.itemType` | null | `itemname` |
| `item.itemName` | `itemname` | null |

### `2_jeweller_contacts_masked.xlsx`

| Field | Expected | Model |
|---|---|---|
| `customer.remark` | null | `Speciality` |

### `3_jeweller_contacts_dirty.csv`

None.

### `4_messy_ledger_hindi.xlsx`

| Field | Expected | Model |
|---|---|---|
| `pledge.pledgeRef` | null | `क्र.सं.` |
| `item.itemType` | null | `वस्तु` |
| `item.itemName` | `वस्तु` | null |

