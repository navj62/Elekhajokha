// lib/reports/reportQueries.ts
//
// The single query + row-building path for the three Reports tabs. Both the
// tab routes (/api/reports/pledges, /api/reports/customers) and the export
// route (/api/reports/export) call these, so an export is by construction the
// same rows and totals the owner is looking at. Rows carry raw Date values;
// the tab routes format them with the to*Json helpers, the export keeps them
// as real dates.
import { Prisma } from "@prisma/client";
import type { CompoundingDuration } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { calculateLTV, daysToUnderwater } from "@/lib/calculateLTV";
import { computeCustomerRiskScore } from "@/lib/customerRiskScore";
import { OPEN_PLEDGE_STATUSES, isOpenPledgeStatus } from "@/lib/pledgeConstants";
import {
  emptyRiskTierCounts,
  reportRiskTier,
  type ReportRiskTier,
} from "@/lib/reports/riskTierFilter";

const round2 = (n: number) => Math.round(n * 100) / 100;

export const PLEDGE_ROW_CAP = 5000; // Vercel Hobby 10s safety margin — on-screen tabs only

// ── Date range ──────────────────────────────────────────────────────────────

export interface DateRange {
  start?: Date;
  end?: Date;
}

// Parse an IST-day boundary. <input type="date"> sends "YYYY-MM-DD" with no
// timezone; treat it as an India/Kolkata (+05:30) wall-clock boundary.
export function istBoundary(dateStr: string, endOfDay: boolean): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    // Fall back to permissive parse for full ISO strings.
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }
  const suffix = endOfDay ? "T23:59:59.999+05:30" : "T00:00:00.000+05:30";
  const d = new Date(`${dateStr}${suffix}`);
  return isNaN(d.getTime()) ? null : d;
}

export type DateRangeResult =
  | { ok: true; range: DateRange }
  | { ok: false; error: "INVALID_DATE"; message: string };

export function parseDateRange(startStr: string | null, endStr: string | null): DateRangeResult {
  const range: DateRange = {};
  if (startStr) {
    const d = istBoundary(startStr, false);
    if (!d) return { ok: false, error: "INVALID_DATE", message: "Invalid startDate." };
    range.start = d;
  }
  if (endStr) {
    const d = istBoundary(endStr, true);
    if (!d) return { ok: false, error: "INVALID_DATE", message: "Invalid endDate." };
    range.end = d;
  }
  return { ok: true, range };
}

export const fmtReportDate = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

// ── Pledge reports (Active / Released tabs + legacy stats-strip path) ───────

/** null = legacy "all" path used by the Reports stats strip. */
export type PledgeReportStatus = "active" | "released" | null;

export function pledgeReportQuery(userId: string, status: PledgeReportStatus, range: DateRange) {
  // Ownership always scoped via relation.
  const base: Prisma.PledgeWhereInput = {
    customer: { userId, deletedAt: null },
  };
  const dateFilter: Prisma.DateTimeFilter = {};
  if (range.start) dateFilter.gte = range.start;
  if (range.end) dateFilter.lte = range.end;
  const hasRange = Boolean(range.start || range.end);

  let where: Prisma.PledgeWhereInput;
  let orderBy: Prisma.PledgeOrderByWithRelationInput;
  if (status === "active") {
    where = { ...base, status: "ACTIVE", ...(hasRange ? { pledgeDate: dateFilter } : {}) };
    orderBy = { pledgeDate: "desc" };
  } else if (status === "released") {
    where = { ...base, status: "RELEASED", ...(hasRange ? { releaseDate: dateFilter } : {}) };
    orderBy = { releaseDate: "desc" };
  } else {
    // Legacy "all" path — unfiltered, uncapped.
    where = base;
    orderBy = { pledgeDate: "desc" };
  }
  return { where, orderBy };
}

export function countPledgeReport(userId: string, status: PledgeReportStatus, range: DateRange) {
  return prisma.pledge.count({ where: pledgeReportQuery(userId, status, range).where });
}

