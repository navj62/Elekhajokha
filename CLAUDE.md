# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

E-Lekha-Jokha is a Next.js 16 (App Router) SaaS for gold/silver pawnbrokers (pledge shops) in India. Shop owners record customer pledges of gold/silver jewellery against loans, track accruing interest, monitor loan-to-value (LTV) risk against live metal prices, manage an inventory of items acquired through pledge sales/forfeitures and direct purchases, track tasks, and share a read-only portal with each customer. Access is gated behind a Razorpay subscription. UI strings and printed receipts are largely in Hindi.

## Invariants (do not violate)

These are hard rules. When editing or reviewing code, treat any violation as a bug. Each has been the source of a real incident in this codebase.

1. **Tenant scoping.** Every Prisma query touching `Customer`, `Pledge`, `PledgeItem`, `Transaction`, `PledgeAudit`, `PledgeAlert`, `FinancialSnapshot`, or `InventoryItem` MUST be scoped to the authenticated internal `user.id`. For nested resources, enforce ownership through the relation (e.g. `where: { id: pledgeId, customer: { userId: user.id } }`). NEVER trust an `id` from the request body, params, or query for ownership — resolve the user from `auth()` → `prisma.user.findUnique({ where: { clerkUserId } })` → `user.id`, and scope by that. (A receipt route once queried `{ id: pledgeId, customerId }` with no `userId` link — a cross-tenant PII leak. Do not reintroduce this pattern.)

2. **Money & weight precision.** Money is `Decimal` in the DB. `Number(...)` conversion is acceptable for display formatting and read-only computed responses (e.g. `/api/access` days-left, financial-summary aggregates that are never written back). It is NOT acceptable for values that accrue or persist — keep interest accrual, compounding, and stored balances in `Prisma.Decimal` end to end. When summing per-item weights into `netWeightOfGold`/`netWeightOfSilver`, round each item to 3 dp THEN sum (round-then-sum), to match the stored per-item values — never sum raw products and round once.

3. **Server-derived valuation inputs.** `netWeightOfMetal` per `PledgeItem` is computed server-side as `round(netWeight × purity/100, 3dp)` — NEVER trusted from the client. The same rule applies to `InventoryItem.netWeightOfGold`/`netWeightOfSilver` on direct purchases: derived server-side as `round(grossWeight × purity/100, 3dp)` and never accepted from the client. These values drive market value → LTV → risk tier → alerts, so client-asserted values are financial-integrity holes. The pledge create path and the inventory direct-purchase POST are the ONLY write paths for weights; if you ever add an edit path, it MUST re-derive these values the same way.

4. **Auth resolution.** API handlers resolve identity via `auth()` → `prisma.user.findUnique({ where: { clerkUserId } })` → internal `user.id`. Do not skip the DB resolution and scope domain tables by `clerkUserId` directly.

5. **Webhook signature verification is mandatory.** `/api/webhook/razorpay` MUST HMAC-verify `x-razorpay-signature` before acting; `/api/webhook/register` (Svix) MUST verify its Svix signature. No webhook mutates state on an unverified payload.

