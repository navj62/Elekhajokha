// app/api/cron/evaluate-risk/route.ts
//
// Production-scale risk sweep over ALL active pledges.
// Target: 500k active pledges / 10k users within Vercel Pro's 60s limit
// without exhausting Neon's connection pool.
//
// Architecture (see Phase 3 findings):
//   - Cursor pagination (BATCH_SIZE per page) — bounded memory, never loads
//     the whole active book at once.
//   - Per-user status counts hoisted into ONE grouped query (no N+1).
//   - Per-pledge metric writes batched into a single `UPDATE … FROM (VALUES …)`
//     per page (not P concurrent statements).
//   - FinancialSnapshot upserts run with bounded concurrency at the end, after
//     per-user totals are fully accumulated across all pages.
//   - No mega-transaction: each page commits independently, so progress is
//     durable and a mid-run failure doesn't roll everything back. Each page IS
//     atomic in itself though — its metrics UPDATE and its alert insert share
//     one transaction, so the tier cache can never advance without the alerts
//     that depend on its previous value.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { calculateLTV, type RiskTier } from "@/lib/calculateLTV";
import { constantTimeEqual } from "@/lib/constantTimeEqual";
import { LTV_MAX_8_2, LTV_MAX_5_2 } from "@/lib/pledgeConstants";

// Vercel: allow up to the Pro ceiling.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────
// TUNABLES
// ─────────────────────────────────────────────
const BATCH_SIZE = 500;                 // pledges per page (take BATCH_SIZE + 1)
const SNAPSHOT_UPSERT_CONCURRENCY = 50; // bounded fan-out for the end-of-run upserts

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
interface PledgeUpdate {
  id: string;
  lastAmountOwed: number;
  lastMarketValue: number | null;
  lastCalculatedLtv: number | null;
  lastRiskTier: RiskTier | null;
  lastEvaluatedAt: Date;
}

interface UserAccumulator {
  totalLoanAmount: number;
  totalAmountOwed: number;
  totalInterestOwed: number;
  totalMarketValue: number;
  totalGoldWeight: number;
  totalSilverWeight: number;
  activePledges: number; // count of active pledges actually evaluated
  safe: number;
  watch: number;
  atRisk: number;
  underwater: number;
}

interface StatusCounts {
  total: number;
  active: number;
  released: number;
  overdue: number;
}

// Explicit select — only what calculateLTV + the metric write need. Drops
// transactions (unused), itemPhoto, remark, and every other column.
// `items` (first one only) is fetched so the alert message can name the
// pledged item instead of leaking the raw pledge id.
const PLEDGE_SELECT = {
  id: true,
  customerId: true,
  loanAmount: true,
  interestRate: true,
  allowCompounding: true,
  compoundingDuration: true,
  pledgeDate: true,
  netWeightOfGold: true,
  netWeightOfSilver: true,
  lastRiskTier: true,
  customer: { select: { userId: true } },
  items: {
    select: { itemName: true, itemType: true },
    orderBy: { createdAt: "asc" },
    take: 1, // only the first item is needed for the alert label
  },
} satisfies Prisma.PledgeSelect;

// Annotating the page rows breaks the cursor↔page circular type inference.
type PledgeRow = Prisma.PledgeGetPayload<{ select: typeof PLEDGE_SELECT }>;

// ─────────────────────────────────────────────
// AUTH GUARD
// ─────────────────────────────────────────────
// Accepts EITHER scheme, both constant-time and fail-closed (Invariant 6):
//   • `Authorization: Bearer <CRON_SECRET>` — what Vercel Cron sends (GET only)
//   • `x-cron-secret: <CRON_SECRET>`        — existing manual-curl scheme
function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // fail closed when the secret is unset/empty

  // Scheme 1: x-cron-secret header
  const headerSecret = req.headers.get("x-cron-secret");
  if (headerSecret && constantTimeEqual(headerSecret, secret)) return true;

  // Scheme 2: Authorization: Bearer <secret>
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const bearer = authHeader.slice("Bearer ".length);
    if (bearer && constantTimeEqual(bearer, secret)) return true;
  }

  return false;
}

// Tiers that warrant a notification when a pledge moves INTO them.
// Improvements (e.g. back to SAFE) deliberately do NOT notify.
const NOTIFY_TIERS = new Set<RiskTier>(["WATCH", "AT_RISK", "UNDERWATER"]);

function firstItemLabel(
  items: { itemName: string | null; itemType: string }[]
): string {
  const first = items[0];
  if (!first) return "Pledge";
  return first.itemName?.trim() || first.itemType;
}

