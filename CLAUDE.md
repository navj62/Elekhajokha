# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

E-Lekha-Jokha is a Next.js 16 (App Router) SaaS for gold/silver pawnbrokers (pledge shops) in India. Shop owners record customer pledges of gold/silver jewellery against loans, track accruing interest, monitor loan-to-value (LTV) risk against live metal prices, and share a read-only portal with each customer. Access is gated behind a Razorpay subscription. UI strings and printed receipts are largely in Hindi.

## Commands

```bash
npm run dev       # Next dev server on http://localhost:3000
npm run build     # prisma generate && next build
npm run start     # production server
npm run lint      # eslint (flat config, eslint-config-next)

npx prisma generate          # regenerate the Prisma client
npx prisma migrate dev       # apply/create migrations (dev)
npx prisma studio            # inspect the DB
npx prisma db seed           # runs tsx prisma/seed.ts
```

There is no test runner configured in this repo.

### Prisma datasource gotcha
The runtime client and the CLI read **different** connection strings:
- App runtime ([lib/prisma.ts](lib/prisma.ts)) connects via the Neon serverless adapter using `DATABASE_URL` (pooled).
- The Prisma CLI ([prisma.config.ts](prisma.config.ts)) uses `DIRECT_URL` (direct, unpooled) — required for migrations.

[prisma/schema.prisma](prisma/schema.prisma) intentionally declares `datasource db` with no inline `url`; the URL is injected by the adapter at runtime and by `prisma.config.ts` for the CLI. Don't "fix" this by adding `url = env(...)` to the schema.

## Middleware lives in `proxy.ts`

Next.js 16 renamed `middleware.ts` to **[proxy.ts](proxy.ts)**. This is the auth/onboarding gate (Clerk `clerkMiddleware`). Key behaviour:
- Public routes: `/`, `/sign-in`, `/sign-up`, `/view/*` (customer portal), `/api/webhook/*`, `/api/portal-status/*`, `/api/cron/*`.
- `/api/webhook/*` short-circuits before any auth (webhooks verify their own signatures).
- For **API routes**, the proxy only enforces sign-in — it does NOT enforce onboarding. Each API handler re-resolves the user itself.
- For **page routes**, unonboarded users are redirected to `/onboarding`; onboarding state is read from Clerk session claims `metadata.onboardingComplete`.

## Authentication & user model

Auth is **Clerk**; the app keeps a mirrored `User` row in Postgres keyed by `clerkUserId`.
- New Clerk users are synced into the DB by the **Svix webhook** at [app/api/webhook/register/route.ts](app/api/webhook/register/route.ts) (`user.created` / `user.deleted`). This handler must **always return 200** — it swallows all errors so Clerk never retries into a failure loop. It also writes `dbUserId`/`role`/`onboarded` back into Clerk `publicMetadata`.
- API handlers follow a consistent pattern: `auth()` → `prisma.user.findUnique({ where: { clerkUserId } })` → resolve internal `user.id` → scope all queries by that id. When touching nested resources, ownership is enforced through the relation (e.g. `where: { id: pledgeId, customer: { userId: user.id } }`), never by trusting IDs from the request body.
- [app/api/access/route.ts](app/api/access/route.ts) is the authority on subscription access and is the one place that will lazily `create` a DB user if one is missing.

## Subscriptions (Razorpay)

The full access/subscription state machine lives across three files:
- **[app/api/access/route.ts](app/api/access/route.ts)** — returns `{ hasAccess, status, ... }`. Maps `User.subscriptionStatus` (`trial | created | active | halted | expired`) to a frontend-safe status string. Notable rules: `created` grants a **10-minute grace window** (`status: "processing"`) so the payment webhook has time to land before access is revoked; raw Prisma enums are never leaked to the client.
- **[app/api/webhook/razorpay/route.ts](app/api/webhook/razorpay/route.ts)** — HMAC-verifies `x-razorpay-signature` against `RAZORPAY_WEBHOOK_SECRET`, then flips `subscriptionStatus` on `subscription.activated`/`charged`/`halted`/`completed`.
- **[hooks/useAccess.ts](hooks/useAccess.ts)** — client hook that polls `/api/access`. Deliberately preserves the previous `hasAccess` on a network error so a paying user isn't blocked by a blip, and refetches on tab focus. `components/SubscriptionGuard.tsx` consumes this to gate the app.

