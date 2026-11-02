/**
 * Cash book — server half. Every write goes through a statement here.
 *
 * Rules (see prisma/schema.prisma CashDay / CashEntry):
 *  • A day is closed once the IST date has moved on. "Closed" is derived,
 *    never stored, so there is no job and no close button.
 *  • Every write targets TODAY (IST) only, and "today" is decided in SQL —
 *    `now() AT TIME ZONE 'Asia/Kolkata'` — inside the same statement that
 *    locks today's cash_days row (INSERT … ON CONFLICT DO UPDATE takes the
 *    row lock). A caller that names a date (`expectDay`) gets zero rows when
 *    that date is no longer today, which the routes turn into 409 DAY_CLOSED.
 *  • Automatic entries are written with the caller's transaction client, in
 *    the same transaction as the action. Never pass the global `prisma` from
 *    inside a $transaction callback: it runs on another pooled connection,
 *    outside the transaction (see flushPledgeMetrics in evaluate-risk).
 *  • `now()` is the transaction's start time, so the day an action lands on
 *    and the day row it locks always agree, even across midnight.
 *
 * Client-safe rules and arithmetic live in lib/cashBookShared.ts.
 */
import { Prisma, type CashDirection, type CashKind, type CashMode } from "@prisma/client";
import {
  resolveDay,
  cashEntryTitle,
  type CashKindValue,
  type CashModeValue,
  type CashDirectionValue,
} from "@/lib/cashBookShared";

type Db = Prisma.TransactionClient;

/** Today's IST calendar date, evaluated by Postgres. */
export const IST_TODAY = Prisma.sql`(now() AT TIME ZONE 'Asia/Kolkata')::date`;
/** Timestamps are stored as UTC `timestamp(3)`, Prisma's convention. */
const NOW_UTC = Prisma.sql`(now() AT TIME ZONE 'UTC')`;

/** The IST calendar date of a timestamptz expression. */
export function istDateOf(ts: Prisma.Sql): Prisma.Sql {
  return Prisma.sql`((${ts}) AT TIME ZONE 'Asia/Kolkata')::date`;
}

/** Thrown when a write aimed at a day that is no longer today. */
export const DAY_CLOSED = "DAY_CLOSED";

/**
 * Opening carried into day `d`: the previous day's counted cash if it was
 * counted, else its expected closing (opening + cash in − cash out, CASH mode
 * only). Worked out on every read, never stored — earlier days can't change,
 * so the answer is stable, and an entry that a transaction begun before
 * midnight commits late onto the earlier day is still counted.
 *
 * A day's opening is its owner-set opening, else the carried one, so the
 * chain is anchored at the latest earlier day with a count or an owner-set
 * opening; the days after it have neither, and only their entries matter:
 *   counted anchor:      counted cash + CASH net of the days after it;
 *   opening-only anchor: opening + CASH net of its own day and the days after.
 * NULL when no earlier day has either (no opening has ever been set).
 * One backward index probe on cash_days(userId, date) + one range scan of
 * cash_entries(userId, date).
 */
function carriedOpeningSql(userId: string, d: Prisma.Sql): Prisma.Sql {
  return Prisma.sql`(
    SELECT COALESCE(a."countedCash", a."openingOverride") + COALESCE((
      SELECT SUM(CASE WHEN e.direction = 'IN' THEN e.amount ELSE -e.amount END)
      FROM "cash_entries" e
      WHERE e."userId" = ${userId} AND e.mode = 'CASH'
        AND e.date >= a.date AND e.date < ${d}
        AND (a."countedCash" IS NULL OR e.date > a.date)
    ), 0)
    FROM (
      SELECT p.date, p."countedCash", p."openingOverride"
      FROM "cash_days" p
      WHERE p."userId" = ${userId} AND p.date < ${d}
        AND (p."countedCash" IS NOT NULL OR p."openingOverride" IS NOT NULL)
      ORDER BY p.date DESC
      LIMIT 1
    ) a
  )`;
}

