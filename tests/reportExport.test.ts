// Reports export parity: for the same tab + filters, the file from
// /api/reports/export holds exactly the rows and totals that the tab's own
// route returns.
//
// Runs the real route handlers against an in-memory Prisma fake that applies
// the subset of `where` the report queries use (tenant, status, date range,
// activeOnly), so a filter that diverged between the tab and the export would
// show up as different rows. The .xlsx is parsed back with exceljs and compared
// cell by cell with the tab's JSON. Interest / LTV / risk maths are the real
// lib functions; only the DB and Clerk are faked.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import ExcelJS from "exceljs";
// exceljs's own zip library — used to read styles.xml as written, because
// exceljs's reader strips the backslashes out of a numFmt on load.
import JSZip from "jszip";

const D = (n: number | string) => new Prisma.Decimal(n);

type PledgeFx = {
  id: string;
  status: "ACTIVE" | "RELEASED" | "SOLD";
  pledgeDate: Date;
  releaseDate: Date | null;
  loanAmount: Prisma.Decimal;
  interestRate: Prisma.Decimal;
  allowCompounding: boolean;
  compoundingDuration: "MONTHLY" | "HALFYEARLY" | "YEARLY";
  netWeightOfGold: Prisma.Decimal;
  netWeightOfSilver: Prisma.Decimal;
  totalInterest: Prisma.Decimal | null;
  receivableAmount: Prisma.Decimal | null;
  lastMarketValue: Prisma.Decimal | null;
  customer: { userId: string; deletedAt: Date | null; name: string; mobile: string | null };
  items: { itemName: string | null; itemType: string; metalType: string }[];
  _count: { items: number };
  pledgeAudits: {
    totalInterest: Prisma.Decimal;
    netWeightOfGold: Prisma.Decimal;
    netWeightOfSilver: Prisma.Decimal;
    ltvAtRelease: Prisma.Decimal | null;
  }[];
};

type CustomerFx = {
  id: string;
  userId: string;
  deletedAt: Date | null;
  name: string;
  mobile: string | null;
  address: string | null;
  createdAt: Date;
  pledges: PledgeFx[];
};

const db = vi.hoisted(() => ({
  pledges: [] as unknown[],
  customers: [] as unknown[],
  pledgeWheres: [] as unknown[],
  customerWheres: [] as unknown[],
  findManyCalls: 0,
  noPrices: false, // simulate an empty MetalPrice table → every LTV is null
}));

type DateFilter = { gte?: Date; lte?: Date };
const inRange = (d: Date | null, f?: DateFilter) =>
  !f || (d !== null && (!f.gte || d >= f.gte) && (!f.lte || d <= f.lte));

vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ userId: "clerk_owner" }) }));

