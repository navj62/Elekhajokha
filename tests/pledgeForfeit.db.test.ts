// Bulk forfeit (POST /api/ltv/forfeit + preflight) — end-to-end against the
// DEV database: real routes, real locks, real cash-book SQL. Only Clerk's
// auth() is mocked.
//
// Opt-in like tests/cashBook.db.test.ts: skipped unless CASHBOOK_DB_TESTS=1
// (`npm run test:db`). Guarded by assertDbTarget: refuses anything but a dev
// host. Every row hangs off throwaway `fftest_` users, deleted at the end.
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
let pledges: any, pledgeOne: any, bulk: any, sell: any, forfeit: any, preflight: any;
/* eslint-enable @typescript-eslint/no-explicit-any */

const RUN_TAG = `fftest_${Date.now().toString(36)}`;
const users: { id: string; clerkUserId: string }[] = [];

const daysAgo = (n: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
};
const ctx = <T extends object>(params: T) => ({ params: Promise.resolve(params) });
const json = (body: unknown, method = "POST") =>
  new NextRequest("http://test/x", {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

type Tenant = { id: string; clerkUserId: string; customerIds: string[] };

async function tenant(tag: string): Promise<Tenant> {
  const clerkUserId = `${RUN_TAG}_${tag}`;
  const user = await prisma.user.create({
    data: { clerkUserId, username: clerkUserId },
    select: { id: true, clerkUserId: true },
  });
  users.push(user);
  const customerIds: string[] = [];
  for (const name of ["रमेश कुमार", "सीता देवी"]) {
    const c = await prisma.customer.create({
      data: { userId: user.id, name, region: "Test", address: "Test" },
      select: { id: true },
    });
    customerIds.push(c.id);
  }
  return { ...user, customerIds };
}
const as = (u: { clerkUserId: string }) => { session.clerkUserId = u.clerkUserId; };

const ONE_RING = [
  { itemType: "Ring", itemName: "Gold ring", metalType: "GOLD", grossWeight: "10", netWeight: "9", purity: "91.6" },
];

async function createPledge(customerId: string, loanAmount: string, pledgeDate = daysAgo(60), items: object[] = ONE_RING) {
  const fd = new FormData();
  fd.set("loanAmount", loanAmount);
  fd.set("interestRate", "24");
  fd.set("compoundingDuration", "YEARLY");
  fd.set("pledgeDate", pledgeDate);
  fd.set("items", JSON.stringify(items));
  const res = await pledges.POST(
    new NextRequest(`http://test/api/customers/${customerId}/pledges`, { method: "POST", body: fd }),
    ctx({ customerId }),
  );
  expect(res.status).toBe(201);
  return (await res.json()).id as string;
}

const doForfeit = (items: { pledgeId: string; buyPrice?: number }[]) => forfeit.POST(json({ items }));
const doPreflight = (items: { pledgeId: string; buyPrice?: number }[]) => preflight.POST(json({ items }));

async function owedNow(ids: string[]): Promise<Record<string, number>> {
  const res = await doPreflight(ids.map((pledgeId) => ({ pledgeId })));
  expect(res.status).toBe(200);
  const body = await res.json();
  return Object.fromEntries(body.pledges.map((p: { pledgeId: string; owed: number }) => [p.pledgeId, p.owed]));
}

/** Asserts nothing of a forfeit was written for these pledges. */
async function expectUntouched(ids: string[]) {
  const rows = await prisma.pledge.findMany({ where: { id: { in: ids } }, select: { status: true } });
  expect(rows.every((r) => r.status === "ACTIVE")).toBe(true);
  expect(await prisma.inventoryItem.count({ where: { sourcePledgeId: { in: ids } } })).toBe(0);
  expect(await prisma.pledgeAudit.count({ where: { pledgeId: { in: ids } } })).toBe(0);
  expect(await prisma.cashEntry.count({ where: { pledgeId: { in: ids }, kind: "PLEDGE_SOLD" } })).toBe(0);
}

describe.skipIf(!RUN)("bulk forfeit (dev DB)", { timeout: 180_000 }, () => {
  beforeAll(async () => {
    await import("dotenv/config");
    const { assertDbTarget } = await import("@/lib/dbGuard");
    assertDbTarget(process.env.DATABASE_URL, "tests/pledgeForfeit.db.test.ts");

    prisma    = (await import("@/lib/prisma")).prisma;
    pledges   = await import("@/app/api/customers/[customerId]/pledges/route");
    pledgeOne = await import("@/app/api/customers/[customerId]/pledges/[pledgeId]/route");
    bulk      = await import("@/app/api/customers/[customerId]/pledges/bulk-release/route");
    sell      = await import("@/app/api/customers/[customerId]/pledges/[pledgeId]/sell/route");
    forfeit   = await import("@/app/api/ltv/forfeit/route");
    preflight = await import("@/app/api/ltv/forfeit/preflight/route");
  });

  afterAll(async () => {
    if (!prisma) return;
    const ids = users.map((u) => u.id);
    // PledgeAudit is onDelete: Restrict, so it must go before the cascade.
    await prisma.pledgeAudit.deleteMany({ where: { pledge: { customer: { userId: { in: ids } } } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  });

  it("happy path across two customers, prices omitted → SOLD, cost = owed, X = 0, one ₹0 entry each", async () => {
    const t = await tenant("happy");
    as(t);
    const a = await createPledge(t.customerIds[0], "10000");
    const b = await createPledge(t.customerIds[1], "25000.50");
    const owed = await owedNow([a, b]);

    const pre = await (await doPreflight([{ pledgeId: a }, { pledgeId: b }])).json();
    expect(pre.totals).toMatchObject({ count: 2, writtenOff: 0 });
    expect(pre.totals.totalOwed).toBeCloseTo(owed[a] + owed[b], 2);
    expect(pre.pledges[0]).toHaveProperty("itemSummary", "Gold ring");
    expect(await prisma.pledge.count({ where: { id: { in: [a, b] }, status: "SOLD" } })).toBe(0);

    const res = await doForfeit([{ pledgeId: b }, { pledgeId: a }]);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ success: true, count: 2, writtenOff: 0 });
    expect(body.totalOwed).toBeCloseTo(owed[a] + owed[b], 2);
    expect(body.totalCost).toBeCloseTo(body.totalOwed, 2);

    for (const id of [a, b]) {
      const p = await prisma.pledge.findUniqueOrThrow({ where: { id }, include: { inventoryItem: true, pledgeAudits: true } });
      expect(p.status).toBe("SOLD");
      expect(p.salePrice!.toFixed(2)).toBe(p.receivableAmount!.toFixed(2));
      expect(p.inventoryItem!.acquiredCost.toFixed(2)).toBe(p.receivableAmount!.toFixed(2));
      expect(p.inventoryItem!.amountOwedAt!.toFixed(2)).toBe(p.receivableAmount!.toFixed(2));
      expect(p.inventoryItem!).toMatchObject({ sourceType: "PLEDGE_SALE", status: "IN_STOCK", ownerId: t.id, description: "Gold ring" });
      expect(p.pledgeAudits).toHaveLength(1);
      expect(p.pledgeAudits[0].action).toBe("SOLD");
      expect(p.pledgeAudits[0].receivableAmount!.toFixed(2)).toBe(p.receivableAmount!.toFixed(2));
    }
    const entries = await prisma.cashEntry.findMany({ where: { userId: t.id, kind: "PLEDGE_SOLD" } });
    expect(entries).toHaveLength(2);
    for (const e of entries) {
      expect(e.direction).toBe("OUT");
      expect(e.amount.toFixed(2)).toBe("0.00");
      expect(e.inventoryItemId).not.toBeNull();
    }
    expect(new Set(entries.map((e) => e.customerId))).toEqual(new Set(t.customerIds));
  });

  it("writes exactly what single sell writes at the same price", async () => {
    const t = await tenant("parity");
    as(t);
    const viaSell    = await createPledge(t.customerIds[0], "40000");
    const viaForfeit = await createPledge(t.customerIds[0], "40000");
    const owed = await owedNow([viaSell]);

    const s = await sell.POST(
      json({ buyPrice: owed[viaSell], saleDate: new Date().toISOString() }),
      ctx({ customerId: t.customerIds[0], pledgeId: viaSell }),
    );
    expect(s.status).toBe(200);
    expect((await doForfeit([{ pledgeId: viaForfeit }])).status).toBe(200);

    const load = (id: string) => prisma.pledge.findUniqueOrThrow({
      where: { id }, include: { inventoryItem: { include: { cashEntries: true } }, pledgeAudits: true },
    });
    const [x, y] = await Promise.all([load(viaSell), load(viaForfeit)]);

    // Strip ids, links and timestamps; everything else must be identical.
    const strip = (o: Record<string, unknown>, drop: string[]) =>
      JSON.parse(JSON.stringify(Object.fromEntries(Object.entries(o).filter(([k]) => !drop.includes(k)))));
    const P_DROP   = ["id", "createdAt", "updatedAt", "releaseDate", "inventoryItem", "pledgeAudits"];
    const A_DROP   = ["id", "pledgeId", "createdAt", "releaseDate"];
    const I_DROP   = ["id", "sourcePledgeId", "createdAt", "updatedAt", "acquiredAt", "cashEntries"];
    const C_DROP   = ["id", "pledgeId", "inventoryItemId", "createdAt", "updatedAt", "eventDate"];
    expect(strip(y, P_DROP)).toEqual(strip(x, P_DROP));
    expect(strip(y.pledgeAudits[0], A_DROP)).toEqual(strip(x.pledgeAudits[0], A_DROP));
    expect(strip(y.inventoryItem!, I_DROP)).toEqual(strip(x.inventoryItem!, I_DROP));
    expect(y.inventoryItem!.cashEntries).toHaveLength(1);
    expect(strip(y.inventoryItem!.cashEntries[0], C_DROP)).toEqual(strip(x.inventoryItem!.cashEntries[0], C_DROP));
  });

  it("a price edited below owed → cost = edited, X = the difference, cash entry still ₹0", async () => {
    const t = await tenant("edited");
    as(t);
    const a = await createPledge(t.customerIds[0], "10000");
    const b = await createPledge(t.customerIds[1], "20000");
    const owed = await owedNow([a, b]);
    const edited = Math.round((owed[a] - 1234.56) * 100) / 100;

    const pre = await (await doPreflight([{ pledgeId: a, buyPrice: edited }, { pledgeId: b }])).json();
    expect(pre.totals.writtenOff).toBeCloseTo(1234.56, 2);

    const res = await doForfeit([{ pledgeId: a, buyPrice: edited }, { pledgeId: b }]);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.writtenOff).toBeCloseTo(1234.56, 2);
    expect(body.totalCost).toBeCloseTo(body.totalOwed - 1234.56, 2);

    const inv = await prisma.inventoryItem.findUniqueOrThrow({ where: { sourcePledgeId: a } });
    expect(inv.acquiredCost.toFixed(2)).toBe(new Prisma.Decimal(edited).toFixed(2));
    expect(inv.amountOwedAt!.toFixed(2)).toBe(new Prisma.Decimal(owed[a]).toFixed(2));
    const e = await prisma.cashEntry.findFirstOrThrow({ where: { pledgeId: a, kind: "PLEDGE_SOLD" } });
    expect(e.amount.toFixed(2)).toBe("0.00");
  });

  it("a price of exactly the amount owed is accepted; ₹0 is accepted", async () => {
    const t = await tenant("exact");
    as(t);
    const a = await createPledge(t.customerIds[0], "10000");
    const b = await createPledge(t.customerIds[0], "5000");
    const owed = await owedNow([a]);
    const res = await doForfeit([{ pledgeId: a, buyPrice: owed[a] }, { pledgeId: b, buyPrice: 0 }]);
    expect(res.status).toBe(200);
    expect((await prisma.inventoryItem.findUniqueOrThrow({ where: { sourcePledgeId: a } })).acquiredCost.toFixed(2))
      .toBe(new Prisma.Decimal(owed[a]).toFixed(2));
    expect((await prisma.inventoryItem.findUniqueOrThrow({ where: { sourcePledgeId: b } })).acquiredCost.toFixed(2)).toBe("0.00");
  });

  it("a price above owed → 409 BUY_PRICE_ABOVE_OWED with each one's owed; nothing written", async () => {
    const t = await tenant("above");
    as(t);
    const a = await createPledge(t.customerIds[0], "10000");
    const b = await createPledge(t.customerIds[1], "10000");
    const owed = await owedNow([a]);
    const res = await doForfeit([{ pledgeId: a, buyPrice: owed[a] + 0.01 }, { pledgeId: b }]);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body).toMatchObject({ error: "BUY_PRICE_ABOVE_OWED", offendingIds: [a], owed: [{ pledgeId: a, owed: owed[a] }] });
    await expectUntouched([a, b]);

    const pre = await doPreflight([{ pledgeId: a, buyPrice: owed[a] + 0.01 }]);
    expect(pre.status).toBe(409);
  });

  it("bad bodies → 400: negative, 3 dp, non-number, duplicates, empty, 101 items, not JSON", async () => {
    const t = await tenant("bad");
    as(t);
    const a = await createPledge(t.customerIds[0], "10000");
    const cases: unknown[] = [
      { items: [{ pledgeId: a, buyPrice: -1 }] },
      { items: [{ pledgeId: a, buyPrice: 100.123 }] },
      { items: [{ pledgeId: a, buyPrice: "100" }] },
      { items: [{ pledgeId: a }, { pledgeId: a }] },
      { items: [] },
      { items: Array.from({ length: 101 }, (_, i) => ({ pledgeId: `p${i}` })) },
      { pledges: [a] },
      null,
    ];
    for (const body of cases) {
      const res = await forfeit.POST(json(body));
      expect(res.status, JSON.stringify(body)?.slice(0, 80)).toBe(400);
      expect((await res.json()).error).toBe("VALIDATION");
      expect((await preflight.POST(json(body))).status).toBe(400);
    }
    const notJson = await forfeit.POST(new NextRequest("http://test/x", { method: "POST", body: "{nope" }));
    expect(notJson.status).toBe(400);
    await expectUntouched([a]);
  });

  it("100 items is within the limit (validated, then refused only as NOT_OWNED)", async () => {
    const t = await tenant("hundred");
    as(t);
    const res = await doForfeit(Array.from({ length: 100 }, (_, i) => ({ pledgeId: `missing_${i}` })));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("NOT_OWNED");
  });

  it("one pledge already released → 409 NOT_OPEN with that id; nothing written", async () => {
    const t = await tenant("closed");
    as(t);
    const open     = await createPledge(t.customerIds[0], "10000");
    const released = await createPledge(t.customerIds[1], "10000");
    const rel = await pledgeOne.PATCH(
      json({ releaseDate: new Date().toISOString(), allowCompounding: false, compoundingDuration: "YEARLY" }, "PATCH"),
      ctx({ customerId: t.customerIds[1], pledgeId: released }),
    );
    expect(rel.status).toBe(200);

    const res = await doForfeit([{ pledgeId: open }, { pledgeId: released }]);
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ error: "NOT_OPEN", offendingIds: [released] });
    await expectUntouched([open]);
    expect(await prisma.pledgeAudit.count({ where: { pledgeId: released } })).toBe(1); // its RELEASED row only
  });

  it("another shop's pledge → 409 NOT_OWNED, same answer as a missing id; nothing written", async () => {
    const mine  = await tenant("mine");
    const other = await tenant("other");
    as(other);
    const theirs = await createPledge(other.customerIds[0], "10000");
    as(mine);
    const own = await createPledge(mine.customerIds[0], "10000");

    const res = await doForfeit([{ pledgeId: own }, { pledgeId: theirs }]);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body).toMatchObject({ error: "NOT_OWNED", offendingIds: [theirs] });

    const missing = await doForfeit([{ pledgeId: own }, { pledgeId: "does-not-exist" }]);
    const missingBody = await missing.json();
    expect(missing.status).toBe(409);
    expect(Object.keys(missingBody).sort()).toEqual(Object.keys(body).sort());
    expect(missingBody.message).toBe(body.message);

    expect((await doPreflight([{ pledgeId: theirs }])).status).toBe(409);
    await expectUntouched([own, theirs]);
  });

  it("a future pledge date → 409 FUTURE_PLEDGE_DATE; nothing written", async () => {
    const t = await tenant("future");
    as(t);
    const ok     = await createPledge(t.customerIds[0], "10000");
    const future = await createPledge(t.customerIds[0], "10000", daysAgo(-5));
    const res = await doForfeit([{ pledgeId: ok }, { pledgeId: future }]);
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ error: "FUTURE_PLEDGE_DATE", offendingIds: [future] });
    await expectUntouched([ok, future]);
  });

  it("concurrent release vs forfeit on the same pledge → exactly one succeeds", async () => {
    const t = await tenant("race");
    as(t);
    for (let round = 0; round < 3; round++) {
      const id = await createPledge(t.customerIds[0], "10000");
      const [rel, ff] = await Promise.all([
        pledgeOne.PATCH(
          json({ releaseDate: new Date().toISOString(), allowCompounding: false, compoundingDuration: "YEARLY" }, "PATCH"),
          ctx({ customerId: t.customerIds[0], pledgeId: id }),
        ),
        doForfeit([{ pledgeId: id }]),
      ]);
      expect([rel.status, ff.status].filter((s) => s === 200)).toHaveLength(1);
      if (ff.status !== 200) expect((await ff.json()).error).toBe("NOT_OPEN");

      const p = await prisma.pledge.findUniqueOrThrow({ where: { id } });
      const audits = await prisma.pledgeAudit.findMany({ where: { pledgeId: id } });
      expect(audits).toHaveLength(1);
      expect(p.status).toBe(rel.status === 200 ? "RELEASED" : "SOLD");
      expect(audits[0].action).toBe(p.status);
      expect(await prisma.inventoryItem.count({ where: { sourcePledgeId: id } })).toBe(p.status === "SOLD" ? 1 : 0);
      const closing = await prisma.cashEntry.findMany({ where: { pledgeId: id, kind: { in: ["PLEDGE_SOLD", "PLEDGE_RELEASED"] } } });
      expect(closing).toHaveLength(1);
    }
  });

  it("overlapping forfeit and bulk release, opposite orders, across customers → one wins, never a deadlock", async () => {
    const t = await tenant("overlap");
    as(t);
    for (let round = 0; round < 3; round++) {
      // Bulk release is per customer, so the overlap is on customer 0's pledges;
      // the forfeit batch also carries a pledge of customer 1.
      const shared = [
        await createPledge(t.customerIds[0], "1000"),
        await createPledge(t.customerIds[0], "2000"),
        await createPledge(t.customerIds[0], "3000"),
      ];
      const extra = await createPledge(t.customerIds[1], "4000");
      const [ff, br, ff2] = await Promise.all([
        doForfeit([extra, ...shared].map((pledgeId) => ({ pledgeId }))),
        bulk.POST(
          json({
            releaseDate: new Date().toISOString(),
            pledges: [...shared].reverse().map((id) => ({ id, allowCompounding: false, compoundingDuration: "YEARLY" })),
          }),
          ctx({ customerId: t.customerIds[0] }),
        ),
        doForfeit([...shared].reverse().map((pledgeId) => ({ pledgeId }))),
      ]);
      const statuses = [ff.status, br.status, ff2.status];
      expect(statuses.filter((s) => s === 200)).toHaveLength(1);
      expect(statuses.filter((s) => s === 409)).toHaveLength(2);

      expect(await prisma.pledgeAudit.count({ where: { pledgeId: { in: shared } } })).toBe(3);
      const closing = await prisma.cashEntry.count({
        where: { pledgeId: { in: shared }, kind: { in: ["PLEDGE_SOLD", "PLEDGE_RELEASED"] } },
      });
      expect(closing).toBe(3);
      // extra is forfeited only if the batch that carries it won.
      const extraStatus = (await prisma.pledge.findUniqueOrThrow({ where: { id: extra } })).status;
      expect(extraStatus).toBe(ff.status === 200 ? "SOLD" : "ACTIVE");
    }
  });

  it("forfeited pledges leave the LTV list; OVERDUE pledges are listed and forfeitable", async () => {
    const t = await tenant("ltvlist");
    as(t);
    const ltv = await import("@/app/api/ltv/route");
    const a = await createPledge(t.customerIds[0], "10000");
    const overdue = await createPledge(t.customerIds[1], "10000");
    await prisma.pledge.update({ where: { id: overdue }, data: { status: "OVERDUE" } });

    const before = await (await ltv.GET(new NextRequest("http://test/api/ltv"))).json();
    expect(before.pledges.map((p: { pledgeId: string }) => p.pledgeId).sort()).toEqual([a, overdue].sort());
    expect(before.summary.totalPledges).toBe(2);

    expect((await doForfeit([{ pledgeId: overdue }])).status).toBe(200);
    expect((await prisma.pledge.findUniqueOrThrow({ where: { id: overdue } })).status).toBe("SOLD");

    const after = await (await ltv.GET(new NextRequest("http://test/api/ltv"))).json();
    expect(after.pledges.map((p: { pledgeId: string }) => p.pledgeId)).toEqual([a]);
  });

  it("mixed 10 g gold + 1,000 g silver pledge → inventory holds both; stock totals and metal filters count both", async () => {
    const t = await tenant("mixed");
    as(t);
    const inventory = await import("@/app/api/inventory/route");
    const stock = async () => {
      const agg = await prisma.inventoryItem.aggregate({
        where: { ownerId: t.id, status: "IN_STOCK" },
        _sum:  { netWeightOfGold: true, netWeightOfSilver: true },
      });
      return { gold: Number(agg._sum.netWeightOfGold ?? 0), silver: Number(agg._sum.netWeightOfSilver ?? 0) };
    };
    const listed = async (metal: string) => {
      const res = await inventory.GET(new NextRequest(`http://test/api/inventory?status=in_stock&metalType=${metal}`));
      expect(res.status).toBe(200);
      return ((await res.json()).items as { id: string }[]).map((i) => i.id);
    };

    // A gold-only item already in stock, so the totals are shown to ADD.
    const goldOnly = await createPledge(t.customerIds[0], "5000");
    expect((await doForfeit([{ pledgeId: goldOnly }])).status).toBe(200);
    const before = await stock();

    const id = await createPledge(t.customerIds[1], "50000", daysAgo(60), [
      { itemType: "Ring",   itemName: "Gold ring",     metalType: "GOLD",   grossWeight: "12",   netWeight: "10",   purity: "100" },
      { itemType: "Anklet", itemName: "Silver anklet", metalType: "SILVER", grossWeight: "1100", netWeight: "1000", purity: "100" },
    ]);
    const pledge = await prisma.pledge.findUniqueOrThrow({ where: { id } });
    expect(pledge.netWeightOfGold.toFixed(3)).toBe("10.000");
    expect(pledge.netWeightOfSilver.toFixed(3)).toBe("1000.000");

    const pre = await (await doPreflight([{ pledgeId: id }])).json();
    expect(pre.pledges[0]).toMatchObject({ itemSummary: "Gold ring + Silver anklet (2 items)", netWeightOfGold: 10, netWeightOfSilver: 1000, grossWeight: 1112 });

    expect((await doForfeit([{ pledgeId: id }])).status).toBe(200);

    const inv = await prisma.inventoryItem.findUniqueOrThrow({ where: { sourcePledgeId: id } });
    expect(inv.netWeightOfGold.toFixed(3)).toBe("10.000");
    expect(inv.netWeightOfSilver.toFixed(3)).toBe("1000.000");
    expect(inv.grossWeight.toFixed(3)).toBe("1112.000");
    expect(inv.metalType).toBe("GOLD");        // first-added item's metal
    expect(inv.purity!.toFixed(2)).toBe("100.00"); // both items 100%
    expect(inv.description).toBe("Gold ring + Silver anklet (2 items)");

    // Market value on both metals, at the prices the audit row recorded.
    const audit = await prisma.pledgeAudit.findFirstOrThrow({ where: { pledgeId: id, action: "SOLD" } });
    if (audit.goldPricePerGram && audit.silverPricePerGram) {
      expect(Number(audit.marketValueAtRelease)).toBeCloseTo(
        Number(audit.goldPricePerGram) * 10 + Number(audit.silverPricePerGram) * 1000, 1,
      );
    }

    const after = await stock();
    expect(after.gold - before.gold).toBeCloseTo(10, 3);
    expect(after.silver - before.silver).toBeCloseTo(1000, 3);

    const [gold, silver, other] = await Promise.all([listed("gold"), listed("silver"), listed("other")]);
    expect(gold).toContain(inv.id);
    expect(silver).toContain(inv.id);
    expect(other).not.toContain(inv.id);
    const goldOnlyInv = await prisma.inventoryItem.findUniqueOrThrow({ where: { sourcePledgeId: goldOnly } });
    expect(gold).toContain(goldOnlyInv.id);
    expect(silver).not.toContain(goldOnlyInv.id);

    // Receipt: both metals' sale rates come from the SOLD audit row; the PDF renders.
    const receipt = await import("@/app/api/inventory/[id]/receipt/route");
    const r = await receipt.GET(new NextRequest(`http://test/api/inventory/${inv.id}/receipt`), ctx({ id: inv.id }));
    expect(r.status).toBe(200);
    const rb = await r.json();
    expect(rb.item.saleRates).toEqual({
      gold:   audit.goldPricePerGram   != null ? String(audit.goldPricePerGram)   : null,
      silver: audit.silverPricePerGram != null ? String(audit.silverPricePerGram) : null,
    });
    expect(rb.item).not.toHaveProperty("sourcePledge");
    const pdf = await receipt.GET(new NextRequest(`http://test/api/inventory/${inv.id}/receipt?format=pdf`), ctx({ id: inv.id }));
    expect(pdf.status).toBe(200);
    expect(pdf.headers.get("content-type")).toBe("application/pdf");
  });

  it("unauthenticated → 401; preflight writes nothing", async () => {
    const t = await tenant("auth");
    as(t);
    const a = await createPledge(t.customerIds[0], "10000");
    await doPreflight([{ pledgeId: a }]);
    await expectUntouched([a]);
    session.clerkUserId = null;
    expect((await doForfeit([{ pledgeId: a }])).status).toBe(401);
    expect((await doPreflight([{ pledgeId: a }])).status).toBe(401);
  });
});