export interface PledgeReportRow {
  customerName: string;
  pledgeDate: Date;
  releaseDate: Date | null;
  itemType: string;
  itemName: string;
  netWeight: number;         // combined (released only)
  netWeightOfGold: number;   // separate (active only)
  netWeightOfSilver: number; // separate (active only)
  loanAmount: number;
  interestAccrued: number;
  receivableAmount: number | null;
  marketValue: number | null;
  ltv: number | null;
  /** Active rows only — getRiskTier on `ltv`, UNKNOWN when ltv is null. */
  riskTier?: ReportRiskTier;
  status: string;
}

export interface PledgeReportTotals {
  count: number;
  goldWeight: number;
  silverWeight: number;
  netWeight: number;
  interestAccrued: number;
  receivableAmount: number;
  loanAmount: number;
}

// "NECKLACE" → "Necklace"
const titleCase = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

function labelOf(
  items: { itemName: string | null; itemType: string; metalType: string }[],
  itemCount: number
) {
  const firstItem = items[0];
  const extraItems = itemCount - 1;
  return {
    itemName: firstItem
      ? (firstItem.itemName?.trim() || titleCase(firstItem.metalType)) +
        (extraItems > 0 ? ` +${extraItems}` : "")
      : "—",
    itemType: firstItem ? firstItem.itemType : "—",
  };
}

const commonInclude = {
  customer: { select: { name: true, mobile: true } },
  // itemType/itemName live on PledgeItem, not Pledge. One row per pledge, so
  // fetch the first item as a representative label and count the rest for "+N".
  items: { take: 1, select: { itemName: true, itemType: true, metalType: true } },
  _count: { select: { items: true } },
} satisfies Prisma.PledgeInclude;

