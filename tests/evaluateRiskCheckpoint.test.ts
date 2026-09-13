// Checkpoint + lock behaviour of app/api/cron/evaluate-risk.
//
// Runs the real route handler against an in-memory Prisma fake that records
// every write, so each scenario can assert exactly which pledge rows were
// touched, what the checkpoint row looked like at each step, and that a
// skipped/dryRun invocation performed zero writes. The fake supports:
//   • a forced throw on the Nth per-page transaction (simulated crash),
//   • a gate that holds a transaction open (simulated concurrent run),
//   • manual backdating of `updatedAt` (simulated stale checkpoint).
// Interest / LTV maths are the real lib functions; only the DB is faked.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

const STALE_MS = 5 * 60 * 1000;
const JOB = "evaluate-risk";

type CheckpointRow = { jobName: string; cursor: string | null; status: string; updatedAt: Date };
type PledgeRec = {
  id: string; customerId: string; loanAmount: Prisma.Decimal; interestRate: Prisma.Decimal;
  allowCompounding: boolean; compoundingDuration: "MONTHLY" | "HALFYEARLY" | "YEARLY";
  pledgeDate: Date; netWeightOfGold: Prisma.Decimal; netWeightOfSilver: Prisma.Decimal;
  lastRiskTier: string | null; customer: { userId: string };
  items: { itemName: string | null; itemType: string }[];
};

// vi.mock is hoisted above imports, so shared state must be hoisted too.
const db = vi.hoisted(() => ({
  pledges: [] as unknown[],
  checkpoint: null as unknown,
  // ── write log ──
  metricsWrites: [] as string[][],      // ids touched by each committed page UPDATE
  alertWrites: [] as number[],          // alert rows per committed page
  snapshotUpserts: [] as string[],      // userIds
  checkpointOps: [] as string[],        // every cronCheckpoint call, in order
  findManyCursors: [] as (string | undefined)[],
  txCount: 0,
  // ── knobs ──
  failOnTx: null as number | null,      // throw before staging the Nth transaction
  txGate: null as null | ((n: number) => Promise<void>),
  findUniqueGate: null as null | (() => Promise<void>),
}));

