# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

E-Lekha-Jokha is a Next.js 16 (App Router) SaaS for gold/silver pawnbrokers (pledge shops) in India. Shop owners record customer pledges of gold/silver jewellery against loans, track accruing interest, monitor loan-to-value (LTV) risk against live metal prices, and share a read-only portal with each customer. Access is gated behind a Razorpay subscription. UI strings and printed receipts are largely in Hindi.

## Invariants (do not violate)

These are hard rules. When editing or reviewing code, treat any violation as a bug. Each has been the source of a real incident in this codebase.

1. **Tenant scoping.** Every Prisma query touching `Customer`, `Pledge`, `PledgeItem`, `Transaction`, `PledgeAudit`, `PledgeAlert`, or `FinancialSnapshot` MUST be scoped to the authenticated internal `user.id`. For nested resources, enforce ownership through the relation (e.g. `where: { id: pledgeId, customer: { userId: user.id } }`). NEVER trust an `id` from the request body, params, or query for ownership — resolve the user from `auth()` → `prisma.user.findUnique({ where: { clerkUserId } })` → `user.id`, and scope by that. (A receipt route once queried `{ id: pledgeId, customerId }` with no `userId` link — a cross-tenant PII leak. Do not reintroduce this pattern.)

2. **Money & weight precision.** Money is `Decimal` in the DB. `Number(...)` conversion is acceptable for display formatting and read-only computed responses (e.g. `/api/access` days-left, financial-summary aggregates that are never written back). It is NOT acceptable for values that accrue or persist — keep interest accrual, compounding, and stored balances in `Prisma.Decimal` end to end. When summing per-item weights into `netWeightOfGold`/`netWeightOfSilver`, round each item to 3 dp THEN sum (round-then-sum), to match the stored per-item values — never sum raw products and round once.

3. **Server-derived valuation inputs.** `netWeightOfMetal` per `PledgeItem` is computed server-side as `round(netWeight × purity/100, 3dp)` — NEVER trusted from the client. It drives market value → LTV → risk tier → alerts, so a client-asserted value is a financial-integrity hole. The pledge create path is the ONLY write path for items/weights (items are immutable after creation); if you ever add a pledge-item edit path, it MUST re-derive this value the same way.

4. **Auth resolution.** API handlers resolve identity via `auth()` → `prisma.user.findUnique({ where: { clerkUserId } })` → internal `user.id`. Do not skip the DB resolution and scope domain tables by `clerkUserId` directly.

5. **Webhook signature verification is mandatory.** `/api/webhook/razorpay` MUST HMAC-verify `x-razorpay-signature` before acting; `/api/webhook/register` (Svix) MUST verify its Svix signature. No webhook mutates state on an unverified payload.

