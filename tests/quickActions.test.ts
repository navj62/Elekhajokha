// Read routes behind the quick-action Add / Release pickers:
//   GET /api/customers/search      (filterBy=OPEN, mobile, openPledgeCount, take on the DB query)
//   GET /api/customers/recent      (tenant, openOnly, ordering + ties, limit)
//   GET /api/customers/[id]/open-pledges (tenant, open-only, oldest first, dueToday = shared engine)
//
// Real handlers against a recording Prisma fake. /recent is one SQL aggregate,
// so its ordering/tie-break/limit are asserted on the generated SQL and its
// bound values (the fake cannot execute SQL); the same query was run read-only
// against the dev database during development.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { calculateHybridInterest } from "@/lib/interest";

const D = (n: number | string) => new Prisma.Decimal(n);

const db = vi.hoisted(() => ({
  customerFindMany: [] as Record<string, unknown>[],
  customerFindFirst: [] as Record<string, unknown>[],
  pledgeFindMany: [] as Record<string, unknown>[],
  groupBy: [] as Record<string, unknown>[],
  rawQueries: [] as { sql: string; values: unknown[] }[],
  customers: [] as Record<string, unknown>[],
  ownedCustomerIds: new Set<string>(),
  openPledges: [] as Record<string, unknown>[],
  openCounts: [] as { customerId: string; _count: { _all: number } }[],
}));

vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ userId: "clerk_owner" }) }));

vi.mock("@/lib/prisma", async () => {
  // prisma.$queryRaw`…` arrives as (strings, ...values); rebuild the exact
  // Prisma.Sql the real client would send, so assertions see real SQL + values.
  const { Prisma: P } = await import("@prisma/client");
  return {
  prisma: {
    user: {
      findUnique: async ({ where }: { where: { clerkUserId: string } }) =>
        where.clerkUserId === "clerk_owner" ? { id: "owner" } : null,
    },
    customer: {
      findMany: async (args: Record<string, unknown>) => {
        db.customerFindMany.push(args);
        const take = args.take as number;
        return db.customers.slice(0, take);
      },
      findFirst: async (args: { where: { id: string; userId: string } }) => {
        db.customerFindFirst.push(args);
        return args.where.userId === "owner" && db.ownedCustomerIds.has(args.where.id)
          ? { id: args.where.id, name: "राम कुमार", mobile: "9876543210" }
          : null;
      },
    },
    pledge: {
      findMany: async (args: Record<string, unknown>) => {
        db.pledgeFindMany.push(args);
        return db.openPledges;
      },
      groupBy: async (args: Record<string, unknown>) => {
        db.groupBy.push(args);
        return db.openCounts;
      },
    },
    $queryRaw: async (strings: TemplateStringsArray, ...values: unknown[]) => {
      const q = P.sql(strings, ...(values as Prisma.Sql[]));
      db.rawQueries.push({ sql: q.text, values: q.values }); // .text = Postgres $n placeholders
      return [{ id: "c1", name: "A", mobile: null, region: "Indore", openPledgeCount: 2 }];
    },
  },
  };
});

import { GET as search } from "@/app/api/customers/search/route";
import { GET as recent } from "@/app/api/customers/recent/route";
import { GET as openPledges } from "@/app/api/customers/[customerId]/open-pledges/route";

beforeEach(() => {
  db.customerFindMany = [];
  db.customerFindFirst = [];
  db.pledgeFindMany = [];
  db.groupBy = [];
  db.rawQueries = [];
  db.customers = [];
  db.ownedCustomerIds = new Set();
  db.openPledges = [];
  db.openCounts = [];
  vi.spyOn(console, "error").mockImplementation(() => {});
});

const get = (path: string, params: Record<string, string> = {}) =>
  new NextRequest(`http://localhost${path}?${new URLSearchParams(params)}`);

const customerRow = (i: number) => ({
  id: `c${i}`,
  name: `Customer ${i}`,
  mobile: `98765432${String(i).padStart(2, "0")}`,
  region: i % 2 ? "Indore" : "",
  address: "Address",
  isPinned: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  _count: { pledges: 1 },
  pledges: [],
});

// ── /api/customers/search ───────────────────────────────────────────────────