vi.mock("@/lib/prisma", () => {
  const pledges = () => db.pledges as PledgeRec[];
  const idSet = () => new Set(pledges().map((p) => p.id));
  const cp = () => db.checkpoint as CheckpointRow | null;

  const applyUpsert = (args: { where: { jobName: string }; create: Omit<CheckpointRow, "updatedAt">; update: Partial<CheckpointRow> }) => {
    const row = cp();
    if (row && row.jobName === args.where.jobName) {
      db.checkpoint = { ...row, ...args.update, updatedAt: new Date() };
    } else {
      db.checkpoint = { ...args.create, updatedAt: new Date() };
    }
  };

  const prisma = {
    pledge: {
      count: async ({ where }: { where: { status: string; id?: { lte: string } } }) =>
        pledges().filter((p) => (where.id ? p.id <= where.id.lte : true)).length,
      findMany: async ({ where, take }: { where: { status: string; id?: { gt: string } }; take: number }) => {
        db.findManyCursors.push(where.id?.gt);
        return pledges()
          .filter((p) => (where.id ? p.id > where.id.gt : true))
          .sort((a, b) => (a.id < b.id ? -1 : 1))
          .slice(0, take);
      },
    },
    metalPrice: {
      findFirst: async ({ where }: { where: { metal: string } }) => ({
        inrPerGram: new Prisma.Decimal(where.metal === "GOLD" ? 7000 : 90),
      }),
    },
    $queryRaw: async () => {
      const byUser = new Map<string, number>();
      for (const p of pledges()) byUser.set(p.customer.userId, (byUser.get(p.customer.userId) ?? 0) + 1);
      return [...byUser].map(([userId, n]) => ({ userId, status: "ACTIVE", count: BigInt(n) }));
    },
    financialSnapshot: {
      upsert: async ({ where }: { where: { userId_snapshotDate: { userId: string } } }) => {
        db.snapshotUpserts.push(where.userId_snapshotDate.userId);
      },
    },
    cronCheckpoint: {
      findUnique: async () => {
        db.checkpointOps.push("findUnique");
        if (db.findUniqueGate) await db.findUniqueGate();
        return cp() ? { ...cp()! } : null;
      },
      updateMany: async ({ where, data }: { where: { OR: ({ status: string; updatedAt?: { lte: Date } })[] }; data: { status: string } }) => {
        db.checkpointOps.push("updateMany");
        const row = cp();
        if (!row) return { count: 0 };
        const matches = where.OR.some((c) =>
          c.status === row.status && (!c.updatedAt || row.updatedAt <= c.updatedAt.lte)
        );
        if (!matches) return { count: 0 };
        db.checkpoint = { ...row, ...data, updatedAt: new Date() };
        return { count: 1 };
      },
      create: async ({ data }: { data: Omit<CheckpointRow, "updatedAt"> }) => {
        db.checkpointOps.push("create");
        if (cp()) {
          throw new Prisma.PrismaClientKnownRequestError("dup", { code: "P2002", clientVersion: "test" });
        }
        db.checkpoint = { ...data, updatedAt: new Date() };
      },
      upsert: async (args: Parameters<typeof applyUpsert>[0]) => {
        db.checkpointOps.push(`upsert:${args.update.status}:${args.update.cursor ?? "null"}`);
        applyUpsert(args);
      },
    },
    // Per-page transaction: stage everything, commit only if the callback
    // resolves — so a throw inside leaves no partial page behind.
    $transaction: async (fn: (tx: unknown) => Promise<void>) => {
      db.txCount++;
      const n = db.txCount;
      if (db.txGate) await db.txGate(n);
      if (db.failOnTx === n) throw new Error("SIMULATED_CRASH");
      const staged = { ids: [] as string[], alerts: 0, checkpoint: null as null | Parameters<typeof applyUpsert>[0] };
      const ids = idSet();
      const tx = {
        $executeRaw: async (sql: Prisma.Sql) => {
          staged.ids = sql.values.filter((v): v is string => typeof v === "string" && ids.has(v));
        },
        pledgeAlert: { createMany: async ({ data }: { data: unknown[] }) => { staged.alerts = data.length; } },
        cronCheckpoint: {
          upsert: async (args: Parameters<typeof applyUpsert>[0]) => { staged.checkpoint = args; },
        },
      };
      await fn(tx);
      db.metricsWrites.push(staged.ids);
      db.alertWrites.push(staged.alerts);
      if (staged.checkpoint) {
        db.checkpointOps.push(`tx-upsert:${staged.checkpoint.update.status}:${staged.checkpoint.update.cursor ?? "null"}`);
        applyUpsert(staged.checkpoint);
      }
    },
  };
  return { prisma };
});

import { POST } from "@/app/api/cron/evaluate-risk/route";

// ── helpers ──
const pid = (i: number) => `p${String(i).padStart(5, "0")}`;
function seedPledges(n: number, users = 3) {
  db.pledges = Array.from({ length: n }, (_, k) => {
    const i = k + 1;
    const rec: PledgeRec = {
      id: pid(i), customerId: `c${i}`,
      loanAmount: new Prisma.Decimal(50000), interestRate: new Prisma.Decimal(24),
      allowCompounding: false, compoundingDuration: "MONTHLY",
      pledgeDate: new Date("2026-01-01"),
      netWeightOfGold: new Prisma.Decimal(10), netWeightOfSilver: new Prisma.Decimal(0),
      lastRiskTier: null, customer: { userId: `u${i % users}` },
      items: [{ itemName: "Ring", itemType: "Ring" }],
    };
    return rec;
  });
}
function ids(from: number, to: number) { return Array.from({ length: to - from + 1 }, (_, k) => pid(from + k)); }
function req(query = "") {
  return new NextRequest(`http://localhost/api/cron/evaluate-risk${query}`, {
    method: "POST", headers: { "x-cron-secret": "test-secret" },
  });
}
const flushed = () => db.metricsWrites.flat();
const checkpoint = () => db.checkpoint as CheckpointRow | null;
const writeCount = () => db.metricsWrites.length + db.alertWrites.length + db.snapshotUpserts.length +
  db.checkpointOps.filter((o) => o !== "findUnique").length;