/**
 * CTEs `t` (today) and `day` (today's row, created if missing, LOCKED).
 * With `expectDay`, `t` is empty unless that date is still today, so the
 * whole statement writes nothing.
 */
function lockTodaySql(userId: string, expectDay?: string): Prisma.Sql {
  const guard = expectDay ? Prisma.sql`WHERE ${IST_TODAY} = ${expectDay}::date` : Prisma.empty;
  return Prisma.sql`
    t AS (SELECT ${IST_TODAY} AS d ${guard}),
    day AS (
      INSERT INTO "cash_days" (id, "userId", date, "createdAt", "updatedAt")
      SELECT gen_random_uuid()::text, ${userId}, t.d, ${NOW_UTC}, ${NOW_UTC}
      FROM t
      ON CONFLICT ("userId", date) DO UPDATE SET "updatedAt" = ${NOW_UTC}
      RETURNING id, date
    )`;
}

/* ------------------------------------------------------------------ */
/*  Automatic + manual entry insert                                    */
/* ------------------------------------------------------------------ */

export interface NewCashEntry {
  kind: CashKind | CashKindValue;
  direction: CashDirection | CashDirectionValue;
  /** Canonical 2-dp string or a Decimal. Never negative. */
  amount: Prisma.Decimal | string;
  mode?: CashMode | CashModeValue;
  partyName?: string | null;
  customerId?: string | null;
  pledgeId?: string | null;
  inventoryItemId?: string | null;
  transactionId?: string | null;
  /** The action's own date. Stored as eventDate only when its IST day differs. */
  eventAt?: Date | null;
  note?: string | null;
}

const money = (a: Prisma.Decimal | string) =>
  typeof a === "string" ? a : a.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP).toFixed(2);

/**
 * Writes `entries` on today's page in ONE statement (lock + insert), and
 * throws unless every row was written. Pass the transaction client of the
 * action that causes the entries.
 */
export async function recordCashEntries(
  db: Db,
  userId: string,
  entries: NewCashEntry[],
  opts: { expectDay?: string } = {},
): Promise<string[]> {
  if (entries.length === 0) return [];
  const rows = entries.map((e) => {
    const ev = e.eventAt && !isNaN(e.eventAt.getTime()) ? e.eventAt.toISOString() : null;
    return Prisma.sql`(
      ${e.kind}::text, ${e.direction}::text, ${money(e.amount)}::numeric, ${e.mode ?? "CASH"}::text,
      ${e.partyName ?? null}::text, ${e.customerId ?? null}::text, ${e.pledgeId ?? null}::text,
      ${e.inventoryItemId ?? null}::text, ${e.transactionId ?? null}::text,
      ${ev}::timestamptz, ${e.note ?? null}::text
    )`;
  });

  const written = await db.$queryRaw<{ id: string }[]>(Prisma.sql`
    WITH ${lockTodaySql(userId, opts.expectDay)}
    INSERT INTO "cash_entries" (
      id, "userId", date, direction, amount, "originalAmount", mode, kind,
      "partyName", "customerId", "pledgeId", "inventoryItemId", "transactionId",
      "eventDate", note, "createdAt", "updatedAt"
    )
    SELECT
      gen_random_uuid()::text, ${userId}, day.date, v.direction::"CashDirection", v.amount, v.amount,
      v.mode::"CashMode", v.kind::"CashKind",
      v.party_name, v.customer_id, v.pledge_id, v.item_id, v.txn_id,
      CASE WHEN ${istDateOf(Prisma.sql`v.event_at`)} <> day.date THEN ${istDateOf(Prisma.sql`v.event_at`)} END,
      v.note, ${NOW_UTC}, ${NOW_UTC}
    FROM day
    CROSS JOIN (VALUES ${Prisma.join(rows)})
      AS v(kind, direction, amount, mode, party_name, customer_id, pledge_id, item_id, txn_id, event_at, note)
    RETURNING id
  `);

  if (written.length !== entries.length) {
    // Only an expectDay mismatch yields zero rows; anything else is a bug.
    throw new Error(written.length === 0 && opts.expectDay ? DAY_CLOSED : "CASH_ENTRY_NOT_WRITTEN");
  }
  return written.map((r) => r.id);
}