/** Uncapped — callers enforce their own row limit with countPledgeReport first. */
export async function getPledgeReportRows(
  userId: string,
  status: PledgeReportStatus,
  range: DateRange
): Promise<PledgeReportRow[]> {
  const { where, orderBy } = pledgeReportQuery(userId, status, range);

  if (status === "released") {
    // RELEASED — pull the finalized values from the canonical RELEASED audit
    // snapshot; fall back to the Pledge row for legacy pledges with no audit.
    const pledges = await prisma.pledge.findMany({
      where,
      orderBy,
      include: {
        ...commonInclude,
        pledgeAudits: {
          where: { action: "RELEASED" },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            totalInterest: true,
            netWeightOfGold: true,
            netWeightOfSilver: true,
            ltvAtRelease: true,
          },
        },
      },
    });

    return pledges.map((p) => {
      const { itemName, itemType } = labelOf(p.items, p._count.items);
      const audit = p.pledgeAudits[0];

      const interestAccrued = audit
        ? Number(audit.totalInterest)
        : Number(p.totalInterest ?? 0);
      const netWeight = audit
        ? Number(audit.netWeightOfGold) + Number(audit.netWeightOfSilver)
        : Number(p.netWeightOfGold) + Number(p.netWeightOfSilver);
      const ltv = audit?.ltvAtRelease != null ? Number(audit.ltvAtRelease) : null;

      return {
        customerName: p.customer?.name ?? "—",
        pledgeDate: p.pledgeDate,
        releaseDate: p.releaseDate,
        itemType,
        itemName,
        netWeight: round2(netWeight),
        netWeightOfGold: 0, // combined in released; not split
        netWeightOfSilver: 0,
        loanAmount: Number(p.loanAmount),
        interestAccrued: round2(interestAccrued),
        receivableAmount: p.receivableAmount ? Number(p.receivableAmount) : null,
        marketValue: null,
        ltv,
        status: p.status,
      };
    });
  }

  if (status === "active") {
    // ACTIVE — live interest + LTV via the canonical calculateLTV helper
    // (same path the financial-summary page uses). Prices fetched ONCE.
    const [goldPrice, silverPrice] = await Promise.all([
      prisma.metalPrice.findFirst({ where: { metal: "GOLD" }, orderBy: { createdAt: "desc" } }),
      prisma.metalPrice.findFirst({ where: { metal: "SILVER" }, orderBy: { createdAt: "desc" } }),
    ]);
    const goldPpg = goldPrice ? parseFloat(goldPrice.inrPerGram.toString()) : null;
    const silverPpg = silverPrice ? parseFloat(silverPrice.inrPerGram.toString()) : null;
    const now = new Date();

    const pledges = await prisma.pledge.findMany({ where, orderBy, include: commonInclude });

    return pledges.map((p) => {
      const { itemName, itemType } = labelOf(p.items, p._count.items);
      const goldWeight = Number(p.netWeightOfGold);
      const silverWeight = Number(p.netWeightOfSilver);

      const ltvResult = calculateLTV({
        principal: Number(p.loanAmount),
        rate: Number(p.interestRate),
        pledgeDate: new Date(p.pledgeDate),
        currentDate: now,
        allowCompounding: p.allowCompounding,
        compoundingDuration: p.compoundingDuration as CompoundingDuration,
        goldWeight,
        silverWeight,
        goldPrice: goldPpg,
        silverPrice: silverPpg,
      });
      // amountOwed = principal + accrued interest (single source of truth).
      const interestAccrued = ltvResult.amountOwed - Number(p.loanAmount);

      return {
        customerName: p.customer?.name ?? "—",
        pledgeDate: p.pledgeDate,
        releaseDate: null,
        itemType,
        itemName,
        netWeight: 0, // not used for active; split into gold/silver
        netWeightOfGold: round2(goldWeight),
        netWeightOfSilver: round2(silverWeight),
        loanAmount: Number(p.loanAmount),
        interestAccrued: round2(interestAccrued),
        receivableAmount: round2(ltvResult.amountOwed),
        marketValue: ltvResult.marketValue,
        ltv: ltvResult.ltv,
        riskTier: reportRiskTier(ltvResult.ltv),
        status: p.status,
      };
    });
  }

  // Legacy "all" path — stats strip only. No interest/weight/LTV computation.
  const pledges = await prisma.pledge.findMany({ where, orderBy, include: commonInclude });
  return pledges.map((p) => {
    const { itemName, itemType } = labelOf(p.items, p._count.items);
    return {
      customerName: p.customer?.name ?? "—",
      pledgeDate: p.pledgeDate,
      releaseDate: p.releaseDate,
      itemType,
      itemName,
      netWeight: 0,
      netWeightOfGold: 0,
      netWeightOfSilver: 0,
      loanAmount: Number(p.loanAmount),
      interestAccrued: 0,
      receivableAmount: p.receivableAmount ? Number(p.receivableAmount) : null,
      marketValue: null,
      ltv: null,
      status: p.status,
    };
  });
}

export function pledgeReportTotals(rows: PledgeReportRow[]): PledgeReportTotals {
  return {
    count: rows.length,
    goldWeight: round2(rows.reduce((s, r) => s + r.netWeightOfGold, 0)),
    silverWeight: round2(rows.reduce((s, r) => s + r.netWeightOfSilver, 0)),
    netWeight: round2(rows.reduce((s, r) => s + r.netWeight, 0)),
    interestAccrued: round2(rows.reduce((s, r) => s + r.interestAccrued, 0)),
    // A null receivable displays as the loan amount on screen; the total matches.
    receivableAmount: round2(rows.reduce((s, r) => s + (r.receivableAmount ?? r.loanAmount), 0)),
    loanAmount: round2(rows.reduce((s, r) => s + r.loanAmount, 0)),
  };
}