const tick = () => new Promise((r) => setTimeout(r, 0));

let logs: string[];
beforeEach(() => {
  process.env.CRON_SECRET = "test-secret";
  db.pledges = []; db.checkpoint = null;
  db.metricsWrites = []; db.alertWrites = []; db.snapshotUpserts = []; db.checkpointOps = [];
  db.findManyCursors = []; db.txCount = 0;
  db.failOnTx = null; db.txGate = null; db.findUniqueGate = null;
  logs = [];
  vi.spyOn(console, "log").mockImplementation((...a: unknown[]) => { logs.push(a.join(" ")); });
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation((...a: unknown[]) => { logs.push(a.join(" ")); });
});
afterEach(() => vi.restoreAllMocks());

// 1800 active pledges → 4 pages at the route's BATCH_SIZE of 500: 500 / 500 / 500 / 300.
const N = 1800;

describe("(i) full run, no interruption", () => {
  it("processes every page, writes snapshots, ends idle with a null cursor", async () => {
    seedPledges(N);
    const res = await POST(req());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({
      success: true, pledgesProcessed: N, batches: 4, snapshotsCreated: 3,
      snapshotsSkipped: false, resumedFromCursor: null, run: { complete: true },
    });
    // every pledge touched exactly once, in page order
    expect(db.metricsWrites.map((w) => w.length)).toEqual([500, 500, 500, 300]);
    expect(flushed()).toEqual(ids(1, N));
    expect(db.snapshotUpserts.sort()).toEqual(["u0", "u1", "u2"]);
    // checkpoint: claimed → advanced per page inside the tx → cleared
    expect(db.checkpointOps).toEqual([
      "findUnique", "create",
      `tx-upsert:running:${pid(500)}`, `tx-upsert:running:${pid(1000)}`,
      `tx-upsert:running:${pid(1500)}`, `tx-upsert:running:${pid(1800)}`,
      "upsert:idle:null",
    ]);
    expect(checkpoint()).toMatchObject({ jobName: JOB, status: "idle", cursor: null });
    expect(logs.some((l) => l.includes("starting fresh — checkpoint absent"))).toBe(true);
    expect(logs.some((l) => l.includes("run complete, checkpoint cleared"))).toBe(true);
  });

  it("an existing idle row also starts fresh", async () => {
    seedPledges(600);
    db.checkpoint = { jobName: JOB, status: "idle", cursor: null, updatedAt: new Date() };
    const res = await POST(req());
    expect((await res.json()).pledgesProcessed).toBe(600);
    expect(db.checkpointOps.slice(0, 2)).toEqual(["findUnique", "updateMany"]);
    expect(logs.some((l) => l.includes("starting fresh — checkpoint idle"))).toBe(true);
  });
});

describe("(ii) crash after page 3", () => {
  it("leaves checkpoint at status=running, cursor=<page 3's last id>; no page-4 rows written", async () => {
    seedPledges(N);
    db.failOnTx = 4; // page 4's transaction throws before staging anything

    const res = await POST(req());
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body).toMatchObject({ batchesCommitted: 3, pledgesCommitted: 1500, snapshotsWritten: false });
    expect(flushed()).toEqual(ids(1, 1500));
    expect(db.snapshotUpserts).toEqual([]);
    expect(checkpoint()).toMatchObject({ status: "running", cursor: pid(1500) });
    expect(logs.some((l) => l.includes("Checkpoint left at status=running"))).toBe(true);
  });
});