/**
 * Pledge delete: one REVERSAL per un-reversed entry of the pledge (its loan
 * entry and every repayment / top-up), on today's page, opposite direction,
 * same amount and mode, eventDate = the original's day when that was earlier.
 * Must run in the delete's transaction BEFORE the pledge row goes, because
 * the pledge's transactions cascade with it.
 */
export async function reversePledgeEntries(db: Db, userId: string, pledgeId: string): Promise<number> {
  const written = await db.$queryRaw<{ id: string }[]>(reversePledgeEntriesSql(userId, pledgeId));
  return written.length;
}

/**
 * The pledge's entries are read straight from the unique indexes — its own
 * entries by (pledgeId, kind), its repayments / top-ups by transactionId —
 * never by scanning the shop's whole history. Each branch returns the
 * columns the reversal copies, so there is no second lookup. No entry
 * matches both branches (repayment / top-up entries carry no pledgeId).
 * `tx_entries` is MATERIALIZED so the shop filter is applied after the
 * transactionId lookup instead of steering it onto the (userId, …) index.
 * Exported for the EXPLAIN test.
 */
export function reversePledgeEntriesSql(userId: string, pledgeId: string): Prisma.Sql {
  return Prisma.sql`
    WITH ${lockTodaySql(userId)},
    tx_entries AS MATERIALIZED (
      SELECT ce.id, ce."userId", ce.kind, ce.date, ce.direction, ce.amount, ce.mode, ce."partyName", ce."customerId"
      FROM "transactions" tr
      JOIN "cash_entries" ce ON ce."transactionId" = tr.id
      WHERE tr."pledgeId" = ${pledgeId}
    ),
    o AS (
      SELECT ce.id, ce."userId", ce.kind, ce.date, ce.direction, ce.amount, ce.mode, ce."partyName", ce."customerId"
      FROM "cash_entries" ce
      WHERE ce."pledgeId" = ${pledgeId}
      UNION ALL
      SELECT * FROM tx_entries
    )
    INSERT INTO "cash_entries" (
      id, "userId", date, direction, amount, "originalAmount", mode, kind,
      "partyName", "customerId", "reversesEntryId", "eventDate", "createdAt", "updatedAt"
    )
    SELECT
      gen_random_uuid()::text, o."userId", day.date,
      (CASE WHEN o.direction = 'IN' THEN 'OUT' ELSE 'IN' END)::"CashDirection",
      o.amount, o.amount, o.mode, 'REVERSAL'::"CashKind",
      o."partyName", o."customerId", o.id,
      CASE WHEN o.date <> day.date THEN o.date END,
      ${NOW_UTC}, ${NOW_UTC}
    FROM day
    CROSS JOIN o
    WHERE o."userId" = ${userId}
      AND o.kind <> 'REVERSAL'
      AND NOT EXISTS (SELECT 1 FROM "cash_entries" r WHERE r."reversesEntryId" = o.id)
    RETURNING id
  `;
}

/* ------------------------------------------------------------------ */
/*  Entry edit / delete — one guarded statement each                   */
/* ------------------------------------------------------------------ */

export interface CashEntryEdit {
  amount?: string;
  mode?: CashModeValue;
  note?: string | null;
  /** MANUAL entries only. */
  direction?: CashDirectionValue;
}

/**
 * Applies `edit` iff the entry is the caller's, is on today's page (and
 * today is still `expectDay`), and has not been reversed. A REVERSAL's
 * amount and mode are fixed (they mirror the original), only MANUAL entries
 * change direction, and only a PLEDGE_SOLD amount may be 0; all enforced in
 * the WHERE clause too. `editedAt` is set when amount or note change — a
 * mode toggle is not an "edit".
 * Returns false when no row qualified; the caller classifies why.
 */