// ─────────────────────────────────────────────
// ALERT MESSAGE — names the item, never the raw pledge id
// ─────────────────────────────────────────────
function buildAlertMessage(
  oldTier: RiskTier | null,
  newTier: RiskTier,
  ltv: number,
  itemLabel: string
): string {
  const ltvStr = ltv.toFixed(1);
  if (newTier === "UNDERWATER")
    return `${itemLabel} is now UNDERWATER — LTV has reached ${ltvStr}%. Immediate attention required.`;
  if (newTier === "AT_RISK")
    return `${itemLabel} moved to AT RISK — LTV is ${ltvStr}%. Monitor closely.`;
  if (newTier === "WATCH")
    return `${itemLabel} moved to WATCH — LTV is ${ltvStr}%.`;
  return `${itemLabel} risk tier changed from ${oldTier} to ${newTier}. LTV: ${ltvStr}%.`;
}

function tierToAlertType(tier: RiskTier): "CRITICAL" | "TIER_CHANGE" | "INFO" {
  if (tier === "UNDERWATER") return "CRITICAL";
  if (tier === "AT_RISK" || tier === "WATCH") return "TIER_CHANGE";
  return "INFO";
}

// ─────────────────────────────────────────────
// BATCHED WRITES
// ─────────────────────────────────────────────

// One `UPDATE … FROM (VALUES …)` for the whole page instead of N updates.
// id/customerId are `text` columns (String @id, no @db.Uuid) → cast ::text.
// risk_tier carried as text in VALUES, cast to the "RiskTier" enum on assignment.
//
// The client is passed IN, never taken from the module-level `prisma` singleton:
// this runs inside the per-page transaction, and a raw statement issued on the
// global client from within a `$transaction` callback executes on a DIFFERENT
// pooled connection — i.e. OUTSIDE the transaction. That would silently restore
// the bug this parameter exists to prevent (metrics committing while the alert
// insert rolls back, permanently destroying the `oldTier !== newTier` signal).
async function flushPledgeMetrics(
  client: Prisma.TransactionClient,
  rows: PledgeUpdate[],
): Promise<void> {
  if (rows.length === 0) return;

  const tuples = rows.map(
    (r) => Prisma.sql`(
      ${r.id}::text,
      ${r.lastAmountOwed}::numeric,
      ${r.lastMarketValue}::numeric,
      ${r.lastCalculatedLtv}::numeric,
      ${r.lastRiskTier}::text,
      ${r.lastEvaluatedAt}::timestamptz
    )`
  );

  await client.$executeRaw(Prisma.sql`
    UPDATE "pledges" AS p SET
      "lastAmountOwed"    = v.amount_owed,
      "lastMarketValue"   = v.market_value,
      "lastCalculatedLtv" = v.ltv,
      "lastRiskTier"      = v.risk_tier::"RiskTier",
      "lastEvaluatedAt"   = v.evaluated_at
    FROM (VALUES ${Prisma.join(tuples)})
      AS v(id, amount_owed, market_value, ltv, risk_tier, evaluated_at)
    WHERE p.id = v.id
  `);
}

