# E-Lekha-Jokha

A multi-tenant SaaS for gold and silver pawnbrokers (pledge shops) in India.

Shop owners record customer pledges of jewellery against loans, track accruing
interest, monitor loan-to-value risk against live metal prices, manage an
inventory of items acquired through pledge sales and direct purchases, keep a
task list, and share a read-only portal with each customer. Access is gated
behind a Razorpay subscription. Most UI strings and all printed receipts are in
Hindi.

Every shop's data is isolated: each API route resolves the signed-in user to an
internal user id and scopes all queries by it.

## Stack

- **Next.js 16** (App Router) with React 19 and TypeScript
- **PostgreSQL** via **Prisma 7** — Neon serverless adapter at runtime
- **Clerk** for authentication (users mirrored into Postgres via a Svix webhook)
- **Razorpay** for subscriptions
- **Tailwind CSS v4** with shadcn-style primitives on Radix
- **Cloudinary** for item photo uploads
- **pdfkit** for receipts and report exports
- **Vitest** for unit tests

Note: middleware lives in `proxy.ts` — Next.js 16 renamed `middleware.ts`.

## Running locally

Requires Node 22 and a PostgreSQL database.

```bash
npm ci
# create a .env file — variable names are listed below (there is no .env.example)
npx prisma generate
npx prisma migrate dev        # apply migrations
npx prisma db seed            # seeds the 10 default pledge item types
npm run dev                   # http://localhost:3000
```

The seed is idempotent and contains no personal data — it only creates the
system-default `PledgeItemType` rows.

### Verifying a change

```bash
npx tsc --noEmit   # the primary gate
npm test           # vitest — interest, LTV, and customer-risk logic
npm run lint
npm run build      # only needed for build-time issues
```

CI (`.github/workflows/ci.yml`) runs typecheck, test, and lint on push and PR to
`main`. It does not run a build.

After any schema change, run `npx prisma generate` and clear the Turbopack cache
(`rm -rf .next`) before restarting the dev server — a stale client plus a cached
chunk produces confusing runtime errors.

## Environment variables

Names only. Never commit values; `.env*` is gitignored.

**Database**
- `DATABASE_URL` — used by both the app runtime and the Prisma CLI
- `DIRECT_URL` — convention for direct/unpooled migrations; nothing reads it as currently wired

**Clerk**
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `WEBHOOK_SECRET` — Svix signing secret for the Clerk user webhook
- the `NEXT_PUBLIC_CLERK_*` redirect URL variables

**Razorpay**
- `NEXT_PUBLIC_RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `RAZORPAY_PLAN_HALF_YEARLY`
- `RAZORPAY_PLAN_YEARLY`

**Cloudinary**
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

**Other**
- `NEXT_PUBLIC_BASE_URL`
- `ALPHA_VANTAGE_API_KEY` — USD→INR rate for metal price conversion
- `CRON_SECRET` — 32+ characters; guards the cron endpoints

`CRON_SECRET` and `RAZORPAY_WEBHOOK_SECRET` must be non-empty. Secret checks
fail closed and compare in constant time, so an empty value blocks the endpoint
rather than weakening it.

## Scheduled jobs

Two cron endpoints, with **different auth headers**:

```bash
# metal prices — every 2 hours
curl -s https://<host>/api/cron/update-prices -H "Authorization: Bearer <CRON_SECRET>"

# risk evaluation — daily
curl -s -X POST https://<host>/api/cron/evaluate-risk -H "x-cron-secret: <CRON_SECRET>"
```

Trigger `update-prices` once manually after a first deploy so metal prices are
seeded and LTV isn't blank for the first hour.

## Contributing

Read [CLAUDE.md](CLAUDE.md) first. It documents the hard invariants — tenant
scoping, money and weight precision, server-derived valuation inputs, webhook
signature verification, audit-record immutability — each of which has been the
source of a real incident. Treat a violation as a bug.

This repository is private and must stay private: its git history contains real
customer data from an early ledger import.