6. **Constant-time secret comparison + fail closed.** All shared-secret checks (`CRON_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, Razorpay signature) use `constantTimeEqual` from [lib/constantTimeEqual.ts](lib/constantTimeEqual.ts), and MUST reject when the secret env var is falsy (empty string included). Never use `!==`/`===` on a secret, and never use a non-null assertion (`!`) on a secret env var — an empty-string secret with `createHmac("", ...)` fails OPEN.

7. **Customer portal is a separate trust boundary.** `/view/[token]` and `/api/portal-status/[token]` are unauthenticated and token-in-URL. They expose only that one customer's read-only data, must respect `isPortalBlocked`, and must never leak owner-level or cross-customer fields.

8. **Single source of truth for money owed.** Amount owed is always computed via `calculateHybridInterest` ([lib/interest.ts](lib/interest.ts)). Do not reimplement interest math inline. Risk tiers come from `getRiskTier` in [lib/calculateLTV.ts](lib/calculateLTV.ts) (thresholds below) — do not redefine them locally with divergent values or label strings.

9. **Prisma client.** Always import the singleton from [lib/prisma.ts](lib/prisma.ts). Never `new PrismaClient()`.

10. **Subscription state writes are deterministic.** `subscriptionEndDate` is always sourced from Razorpay's `current_end` (both in `/api/verify-payment` and the webhook), never computed locally as `+6mo/+1yr`. When writing `subscriptionStatus: "created"`, you MUST also write `subscriptionCreatedAt` in the same operation — a null timestamp on a `created` row locks the user out (see Subscriptions below).

## Commands

```bash
npm run dev       # Next dev server on http://localhost:3000
npm run build     # prisma generate && next build
npm run start     # production server
npm run lint      # eslint (flat config, eslint-config-next)
npx tsc --noEmit  # typecheck — the PRIMARY verification gate (no test runner exists)

npx prisma generate          # regenerate the Prisma client
npx prisma migrate dev       # apply/create migrations (dev)
npx prisma studio            # inspect the DB
npx prisma db seed           # runs tsx prisma/seed.ts
```

There is no test runner configured in this repo. After any change, run `npx tsc --noEmit` and `npm run lint`; for build-time issues (dynamic imports, server/client boundaries) run `npm run build`. For flows that touch payment or the DB, verify manually in `prisma studio` — typecheck passing is necessary but not sufficient.

### Prisma datasource gotcha
The runtime client and the CLI read **different** connection strings:
- App runtime ([lib/prisma.ts](lib/prisma.ts)) connects via the Neon serverless adapter using `DATABASE_URL` (pooled).
- The Prisma CLI ([prisma.config.ts](prisma.config.ts)) uses `DIRECT_URL` (direct, unpooled) — required for migrations.

[prisma/schema.prisma](prisma/schema.prisma) intentionally declares `datasource db` with no inline `url`; the URL is injected by the adapter at runtime and by `prisma.config.ts` for the CLI. Don't "fix" this by adding `url = env(...)` to the schema.

### Migration gotcha (index builds at scale)
Prisma's generated `CREATE INDEX` / `DROP INDEX` are NOT `CONCURRENTLY`, so on large existing tables they take a write-blocking lock while the index builds. For `Pledge`/`Customer` at scale, either run the migration in a low-traffic window, or hand-edit the generated SQL to `CREATE INDEX CONCURRENTLY` (which must run outside a transaction). At current data volumes this is instant and can be ignored.

## Middleware lives in `proxy.ts`

Next.js 16 renamed `middleware.ts` to **[proxy.ts](proxy.ts)**. This is the auth/onboarding gate (Clerk `clerkMiddleware`). Key behaviour:
- Public routes: `/`, `/sign-in`, `/sign-up`, `/view/*` (customer portal), `/api/webhook/*`, `/api/portal-status/*`, `/api/cron/*`.
- `/api/webhook/*` short-circuits before any auth (webhooks verify their own signatures).
- For **API routes**, the proxy only enforces sign-in — it does NOT enforce onboarding. Each API handler re-resolves the user itself.
- For **page routes**, unonboarded users are redirected to `/onboarding`; onboarding state is read from Clerk session claims `metadata.onboardingComplete`.

## Authentication & user model

Auth is **Clerk**; the app keeps a mirrored `User` row in Postgres keyed by `clerkUserId`.
- New Clerk users are synced into the DB by the **Svix webhook** at [app/api/webhook/register/route.ts](app/api/webhook/register/route.ts) (`user.created` / `user.deleted`). This handler must **always return 200** — it swallows all errors so Clerk never retries into a failure loop. It verifies the Svix signature first and returns 200 even on an invalid signature, but BEFORE any DB mutation, so there is no state-change vuln (only reduced observability — emit a distinct log on verification failure). It also writes `dbUserId`/`role`/`onboarded` back into Clerk `publicMetadata`.
- API handlers follow a consistent pattern: `auth()` → `prisma.user.findUnique({ where: { clerkUserId } })` → resolve internal `user.id` → scope all queries by that id. Ownership of nested resources is enforced through the relation, never by trusting request IDs (see Invariant 1).
- [app/api/access/route.ts](app/api/access/route.ts) is the authority on subscription access and is the one place that will lazily `create` a DB user if one is missing.

## Subscriptions (Razorpay)

The access/subscription state machine spans the frontend checkout, two API routes, the webhook, and the access gate. `User.subscriptionStatus` is one of `trial | created | active | halted | expired`. `/api/access` maps these to a frontend-safe status string and never leaks raw Prisma enums.

### The full flow (synchronous-first, webhook-backup)
1. **[app/subscription/page.tsx](app/subscription/page.tsx)** — `handleSubscribe()` POSTs to `/api/create-subscription`, then opens the Razorpay modal. On payment success, the Razorpay `handler(response)` callback POSTs the three response fields (`razorpay_payment_id`, `razorpay_subscription_id`, `razorpay_signature`) to `/api/verify-payment`. It redirects to `/dashboard` ONLY on confirmed success (and calls `router.refresh()`); on verification failure it shows an error and does NOT redirect. **The handler MUST capture and forward `response` — a handler that ignores it and just redirects leaves the user stuck at `created` forever.**
2. **[app/api/create-subscription/route.ts](app/api/create-subscription/route.ts)** — creates the Razorpay subscription, writes `subscriptionStatus = created` + `subscriptionCreatedAt = now` + `subscriptionPlan` + `razorpaySubscriptionId`. Eligibility: rejects `active`; reuses an existing `created` subscription without resetting the timestamp. **Every code path that sets `created` MUST also set `subscriptionCreatedAt` (Invariant 10).**
3. **[app/api/verify-payment/route.ts](app/api/verify-payment/route.ts)** — the PRIMARY path to access. Verifies the HMAC signature with `constantTimeEqual` (tries both `payment|subscription` and `subscription|payment` orderings), confirms the user owns the subscription, fetches the subscription server-side from Razorpay and requires `status ∈ {active, authenticated}`, then writes `subscriptionStatus = active` + `subscriptionEndDate = sub.current_end` + `razorpayPaymentId`, and clears `lastGraceExpiredAt`. Returns distinct error codes (`signature_invalid`, `subscription_not_found`, `payment_not_verified`, `subscription_mismatch`) or `{ success: true, status: "active" }`.
4. **[app/api/webhook/razorpay/route.ts](app/api/webhook/razorpay/route.ts)** — the BACKUP/renewal path. HMAC-verifies `x-razorpay-signature`, then flips `subscriptionStatus` on `subscription.activated`/`charged` (→ active, endDate from `current_end`), `halted` (→ halted), `completed`/`cancelled` (→ expired). **Cannot reach localhost** — in local dev the webhook path is dead, so `verify-payment` is the only thing that grants access. In production it handles renewals and the case where the synchronous verify fails.
5. **[hooks/useAccess.ts](hooks/useAccess.ts)** — client hook that polls `/api/access` with `cache: "no-store"`, refetches on mount and tab focus, and preserves the previous `hasAccess` on a network error so a paying user isn't blocked by a blip. **[components/SubscriptionGuard.tsx](components/SubscriptionGuard.tsx)** consumes it: shows a spinner while `isLoading`, the paywall when `!isLoading && !hasAccess`. It handles every status string (`processing`, `payment_timeout`, `payment_required`, `trial_expired`, etc.); add a new branch when introducing a new status.

### Access rules in `/api/access`
Grants `hasAccess: true` for: `trial` (not expired), `active` (not expired), and `created` within a **10-minute grace window** (`status: "processing"`) so the webhook/verify has time to land. After the window, `created` flips to `payment_timeout` and stamps `lastGraceExpiredAt`. The grace window is anti-farming protected: a non-paying user cannot loop create-subscription for unlimited free 10-minute windows — `lastGraceExpiredAt` within 24h blocks a re-grant (`payment_required`) and blocks a new mint in create-subscription (`GRACE_LIMIT` 429). `lastGraceExpiredAt` is cleared when a subscription becomes `active`.

**Self-healing:** if `/api/access` sees `created` with a `razorpaySubscriptionId`, it should fetch the subscription from Razorpay; if Razorpay reports `active`, it auto-heals (writes `active` + `current_end`) and grants access. This makes access resilient when neither verify-payment nor the webhook updated the row (e.g. localhost with a failed verify). A `created` row with a **null `subscriptionCreatedAt`** must be treated as expired, never returned as a 409 — defend against the data inconsistency even after fixing the write paths.

Plans are `halfyearly` / `yearly`, mapped to Razorpay plan IDs via `RAZORPAY_PLAN_HALF_YEARLY` / `RAZORPAY_PLAN_YEARLY`. Trials are started via `/api/start-trial` and are single-use per account (atomic `updateMany({ where: { hadTrial: false } })` — cannot be re-triggered to extend access).

## Core domain logic — interest, LTV, and risk

This is the heart of the app. Two pure functions plus a cron job:

- **[lib/interest.ts](lib/interest.ts)** — `calculateHybridInterest(principal, annualRate, startDate, endDate, allowCompounding, compoundingDuration)`. Computes duration `T` in months with a day-based fractional rule (≤2 days → +0, ≤15 days → +0.5, else +1 month; minimum 0.5). Compounds per cycle (`MONTHLY`/`HALFYEARLY`/`YEARLY`) with simple interest on the leftover partial cycle. Returns `{ T, totalInterest, receivableAmount }`. **Single source of truth for amount owed** — the customer portal and pledge release both reuse it.
- **[lib/calculateLTV.ts](lib/calculateLTV.ts)** — `calculateLTV(...)` calls `calculateHybridInterest`, computes metal market value (weight × INR/gram), returns `ltv` plus `riskTier`. `getRiskTier(ltv: number)` thresholds: **≤65 SAFE, ≤75 WATCH, ≤90 AT_RISK, else UNDERWATER** (note the underscore in `AT_RISK` — this is the canonical label; do not use `"AT RISK"`). `getRiskTier` expects a non-null number; guard `null` LTV at the call site (`ltv !== null ? getRiskTier(ltv) : "SAFE"`). If no price is available, `marketValue`/`ltv`/`riskTier` come back `null` (handled gracefully downstream).
- **[lib/customerRiskScore.ts](lib/customerRiskScore.ts)** — `computeCustomerRiskScore(input)` — a composite 0–100 score per **customer** (not per pledge), combining five components: LTV pressure (0–40 pts), LTV velocity delta (-10–25 pts), proximity to UNDERWATER threshold (0–25 pts), single-pledge concentration risk (0–10 pts), and average pledge age (0–5 pts). Tiers: **≤30 SAFE, ≤50 WATCH, ≤75 AT_RISK, >75 CRITICAL**. This is a completely different system from `getRiskTier` — customer tiers use "CRITICAL" (not "UNDERWATER") and score-based thresholds instead of direct LTV values. Used exclusively by the Reports module customer table; `ltvThirtyDaysAgo` (velocity) is omitted in the report path for efficiency (passed as `null`).
- **[app/api/cron/evaluate-risk/route.ts](app/api/cron/evaluate-risk/route.ts)** — batch job over all `ACTIVE` pledges. **Paginated** (cursor, batch size ~500, explicit thin `select`, no `transactions` include) and **batched** (per-user counts hoisted into one grouped query before the loop; per-pledge writes via batched `UPDATE … FROM (VALUES …)`; snapshot upserts fanned out with bounded concurrency). NO run-wide transaction — each batch commits independently, so the job is resumable: an interrupt at batch N leaves batches 1..N-1 durably committed, and a re-run is idempotent (cached metrics are absolute, not incremental; the `lastRiskTier` diff self-heals alert duplication; snapshots upsert on `userId+snapshotDate`). Writes a `PledgeAlert` only when a pledge's `riskTier` actually changes. Caches per-pledge metrics (`lastCalculatedLtv` clamped to 999999.99, `lastRiskTier`, `lastAmountOwed`, `lastMarketValue`, `lastEvaluatedAt`). Upserts a daily `FinancialSnapshot` per user (snapshots are written only after a full pass — all-or-nothing per run). `overallLtv`/`ltvAtRelease` are `Decimal(5,2)` (max 999.99) — coerce null→0 and clamp before writing or the insert throws. Supports `?dryRun=true`. Query count went from ~540k (would time out / exhaust the Neon pool past ~10k pledges) to ~13k with a max concurrency of ~50.

### Pledge weights
`netWeightOfGold` / `netWeightOfSilver` are denormalized onto `Pledge` (round-then-sum of per-item `round(netWeight × purity/100, 3dp)` at create time — see Invariants 2 & 3 and [app/api/customers/[customerId]/pledges/route.ts](app/api/customers/[customerId]/pledges/route.ts)). Risk/LTV code reads these aggregates directly and does not need to join `PledgeItem`. Items are write-once at create — there is no edit path. A single `Pledge` can hold **both** gold and silver (both weights `> 0`). When aggregating portfolio metal weights, sum `netWeightOfGold` and `netWeightOfSilver` **independently** — never collapse a pledge to a single dominant `metalType` and attribute its combined weight to one metal (this dropped the smaller metal's weight in the per-customer financial summary; fixed in [.../financial-summary/route.ts](app/api/customers/[customerId]/financial-summary/route.ts)). The customer-detail metal filter follows the same rule (a mixed pledge matches both the Gold and Silver pills).

### Pledge release & audit trail
Releasing a pledge ([app/api/customers/[customerId]/pledges/[pledgeId]/route.ts](app/api/customers/[customerId]/pledges/[pledgeId]/route.ts), `PATCH`) is the most safety-critical write: it finalizes interest, snapshots the metal price/market-value/LTV at release into a `PledgeAudit` row, and guards against double-release using `updateMany({ where: { status: "ACTIVE" } })` inside a transaction (throws `ALREADY_RELEASED` → 409 if already flipped). It only reads `{ releaseDate, allowCompounding, compoundingDuration }` from the body — it cannot edit items/weights. `calculationVersion` is stamped (const `CALCULATION_VERSION = 1`) so historical calculations stay reproducible. The single-release page ([.../release/page.tsx](app/(CustomersDetails)/customers/[customerId]/pledges/[pledgeId]/release/page.tsx)) exposes a user-controllable compounding toggle (seeded from the pledge's stored values; the live preview and the PATCH both honor it) and renders this pledge's `Transaction` history (the GET on the same route also returns `transactions`).

### Bulk pledge release
A batch release flow lives under `app/api/customers/[customerId]/pledges/bulk-release/`. It is **additive** — the single-release route above is unchanged. Two POST routes, both mirroring the single-release auth + ownership + validation patterns exactly:
- **`/bulk-release/preflight`** — read-only validation + interest/LTV/market-value preview for 1–50 pledges. Runs an ordered validation sequence, returning the first failure: body shape (`VALIDATION` 400) → ownership via one `findMany` scoped through `customer: { userId: user.id }` (`OWNERSHIP_VIOLATION` 403 if returned count < requested) → all-`ACTIVE` status (`ALREADY_RELEASED` 409 with `offendingIds`) → release date strictly after the latest `pledgeDate` (`INVALID_RELEASE_DATE` 400 with `suggestedMinDate`) → metal prices fetched **once** (`NO_METAL_PRICES` 503 if both null). Previews use each pledge's **stored** compounding as the default.
- **`/bulk-release` (execute)** — re-runs the same four validation steps (defense-in-depth, since the client can tamper between preflight and submit), then releases **all-or-nothing inside a single `prisma.$transaction({ timeout: 30000 })`**. Per pledge it mirrors single-release field-for-field: the `updateMany({ where: { status: "ACTIVE" } })` double-release guard (throws `ALREADY_RELEASED:<id>`), the `PledgeAudit` row with the same `CALCULATION_VERSION` and metal-price/market-value/LTV snapshot fields (null-guarded before `Prisma.Decimal`), and the per-pledge compounding **override** sanitized against `VALID_COMPOUNDING`. Any throw rolls back the whole batch — there is no partial commit. Bulk and single audit rows are intentionally indistinguishable. Metal prices are fetched once per request (and once more inside the txn for consistency), never per pledge.

The confirm UI ([.../release-bulk/page.tsx](app/(CustomersDetails)/customers/[customerId]/release-bulk/page.tsx)) is stateless-on-refresh (pledge ids come from the `?ids=` query string). It calls preflight on mount and on date change (debounced 300ms — the only server round-trip); per-pledge compounding toggles recompute receivable/interest/LTV **locally** via `calculateHybridInterest` (no server call). Submit treats the response as binary success/failure and never tries to partial-commit. `useSearchParams` requires the page be wrapped in `<Suspense>` (Next build constraint).

The selection surface is the customer-detail pledges table ([.../customers/[customerId]/page.tsx](app/(CustomersDetails)/customers/[customerId]/page.tsx)): per-row checkboxes (disabled for non-`ACTIVE` pledges) feed an id-based `selectedIds: Set<string>`, and a sticky action bar links to `/release-bulk?ids=<csv>` with **all** selected ids regardless of the current filter view. The table's search / Gold-Silver / sort / show-released controls are **client-side only** over the already-fetched `customer.pledges` (a `useMemo`-derived array — no extra API calls); the metal filter uses the per-pledge `netWeightOfGold`/`netWeightOfSilver` the customer GET now returns (not a label-text heuristic). That GET also returns each pledge's `netWeightOf*` and the pledge GET returns `transactions`.

### Pledge delete safety
`DELETE` on the pledge route is a hard delete (blocked for `RELEASED` pledges). If the pledge has `Transaction` rows (part-payments), the handler returns `409 PENDING_TRANSACTIONS` (with `transactionCount`) unless `?confirmDelete=true` is passed — the frontend shows a count-aware warning and retries with the flag on confirm. NOTE: confirmed delete still cascade-removes `Transaction`/`PledgeAudit` rows (financial history loss with no trace) — this is a known P2 tradeoff (see Known gaps). The real DELETE endpoint is `/api/customers/[customerId]/pledges/[pledgeId]`; there is no `/api/pledges/[pledgeId]` DELETE (that route only exports GET).

## Metal price pipeline

- **[lib/fetchPrices.ts](lib/fetchPrices.ts)** — `fetchMetalPricesUsd()` pulls gold (`GC=F`) and silver (`SI=F`) USD/oz from Yahoo Finance (no key, 5s abort timeout, parallel). `fetchUsdToInr()` pulls USD→INR from Alpha Vantage (requires `ALPHA_VANTAGE_API_KEY`; module throws on startup if missing).
- **[lib/getOrUpdateUsdToInr.ts](lib/getOrUpdateUsdToInr.ts)** — caches the USD/INR rate in `ExchangeRate` with a 23h TTL to stay within Alpha Vantage's free-tier budget (~1 call/day), with a re-check race guard.
- **[lib/storePrices.ts](lib/storePrices.ts)** — `updatePrices()` converts USD/oz → INR/gram (`/31.1035` then **+15% import duty**), skips if the last `MetalPrice` row is <1h50m old (double-write guard), falls back to the last stored exchange rate if Alpha Vantage fails, and writes new `MetalPrice` rows for GOLD and SILVER. All LTV reads use `metalPrice.findFirst({ where: { metal }, orderBy: { createdAt: "desc" } })`, backed by the `(metal, createdAt desc)` index.

### Cron endpoints (auth differs — easy to get wrong)
Both crons use `CRON_SECRET` with **different verbs and header schemes**, both fail closed on a missing/empty secret and compare constant-time:
- `GET /api/cron/update-prices` — expects `Authorization: Bearer <CRON_SECRET>`.
- `POST /api/cron/evaluate-risk` — expects header `x-cron-secret: <CRON_SECRET>`.

Driven by an external scheduler (e.g. cron-job.org); `/api/cron/*` is public in the proxy and self-authorizes via the secret. Use a strong (32+ char) `CRON_SECRET` — it is the only thing protecting these endpoints.

## Reports module

[app/reports/page.tsx](app/reports/page.tsx) is a client-side reporting center with three tabs — **Customer Report**, **Active Pledges**, and **Released Pledges** — and a shared date-range filter (From/To date inputs plus quick-select: Last 30 Days / This Month / Last Month). On mount it fetches the stats strip from `/api/dashboard` + the unfiltered `/api/reports/pledges` (no `status` param); each tab's data is fetched independently and re-fetched debounced 300ms on date changes. A `TOO_MANY_RECORDS` (>5000 rows) error from the API is surfaced inline, prompting the user to narrow the date range. PDF export calls the API with `?format=pdf` and mirrors the current tab and date filter.

Both report API routes authenticate via the standard `auth()` → `prisma.user.findUnique` → `user.id` pattern (Invariants 1 & 4). Both accept `startDate`/`endDate` as `YYYY-MM-DD` strings, interpreted as IST wall-clock day boundaries via an `istBoundary` helper (duplicated in each route — start of day at `+05:30`, end of day at `T23:59:59.999+05:30`).

- **[app/api/reports/customers/route.ts](app/api/reports/customers/route.ts)** (`GET`) — returns all non-deleted customers (filtered by `createdAt` when date range provided). For each customer, filters to **active pledges only** for counts/loan totals, then computes live `calculateHybridInterest` per active pledge. Market value prefers live metal prices fetched once; falls back to each pledge's cached `lastMarketValue`. Feeds `computeCustomerRiskScore` to attach a `riskScore` (0–100) and `riskTier` (SAFE/WATCH/AT_RISK/CRITICAL) per customer row. `?format=pdf` streams a customer PDF via `generateCustomerPDF`.

- **[app/api/reports/pledges/route.ts](app/api/reports/pledges/route.ts)** (`GET`) — three modes driven by `?status=`:
  - **`active`** — filters pledges by `pledgeDate`, enforces a hard cap of 5000 rows (`TOO_MANY_RECORDS` 400 if exceeded). Computes live LTV/interest via `calculateLTV` (prices fetched once for all rows). Returns `{ rows, totals }` where `totals` aggregates count, goldWeight, silverWeight, interestAccrued, receivableAmount, loanAmount.
  - **`released`** — filters by `releaseDate`, same 5000-row cap. Reads finalized values from the `PledgeAudit` row with `action: "RELEASED"` (totalInterest, combined netWeightOfGold + netWeightOfSilver → `netWeight`, `ltvAtRelease`); falls back to the Pledge row for legacy pledges with no audit row. Returns `{ rows, totals }`.
  - **no `status` param (legacy)** — unfiltered, uncapped, no interest/LTV computation — used only by the page's stats strip. Returns a bare `rows` array for backwards-compat.
  - `?format=pdf` streams via `generatePledgePDF` (variant `"active"` or `"released"`).

### PDF generation ([lib/generatePDF.ts](lib/generatePDF.ts))

Three exported functions sharing the same `pdfkit` document pipeline:

| Function | Layout | Color scheme | Notes |
|---|---|---|---|
| `generateReceiptPDF` | A4 landscape, dual-copy | Black/white | Hindi terms via `NotoSansDevanagari_Condensed-Bold.ttf`; Shopowner + Customer copies side-by-side with a dashed divider |
| `generateCustomerPDF` | A4 portrait | Blue header (`#1e40af`) | Columns: #, Customer Name, Mobile, Added On, Pledges, Total Loan, Risk Score (color-coded by tier) |
| `generatePledgePDF` | A4 portrait | Green header (`#065f46`) | Variant-aware columns: active → Gold Wt + Silver Wt separate; released → combined Net Wt + Release Date. LTV cell color-coded by the same thresholds as the web UI |

`pdfkit` is in `serverExternalPackages` in [next.config.ts](next.config.ts) so it is not bundled by Next.js.

## Customer portal (public, token-based)

Each `Customer` has an unguessable `viewToken` (UUID, backed by a unique index). `/view/[token]` ([app/view/[token]/page.tsx](app/view/[token]/page.tsx)) is a public server-rendered read-only statement of that customer's pledges (using `calculateHybridInterest` for live amounts), no Clerk auth. It exposes only the owner's `shopName`/`mobile` (intentional contact info) and that customer's own pledges — no owner id, subscription status, or other customers. Owners revoke access via `Customer.isPortalBlocked` (`/api/customers/[customerId]/toggle-portal`); the portal polls `/api/portal-status/[token]`. QR codes are generated client-side (`qrcode.react`). NOTE: these unauthenticated endpoints are not rate-limited (known gap).

## Data model notes

Full schema in [prisma/schema.prisma](prisma/schema.prisma). Relationships cascade on delete from `User → Customer → Pledge → {PledgeItem, Transaction, PledgeAudit, PledgeAlert}`. Soft-deletes use `deletedAt` on `User`/`Customer` (NOT on `Pledge` — do not filter pledges by `deletedAt`). Money is `Decimal` (see Invariant 2). `FinancialSnapshot` is the per-day dashboard rollup (unique on `userId + snapshotDate`); `Transaction` (REPAYMENT_PRINCIPAL / REPAYMENT_INTEREST / TOPUP) records part-payments.

Cascade caveat: `PledgeAudit` and `Transaction` are financial/compliance records but currently cascade-delete with their parent. A hard delete of a `User`/`Customer`/`Pledge` destroys this history. App-level deletes are soft (users/customers) or guarded (pledges), so cascade rarely fires — but treat any new hard-delete path as a compliance risk (known gap; candidates: `onDelete: Restrict` or soft-delete + snapshot).

### Indexes
Schema is well-indexed. Confirmed composites: `Customer(userId, deletedAt)`, `Pledge(customerId, status)`, `Pledge(status, createdAt)`, `PledgeAudit(pledgeId, createdAt)`, `Transaction(pledgeId, createdAt desc)`, `MetalPrice(metal, createdAt desc)`, `PledgeAlert(userId, isRead)`, `ExchangeRate(from, to, createdAt desc)`, `Customer.viewToken @unique`, `FinancialSnapshot @@unique(userId, snapshotDate)`. FKs are explicitly indexed (Prisma does not auto-index them). Add composite indexes for any new hot query path; prefer extending an existing index (leftmost-prefix still serves the narrower query) over adding a redundant one.

## Conventions

- Path alias `@/*` maps to the repo root (e.g. `@/lib/prisma`). Import Prisma enums/types from `@prisma/client`, NOT from `@/src/generated/prisma` (a divergent generated client — do not couple routes to it).
- Use the shared singleton from [lib/prisma.ts](lib/prisma.ts) — never instantiate `PrismaClient` directly (globally memoized to survive dev hot-reload).
- API error responses return a generic `{ error: "..." }` (optionally a stable error code) and log details server-side. NEVER return `err.message`/`err.stack` to the client.
- Image uploads go through Cloudinary via [lib/upload.ts](lib/upload.ts) / `@/lib/cloudinary` (server) — env: `CLOUDINARY_*`. NOTE: no server-side file type/size validation yet (known gap — a size cap and MIME allowlist belong here).
- PDF generation uses `pdfkit` ([lib/generatePDF.ts](lib/generatePDF.ts)) — three exports: `generateReceiptPDF` (pledge receipt), `generateCustomerPDF` (customer report), `generatePledgePDF` (active/released pledge report). See the Reports module section for the layout details. `pdfkit` is in `serverExternalPackages` in [next.config.ts](next.config.ts) so it isn't bundled.
- UI components are shadcn-style primitives under `components/ui/` (Radix + `class-variance-authority` + `tailwind-merge`, Tailwind v4). Default Hindi pledge terms live in [lib/defaultTerms.ts](lib/defaultTerms.ts).
- Route groups organize pages without affecting URLs: `(auth)`, `(UserDetails)`, `(CustomersDetails)`.
- Shared server-only helpers (e.g. `constantTimeEqual`) live in their own `lib/` file, kept separate from client-importable utils like `lib/utils.ts` (`cn`).

## Required environment variables

`DATABASE_URL` (pooled), `DIRECT_URL` (migrations), Clerk (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `WEBHOOK_SECRET`, `NEXT_PUBLIC_CLERK_*` URLs/domain), `NEXT_PUBLIC_BASE_URL`, Cloudinary (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`), Razorpay (`NEXT_PUBLIC_RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `RAZORPAY_PLAN_YEARLY`, `RAZORPAY_PLAN_HALF_YEARLY`), `ALPHA_VANTAGE_API_KEY`, and `CRON_SECRET`.

**Production checklist:** verify `CRON_SECRET` and `RAZORPAY_WEBHOOK_SECRET` are non-empty (an empty string fails OPEN on older code paths — Invariant 6 guards this, but confirm the env anyway). Use 32+ char random secrets. Configure the Razorpay webhook URL in the Razorpay dashboard to point at the deployed `/api/webhook/razorpay`.

## Known gaps / not yet implemented

Deliberately tracked so reviews focus on real bugs rather than re-discovering these. None are "done" — treat them as open work.

- **No request validation layer.** No Zod (or other) schema validation on bodies/params/query. Inputs are hand-parsed; money/weight/date bounds are enforced inline in the pledge create route only. A shared `lib/validations/` Zod layer is the planned consolidation (would also unify the two customer-create paths — see below).
- **Divergent customer-create validation.** `add-customer` (FormData) enforces a 10-digit mobile regex; `customers` POST (JSON) does not. Both should share one validator.
- **No rate limiting.** No limiter on any route, including unauthenticated surfaces (`/view/[token]`, `/api/portal-status/[token]`, `/api/cron/*`, auth-adjacent endpoints).
- **No webhook replay/idempotency protection.** Razorpay events are not deduped by event id; `completed`/`halted` have no replay guard. A persisted `ProcessedWebhook(eventId unique)` table would close this.
- **`verify-payment` server-side status fetch is in; replay-after-refund is not.** Subscriptions are confirmed active at verify time but not re-checked for later refund/failure outside the webhook.
- **`create-subscription` can orphan Razorpay subscriptions** on repeated mints by an expired/halted user (billing hygiene, not access bypass).
- **Cascade-delete of `PledgeAudit`/`Transaction`** destroys financial history on any hard delete (see Data model notes).
- **`pledgeDate` upper/lower bounds** are not enforced on create (future/far-past dates allowed).
- **Cloudinary uploads** have no server-side MIME/size validation (cost-DoS surface).
- **No error monitoring** (no Sentry; `console.*` only). **No structured logging** (no levels/correlation ids). **No security headers** (no CSP/HSTS/X-Frame-Options in `next.config.ts`). **No test runner** (only `tsc --noEmit` + `lint`; `npm run build` for build-time checks). **Backup/DR is Neon defaults only.** **Cron reliability is external** (no retry/dead-letter/alerting on a missed run; consider a dead-man's-switch ping).