vi.mock("@/lib/prisma", () => {
  type PledgeWhere = {
    customer?: { userId?: string; deletedAt?: null };
    status?: string;
    pledgeDate?: DateFilter;
    releaseDate?: DateFilter;
  };
  const matchPledge = (p: PledgeFx, w: PledgeWhere) =>
    (!w.customer?.userId || p.customer.userId === w.customer.userId) &&
    (w.customer?.deletedAt !== null || p.customer.deletedAt === null) &&
    (!w.status || p.status === w.status) &&
    inRange(p.pledgeDate, w.pledgeDate) &&
    inRange(p.releaseDate, w.releaseDate);

  type CustomerWhere = {
    userId: string;
    deletedAt: null;
    createdAt?: DateFilter;
    pledges?: { some: { status: { in: string[] } } };
  };
  const matchCustomer = (c: CustomerFx, w: CustomerWhere) =>
    c.userId === w.userId &&
    c.deletedAt === null &&
    inRange(c.createdAt, w.createdAt) &&
    (!w.pledges || c.pledges.some((p) => w.pledges!.some.status.in.includes(p.status)));

  const sortDesc = <T,>(xs: T[], key: (x: T) => Date | null) =>
    [...xs].sort((a, b) => (key(b)?.getTime() ?? 0) - (key(a)?.getTime() ?? 0));

  return {
    prisma: {
      user: {
        findUnique: async ({ where }: { where: { clerkUserId: string } }) =>
          where.clerkUserId === "clerk_owner"
            ? { id: "owner", shopName: "श्री गणेश ज्वैलर्स", address: "सराफा बाज़ार, इंदौर", mobile: "9999988888" }
            : null,
      },
      metalPrice: {
        findFirst: async ({ where }: { where: { metal: string } }) => db.noPrices ? null : ({
          inrPerGram: D(where.metal === "GOLD" ? 9500 : 110),
        }),
      },
      pledge: {
        count: async ({ where }: { where: PledgeWhere }) => {
          db.pledgeWheres.push(where);
          return (db.pledges as PledgeFx[]).filter((p) => matchPledge(p, where)).length;
        },
        findMany: async ({ where, orderBy }: { where: PledgeWhere; orderBy: Record<string, string> }) => {
          db.pledgeWheres.push(where);
          db.findManyCalls++;
          const rows = (db.pledges as PledgeFx[]).filter((p) => matchPledge(p, where));
          return "releaseDate" in orderBy ? sortDesc(rows, (p) => p.releaseDate) : sortDesc(rows, (p) => p.pledgeDate);
        },
      },
      customer: {
        count: async ({ where }: { where: CustomerWhere }) => {
          db.customerWheres.push(where);
          return (db.customers as CustomerFx[]).filter((c) => matchCustomer(c, where)).length;
        },
        findMany: async ({ where }: { where: CustomerWhere }) => {
          db.customerWheres.push(where);
          db.findManyCalls++;
          return sortDesc((db.customers as CustomerFx[]).filter((c) => matchCustomer(c, where)), (c) => c.createdAt);
        },
      },
    },
  };
});

import { GET as pledgesTab } from "@/app/api/reports/pledges/route";
import { GET as customersTab } from "@/app/api/reports/customers/route";
import { GET as exportRoute } from "@/app/api/reports/export/route";
import { fmtReportDate } from "@/lib/reports/reportQueries";
import { MONEY_FMT_INDIAN, MONEY_FMT_PLAIN, moneyNumFmt } from "@/lib/reports/reportExport";
import { REPORT_RISK_TIERS, REPORT_RISK_TIER_LABEL, parseRiskTiers, type ReportRiskTier } from "@/lib/reports/riskTierFilter";
import { getRiskTier } from "@/lib/calculateLTV";

// ── Fixtures ────────────────────────────────────────────────────────────────

const NAMES = ["राम कुमार शर्मा", "सीता देवी", "Mohan Lal", "श्रीमती क्षमा त्रिपाठी"];

function makePledge(i: number, over: Partial<PledgeFx> = {}): PledgeFx {
  const released = over.status === "RELEASED";
  return {
    id: `p${i}`,
    status: "ACTIVE",
    pledgeDate: new Date(Date.UTC(2026, 8, 1 + (i % 60))), // Sep–Oct 2026
    releaseDate: released ? new Date(Date.UTC(2026, 9, 1 + (i % 30))) : null,
    loanAmount: D(20000 + (i % 50) * 1000),
    interestRate: D(18),
    allowCompounding: i % 2 === 0,
    compoundingDuration: "MONTHLY",
    netWeightOfGold: D(i % 3 === 0 ? "0" : "12.345"),
    netWeightOfSilver: D(i % 3 === 0 ? "150.5" : "0"),
    totalInterest: D("812.45"),
    // Every 4th released pledge has no stored receivable → tab falls back to loan.
    receivableAmount: i % 4 === 0 ? null : D(21000 + i),
    lastMarketValue: null,
    customer: { userId: "owner", deletedAt: null, name: NAMES[i % NAMES.length], mobile: null },
    items: [{ itemName: i % 2 ? "सोने की चेन" : null, itemType: "Chain", metalType: "GOLD" }],
    _count: { items: 1 + (i % 3) },
    // Every 5th released pledge is legacy (no audit) → Pledge-row fallback.
    pledgeAudits:
      released && i % 5 !== 0
        ? [{ totalInterest: D("1234.56"), netWeightOfGold: D("10.5"), netWeightOfSilver: D("2.25"), ltvAtRelease: D(i % 2 ? "66.4" : "91.2") }]
        : [],
    ...over,
  };
}