Plans are `halfyearly` / `yearly`, mapped to Razorpay plan IDs via `RAZORPAY_PLAN_HALF_YEARLY` / `RAZORPAY_PLAN_YEARLY`. Trials are started via `/api/start-trial`.

## Core domain logic — interest, LTV, and risk

This is the heart of the app. Two pure functions plus a cron job:

- **[lib/interest.ts](lib/interest.ts)** — `calculateHybridInterest(principal, annualRate, startDate, endDate, allowCompounding, compoundingDuration)`. Computes duration `T` in months with a day-based fractional rule (≤2 days → +0, ≤15 days → +0.5, else +1 month; minimum 0.5). Compounds per cycle (`MONTHLY`/`HALFYEARLY`/`YEARLY`) with simple interest on the leftover partial cycle. Returns `{ T, totalInterest, receivableAmount }`. **This is the single source of truth for amount owed** — both the customer portal and pledge release reuse it.
- **[lib/calculateLTV.ts](lib/calculateLTV.ts)** — `calculateLTV(...)` calls `calculateHybridInterest` for amount owed, computes metal market value (weight × INR/gram), and returns `ltv` plus a `riskTier`. `getRiskTier(ltv)` thresholds: **≤65 SAFE, ≤75 WATCH, ≤90 AT_RISK, else UNDERWATER**. If no price is available for the held metals, `marketValue`/`ltv`/`riskTier` come back `null` (handled gracefully downstream).
- **[app/api/cron/evaluate-risk/route.ts](app/api/cron/evaluate-risk/route.ts)** — batch job over all `ACTIVE` pledges. Recomputes LTV/risk per pledge, writes a `PledgeAlert` only when a pledge's `riskTier` actually changes, caches per-pledge metrics (`lastCalculatedLtv`, `lastRiskTier`, `lastAmountOwed`, `lastMarketValue`, `lastEvaluatedAt`), and **upserts a daily `FinancialSnapshot` per user** (unique on `userId + snapshotDate`, so re-runs the same day are idempotent). Supports `?dryRun=true` to preview without writing.

### Pledge weights
`netWeightOfGold` / `netWeightOfSilver` are denormalized onto `Pledge` (summed from its `PledgeItem`s at create time, see [app/api/customers/[customerId]/pledges/route.ts](app/api/customers/[customerId]/pledges/route.ts)). Risk/LTV code reads these aggregates directly and does not need to join `PledgeItem`.

### Pledge release & audit trail
Releasing a pledge ([app/api/customers/[customerId]/pledges/[pledgeId]/route.ts](app/api/customers/[customerId]/pledges/[pledgeId]/route.ts), `PATCH`) is the most safety-critical write: it finalizes interest, snapshots the metal price/market-value/LTV at release time into a `PledgeAudit` row, and guards against double-release using `updateMany({ where: { status: "ACTIVE" } })` inside a transaction (throws `ALREADY_RELEASED` → 409 if the row was already flipped). `calculationVersion` is stamped so historical calculations remain reproducible if the formula changes.

## Metal price pipeline

- **[lib/fetchPrices.ts](lib/fetchPrices.ts)** — `fetchMetalPricesUsd()` pulls gold (`GC=F`) and silver (`SI=F`) USD/oz from Yahoo Finance (no key, 5s abort timeout, parallel). `fetchUsdToInr()` pulls USD→INR from Alpha Vantage (requires `ALPHA_VANTAGE_API_KEY`; module throws on startup if missing).
- **[lib/getOrUpdateUsdToInr.ts](lib/getOrUpdateUsdToInr.ts)** — caches the USD/INR rate in the `ExchangeRate` table with a 23h TTL to stay within Alpha Vantage's free-tier daily budget (~1 call/day), with a re-check race guard.
- **[lib/storePrices.ts](lib/storePrices.ts)** — `updatePrices()` orchestrates: converts USD/oz → INR/gram (`/31.1035` then **+15% import duty**), skips if the last `MetalPrice` row is <1h50m old (double-write guard), falls back to the last stored exchange rate if Alpha Vantage fails, and writes new `MetalPrice` rows for GOLD and SILVER. All LTV reads use `metalPrice.findFirst({ orderBy: { createdAt: "desc" } })`.

### Cron endpoints (auth differs — easy to get wrong)
Both crons use `CRON_SECRET` but with **different verbs and header schemes**:
- `GET /api/cron/update-prices` — expects `Authorization: Bearer <CRON_SECRET>`.
- `POST /api/cron/evaluate-risk` — expects header `x-cron-secret: <CRON_SECRET>`.