describe("(iii) restart after the crash", () => {
  it("resumes from page 4, never re-touches pages 1-3, and SKIPS the snapshot write", async () => {
    seedPledges(N);
    // state exactly as (ii) leaves it, but stale (the crashed process is gone)
    db.checkpoint = { jobName: JOB, status: "running", cursor: pid(1500), updatedAt: new Date(Date.now() - STALE_MS - 1000) };

    const res = await POST(req());
    const body = await res.json();

    expect(res.status).toBe(200);
    // ── pages 1-3 untouched: exactly one page fetch, starting after p01500 ──
    expect(db.findManyCursors).toEqual([pid(1500)]);
    expect(db.metricsWrites).toEqual([ids(1501, 1800)]);
    for (const id of ids(1, 1500)) expect(flushed()).not.toContain(id);
    // ── accumulator state: only the 300 resumed pledges, across all 3 users ──
    expect(body).toMatchObject({
      success: true, pledgesProcessed: 300, batches: 1, usersProcessed: 3,
      resumedFromCursor: pid(1500), snapshotsSkipped: true, snapshotsCreated: 0,
      run: { totalPledges: N, processed: 300, complete: true },
    });
    // ── snapshot write skipped, with the reason in the log ──
    expect(db.snapshotUpserts).toEqual([]);
    const skipLine = logs.find((l) => l.includes("snapshot write SKIPPED"));
    expect(skipLine).toBeDefined();
    expect(skipLine).toContain(`resumed run from cursor ${pid(1500)}`);
    expect(skipLine).toContain("accumulator covers 300 of 1800 pledges (3 users)");
    expect(skipLine).toContain("per-user totals are partial");
    expect(logs.some((l) => l.includes(`RESUMING from cursor ${pid(1500)}`))).toBe(true);
    expect(logs.some((l) => l.includes("1500 already committed by the abandoned run"))).toBe(true);
    // ── checkpoint: claimed via CAS on the stale row, advanced, then cleared ──
    expect(db.checkpointOps).toEqual([
      "findUnique", "updateMany", `tx-upsert:running:${pid(1800)}`, "upsert:idle:null",
    ]);
    expect(checkpoint()).toMatchObject({ status: "idle", cursor: null });
  });

  it("a resumed run that itself crashes leaves the NEW cursor, not the old one", async () => {
    seedPledges(2600); // 6 pages; resume at page 4, crash on page 5
    db.checkpoint = { jobName: JOB, status: "running", cursor: pid(1500), updatedAt: new Date(Date.now() - STALE_MS - 1000) };
    db.failOnTx = 2;
    const res = await POST(req());
    expect(res.status).toBe(500);
    expect(db.metricsWrites).toEqual([ids(1501, 2000)]);
    expect(checkpoint()).toMatchObject({ status: "running", cursor: pid(2000) });
  });
});

describe("(iv) concurrent run — the lock", () => {
  it("second invocation while the first is mid-page returns ALREADY_RUNNING and writes nothing", async () => {
    seedPledges(N);
    let release!: () => void;
    const gate = new Promise<void>((r) => { release = r; });
    db.txGate = async (n) => { if (n === 1) await gate; }; // hold run 1 open inside page 1's tx

    const run1 = POST(req());
    while (db.txCount < 1) await tick(); // run 1 has claimed the lock and is blocked in tx 1
    expect(checkpoint()).toMatchObject({ status: "running", cursor: null });
    const writesBefore = writeCount();

    const run2 = await POST(req());
    const body2 = await run2.json();
    expect(run2.status).toBe(200);
    expect(body2).toMatchObject({ success: true, skipped: true, reason: "ALREADY_RUNNING" });
    expect(body2.pledgesProcessed).toBeUndefined();
    expect(writeCount()).toBe(writesBefore); // zero writes from run 2
    expect(db.findManyCursors).toHaveLength(1); // run 2 never even fetched a page
    expect(logs.some((l) => l.includes("SKIPPED — another run is in progress"))).toBe(true);

    release();
    const body1 = await (await run1).json();
    expect(body1).toMatchObject({ success: true, pledgesProcessed: N, snapshotsSkipped: false });
    expect(flushed()).toEqual(ids(1, N)); // run 1 unaffected
    expect(checkpoint()).toMatchObject({ status: "idle", cursor: null });
  });

  it("two invocations that read the row before either claims it: exactly one proceeds (CAS)", async () => {
    seedPledges(600);
    db.checkpoint = { jobName: JOB, status: "idle", cursor: null, updatedAt: new Date() };
    let release!: () => void;
    const gate = new Promise<void>((r) => { release = r; });
    let reads = 0;
    db.findUniqueGate = async () => { reads++; await gate; }; // both see "idle"

    const a = POST(req());
    const b = POST(req());
    while (reads < 2) await tick();
    release();
    const [ra, rb] = await Promise.all([a, b]);
    const bodies = [await ra.json(), await rb.json()];
    const winners = bodies.filter((x) => x.pledgesProcessed === 600);
    const losers = bodies.filter((x) => x.skipped === true && x.reason === "ALREADY_RUNNING");
    expect(winners).toHaveLength(1);
    expect(losers).toHaveLength(1);
    expect(db.metricsWrites).toEqual([ids(1, 500), ids(501, 600)]); // one run's worth, not two
    expect(logs.some((l) => l.includes("another run claimed the checkpoint first"))).toBe(true);
  });
});