function seedPledges(nActive: number, nReleased: number) {
  const ps: PledgeFx[] = [];
  for (let i = 0; i < nActive; i++) ps.push(makePledge(i));
  for (let i = 0; i < nReleased; i++) ps.push(makePledge(1000 + i, { status: "RELEASED" }));
  // Noise that must never appear: another tenant, a soft-deleted customer, a SOLD pledge.
  ps.push(makePledge(9001, { customer: { userId: "intruder", deletedAt: null, name: "Other Tenant", mobile: null } }));
  ps.push(makePledge(9002, { customer: { userId: "owner", deletedAt: new Date(), name: "Deleted", mobile: null } }));
  ps.push(makePledge(9003, { status: "SOLD" }));
  db.pledges = ps;
}

function seedCustomers() {
  const cs: CustomerFx[] = [];
  for (let i = 0; i < 12; i++) {
    const pledges = [
      makePledge(i, { status: i % 3 === 0 ? "RELEASED" : "ACTIVE" }),
      makePledge(i + 100, { status: "ACTIVE" }),
    ].slice(0, 1 + (i % 2));
    cs.push({
      id: `c${i}`,
      userId: "owner",
      deletedAt: null,
      name: NAMES[i % NAMES.length],
      mobile: i % 2 ? "98765432" + String(i).padStart(2, "0") : null,
      address: i % 3 ? "मकान नं. 12, गांधी नगर" : null,
      createdAt: new Date(Date.UTC(2026, 9, 1 + i)),
      pledges,
    });
  }
  cs.push({ id: "x", userId: "intruder", deletedAt: null, name: "Other Tenant", mobile: null, address: null, createdAt: new Date(Date.UTC(2026, 9, 5)), pledges: [] });
  db.customers = cs;
}

beforeEach(() => {
  db.pledges = [];
  db.customers = [];
  db.pledgeWheres = [];
  db.customerWheres = [];
  db.findManyCalls = 0;
  db.noPrices = false;
});

// ── Helpers ─────────────────────────────────────────────────────────────────

const req = (path: string, params: Record<string, string>) =>
  new NextRequest(`http://localhost${path}?${new URLSearchParams(params)}`);

async function readSheet(res: Response) {
  const raw = await res.arrayBuffer();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(raw);
  const ws = wb.worksheets[0];
  const values = (r: number) => (ws.getRow(r).values as unknown[]).slice(1);
  let headerRow = 0;
  for (let r = 1; r <= ws.rowCount; r++) {
    const first = ws.getRow(r).getCell(1).value;
    if (first === "Customer" || first === "Name") { headerRow = r; break; }
  }
  const header = values(headerRow);
  const body: unknown[][] = [];
  for (let r = headerRow + 1; r < ws.rowCount; r++) body.push(values(r));
  const stylesXml = await (await JSZip.loadAsync(raw)).file("xl/styles.xml")!.async("string");
  return { ws, headerRow, header, body, totals: values(ws.rowCount), info: [1, 2, 3, 4, 5].map(values), stylesXml };
}

