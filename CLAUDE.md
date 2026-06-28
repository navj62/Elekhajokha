# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

E-Lekha-Jokha is a Next.js 16 (App Router) SaaS for gold/silver pawnbrokers (pledge shops) in India. Shop owners record customer pledges of gold/silver jewellery against loans, track accruing interest, monitor loan-to-value (LTV) risk against live metal prices, manage an inventory of items acquired through pledge sales/forfeitures and direct purchases, and share a read-only portal with each customer. Access is gated behind a Razorpay subscription. UI strings and printed receipts are largely in Hindi.

## Invariants (do not violate)

These are hard rules. When editing or reviewing code, treat any violation as a bug. Each has been the source of a real incident in this codebase.

1. **Tenant scoping.** Every Prisma query touching `Customer`, `Pledge`, `PledgeItem`, `Transaction`, `PledgeAudit`, `PledgeAlert`, `FinancialSnapshot`, or `InventoryItem` MUST be scoped to the authenticated internal `user.id`. For nested resources, enforce ownership through the relation (e.g. `where: { id: pledgeId, customer: { userId: user.id } }`). NEVER trust an `id` from the request body, params, or query for ownership — resolve the user from `auth()` → `prisma.user.findUnique({ where: { clerkUserId } })` → `user.id`, and scope by that. (A receipt route once queried `{ id: pledgeId, customerId }` with no `userId` link — a cross-tenant PII leak. Do not reintroduce this pattern.)

2. **Money & weight precision.** Money is `Decimal` in the DB. `Number(...)` conversion is acceptable for display formatting and read-only computed responses (e.g. `/api/access` days-left, financial-summary aggregates that are never written back). It is NOT acceptable for values that accrue or persist — keep interest accrual, compounding, and stored balances in `Prisma.Decimal` end to end. When summing per-item weights into `netWeightOfGold`/`netWeightOfSilver`, round each item to 3 dp THEN sum (round-then-sum), to match the stored per-item values — never sum raw products and round once.

3. **Server-derived valuation inputs.** `netWeightOfMetal` per `PledgeItem` is computed server-side as `round(netWeight × purity/100, 3dp)` — NEVER trusted from the client. It drives market value → LTV → risk tier → alerts, so a client-asserted value is a financial-integrity hole. The pledge create path is the ONLY write path for items/weights (items are immutable after creation); if you ever add a pledge-item edit path, it MUST re-derive this value the same way.

4. **Auth resolution.** API handlers resolve identity via `auth()` → `prisma.user.findUnique({ where: { clerkUserId } })` → internal `user.id`. Do not skip the DB resolution and scope domain tables by `clerkUserId` directly.

5. **Webhook signature verification is mandatory.** `/api/webhook/razorpay` MUST HMAC-verify `x-razorpay-signature` before acting; `/api/webhook/register` (Svix) MUST verify its Svix signature. No webhook mutates state on an unverified payload.