describe("GET /api/customers/search (picker additions)", () => {
  it("is tenant-scoped", async () => {
    await search(get("/api/customers/search", { q: "a", take: "20" }));
    expect(db.customerFindMany[0].where).toMatchObject({ userId: "owner", deletedAt: null });
  });

  it("filterBy=OPEN filters to ACTIVE + OVERDUE pledges", async () => {
    await search(get("/api/customers/search", { filterBy: "OPEN", take: "20" }));
    const where = db.customerFindMany[0].where as { pledges: { some: { status: unknown } } };
    expect(where.pledges.some.status).toEqual({ in: ["ACTIVE", "OVERDUE"] });

    await search(get("/api/customers/search", { filterBy: "OPEN", q: "ram", take: "20" }));
    const withQ = db.customerFindMany[1].where as { OR: { pledges?: { some: { status: unknown } } }[] };
    const pledgeClause = withQ.OR.find((c) => c.pledges)!;
    expect(pledgeClause.pledges!.some.status).toEqual({ in: ["ACTIVE", "OVERDUE"] });
  });

  it("existing filters are unchanged (ACTIVE stays ACTIVE-only)", async () => {
    await search(get("/api/customers/search", { filterBy: "ACTIVE" }));
    const where = db.customerFindMany[0].where as { pledges: { some: { status: unknown } } };
    expect(where.pledges.some.status).toBe("ACTIVE");
  });

  it("applies take to the DB query (+1 for hasMore); no take keeps the 5000 bound", async () => {
    db.customers = Array.from({ length: 30 }, (_, i) => customerRow(i));
    const res = await (await search(get("/api/customers/search", { take: "20" }))).json();
    expect(db.customerFindMany[0].take).toBe(21);
    expect(res.customers).toHaveLength(20);
    expect(res.hasMore).toBe(true);

    await search(get("/api/customers/search"));
    expect(db.customerFindMany[1].take).toBe(5000);

    // Item-label sorts reorder in memory, so they still need the full set.
    await search(get("/api/customers/search", { take: "20", sortBy: "itemname-asc" }));
    expect(db.customerFindMany[2].take).toBe(5000);
  });

  it("clamps take to at least 1: -5 → 1, 0 → default, 1 → 1", async () => {
    db.customers = Array.from({ length: 30 }, (_, i) => customerRow(i));

    // Negative: never a negative Prisma take (that would read from the end).
    const neg = await (await search(get("/api/customers/search", { take: "-5" }))).json();
    expect(db.customerFindMany[0].take).toBe(2);
    expect(neg.customers).toHaveLength(1);
    expect(neg.hasMore).toBe(true);

    // 0 is "not a number we can use" → the 5000 default, as before.
    const zero = await (await search(get("/api/customers/search", { take: "0" }))).json();
    expect(db.customerFindMany[1].take).toBe(5001);
    expect(zero.customers).toHaveLength(30);
    expect(zero.hasMore).toBe(false);

    const one = await (await search(get("/api/customers/search", { take: "1" }))).json();
    expect(db.customerFindMany[2].take).toBe(2);
    expect(one.customers).toHaveLength(1);
    expect(one.hasMore).toBe(true);
  });

  it("returns mobile and an open-pledge count (ACTIVE + OVERDUE) per customer", async () => {
    db.customers = [customerRow(1), customerRow(2)];
    db.openCounts = [{ customerId: "c1", _count: { _all: 3 } }];
    const res = await (await search(get("/api/customers/search", { take: "20" }))).json();
    expect(db.groupBy[0]).toMatchObject({
      by: ["customerId"],
      where: { customerId: { in: ["c1", "c2"] }, status: { in: ["ACTIVE", "OVERDUE"] } },
    });
    expect(res.customers[0]).toMatchObject({ id: "c1", mobile: "9876543201", openPledgeCount: 3 });
    expect(res.customers[1]).toMatchObject({ id: "c2", openPledgeCount: 0 });
    // Existing fields keep their meaning.
    expect(res.customers[0]).toHaveProperty("pledgeCount", 1);
  });
});

// ── /api/customers/recent ───────────────────────────────────────────────────