export interface ActivePledgeReport {
  /** Rows in the selected tiers (all rows when no tier is selected). */
  rows: PledgeReportRow[];
  /** Totals of `rows` — i.e. of the filtered rows only. */
  totals: PledgeReportTotals;
  /** Per-tier counts over the date range BEFORE the tier filter — the chip counts. */
  tierCounts: Record<ReportRiskTier, number>;
}

/**
 * The Active Pledges tab's data, shared by the tab route and the export. The
 * tier filter runs here, after each row's LTV is calculated, so the tab and
 * every file see the same rows and totals. Uncapped — callers enforce limits.
 */
export async function getActivePledgeReport(
  userId: string,
  range: DateRange,
  tiers: readonly ReportRiskTier[]
): Promise<ActivePledgeReport> {
  const all = await getPledgeReportRows(userId, "active", range);
  const tierCounts = emptyRiskTierCounts();
  for (const r of all) tierCounts[r.riskTier ?? "UNKNOWN"]++;
  const selected = new Set(tiers);
  const rows = selected.size ? all.filter((r) => selected.has(r.riskTier ?? "UNKNOWN")) : all;
  return { rows, totals: pledgeReportTotals(rows), tierCounts };
}

/** The tab's JSON row shape: 1-based index, dates as display strings. */
export function toPledgeReportJson(rows: PledgeReportRow[]) {
  return rows.map((r, i) => ({
    index: i + 1,
    ...r,
    pledgeDate: fmtReportDate(r.pledgeDate),
    releaseDate: r.releaseDate ? fmtReportDate(r.releaseDate) : null,
  }));
}

// ── Customer report ─────────────────────────────────────────────────────────

export function customerReportWhere(
  userId: string,
  range: DateRange,
  activeOnly: boolean
): Prisma.CustomerWhereInput {
  // NOTE: Customer has no event-time column, so the range filters createdAt —
  // the import timestamp for ~2,101 ledger-migrated customers (see CLAUDE.md).
  return {
    userId,
    deletedAt: null,
    ...(activeOnly
      ? { pledges: { some: { status: { in: [...OPEN_PLEDGE_STATUSES] } } } }
      : {}),
    ...(range.start || range.end
      ? {
          createdAt: {
            ...(range.start ? { gte: range.start } : {}),
            ...(range.end ? { lte: range.end } : {}),
          },
        }
      : {}),
  };
}

export function countCustomerReport(userId: string, range: DateRange, activeOnly: boolean) {
  return prisma.customer.count({ where: customerReportWhere(userId, range, activeOnly) });
}

export interface CustomerReportRow {
  id: string;
  name: string;
  mobile: string | null;
  address: string | null;
  createdAt: Date;
  pledgeCount: number;
  totalLoan: number;
  riskScore: number;
  riskTier: "SAFE" | "WATCH" | "AT_RISK" | "CRITICAL";
}

export interface CustomerReportTotals {
  count: number;
  pledgeCount: number;
  totalLoan: number;
}