export async function editCashEntry(
  db: Db,
  userId: string,
  entryId: string,
  expectDay: string,
  edit: CashEntryEdit,
): Promise<boolean> {
  const setAmount = edit.amount !== undefined;
  const setNote = edit.note !== undefined;
  const setMode = edit.mode !== undefined;
  const setDirection = edit.direction !== undefined;
  const rows = await db.$queryRaw<{ id: string }[]>(Prisma.sql`
    WITH t AS (SELECT ${IST_TODAY} AS d WHERE ${IST_TODAY} = ${expectDay}::date),
    day AS (
      SELECT cd.id FROM "cash_days" cd, t
      WHERE cd."userId" = ${userId} AND cd.date = t.d
      FOR UPDATE OF cd
    )
    UPDATE "cash_entries" e SET
      amount    = CASE WHEN ${setAmount}::boolean THEN ${edit.amount ?? null}::numeric ELSE e.amount END,
      mode      = CASE WHEN ${setMode}::boolean THEN ${edit.mode ?? null}::text::"CashMode" ELSE e.mode END,
      note      = CASE WHEN ${setNote}::boolean THEN ${edit.note ?? null}::text ELSE e.note END,
      direction = CASE WHEN ${setDirection}::boolean THEN ${edit.direction ?? null}::text::"CashDirection" ELSE e.direction END,
      "editedAt" = CASE WHEN ${setAmount || setNote}::boolean THEN ${NOW_UTC} ELSE e."editedAt" END,
      "updatedAt" = ${NOW_UTC}
    FROM t, day
    WHERE e.id = ${entryId}
      AND e."userId" = ${userId}
      AND e.date = t.d
      AND NOT EXISTS (SELECT 1 FROM "cash_entries" r WHERE r."reversesEntryId" = e.id)
      AND (NOT ${setAmount}::boolean OR e.kind <> 'REVERSAL')
      AND (NOT ${setAmount}::boolean OR ${edit.amount ?? null}::numeric > 0 OR e.kind = 'PLEDGE_SOLD')
      AND (NOT ${setMode}::boolean OR e.kind <> 'REVERSAL')
      AND (NOT ${setDirection}::boolean OR e.kind = 'MANUAL')
    RETURNING e.id
  `);
  return rows.length === 1;
}

/** Deletes a MANUAL entry on today's page. False when none qualified. */
export async function deleteManualCashEntry(
  db: Db,
  userId: string,
  entryId: string,
  expectDay: string,
): Promise<boolean> {
  const rows = await db.$queryRaw<{ id: string }[]>(Prisma.sql`
    WITH t AS (SELECT ${IST_TODAY} AS d WHERE ${IST_TODAY} = ${expectDay}::date),
    day AS (
      SELECT cd.id FROM "cash_days" cd, t
      WHERE cd."userId" = ${userId} AND cd.date = t.d
      FOR UPDATE OF cd
    )
    DELETE FROM "cash_entries" e
    USING t, day
    WHERE e.id = ${entryId}
      AND e."userId" = ${userId}
      AND e.kind = 'MANUAL'
      AND e.date = t.d
    RETURNING e.id
  `);
  return rows.length === 1;
}

/* ------------------------------------------------------------------ */
/*  Day row: opening edit + drawer count                               */
/* ------------------------------------------------------------------ */

/**
 * Sets today's opening override (`null` clears it) and/or the latest drawer
 * count, creating today's row if needed. False when `expectDay` is no longer
 * today.
 */
export async function updateCashDay(
  db: Db,
  userId: string,
  expectDay: string,
  patch: { openingOverride?: string | null; countedCash?: string },
): Promise<boolean> {
  const setOpening = patch.openingOverride !== undefined;
  const setCount = patch.countedCash !== undefined;
  const rows = await db.$queryRaw<{ id: string }[]>(Prisma.sql`
    WITH t AS (SELECT ${IST_TODAY} AS d WHERE ${IST_TODAY} = ${expectDay}::date)
    INSERT INTO "cash_days" (
      id, "userId", date, "openingOverride", "countedCash", "countedAt", "createdAt", "updatedAt"
    )
    SELECT
      gen_random_uuid()::text, ${userId}, t.d,
      ${patch.openingOverride ?? null}::numeric,
      ${patch.countedCash ?? null}::numeric,
      CASE WHEN ${setCount}::boolean THEN ${NOW_UTC} END,
      ${NOW_UTC}, ${NOW_UTC}
    FROM t
    ON CONFLICT ("userId", date) DO UPDATE SET
      "openingOverride" = CASE WHEN ${setOpening}::boolean THEN EXCLUDED."openingOverride" ELSE "cash_days"."openingOverride" END,
      "countedCash"     = CASE WHEN ${setCount}::boolean THEN EXCLUDED."countedCash" ELSE "cash_days"."countedCash" END,
      "countedAt"       = CASE WHEN ${setCount}::boolean THEN EXCLUDED."countedAt" ELSE "cash_days"."countedAt" END,
      "updatedAt"       = ${NOW_UTC}
    RETURNING id
  `);
  return rows.length === 1;
}

