// Cash book — end-to-end against the DEV database.
//
// Runs the real route handlers and the real SQL in lib/cashBook.ts (locks,
// the IST "today", unique indexes, transactions) — none of that can be shown
// with an in-memory fake. Only Clerk's auth() is mocked.
//
// Opt-in: skipped unless CASHBOOK_DB_TESTS=1, so CI (no database) and the
// default `npm test` stay offline. Run with `npm run test:db`.
// Guarded by assertDbTarget: refuses anything but a dev host.
// Every row it creates hangs off throwaway `cbtest_` users, deleted at the end.
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { Prisma, type PrismaClient } from "@prisma/client";

const RUN = process.env.CASHBOOK_DB_TESTS === "1";

const session = vi.hoisted(() => ({ clerkUserId: null as string | null }));
vi.mock("@clerk/nextjs/server", () => ({
  auth: async () => ({ userId: session.clerkUserId }),
}));

/* eslint-disable @typescript-eslint/no-explicit-any -- route modules are imported dynamically */
let prisma: PrismaClient;
let cashBook: typeof import("@/lib/cashBook");
let pledges: any, pledgeOne: any, bulk: any, sell: any, txns: any;
let inventory: any, inventorySell: any;
let cbDay: any, cbSummary: any, cbDayPatch: any, cbEntries: any, cbEntry: any;
/* eslint-enable @typescript-eslint/no-explicit-any */

let today = "";
let yesterday = "";
const RUN_TAG = `cbtest_${Date.now().toString(36)}`;
const users: { id: string; clerkUserId: string }[] = [];

