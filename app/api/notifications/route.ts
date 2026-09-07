// app/api/notifications/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

/* ------------------------------------------------------------------ */
/*  Keyset cursor over (createdAt, id)                                  */
/*                                                                      */
/*  A cursor MUST address a TOTAL ORDER. `createdAt` alone is not one:  */
/*  the risk cron writes a sweep's alerts with `createMany` inside a    */
/*  transaction, and Postgres now() is transaction-START time, so every  */
/*  alert in a batch carries a BYTE-IDENTICAL timestamp. Paging on      */
/*  `createdAt` alone with a strict `lt` therefore stepped straight     */
/*  over every remaining member of a tied group: those rows existed,    */
/*  were counted in unreadCount, and no page could ever return them.    */
/*  Measured on production before this fix: 450 of 970 alerts (46%)     */
/*  were unreachable, with tied groups as large as 174 against a page   */
/*  size of 20.                                                         */
/*                                                                      */
/*  This class of bug is invisible in testing — ties only appear at     */
/*  production scale, where a single batch write outnumbers the page    */
/*  size. Seed data written row-by-row gets a distinct timestamp each   */
/*  and pages perfectly.                                                */
/*                                                                      */
/*  `id` (a uuid PK) is appended to both the ordering and the cursor to */
/*  break ties deterministically. Wire format is a readable delimited   */
/*  pair — "<ISO timestamp>|<id>" — deliberately NOT base64/JSON:       */
/*  clients treat it as opaque and never parse it, and a legible cursor */
/*  is far easier to debug from a network log.                          */
/* ------------------------------------------------------------------ */
const CURSOR_SEP = "|";

type AlertCursor = { createdAt: Date; id: string };

/**
 * Parse a cursor defensively. ANY unusable value — an old createdAt-only
 * cursor still held by a page that was open across the deploy, a truncated
 * string, a bare uuid, garbage — yields null, and a null cursor serves the
 * FIRST page. It must never throw: `new Date("<uuid>")` is an Invalid Date,
 * and handing that to Prisma is a 500 on what should be a graceful degrade.
 */
function parseCursor(raw: string | null): AlertCursor | null {
  if (!raw) return null;
  const sep = raw.indexOf(CURSOR_SEP);
  if (sep === -1) return null; // old createdAt-only cursor, or malformed
  const datePart = raw.slice(0, sep);
  const id = raw.slice(sep + 1);
  if (!datePart || !id) return null;
  const createdAt = new Date(datePart);
  if (isNaN(createdAt.getTime())) return null;
  return { createdAt, id };
}

function encodeCursor(row: { createdAt: Date; id: string }): string {
  return `${row.createdAt.toISOString()}${CURSOR_SEP}${row.id}`;
}

/* ------------------------------------------------------------------ */
/*  Tier filter                                                        */
/*                                                                     */
/*  The tier pill used to filter the LOADED PAGE in the browser, which  */
/*  made the answer depend on how many times "Load more" had been       */
/*  pressed first: a matching alert sitting past the first 20 rows was  */
/*  simply invisible, and the list read as complete when it wasn't.     */
/*  Filtering belongs here, next to the tenant scope, so a tier query   */
/*  walks the WHOLE alert history through the same keyset pagination.   */
/*                                                                     */
/*  Degrades rather than 400s, exactly like `unreadOnly`: anything that */
/*  is not one of the four RiskTier values — "all", a typo, garbage, a  */
/*  tier removed in some future migration — yields null, and null means */
/*  "no tier filter". A filter pill must never be able to error the     */
/*  page out.                                                          */
/* ------------------------------------------------------------------ */
const TIER_VALUES = ["SAFE", "WATCH", "AT_RISK", "UNDERWATER"] as const;
type TierFilter = (typeof TIER_VALUES)[number];

function parseTier(raw: string | null): TierFilter | null {
  if (!raw) return null;
  return (TIER_VALUES as readonly string[]).includes(raw)
    ? (raw as TierFilter)
    : null;
}

export async function GET(req: NextRequest) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { clerkUserId },
    select: { id: true },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { searchParams } = req.nextUrl;
  const unreadOnly = searchParams.get("unreadOnly") === "true";
  const tier = parseTier(searchParams.get("tier"));
  const take = Math.min(Number(searchParams.get("take") ?? 20), 50);
  const cursor = parseCursor(searchParams.get("cursor"));

  const alerts = await prisma.pledgeAlert.findMany({
    where: {
      userId: user.id,
      ...(unreadOnly ? { isRead: false } : {}),
      // A SIBLING key, like isRead above — it ANDs with the tenant scope and
      // is never a member of the keyset OR below. Putting it inside that OR
      // would let a tier match widen the cursor comparison and resurrect rows
      // the cursor had already passed.
      ...(tier ? { newTier: tier } : {}),
      // Keyset comparison over the full ordering tuple, descending:
      // strictly-older, OR same instant and a strictly-smaller id. Tied rows
      // are thus ORDERED and walked through rather than skipped. A sibling
      // key, so it ANDs with the tenant scope and the isRead filter above —
      // the userId scope is NEVER a member of this OR.
      ...(cursor
        ? {
            OR: [
              { createdAt: { lt: cursor.createdAt } },
              { createdAt: cursor.createdAt, id: { lt: cursor.id } },
            ],
          }
        : {}),
    },
    // Must match the cursor tuple exactly, and must end in a unique column.
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: take + 1,
    select: {
      id: true,
      oldTier: true,
      newTier: true,
      alertType: true,
      message: true,
      isRead: true,
      createdAt: true,
      pledge: {
        select: {
          id: true,
          customerId: true,
          loanAmount: true,
          lastCalculatedLtv: true,
          // ✅ Fixed: `lastMarketValue` and `lastAmountOwed` don't exist on Pledge.
          // Use the fields Prisma reported as available:
          lastRiskTier: true,
          lastEvaluatedAt: true,
          status: true,
          releaseDate: true,
          totalInterest: true,
          receivableAmount: true,
          items: {
            select: { itemName: true, itemType: true, metalType: true },
            take: 3,
          },
        },
      },
      customer: {
        select: { id: true, name: true },
      },
    },
  });

  // Deliberately NOT scoped by `tier` (nor by the cursor): this is the global
  // unread badge shown in the header and on the Unread pill, and it must keep
  // reporting the whole book regardless of which tier is being viewed.
  const unreadCount = await prisma.pledgeAlert.count({
    where: { userId: user.id, isRead: false },
  });

  const hasMore = alerts.length > take;
  const items = hasMore ? alerts.slice(0, take) : alerts;
  // Carries BOTH ordering columns — a cursor that dropped `id` would
  // reintroduce the tied-row skip this keyset exists to prevent.
  const nextCursor = hasMore ? encodeCursor(items[items.length - 1]) : null;

  return NextResponse.json({ alerts: items, unreadCount, hasMore, nextCursor });
}

// ─────────────────────────────────────────────
// DELETE /api/notifications
//
// Body (optional):
//   { ids: ["id1", "id2"] }  → delete those specific alerts
//   {} or empty body         → delete ALL of this user's alerts
//
// Always scoped by userId, so a user can never delete another user's alerts
// even if they pass foreign ids.
// ─────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { clerkUserId },
    select: { id: true },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Gracefully handle empty bodies without crashing
  const body = await req.json().catch(() => ({}));
  const ids = Array.isArray(body?.ids) ? body.ids : undefined;

  const result = await prisma.pledgeAlert.deleteMany({
    where: {
      userId: user.id,
      ...(ids ? { id: { in: ids } } : {}),
    },
  });

  return NextResponse.json({ deleted: result.count });
}