/* ------------------------------------------------------------------ */
/*  Reads                                                               */
/* ------------------------------------------------------------------ */

interface CashDaySummaryRow {
  date: string;
  today: string;
  carriedOpening: Prisma.Decimal | null;
  openingOverride: Prisma.Decimal | null;
  countedCash: Prisma.Decimal | null;
  countedAt: Date | null;
  cashIn: Prisma.Decimal;
  cashOut: Prisma.Decimal;
  otherIn: Prisma.Decimal;
  otherOut: Prisma.Decimal;
  entryCount: number;
}

/**
 * The day's row, its carried opening (worked out, see carriedOpeningSql) and
 * its totals, in one statement. `day` null = today. Exported as SQL for EXPLAIN.
 */
export function daySummarySql(userId: string, day: string | null): Prisma.Sql {
  const d = day ? Prisma.sql`${day}::date` : IST_TODAY;
  return Prisma.sql`
    WITH t AS (SELECT ${d} AS d, ${IST_TODAY} AS today)
    SELECT
      t.d::text AS date,
      t.today::text AS today,
      ${carriedOpeningSql(userId, Prisma.sql`t.d`)} AS "carriedOpening",
      cd."openingOverride", cd."countedCash", cd."countedAt",
      s.cash_in AS "cashIn", s.cash_out AS "cashOut", s.other_in AS "otherIn", s.other_out AS "otherOut",
      s.n AS "entryCount"
    FROM t
    LEFT JOIN "cash_days" cd ON cd."userId" = ${userId} AND cd.date = t.d
    CROSS JOIN LATERAL (
      SELECT
        COALESCE(SUM(e.amount) FILTER (WHERE e.mode = 'CASH' AND e.direction = 'IN'), 0)  AS cash_in,
        COALESCE(SUM(e.amount) FILTER (WHERE e.mode = 'CASH' AND e.direction = 'OUT'), 0) AS cash_out,
        COALESCE(SUM(e.amount) FILTER (WHERE e.mode <> 'CASH' AND e.direction = 'IN'), 0)  AS other_in,
        COALESCE(SUM(e.amount) FILTER (WHERE e.mode <> 'CASH' AND e.direction = 'OUT'), 0) AS other_out,
        COUNT(*)::int AS n
      FROM "cash_entries" e
      WHERE e."userId" = ${userId} AND e.date = t.d
    ) s`;
}

export async function getCashDaySummary(db: Db, userId: string, day: string | null): Promise<CashDaySummaryRow> {
  const rows = await db.$queryRaw<CashDaySummaryRow[]>(daySummarySql(userId, day));
  return rows[0];
}

interface CashEntryRow {
  id: string;
  date: string;
  direction: CashDirection;
  amount: Prisma.Decimal;
  originalAmount: Prisma.Decimal;
  mode: CashMode;
  kind: CashKind;
  partyName: string | null;
  customerId: string | null;
  pledgeId: string | null;
  inventoryItemId: string | null;
  itemDescription: string | null;
  reversesEntryId: string | null;
  reversed: boolean;
  eventDate: string | null;
  note: string | null;
  editedAt: Date | null;
  createdAt: Date;
}

/**
 * The day's entries in recording order, with what the page links to — the
 * pledge (also for repayments, via their transaction), the item's
 * description, and whether a reversal exists — in one statement. Every join
 * is on a primary key or the unique reversesEntryId index.
 */