6. **Constant-time secret comparison + fail closed.** All shared-secret checks (`CRON_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, Razorpay signature) use `constantTimeEqual` from [lib/constantTimeEqual.ts](lib/constantTimeEqual.ts), and MUST reject when the secret env var is falsy (empty string included). Never use `!==`/`===` on a secret, and never use a non-null assertion (`!`) on a secret env var — an empty-string secret with `createHmac("", ...)` fails OPEN.

7. **Customer portal is a separate trust boundary.** `/view/[token]` and `/api/portal-status/[token]` are unauthenticated and token-in-URL. They expose only that one customer's read-only data, must respect `isPortalBlocked`, and must never leak owner-level or cross-customer fields.

8. **Single source of truth for money owed.** Amount owed is always computed via `calculateHybridInterest` ([lib/interest.ts](lib/interest.ts)). Do not reimplement interest math inline. Risk tiers come from `getRiskTier` in [lib/calculateLTV.ts](lib/calculateLTV.ts) — do not redefine them locally with divergent values or label strings.

9. **Prisma client.** Always import the singleton from [lib/prisma.ts](lib/prisma.ts). Never `new PrismaClient()`.

10. **Subscription state writes are deterministic.** `subscriptionEndDate` is always sourced from Razorpay's `current_end` (both in `/api/verify-payment` and the webhook), never computed locally as `+6mo/+1yr`. When writing `subscriptionStatus: "created"`, you MUST also write `subscriptionCreatedAt` in the same operation — a null timestamp on a `created` row locks the user out (see Subscriptions below).

11. **Inventory acquisition snapshots are immutable.** `InventoryItem.amountOwedAt` is computed via `calculateHybridInterest` at the exact sale/acquisition date and stored ONCE. Never recompute it, never overwrite it, and never derive it from `Pledge.receivableAmount`. Net position (`acquiredCost - amountOwedAt`) and sale profit (`soldPrice - acquiredCost`) are ALWAYS derived at display time — never stored as fields.

12. **SOLD and RELEASED audit rows are structurally indistinguishable.** When a pledge is added to inventory, its `PledgeAudit` row (`action: "SOLD"`) mirrors the RELEASED audit row field-for-field: same `CALCULATION_VERSION`, same `Prisma.Decimal` wrapping, same null-guarded metal-price/market-value/LTV snapshot pattern. The only difference is the `action` field. Reporting code relies on this parity.

## Commands

```bash
npm run dev       # Next dev server on http://localhost:3000
npm run build     # prisma generate && next build
npm run start     # production server
npm run lint      # eslint (flat config, eslint-config-next)
npx tsc --noEmit  # typecheck — the PRIMARY verification gate (no test runner exists)

npx prisma generate          # regenerate the Prisma client
npx prisma migrate dev       # apply/create migrations (dev)
npx prisma migrate deploy    # apply migrations in production (never migrate dev on prod)
npx prisma studio            # inspect the DB
npx prisma db seed           # runs tsx prisma/seed.ts (seeds default PledgeItemType rows)
```

There is no test runner configured in this repo. After any change, run `npx tsc --noEmit` and `npm run lint`; for build-time issues (dynamic imports, server/client boundaries) run `npm run build`. For flows that touch payment or the DB, verify manually in `prisma studio` — typecheck passing is necessary but not sufficient.

### Prisma datasource gotcha
The runtime client and the CLI read **different** connection strings:
- App runtime ([lib/prisma.ts](lib/prisma.ts)) connects via the Neon serverless adapter using `DATABASE_URL` (pooled).
- The Prisma CLI ([prisma.config.ts](prisma.config.ts)) uses `DIRECT_URL` (direct, unpooled) — required for migrations.

[prisma/schema.prisma](prisma/schema.prisma) intentionally declares `datasource db` with no inline `url`; the URL is injected by the adapter at runtime and by `prisma.config.ts` for the CLI. Don't "fix" this by adding `url = env(...)` to the schema.

### Prisma client staleness (critical)
After ANY schema change — especially enum changes or enum removals — run `npx prisma generate` AND clear the Turbopack cache (`rm -rf .next`) before restarting dev. A stale generated client combined with a cached Turbopack chunk produced a runtime `P2023 "Value 'Ring' not found in enum 'ItemType'"` error after the ItemType enum was dropped, even though the schema and DB were correct. When in doubt: generate → clear cache → restart.

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
- **[lib/customerRiskScore.ts](lib/customerRiskScore.ts)** — `computeCustomerRiskScore(input)` — composite 0–100 score per customer: LTV pressure (0–40), velocity (-10–25), time-to-underwater (0–25), concentration (0–10), age (0–5). Tiers: **≤30 SAFE, ≤50 WATCH, ≤75 AT_RISK, >75 CRITICAL** (different from per-pledge tiers — uses CRITICAL not UNDERWATER). Used by the customer reports route; `ltvThirtyDaysAgo` passed as `null` in the report path.
- **[app/api/cron/evaluate-risk/route.ts](app/api/cron/evaluate-risk/route.ts)** — paginated batch job over all `ACTIVE` pledges. BATCH_SIZE ~500, per-user counts hoisted to one `groupBy`, per-pledge writes via `UPDATE … FROM (VALUES …)`, snapshot upserts with bounded concurrency. No run-wide transaction — idempotent and resumable. Caches `lastCalculatedLtv` (clamped 999999.99), `lastRiskTier`, `lastAmountOwed`, `lastMarketValue`, `lastEvaluatedAt` per pledge. Upserts daily `FinancialSnapshot`. Supports `?dryRun=true`. Query count: ~540k → ~13k. **Sets `maxDuration = 60` (Vercel Pro target). On Vercel Hobby (10s hard cap), the cron silently times out past small pledge volumes.**

### Pledge weights
`netWeightOfGold`/`netWeightOfSilver` are denormalized onto `Pledge` at create time (round-then-sum, see Invariants 2 & 3). LTV/risk code reads these aggregates directly — no `PledgeItem` join needed. Items are write-once (no edit path). A pledge can hold both gold and silver simultaneously; always sum them independently and never collapse to one dominant metal.

### Item types — DB-driven strings (enum removed)
`PledgeItem.itemType` is a plain `String` storing the human-readable label directly (e.g. `"Ring"`, `"Kamarbandh"`). The old `ItemType` Prisma enum has been **fully removed**. Do not reference `ItemType` anywhere — the grep result for it must be zero.

Valid types live in the `PledgeItemType` table (`pledge_item_types`):
- **System defaults** (`isDefault: true`, `userId: null`) — 10 rows seeded by `prisma/seed.ts`: Ring, Necklace, Bangles, Chain, Earrings, Bracelet, Anklet, Pendant, Bangle Set, Other. Shared across all users, not deletable via API.
- **Custom types** (`isDefault: false`, `userId` set) — user-created, private, deletable.

API: `GET /api/item-types` returns `{ defaults, custom }`; `POST /api/item-types` creates a custom type (50-char max, case-insensitive duplicate check against both defaults and user's own); `DELETE /api/item-types/[id]` is ownership-checked, blocks default deletion. The pledge-create API validates the submitted label against `PledgeItemType` (`isDefault: true OR userId === user.id`) — does not accept arbitrary strings. **`PledgeItem.itemType` stores the label string, NOT a FK** — deleting a custom type never corrupts existing pledges. Display renders the string directly (no conversion wrapper). Search uses `{ itemType: { contains, mode: "insensitive" } }`. Profile page manages custom types. Pledge-create form and inventory direct-purchase modal both use a grouped dropdown (Standard / Custom) fed from `GET /api/item-types`.

### Pledge lifecycle and status
`Pledge.status` is one of `ACTIVE | RELEASED | OVERDUE | SOLD` (the Prisma `PledgeStatus` enum has all four — do not assume a 3-value enum):
- **ACTIVE** — customer has the loan, item in shop.
- **RELEASED** — customer paid back, item returned. Terminal.
- **OVERDUE** — an open loan past its expected term. It is an **open, non-terminal** status: like ACTIVE, an OVERDUE pledge can still be released (single + bulk) OR sold to inventory. Every code path that accepts ACTIVE for a closure/transition MUST also accept OVERDUE (`status: { in: ["ACTIVE", "OVERDUE"] }`), and the customer-page bulk-selection checkboxes enable both. Treat ACTIVE-only guards on a closure path as a bug.
- **SOLD** — item acquired by the shop via the "Add to Inventory" flow (customer sold it OR owner forfeited; `salePrice = 0` means forfeiture). Terminal. SOLD pledges must never inflate at-risk/overdue metrics or the customer risk score. Display as "Sold to Shop" badge on the customer page.

### Pledge release & audit trail
Releasing a pledge (PATCH on the pledge route) is the most safety-critical write: finalizes interest, snapshots metal price/market-value/LTV into a `PledgeAudit` row, guards against double-release via `updateMany({ where: { status: { in: ["ACTIVE", "OVERDUE"] } } })` inside a transaction (throws `ALREADY_RELEASED` → 409 if already flipped). Accepts both ACTIVE and OVERDUE pledges (status gate `status !== "ACTIVE" && status !== "OVERDUE"` → 400). Body reads only `{ releaseDate, allowCompounding, compoundingDuration }` — cannot edit items/weights. `CALCULATION_VERSION = 1` stamped on every audit row. Single-release page exposes a compounding toggle (seeded from stored pledge values, live preview via useMemo, PATCH honors it) and renders `Transaction` history.

### Bulk pledge release
Two POST routes under `app/api/customers/[customerId]/pledges/bulk-release/`. Additive — single-release is unchanged.
- **Preflight** — read-only: body shape → ownership (one `findMany` scoped through `customer: { userId }`, count check) → status all ACTIVE-or-OVERDUE (`status !== "ACTIVE" && status !== "OVERDUE"` is offending) → release date after latest `pledgeDate` → metal prices (once). Returns per-pledge previews using stored compounding defaults.
- **Execute** — re-runs all four checks (defense-in-depth), then all-or-nothing `prisma.$transaction({ timeout: 30000 })`. Per pledge: `updateMany` double-release guard (`status: { in: ["ACTIVE", "OVERDUE"] }`) → `PledgeAudit` creation (field-for-field match with single-release, same `CALCULATION_VERSION`, same null-guarded Decimal pattern) → per-pledge compounding override sanitized against `VALID_COMPOUNDING = ["MONTHLY","HALFYEARLY","YEARLY"]`. Any throw rolls back the entire batch. Metal prices fetched once per request and once inside the txn. Bulk and single audit rows are intentionally indistinguishable. ACTIVE and OVERDUE accept-lists appear in four spots (preflight filter, execute preflight filter, in-txn per-pledge re-check, in-txn `updateMany` guard) — change them together.

Confirm UI (`release-bulk/page.tsx`): stateless on refresh (ids from `?ids=` query string). Preflight on mount + debounced date change (only server round-trip). Per-pledge compounding toggles compute locally via `calculateHybridInterest`. Binary success/failure — no partial commit. Requires `<Suspense>` wrapper for `useSearchParams`. Selection on customer page is id-based (`Set<string>`) — persists across filter changes; all selected ids go in the URL regardless of current table view. Per-row and select-all checkboxes are enabled for ACTIVE **and** OVERDUE pledges (the `activePledges` helper filters `status === "ACTIVE" || status === "OVERDUE"`); keep this in sync with the API accept-lists or OVERDUE pledges become unselectable despite the API allowing them.

### Pledge delete safety
Hard delete, blocked for RELEASED/SOLD pledges. `Transaction` rows trigger `409 PENDING_TRANSACTIONS` (with count) unless `?confirmDelete=true`. Confirmed delete cascade-removes `Transaction`/`PledgeAudit` (known P2 gap). Real DELETE endpoint: `/api/customers/[customerId]/pledges/[pledgeId]` — there is no `/api/pledges/[pledgeId]` DELETE.

## Inventory module

An `InventoryItem` represents a physical item owned by the shop. Schema in `inventory_items` table.

### Entry paths
- **`PLEDGE_SALE`** — active pledge → "Add to Inventory" flow. `sourcePledgeId` links back to the pledge. One pledge maps to at most one inventory item.
- **`DIRECT_PURCHASE`** — owner bought an item directly, no pledge. `sourcePledgeId` null, `amountOwedAt` null.

### Exit path
- **`status: SOLD`** — item sold to a buyer via the sell flow. `soldPrice`, `soldAt`, optional `buyerName`/`buyerMobile`/`saleNotes`.

### "Add to Inventory" flow (Invariants 11 + 12)
`POST /api/customers/[customerId]/pledges/[pledgeId]/sell` — body `{ buyPrice, notes, saleDate }`. `buyPrice = 0` means forfeiture. Mirrors the release PATCH in auth + ownership + validation. Single `prisma.$transaction({ timeout: 30000 })`, all-or-nothing:
1. `updateMany({ where: { status: { in: ["ACTIVE", "OVERDUE"] } } })` double-status guard (accepts ACTIVE **and** OVERDUE; `count === 0` → 409 `NOT_ACTIVE`) → `Pledge.status = SOLD`, `salePrice`, `releaseDate` (reused as closure date), finalized interest fields.
2. `PledgeAudit` with `action: "SOLD"` — mirrors RELEASED audit field-for-field (Invariant 12).
3. `InventoryItem` created: `sourceType = PLEDGE_SALE`, `sourcePledgeId`, item details from pledge's first item (description, itemType, metalType, purity, combined weight → `weightGrams`, inherited `photoUrl`), `acquiredCost = buyPrice`, `amountOwedAt = calculateHybridInterest(...).receivableAmount` at `saleDate` (Invariant 11).

Confirm page (`pledges/[pledgeId]/sell/page.tsx`): mirrors release page two-panel layout. Shows live amount-owed (client-side via `calculateHybridInterest` on date change), buy-price input, derived **net position** (`amountOwed - buyPrice`: green = recovered above cost, neutral = break-even, orange = loss). `buyPrice = 0` shows a "forfeiture" badge (yellow). Confirmation modal before submit. On success: redirect to customer page.

**Display rules:**
- `acquiredCost = 0` → "Forfeited" badge (yellow `#FFF4D1 / #8A6B17`). Never show "₹0".
- Net position always derived at display time. Never stored (Invariant 11).
- Sale profit (`soldPrice - acquiredCost`) always derived at display time. Never stored.
- `soldPrice` = what buyer paid shop (incoming). `acquiredCost` = what shop paid to acquire (outgoing). Never conflate.

### Inventory API
- `GET /api/inventory` — filtered list (`status` in_stock/sold/all, `sourceType` pledge/direct/all, `metalType` gold/silver/other/all), `orderBy acquiredAt desc`. Returns `{ items, summary }` (summary: in-stock count + value, sold count + revenue). Scoped by `ownerId: user.id`.
- `POST /api/inventory` — direct purchase. Body: description, itemType (validated against `PledgeItemType`), metalType, purity, weightGrams, acquiredCost, acquiredAt, sellerName?, sellerIdNum?, notes?, photoUrl?. `metalType` is validated against `GOLD/SILVER/OTHER` (case-insensitive) and **stored title case** (`Gold`/`Silver`/`Other`) to match the UI display convention; the GET filter compares `mode: "insensitive"` so casing never breaks filtering. `purity` (when provided) bounded `0 < purity ≤ 100`. `weightGrams > 0`, `acquiredCost ≥ 0`. Creates `DIRECT_PURCHASE` item, `status: IN_STOCK`.
- `GET /api/inventory/[id]` — single item, ownership-checked via `ownerId`.
- `POST /api/inventory/[id]/sell` — body: soldPrice (>0), soldAt, buyerName?, buyerMobile?, saleNotes?. The IN_STOCK→SOLD transition is atomic: `updateMany({ where: { id, ownerId, status: "IN_STOCK" }, … })` with `count === 0` → 409 `ALREADY_SOLD` (mirrors the pledge release/sell guard — the status predicate lives in the WHERE clause, NOT a separate app-code read, so concurrent double-sells can't overwrite each other). The `findFirst` ownership read remains as a 404 fast-path.

### Inventory page (`app/(UserDetails)/inventory/page.tsx`)
Client component. Sidebar link: Archive icon, placed after Reports. Summary strip (4 KPI cards): In Stock count, Total Acquired Value, Sold count, Total Sold Revenue. Filter pills: status / source / metal. Sort dropdown: newest/oldest/value high-low/low-high. Table columns: Photo thumbnail | Item (description + source badge linking to customer if PLEDGE_SALE) | Type | Metal+Purity | Weight | Acquired date | Cost (or "Forfeited" badge if 0) | Net (pledge items only) | Status (IN_STOCK badge or "Sold · ₹X · date"). Row action: "Sell" button for IN_STOCK items. Empty state with Inbox icon.

Two modals (no page navigation):
- **Direct purchase modal** — triggered by "Add Item" button. Fields: description, itemType (grouped dropdown from `/api/item-types`), metalType, purity, weight, purchase price, date, photo (Cloudinary, ≤5MB, JPEG/PNG/WEBP), sellerName?, sellerIdNum?, notes?.
- **Sell modal** — triggered by "Sell" on each IN_STOCK row. Fields: soldPrice (>0), soldAt, buyerName?, buyerMobile?, notes?. Shows live profit display as user types.

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

On Vercel Hobby (10s timeout): `evaluate-risk` silently times out past small pledge volumes. Designed for Vercel Pro (60s) or a VPS crontab calling `localhost` with no timeout. On a VPS, drive crons via crontab:
```
0 */2 * * * curl -s GET http://localhost:3000/api/cron/update-prices -H "Authorization: Bearer <SECRET>"
30 20 * * * curl -s -X POST http://localhost:3000/api/cron/evaluate-risk -H "x-cron-secret: <SECRET>"
```

## Reports module

[app/reports/page.tsx](app/reports/page.tsx) — three tabs: **Customer Report**, **Active Pledges**, **Released Pledges**. Shared date-range filter (From/To + quick-select: Last 30 Days / This Month / Last Month). Stats strip fetched from `/api/reports/pledges` (no `status` param, legacy path, filter-independent). Each tab re-fetches debounced 300ms on date changes. Filtered-totals strip above the table (computed server-side in same API call as rows — atomically consistent). `TOO_MANY_RECORDS` (>5000 rows) surfaced inline. PDF export mirrors current tab + date filter with `?format=pdf`.

All report routes: standard auth pattern (Invariants 1 & 4). Dates as `YYYY-MM-DD`, interpreted as IST day boundaries via `istBoundary` helper (`+05:30` offset, start-of-day / end-of-day).

- **[app/api/reports/customers/route.ts](app/api/reports/customers/route.ts)** — non-deleted customers, active pledges only for counts/totals, live `calculateHybridInterest` per pledge, live metal prices (fetched once, falls back to `lastMarketValue`), `computeCustomerRiskScore` per customer. `?format=pdf` → `generateCustomerPDF`.

- **[app/api/reports/pledges/route.ts](app/api/reports/pledges/route.ts)** — three modes:
  - **`active`** — filter by `pledgeDate`, 5000-row cap, live LTV/interest via `calculateLTV` (prices once). Returns `{ rows, totals }`. Columns: Customer, Date, Pledge (item name), Gold Wt, Silver Wt (separate), Loan, Interest, Receivable, LTV, Status.
  - **`released`** — filter by `releaseDate`, 5000-row cap. Reads finalized values from `PledgeAudit` where `action: "RELEASED"` (falls back to Pledge row for legacy). Returns `{ rows, totals }`. Columns add Released date, use combined Net Wt.
  - **no `status` (legacy)** — unfiltered, uncapped, no interest/LTV — stats strip only. Returns bare `rows` array.
  - `?format=pdf` → `generatePledgePDF(variant)`.

  NOTE: Released variant only reads `action: "RELEASED"` audits. SOLD pledges are not surfaced here. A future inventory/sales report should query `action: "SOLD"` audits + `InventoryItem` rows.

### PDF generation ([lib/generatePDF.ts](lib/generatePDF.ts))

| Function | Layout | Color | Notes |
|---|---|---|---|
| `generateReceiptPDF` | A4 landscape, dual-copy | Black/white | Hindi terms via NotoSansDevanagari font; shop + customer copies with dashed divider |
| `generateCustomerPDF` | A4 portrait | Blue header `#1e40af` | Columns: #, Name, Mobile, Added On, Pledges, Total Loan, Risk Score |
| `generatePledgePDF` | A4 portrait | Green header `#065f46` | Variant-aware: active → Gold Wt + Silver Wt separate; released → combined Net Wt + Released date. No PHOTO column. LTV color-coded. Totals footer. |

`fetchImageBuffer` (receipt PDF image fetch) must use a 5s `AbortController` timeout and fall back to `null` on failure — prevents the receipt endpoint from timing out on a slow Cloudinary CDN response. `pdfkit` is in `serverExternalPackages` in `next.config.ts`.

## Customer portal (public, token-based)

Each `Customer` has an unguessable `viewToken` (UUID, unique index). `/view/[token]` — public server-rendered read-only pledge statement using `calculateHybridInterest`. Exposes only `shopName`/`mobile` and that customer's pledges — no owner id, subscription status, or other customers. `isPortalBlocked` revokes access (`/api/customers/[customerId]/toggle-portal`); portal polls `/api/portal-status/[token]`. QR codes via `qrcode.react` (client-side). Unauthenticated endpoints have no rate limiting (known gap).

## Data model notes

Full schema in [prisma/schema.prisma](prisma/schema.prisma). Cascade on delete: `User → Customer → Pledge → {PledgeItem, Transaction, PledgeAudit, PledgeAlert}`. `User → InventoryItem` cascades. `User → PledgeItemType` (custom types) cascades. `Pledge → InventoryItem` uses `onDelete: SetNull` (pledge deletion nulls `sourcePledgeId` but keeps the inventory row). Soft-deletes: `deletedAt` on `User`/`Customer` only (NOT on `Pledge`). Money: `Decimal`. `FinancialSnapshot` unique on `userId + snapshotDate`. `Transaction` types: REPAYMENT_PRINCIPAL / REPAYMENT_INTEREST / TOPUP.

Cascade caveat: `PledgeAudit`/`Transaction` are financial records but currently cascade-delete with parent. Hard deletes are rare (soft deletes for users/customers, guarded for pledges) but treat any new hard-delete path as a compliance risk. Known gap: `onDelete: Restrict` or soft-delete + snapshot.

### Indexes
`Customer(userId, deletedAt)`, `Pledge(customerId, status)`, `Pledge(status, createdAt)`, `PledgeAudit(pledgeId, createdAt)`, `Transaction(pledgeId, createdAt desc)`, `MetalPrice(metal, createdAt desc)`, `PledgeAlert(userId, isRead)`, `ExchangeRate(from, to, createdAt desc)`, `Customer.viewToken @unique`, `FinancialSnapshot @@unique(userId, snapshotDate)`, `InventoryItem(ownerId, status)`, `InventoryItem(ownerId, sourceType)`, `InventoryItem(ownerId, createdAt)`, `InventoryItem(sourcePledgeId)`, `PledgeItemType(userId)`, `PledgeItemType(isDefault)`. Add composite indexes for any new hot query path.

## Conventions

- Path alias `@/*` maps to repo root. Import Prisma types from `@prisma/client` — NOT from `@/src/generated/prisma` (divergent generated client; must be gitignored, not committed; deleting it eliminates ~100 false lint errors).
- Singleton Prisma client from [lib/prisma.ts](lib/prisma.ts) — never `new PrismaClient()`.
- API errors: generic `{ error: "..." }` with optional stable code, logged server-side. NEVER return `err.message`/`err.stack` to the client.
- Image uploads: Cloudinary via `lib/upload.ts`. No server-side MIME/size validation yet (known gap).
- PDF: `pdfkit` ([lib/generatePDF.ts](lib/generatePDF.ts)), three exports. In `serverExternalPackages`.
- UI: shadcn primitives under `components/ui/` (Radix + `class-variance-authority` + `tailwind-merge`, Tailwind v4). Hindi terms in `lib/defaultTerms.ts`.
- Route groups: `(auth)`, `(UserDetails)`, `(CustomersDetails)`.
- Server-only helpers (e.g. `constantTimeEqual`) in their own `lib/` file, separate from client-importable utils.
- Currency display: use `toLocaleString("en-IN")` for exact amounts in financial comparisons (loan vs owed, etc.). Use `formatCurrencyAbbr` only for axis labels or at-a-glance KPIs where the two amounts being compared won't round to the same abbreviation. Abbreviation hides interest accrual when amounts are close (e.g. ₹10,000 and ₹10,400 both round to "₹10K").

## Required environment variables

`DATABASE_URL` (pooled), `DIRECT_URL` (migrations only — not read by app runtime but required for `prisma migrate deploy`; add to Vercel env vars), Clerk (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `WEBHOOK_SECRET`, `NEXT_PUBLIC_CLERK_*` redirect URLs), `NEXT_PUBLIC_BASE_URL`, Cloudinary (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`), Razorpay (`NEXT_PUBLIC_RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `RAZORPAY_PLAN_YEARLY`, `RAZORPAY_PLAN_HALF_YEARLY`), `ALPHA_VANTAGE_API_KEY`, `CRON_SECRET` (32+ chars).

**Production checklist:**
- `CRON_SECRET` and `RAZORPAY_WEBHOOK_SECRET` must be non-empty (Invariant 6).
- Use a new Clerk **production instance** (not switch from dev) — fresh `PUBLISHABLE_KEY` + `SECRET_KEY`. Recreate JWT template.
- Use a new clean Neon production database. Run `npx prisma migrate deploy` then `npx prisma db seed` (seeds 10 default `PledgeItemType` rows).
- Set `NEXT_PUBLIC_BASE_URL` to the production domain.
- Configure Razorpay webhook URL → `https://yourdomain.com/api/webhook/razorpay` (live mode keys + KYC required).
- Configure Clerk webhook → `https://yourdomain.com/api/webhook/register` (events: `user.created`, `user.deleted`). Update Clerk allowed redirect URLs to include production domain.
- Trigger `update-prices` cron once manually after first deploy to seed metal prices.
- On Vercel Hobby: `evaluate-risk` cron will time out past small pledge volumes — upgrade to Pro or run on VPS.

## Known gaps / not yet implemented

Deliberately tracked so reviews focus on real bugs rather than re-discovering these.

- **No request validation layer.** No Zod. Hand-parsed inputs; bounds enforced inline only in pledge create. Planned: `lib/validations/` Zod layer, shared across both customer-create paths.
- **Divergent customer-create validation.** `add-customer` (FormData) enforces 10-digit mobile regex; `customers` POST (JSON) does not.
- **No rate limiting.** No limiter on any route — including unauthenticated surfaces (`/view/[token]`, `/api/portal-status/[token]`, `/api/cron/*`).
- **No webhook replay/idempotency protection.** Razorpay events not deduped by event id. Planned: `ProcessedWebhook(eventId unique)` table.
- **`verify-payment` replay-after-refund not handled.** Subscription confirmed active at verify time; no re-check outside the webhook.
- **`create-subscription` can orphan Razorpay subscriptions** on repeated mints by expired/halted users (billing hygiene, not access bypass).
- **Cascade-delete of `PledgeAudit`/`Transaction`** destroys financial history on hard delete.
- **`pledgeDate` bounds not enforced** on create (future/far-past dates allowed).
- **Cloudinary uploads have no server-side MIME/size validation** — applies to pledge item photos AND inventory direct-purchase photos (cost-DoS surface).
- **Part-payment flow has no UI.** `Transaction` model (REPAYMENT_PRINCIPAL/REPAYMENT_INTEREST/TOPUP) exists and is rendered read-only on the release page, but there is no form to record a part-payment.
- **Inventory reports not built.** Acquisition/sales/current-stock reports are unbuilt. Future: a Reports tab reading `action: "SOLD"` audits + `InventoryItem` rows.
- **No error monitoring** (no Sentry; `console.*` only). **No structured logging.** **Security headers** — four basic headers (X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy, HSTS) should be in `next.config.ts`; CSP deferred (Clerk/Razorpay inline scripts need tuning). **No test runner.** **Backup/DR: Neon defaults only.** **Cron: no retry/dead-letter/alerting on missed runs.**
- **Sign-up hooks violation (fix before production).** [app/(auth)/sign-up/page.tsx](app/(auth)/sign-up/page.tsx) has a `useEffect` after a conditional early return — Rules of Hooks violation. Can intermittently crash sign-up as the Clerk SDK initializes. Fix: move ALL hooks above the early return, gate on `isLoaded` instead. Flagged by `react-hooks/rules-of-hooks`.
- **`src/generated/prisma/` must be gitignored.** Committed generated Prisma client diverges from `node_modules/@prisma/client` and inflates lint output with ~100 false errors. Add `src/generated/` to `.gitignore` and delete the committed copy. `prisma generate` runs during `npm run build` on Vercel — the client is regenerated fresh each deploy.
- **`test-db.js` must be deleted** from repo root (committed dev artifact; picked up by ESLint; could be accidentally run by a CI step).