6. **Constant-time secret comparison + fail closed.** All shared-secret checks (`CRON_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, Razorpay signature) use `constantTimeEqual` from [lib/constantTimeEqual.ts](lib/constantTimeEqual.ts), and MUST reject when the secret env var is falsy (empty string included). Never use `!==`/`===` on a secret, and never use a non-null assertion (`!`) on a secret env var — an empty-string secret with `createHmac("", ...)` fails OPEN.

7. **Customer portal is a separate trust boundary.** `/view/[token]` and `/api/portal-status/[token]` are unauthenticated and token-in-URL. They expose only that one customer's read-only data, must respect `isPortalBlocked`, and must never leak owner-level or cross-customer fields.

8. **Single source of truth for money owed.** Amount owed is always computed via `calculateHybridInterest` ([lib/interest.ts](lib/interest.ts)). Do not reimplement interest math inline. Risk tiers come from `getRiskTier` in [lib/calculateLTV.ts](lib/calculateLTV.ts) — do not redefine them locally with divergent values or label strings.

9. **Prisma client.** Always import the singleton from [lib/prisma.ts](lib/prisma.ts). Never `new PrismaClient()`.

10. **Subscription state writes are deterministic.** `subscriptionEndDate` is always sourced from Razorpay's `current_end` (both in `/api/verify-payment` and the webhook), never computed locally as `+6mo/+1yr`. When writing `subscriptionStatus: "created"`, you MUST also write `subscriptionCreatedAt` in the same operation — a null timestamp on a `created` row locks the user out (see Subscriptions below).

11. **Inventory acquisition snapshots are immutable.** `InventoryItem.amountOwedAt` is computed via `calculateHybridInterest` at the exact sale/acquisition date and stored ONCE. Never recompute it, never overwrite it, and never derive it from `Pledge.receivableAmount`. Net position (`acquiredCost - amountOwedAt`) and sale profit (`soldPrice - acquiredCost`) are ALWAYS derived at display time — never stored as fields. `InventoryItem.netWeightOfGold`/`netWeightOfSilver` are also immutable after creation.

12. **SOLD and RELEASED audit rows are structurally indistinguishable.** When a pledge is added to inventory, its `PledgeAudit` row (`action: "SOLD"`) mirrors the RELEASED audit row field-for-field: same `CALCULATION_VERSION`, same `Prisma.Decimal` wrapping, same null-guarded metal-price/market-value/LTV snapshot pattern. The only difference is the `action` field. Reporting code relies on this parity.

## Commands

```bash
npm run dev       # Next dev server on http://localhost:3000
npm run build     # prisma generate && next build
npm run start     # production server
npm run lint      # eslint (flat config, eslint-config-next)
npx tsc --noEmit  # typecheck — the PRIMARY verification gate
npm test          # vitest — unit tests for interest / LTV / customer-risk pure logic

npx prisma generate          # regenerate the Prisma client
npx prisma migrate dev       # apply/create migrations (dev)
npx prisma migrate deploy    # apply migrations in production (never migrate dev on prod)
npx prisma studio            # inspect the DB
npx prisma db seed           # runs tsx prisma/seed-defaults.ts (idempotently seeds the 10 default PledgeItemType rows)
```

A test runner IS configured: `npm test` runs **vitest** (`vitest run`) over three unit-test files in `tests/` — `interest.test.ts`, `calculateLTV.test.ts`, `customerRiskScore.test.ts` — covering the pure financial/risk logic. There is no integration/E2E coverage for API routes or DB flows. After any change, run `npx tsc --noEmit` (the PRIMARY gate), `npm run lint`, and `npm test`; for build-time issues (dynamic imports, server/client boundaries) run `npm run build`. For flows that touch payment or the DB, verify manually in `prisma studio` — typecheck + unit tests passing is necessary but not sufficient.

### Prisma datasource gotcha
The runtime client and the CLI read their connection string from **different files**, but both currently point at `DATABASE_URL`:
- App runtime ([lib/prisma.ts](lib/prisma.ts)) connects via the Neon serverless adapter using `DATABASE_URL` (pooled).
- The Prisma CLI ([prisma.config.ts](prisma.config.ts)) reads `env("DATABASE_URL")` for `datasource.url` — **not** `DIRECT_URL`. (A prior version of this doc claimed the CLI used `DIRECT_URL`; verify against [prisma.config.ts](prisma.config.ts) — it does not.)

[prisma/schema.prisma](prisma/schema.prisma) intentionally declares `datasource db` with no inline `url`; the URL is injected by the adapter at runtime and by `prisma.config.ts` for the CLI. Don't "fix" this by adding `url = env(...)` to the schema.

**`DIRECT_URL` is currently read by nothing** — not by `prisma.config.ts`, not by the schema, not by app code (a repo-wide grep for `DIRECT_URL` returns zero hits). It has been retained in the required-env checklist below as a documented convention: migrations should run against a direct, unpooled connection, and if you point the CLI at it (by switching `prisma.config.ts` to `env("DIRECT_URL")`), it must be present. As wired today it is unused — treat it as optional-but-recommended for production migrations, not load-bearing.

### Prisma client staleness (critical)
After ANY schema change — especially enum changes or enum removals — run `npx prisma generate` AND clear the Turbopack cache (`rm -rf .next`) before restarting dev. A stale generated client combined with a cached Turbopack chunk produced a runtime `P2023 "Value 'Ring' not found in enum 'ItemType'"` error after the ItemType enum was dropped, even though the schema and DB were correct. When in doubt: generate → clear cache → restart.

### Migration tracking can lie (real incident)
`npx prisma migrate status` reported **"Database schema is up to date"** while a migration's DDL had never actually executed against the live database. The migration file existed with correct SQL, and Prisma's `_prisma_migrations` table had it recorded as applied — but the columns were genuinely **absent** from the database, producing `P2022 "column does not exist"` errors at runtime.

When `migrate status` contradicts a runtime column error, the migration-history table is not trustworthy. The ONLY reliable check is to query `information_schema` directly, bypassing Prisma entirely with the raw Neon driver:

```bash
npx tsx -r dotenv/config -e "
import('@neondatabase/serverless').then(async ({ neon }) => {
  const sql = neon(process.env.DATABASE_URL);
  console.log(await sql\`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'your_table' ORDER BY column_name;
  \`);
});
"
```

Two things that make this hard to diagnose:
- **`prisma db execute` does NOT print SELECT results** — it only reports "Script executed successfully". It cannot be used to inspect the DB.
- **Prisma's Neon adapter throws `"Failed to deserialize column of type 'name'"`** on `information_schema` queries via `$queryRaw`, even with `::text` casts. Hence the raw `neon()` driver above rather than Prisma.

**The fix** when this happens: run the migration's DDL directly via the raw driver, then `npx prisma generate` + `rm -rf .next`.

**Root cause pattern:** this codebase accumulated schema drift because `prisma db push` was used at several points instead of `prisma migrate dev`, leaving schema changes with no corresponding migration file. The migration history was regenerated once as a single clean baseline to resolve this. **Never use `prisma db push` on this project** — always `prisma migrate dev` so every schema change has a migration file.

### Enum-to-string migration gotcha
When converting an enum column to `String` (as done for `PledgeItem.itemType`), the generated migration SQL must use `ALTER COLUMN ... TYPE TEXT USING "col"::text` — NOT a drop/recreate, which destroys data. Always inspect the generated SQL before running `prisma migrate dev` on a column type change. After the type change, run a one-time data fix to convert uppercase legacy enum values to their new title-case label equivalents, keeping them consistent with the seeded `PledgeItemType` labels.

### Migration gotcha (index builds at scale)
Prisma's generated `CREATE INDEX` / `DROP INDEX` are NOT `CONCURRENTLY`, so on large existing tables they take a write-blocking lock. For `Pledge`/`Customer` at scale, run migrations in a low-traffic window or hand-edit to `CREATE INDEX CONCURRENTLY` (must run outside a transaction). At current data volumes this is instant and can be ignored.

## Middleware lives in `proxy.ts`

Next.js 16 renamed `middleware.ts` to **[proxy.ts](proxy.ts)**. This is the auth/onboarding gate (Clerk `clerkMiddleware`). Key behaviour:
- Public routes: `/`, `/sign-in`, `/sign-up`, `/view/*` (customer portal), `/api/webhook/*`, `/api/portal-status/*`, `/api/cron/*`.
- `/api/webhook/*` short-circuits before any auth (webhooks verify their own signatures).
- For **API routes**, the proxy only enforces sign-in — it does NOT enforce onboarding. Each API handler re-resolves the user itself.
- For **page routes**, unonboarded users are redirected to `/onboarding`; onboarding state is read from Clerk session claims `metadata.onboardingComplete`.

## Authentication & user model

Auth is **Clerk**; the app keeps a mirrored `User` row in Postgres keyed by `clerkUserId`.
- New Clerk users are synced into the DB by the **Svix webhook** at [app/api/webhook/register/route.ts](app/api/webhook/register/route.ts) (`user.created` / `user.deleted`). This handler must **always return 200** — it swallows all errors so Clerk never retries into a failure loop. It verifies the Svix signature first and returns 200 even on an invalid signature, but BEFORE any DB mutation, so there is no state-change vuln. It also writes `dbUserId`/`role`/`onboarded` back into Clerk `publicMetadata`.
- API handlers follow a consistent pattern: `auth()` → `prisma.user.findUnique({ where: { clerkUserId } })` → resolve internal `user.id` → scope all queries by that id. Ownership of nested resources is enforced through the relation, never by trusting request IDs (see Invariant 1).
- [app/api/access/route.ts](app/api/access/route.ts) is the authority on subscription access and is the one place that will lazily `create` a DB user if one is missing.

### User model fields (beyond auth/subscription)
- `shopName`, `address`, `mobile` — used in pledge receipt letterheads and PDF generation.
- `customerTerms` / `shopownerTerms` (`String?`) — customizable Hindi pledge terms printed on receipts. Default values live in `lib/defaultTerms.ts`; these fields store owner overrides. Written via `/api/profile`, read by the pledge receipt route and `generateReceiptPDF`.

### Production Clerk note
A fresh Clerk **production instance** generates different `clerkUserId` values than the dev instance — production DB must start clean (no dev `User` rows). Recreate any custom JWT template (exposing `publicMetadata.onboardingComplete`/`dbUserId` as session claims) in the production instance before deploying, or `proxy.ts` will redirect every user to `/onboarding` forever.

## Subscriptions (Razorpay)

The access/subscription state machine spans the frontend checkout, two API routes, the webhook, and the access gate. `User.subscriptionStatus` is one of `trial | created | active | halted | expired`. `/api/access` maps these to a frontend-safe status string and never leaks raw Prisma enums.

### The full flow (synchronous-first, webhook-backup)
1. **[app/subscription/page.tsx](app/subscription/page.tsx)** — `handleSubscribe()` POSTs to `/api/create-subscription`, then opens the Razorpay modal. On payment success, the Razorpay `handler(response)` callback POSTs the three response fields (`razorpay_payment_id`, `razorpay_subscription_id`, `razorpay_signature`) to `/api/verify-payment`. It redirects to `/dashboard` ONLY on confirmed success (and calls `router.refresh()`); on verification failure it shows an error and does NOT redirect. **The handler MUST capture and forward `response` — a handler that ignores it and just redirects leaves the user stuck at `created` forever.**
2. **[app/api/create-subscription/route.ts](app/api/create-subscription/route.ts)** — creates the Razorpay subscription, writes `subscriptionStatus = created` + `subscriptionCreatedAt = now` + `subscriptionPlan` + `razorpaySubscriptionId`. Eligibility: rejects `active`; reuses an existing `created` subscription without resetting the timestamp. **Every code path that sets `created` MUST also set `subscriptionCreatedAt` (Invariant 10).**
3. **[app/api/verify-payment/route.ts](app/api/verify-payment/route.ts)** — the PRIMARY path to access. Verifies the HMAC signature with `constantTimeEqual` (tries both `payment|subscription` and `subscription|payment` orderings), confirms the user owns the subscription, fetches the subscription server-side from Razorpay and requires `status ∈ {active, authenticated}`, then writes `subscriptionStatus = active` + `subscriptionEndDate = sub.current_end` + `razorpayPaymentId`, and clears `lastGraceExpiredAt`. Returns distinct error codes or `{ success: true, status: "active" }`.
4. **[app/api/webhook/razorpay/route.ts](app/api/webhook/razorpay/route.ts)** — the BACKUP/renewal path. HMAC-verifies `x-razorpay-signature`, then flips `subscriptionStatus` on `subscription.activated`/`charged` (→ active), `halted` (→ halted), `completed`/`cancelled` (→ expired). **Cannot reach localhost** — in local dev the webhook path is dead, so `verify-payment` is the only thing that grants access. In production it handles renewals.
5. **[hooks/useAccess.ts](hooks/useAccess.ts)** — client hook that polls `/api/access` with `cache: "no-store"`, refetches on mount and tab focus, preserves previous `hasAccess` on network error. **[components/SubscriptionGuard.tsx](components/SubscriptionGuard.tsx)** consumes it and handles every status string (`processing`, `payment_timeout`, `payment_required`, `trial_expired`, etc.); add a new branch when introducing a new status.

### Access rules in `/api/access`
Grants `hasAccess: true` for: `trial` (not expired), `active` (not expired), and `created` within a **10-minute grace window** (`status: "processing"`). After the window, `created` flips to `payment_timeout` and stamps `lastGraceExpiredAt`. Anti-farming: `lastGraceExpiredAt` within 24h blocks re-grant (`payment_required`) and blocks new mint in create-subscription (`GRACE_LIMIT` 429). Cleared when subscription becomes `active`.

**Self-healing:** if `/api/access` sees `created` with a `razorpaySubscriptionId`, it fetches from Razorpay; if active, it auto-heals (writes `active` + `current_end`). A `created` row with **null `subscriptionCreatedAt`** must be treated as expired — never returned as 409.

Plans: `halfyearly` / `yearly`, mapped via `RAZORPAY_PLAN_HALF_YEARLY` / `RAZORPAY_PLAN_YEARLY`. Trials via `/api/start-trial`, single-use per account.

## Core domain logic — interest, LTV, and risk

- **[lib/interest.ts](lib/interest.ts)** — `calculateHybridInterest(principal, annualRate, startDate, endDate, allowCompounding, compoundingDuration)`. Computes duration `T` in months (≤2 days → +0, ≤15 days → +0.5, else +1; min 0.5). Compounds per cycle (`MONTHLY`/`HALFYEARLY`/`YEARLY`) with simple interest on the leftover partial cycle. Returns `{ T, totalInterest, receivableAmount }`. **Single source of truth for amount owed** — portal, release, bulk release, inventory acquisition all reuse it.
- **[lib/calculateLTV.ts](lib/calculateLTV.ts)** — `calculateLTV(...)` calls `calculateHybridInterest`, computes market value, returns `ltv` + `riskTier`. `getRiskTier(ltv)` thresholds: **≤65 SAFE, ≤75 WATCH, ≤90 AT_RISK, else UNDERWATER** (`AT_RISK` with underscore — canonical label). Guard `null` LTV at call site; return `null` for market value/ltv/riskTier when no price available.
- **[lib/customerRiskScore.ts](lib/customerRiskScore.ts)** — `computeCustomerRiskScore(input)` — composite 0–100 score per customer: LTV pressure (0–40), velocity (-10–25), time-to-underwater (0–25), concentration (0–10), age (0–5). Tiers: **≤30 SAFE, ≤50 WATCH, ≤75 AT_RISK, >75 CRITICAL** (different from per-pledge tiers — uses CRITICAL not UNDERWATER). Used by the customer reports route; `ltvThirtyDaysAgo` passed as `null` in the report path. **SOLD pledges must never be fed into this calculation** — scope inputs to `status IN ["ACTIVE", "OVERDUE"]` only.
- **[app/api/cron/evaluate-risk/route.ts](app/api/cron/evaluate-risk/route.ts)** — paginated batch job over all `ACTIVE` pledges. BATCH_SIZE ~500, per-user counts hoisted to one `groupBy`, per-pledge writes via `UPDATE … FROM (VALUES …)`, snapshot upserts with bounded concurrency. No run-wide transaction — idempotent and resumable. Caches `lastCalculatedLtv` (clamped 999999.99), `lastRiskTier`, `lastAmountOwed`, `lastMarketValue`, `lastEvaluatedAt` per pledge. Upserts daily `FinancialSnapshot`. Supports `?dryRun=true`. Query count: ~540k → ~13k. **Sets `maxDuration = 60` (Vercel Pro target). On Vercel Hobby (10s hard cap), the cron silently times out past small pledge volumes.**

### Pledge weights
`netWeightOfGold`/`netWeightOfSilver` are denormalized onto `Pledge` at create time (round-then-sum, see Invariants 2 & 3). LTV/risk code reads these aggregates directly — no `PledgeItem` join needed. Items are write-once (no edit path). A pledge can hold both gold and silver simultaneously; always sum them independently and never collapse to one dominant metal.

### Item types — DB-driven strings (enum removed)
`PledgeItem.itemType` is a plain `String` storing the human-readable label directly (e.g. `"Ring"`, `"Kamarbandh"`). The old `ItemType` Prisma enum has been **fully removed**. Do not reference `ItemType` anywhere — the grep result for it must be zero.

Valid types live in the `PledgeItemType` table (`pledge_item_types`):
- **System defaults** (`isDefault: true`, `userId: null`) — 10 rows seeded by `prisma/seed-defaults.ts`: Ring, Necklace, Bangles, Chain, Earrings, Bracelet, Anklet, Pendant, Bangle Set, Other. Shared across all users, not deletable via API.
- **Custom types** (`isDefault: false`, `userId` set) — user-created, private, deletable.

API: `GET /api/item-types` returns `{ defaults, custom }`; `POST /api/item-types` creates a custom type (50-char max, case-insensitive duplicate check against both defaults and user's own); `DELETE /api/item-types/[id]` is ownership-checked, blocks default deletion. The pledge-create API validates the submitted label against `PledgeItemType` (`isDefault: true OR userId === user.id`) — does not accept arbitrary strings. **`PledgeItem.itemType` stores the label string, NOT a FK** — deleting a custom type never corrupts existing pledges. Display renders the string directly (no conversion wrapper). Search uses `{ itemType: { contains, mode: "insensitive" } }`. Profile page manages custom types. Pledge-create form and inventory direct-purchase page both use a grouped dropdown (Standard / Custom) fed from `GET /api/item-types`.

### Pledge lifecycle and status
`Pledge.status` is one of `ACTIVE | RELEASED | OVERDUE | SOLD` (the Prisma `PledgeStatus` enum has all four — do not assume a 3-value enum):
- **ACTIVE** — customer has the loan, item in shop.
- **RELEASED** — customer paid back, item returned. Terminal.
- **OVERDUE** — an open loan past its expected term. It is an **open, non-terminal** status: like ACTIVE, an OVERDUE pledge can still be released (single + bulk) OR sold to inventory. Every code path that accepts ACTIVE for a closure/transition MUST also accept OVERDUE (`status: { in: ["ACTIVE", "OVERDUE"] }`), and the customer-page bulk-selection checkboxes enable both. Treat ACTIVE-only guards on a closure path as a bug.
- **SOLD** — item acquired by the shop via the "Add to Inventory" flow (customer sold it OR owner forfeited). Terminal. SOLD pledges must never inflate at-risk/overdue metrics or the customer risk score. Display as "Sold to Shop" badge on the customer page.

### Per-customer financial summary
[app/api/customers/[customerId]/financial-summary/route.ts](app/api/customers/[customerId]/financial-summary/route.ts) — **SOLD pledges are excluded everywhere on this page**: the root DB query uses `status: { not: "SOLD" }` so SOLD pledges never enter the processing pipeline; active-set filters use `status === "ACTIVE" || status === "OVERDUE"` (positive match, not negation); the customer risk score is computed from ACTIVE/OVERDUE pledges only. The lifetime interest earned calculation reads `PledgeAudit` with `action: "RELEASED"` — this already correctly excludes SOLD audit rows (which have `action: "SOLD"`) and must not be changed. Any new filter added to this route must use a positive allowlist, never a negation like `status !== "RELEASED"`, since that pattern silently includes new terminal statuses.

### Pledge release & audit trail
Releasing a pledge (PATCH on the pledge route) is the most safety-critical write: finalizes interest, snapshots metal price/market-value/LTV into a `PledgeAudit` row, guards against double-release via `updateMany({ where: { status: { in: ["ACTIVE", "OVERDUE"] } } })` inside a transaction (throws `ALREADY_RELEASED` → 409 if already flipped). Accepts both ACTIVE and OVERDUE pledges. Body reads only `{ releaseDate, allowCompounding, compoundingDuration }` — cannot edit items/weights. `CALCULATION_VERSION = 1` stamped on every audit row. Single-release page exposes a compounding toggle and renders `Transaction` history. **For already-terminal pledges (RELEASED or SOLD), the release page shows a closed-state summary card instead of the action form — never show a live form for a closed pledge.**

RELEASED card: green CheckCircle, release date, receivable amount, "Back to Customer."
SOLD card: amber Archive, closure date, acquisition cost, derived cash paid to customer (`max(salePrice - receivableAmount, 0)`), loss note if salePrice < receivableAmount, "View in Inventory →" link.

### Bulk pledge release
Two POST routes under `app/api/customers/[customerId]/pledges/bulk-release/`. Additive — single-release is unchanged.
- **Preflight** — read-only: body shape → ownership → status all ACTIVE-or-OVERDUE → release date after latest `pledgeDate` → metal prices (once). Returns per-pledge previews using stored compounding defaults.
- **Execute** — re-runs all four checks (defense-in-depth), then all-or-nothing `prisma.$transaction({ timeout: 30000 })`. Per pledge: `updateMany` double-release guard (`status: { in: ["ACTIVE", "OVERDUE"] }`) → `PledgeAudit` creation (field-for-field match with single-release) → per-pledge compounding override sanitized against `VALID_COMPOUNDING`. ACTIVE and OVERDUE accept-lists appear in **four spots** (preflight filter, execute preflight filter, in-txn per-pledge re-check, in-txn `updateMany` guard) — change them together or the status handling diverges.

Confirm UI (`release-bulk/page.tsx`): stateless on refresh (ids from `?ids=` query string). Preflight on mount + debounced date change. Per-pledge compounding toggles compute locally. Binary success/failure. Requires `<Suspense>` wrapper for `useSearchParams`. Per-row and select-all checkboxes enabled for ACTIVE **and** OVERDUE (`activePledges` helper: `status === "ACTIVE" || status === "OVERDUE"`).

### Pledge delete safety
Hard delete, blocked for RELEASED/SOLD pledges. `Transaction` rows trigger `409 PENDING_TRANSACTIONS` (with count) unless `?confirmDelete=true`. Real DELETE endpoint: `/api/customers/[customerId]/pledges/[pledgeId]` — there is no `/api/pledges/[pledgeId]` DELETE.

## Inventory module

An `InventoryItem` represents a physical item owned by the shop. Schema in `inventory_items` table.

### Entry paths
- **`PLEDGE_SALE`** — active/overdue pledge → "Add to Inventory" flow. `sourcePledgeId` links back to the pledge. One pledge maps to at most one inventory item.
- **`DIRECT_PURCHASE`** — owner bought an item directly, no pledge. `sourcePledgeId` null, `amountOwedAt` null.

### Exit path
- **`status: SOLD`** — item sold to a buyer via the sell flow. `soldPrice`, `soldAt`, optional `buyerName`/`buyerMobile`/`saleNotes`.

### InventoryItem weight model
Mirrors the pledge system — three separate weight fields, not one combined value:
- `grossWeight` — physical weight of the item as weighed (including alloys).
- `netWeightOfGold` — pure gold equivalent: `round(grossWeight × purity/100, 3dp)` for GOLD items, 0 otherwise.
- `netWeightOfSilver` — pure silver equivalent: `round(grossWeight × purity/100, 3dp)` for SILVER items, 0 otherwise.
- `purity` (`Decimal?`) — item purity as a percentage (e.g. 91.67 for 22K gold). Null for OTHER metal or pledge-sourced items with multiple constituent purities.

For **direct purchases**: net weights derived server-side at creation (Invariant 3) — never trusted from the client. GOLD/SILVER require purity; OTHER sets both net weights to 0. The buy form shows a live-computed net weight display (convenience only, server re-derives on submit).

For **pledge-sourced items**: `netWeightOfGold` and `netWeightOfSilver` copied from the pledge's aggregate fields (exact, covering all items in the pledge). `grossWeight` summed from `pledge.items[].grossWeight` (loaded via the existing items select — no new query). `purity` from `pledge.items[0].purity` (representative for display; net weights are the financially meaningful values). This means a mixed gold+silver pledge correctly populates both net-weight fields on the InventoryItem.

**Market value uses net weights only** — `netWeightOfGold × goldRate + netWeightOfSilver × silverRate`. Gross weight and purity are display fields.

### "Add to Inventory" flow (Invariants 11 + 12)
`POST /api/customers/[customerId]/pledges/[pledgeId]/sell` — body `{ buyPrice, notes, saleDate }`. Single `prisma.$transaction({ timeout: 30000 })`, all-or-nothing:
1. `updateMany({ where: { status: { in: ["ACTIVE", "OVERDUE"] } } })` double-status guard (`count === 0` → 409 `NOT_ACTIVE`) → `Pledge.status = SOLD`.
2. `PledgeAudit` with `action: "SOLD"` — mirrors RELEASED audit field-for-field (Invariant 12).
3. `InventoryItem` created with the weight fields as described above, `acquiredCost = buyPrice`, `amountOwedAt = calculateHybridInterest(...).receivableAmount` at `saleDate` (Invariant 11), `acquiredMetalRate` snapshotted from current `MetalPrice`.

### Acquisition cost model (critical — do not revert)
The owner inputs the **Acquisition Cost / Item Value** — the shop's cost basis for the item, independent of the loan. The cash actually handed to the customer is **derived, never typed**:

  `cashToCustomer = max(acquisitionCost - amountOwed, 0)`

If `acquisitionCost ≤ amountOwed`: cash = ₹0, and the shop absorbs `(amountOwed - acquisitionCost)` as an uncovered loss on this loan. This replaces the old "forfeiture" special case — there is no separate forfeiture mode. `buyPrice = 0` is simply the extreme case where the owner assigns the item zero value.

The sell page shows a three-line breakdown: Amount Owed / Acquisition Cost / Cash to Pay Customer (olive, bold, large when > 0). An orange loss note appears when `acquisitionCost < amountOwed`. The old `isForfeiture` flag and yellow "Forfeiture" badge have been removed.

**`acquiredCost` stores the acquisition cost (cost basis), NOT the cash paid.** Net position (`acquiredCost - amountOwedAt`) and sale profit (`soldPrice - acquiredCost`) are display-time derivations, never stored (Invariant 11).

**For already-terminal pledges (SOLD or RELEASED), the sell page shows a closed-state summary card instead of the action form**, showing the acquisition cost, derived cash paid, and a "View in Inventory →" link if an InventoryItem exists.

### Inventory APIs
- `GET /api/inventory` — filtered list (`status`, `sourceType`, `metalType` filters), `orderBy acquiredAt desc`. Returns `{ items, summary }` (summary: in-stock count + value, sold count + revenue). Scoped by `ownerId: user.id`.
- `POST /api/inventory` — direct purchase. Required body fields: description, itemType (validated against `PledgeItemType`), metalType (GOLD/SILVER/OTHER, case-insensitive, stored title-case), grossWeight (> 0), acquiredCost (≥ 0), acquiredAt, sellerName (required). Optional: purity (required for GOLD/SILVER, 0 < p ≤ 100), sellerIdNum, notes, photoUrl. Server derives `netWeightOfGold`/`netWeightOfSilver` from grossWeight + purity + metalType (Invariant 3). Snapshots `acquiredMetalRate` from current `MetalPrice` for GOLD/SILVER. Creates `DIRECT_PURCHASE` item, `status: IN_STOCK`.
- `GET /api/inventory/[id]` — single item, ownership-checked via `ownerId`.
- `GET /api/inventory/[id]/receipt` — JSON `{ item, shop }` by default; `?format=pdf` streams `generateInventoryPurchasePDF`. Ownership enforced via `ownerId`.
- `POST /api/inventory/[id]/sell` — body: soldPrice (> 0), soldAt, buyerName?, buyerMobile?, saleNotes?. Atomic: `updateMany({ where: { id, ownerId, status: "IN_STOCK" }, … })` with `count === 0` → 409 `ALREADY_SOLD`. The `findFirst` ownership read remains as a 404 fast-path only.
- `GET /api/inventory/analytics` — live aggregation across all InventoryItem rows for this user. Returns `{ stock: { count, goldWeightGrams, silverWeightGrams, acquiredCost, marketValue, isMarketValuePartial }, sold: { count, goldWeightGrams, silverWeightGrams, moneyCollected, costBasis, realizedProfit }, total: { itemCount }, rates: { goldPerGram, silverPerGram, updatedAt } }`. All values computed live — nothing stored in FinancialSnapshot. `marketValue = SUM(netWeightOfGold × goldPpg + netWeightOfSilver × silverPpg)` for IN_STOCK items; null if both prices missing. Fetches MetalPrice directly (not via /api/market-rates internally).

### Inventory page (`app/(UserDetails)/inventory/page.tsx`)
Client component. Summary strip (4 KPI cards): In Stock count, Total Acquired Value, Sold count, Total Sold Revenue. Below the summary strip: **Portfolio Metals section** (self-contained component with its own fetch from `/api/inventory/analytics`) showing: Net Gold Weight in stock, Net Silver Weight in stock, current Market Value, Acquired Cost, Unrealized P&L (green/red); Sold sub-section when `sold.count > 0` (gold/silver sold, total collected, realized profit); rate footnote (Gold ₹X/g · Silver ₹Y/g · Updated {relative time}). Empty state when `total.itemCount === 0`: section hidden entirely. The `MetalRateStrip` component was removed from the inventory page itself (redundant with the Portfolio Metals rate footnote); it remains on the sidebar and buy page.

Filter pills: status / source / metal. Sort dropdown. Table columns: Photo | Item | Type | Metal+Purity | Weight (gross + net subtitle) | Acquired date | Cost | Status. Row action: "Sell" button for IN_STOCK items (Sell modal). "Add Item" navigates to `/inventory/buy`.

### Purchase receipt (`app/(UserDetails)/inventory/[id]/receipt/page.tsx`)
Client page showing on-screen receipt after a direct purchase. Fetches from `GET /api/inventory/[id]/receipt`. "Download PDF" triggers `?format=pdf` → `generateInventoryPurchasePDF` (olive header `#565C3F`, A4 portrait, shop letterhead, item details including gross weight + net weight, metal rate at acquisition, seller info, two signature lines, short reference ID from last 8 chars of item id).

### MetalRateStrip (`components/inventory/MetalRateStrip.tsx`)
Client component. `variant: "full"` — inline row with TrendingUp icon, "Gold ₹X/g · Silver ₹Y/g · Updated N min ago." `variant: "compact"` — two stacked lines at text-[11px] for the sidebar. Fetches `/api/market-rates` on mount. Graceful loading/error/null-rate states. Used on: sidebar (compact), buy-item page (full). NOT used on the inventory list page (replaced by Portfolio Metals rate footnote).

## Tasks module

Full CRUD task manager for the shop owner. Model: `Task` (`id`, `userId`, `title`, `isDone`, `dueDate?`, `createdAt`, `updatedAt`) — cascades from `User`. Routes: `GET/POST /api/tasks`, `PATCH/DELETE /api/tasks/[taskId]`. Page: `app/(UserDetails)/tasks/page.tsx`. Standard auth pattern (Invariants 1 & 4). No cross-user data. Tasks are private to each shop owner.

## Customer features

### `Customer.isPinned` (Boolean, default false)
Pin/unpin a customer to the top of the customer list. Route: `PATCH /api/customers/[customerId]/pin`. Ownership-checked via `userId`. The customer list page sorts pinned customers first.

## Metal price pipeline

- **[lib/fetchPrices.ts](lib/fetchPrices.ts)** — `fetchMetalPricesUsd()` pulls gold (`GC=F`) and silver (`SI=F`) USD/oz from Yahoo Finance (no key, 5s abort timeout, parallel). `fetchUsdToInr()` pulls USD→INR from Alpha Vantage (`ALPHA_VANTAGE_API_KEY` required).
- **[lib/getOrUpdateUsdToInr.ts](lib/getOrUpdateUsdToInr.ts)** — caches USD/INR in `ExchangeRate` with 23h TTL (Alpha Vantage free tier ~1 call/day), with re-check race guard.
- **[lib/storePrices.ts](lib/storePrices.ts)** — converts USD/oz → INR/gram (`÷31.1035` then `+15% import duty`), skips if last `MetalPrice` row is <1h50m old, falls back to last cached exchange rate on Alpha Vantage failure. All LTV reads: `metalPrice.findFirst({ where: { metal }, orderBy: { createdAt: "desc" } })` backed by `(metal, createdAt desc)` index.

After first production deploy, manually trigger `update-prices` once to seed `MetalPrice`/`ExchangeRate` so LTV doesn't show blank for the first hour:
```bash
curl -X GET https://yourdomain.com/api/cron/update-prices \
  -H "Authorization: Bearer YOUR_PRODUCTION_CRON_SECRET"
```

### Cron endpoints (auth differs — easy to get wrong)
Both use `CRON_SECRET`, fail closed on missing/empty, compare constant-time:
- `GET /api/cron/update-prices` — `Authorization: Bearer <CRON_SECRET>`
- `POST /api/cron/evaluate-risk` — `x-cron-secret: <CRON_SECRET>`

On a VPS, drive crons via crontab:
```
0 */2 * * * curl -s GET http://localhost:3000/api/cron/update-prices -H "Authorization: Bearer <SECRET>"
30 20 * * * curl -s -X POST http://localhost:3000/api/cron/evaluate-risk -H "x-cron-secret: <SECRET>"
```

## Reports module

[app/reports/page.tsx](app/reports/page.tsx) — three tabs: **Customer Report**, **Active Pledges**, **Released Pledges**. Shared date-range filter (From/To + quick-select). Stats strip from `/api/reports/pledges` (no `status` param, legacy path). Each tab re-fetches debounced 300ms on date changes. `TOO_MANY_RECORDS` (>5000 rows) surfaced inline. PDF export with `?format=pdf`.

All report routes: standard auth pattern. Dates as `YYYY-MM-DD`, interpreted as IST day boundaries via `istBoundary` helper (`+05:30` offset).

- **[app/api/reports/customers/route.ts](app/api/reports/customers/route.ts)** — non-deleted customers, ACTIVE/OVERDUE pledges only for counts/totals (SOLD and RELEASED excluded), live `calculateHybridInterest`, live metal prices (fetched once, falls back to `lastMarketValue`), `computeCustomerRiskScore` per customer. `?format=pdf` → `generateCustomerPDF`.

- **[app/api/reports/pledges/route.ts](app/api/reports/pledges/route.ts)** — three modes:
  - **`active`** — filter by `pledgeDate`, 5000-row cap, live LTV/interest via `calculateLTV`. Returns `{ rows, totals }`.
  - **`released`** — filter by `releaseDate`, 5000-row cap. Reads finalized values from `PledgeAudit` where `action: "RELEASED"` (falls back to Pledge row for legacy). SOLD pledges not surfaced here.
  - **no `status` (legacy)** — stats strip only, bare `rows` array.
  - `?format=pdf` → `generatePledgePDF(variant)`.

NOTE: A future inventory/sales report should query `action: "SOLD"` audits + `InventoryItem` rows. Not yet built.

### PDF generation ([lib/generatePDF.ts](lib/generatePDF.ts))

| Function | Layout | Color | Notes |
|---|---|---|---|
| `generateReceiptPDF` | A4 landscape, dual-copy | Black/white | Hindi terms via NotoSansDevanagari font; shop + customer copies with dashed divider |
| `generateCustomerPDF` | A4 portrait | Blue `#1e40af` | Columns: #, Name, Mobile, Added On, Pledges, Total Loan, Risk Score |
| `generatePledgePDF` | A4 portrait | Green `#065f46` | Variant-aware: active → Gold Wt + Silver Wt separate; released → combined Net Wt + Released date. LTV color-coded. Totals footer. |
| `generateInventoryPurchasePDF` | A4 portrait | Olive `#565C3F` | Direct-purchase receipt: shop letterhead, gross + net weight, metal rate at acquisition, seller info, two signature lines, short reference id |

`fetchImageBuffer` (receipt PDF image fetch) must use a 5s `AbortController` timeout and fall back to `null` on failure. `pdfkit` is in `serverExternalPackages` in `next.config.ts`.

## Customer portal (public, token-based)

Each `Customer` has an unguessable `viewToken` (UUID, unique index). `/view/[token]` — public server-rendered read-only pledge statement using `calculateHybridInterest`. Exposes only `shopName`/`mobile` and that customer's pledges — no owner id, subscription status, or other customers. `isPortalBlocked` revokes access; portal polls `/api/portal-status/[token]`. QR codes via `qrcode.react`. Unauthenticated endpoints have no rate limiting (known gap). The portal's `Pledge.status` exhaustive map must include all four status values (`ACTIVE`, `RELEASED`, `OVERDUE`, `SOLD`) — adding a new status without updating this map causes a typecheck error.

## Data model notes

Full schema in [prisma/schema.prisma](prisma/schema.prisma). Cascade on delete: `User → Customer → Pledge → {PledgeItem, Transaction, PledgeAudit, PledgeAlert}`. `User → InventoryItem` cascades. `User → PledgeItemType` (custom types) cascades. `User → Task` cascades. `Pledge → InventoryItem` uses `onDelete: SetNull`. Soft-deletes: `deletedAt` on `User`/`Customer` only (NOT on `Pledge`). Money: `Decimal`. `FinancialSnapshot` unique on `userId + snapshotDate`. `Transaction` types: REPAYMENT_PRINCIPAL / REPAYMENT_INTEREST / TOPUP.

Key `InventoryItem` fields: `grossWeight` (physical), `netWeightOfGold` / `netWeightOfSilver` (server-derived, immutable after creation), `purity` (nullable), `acquiredCost` (cost basis — NOT cash paid to customer for pledge-sourced items), `amountOwedAt` (snapshotted at sale time, null for direct purchases), `acquiredMetalRate` (INR/gram at acquisition, null for OTHER or no price data — read-only after creation).

`FinancialSnapshot` contains **pledge-system metrics only** (LTV, risk tiers, loan amounts, weight of pledged gold/silver). Inventory data is **never stored here** — it is always computed live from `InventoryItem` rows via `/api/inventory/analytics`. Do not add inventory fields to `FinancialSnapshot`.

Cascade caveat: `PledgeAudit`/`Transaction` are financial records but currently cascade-delete with parent. Known gap: `onDelete: Restrict` or soft-delete + snapshot.

### Indexes
`Customer(userId, deletedAt)`, `Pledge(customerId, status)`, `Pledge(status, createdAt)`, `PledgeAudit(pledgeId, createdAt)`, `Transaction(pledgeId, createdAt desc)`, `MetalPrice(metal, createdAt desc)`, `PledgeAlert(userId, isRead)`, `PledgeAlert(userId, createdAt desc)`, `ExchangeRate(from, to, createdAt desc)`, `Customer.viewToken @unique`, `FinancialSnapshot @@unique(userId, snapshotDate)`, `FinancialSnapshot(userId, calculatedAt desc)`, `InventoryItem(ownerId, status)`, `InventoryItem(ownerId, sourceType)`, `InventoryItem(ownerId, createdAt)`, `InventoryItem(sourcePledgeId) @unique`, `PledgeItemType(userId)`, `PledgeItemType(isDefault)`, `Task(userId)`. Add composite indexes for any new hot query path.

## Conventions

- Path alias `@/*` maps to repo root. Import Prisma types from `@prisma/client` — NOT from `@/src/generated/prisma` (divergent generated client; must be gitignored, not committed).
- Singleton Prisma client from [lib/prisma.ts](lib/prisma.ts) — never `new PrismaClient()`.
- API errors: client-facing error bodies are ALWAYS generic (`{ error: "Server Error" }` or a similar generic string), with an optional stable code, logged server-side. NEVER return `err.message`, `err.stack`, the raw error object, or a Prisma error's `.meta` (which can carry table/column/constraint names) in a response body.
  - `err.message` MAY be used **server-side only** — for control flow via sentinel comparison (e.g. `err.message === "ALREADY_RELEASED"` → 409) and in bounded `console.error` logs. Never in a response body.
  - **Server logs must not contain customer PII, full request bodies, secrets, or unbounded error dumps** (no `console.dir(err, { depth: null })`). Logs persist to disk on a VPS.
- Image uploads: Cloudinary via `lib/upload.ts`. No server-side MIME/size validation yet (known gap).
- PDF: `pdfkit` ([lib/generatePDF.ts](lib/generatePDF.ts)), four exports. In `serverExternalPackages`.
- UI: shadcn primitives under `components/ui/` (Radix + `class-variance-authority` + `tailwind-merge`, Tailwind v4). Hindi terms in `lib/defaultTerms.ts`.
- Route groups: `(auth)`, `(UserDetails)`, `(CustomersDetails)`.
- Server-only helpers (e.g. `constantTimeEqual`) in their own `lib/` file, separate from client-importable utils.
- Currency display: use `toLocaleString("en-IN")` for exact amounts in financial comparisons. Use `formatCurrencyAbbr` only for axis labels or at-a-glance KPIs — abbreviation hides interest accrual when amounts are close.
- Inventory analytics: always computed live from `InventoryItem` rows. Never store pre-computed inventory aggregates anywhere. See `/api/inventory/analytics` for the canonical pattern.

## Required environment variables

`DATABASE_URL` (pooled — used by BOTH the app runtime and the Prisma CLI; see Prisma datasource gotcha), `DIRECT_URL` (currently read by nothing — retained as convention for direct/unpooled migrations; optional as wired today), Clerk (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `WEBHOOK_SECRET`, `NEXT_PUBLIC_CLERK_*` redirect URLs), `NEXT_PUBLIC_BASE_URL`, Cloudinary (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`), Razorpay (`NEXT_PUBLIC_RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `RAZORPAY_PLAN_YEARLY`, `RAZORPAY_PLAN_HALF_YEARLY`), `ALPHA_VANTAGE_API_KEY`, `CRON_SECRET` (32+ chars).

**Production checklist:**
- `CRON_SECRET` and `RAZORPAY_WEBHOOK_SECRET` must be non-empty (Invariant 6).
- Use a new Clerk **production instance** — fresh keys, recreate JWT template.
- New clean Neon production database. Run `npx prisma migrate deploy` then `npx prisma db seed`. The seed command runs `prisma/seed-defaults.ts`, which idempotently creates the 10 system-default `PledgeItemType` rows (`isDefault: true`, `userId: null`) and exits 0 whether it created rows or skipped existing ones. It contains no PII and no hardcoded user IDs, and is safe to run repeatedly. Verify in prisma studio that 10 default rows exist.
- Set `NEXT_PUBLIC_BASE_URL` to the production domain.
- Configure Razorpay webhook URL → `https://yourdomain.com/api/webhook/razorpay` (live mode + KYC).
- Configure Clerk webhook → `https://yourdomain.com/api/webhook/register` (events: `user.created`, `user.deleted`).
- Trigger `update-prices` cron once manually after first deploy to seed metal prices.
- On Vercel Hobby: `evaluate-risk` cron will time out past small pledge volumes — use VPS crontab instead.

## Known gaps / not yet implemented

Deliberately tracked so reviews focus on real bugs rather than re-discovering these.

- **No request validation layer.** No Zod. Hand-parsed inputs. Planned: `lib/validations/` Zod layer shared across both customer-create paths.
- **Divergent customer-create validation.** `add-customer` (FormData) enforces 10-digit mobile regex; `customers` POST (JSON) does not.
- **No rate limiting.** No limiter on any route — including unauthenticated surfaces (`/view/[token]`, `/api/portal-status/[token]`, `/api/cron/*`).
- **No webhook replay/idempotency protection.** Razorpay events not deduped by event id. Planned: `ProcessedWebhook(eventId unique)` table.
- **`verify-payment` replay-after-refund not handled.**
- **`create-subscription` can orphan Razorpay subscriptions** on repeated mints by expired/halted users.
- **Cascade-delete of `PledgeAudit`/`Transaction`** destroys financial history on hard delete.
- **`pledgeDate` bounds not enforced** on create (future/far-past dates allowed).
- **Cloudinary uploads have no server-side MIME/size validation** — applies to pledge item photos AND inventory direct-purchase photos.
- ~~Part-payment flow has no UI.~~ **Implemented.** `POST /api/customers/[customerId]/pledges/[pledgeId]/transactions` records a `Transaction` (standard auth + ownership scoping; validates positive amount, type ∈ {REPAYMENT_PRINCIPAL, REPAYMENT_INTEREST, TOPUP}, optional note ≤1000 chars, optional transactionDate). The pledge detail page (`app/(CustomersDetails)/customers/[customerId]/pledges/[pledgeId]/page.tsx`) has the form — type dropdown, amount, date, submit — plus read-only history. Note: the route stores `amount` as `new Prisma.Decimal(Number(amount))`; it does not adjust the pledge balance (Transactions are a ledger, not applied to accrual).
- **Inventory reports not built.** Future: a Reports tab reading `action: "SOLD"` audits + `InventoryItem` rows.
- **No error monitoring** (no Sentry; `console.*` only). **No structured logging.** **Security headers** — the four base headers (X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy, HSTS) ARE implemented in `next.config.ts`, plus `Permissions-Policy` and a `Content-Security-Policy-Report-Only` header. Enforcing CSP is still deferred: Next.js App Router, Clerk, and Razorpay all inject inline scripts, so a strict nonce-based policy needs nonce plumbing first — the Report-Only header collects violations in the meantime. **Before switching Report-Only → enforcing (`Content-Security-Policy`), violations must be collected across a real Clerk sign-in flow AND a real Razorpay checkout, and the Clerk origin must change from `*.clerk.accounts.dev` to the production Clerk Frontend API host.** **Backup/DR: Neon defaults only.** **Cron: no retry/dead-letter/alerting on missed runs.**
- **Dev/ops scripts tracked in git.** Three one-off scripts ship in a clone: [scripts/check-db-state.ts](scripts/check-db-state.ts), [scripts/migrate-item-types.ts](scripts/migrate-item-types.ts), [scripts/reconcile-subscriptions.ts](scripts/reconcile-subscriptions.ts). They contain no secrets and no injection surface, but they are DB-mutating tooling. **Accepted for now** given a private repo with few collaborators — documented here so it is a decision, not an oversight.
- **Customer PII in git history.** Two ledger-import scripts (`prisma/seed.ts`, `prisma/seed-ledger-entries-batch2.ts`) contained real customer PII (names, regions, loan amounts transcribed from a physical ledger) and used `new PrismaClient()` in violation of Invariant 9. They were **removed from the working tree** so they no longer ship to future clones, but they **remain in git history** — a history purge (`git filter-repo`/BFG + force-push) was **deliberately not performed**. The repo must stay private. `prisma db seed` now runs the PII-free `prisma/seed-defaults.ts`.
- **No `.env.example`.** Onboarding a new developer means reconstructing the env-var list from the checklist below. Optional: add a `.env.example` with placeholder values only (no real secrets) for developer onboarding.

## Security posture (audited)

Summary of what a security audit verified, so future reviews don't re-litigate settled ground. Do not reintroduce anything in "Fixed during audit."

### Verified clean (as of this audit)
- **Tenant scoping is universal.** Every authenticated API route resolves identity via `auth()` → `prisma.user.findUnique({ where: { clerkUserId } })` → internal `user.id`, and scopes all domain queries by that id — directly or through the owner relation (see Invariant 1).
- **All five public surfaces use their correct mechanism:** Razorpay HMAC (`/api/webhook/razorpay`), Svix signature (`/api/webhook/register`), and **two distinct cron secret schemes** — `Authorization: Bearer <CRON_SECRET>` for `update-prices`, `x-cron-secret: <CRON_SECRET>` for `evaluate-risk` — plus token + `isPortalBlocked` for the customer portal (`/view/[token]`, `/api/portal-status/[token]`).
- **All secret comparisons use `constantTimeEqual` and fail closed** on empty/missing env values (Invariant 6).
- **All raw SQL is parameterized.** No `$queryRawUnsafe` / `$executeRawUnsafe` exists anywhere (grep returns zero). The only raw SQL touching user input is [app/api/dashboard/region-search/route.ts](app/api/dashboard/region-search/route.ts), which parameterizes both `${user.id}` and the search term `${q}` in a Prisma tagged template.
- **No env file is tracked in git or present in git history.** `.gitignore` covers `.env*`.
- **No hardcoded secrets.** The only `NEXT_PUBLIC_` vars referenced in application code are `NEXT_PUBLIC_BASE_URL` and `NEXT_PUBLIC_RAZORPAY_KEY_ID`, both genuinely public by design. (Clerk's `NEXT_PUBLIC_CLERK_*` vars are read by the Clerk SDK, not app code, and are also public by design.)
- **Every UI-gated state transition is independently re-enforced server-side**, with atomic `updateMany` + `count === 0` guards (release, bulk-release, sell-to-inventory, inventory sell).
- **No portal enumeration oracle.** Portal denial responses do not distinguish "token not found" from "token blocked."

### Fixed during audit (do not reintroduce)
- **Cross-tenant PII leak in the pledge receipt route.** It queried `{ id: pledgeId, customerId }` with **no `userId` relation**, letting any authenticated tenant fetch another tenant's receipt PDF. This is the exact incident Invariant 1 documents — it has been reintroduced once already. Every pledge lookup by URL id MUST include `customer: { userId: user.id }`.
- **Raw `err.message` returned to clients** from the onboarding route.
- **Unbounded `console.dir(err, { depth: null })`** writing Prisma query context and form PII to disk logs.
- **Debug `console.log` statements** writing customer names and full item details to server logs from the receipt route.

### Known accepted risk (not a blocker)
- **Subscription status is NOT enforced on any data-mutating API route.** `SubscriptionGuard` is a client component; `proxy.ts` enforces sign-in only. A lapsed user holding a valid Clerk session can still call mutating endpoints. Because every route remains correctly tenant-scoped, this is **revenue leakage, not a data-exposure risk**. If enforcement becomes a product requirement, it belongs in a shared server-side guard, not per-route.