function dayEntriesSql(userId: string, day: string): Prisma.Sql {
  return Prisma.sql`
    SELECT
      e.id, e.date::text AS date, e.direction, e.amount, e."originalAmount", e.mode, e.kind,
      e."partyName", e."customerId",
      COALESCE(e."pledgeId", tr."pledgeId") AS "pledgeId",
      e."inventoryItemId", ii.description AS "itemDescription",
      e."reversesEntryId", (r.id IS NOT NULL) AS reversed,
      e."eventDate"::text AS "eventDate", e.note, e."editedAt", e."createdAt"
    FROM "cash_entries" e
    LEFT JOIN "transactions" tr ON tr.id = e."transactionId"
    LEFT JOIN "inventory_items" ii ON ii.id = e."inventoryItemId"
    LEFT JOIN "cash_entries" r ON r."reversesEntryId" = e.id
    WHERE e."userId" = ${userId} AND e.date = ${day}::date
    ORDER BY e."createdAt", e.id`;
}

export async function getCashDayEntries(db: Db, userId: string, day: string): Promise<CashEntryRow[]> {
  return db.$queryRaw<CashEntryRow[]>(dayEntriesSql(userId, day));
}

/* ------------------------------------------------------------------ */
/*  Logging                                                             */
/* ------------------------------------------------------------------ */

/**
 * A log-safe tag for an error: Prisma code (+ SQLSTATE for raw queries) or
 * the error's name — never its message. Postgres messages and DETAIL lines
 * can carry row values ("Failing row contains (…)", "invalid input syntax
 * for type numeric: …"), i.e. customer names and amounts.
 */
export function errorTag(err: unknown): string {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const sqlState = (err.meta as { code?: unknown } | undefined)?.code;
    return typeof sqlState === "string" ? `${err.code}/${sqlState}` : err.code;
  }
  if (err instanceof Error) return err.message === DAY_CLOSED ? DAY_CLOSED : err.name;
  return typeof err;
}

/* ------------------------------------------------------------------ */
/*  JSON shapes for the routes — money as 2-dp strings                 */
/* ------------------------------------------------------------------ */

const str = (d: Prisma.Decimal | null) => (d === null ? null : d.toFixed(2));

export function serializeCashDay(row: CashDaySummaryRow) {
  const figures = {
    carriedOpening: str(row.carriedOpening),
    openingOverride: str(row.openingOverride),
    cashIn: row.cashIn.toFixed(2),
    cashOut: row.cashOut.toFixed(2),
    countedCash: str(row.countedCash),
  };
  const isToday = row.date === row.today;
  return {
    date: row.date,
    today: row.today,
    isToday,
    ...figures,
    ...resolveDay(figures),
    otherIn: row.otherIn.toFixed(2),
    otherOut: row.otherOut.toFixed(2),
    countedAt: row.countedAt,
    entryCount: row.entryCount,
  };
}

export function serializeCashEntry(e: CashEntryRow, isToday: boolean) {
  const amount = e.amount.toFixed(2);
  const originalAmount = e.originalAmount.toFixed(2);
  return {
    id: e.id,
    kind: e.kind,
    title: cashEntryTitle(e.kind, amount),
    direction: e.direction,
    amount,
    originalAmount,
    amountEdited: amount !== originalAmount,
    editedAt: e.editedAt,
    mode: e.mode,
    partyName: e.partyName,
    customerId: e.customerId,
    pledgeId: e.pledgeId,
    inventoryItemId: e.inventoryItemId,
    itemDescription: e.itemDescription,
    reversesEntryId: e.reversesEntryId,
    reversed: e.reversed,
    eventDate: e.eventDate,
    note: e.note,
    createdAt: e.createdAt,
    editable: isToday && !e.reversed,
    deletable: isToday && e.kind === "MANUAL",
  };
}

export type CashDayJson = ReturnType<typeof serializeCashDay>;
export type CashEntryJson = ReturnType<typeof serializeCashEntry>;