const addDays = (day: string, n: number) => {
  const d = new Date(`${day}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const dbDate = (day: string) => new Date(`${day}T00:00:00.000Z`);
const ctx = <T extends object>(params: T) => ({ params: Promise.resolve(params) });
const json = (url: string, method: string, body?: unknown) =>
  new NextRequest(`http://test${url}`, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

async function tenant(tag: string) {
  const clerkUserId = `${RUN_TAG}_${tag}`;
  const user = await prisma.user.create({
    data: { clerkUserId, username: clerkUserId },
    select: { id: true, clerkUserId: true },
  });
  users.push(user);
  const customer = await prisma.customer.create({
    data: { userId: user.id, name: "रमेश कुमार", region: "Test", address: "Test" },
    select: { id: true, name: true },
  });
  return { ...user, customerId: customer.id, customerName: customer.name };
}
const as = (u: { clerkUserId: string }) => { session.clerkUserId = u.clerkUserId; };
const entriesOf = (userId: string) =>
  prisma.cashEntry.findMany({ where: { userId }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });

async function createPledge(t: { customerId: string }, loanAmount: string, pledgeDate: string) {
  const fd = new FormData();
  fd.set("loanAmount", loanAmount);
  fd.set("interestRate", "24");
  fd.set("compoundingDuration", "YEARLY");
  fd.set("pledgeDate", pledgeDate);
  fd.set("items", JSON.stringify([
    { itemType: "Ring", metalType: "GOLD", grossWeight: "10", netWeight: "9", purity: "91.6" },
  ]));
  const res = await pledges.POST(
    new NextRequest(`http://test/api/customers/${t.customerId}/pledges`, { method: "POST", body: fd }),
    ctx({ customerId: t.customerId }),
  );
  expect(res.status).toBe(201);
  return (await res.json()).id as string;
}

async function buyItem(cost: string, seller = "सीता देवी") {
  const fd = new FormData();
  fd.set("description", "Test chain");
  fd.set("itemType", "Chain");
  fd.set("metalType", "GOLD");
  fd.set("purity", "91.6");
  fd.set("grossWeight", "5");
  fd.set("acquiredCost", cost);
  fd.set("acquiredAt", new Date().toISOString());
  fd.set("sellerName", seller);
  const res = await inventory.POST(new NextRequest("http://test/api/inventory", { method: "POST", body: fd }));
  expect(res.status).toBe(201);
  return (await res.json()).item.id as string;
}

async function getDay(date?: string) {
  const res = await cbDay.GET(new NextRequest(`http://test/api/cash-book${date ? `?date=${date}` : ""}`));
  return { status: res.status, body: await res.json() };
}

describe.skipIf(!RUN)("cash book (dev DB)", { timeout: 120_000 }, () => {
  beforeAll(async () => {
    await import("dotenv/config");
    const { assertDbTarget } = await import("@/lib/dbGuard");
    assertDbTarget(process.env.DATABASE_URL, "tests/cashBook.db.test.ts");

    prisma = (await import("@/lib/prisma")).prisma;
    cashBook = await import("@/lib/cashBook");
    pledges = await import("@/app/api/customers/[customerId]/pledges/route");
    pledgeOne = await import("@/app/api/customers/[customerId]/pledges/[pledgeId]/route");
    bulk = await import("@/app/api/customers/[customerId]/pledges/bulk-release/route");
    sell = await import("@/app/api/customers/[customerId]/pledges/[pledgeId]/sell/route");
    txns = await import("@/app/api/customers/[customerId]/pledges/[pledgeId]/transactions/route");
    inventory = await import("@/app/api/inventory/route");
    inventorySell = await import("@/app/api/inventory/[id]/sell/route");
    cbDay = await import("@/app/api/cash-book/route");
    cbSummary = await import("@/app/api/cash-book/summary/route");
    cbDayPatch = await import("@/app/api/cash-book/day/route");
    cbEntries = await import("@/app/api/cash-book/entries/route");
    cbEntry = await import("@/app/api/cash-book/entries/[id]/route");

    const [row] = await prisma.$queryRaw<{ d: string }[]>`SELECT ${cashBook.IST_TODAY}::text AS d`;
    today = row.d;
    yesterday = addDays(today, -1);
  });

  afterAll(async () => {
    if (!prisma) return;
    const ids = users.map((u) => u.id);
    // PledgeAudit is onDelete: Restrict, so it must go before the cascade.
    await prisma.pledgeAudit.deleteMany({ where: { pledge: { customer: { userId: { in: ids } } } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  });

  it("pledge create → exactly one PLEDGE_CREATED, OUT, the loan amount; backdated gets eventDate", async () => {
    const t = await tenant("create");
    as(t);
    const backdated = await createPledge(t, "25000.50", yesterday);
    const sameDay = await createPledge(t, "1000", today);

    const rows = await entriesOf(t.id);
    expect(rows).toHaveLength(2);
    const [a, b] = rows;
    expect(a).toMatchObject({ kind: "PLEDGE_CREATED", direction: "OUT", pledgeId: backdated, partyName: "रमेश कुमार", mode: "CASH" });
    expect(a.amount.toFixed(2)).toBe("25000.50");
    expect(a.originalAmount.toFixed(2)).toBe("25000.50");
    expect(a.date.toISOString().slice(0, 10)).toBe(today);
    expect(a.eventDate?.toISOString().slice(0, 10)).toBe(yesterday);
    expect(b.pledgeId).toBe(sameDay);
    expect(b.eventDate).toBeNull();
  });

  it("a failed pledge create writes no entry", async () => {
    const t = await tenant("createfail");
    as(t);
    const fd = new FormData();
    fd.set("loanAmount", "500"); fd.set("interestRate", "24"); fd.set("compoundingDuration", "YEARLY");
    fd.set("pledgeDate", today);
    fd.set("items", JSON.stringify([{ itemType: "NotAType", metalType: "GOLD", grossWeight: "1", netWeight: "1", purity: "90" }]));
    const res = await pledges.POST(
      new NextRequest(`http://test/api/customers/${t.customerId}/pledges`, { method: "POST", body: fd }),
      ctx({ customerId: t.customerId }),
    );
    expect(res.status).toBe(400);
    expect(await entriesOf(t.id)).toHaveLength(0);
    expect(await prisma.pledge.count({ where: { customerId: t.customerId } })).toBe(0);
  });

  it("single release → one PLEDGE_RELEASED, IN, the stored receivable; a second release adds nothing", async () => {
    const t = await tenant("release");
    as(t);
    const id = await createPledge(t, "10000", addDays(today, -40));
    const body = { releaseDate: new Date().toISOString(), allowCompounding: false, compoundingDuration: "YEARLY" };
    const res = await pledgeOne.PATCH(json(`/x`, "PATCH", body), ctx({ customerId: t.customerId, pledgeId: id }));
    expect(res.status).toBe(200);
    const again = await pledgeOne.PATCH(json(`/x`, "PATCH", body), ctx({ customerId: t.customerId, pledgeId: id }));
    expect(again.status).toBe(400);

    const pledge = await prisma.pledge.findUniqueOrThrow({ where: { id } });
    const released = (await entriesOf(t.id)).filter((e) => e.kind === "PLEDGE_RELEASED");
    expect(released).toHaveLength(1);
    expect(released[0].direction).toBe("IN");
    expect(released[0].amount.toFixed(2)).toBe(pledge.receivableAmount!.toFixed(2));
    expect(released[0].eventDate).toBeNull();
  });

  it("bulk release → one entry per pledge; a failure inside the transaction leaves nothing", async () => {
    const t = await tenant("bulk");
    as(t);
    const ids = [
      await createPledge(t, "1000", addDays(today, -10)),
      await createPledge(t, "2000", addDays(today, -10)),
      await createPledge(t, "3000", addDays(today, -10)),
    ];
    const req = (pledgeIds: string[]) => json(`/x`, "POST", {
      releaseDate: new Date().toISOString(),
      pledges: pledgeIds.map((id) => ({ id, allowCompounding: false, compoundingDuration: "YEARLY" })),
    });

    // Force the cash insert to fail for the 2nd pledge (unique pledgeId+kind):
    // the whole batch — status flips, audits, entries — must roll back.
    await prisma.cashEntry.create({
      data: {
        userId: t.id, date: dbDate(yesterday), direction: "IN", amount: 1, originalAmount: 1,
        kind: "PLEDGE_RELEASED", pledgeId: ids[1],
      },
    });
    const failed = await bulk.POST(req(ids), ctx({ customerId: t.customerId }));
    expect(failed.status).toBe(500);
    expect(await prisma.pledge.count({ where: { id: { in: ids }, status: "ACTIVE" } })).toBe(3);
    expect(await prisma.pledgeAudit.count({ where: { pledgeId: { in: ids } } })).toBe(0);
    expect((await entriesOf(t.id)).filter((e) => e.kind === "PLEDGE_RELEASED")).toHaveLength(1);

    await prisma.cashEntry.deleteMany({ where: { userId: t.id, kind: "PLEDGE_RELEASED" } });
    const ok = await bulk.POST(req(ids), ctx({ customerId: t.customerId }));
    expect(ok.status).toBe(200);
    const rel = (await entriesOf(t.id)).filter((e) => e.kind === "PLEDGE_RELEASED");
    expect(rel.map((e) => e.pledgeId).sort()).toEqual([...ids].sort());
    const stored = await prisma.pledge.findMany({ where: { id: { in: ids } } });
    for (const e of rel) {
      expect(e.direction).toBe("IN");
      expect(e.amount.toFixed(2)).toBe(stored.find((p) => p.id === e.pledgeId)!.receivableAmount!.toFixed(2));
    }
  });

  it("pledge sold to shop → OUT max(cost − owed, 0); a ₹0 settlement is still one entry", async () => {
    const t = await tenant("sold");
    as(t);
    const paid = await createPledge(t, "10000", addDays(today, -30));
    const zero = await createPledge(t, "10000", addDays(today, -30));
    const doSell = (pledgeId: string, buyPrice: number) =>
      sell.POST(json(`/x`, "POST", { buyPrice, saleDate: new Date().toISOString() }), ctx({ customerId: t.customerId, pledgeId }));
    expect((await doSell(paid, 50000)).status).toBe(200);
    expect((await doSell(zero, 100)).status).toBe(200);

    const sold = (await entriesOf(t.id)).filter((e) => e.kind === "PLEDGE_SOLD");
    expect(sold).toHaveLength(2);
    const p = await prisma.pledge.findUniqueOrThrow({ where: { id: paid }, include: { inventoryItem: true } });
    const ePaid = sold.find((e) => e.pledgeId === paid)!;
    expect(ePaid.direction).toBe("OUT");
    expect(ePaid.amount.toFixed(2)).toBe(new Prisma.Decimal(50000).minus(p.receivableAmount!).toFixed(2));
    expect(ePaid.inventoryItemId).toBe(p.inventoryItem!.id);
    const eZero = sold.find((e) => e.pledgeId === zero)!;
    expect(eZero.amount.toFixed(2)).toBe("0.00");

    // A sale's cash may be edited down to a ₹0 settlement (the one kind allowed 0).
    const toZero = await cbEntry.PATCH(json("/x", "PATCH", { date: today, amount: "0" }), ctx({ id: ePaid.id }));
    expect(toZero.status).toBe(200);
    expect((await prisma.cashEntry.findUniqueOrThrow({ where: { id: ePaid.id } })).amount.toFixed(2)).toBe("0.00");
  });

  it("direct purchase → INVENTORY_BOUGHT OUT; sale → INVENTORY_SOLD IN once; failed sale rolls back", async () => {
    const t = await tenant("inv");
    as(t);
    const itemA = await buyItem("7500.25");
    const itemB = await buyItem("100");

    const saleReq = (price: number) => json(`/x`, "POST", { soldPrice: price, soldAt: new Date().toISOString(), buyerName: "Asha" });
    expect((await inventorySell.POST(saleReq(9000), ctx({ id: itemA }))).status).toBe(200);
    expect((await inventorySell.POST(saleReq(9000), ctx({ id: itemA }))).status).toBe(409);

    // Pre-existing INVENTORY_SOLD for B → the sale's cash insert fails → the
    // item must still be IN_STOCK.
    await prisma.cashEntry.create({
      data: { userId: t.id, date: dbDate(yesterday), direction: "IN", amount: 1, originalAmount: 1, kind: "INVENTORY_SOLD", inventoryItemId: itemB },
    });
    expect((await inventorySell.POST(saleReq(500), ctx({ id: itemB }))).status).toBe(500);
    expect((await prisma.inventoryItem.findUniqueOrThrow({ where: { id: itemB } })).status).toBe("IN_STOCK");

    const rows = (await entriesOf(t.id)).filter((e) => e.date.toISOString().slice(0, 10) === today);
    const bought = rows.filter((e) => e.kind === "INVENTORY_BOUGHT");
    expect(bought).toHaveLength(2);
    expect(bought.find((e) => e.inventoryItemId === itemA)).toMatchObject({ direction: "OUT", partyName: "सीता देवी" });
    expect(bought.find((e) => e.inventoryItemId === itemA)!.amount.toFixed(2)).toBe("7500.25");
    const soldRows = rows.filter((e) => e.kind === "INVENTORY_SOLD");
    expect(soldRows).toHaveLength(1);
    expect(soldRows[0]).toMatchObject({ direction: "IN", partyName: "Asha", inventoryItemId: itemA });
    expect(soldRows[0].amount.toFixed(2)).toBe("9000.00");
  });

  it("transactions → REPAYMENT IN / TOPUP OUT; closed pledge and bad amounts refused with no writes", async () => {
    const t = await tenant("txn");
    as(t);
    const id = await createPledge(t, "5000", addDays(today, -5));
    const post = (body: unknown) => txns.POST(json(`/x`, "POST", body), ctx({ customerId: t.customerId, pledgeId: id }));

    expect((await post({ amount: 1200, type: "REPAYMENT_INTEREST", transactionDate: yesterday })).status).toBe(201);
    expect((await post({ amount: 300, type: "TOPUP" })).status).toBe(201);
    expect((await post({ amount: "100.555", type: "TOPUP" })).status).toBe(400);
    expect((await post({ amount: 100_000_001, type: "TOPUP" })).status).toBe(400);

    const rows = (await entriesOf(t.id)).filter((e) => e.transactionId !== null);
    expect(rows).toHaveLength(2);
    const rep = rows.find((e) => e.kind === "REPAYMENT")!;
    expect(rep.direction).toBe("IN");
    expect(rep.amount.toFixed(2)).toBe("1200.00");
    expect(rep.eventDate?.toISOString().slice(0, 10)).toBe(yesterday);
    expect(rows.find((e) => e.kind === "TOPUP")!.direction).toBe("OUT");

    // transactionDate: strict YYYY-MM-DD, not in the future, not before the
    // pledge date (5 days ago). Body must be a JSON object; note must be text.
    for (const bad of ["2026-1-5", `${today}T10:00:00.000Z`, addDays(today, 1), addDays(today, -6), "", 12345]) {
      expect((await post({ amount: 10, type: "TOPUP", transactionDate: bad })).status).toBe(400);
    }
    expect((await post({ amount: 10, type: "TOPUP", note: { text: "x" } })).status).toBe(400);
    expect((await post([{ amount: 10, type: "TOPUP" }])).status).toBe(400);
    const malformed = await txns.POST(
      new NextRequest("http://test/x", { method: "POST", headers: { "content-type": "application/json" }, body: "{not json" }),
      ctx({ customerId: t.customerId, pledgeId: id }),
    );
    expect(malformed.status).toBe(400);
    expect(await prisma.transaction.count({ where: { pledgeId: id } })).toBe(2);
    // The pledge's own day is allowed.
    expect((await post({ amount: 10, type: "TOPUP", transactionDate: addDays(today, -5), note: "  given  " })).status).toBe(201);
    const onPledgeDay = await prisma.transaction.findFirstOrThrow({ where: { pledgeId: id, amount: 10 } });
    expect(onPledgeDay.createdAt.toISOString()).toBe(`${addDays(today, -5)}T00:00:00.000Z`);
    expect(onPledgeDay.note).toBe("given");

    await prisma.pledge.update({ where: { id }, data: { status: "RELEASED" } });
    expect((await post({ amount: 50, type: "REPAYMENT_PRINCIPAL" })).status).toBe(409);
    expect(await prisma.transaction.count({ where: { pledgeId: id } })).toBe(3);
    expect((await entriesOf(t.id)).filter((e) => e.transactionId !== null)).toHaveLength(3);
  });

  it("overlapping bulk releases in opposite order: one wins, the other gets 409 — never a deadlock", async () => {
    const t = await tenant("bulkrace");
    as(t);
    const req = (ids: string[]) => json(`/x`, "POST", {
      releaseDate: new Date().toISOString(),
      pledges: ids.map((id) => ({ id, allowCompounding: false, compoundingDuration: "YEARLY" })),
    });
    for (let round = 0; round < 3; round++) {
      const ids = [
        await createPledge(t, "1000", addDays(today, -10)),
        await createPledge(t, "2000", addDays(today, -10)),
        await createPledge(t, "3000", addDays(today, -10)),
      ];
      const results = await Promise.all([
        bulk.POST(req(ids), ctx({ customerId: t.customerId })),
        bulk.POST(req([...ids].reverse()), ctx({ customerId: t.customerId })),
      ]);
      expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
      const released = (await entriesOf(t.id)).filter((e) => e.kind === "PLEDGE_RELEASED" && ids.includes(e.pledgeId!));
      expect(released).toHaveLength(3);
      expect(await prisma.pledgeAudit.count({ where: { pledgeId: { in: ids } } })).toBe(3);
    }
  });

  it("writes aimed at a past day are refused (409) and change nothing", async () => {
    const t = await tenant("past");
    as(t);
    await prisma.cashDay.create({ data: { userId: t.id, date: dbDate(yesterday), openingOverride: 100 } });
    const old = await prisma.cashEntry.create({
      data: { userId: t.id, date: dbDate(yesterday), direction: "IN", amount: 50, originalAmount: 50, kind: "MANUAL" },
    });

    const add = await cbEntries.POST(json("/x", "POST", { date: yesterday, direction: "IN", amount: "10" }));
    expect(add.status).toBe(409);
    const edit = await cbEntry.PATCH(json("/x", "PATCH", { date: today, amount: "60" }), ctx({ id: old.id }));
    expect(edit.status).toBe(409);
    const editStale = await cbEntry.PATCH(json("/x", "PATCH", { date: yesterday, mode: "UPI" }), ctx({ id: old.id }));
    expect(editStale.status).toBe(409);
    const del = await cbEntry.DELETE(new NextRequest(`http://test/x?date=${yesterday}`, { method: "DELETE" }), ctx({ id: old.id }));
    expect(del.status).toBe(409);
    const day = await cbDayPatch.PATCH(json("/x", "PATCH", { date: yesterday, countedCash: "5" }));
    expect(day.status).toBe(409);

    const after = await prisma.cashEntry.findUniqueOrThrow({ where: { id: old.id } });
    expect(after.amount.toFixed(2)).toBe("50.00");
    expect(after.mode).toBe("CASH");
    expect(await prisma.cashEntry.count({ where: { userId: t.id } })).toBe(1);
    expect((await prisma.cashDay.findFirstOrThrow({ where: { userId: t.id, date: dbDate(yesterday) } })).countedCash).toBeNull();
    // The past day reads fine and says it is not today.
    const view = await getDay(yesterday);
    expect(view.status).toBe(200);
    expect(view.body.day.isToday).toBe(false);
    expect(view.body.entries[0]).toMatchObject({ editable: false, deletable: false });
    expect((await getDay(addDays(today, 1))).status).toBe(400);
  });

  it("midnight IST: 23:59:59 belongs to the earlier day, 00:00 to the next; eventDate follows", async () => {
    // The exact expression every write uses to decide the recorded day.
    const ist = (iso: string) => cashBook.istDateOf(Prisma.sql`${iso}::timestamptz`);
    const [r] = await prisma.$queryRaw<{ before: string; at: string; after: string }[]>`
      SELECT
        ${ist("2026-10-31T18:29:59.999Z")}::text AS before,
        ${ist("2026-10-31T18:30:00.000Z")}::text AS at,
        ${ist("2026-10-31T18:31:00.000Z")}::text AS after`;
    expect(r).toMatchObject({ before: "2026-10-31", at: "2026-11-01", after: "2026-11-01" });

    const t = await tenant("midnight");
    const lastMinuteYesterday = new Date(`${yesterday}T23:59:00.000+05:30`);
    const firstMinuteToday = new Date(`${today}T00:01:00.000+05:30`);
    await prisma.$transaction((tx) => cashBook.recordCashEntries(tx, t.id, [
      { kind: "MANUAL", direction: "IN", amount: "1.00", eventAt: lastMinuteYesterday },
      { kind: "MANUAL", direction: "IN", amount: "2.00", eventAt: firstMinuteToday },
    ]));
    const rows = await entriesOf(t.id);
    const one = rows.find((e) => e.amount.toFixed(2) === "1.00")!;
    const two = rows.find((e) => e.amount.toFixed(2) === "2.00")!;
    expect(one.eventDate?.toISOString().slice(0, 10)).toBe(yesterday);
    expect(two.eventDate).toBeNull();
    expect(one.date.toISOString().slice(0, 10)).toBe(today);
  });

  it("concurrent writes to the same day: every entry lands, one day row", async () => {
    const t = await tenant("concurrent");
    as(t);
    const results = await Promise.all([
      ...Array.from({ length: 12 }, (_, i) =>
        cbEntries.POST(json("/x", "POST", { date: today, direction: i % 2 ? "IN" : "OUT", amount: `${i + 1}` }))),
      cbDayPatch.PATCH(json("/x", "PATCH", { date: today, countedCash: "999" })),
      cbDayPatch.PATCH(json("/x", "PATCH", { date: today, openingCash: "500" })),
    ]);
    expect(results.map((r) => r.status)).toEqual([...Array(12).fill(201), 200, 200]);
    expect(await prisma.cashEntry.count({ where: { userId: t.id } })).toBe(12);
    const days = await prisma.cashDay.findMany({ where: { userId: t.id } });
    expect(days).toHaveLength(1);
    expect(days[0].countedCash?.toFixed(2)).toBe("999.00");
    expect(days[0].openingOverride?.toFixed(2)).toBe("500.00");
  });

  it("editing an automatic entry keeps the original; it can't be deleted; mode toggles", async () => {
    const t = await tenant("edit");
    as(t);
    await createPledge(t, "8000", today);
    const [entry] = await entriesOf(t.id);

    const toggle = await cbEntry.PATCH(json("/x", "PATCH", { date: today, mode: "UPI" }), ctx({ id: entry.id }));
    expect(toggle.status).toBe(200);
    let row = await prisma.cashEntry.findUniqueOrThrow({ where: { id: entry.id } });
    expect(row.mode).toBe("UPI");
    expect(row.editedAt).toBeNull();

    const edit = await cbEntry.PATCH(json("/x", "PATCH", { date: today, amount: "7999.50", note: "counted short" }), ctx({ id: entry.id }));
    expect(edit.status).toBe(200);
    row = await prisma.cashEntry.findUniqueOrThrow({ where: { id: entry.id } });
    expect(row.amount.toFixed(2)).toBe("7999.50");
    expect(row.originalAmount.toFixed(2)).toBe("8000.00");
    expect(row.editedAt).not.toBeNull();

    // Only a pledge sold to the shop may be ₹0; a loan entry stays > 0 — route and SQL.
    expect((await cbEntry.PATCH(json("/x", "PATCH", { date: today, amount: "0" }), ctx({ id: entry.id }))).status).toBe(400);
    expect(await cashBook.editCashEntry(prisma, t.id, entry.id, today, { amount: "0.00" })).toBe(false);
    expect((await prisma.cashEntry.findUniqueOrThrow({ where: { id: entry.id } })).amount.toFixed(2)).toBe("7999.50");

    expect((await cbEntry.PATCH(json("/x", "PATCH", { date: today, direction: "IN" }), ctx({ id: entry.id }))).status).toBe(400);
    const del = await cbEntry.DELETE(new NextRequest(`http://test/x?date=${today}`, { method: "DELETE" }), ctx({ id: entry.id }));
    expect(del.status).toBe(409);
    expect(await prisma.cashEntry.count({ where: { id: entry.id } })).toBe(1);

    const { body } = await getDay();
    expect(body.entries[0]).toMatchObject({ amountEdited: true, originalAmount: "8000.00", amount: "7999.50", mode: "UPI" });
  });

  it("manual entries: validated, editable, deletable today", async () => {
    const t = await tenant("manual");
    as(t);
    const post = (body: object) => cbEntries.POST(json("/x", "POST", { date: today, ...body }));
    expect((await post({ direction: "IN", amount: "0" })).status).toBe(400);
    expect((await post({ direction: "IN", amount: "1.234" })).status).toBe(400);
    expect((await post({ direction: "IN", amount: "100000000.01" })).status).toBe(400);
    expect((await post({ direction: "SIDEWAYS", amount: "1" })).status).toBe(400);
    expect((await post({ direction: "IN", amount: "1", mode: "CARD" })).status).toBe(400);
    expect((await post({ direction: "IN", amount: "1", note: "x".repeat(501) })).status).toBe(400);
    expect(await prisma.cashEntry.count({ where: { userId: t.id } })).toBe(0);

    const res = await post({ direction: "OUT", amount: "250.75", mode: "CASH", note: "chai" });
    expect(res.status).toBe(201);
    const { id } = await res.json();
    const flip = await cbEntry.PATCH(json("/x", "PATCH", { date: today, direction: "IN" }), ctx({ id }));
    expect(flip.status).toBe(200);
    expect((await prisma.cashEntry.findUniqueOrThrow({ where: { id } })).direction).toBe("IN");
    const del = await cbEntry.DELETE(new NextRequest(`http://test/x?date=${today}`, { method: "DELETE" }), ctx({ id }));
    expect(del.status).toBe(200);
    expect(await prisma.cashEntry.count({ where: { userId: t.id } })).toBe(0);
  });

  it("deleting an active pledge keeps its entries and writes one opposite REVERSAL each", async () => {
    const t = await tenant("delete");
    as(t);
    const id = await createPledge(t, "6000", addDays(today, -3));
    const post = (body: unknown) => txns.POST(json(`/x`, "POST", body), ctx({ customerId: t.customerId, pledgeId: id }));
    expect((await post({ amount: 500, type: "REPAYMENT_PRINCIPAL" })).status).toBe(201);
    expect((await post({ amount: 200, type: "TOPUP" })).status).toBe(201);

    const del = await pledgeOne.DELETE(
      new NextRequest(`http://test/x?confirmDelete=true`, { method: "DELETE" }),
      ctx({ customerId: t.customerId, pledgeId: id }),
    );
    expect(del.status).toBe(200);
    expect(await prisma.pledge.count({ where: { id } })).toBe(0);

    const rows = await entriesOf(t.id);
    const originals = rows.filter((e) => e.kind !== "REVERSAL");
    const reversals = rows.filter((e) => e.kind === "REVERSAL");
    expect(originals).toHaveLength(3);
    expect(reversals).toHaveLength(3);
    for (const o of originals) {
      expect(o.pledgeId).toBeNull();
      expect(o.transactionId).toBeNull();
      expect(o.partyName).toBe("रमेश कुमार");
      const r = reversals.find((x) => x.reversesEntryId === o.id)!;
      expect(r.direction).toBe(o.direction === "IN" ? "OUT" : "IN");
      expect(r.amount.toFixed(2)).toBe(o.amount.toFixed(2));
    }
    const { body } = await getDay();
    expect(body.day.cashIn).toBe(body.day.cashOut);
    const blocked = await cbEntry.PATCH(json("/x", "PATCH", { date: today, amount: "1" }), ctx({ id: originals[0].id }));
    expect(blocked.status).toBe(409);
    expect((await blocked.json()).error).toBe("ENTRY_REVERSED");
    const rev = await cbEntry.PATCH(json("/x", "PATCH", { date: today, amount: "1" }), ctx({ id: reversals[0].id }));
    expect(rev.status).toBe(400);

    // A reversal's mode is fixed too — route and SQL; only its note changes.
    const revMode = await cbEntry.PATCH(json("/x", "PATCH", { date: today, mode: "UPI" }), ctx({ id: reversals[0].id }));
    expect(revMode.status).toBe(400);
    expect(await cashBook.editCashEntry(prisma, t.id, reversals[0].id, today, { mode: "UPI" })).toBe(false);
    const revNote = await cbEntry.PATCH(json("/x", "PATCH", { date: today, note: "entered twice" }), ctx({ id: reversals[0].id }));
    expect(revNote.status).toBe(200);
    const revRow = await prisma.cashEntry.findUniqueOrThrow({ where: { id: reversals[0].id } });
    expect(revRow).toMatchObject({ mode: "CASH", note: "entered twice" });
  });

  it("pledge-delete reversal lookup uses the unique indexes, not a scan of the shop's entries", async () => {
    const t = await tenant("explain");
    // EXPLAIN only plans the INSERT; nothing runs. Seq scans are discouraged
    // so the tiny test tables still show which indexes the query can use.
    const plan = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SET LOCAL enable_seqscan = off`;
      return tx.$queryRaw<{ "QUERY PLAN": string }[]>(
        Prisma.sql`EXPLAIN (COSTS OFF) ${cashBook.reversePledgeEntriesSql(t.id, "no-such-pledge")}`,
      );
    });
    const text = plan.map((r) => r["QUERY PLAN"]).join("\n");
    expect(text).toContain('"cash_entries_pledgeId_kind_key"');
    expect(text).toContain('"cash_entries_transactionId_key"');
    expect(text).not.toContain("cash_entries_userId_date_createdAt_idx");
  });

  it("opening: first day unset; carries counted cash, else expected (CASH only); edit shows difference", async () => {
    // First day ever.
    const first = await tenant("open1");
    as(first);
    let v = await getDay();
    expect(v.body.day).toMatchObject({ carriedOpening: null, opening: null, expected: null });

    // Last active day (2 days ago, nobody counted): 1000 + 500 cash in − 200 cash out; UPI ignored.
    const seed = async (userId: string, counted: number | null) => {
      const d = dbDate(addDays(today, -2));
      await prisma.cashDay.create({ data: { userId, date: d, openingOverride: 1000, countedCash: counted } });
      await prisma.cashEntry.createMany({
        data: [
          { userId, date: d, direction: "IN", amount: 500, originalAmount: 500, kind: "MANUAL" },
          { userId, date: d, direction: "IN", amount: 300, originalAmount: 300, kind: "MANUAL", mode: "UPI" },
          { userId, date: d, direction: "OUT", amount: 200, originalAmount: 200, kind: "MANUAL" },
        ],
      });
    };
    const expected = await tenant("open2");
    await seed(expected.id, null);
    as(expected);
    v = await getDay();
    expect(v.body.day).toMatchObject({ carriedOpening: "1300.00", opening: "1300.00", openingEdited: false });

    // Writing today creates today's row; the carried value is still worked out the same.
    expect((await cbEntries.POST(json("/x", "POST", { date: today, direction: "OUT", amount: "2000" }))).status).toBe(201);
    v = await getDay();
    expect(v.body.day).toMatchObject({ carriedOpening: "1300.00", expected: "-700.00", negativeDrawer: true });

    // Owner edit: kept apart, difference shown; null clears it.
    expect((await cbDayPatch.PATCH(json("/x", "PATCH", { date: today, openingCash: "1400" }))).status).toBe(200);
    v = await getDay();
    expect(v.body.day).toMatchObject({ opening: "1400.00", carriedOpening: "1300.00", openingEdited: true, openingDifference: "100.00" });
    expect((await cbDayPatch.PATCH(json("/x", "PATCH", { date: today, openingCash: null }))).status).toBe(200);
    expect((await getDay()).body.day.opening).toBe("1300.00");

    // Counted cash wins over expected.
    const counted = await tenant("open3");
    await seed(counted.id, 1250);
    as(counted);
    expect((await getDay()).body.day.opening).toBe("1250.00");

    // Count drawer: expected vs counted.
    expect((await cbDayPatch.PATCH(json("/x", "PATCH", { date: today, countedCash: "1240" }))).status).toBe(200);
    const s = await cbSummary.GET();
    expect((await s.json()).day).toMatchObject({ expected: "1250.00", countedCash: "1240.00", countDifference: "-10.00" });
  });

  it("carried opening is worked out on read: chains across days; a late entry on yesterday still carries", async () => {
    // 3 days ago: owner-set opening 1000, +500 cash, +300 UPI (ignored).
    // 2 days ago: a row with no opening and no count, −200 cash. Yesterday: nothing yet.
    const t = await tenant("carry");
    as(t);
    const d3 = dbDate(addDays(today, -3));
    const d2 = dbDate(addDays(today, -2));
    await prisma.cashDay.createMany({ data: [{ userId: t.id, date: d3, openingOverride: 1000 }, { userId: t.id, date: d2 }] });
    await prisma.cashEntry.createMany({
      data: [
        { userId: t.id, date: d3, direction: "IN", amount: 500, originalAmount: 500, kind: "MANUAL" },
        { userId: t.id, date: d3, direction: "IN", amount: 300, originalAmount: 300, kind: "MANUAL", mode: "UPI" },
        { userId: t.id, date: d2, direction: "OUT", amount: 200, originalAmount: 200, kind: "MANUAL" },
      ],
    });
    expect((await getDay(addDays(today, -2))).body.day.carriedOpening).toBe("1500.00");
    expect((await getDay()).body.day.carriedOpening).toBe("1300.00");

    // Today's first write creates today's row. Then a transaction that began
    // before midnight commits an entry onto yesterday: it must still carry.
    expect((await cbEntries.POST(json("/x", "POST", { date: today, direction: "IN", amount: "50" }))).status).toBe(201);
    await prisma.cashDay.create({ data: { userId: t.id, date: dbDate(yesterday) } });
    await prisma.cashEntry.create({
      data: { userId: t.id, date: dbDate(yesterday), direction: "IN", amount: 70, originalAmount: 70, kind: "MANUAL" },
    });
    expect((await getDay()).body.day).toMatchObject({ carriedOpening: "1370.00", opening: "1370.00", expected: "1420.00" });

    // A count on yesterday becomes the anchor: what it counted carries, its own entries don't add again.
    await prisma.cashDay.update({ where: { userId_date: { userId: t.id, date: dbDate(yesterday) } }, data: { countedCash: 1000 } });
    expect((await getDay()).body.day.carriedOpening).toBe("1000.00");
  });

  it("tenant isolation: another shop sees none of it and can't touch it", async () => {
    const a = await tenant("isoA");
    const b = await tenant("isoB");
    as(a);
    const pledgeId = await createPledge(a, "4000", addDays(today, -2));
    const [entry] = await entriesOf(a.id);

    as(b);
    const view = await getDay();
    expect(view.body.entries).toHaveLength(0);
    expect(view.body.day.entryCount).toBe(0);
    expect((await cbEntry.PATCH(json("/x", "PATCH", { date: today, amount: "1" }), ctx({ id: entry.id }))).status).toBe(404);
    expect((await cbEntry.DELETE(new NextRequest(`http://test/x?date=${today}`, { method: "DELETE" }), ctx({ id: entry.id }))).status).toBe(404);
    const rel = await pledgeOne.PATCH(
      json(`/x`, "PATCH", { releaseDate: new Date().toISOString() }),
      ctx({ customerId: a.customerId, pledgeId }),
    );
    expect(rel.status).toBe(404);
    expect(await prisma.cashEntry.count({ where: { userId: b.id } })).toBe(0);
    const untouched = await prisma.cashEntry.findUniqueOrThrow({ where: { id: entry.id } });
    expect(untouched.amount.toFixed(2)).toBe("4000.00");
  });
});