describe("(v) stale running checkpoint", () => {
  it("is treated as abandoned and resumed rather than skipped forever", async () => {
    seedPledges(N);
    db.checkpoint = { jobName: JOB, status: "running", cursor: pid(1000), updatedAt: new Date(Date.now() - STALE_MS - 1) };
    const body = await (await POST(req())).json();
    expect(body).toMatchObject({ success: true, resumedFromCursor: pid(1000), pledgesProcessed: 800, snapshotsSkipped: true });
    expect(db.metricsWrites).toEqual([ids(1001, 1500), ids(1501, 1800)]);
    expect(checkpoint()).toMatchObject({ status: "idle", cursor: null });
  });

  it("stale + null cursor (died before any page committed) starts fresh and writes snapshots", async () => {
    seedPledges(600);
    db.checkpoint = { jobName: JOB, status: "running", cursor: null, updatedAt: new Date(Date.now() - STALE_MS - 1) };
    const body = await (await POST(req())).json();
    expect(body).toMatchObject({ success: true, resumedFromCursor: null, pledgesProcessed: 600, snapshotsSkipped: false, snapshotsCreated: 3 });
    expect(logs.some((l) => l.includes("starting fresh — abandoned run") && l.includes("committed no page"))).toBe(true);
  });

  it("just inside the window is still considered live", async () => {
    seedPledges(600);
    db.checkpoint = { jobName: JOB, status: "running", cursor: pid(500), updatedAt: new Date(Date.now() - STALE_MS + 5000) };
    const body = await (await POST(req())).json();
    expect(body).toMatchObject({ skipped: true, reason: "ALREADY_RUNNING" });
    expect(writeCount()).toBe(0);
  });
});

describe("(vi) dryRun", () => {
  it("never reads or writes the checkpoint row and never resumes", async () => {
    seedPledges(N);
    const before: CheckpointRow = { jobName: JOB, status: "running", cursor: pid(1500), updatedAt: new Date(Date.now() - STALE_MS - 1) };
    db.checkpoint = { ...before };

    const body = await (await POST(req("?dryRun=true"))).json();

    expect(body).toMatchObject({ dryRun: true, pledgesProcessed: N, batches: 4, snapshotsWouldCreate: 3 });
    expect(db.checkpointOps).toEqual([]);                  // not even a findUnique
    expect(db.checkpoint).toEqual(before);                 // row byte-identical
    expect(db.findManyCursors[0]).toBeUndefined();         // whole book, ignored stored cursor
    expect(writeCount()).toBe(0);
    expect(db.txCount).toBe(0);
  });

  it("dryRun is not blocked by a live lock either", async () => {
    seedPledges(600);
    db.checkpoint = { jobName: JOB, status: "running", cursor: pid(500), updatedAt: new Date() };
    const body = await (await POST(req("?dryRun=true"))).json();
    expect(body).toMatchObject({ dryRun: true, pledgesProcessed: 600 });
    expect(db.checkpointOps).toEqual([]);
  });
});