export async function getCustomerReportRows(
  userId: string,
  range: DateRange,
  activeOnly: boolean
): Promise<CustomerReportRow[]> {
  // Fetch metal prices once for risk score LTV computation
  const [goldPrice, silverPrice] = await Promise.all([
    prisma.metalPrice.findFirst({
      where: { metal: "GOLD" },
      orderBy: { createdAt: "desc" },
      select: { inrPerGram: true },
    }),
    prisma.metalPrice.findFirst({
      where: { metal: "SILVER" },
      orderBy: { createdAt: "desc" },
      select: { inrPerGram: true },
    }),
  ]);
  const goldPpg = goldPrice ? Number(goldPrice.inrPerGram) : null;
  const silverPpg = silverPrice ? Number(silverPrice.inrPerGram) : null;
  const now = new Date();

  const customers = await prisma.customer.findMany({
    where: customerReportWhere(userId, range, activeOnly),
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      mobile: true,
      address: true,
      createdAt: true,
      pledges: {
        select: {
          status: true,
          loanAmount: true,
          interestRate: true,
          pledgeDate: true,
          allowCompounding: true,
          compoundingDuration: true,
          netWeightOfGold: true,
          netWeightOfSilver: true,
          lastMarketValue: true,
        },
      },
    },
  });

  return customers.map((c) => {
    // Only open pledges — count and current loan outstanding.
    // OVERDUE is open (non-terminal) like ACTIVE; RELEASED and SOLD are terminal.
    const activePledges = c.pledges.filter((p) => isOpenPledgeStatus(p.status));
    const pledgeCount = activePledges.length;
    const totalLoan = activePledges.reduce((s, p) => s + Number(p.loanAmount), 0);

    let totalAmountOwed = 0;
    let totalMarketValue = 0;
    let largestPledgeMarketValue = 0;
    let daysToUnderwaterWorst: number | null = null;

    for (const p of activePledges) {
      const loanAmount = Number(p.loanAmount);
      const interestRate = Number(p.interestRate);
      const goldW = Number(p.netWeightOfGold);
      const silverW = Number(p.netWeightOfSilver);

      const ltvResult = calculateLTV({
        principal: loanAmount,
        rate: interestRate,
        pledgeDate: new Date(p.pledgeDate),
        currentDate: now,
        allowCompounding: p.allowCompounding,
        compoundingDuration: p.compoundingDuration as CompoundingDuration,
        goldWeight: goldW,
        silverWeight: silverW,
        goldPrice: goldPpg,
        silverPrice: silverPpg,
      });
      const receivableAmount = ltvResult.amountOwed;
      totalAmountOwed += receivableAmount;

      // Prefer live prices; fall back to cached lastMarketValue
      const marketValue =
        ltvResult.marketValue ??
        (p.lastMarketValue != null ? Number(p.lastMarketValue) : null);

      if (marketValue !== null) {
        totalMarketValue += marketValue;
        if (marketValue > largestPledgeMarketValue) largestPledgeMarketValue = marketValue;
        const dtu = daysToUnderwater(loanAmount, interestRate, receivableAmount, marketValue);
        if (dtu !== null) {
          if (dtu === 0 || daysToUnderwaterWorst === null || dtu < daysToUnderwaterWorst) {
            daysToUnderwaterWorst = dtu;
          }
        }
      }
    }

    const currentLtv =
      totalMarketValue > 0
        ? parseFloat(((totalAmountOwed / totalMarketValue) * 100).toFixed(2))
        : null;

    const avgPledgeAgeMonths =
      activePledges.length === 0
        ? 0
        : activePledges.reduce((sum, p) => {
            return sum + (now.getTime() - new Date(p.pledgeDate).getTime()) / (1000 * 60 * 60 * 24 * 30.4375);
          }, 0) / activePledges.length;

    const { score: riskScore, tier: riskTier } = computeCustomerRiskScore({
      currentLtv,
      ltvThirtyDaysAgo: null, // velocity component omitted for report efficiency
      daysToUnderwaterWorst,
      largestPledgeMarketValue,
      totalMarketValue,
      avgPledgeAgeMonths,
    });

    return {
      id: c.id,
      name: c.name,
      mobile: c.mobile,
      address: c.address,
      createdAt: c.createdAt,
      pledgeCount,
      totalLoan,
      riskScore,
      riskTier,
    };
  });
}

/** Export-only — the Customer tab shows no totals. */
export function customerReportTotals(rows: CustomerReportRow[]): CustomerReportTotals {
  return {
    count: rows.length,
    pledgeCount: rows.reduce((s, r) => s + r.pledgeCount, 0),
    totalLoan: round2(rows.reduce((s, r) => s + r.totalLoan, 0)),
  };
}

/** The tab's JSON row shape: createdAt as a display string. */
export function toCustomerReportJson(rows: CustomerReportRow[]) {
  return rows.map((r) => ({ ...r, createdAt: fmtReportDate(r.createdAt) }));
}