Both are intended to be driven by an external scheduler (e.g. cron-job.org); `/api/cron/*` is public in the proxy and self-authorizes via the secret.

## Customer portal (public, token-based)

Each `Customer` has a unguessable `viewToken` (UUID). `/view/[token]` ([app/view/[token]/page.tsx](app/view/[token]/page.tsx)) is a public server-rendered read-only statement of that customer's pledges (using `calculateHybridInterest` for live amounts), with no Clerk auth. Owners can revoke access via `Customer.isPortalBlocked` (toggle endpoint under `/api/customers/[customerId]/toggle-portal`); the portal polls `/api/portal-status/[token]` to react to revocation. QR codes to the portal are generated client-side (`qrcode.react`).

## Data model notes

Full schema in [prisma/schema.prisma](prisma/schema.prisma). Relationships cascade on delete from `User → Customer → Pledge → {PledgeItem, Transaction, PledgeAudit, PledgeAlert}`. Soft-deletes use `deletedAt` on `User`/`Customer`. Money is `Decimal` in the DB — convert with `Number(...)` for arithmetic and wrap back in `new Prisma.Decimal(...)` (often `.toFixed(2/3)`) when writing. `FinancialSnapshot` is the per-day dashboard rollup; `Transaction` (REPAYMENT_PRINCIPAL / REPAYMENT_INTEREST / TOPUP) records part-payments against a pledge.

## Conventions

- Path alias `@/*` maps to the repo root (e.g. `@/lib/prisma`).
- Use the shared singleton from [lib/prisma.ts](lib/prisma.ts) — never instantiate `PrismaClient` directly (it's globally memoized to survive dev hot-reload).
- Image uploads go through Cloudinary via [lib/upload.ts](lib/upload.ts) / `@/lib/cloudinary` (server) — env: `CLOUDINARY_*`.
- PDF generation uses `pdfkit` ([lib/generatePDF.ts](lib/generatePDF.ts)) with a bundled Hindi font at `public/fonts/NotoSansDevanagari-Bold.ttf`; `pdfkit` is in `serverExternalPackages` in [next.config.ts](next.config.ts) so it isn't bundled.
- UI components are shadcn-style primitives under `components/ui/` (Radix + `class-variance-authority` + `tailwind-merge`, Tailwind v4). Default Hindi pledge terms live in [lib/defaultTerms.ts](lib/defaultTerms.ts).
- Route groups organize pages without affecting URLs: `(auth)`, `(UserDetails)`, `(CustomersDetails)`.

## Required environment variables

`DATABASE_URL` (pooled), `DIRECT_URL` (migrations), Clerk (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `WEBHOOK_SECRET`, `NEXT_PUBLIC_CLERK_*` URLs/domain), `NEXT_PUBLIC_BASE_URL`, Cloudinary (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`), Razorpay (`NEXT_PUBLIC_RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `RAZORPAY_PLAN_YEARLY`, `RAZORPAY_PLAN_HALF_YEARLY`), `ALPHA_VANTAGE_API_KEY`, and `CRON_SECRET`.


## Known gaps / not yet implemented

Deliberately tracked so reviews focus on real bugs rather than re-discovering these.
None of these are "done" — treat them as open work, not settled design.

- **No request validation layer.** There is no Zod (or other) schema validation on API route
  bodies, query params, or server action inputs. Inputs are largely trusted/hand-parsed.
- **No rate limiting.** No limiter on any route, including unauthenticated surfaces
  (`/view/[token]`, `/api/portal-status/[token]`, `/api/cron/*`, auth-adjacent endpoints).
- **No error monitoring.** No Sentry or equivalent. Errors are `console.*` only.
- **No structured logging.** Ad-hoc `console.log/error`; no levels, no request correlation.
- **No test runner.** No unit/integration tests; no CI gate. The only cheap verification is
  `npx tsc --noEmit` and `npm run lint`.
- **Limited audit logging.** `PledgeAudit` captures pledge release; there is no broader audit
  trail for other sensitive mutations (customer edits, portal toggles, subscription changes).
- **No security headers.** No CSP / HSTS / X-Frame-Options config in `next.config.ts`.
- **Backup/DR is provider-default only.** Relying on Neon's defaults; no documented
  point-in-time recovery or restore runbook.
- **Cron reliability is external.** Crons are driven by an external scheduler with no
  retry/dead-letter or alerting if a run is missed.