// ─────────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────────
// Vercel Cron issues GET with `Authorization: Bearer <CRON_SECRET>`; manual
// curl / existing triggers use POST with `x-cron-secret`. Both verbs run the
// exact same logic via this shared handler.
async function handle(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dryRun = req.nextUrl.searchParams.get("dryRun") === "true";
  const runStart = Date.now();
  const elapsed = () => Date.now() - runStart;

  // Observability threshold: warn once past this so a kill under Vercel Hobby's
  // 10s hard cap is VISIBLE in the logs. Purely a signal — never breaks the loop.
  const TIMEOUT_WARN_MS = 7000;

  // Progress markers so the catch block can report what was committed.
  // (declared outside the try so both the success summary and the catch can read them)
  let totalPledges = 0;
  let batchNumber = 0;
  let pledgesProcessed = 0;
  let alertsCreated = 0;

  try {
    // ── Total active pledges up front, so per-batch progress is meaningful ──
    // Same status filter as the batch loop below — do not diverge.
    totalPledges = await prisma.pledge.count({ where: { status: "ACTIVE" } });
    console.log(
      `[evaluate-risk] START — ${totalPledges} active pledges to process` +
      (dryRun ? " [dryRun]" : "")
    );
    // ── Latest metal prices — fetched ONCE (hoisted), never per pledge ──
    const [latestGold, latestSilver] = await Promise.all([
      prisma.metalPrice.findFirst({ where: { metal: "GOLD" }, orderBy: { createdAt: "desc" } }),
      prisma.metalPrice.findFirst({ where: { metal: "SILVER" }, orderBy: { createdAt: "desc" } }),
    ]);
    const goldPrice = latestGold ? Number(latestGold.inrPerGram) : null;
    const silverPrice = latestSilver ? Number(latestSilver.inrPerGram) : null;

    const now = new Date();
    const snapshotDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // ── Per-user status counts — ONE grouped query (replaces 3×N counts) ──
    // Prisma groupBy can't group by a relation field, so this is raw SQL.
    const countRows = await prisma.$queryRaw<
      { userId: string; status: string; count: bigint }[]
    >`
      SELECT c."userId" AS "userId", p.status::text AS status, COUNT(*)::bigint AS count
      FROM "pledges" p
      JOIN "customers" c ON c.id = p."customerId"
      GROUP BY c."userId", p.status
    `;

    const countsByUser = new Map<string, StatusCounts>();
    for (const row of countRows) {
      const c = countsByUser.get(row.userId) ?? { total: 0, active: 0, released: 0, overdue: 0 };
      const n = Number(row.count);
      c.total += n;
      if (row.status === "ACTIVE") c.active += n;
      else if (row.status === "RELEASED") c.released += n;
      else if (row.status === "OVERDUE") c.overdue += n;
      countsByUser.set(row.userId, c);
    }

    // ── Per-user accumulators — persist ACROSS pages so a user whose active ──
    // pledges span multiple batches gets one complete snapshot at the end.
    const accByUser = new Map<string, UserAccumulator>();
    const getAcc = (userId: string): UserAccumulator => {
      let a = accByUser.get(userId);
      if (!a) {
        a = {
          totalLoanAmount: 0, totalAmountOwed: 0, totalInterestOwed: 0,
          totalMarketValue: 0, totalGoldWeight: 0, totalSilverWeight: 0,
          activePledges: 0, safe: 0, watch: 0, atRisk: 0, underwater: 0,
        };
        accByUser.set(userId, a);
      }
      return a;
    };

    // dryRun preview only — capped so a full-book preview doesn't blow memory.
    const alertsPreview: object[] = [];
    const ALERT_PREVIEW_CAP = 100;

    // ── Page through ACTIVE pledges by id cursor ──
    let cursor: string | undefined = undefined;

    while (true) {
      const batchStart = Date.now();

      const page: PledgeRow[] = await prisma.pledge.findMany({
        where: { status: "ACTIVE" },
        orderBy: { id: "asc" },
        take: BATCH_SIZE + 1, // +1 sentinel to detect a next page
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        select: PLEDGE_SELECT,
      });

      if (page.length === 0) break;

      const hasNext = page.length > BATCH_SIZE;
      const items = hasNext ? page.slice(0, BATCH_SIZE) : page;

      const pledgeUpdates: PledgeUpdate[] = [];
      const batchAlerts: object[] = [];

      for (const pledge of items) {
        const userId = pledge.customer.userId;

        const { amountOwed, marketValue, ltv, riskTier } = calculateLTV({
          principal: Number(pledge.loanAmount),
          rate: Number(pledge.interestRate),
          pledgeDate: pledge.pledgeDate,
          currentDate: now,
          allowCompounding: pledge.allowCompounding,
          compoundingDuration: pledge.compoundingDuration,
          goldWeight: Number(pledge.netWeightOfGold),
          silverWeight: Number(pledge.netWeightOfSilver),
          goldPrice,
          silverPrice,
        });

        const oldTier = pledge.lastRiskTier as RiskTier | null;

        // ── Accumulate per-user totals (across pages) ──
        const acc = getAcc(userId);
        acc.totalLoanAmount += Number(pledge.loanAmount);
        acc.totalAmountOwed += amountOwed;
        acc.totalInterestOwed += amountOwed - Number(pledge.loanAmount);
        if (marketValue !== null) acc.totalMarketValue += marketValue;
        acc.totalGoldWeight += Number(pledge.netWeightOfGold);
        acc.totalSilverWeight += Number(pledge.netWeightOfSilver);
        acc.activePledges += 1;
        if (riskTier === "SAFE") acc.safe++;
        else if (riskTier === "WATCH") acc.watch++;
        else if (riskTier === "AT_RISK") acc.atRisk++;
        else if (riskTier === "UNDERWATER") acc.underwater++;

        // ── Alert only when the tier actually changed AND the new tier is one
        //    we notify on (WATCH / AT_RISK / UNDERWATER). Moving back to SAFE
        //    is a good thing and stays silent. ──
        if (riskTier !== null && oldTier !== riskTier && NOTIFY_TIERS.has(riskTier)) {
          const itemLabel = firstItemLabel(pledge.items);
          const alert = {
            userId,
            pledgeId: pledge.id,
            customerId: pledge.customerId,
            oldTier,
            newTier: riskTier,
            alertType: tierToAlertType(riskTier),
            message: buildAlertMessage(oldTier, riskTier, ltv!, itemLabel),
          };
          batchAlerts.push(alert);
          if (dryRun && alertsPreview.length < ALERT_PREVIEW_CAP) alertsPreview.push(alert);
        }

        pledgeUpdates.push({
          id: pledge.id,
          lastAmountOwed: Math.round(amountOwed * 100) / 100,
          lastMarketValue: marketValue !== null ? Math.round(marketValue * 100) / 100 : null,
          lastCalculatedLtv:
            ltv !== null ? Math.min(LTV_MAX_8_2, Math.round(ltv * 100) / 100) : null,
          lastRiskTier: riskTier,
          lastEvaluatedAt: now,
        });
      }

      // ── Commit this page — ONE transaction per page, never run-wide ──
      // The metrics UPDATE and the alert insert must land together or not at
      // all. The metrics write advances `lastRiskTier`, which is the ONLY
      // record of the tier we last notified on; the alert condition upstream is
      // `oldTier !== riskTier`. Committing the metrics without the alerts is
      // therefore not a retriable loss — the next run reads the already-advanced
      // tier, the comparison matches, and that crossing can NEVER be announced.
      //
      // Scope is deliberately tight: the page fetch, the per-pledge compute and
      // the cross-page accumulator all stay OUTSIDE, so the connection is held
      // only for the two writes (which have zero work between them).
      //
      // Page granularity preserves resumability exactly as before: a page either
      // commits both writes or neither, and a rolled-back page leaves
      // `lastRiskTier` un-advanced, so the next run re-derives it unchanged.
      //
      // Explicit 30s timeout (matching the sell / bulk-release transactions):
      // Prisma's 5s default would ABORT a slow 500-row UPDATE that today merely
      // runs long, trading a rare lost alert for a common failed page.
      if (!dryRun) {
        await prisma.$transaction(
          async (tx) => {
            await flushPledgeMetrics(tx, pledgeUpdates);
            if (batchAlerts.length > 0) {
              await tx.pledgeAlert.createMany({ data: batchAlerts as Prisma.PledgeAlertCreateManyInput[] });
            }
          },
          { timeout: 30000 }
        );
      }

      batchNumber++;
      pledgesProcessed += items.length;
      alertsCreated += batchAlerts.length;

      // One line per committed batch. If the function is killed mid-run, the
      // LAST line already in Vercel's logs tells you exactly how far it got.
      console.log(
        `[evaluate-risk] batch ${batchNumber} done — ` +
        `${pledgesProcessed}/${totalPledges} pledges — ` +
        `${elapsed()}ms elapsed (batch took ${Date.now() - batchStart}ms)` +
        (dryRun ? " [dryRun]" : "")
      );

      // Warn — but do NOT break — when we cross the headroom threshold under the
      // Hobby 10s cap. Breaking early would change behaviour; the warning is the
      // signal that remaining pledges likely won't be processed this run.
      if (elapsed() > TIMEOUT_WARN_MS) {
        console.warn(
          `[evaluate-risk] ⚠️ APPROACHING TIMEOUT — ${elapsed()}ms elapsed, ` +
          `${pledgesProcessed}/${totalPledges} done. Remaining pledges will ` +
          `NOT be processed this run.`
        );
      }

      if (!hasNext) break;
      cursor = items[items.length - 1].id;
    }

    // ── Build snapshots from fully-accumulated per-user totals ──
    const snapshotData = [...accByUser.entries()].map(([userId, a]) => {
      const counts = countsByUser.get(userId) ?? {
        total: a.activePledges, active: a.activePledges, released: 0, overdue: 0,
      };

      // overallLtv is NOT NULL Decimal(5,2): coerce null→0 and clamp to ceiling.
      const overallLtvRaw =
        a.totalMarketValue > 0
          ? Math.round((a.totalAmountOwed / a.totalMarketValue) * 10000) / 100
          : 0;
      const overallLtv = Math.min(LTV_MAX_5_2, overallLtvRaw);

      const data = {
        userId,
        totalLoanAmount: new Prisma.Decimal(a.totalLoanAmount.toFixed(2)),
        totalAmountOwed: new Prisma.Decimal(a.totalAmountOwed.toFixed(2)),
        totalInterestOwed: new Prisma.Decimal(Math.max(0, a.totalInterestOwed).toFixed(2)),
        totalMarketValue: new Prisma.Decimal(a.totalMarketValue.toFixed(2)),
        goldPricePerGram: new Prisma.Decimal((goldPrice ?? 0).toFixed(2)),
        silverPricePerGram: new Prisma.Decimal((silverPrice ?? 0).toFixed(2)),
        overallLtv: new Prisma.Decimal(overallLtv.toFixed(2)),
        totalGoldWeight: new Prisma.Decimal(a.totalGoldWeight.toFixed(3)),
        totalSilverWeight: new Prisma.Decimal(a.totalSilverWeight.toFixed(3)),
        totalPledges: counts.total,
        activePledges: a.activePledges,
        releasedPledges: counts.released,
        overduePledges: counts.overdue,
        safePledges: a.safe,
        watchPledges: a.watch,
        atRiskPledges: a.atRisk,
        underwaterPledges: a.underwater,
        snapshotDate,
        calculatedAt: now,
      };
      return data;
    });

    // ── Upsert snapshots with bounded concurrency (idempotent on userId+snapshotDate) ──
    if (!dryRun) {
      for (let i = 0; i < snapshotData.length; i += SNAPSHOT_UPSERT_CONCURRENCY) {
        const chunk = snapshotData.slice(i, i + SNAPSHOT_UPSERT_CONCURRENCY);
        await Promise.all(
          chunk.map((s) =>
            prisma.financialSnapshot.upsert({
              where: { userId_snapshotDate: { userId: s.userId, snapshotDate } },
              update: s,
              create: s,
            })
          )
        );
      }
    }

    const elapsedMs = Date.now() - runStart;

    if (dryRun) {
      console.log(
        `[evaluate-risk] dryRun complete — ${pledgesProcessed} pledges, ` +
        `${accByUser.size} users, ${alertsCreated} alerts, ${batchNumber} batches in ${elapsedMs}ms`
      );
      return NextResponse.json({
        dryRun: true,
        usersProcessed: accByUser.size,
        pledgesProcessed,
        batches: batchNumber,
        alertsWouldCreate: alertsCreated,
        snapshotsWouldCreate: snapshotData.length,
        elapsedMs,
        alerts: alertsPreview, // capped preview
        run: {
          totalPledges,
          processed: pledgesProcessed,
          batches: batchNumber,
          durationMs: elapsed(),
          complete: pledgesProcessed >= totalPledges,
          nearTimeout: elapsed() > TIMEOUT_WARN_MS,
        },
      });
    }

    console.log(
      `[evaluate-risk] complete — ${pledgesProcessed} pledges, ${accByUser.size} users, ` +
      `${alertsCreated} alerts, ${snapshotData.length} snapshots, ${batchNumber} batches in ${elapsedMs}ms`
    );
    console.log(
      `[evaluate-risk] COMPLETE — ${pledgesProcessed}/${totalPledges} pledges ` +
      `in ${batchNumber} batches, ${elapsed()}ms total`
    );

    return NextResponse.json({
      success: true,
      usersProcessed: accByUser.size,
      pledgesProcessed,
      batches: batchNumber,
      alertsCreated,
      snapshotsCreated: snapshotData.length,
      elapsedMs,
      run: {
        totalPledges,
        processed: pledgesProcessed,
        batches: batchNumber,
        durationMs: elapsed(),
        complete: pledgesProcessed >= totalPledges,
        nearTimeout: elapsed() > TIMEOUT_WARN_MS,
      },
    });
  } catch (error) {
    // Pages already flushed are committed; this run just stops here.
    console.error(
      `[evaluate-risk] FAILED after ${elapsed()}ms — ` +
      `${pledgesProcessed}/${totalPledges} processed on batch ${batchNumber + 1}; ` +
      `${pledgesProcessed} pledges across ${batchNumber} batch(es) were already committed; ` +
      `snapshots for this run were NOT written.`,
      error instanceof Error ? error.message : error
    );
    return NextResponse.json(
      {
        error: "Internal server error",
        failedAtBatch: batchNumber + 1,
        pledgesCommitted: pledgesProcessed,
        batchesCommitted: batchNumber,
        snapshotsWritten: false,
      },
      { status: 500 }
    );
  }
}

// GET — Vercel Cron entrypoint (Authorization: Bearer <CRON_SECRET>).
export const GET = handle;
// POST — existing manual-curl / trigger entrypoint (x-cron-secret header).
export const POST = handle;