describe("GET /api/customers/recent", () => {
  it("is tenant-scoped through a bound parameter, never string-built", async () => {
    await recent(get("/api/customers/recent"));
    const { sql, values } = db.rawQueries[0];
    expect(sql).toMatch(/c\."userId" = \$\d+/);
    expect(sql).toContain('c."deletedAt" IS NULL');
    expect(values).toContain("owner");
    expect(sql).not.toContain("owner");
  });

  it("orders by latest activity, then name, then id, and returns at most 8", async () => {
    await recent(get("/api/customers/recent"));
    const { sql, values } = db.rawQueries[0];
    const norm = sql.replace(/\s+/g, " ");
    expect(norm).toContain('ORDER BY MAX(GREATEST(p."createdAt", p."updatedAt")) DESC, c.name ASC, c.id ASC');
    expect(norm).toMatch(/LIMIT \$\d+/);
    expect(values.at(-1)).toBe(8);
  });

  it("openOnly=1 keeps only customers with an ACTIVE or OVERDUE pledge", async () => {
    await recent(get("/api/customers/recent", { openOnly: "1" }));
    const { sql, values } = db.rawQueries[0];
    expect(sql.replace(/\s+/g, " ")).toMatch(/HAVING COUNT\(\*\) FILTER \(WHERE p\.status::text IN \(\$\d+,\$\d+\)\) > 0/);
    expect(values).toEqual(expect.arrayContaining(["ACTIVE", "OVERDUE"]));
  });

  it("without openOnly there is no HAVING, but the open count is still returned", async () => {
    const res = await (await recent(get("/api/customers/recent"))).json();
    expect(db.rawQueries[0].sql).not.toContain("HAVING");
    expect(res.customers[0]).toMatchObject({ id: "c1", openPledgeCount: 2 });
  });
});

// ── /api/customers/[id]/open-pledges ────────────────────────────────────────

describe("GET /api/customers/[id]/open-pledges", () => {
  const call = (customerId: string) =>
    openPledges(new Request(`http://localhost/api/customers/${customerId}/open-pledges`), {
      params: Promise.resolve({ customerId }),
    });

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-31T12:00:00+05:30"));
  });
  afterEach(() => vi.useRealTimers());

  it("another tenant's customer → 404, and no pledges are read", async () => {
    const res = await call("someone-elses-customer");
    expect(res.status).toBe(404);
    expect(db.customerFindFirst[0].where).toMatchObject({ id: "someone-elses-customer", userId: "owner", deletedAt: null });
    expect(db.pledgeFindMany).toHaveLength(0);
  });

  it("asks for open pledges only (ACTIVE + OVERDUE), oldest first", async () => {
    db.ownedCustomerIds.add("c1");
    await call("c1");
    expect(db.pledgeFindMany[0]).toMatchObject({
      where: { customerId: "c1", status: { in: ["ACTIVE", "OVERDUE"] } },
      orderBy: [{ pledgeDate: "asc" }, { id: "asc" }],
    });
  });

  it("dueToday equals the shared interest engine with each pledge's stored settings", async () => {
    db.ownedCustomerIds.add("c1");
    db.openPledges = [
      {
        id: "p1", status: "OVERDUE", pledgeDate: new Date("2025-11-15T00:00:00Z"),
        loanAmount: D("50000"), interestRate: D("18"), allowCompounding: true, compoundingDuration: "MONTHLY",
        items: [{ itemName: "सोने की चेन", itemType: "Chain", metalType: "GOLD" }], _count: { items: 3 },
      },
      {
        id: "p2", status: "ACTIVE", pledgeDate: new Date("2026-08-01T00:00:00Z"),
        loanAmount: D("12500.50"), interestRate: D("24"), allowCompounding: false, compoundingDuration: "YEARLY",
        items: [{ itemName: null, itemType: "Ring", metalType: "SILVER" }], _count: { items: 1 },
      },
    ];
    const body = await (await call("c1")).json();
    const now = new Date();

    expect(body.customer).toEqual({ id: "c1", name: "राम कुमार", mobile: "9876543210" });
    expect(body.pledges).toEqual([
      {
        id: "p1", status: "OVERDUE", itemLabel: "सोने की चेन +2",
        pledgeDate: "2025-11-15T00:00:00.000Z", loanAmount: 50000,
        dueToday: calculateHybridInterest(50000, 18, new Date("2025-11-15T00:00:00Z"), now, true, "MONTHLY").receivableAmount,
      },
      {
        id: "p2", status: "ACTIVE", itemLabel: "Ring (Silver)",
        pledgeDate: "2026-08-01T00:00:00.000Z", loanAmount: 12500.5,
        dueToday: calculateHybridInterest(12500.5, 24, new Date("2026-08-01T00:00:00Z"), now, false, "YEARLY").receivableAmount,
      },
    ]);
    // Simple vs compound really differ — the stored setting was used.
    expect(body.pledges[1].dueToday).toBe(
      calculateHybridInterest(12500.5, 24, new Date("2026-08-01T00:00:00Z"), now, false, "YEARLY").receivableAmount
    );
  });
});
