# MOBILE_AUDIT.md

## STATUS (as of 2026-07-29)

- **Last updated:** 2026-07-29
- **Phase 1 (foundation): COMPLETE** — token consolidation, nav shell, Sheet primitive. Commits `8218e29` (refactor(tokens): consolidate two design-token systems into one) + `5296fb0` (feat(nav): mobile bottom nav + FAB, one shell for both breakpoints).
- **Phase 2 screen redesigns: NOT STARTED** — none of the per-screen restyling in the tackle-order list below has begun.
- **Blocker on resuming:** the mobile view has been reported as "way off" after Phase 1 landed. This needs screenshots + diagnosis (see the Verification methodology section in CLAUDE.md's "Mobile-First Redesign" section) before Phase 2 screen work begins — don't start screen-by-screen redesign on top of an unverified foundation.

## CORRECTIONS TO ORIGINAL AUDIT

Findings below were discovered to be wrong or incomplete while executing Steps 1–2
of Phase 1 (token consolidation + nav shell). The original recon below (sections
1–9, Summary Table) is left intact as historical baseline — read it alongside these
corrections, not in place of them.

- **The `.dashboard-*` framing (§7, "Legacy desktop-only CSS") was prefix-inaccurate.** The real dead-CSS region was ~640 lines across ~58 selector families — not all `dashboard`-prefixed as the original audit implied. It also included 3 *live* rules (`.skeleton`, `.dash-animate`, `.lang-hi`) that would have broken the app if deleted by a naive prefix match. Deletion had to be done rule-by-rule against live usage, not by pattern.
- **`.dark` was dead code, not a second live dark-mode system.** §7 described "two dark-mode systems coexist (conflict risk)" (`.dark` vs `.dark-mode`) as if both were in play. In reality, nothing in the app ever added the `.dark` class — only `.dark-mode` (via the custom `ThemeProvider`) was live. Separately, the two token sets were **not** two notations for the same palette: shadcn's tokens were pure achromatic grays, while the Olive system was warm olive-tinted. Consolidation ported the Olive *values* into the shadcn token *names* (not a merge of equivalent palettes) — see the "Single design system" decision in CLAUDE.md.
- **`navItems` has 9 entries, not 8** (§6). "Buy Inventory" was missed in the original count.
- **Shell colours were hardcoded and pointed at stale values** from the legacy CSS that has since been deleted (e.g. `--sidebar-w:240px` vs the actual `w-[260px]` §7 already flagged as inconsistent) — during consolidation, the live *rendered* values were treated as authoritative over any value found in CSS custom properties or legacy stylesheets, since the legacy stylesheet was demonstrably out of sync with what actually rendered.
- **Step 1's first-pass grep for CSS var usage missed the `var(--x, fallback)` form** (only matched bare `var(--x)`). Four files needed a follow-up sweep once this was noticed, or their fallback-form references would have been silently skipped during token migration.
- **The nav consolidation question posed in §"Suggested order to tackle" item 0 ("8 sidebar items vs ≤5 bottom-nav") was resolved differently than framed.** The original audit assumed trimming the nav list to ≤5 items. The actual resolution was architectural, not a content cut: one `navConfig.ts` source of truth tagged per-item with `surfaces: ["sidebar","bottom","more"]`, rendering as a 4-item bottom nav + FAB + "More" sheet on mobile and the full list on the sidebar for desktop. No nav items were dropped.
- **Item 0's "shared Dialog" scope narrowed to a single Sheet primitive.** The original audit called for "a shared responsive table→card primitive and a shared Dialog" as foundational work. Phase 1 delivered the Sheet primitive (`components/ui/Sheet.tsx`) as the one modal/sheet abstraction; the table→card primitive was **not** built in Phase 1 and remains open for Phase 2.

## Original recon (as written, retained for historical baseline)

Read-only recon inventory of E-Lekha-Jokha (Next.js 16 App Router) screens, layout
patterns, and current responsiveness. **Inventory only — no solutions proposed.**
Prepared to seed a mobile-first redesign in later sessions.

Stack facts relevant to layout:
- Next.js 16.2.6 (App Router), React 19, Tailwind CSS v4 (`@tailwindcss/postcss`), no `tailwind.config.*` file (v4 config is CSS-first in [globals.css](app/globals.css)).
- shadcn/ui primitives present (Radix + CVA + `tailwind-merge`) but **barely adopted** — only 2 of 27 pages import them.
- Charts: `recharts` (2 pages + 1 dashboard component). Auth UI: Clerk hosted components. PDFs: server-side `pdfkit` (not layout-relevant).
- No form library (no react-hook-form, no zod) — every form is hand-rolled controlled inputs.
- Two user contexts only: **shop owner** (authenticated, one role) and **customer** (public token portal). No admin/multi-role matrix.

---

## 1. Route / Screen Inventory

| # | File | URL | Purpose | Access | Complexity |
|---|------|-----|---------|--------|-----------|
| 1 | [app/page.tsx](app/page.tsx) | `/` | Marketing landing (renders `LandingPage`) | Public | Medium |
| 2 | [app/(auth)/sign-in/page.tsx](app/(auth)/sign-in/page.tsx) | `/sign-in` | Clerk sign-in | Public | Simple |
| 3 | [app/(auth)/sign-up/page.tsx](app/(auth)/sign-up/page.tsx) | `/sign-up` | Clerk sign-up (⚠ known Rules-of-Hooks bug per CLAUDE.md) | Public | Simple |
| 4 | [app/(auth)/onboarding/page.tsx](app/(auth)/onboarding/page.tsx) | `/onboarding` | Post-signup shop profile setup form | Auth (unonboarded) | Medium |
| 5 | [app/subscription/page.tsx](app/subscription/page.tsx) | `/subscription` | Razorpay plan checkout + trial | Auth | Medium |
| 6 | [app/(UserDetails)/dashboard/page.tsx](app/(UserDetails)/dashboard/page.tsx) | `/dashboard` | Main dashboard: KPI cards, charts, aging, recent tables | Owner | **Complex** |
| 7 | [app/(CustomersDetails)/add-customer/page.tsx](app/(CustomersDetails)/add-customer/page.tsx) | `/add-customer` | Create customer form (FormData, 10-digit mobile regex) | Owner | Medium |
| 8 | [app/(CustomersDetails)/customers/page.tsx](app/(CustomersDetails)/customers/page.tsx) | `/customers` | Customer list w/ search, pin, table | Owner | Medium |
| 9 | [app/(CustomersDetails)/customers/[customerId]/page.tsx](app/(CustomersDetails)/customers/[customerId]/page.tsx) | `/customers/:id` | Customer detail: pledges, bulk-select, portal QR, modals | Owner | **Complex** |
| 10 | [app/(CustomersDetails)/customers/[customerId]/financial-summary/page.tsx](app/(CustomersDetails)/customers/[customerId]/financial-summary/page.tsx) | `/customers/:id/financial-summary` | Per-customer financial rollup + risk score | Owner | **Complex** |
| 11 | [app/(CustomersDetails)/customers/[customerId]/pledges/add/page.tsx](app/(CustomersDetails)/customers/[customerId]/pledges/add/page.tsx) | `/customers/:id/pledges/add` | New pledge form (multi-item, weights, LTV inputs) | Owner | **Complex** |
| 12 | [app/(CustomersDetails)/customers/[customerId]/pledges/[pledgeId]/page.tsx](app/(CustomersDetails)/customers/[customerId]/pledges/[pledgeId]/page.tsx) | `/customers/:id/pledges/:pid` | Pledge detail: items, txns, audit, alerts (4 tables) | Owner | **Complex** |
| 13 | [app/(CustomersDetails)/customers/[customerId]/pledges/[pledgeId]/release/page.tsx](app/(CustomersDetails)/customers/[customerId]/pledges/[pledgeId]/release/page.tsx) | `/customers/:id/pledges/:pid/release` | Release pledge (interest finalize + compounding toggle) | Owner | **Complex** |
| 14 | [app/(CustomersDetails)/customers/[customerId]/pledges/[pledgeId]/sell/page.tsx](app/(CustomersDetails)/customers/[customerId]/pledges/[pledgeId]/sell/page.tsx) | `/customers/:id/pledges/:pid/sell` | Add-to-inventory / sell flow (cash-to-customer derivation) | Owner | **Complex** |
| 15 | [app/(CustomersDetails)/customers/[customerId]/release-bulk/page.tsx](app/(CustomersDetails)/customers/[customerId]/release-bulk/page.tsx) | `/customers/:id/release-bulk` | Bulk release confirm (ids from query string) | Owner | **Complex** |
| 16 | [app/(UserDetails)/inventory/page.tsx](app/(UserDetails)/inventory/page.tsx) | `/inventory` | Inventory list: KPIs, portfolio metals, filters, table, sell modal | Owner | **Complex** |
| 17 | [app/(UserDetails)/inventory/buy/page.tsx](app/(UserDetails)/inventory/buy/page.tsx) | `/inventory/buy` | Direct-purchase entry form | Owner | Medium |
| 18 | [app/(UserDetails)/inventory/[id]/receipt/page.tsx](app/(UserDetails)/inventory/[id]/receipt/page.tsx) | `/inventory/:id/receipt` | On-screen purchase receipt + PDF download | Owner | Medium |
| 19 | [app/(UserDetails)/ltv/page.tsx](app/(UserDetails)/ltv/page.tsx) | `/ltv` | LTV / risk analytics: chart + table + detail modal | Owner | **Complex** |
| 20 | [app/(UserDetails)/pledgeList/page.tsx](app/(UserDetails)/pledgeList/page.tsx) | `/pledgeList` | Flat pledge listing | Owner | Medium |
| 21 | [app/(UserDetails)/profile/page.tsx](app/(UserDetails)/profile/page.tsx) | `/profile` | Shop profile, terms, custom item-types mgmt | Owner | Medium |
| 22 | [app/(UserDetails)/notifications/page.tsx](app/(UserDetails)/notifications/page.tsx) | `/notifications` | Risk alert feed w/ tier filters | Owner | Medium |
| 23 | [app/(UserDetails)/tasks/page.tsx](app/(UserDetails)/tasks/page.tsx) | `/tasks` | Task manager (CRUD, filters) | Owner | Medium |
| 24 | [app/reports/page.tsx](app/reports/page.tsx) | `/reports` | Reports hub: 3 tabs (Customer / Active / Released), date filters | Owner | **Complex** |
| 25 | [app/reports/customers/page.tsx](app/reports/customers/page.tsx) | `/reports/customers` | Server-rendered customer report (PDF-style) | Owner | Medium |
| 26 | [app/reports/pledges/page.tsx](app/reports/pledges/page.tsx) | `/reports/pledges` | Server-rendered pledge report (PDF-style) | Owner | Medium |
| 27 | [app/view/[token]/page.tsx](app/view/[token]/page.tsx) | `/view/:token` | **Public** customer portal (read-only statement, QR) | Customer (token) | Medium |

**27 pages total.** 25 are `"use client"`; server components are `/`, `/view/:token`, `/sign-up`, `/reports/customers`, `/reports/pledges`.

---

## 2. Layout Structure

### Root
- [app/layout.tsx](app/layout.tsx) — wraps everything in `ClerkProvider` → `ClientProviders`. Loads `Noto_Sans` (latin + devanagari) as CSS var, sets font family inline. No shell here.
- [components/providers/ClientProviders.tsx](components/providers/ClientProviders.tsx) → composes `ThemeProvider` + `LanguageProvider` (en/hi). Theme + language are **custom context providers**, not next-themes.

### The dashboard shell (single source, re-exported)
- **[app/(UserDetails)/dashboard/layout.tsx](app/(UserDetails)/dashboard/layout.tsx)** is the one real shell: fixed `w-[260px]` sidebar + top bar + scrollable `<main>` capped at `max-w-[1400px]`. It is `"use client"` (uses `usePathname`, sidebar open state, theme/lang toggles).
- Re-exported verbatim by 6 route folders via `export default DashboardLayout`:
  [(CustomersDetails)/layout.tsx](app/(CustomersDetails)/layout.tsx), inventory, ltv, pledgeList, profile, [reports/layout.tsx](app/reports/layout.tsx).
- Sidebar shows/hides at the **`lg:` (1024px)** breakpoint: `lg:static lg:translate-x-0`; below that it becomes an off-canvas drawer with a `bg-black/40` overlay and hamburger (`Menu`) in the top bar. This drawer pattern already exists and works.

### ⚠ Pages that render WITHOUT the shell (no sidebar/top bar)
There is **no `(UserDetails)/layout.tsx` group layout** — only per-subfolder layouts. So these authenticated pages render bare inside root layout only, using their own back-links:
- **`/notifications`** and **`/tasks`** — no shell; use `ArrowLeft`/`ChevronLeft` back buttons instead.
- `/subscription`, `/onboarding`, `/sign-in`, `/sign-up` — standalone (intentional).
- `/reports/customers`, `/reports/pledges` — bare server pages (PDF-oriented).

### Public layout
- [app/view/layout.tsx](app/view/layout.tsx) — deliberately no sidebar; `min-h-screen bg-gray-50`, centered `max-w-4xl px-4`. Note: uses **plain gray Tailwind**, not the olive design tokens used everywhere else.

**Auth-gated vs public difference:** gate is in [proxy.ts](proxy.ts) (Clerk middleware) + `SubscriptionGuard`, not in layouts. Owner pages inherit the olive `DashboardLayout`; public/auth pages each bring their own container.

---

## 3. Per-Screen Component Breakdown

Legend for "Mobile state": ✅ ok · ⚠ partial/inconsistent · ❌ likely horizontal scroll / broken.

### Dashboard `/dashboard` — ❌
- Recharts charts + KPI stat cards + recent-activity tables + aging + monthly-performance sections ([components/dashboard/](components/dashboard/): `AgingAnalysisCard`, `AgingAnalysisSection`, `MonthlyPerformanceCharts`, `MonthlyPerformanceSection`).
- Fixed widths: `max-w-[1200px]` wrappers; legacy CSS `.stat-cards` is `overflow-x:auto` flex with `min-w:170px` cards, `.mid-row/.bottom-row` are `grid-template-columns: 2fr 1fr`.
- Only 6 responsive prefixes across 1,395 lines — sparse. CSS media queries in globals.css (`max-width:1100px`, `max-width:768px`) target the **legacy `.dashboard-*` classes**, which mismatch the actual Tailwind `lg:` breakpoint used by the live shell.

### Customers list `/customers` — ❌
- One `<table className="w-full">` inside a single `overflow-x-auto`. Cells use `whitespace-nowrap`, `max-w-[200px] truncate`, `max-w-[150px]`. Only 2 responsive prefixes → table will scroll horizontally on phones.

### Customer detail `/customers/:id` — ❌ (highest responsive count but still breaks)
- 31 responsive prefixes (most in app), BUT contains fixed `grid-cols-[320px_1fr]` split and `grid-cols-4` stat row → the 320px column + 4-col grid overflow narrow screens. 3 `overflow-x-auto` regions, 1 table. Uses shared `@/components/ui/` primitives (1 of only 2 pages). Bulk-select checkboxes, portal QR (`CustomerQr`), inline modals (`fixed inset-0`).

### Financial summary `/customers/:id/financial-summary` — ❌
- Table + risk cards, 1 `overflow-x-auto`, 6 responsive prefixes. Wide numeric table.

### Pledge add `/customers/:id/pledges/add` — ⚠/❌ (form pain)
- Largest form: ~15 inputs/selects, multi-item repeatable rows (weight, purity, net weight, item-type dropdown grouped Standard/Custom). 12 responsive prefixes but dense multi-column field grid; painful on small screens.

### Pledge detail `/customers/:id/pledges/:pid` — ❌ (worst table density)
- **4 `<table>`** (items, transactions, audit, alerts), 2 `overflow-x-auto`, `grid-cols-[320px_1fr]` + `grid-cols-4`, `max-w-[1100px]`. **0 responsive prefixes** — entirely desktop-laid-out. Highest breakage risk visually.

### Pledge release `/pledges/:pid/release` — ❌
- 2 tables, 2 `overflow-x-auto`, 1 responsive prefix. Compounding toggle (`Switch`), transaction history, closed-state summary cards.

### Pledge sell `/pledges/:pid/sell` — ⚠
- 1 table, 1 `overflow-x-auto`, 1 responsive prefix, inline modal. Three-line cash-to-customer breakdown.

### Bulk release `/customers/:id/release-bulk` — ⚠
- 1 table, 1 `overflow-x-auto`, 5 responsive prefixes, per-row compounding toggles, `<Suspense>` wrapper. `min-w-[600px]` table.

### Inventory list `/inventory` — ❌
- KPI strip (4 cards) + Portfolio Metals section + filter pills + sort dropdown + wide table (Photo/Item/Type/Metal/Weight/Date/Cost/Status) + Sell modal (`fixed inset-0`). 1 table, 1 `overflow-x-auto`, only **3 responsive prefixes** across 1,027 lines.

### Inventory buy `/inventory/buy` — ⚠
- Direct-purchase form, live net-weight display, grouped item-type dropdown. **0 responsive prefixes.** `MetalRateStrip variant="full"`.

### Inventory receipt `/inventory/:id/receipt` — ⚠
- Receipt card + PDF button. `max-w-[...]` fixed. 0 responsive prefixes.

### LTV `/ltv` — ❌
- Recharts chart + risk table + detail modal (`fixed inset-0`). 1 table, 1 `overflow-x-auto`, 2 responsive prefixes.

### PledgeList `/pledgeList` — ⚠
- Flat list. 0 responsive prefixes (may use cards not table).

### Profile `/profile` — ⚠
- Shop info form + terms textareas + custom item-type CRUD. 1 responsive prefix.

### Notifications `/notifications` — ⚠ (no shell)
- Alert feed, tier filter pills, tier color config. 0 responsive prefixes. Renders bare.

### Tasks `/tasks` — ⚠ (no shell)
- Task list, add form, filter tabs. 0 responsive prefixes. Renders bare.

### Reports `/reports` — ⚠
- 3 tabs, shared date-range filter, stats strip. Child print pages `/reports/customers` & `/reports/pledges` render `<table>` server-side (1 table each, PDF-oriented). 8 responsive prefixes on hub.

### Onboarding / Subscription / Sign-in / Sign-up — ✅/⚠
- Auth pages are Clerk-hosted (self-responsive). Onboarding (14 resp prefixes) and Subscription (10) are the better-adapted custom pages. Sign-up has a known hooks bug.

### Public portal `/view/:token` — ⚠
- Read-only statement, `CustomerQr`, `max-w-4xl`. 7 responsive prefixes. Uses gray theme (off-brand). Polls `/api/portal-status`.

---

## 4. Shared / Reusable UI

### shadcn/ui primitives (present, wrapped Radix) — [components/ui/](components/ui/)
`button.tsx` (CVA variants + sizes), `input.tsx`, `textarea.tsx`, `select.tsx` (Radix), `switch.tsx` (Radix), `badge.tsx` (CVA), `alert.tsx` (CVA), `label.tsx` (Radix), `card.tsx` (+ Header/Content etc.), `Skeleton.tsx`.
- These are the natural **single-rewrite cascade point** — but adoption is near-zero.

### ⚠ Adoption problem (biggest structural finding)
- **Only 2 of 27 pages import `@/components/ui/`**: `customers/[customerId]/page.tsx` and `sign-in/page.tsx`.
- The other **23 pages are one-off**: raw `<input>`/`<select>`/`<table>`/`<button>` styled inline with Tailwind + CSS custom properties (`var(--card-bg)`, `var(--text-primary)`, etc.). Each screen re-implements cards, tables, pills, modals. **Fixing the shared components will NOT cascade** to most screens — each needs individual attention.

### Other shared components — [components/](components/)
- `LandingPage.tsx` (marketing), `NotificationBell.tsx`, `ReceiptModal.tsx` (only non-page modal component; other modals are inline `fixed inset-0`), `SubscriptionGuard.tsx` (access-status branching), `CustomerQr.tsx` (portal QR).
- [components/inventory/MetalRateStrip.tsx](components/inventory/MetalRateStrip.tsx) — `full`/`compact` variants (sidebar + buy page).
- [components/dashboard/](components/dashboard/) — 4 dashboard-only chart/aging components.
- [components/providers/](components/providers/) — Theme + Language + ClientProviders.

### Modals
- Inline `fixed inset-0` modals appear on 9 pages (dashboard layout drawer, ltv, inventory, release-bulk, customer detail, pledge detail, add-customer, pledge sell, pledges/add). Only `ReceiptModal` is componentized. **No shared Dialog abstraction** (Radix `@radix-ui/react-dialog` is a dep but pages roll their own).

---

## 5. Forms

No form library. **All forms are hand-rolled controlled React state**; no `react-hook-form`, no `zod`, no shared field components. Validation is inline/manual (CLAUDE.md notes divergent mobile-regex validation between the two customer-create paths).

| Form | Location | Type | Fields | Small-screen concern |
|------|----------|------|--------|----------------------|
| Add customer | `/add-customer` | FormData `<form>`, single page | Name, mobile (10-digit), address, photo | Medium |
| Customer (JSON) | via `/customers` POST | inline | fewer, no mobile regex | Low |
| **Pledge add** | `/customers/:id/pledges/add` | single page, **repeatable item rows** | ~15 inputs: loan, rate, per-item name/type/gross wt/purity/net wt/qty, notes | **High — many fields, multi-column** |
| Pledge release | `/pledges/:pid/release` | inline | release date, compounding toggle/duration | Medium (compounding logic) |
| Pledge sell | `/pledges/:pid/sell` | inline | buyPrice, notes, saleDate | Medium |
| Bulk release | `/customers/:id/release-bulk` | inline, per-row toggles | date + per-pledge compounding | Medium |
| Inventory buy | `/inventory/buy` | single `<form>` | desc, itemType, metal, gross wt, purity, cost, seller, id, notes, photo | **High — many fields** |
| Inventory sell | `/inventory` modal | modal | soldPrice, soldAt, buyer name/mobile, notes | Medium |
| Profile | `/profile` | inline | shop name/address/mobile, 2 terms textareas, custom item-types | Medium |
| Onboarding | `/onboarding` | single page | shop profile fields | Medium |
| Tasks add | `/tasks` | inline | title, dueDate | Low |
| Reports filter | `/reports` | inline | from/to date + quick-select | Low |
| Auth | `/sign-in`, `/sign-up` | Clerk | hosted | Low (Clerk-responsive) |

**Flag:** Pledge-add and Inventory-buy are the two multi-field forms that will be painful on phones as-is (dense grids, repeatable rows, side-by-side weight/purity/net-weight columns).

---

## 6. Navigation Model

- **Primary nav = left sidebar** in `DashboardLayout` ([dashboard/layout.tsx](app/(UserDetails)/dashboard/layout.tsx)), `w-[260px]`, off-canvas drawer below `lg:`.
- **`navItems` has 8 top-level links:** Dashboard, Add Customers, Customer, Reports, Inventory, Settings(Profile), LTV, Pledges(pledgeList).
  - ⚠ **8 items > 5** → a bottom-nav pattern would need consolidation (e.g. Add-Customer, LTV, PledgeList are candidates to fold under other sections). "Add Customers" as a top-level nav item is unusual.
- **Top bar:** hamburger (mobile), search box (`hidden md:flex`, hidden on mobile), notifications bell → `/notifications`, help → `/help` (⚠ route not found in inventory — likely dead link), Clerk `UserButton`.
- **Secondary/deep nav:** back-links (`ArrowLeft`/`ChevronLeft`) on detail/notifications/tasks pages instead of breadcrumbs. No breadcrumb component anywhere.
- **Deep linking:** pledge flows are multi-level (`/customers/:id/pledges/:pid/{release,sell}`); bulk-release reads `?ids=` from query string (stateless on refresh). `/reports` uses tab state. `/view/:token` is a separate unauthenticated deep-link surface.
- `/notifications` and `/tasks` sit outside the sidebar shell entirely — reachable only via bell icon / direct link.

---

## 7. Styling Setup

- **Tailwind v4, CSS-first** — no `tailwind.config.*`. Theme tokens live in [app/globals.css](app/globals.css) via `@theme inline` + `:root`/`.dark` (shadcn oklch tokens) **plus a second, parallel token system** ("Olive Neutral") of plain hex CSS vars (`--primary-brand:#565C3F`, `--main-bg:#F4F3EE`, `--card-bg`, `--text-primary`, `--sidebar-bg`, etc.) that the actual pages consume via inline `style={{}}`.
- **Two dark-mode systems coexist (conflict risk):** shadcn uses `.dark` class; the olive system uses `.dark-mode` class (`ThemeProvider` custom). New tokens must account for both.
- **Breakpoints:** default Tailwind scale. Live shell toggles at `lg:` (1024px). But globals.css media queries target `768px`/`1100px` against **legacy `.dashboard-*` classes that the current Tailwind layout no longer uses** — dead/misaligned responsive CSS.
- **Legacy desktop-only CSS:** ~500 lines of `.dashboard-shell`, `.dashboard-sidebar` (`position:fixed; width:240px`), `.dashboard-topbar` (`height:70px`), `.stat-cards`, `.table-wrap`, `.pagination`, etc. Much appears superseded by the Tailwind shell but still shipped. `--sidebar-w:240px` here vs actual `w-[260px]` in TSX — inconsistent.
- **Hindi overrides:** `.lang-hi *` un-uppercases, allows table cell wrapping. Relevant — Hindi strings are longer and affect wrapping on narrow screens.
- Fonts: `Noto_Sans` (latin+devanagari) only.

---

## 8. Third-Party / External Dependencies Affecting Layout

- **recharts ^3.8.1** — used on `/dashboard`, `/ltv`, and `MonthlyPerformanceCharts`. Needs `ResponsiveContainer` wrapping to behave on mobile; verify current usage isn't fixed-pixel.
- **framer-motion ^12** — animations (also custom keyframes in globals.css). Layout-neutral but watch for fixed transforms.
- **qrcode.react** — `CustomerQr` (fixed-size canvas; check it scales/centers on small screens).
- **Clerk** (`@clerk/nextjs`) — `UserButton`, hosted sign-in/up; self-responsive.
- **Radix UI** (`radix-ui`, `@radix-ui/react-dialog/label/select/slot`) — powers shadcn primitives; dialog dep present but pages use hand-rolled `fixed inset-0` modals instead.
- **Raw HTML tables (no table abstraction):** `<table>` used directly on ≥10 screens (customers, pledge detail ×4, release, sell, financial-summary, inventory, ltv, bulk-release, reports/customers, reports/pledges). Each wrapped only in `overflow-x-auto` at best → these are the primary horizontal-scroll sources. No `react-table`/data-grid.
- **pdfkit** — server-only, `serverExternalPackages`; not a layout concern except the two `/reports/*` print pages mirror PDF column layouts.

---

## 9. Risk Flags

### "Redesign UI shell only — do NOT touch data/logic"
These screens are tightly coupled to money/interest/LTV correctness (see CLAUDE.md Invariants 2, 3, 8, 11, 12). Restyle containers/layout only; leave calculation, transaction, and audit-write code paths untouched:
- **Pledge add** `/pledges/add` — server-derived net weights, round-then-sum weight aggregation (Invariants 2 & 3). Only write path for weights.
- **Pledge detail** `/pledges/:pid` — read-only but renders audit/txn financial records.
- **Pledge release** `/pledges/:pid/release` — `calculateHybridInterest`, double-release guard, `PledgeAudit` write. Most safety-critical write.
- **Pledge sell** `/pledges/:pid/sell` — cash-to-customer derivation, immutable `amountOwedAt` snapshot (Invariants 11 & 12).
- **Bulk release** `/release-bulk` — four ACTIVE/OVERDUE accept-lists must stay in sync; `?ids=` stateless contract; all-or-nothing transaction.
- **Inventory buy / sell** — server-derived net weights, `acquiredMetalRate` snapshot, `ALREADY_SOLD` guard.
- **LTV** `/ltv` & **Dashboard** — read `getRiskTier` thresholds / `computeCustomerRiskScore`; don't relabel tiers locally.
- **Financial summary** — positive-allowlist SOLD-exclusion filters must not be refactored into negations.

### Layout tightly coupled to server data shaping
- **Reports** `/reports` + `/reports/{customers,pledges}` — server pages shape rows specifically for table/PDF columns; 5000-row cap + `TOO_MANY_RECORDS`; date `istBoundary` handling. Restyle carefully — column shaping is server-side.
- **Bulk release** — UI state derives entirely from `?ids=` query string; changing container/routing risks breaking stateless-refresh behavior.
- **Public portal** `/view/:token` — separate trust boundary (Invariant 7); exhaustive 4-value status map (typecheck-enforced). Restyle must not add owner-level fields.
- Tables assume desktop column counts; any "cards on mobile" transform must preserve the exact same values (interest accrual can differ by tiny amounts — CLAUDE.md warns against `formatCurrencyAbbr` in comparisons).

---

## Summary Table

| Screen | Complexity | Current Mobile State | Redesign Priority | Risk Notes |
|--------|-----------|----------------------|-------------------|-----------|
| `/dashboard` | Complex | ❌ fixed grids, sparse resp, recharts | **High** | Charts need responsive wrap; read-only metrics |
| `/customers` (list) | Medium | ❌ wide table, 2 resp | **High** | Low logic risk — safe restyle |
| `/customers/:id/pledges/add` | Complex | ⚠/❌ dense multi-field form | **High** | Shell only — weight derivation (Inv 2,3) |
| `/customers/:id` (detail) | Complex | ❌ `320px` col + 4-col grid | **High** | Uses shared ui; modals; bulk-select |
| `/inventory` | Complex | ❌ wide table, 3 resp | **High** | Shell only — sell guard |
| `/customers/:id/pledges/:pid` | Complex | ❌ 4 tables, 0 resp | Med-High | Read-only financial records |
| `/pledges/:pid/release` | Complex | ❌ 2 tables | Med-High | **Shell only — critical write** |
| `/pledges/:pid/sell` | Complex | ⚠ 1 table + modal | Medium | **Shell only — Inv 11/12** |
| `/customers/:id/release-bulk` | Complex | ⚠ `min-w-[600px]` table | Medium | **Shell only — 4 accept-lists** |
| `/inventory/buy` | Medium | ⚠ 0 resp, big form | Medium | Shell only — net-wt derivation |
| `/ltv` | Complex | ❌ chart+table+modal | Medium | Read-only — don't relabel tiers |
| `/financial-summary` | Complex | ❌ wide numeric table | Medium | Positive-allowlist filters fragile |
| `/reports` (+children) | Complex | ⚠ tabs; server tables | Medium | Server column shaping coupled |
| `/notifications` | Medium | ⚠ no shell, 0 resp | Medium | No shell — needs nav decision |
| `/tasks` | Medium | ⚠ no shell, 0 resp | Medium | Low logic risk |
| `/profile` | Medium | ⚠ 1 resp, forms | Medium | Low logic risk |
| `/pledgeList` | Medium | ⚠ 0 resp | Low | Low logic risk |
| `/add-customer` | Medium | ⚠ 4 resp, form | Low | Divergent mobile validation |
| `/inventory/:id/receipt` | Medium | ⚠ fixed max-w | Low | Print-style, low traffic |
| `/subscription` | Medium | ⚠ 10 resp | Low | Razorpay flow — don't touch handler |
| `/onboarding` | Medium | ✅ 14 resp (best) | Low | Gates access — test flow |
| `/view/:token` | Medium | ⚠ 7 resp, off-brand gray | Low-Med | **Public trust boundary (Inv 7)** |
| `/`, `/sign-in`, `/sign-up` | Simple/Med | ✅/⚠ Clerk mostly | Low | Sign-up hooks bug pre-existing |
| `/reports/customers`, `/reports/pledges` | Medium | ❌ raw server tables | Low | PDF-mirrored; low interactive traffic |

---

## Suggested order to tackle (importance first, then lowest risk)

**Status legend:** ✅ DONE · ⏳ NOT STARTED

**Foundational (do before any screen):** ✅ DONE
0. Resolve the **shell + token gap**: the `DashboardLayout` drawer already works at `lg:`, but (a) `/notifications` & `/tasks` sit outside it, (b) two dark-mode systems (`.dark` vs `.dark-mode`) and two token sets coexist, (c) legacy `.dashboard-*` CSS + 768px media queries are dead/misaligned. Decide the nav model (8 sidebar items vs ≤5 bottom-nav) and consolidate tokens first — everything else depends on it. Also build a shared responsive **table→card** primitive and a shared **Dialog**, since ~10 raw tables and 9 inline modals are the main breakage sources and shared-ui adoption is currently near-zero (won't cascade otherwise).
   - Delivered in commits `8218e29` + `5296fb0`: token consolidation (single design system, Olive values under shadcn names), one `navConfig.ts` with `surfaces` tagging, bottom nav + FAB + More sheet, Sheet primitive. See CORRECTIONS above for where the delivered shape diverged from this original framing (nav resolution, Dialog→Sheet narrowing).
   - **Not** delivered as part of Phase 1, still open: the shared table→card primitive.

**Then, by traffic × low-risk — all ⏳ NOT STARTED (Phase 2), blocked pending mobile-view diagnosis (see STATUS above):**
1. ⏳ **`/dashboard`** — first thing every owner sees; mostly read-only (safe), just needs responsive grids + `ResponsiveContainer` charts.
2. ⏳ **`/customers` (list)** — high traffic, pure presentation, no financial logic — fastest safe win.
3. ⏳ **`/customers/:id/pledges/add`** — core daily action (create pledge); shell-only restyle, keep weight derivation untouched.
4. ⏳ **`/customers/:id` (detail)** — hub for per-customer work; already uses shared ui, so it also validates the shared-component approach.
5. ⏳ **`/inventory`** (list) then **`/inventory/buy`** — second module, wide table + big form.
6. ⏳ **`/pledges/:pid` detail → release → sell → bulk-release** — do as a cluster (shared table/card patterns), **shell-only, logic frozen** (critical writes).
7. ⏳ **`/ltv`, `/financial-summary`, `/reports`** — analytics/read tables; medium traffic.
8. ⏳ **`/notifications`, `/tasks`, `/profile`, `/pledgeList`** — lower traffic, low risk; good place to finalize the no-shell decision.
9. ⏳ **`/view/:token`** (public portal) — re-theme to brand + verify trust boundary; customer-facing so worth polishing, but isolate from owner components.
10. ⏳ **Auth/onboarding/subscription/report-print** — largely Clerk/server-driven; light touch last.