// Excel stores the tab's calendar day as UTC midnight; map it back to the tab's string.
const cellDay = (v: unknown) => {
  const d = v as Date;
  return fmtReportDate(new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};
const num = (v: unknown) => (v === undefined || v === null ? null : (v as number));

type TabPledgeRow = {
  customerName: string; pledgeDate: string; releaseDate: string | null; itemName: string;
  netWeight: number; netWeightOfGold: number; netWeightOfSilver: number; loanAmount: number;
  interestAccrued: number; receivableAmount: number | null; ltv: number | null; status: string;
  riskTier?: ReportRiskTier;
};
type TabTotals = {
  count: number; goldWeight: number; silverWeight: number; netWeight: number;
  interestAccrued: number; receivableAmount: number; loanAmount: number;
};

// ── Tests ───────────────────────────────────────────────────────────────────

describe("Active Pledges export", () => {
  it("xlsx rows and totals equal the tab's for the same filters", async () => {
    seedPledges(40, 0);
    const filters = { startDate: "2026-09-10", endDate: "2026-10-20" };

    const tab = await (await pledgesTab(req("/api/reports/pledges", { status: "active", ...filters }))).json();
    const tabWhere = db.pledgeWheres.at(-1);
    const res = await exportRoute(req("/api/reports/export", { tab: "active", format: "xlsx", ...filters }));
    expect(res.status).toBe(200);
    expect(db.pledgeWheres.at(-1)).toEqual(tabWhere);
    expect(res.headers.get("Content-Disposition")).toBe('attachment; filename="active-pledges_2026-09-10_to_2026-10-20.xlsx"');

    const { header, body, totals, info, ws, headerRow, stylesXml } = await readSheet(res);
    expect(header).toEqual(["Customer", "Date", "Pledge", "Gold Wt", "Silver Wt", "Loan", "Interest", "Receivable", "LTV", "Risk Tier", "Status"]);
    expect(ws.views[0]).toMatchObject({ state: "frozen", ySplit: headerRow });
    expect(info[0][0]).toBe("श्री गणेश ज्वैलर्स");

    const rows = tab.rows as TabPledgeRow[];
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.length).toBeLessThan(40); // the date range actually filtered
    expect(body).toHaveLength(rows.length);
    rows.forEach((r, i) => {
      const c = body[i];
      expect(c[0]).toBe(r.customerName);
      expect(c[1]).toBeInstanceOf(Date);
      expect(cellDay(c[1])).toBe(r.pledgeDate);
      expect(c[2]).toBe(r.itemName);
      expect(c[3]).toBe(r.netWeightOfGold);
      expect(c[4]).toBe(r.netWeightOfSilver);
      expect(c[5]).toBe(r.loanAmount);
      expect(c[6]).toBe(r.interestAccrued);
      expect(c[7]).toBe(r.receivableAmount ?? r.loanAmount);
      expect(num(c[8])).toBe(r.ltv);
      expect(c[9]).toBe(REPORT_RISK_TIER_LABEL[r.riskTier!]);
      expect(c[10]).toBe("Active");
    });

    const t = tab.totals as TabTotals;
    expect(totals[0]).toBe(`Total (${t.count} pledges)`);
    expect(totals.slice(3, 8)).toEqual([t.goldWeight, t.silverWeight, t.loanAmount, t.interestAccrued, t.receivableAmount]);

    // The file holds the Indian format with its commas escaped as literals —
    // unescaped, Excel would read them as thousands separators (₹1,234,567).
    const xmlAttr = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/>/g, "&gt;");
    expect(stylesXml).toContain(`formatCode="${xmlAttr(MONEY_FMT_INDIAN)}"`);
    // Money columns (Loan, Interest, Receivable = 6–8) use it on every row and the totals row.
    // (exceljs's reader drops the backslashes, hence the comparison without them.)
    const indianAsRead = MONEY_FMT_INDIAN.replace(/\\/g, "");
    for (let r = headerRow + 1; r <= ws.rowCount; r++) {
      for (const col of [6, 7, 8]) expect(ws.getCell(r, col).numFmt).toBe(indianAsRead);
    }
  });

  it("never includes another tenant's, a deleted customer's, or a SOLD pledge", async () => {
    seedPledges(5, 0);
    const res = await exportRoute(req("/api/reports/export", { tab: "active", format: "xlsx" }));
    const { body } = await readSheet(res);
    expect(body).toHaveLength(5);
    expect(body.map((r) => r[0])).not.toContain("Other Tenant");
    expect(body.map((r) => r[0])).not.toContain("Deleted");
  });

  it("pdf under the limit returns a PDF with the dated filename", async () => {
    seedPledges(30, 0);
    const res = await exportRoute(req("/api/reports/export", { tab: "active", format: "pdf", startDate: "2026-10-01", endDate: "2026-10-31" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    expect(res.headers.get("Content-Disposition")).toBe('attachment; filename="active-pledges_2026-10-01_to_2026-10-31.pdf"');
    const bytes = Buffer.from(await res.arrayBuffer());
    expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("pdf above 1,000 rows is refused before any rows are loaded", async () => {
    seedPledges(1001, 0);
    const res = await exportRoute(req("/api/reports/export", { tab: "active", format: "pdf" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data).toMatchObject({ error: "PDF_ROW_LIMIT", count: 1001, limit: 1000 });
    expect(data.message).toMatch(/narrow the date range/);
    expect(db.findManyCalls).toBe(0);
  });
});

describe("Released Pledges export", () => {
  it("xlsx rows and totals equal the tab's (audit + legacy + null-receivable rows)", async () => {
    seedPledges(3, 60);
    const filters = { startDate: "2026-10-05", endDate: "2026-10-25" };

    const tab = await (await pledgesTab(req("/api/reports/pledges", { status: "released", ...filters }))).json();
    const tabWhere = db.pledgeWheres.at(-1);
    const res = await exportRoute(req("/api/reports/export", { tab: "released", format: "xlsx", ...filters }));
    expect(db.pledgeWheres.at(-1)).toEqual(tabWhere);

    const { header, body, totals } = await readSheet(res);
    expect(header).toEqual(["Customer", "Date", "Released", "Pledge", "Net Wt", "Loan", "Interest", "Receivable", "LTV", "Status"]);

    const rows = tab.rows as TabPledgeRow[];
    expect(rows.some((r) => r.receivableAmount === null)).toBe(true); // fallback path exercised
    expect(rows.some((r) => r.ltv === null)).toBe(true);              // legacy no-audit path exercised
    expect(body).toHaveLength(rows.length);
    rows.forEach((r, i) => {
      const c = body[i];
      expect(c[0]).toBe(r.customerName);
      expect(cellDay(c[1])).toBe(r.pledgeDate);
      expect(cellDay(c[2])).toBe(r.releaseDate);
      expect(c[3]).toBe(r.itemName);
      expect(c[4]).toBe(r.netWeight);
      expect(c[5]).toBe(r.loanAmount);
      expect(c[6]).toBe(r.interestAccrued);
      expect(c[7]).toBe(r.receivableAmount ?? r.loanAmount);
      expect(num(c[8])).toBe(r.ltv);
      expect(c[9]).toBe("Released");
    });

    const t = tab.totals as TabTotals;
    expect(totals[0]).toBe(`Total (${t.count} pledges)`);
    expect(totals.slice(4, 8)).toEqual([t.netWeight, t.loanAmount, t.interestAccrued, t.receivableAmount]);
  });

  it("xlsx exports every row when the tab is over its 5,000-row cap", async () => {
    seedPledges(0, 5001);
    const tabRes = await pledgesTab(req("/api/reports/pledges", { status: "released" }));
    expect(tabRes.status).toBe(400);
    expect((await tabRes.json()).error).toBe("TOO_MANY_RECORDS");

    const res = await exportRoute(req("/api/reports/export", { tab: "released", format: "xlsx" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Disposition")).toMatch(/^attachment; filename="released-pledges_all-time_\d{4}-\d{2}-\d{2}\.xlsx"$/);
    const { body, totals } = await readSheet(res);
    expect(body).toHaveLength(5001);
    expect(totals[0]).toBe("Total (5001 pledges)");
  }, 30_000);
});

describe("Customer Report export", () => {
  it("xlsx rows equal the tab's, with a totals row of count / pledges / loan", async () => {
    seedCustomers();
    const filters = { startDate: "2026-10-02", endDate: "2026-10-11", activeOnly: "true" };

    const tab = (await (await customersTab(req("/api/reports/customers", filters))).json()) as {
      name: string; mobile: string | null; address: string | null; pledgeCount: number;
      totalLoan: number; createdAt: string; riskScore: number; riskTier: string;
    }[];
    const tabWhere = db.customerWheres.at(-1);
    const res = await exportRoute(req("/api/reports/export", { tab: "customers", format: "xlsx", ...filters }));
    expect(db.customerWheres.at(-1)).toEqual(tabWhere);
    expect(res.headers.get("Content-Disposition")).toBe('attachment; filename="customer-report_2026-10-02_to_2026-10-11.xlsx"');

    const { header, body, totals } = await readSheet(res);
    expect(header).toEqual(["Name", "Mobile", "Address", "Pledges", "Loan", "Added On", "Risk Score", "Risk Tier"]);
    expect(tab.length).toBeGreaterThan(0);
    expect(body).toHaveLength(tab.length);
    tab.forEach((r, i) => {
      const c = body[i];
      expect(c[0]).toBe(r.name);
      expect(c[1] ?? null).toBe(r.mobile);
      expect(c[2] ?? null).toBe(r.address);
      expect(c[3]).toBe(r.pledgeCount);
      expect(c[4]).toBe(r.totalLoan);
      expect(cellDay(c[5])).toBe(r.createdAt);
      expect(c[6]).toBe(r.riskScore);
      expect(c[7]).toBe(r.riskTier === "AT_RISK" ? "AT RISK" : r.riskTier);
    });

    expect(totals[0]).toBe(`Total (${tab.length} customer${tab.length !== 1 ? "s" : ""})`);
    expect(totals[3]).toBe(tab.reduce((s, r) => s + r.pledgeCount, 0));
    expect(totals[4]).toBe(Math.round(tab.reduce((s, r) => s + r.totalLoan, 0) * 100) / 100);
  });

  it("pdf renders Hindi names without error", async () => {
    seedCustomers();
    const res = await exportRoute(req("/api/reports/export", { tab: "customers", format: "pdf" }));
    expect(res.status).toBe(200);
    expect(Buffer.from(await res.arrayBuffer()).subarray(0, 5).toString()).toBe("%PDF-");
  });
});

// ── Risk-tier filter (Active Pledges) ───────────────────────────────────────

// Gold weights chosen so a ₹50,000 loan pledged this month lands in each tier
// at ₹9,500/g: 10g ≈ 53% SAFE, 7.8g ≈ 69% WATCH, 6.5g ≈ 82% AT_RISK,
// 4g > 100% UNDERWATER, no metal at all → no market value → UNKNOWN.
const TIER_GOLD_WEIGHTS = ["10", "7.8", "6.5", "4", "0"];

function seedTieredActive(n: number) {
  const ps: PledgeFx[] = [];
  for (let i = 0; i < n; i++) {
    ps.push(makePledge(i, {
      pledgeDate: new Date(Date.UTC(2026, 9, 1 + (i % 28))),
      loanAmount: D(50000),
      netWeightOfGold: D(TIER_GOLD_WEIGHTS[i % TIER_GOLD_WEIGHTS.length]),
      netWeightOfSilver: D(0),
    }));
  }
  ps.push(makePledge(9001, { customer: { userId: "intruder", deletedAt: null, name: "Other Tenant", mobile: null } }));
  db.pledges = ps;
}

const activeTab = async (params: Record<string, string> = {}) => {
  const res = await pledgesTab(req("/api/reports/pledges", { status: "active", ...params }));
  expect(res.status).toBe(200);
  return (await res.json()) as { rows: TabPledgeRow[]; totals: TabTotals; tierCounts: Record<ReportRiskTier, number> };
};

const round2 = (n: number) => Math.round(n * 100) / 100;
const sumTotals = (rows: TabPledgeRow[]): TabTotals => ({
  count: rows.length,
  goldWeight: round2(rows.reduce((s, r) => s + r.netWeightOfGold, 0)),
  silverWeight: round2(rows.reduce((s, r) => s + r.netWeightOfSilver, 0)),
  netWeight: round2(rows.reduce((s, r) => s + r.netWeight, 0)),
  interestAccrued: round2(rows.reduce((s, r) => s + r.interestAccrued, 0)),
  receivableAmount: round2(rows.reduce((s, r) => s + (r.receivableAmount ?? r.loanAmount), 0)),
  loanAmount: round2(rows.reduce((s, r) => s + r.loanAmount, 0)),
});

describe("Active Pledges risk-tier filter", () => {
  beforeEach(() => {
    // Pin "now" so accrued interest — and therefore each fixture's tier — is stable.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-31T12:00:00+05:30"));
    return () => vi.useRealTimers();
  });

  it("fixtures cover every tier, and each row's tier is getRiskTier(ltv) / UNKNOWN for null", async () => {
    seedTieredActive(25);
    const { rows, tierCounts } = await activeTab();
    for (const t of REPORT_RISK_TIERS) expect(tierCounts[t]).toBeGreaterThan(0);
    for (const r of rows) expect(r.riskTier).toBe(r.ltv === null ? "UNKNOWN" : getRiskTier(r.ltv));
  });

  it("returns only rows in the selected tiers", async () => {
    seedTieredActive(25);
    const all = (await activeTab()).rows;
    const { rows } = await activeTab({ tiers: "AT_RISK,UNDERWATER" });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.riskTier === "AT_RISK" || r.riskTier === "UNDERWATER")).toBe(true);
    expect(rows.length).toBe(all.filter((r) => r.riskTier === "AT_RISK" || r.riskTier === "UNDERWATER").length);
  });

  it("totals equal the sum of the filtered rows", async () => {
    seedTieredActive(25);
    const { rows, totals } = await activeTab({ tiers: "WATCH,UNKNOWN" });
    expect(totals).toEqual(sumTotals(rows));
  });

  it("chip counts add up to the unfiltered total, whatever is selected", async () => {
    seedTieredActive(25);
    const unfiltered = await activeTab();
    const filtered = await activeTab({ tiers: "SAFE" });
    for (const { tierCounts } of [unfiltered, filtered]) {
      const sum = REPORT_RISK_TIERS.reduce((s, t) => s + tierCounts[t], 0);
      expect(sum).toBe(unfiltered.rows.length);
      expect(sum).toBe(unfiltered.totals.count);
    }
    expect(filtered.tierCounts).toEqual(unfiltered.tierCounts);
    for (const t of REPORT_RISK_TIERS) {
      expect(unfiltered.tierCounts[t]).toBe(unfiltered.rows.filter((r) => r.riskTier === t).length);
    }
  });

  it("no metal price → every row is UNKNOWN, and appears only under Unknown (never Safe)", async () => {
    seedTieredActive(10);
    db.noPrices = true;
    const all = await activeTab();
    expect(all.rows.every((r) => r.ltv === null && r.riskTier === "UNKNOWN")).toBe(true);
    expect(all.tierCounts).toEqual({ SAFE: 0, WATCH: 0, AT_RISK: 0, UNDERWATER: 0, UNKNOWN: 10 });
    expect((await activeTab({ tiers: "SAFE" })).rows).toHaveLength(0);
    expect((await activeTab({ tiers: "UNKNOWN" })).rows).toHaveLength(10);
  });

  it("zero-weight pledges (no market value) are UNKNOWN even when prices exist", async () => {
    seedTieredActive(25);
    const { rows } = await activeTab({ tiers: "SAFE" });
    expect(rows.every((r) => r.ltv !== null)).toBe(true);
    const unknown = (await activeTab({ tiers: "UNKNOWN" })).rows;
    expect(unknown.length).toBeGreaterThan(0);
    expect(unknown.every((r) => r.ltv === null)).toBe(true);
  });

  it("ignores unknown tier values; a param of only bad values means no filter", async () => {
    expect(parseRiskTiers("underwater, BOGUS,at_risk,AT_RISK")).toEqual(["AT_RISK", "UNDERWATER"]);
    expect(parseRiskTiers("")).toEqual([]);
    seedTieredActive(25);
    const all = await activeTab();
    expect((await activeTab({ tiers: "BOGUS,,x" })).rows).toHaveLength(all.rows.length);
  });

  it("xlsx with a tier filter: rows and totals equal the tab's, filter listed in the info block", async () => {
    seedTieredActive(25);
    const filters = { startDate: "2026-10-01", endDate: "2026-10-31", tiers: "AT_RISK,UNDERWATER" };
    const tab = await activeTab(filters);
    const res = await exportRoute(req("/api/reports/export", { tab: "active", format: "xlsx", ...filters }));
    expect(res.status).toBe(200);
    const { body, totals, info } = await readSheet(res);

    expect(info[3][1]).toContain("Risk tiers: At Risk, Underwater");
    expect(body).toHaveLength(tab.rows.length);
    tab.rows.forEach((r, i) => {
      const c = body[i];
      expect(c[0]).toBe(r.customerName);
      expect(cellDay(c[1])).toBe(r.pledgeDate);
      expect([c[3], c[4], c[5], c[6], c[7]]).toEqual([
        r.netWeightOfGold, r.netWeightOfSilver, r.loanAmount, r.interestAccrued, r.receivableAmount ?? r.loanAmount,
      ]);
      expect(num(c[8])).toBe(r.ltv);
      expect(c[9]).toBe(REPORT_RISK_TIER_LABEL[r.riskTier!]);
    });
    const t = tab.totals;
    expect(totals[0]).toBe(`Total (${t.count} pledge${t.count !== 1 ? "s" : ""})`);
    expect(totals.slice(3, 8)).toEqual([t.goldWeight, t.silverWeight, t.loanAmount, t.interestAccrued, t.receivableAmount]);
  });

  it("without a tier filter the info block says 'Risk tiers: All'", async () => {
    seedTieredActive(5);
    const { info } = await readSheet(await exportRoute(req("/api/reports/export", { tab: "active", format: "xlsx" })));
    expect(info[3][1]).toContain("Risk tiers: All");
  });

  it("the PDF limit applies to the FILTERED count", async () => {
    seedTieredActive(1005); // 201 per tier
    const over = await exportRoute(req("/api/reports/export", { tab: "active", format: "pdf" }));
    expect(over.status).toBe(400);
    expect((await over.json()).count).toBe(1005);

    const under = await exportRoute(req("/api/reports/export", { tab: "active", format: "pdf", tiers: "AT_RISK,UNDERWATER" }));
    expect(under.status).toBe(200);
    expect(under.headers.get("Content-Type")).toBe("application/pdf");

    const stillOver = await exportRoute(
      req("/api/reports/export", { tab: "active", format: "pdf", tiers: "SAFE,WATCH,AT_RISK,UNDERWATER,UNKNOWN" })
    );
    expect(stillOver.status).toBe(400);
    expect(await stillOver.json()).toMatchObject({ error: "PDF_ROW_LIMIT", count: 1005 });
  }, 30_000);

  it("Released tab ignores the tiers param", async () => {
    seedPledges(0, 20);
    const plain = await (await pledgesTab(req("/api/reports/pledges", { status: "released" }))).json();
    const withTiers = await (await pledgesTab(req("/api/reports/pledges", { status: "released", tiers: "SAFE" }))).json();
    expect(withTiers).toEqual(plain);
    expect(plain.tierCounts).toBeUndefined();
  });
});

describe("Excel money format", () => {
  it("uses Indian grouping for zero and positive amounts, plain grouping for negatives", () => {
    expect(moneyNumFmt(0)).toBe(MONEY_FMT_INDIAN);
    expect(moneyNumFmt(1234567)).toBe(MONEY_FMT_INDIAN);
    expect(moneyNumFmt(-500)).toBe(MONEY_FMT_PLAIN);
    expect(moneyNumFmt(null)).toBe(MONEY_FMT_INDIAN);
  });

  it("the Indian format splits at 1 crore and 1 lakh with lakh/crore comma positions", () => {
    const [crore, lakh, rest] = MONEY_FMT_INDIAN.split(";");
    expect(crore).toBe('[>=10000000]"₹"##\\,##\\,##\\,##0.00'); // ₹1,23,45,678.00
    expect(lakh).toBe('[>=100000]"₹"##\\,##\\,##0.00');            // ₹12,34,567.00
    expect(rest).toBe('"₹"##,##0.00');                               // ₹99,999.00
  });
});

describe("export route validation", () => {
  it("rejects an unknown tab or format", async () => {
    expect((await exportRoute(req("/api/reports/export", { tab: "sold", format: "xlsx" }))).status).toBe(400);
    expect((await exportRoute(req("/api/reports/export", { tab: "active", format: "csv" }))).status).toBe(400);
  });

  it("rejects a reversed range on pledge tabs, like the tab does", async () => {
    const res = await exportRoute(req("/api/reports/export", { tab: "released", format: "xlsx", startDate: "2026-10-31", endDate: "2026-10-01" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("INVALID_RANGE");
  });
});
