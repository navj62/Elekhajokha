"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Archive, Unlock, ReceiptText, Phone, MapPin, Download,
  RefreshCw, ImageOff, Loader2, Plus,
} from "lucide-react";

import {
  calculateLTV, getRiskTier, daysToUnderwater, RISK_TIER_BOUNDARIES,
  type RiskTier,
} from "@/lib/calculateLTV";
import { calculateHybridInterest } from "@/lib/interest";
import { isOpenPledgeStatus, LTV_MAX_5_2 } from "@/lib/pledgeConstants";
import { cn } from "@/lib/utils";
import Sheet from "@/components/ui/Sheet";
import { Input } from "@/components/ui/input";
import StickyActions from "@/components/ui/StickyActions";
import DataTable, { StatusBadge, type BadgeTone, type DataTableColumn } from "@/components/ui/DataTable";

/* -------------------------------------------------------------------------- */
/* Types                                                                       */
/* -------------------------------------------------------------------------- */
// Prisma Decimal columns arrive as strings. They are converted to numbers
// ONCE, in normalize() below, so every helper downstream receives real
// numbers rather than relying on string coercion.

type PledgeStatus = "ACTIVE" | "OVERDUE" | "RELEASED" | "SOLD";
type Compounding = "MONTHLY" | "HALFYEARLY" | "YEARLY";
type TxnType = "REPAYMENT_PRINCIPAL" | "REPAYMENT_INTEREST" | "TOPUP";
type Decimalish = string | number | null | undefined;

interface PledgeItem {
  id: string;
  itemType: string;
  metalType: string;
  itemName: string | null;
  quantity: number;
  grossWeight: number;
  purity: number;
  netWeightOfMetal: number;
}

interface Transaction {
  id: string;
  amount: number;
  type: TxnType;
  note: string | null;
  createdAt: string;
}

interface ClosingAudit {
  action: "RELEASED" | "SOLD";
  releaseDate: string | null;
  createdAt: string;
  receivableAmount: number | null;
  totalInterest: number | null;
  goldPricePerGram: number | null;
  silverPricePerGram: number | null;
  marketValueAtRelease: number | null;
  ltvAtRelease: number | null;
}

interface PledgeDetail {
  id: string;
  pledgeDate: string;
  status: PledgeStatus;
  loanAmount: number;
  interestRate: number;
  compoundingDuration: Compounding;
  allowCompounding: boolean;
  netWeightOfGold: number;
  netWeightOfSilver: number;
  totalInterest: number | null;
  receivableAmount: number | null;
  releaseDate: string | null;
  remark: string | null;
  itemPhoto: string | null;
  items: PledgeItem[];
  customer: {
    id: string;
    name: string;
    mobile: string | null;
    address: string | null;
    region: string | null;
  };
}

interface PricePoint {
  inrPerGram: number;
  createdAt: string;
}

interface LoadedData {
  pledge: PledgeDetail;
  transactions: Transaction[];
  /** Price recorded on the pledge's IST day, per metal. null = none that day. */
  pricesAtPledge: { gold: PricePoint | null; silver: PricePoint | null };
  closingAudit: ClosingAudit | null;
  customerStats: { openPledgeCount: number; firstPledgeDate: string | null };
}

interface MarketRates {
  gold: PricePoint | null;
  silver: PricePoint | null;
}

/* -------------------------------------------------------------------------- */
/* Normalisation                                                               */
/* -------------------------------------------------------------------------- */
function num(v: Decimalish): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function price(row: { inrPerGram: Decimalish; createdAt: string } | null | undefined): PricePoint | null {
  const p = num(row?.inrPerGram);
  return row && p !== null ? { inrPerGram: p, createdAt: row.createdAt } : null;
}

/* eslint-disable @typescript-eslint/no-explicit-any -- raw JSON boundary */
function normalize(raw: any): LoadedData {
  const p = raw.pledge;
  const a = raw.closingAudit;
  return {
    pledge: {
      ...p,
      loanAmount: num(p.loanAmount) ?? 0,
      interestRate: num(p.interestRate) ?? 0,
      netWeightOfGold: num(p.netWeightOfGold) ?? 0,
      netWeightOfSilver: num(p.netWeightOfSilver) ?? 0,
      totalInterest: num(p.totalInterest),
      receivableAmount: num(p.receivableAmount),
      items: (p.items ?? []).map((i: any) => ({
        id: i.id,
        itemType: i.itemType,
        metalType: i.metalType,
        itemName: i.itemName,
        quantity: i.quantity,
        grossWeight: num(i.grossWeight) ?? 0,
        purity: num(i.purity) ?? 0,
        netWeightOfMetal: num(i.netWeightOfMetal) ?? 0,
      })),
    },
    transactions: (raw.transactions ?? []).map((t: any) => ({
      ...t,
      amount: num(t.amount) ?? 0,
    })),
    pricesAtPledge: {
      gold: price(raw.pricesAtPledge?.gold),
      silver: price(raw.pricesAtPledge?.silver),
    },
    closingAudit: a
      ? {
          action: a.action,
          releaseDate: a.releaseDate,
          createdAt: a.createdAt,
          receivableAmount: num(a.receivableAmount),
          totalInterest: num(a.totalInterest),
          goldPricePerGram: num(a.goldPricePerGram),
          silverPricePerGram: num(a.silverPricePerGram),
          marketValueAtRelease: num(a.marketValueAtRelease),
          ltvAtRelease: num(a.ltvAtRelease),
        }
      : null,
    customerStats: {
      openPledgeCount: raw.customerStats?.openPledgeCount ?? 0,
      firstPledgeDate: raw.customerStats?.firstPledgeDate ?? null,
    },
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

type FetchResult =
  | { ok: true; data: LoadedData; market: MarketRates | null }
  | { ok: false; error: string };

async function fetchPledge(customerId: string, pledgeId: string): Promise<FetchResult> {
  try {
    const [pledgeRes, marketRes] = await Promise.all([
      fetch(`/api/customers/${customerId}/pledges/${pledgeId}`),
      fetch("/api/market-rates"),
    ]);
    if (!pledgeRes.ok) {
      return { ok: false, error: pledgeRes.status === 404 ? "Pledge not found" : "Failed to load pledge" };
    }
    const raw = await pledgeRes.json();
    if (!raw?.pledge?.id) return { ok: false, error: "Failed to load pledge" };

    let market: MarketRates | null = null;
    if (marketRes.ok) {
      const m = await marketRes.json();
      market = { gold: price(m?.gold), silver: price(m?.silver) };
    }
    return { ok: true, data: normalize(raw), market };
  } catch {
    return { ok: false, error: "Failed to load pledge" };
  }
}

/* -------------------------------------------------------------------------- */
/* Formatting                                                                  */
/* -------------------------------------------------------------------------- */
const DAY_MS = 1000 * 60 * 60 * 24;

/** Exact rupees. Unknown is always "—", never ₹0. */
function fmtINR(n: number | null | undefined) {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 2,
  }).format(n);
}
function fmtSignedINR(n: number) {
  return `${n >= 0 ? "+" : "−"}${fmtINR(Math.abs(n))}`;
}
function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", hour: "numeric", minute: "2-digit",
  });
}
function fmtGrams(g: number) {
  return `${g.toLocaleString("en-IN", { maximumFractionDigits: 3 })} g`;
}
/** A stored LTV at the Decimal(5,2) ceiling means "at or above", not exact. */
function fmtLtv(ltv: number | null) {
  if (ltv === null) return "—";
  return ltv >= LTV_MAX_5_2 ? `≥${LTV_MAX_5_2}%` : `${ltv.toFixed(1)}%`;
}
/** Today as YYYY-MM-DD in the viewer's local zone (not UTC). */
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function daysBetween(from: string, to: Date) {
  return Math.max(0, Math.floor((to.getTime() - new Date(from).getTime()) / DAY_MS));
}
function rateLine(gold: number | null, silver: number | null) {
  return [
    gold !== null ? `Gold ${fmtINR(gold)}/g` : null,
    silver !== null ? `Silver ${fmtINR(silver)}/g` : null,
  ].filter(Boolean).join(" · ");
}

/* -------------------------------------------------------------------------- */
/* Labels & tones                                                              */
/* -------------------------------------------------------------------------- */
const STATUS_TONE: Record<PledgeStatus, BadgeTone> = {
  ACTIVE: "active",
  OVERDUE: "overdue",
  RELEASED: "released",
  SOLD: "sold",
};
const STATUS_LABEL: Record<PledgeStatus, string> = {
  ACTIVE: "Active",
  OVERDUE: "Overdue",
  RELEASED: "Released",
  SOLD: "Sold to Shop",
};
const TIER_TONE: Record<RiskTier, BadgeTone> = {
  SAFE: "safe",
  WATCH: "watch",
  AT_RISK: "at-risk",
  UNDERWATER: "critical",
};
const TIER_LABEL: Record<RiskTier, string> = {
  SAFE: "Safe",
  WATCH: "Watch",
  AT_RISK: "At risk",
  UNDERWATER: "Underwater",
};
const TIER_FILL: Record<RiskTier, string> = {
  SAFE: "bg-risk-low",
  WATCH: "bg-risk-medium",
  AT_RISK: "bg-risk-high",
  UNDERWATER: "bg-risk-critical",
};
const COMPOUNDING_LABEL: Record<Compounding, string> = {
  MONTHLY: "monthly",
  HALFYEARLY: "half-yearly",
  YEARLY: "yearly",
};
const TXN_TYPES: TxnType[] = ["REPAYMENT_PRINCIPAL", "REPAYMENT_INTEREST", "TOPUP"];
const TXN_LABEL: Record<TxnType, string> = {
  REPAYMENT_PRINCIPAL: "Principal payment",
  REPAYMENT_INTEREST: "Interest payment",
  TOPUP: "Top-up",
};

/** A latest metal price older than this is flagged as possibly out of date. */
const STALE_PRICE_MS = 24 * 60 * 60 * 1000;

/** The LTV % that the UNDERWATER tier starts above. */
const UNDERWATER_AT = RISK_TIER_BOUNDARIES.AT_RISK;

/* -------------------------------------------------------------------------- */
/* Sub-components                                                              */
/* -------------------------------------------------------------------------- */
function Card({ title, aside, children, className }: {
  title?: React.ReactNode;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("bg-card border border-border rounded-[24px] overflow-hidden", className)}>
      {title && (
        <div className="flex items-center justify-between gap-3 px-5 lg:px-6 pt-5 pb-3">
          <h2 className="text-[15px] font-bold text-foreground">{title}</h2>
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}

function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("text-[11px] font-bold tracking-wider uppercase text-muted-foreground-subtle", className)}>
      {children}
    </p>
  );
}

function MetalBadge({ metal }: { metal: string }) {
  const isGold = metal.toUpperCase() === "GOLD";
  return (
    <span className={cn(
      "inline-flex text-[11px] font-bold tracking-wide px-2 py-0.5 rounded-full",
      isGold ? "bg-gold-surface text-gold-foreground" : "bg-silver-surface text-silver-foreground",
    )}>
      {isGold ? "Gold" : "Silver"}
    </span>
  );
}

/** 0–100% track with a marker at every real tier boundary. */
function LtvBar({ ltv }: { ltv: number }) {
  const tier = getRiskTier(ltv);
  const boundaries = Object.values(RISK_TIER_BOUNDARIES);
  return (
    <div
      role="img"
      aria-label={`LTV ${ltv.toFixed(1)}%. Tier boundaries at ${boundaries.join(", ")} percent.`}
    >
      <div className="relative h-2.5 rounded-full bg-muted">
        <div
          className={cn("absolute inset-y-0 left-0 rounded-full", TIER_FILL[tier])}
          style={{ width: `${Math.min(Math.max(ltv, 0), 100)}%` }}
        />
        {boundaries.map((b) => (
          <span
            key={b}
            aria-hidden
            className="absolute -top-1 -bottom-1 w-0.5 -translate-x-1/2 rounded-full bg-foreground/60"
            style={{ left: `${b}%` }}
          />
        ))}
      </div>
      <div aria-hidden className="relative h-4 mt-1.5 text-[11px] font-semibold text-muted-foreground-subtle tabular-nums">
        <span className="absolute left-0">0%</span>
        {boundaries.map((b) => (
          <span key={b} className="absolute -translate-x-1/2" style={{ left: `${b}%` }}>{b}%</span>
        ))}
      </div>
    </div>
  );
}

function StatTile({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="h-full bg-card border border-border rounded-[16px] px-4 py-3.5 min-w-0">
      <Eyebrow>{label}</Eyebrow>
      <p className="mt-1 text-[18px] font-bold text-foreground tabular-nums leading-tight">{value}</p>
      {sub && <p className="mt-0.5 text-[12px] text-muted-foreground-subtle">{sub}</p>}
    </div>
  );
}

/**
 * The one label/value row on this page: muted label left, bold value right.
 * Must sit inside a <dl>. The label takes the free space; the value keeps its
 * natural width up to 60% and wraps beyond that (long remarks), never truncates.
 */
function Row({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3 border-t border-border first:border-t-0">
      <dt className="min-w-0 flex-[1_1_0%]">
        <span className="block text-[13px] text-muted-foreground">{label}</span>
        {sub && <span className="block text-[12px] text-muted-foreground-subtle">{sub}</span>}
      </dt>
      <dd className="min-w-0 max-w-[60%] text-right text-[14px] font-bold text-foreground tabular-nums break-words">
        {value}
      </dd>
    </div>
  );
}

const btnBase =
  "inline-flex min-h-11 items-center justify-center gap-2 px-5 rounded-full text-[13px] font-bold transition-opacity hover:opacity-90";
const btnPrimary = `${btnBase} bg-primary text-primary-foreground`;
const btnSecondary = `${btnBase} bg-secondary text-secondary-foreground`;

/* ========================================================================== */
/* Page                                                                        */
/* ========================================================================== */
export default function PledgeDetailPage() {
  const params = useParams<{ customerId: string; pledgeId: string }>();
  const { customerId, pledgeId } = params;

  const [data, setData] = useState<LoadedData | null>(null);
  const [market, setMarket] = useState<MarketRates | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [photoOpen, setPhotoOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [receiptError, setReceiptError] = useState<string | null>(null);

  // Add-transaction form (existing POST …/transactions route, unchanged).
  const [txnOpen, setTxnOpen] = useState(false);
  const [txnType, setTxnType] = useState<TxnType>("REPAYMENT_PRINCIPAL");
  const [txnAmount, setTxnAmount] = useState("");
  const [txnDate, setTxnDate] = useState(todayISO);
  const [txnNote, setTxnNote] = useState("");
  const [txnSaving, setTxnSaving] = useState(false);
  const [txnError, setTxnError] = useState<string | null>(null);

  /* ── Load ── */
  // State is only set from the promise callback, never synchronously inside
  // the effect body. `cancelled` drops a response for a pledge we've left.
  const apply = useCallback((r: FetchResult) => {
    if (r.ok) {
      setData(r.data);
      setMarket(r.market);
      setError(null);
    } else {
      setError(r.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchPledge(customerId, pledgeId).then((r) => { if (!cancelled) apply(r); });
    return () => { cancelled = true; };
  }, [customerId, pledgeId, apply]);

  function retry() {
    setLoading(true);
    setError(null);
    fetchPledge(customerId, pledgeId).then(apply);
  }

  /* ── Receipt (existing GET …/receipt route) ── */
  async function openReceipt() {
    setReceiptOpen(true);
    if (receiptUrl) return;
    setReceiptLoading(true);
    setReceiptError(null);
    try {
      const res = await fetch(`/api/customers/${customerId}/pledges/${pledgeId}/receipt`);
      if (!res.ok) throw new Error("Failed");
      const blob = await res.blob();
      setReceiptUrl(window.URL.createObjectURL(blob));
    } catch {
      setReceiptError("Couldn't generate the receipt. Close and try again.");
    } finally {
      setReceiptLoading(false);
    }
  }
  function closeReceipt(open: boolean) {
    if (open) return;
    setReceiptOpen(false);
    if (receiptUrl) {
      window.URL.revokeObjectURL(receiptUrl);
      setReceiptUrl(null);
    }
  }
  function downloadReceipt() {
    if (!receiptUrl) return;
    const a = document.createElement("a");
    a.href = receiptUrl;
    a.download = `receipt-${pledgeId.slice(-6)}.pdf`;
    a.click();
  }

  /* ── Add transaction ── */
  function openTxnForm() {
    setTxnType("REPAYMENT_PRINCIPAL");
    setTxnAmount("");
    setTxnDate(todayISO());
    setTxnNote("");
    setTxnError(null);
    setTxnOpen(true);
  }

  async function submitTransaction(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(txnAmount.trim());
    if (!txnAmount.trim() || !Number.isFinite(amount) || amount <= 0) {
      setTxnError("Enter an amount greater than 0.");
      return;
    }
    if (!txnDate) {
      setTxnError("Pick a date.");
      return;
    }
    setTxnSaving(true);
    setTxnError(null);
    try {
      const res = await fetch(`/api/customers/${customerId}/pledges/${pledgeId}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          type: txnType,
          note: txnNote.trim() || undefined,
          transactionDate: txnDate,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.transaction) {
        setTxnError(body?.message ?? (typeof body?.error === "string" && body.error !== "Server error" ? body.error : "Couldn't save. Try again."));
        return;
      }
      const t = body.transaction;
      const saved: Transaction = {
        id: t.id, type: t.type, note: t.note ?? null, createdAt: t.createdAt, amount: num(t.amount) ?? amount,
      };
      setData((prev) => (prev ? { ...prev, transactions: [saved, ...prev.transactions] } : prev));
      setTxnOpen(false);
    } catch {
      setTxnError("Couldn't save. Check your connection and try again.");
    } finally {
      setTxnSaving(false);
    }
  }

  /* ── Derived figures — every number comes from the shared engines ── */
  const view = useMemo(() => {
    if (!data) return null;
    const { pledge, pricesAtPledge, closingAudit } = data;
    const now = new Date();
    const pledgeDate = new Date(pledge.pledgeDate);
    const isOpen = isOpenPledgeStatus(pledge.status);

    const base = {
      principal: pledge.loanAmount,
      rate: pledge.interestRate,
      pledgeDate,
      allowCompounding: pledge.allowCompounding,
      compoundingDuration: pledge.compoundingDuration,
      goldWeight: pledge.netWeightOfGold,
      silverWeight: pledge.netWeightOfSilver,
    };

    // Live figures — open pledges only. A closed pledge stops accruing.
    const live = isOpen
      ? (() => {
          const interest = calculateHybridInterest(
            pledge.loanAmount, pledge.interestRate, pledgeDate, now,
            pledge.allowCompounding, pledge.compoundingDuration,
          );
          const ltv = calculateLTV({
            ...base,
            currentDate: now,
            goldPrice: market?.gold?.inrPerGram ?? null,
            silverPrice: market?.silver?.inrPerGram ?? null,
          });
          const days = daysToUnderwater(
            pledge.loanAmount, pledge.interestRate, ltv.amountOwed, ltv.marketValue, UNDERWATER_AT,
          );
          return { interest, ltv, days };
        })()
      : null;

    // Monthly interest: the engine's interest for exactly one month from the
    // pledge date (P × annual rate ÷ 12). A compounding pledge accrues more in
    // later cycles; this is the base monthly charge on the principal.
    const oneMonthOn = new Date(pledgeDate);
    oneMonthOn.setMonth(oneMonthOn.getMonth() + 1);
    const monthlyInterest = calculateHybridInterest(
      pledge.loanAmount, pledge.interestRate, pledgeDate, oneMonthOn,
      pledge.allowCompounding, pledge.compoundingDuration,
    ).totalInterest;

    // Value at pledge — the same calculateLTV, evaluated AT pledgeDate with
    // the price recorded on the pledge's day (the route enforces same-day). With currentDate === pledgeDate the
    // engine returns amountOwed = principal, so ltv = loanAmount ÷ value.
    // Every metal the pledge holds must have a historical price; a partial
    // valuation would understate the value. Never substitute today's price.
    const holdsGold = pledge.netWeightOfGold > 0;
    const holdsSilver = pledge.netWeightOfSilver > 0;
    const pricedAtPledge =
      (holdsGold || holdsSilver) &&
      (!holdsGold || pricesAtPledge.gold !== null) &&
      (!holdsSilver || pricesAtPledge.silver !== null);
    const atPledge = pricedAtPledge
      ? calculateLTV({
          ...base,
          currentDate: pledgeDate,
          goldPrice: pricesAtPledge.gold?.inrPerGram ?? null,
          silverPrice: pricesAtPledge.silver?.inrPerGram ?? null,
        })
      : null;

    // Closed: everything from the immutable closing record, falling back to
    // the Pledge row's finalised amounts only for "total settled" / interest.
    const closedAt = closingAudit?.releaseDate ?? pledge.releaseDate ?? null;
    const closed = !isOpen
      ? {
          settled: closingAudit?.receivableAmount ?? pledge.receivableAmount,
          interest: closingAudit?.totalInterest ?? pledge.totalInterest,
          marketValue: closingAudit?.marketValueAtRelease ?? null,
          ltv: closingAudit?.ltvAtRelease ?? null,
          gold: closingAudit?.goldPricePerGram ?? null,
          silver: closingAudit?.silverPricePerGram ?? null,
          at: closedAt,
        }
      : null;

    const valueNow = live ? live.ltv.marketValue : closed?.marketValue ?? null;
    const ltvNow = live ? live.ltv.ltv : closed?.ltv ?? null;
    const change =
      atPledge?.marketValue && valueNow !== null
        ? {
            amount: valueNow - atPledge.marketValue,
            pct: ((valueNow - atPledge.marketValue) / atPledge.marketValue) * 100,
          }
        : null;

    // Open pledges are valued at the latest stored price. If that price (the
    // older one, when both metals are held) is over a day old, say so.
    const latestPriceTimes = [
      holdsGold ? market?.gold?.createdAt : null,
      holdsSilver ? market?.silver?.createdAt : null,
    ].filter((t): t is string => !!t);
    const pricedAt = latestPriceTimes.length
      ? latestPriceTimes.reduce((a, b) => (new Date(a) < new Date(b) ? a : b))
      : null;
    const staleSince =
      isOpen && pricedAt && now.getTime() - new Date(pricedAt).getTime() > STALE_PRICE_MS ? pricedAt : null;

    return { isOpen, live, closed, atPledge, valueNow, ltvNow, change, monthlyInterest, staleSince, now };
  }, [data, market]);

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="max-w-[1100px] mx-auto lg:px-8 pt-4 lg:pt-8 pb-6" aria-busy="true" aria-label="Loading pledge">
        <div className="rounded-[24px] bg-card-alt p-4 lg:p-6 mb-4 lg:mb-6">
          <div className="skeleton h-[26px] w-[220px] max-w-full mb-3" />
          <div className="skeleton h-[14px] w-[320px] max-w-full" />
        </div>
        <div className="grid gap-4 lg:gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div className="skeleton h-[200px] rounded-[24px]" />
          <div className="skeleton h-[200px] rounded-[24px]" />
        </div>
      </div>
    );
  }

  /* ── Error ── */
  if (error || !data || !view) {
    return (
      <div className="max-w-[1100px] mx-auto lg:px-8 pt-4 lg:pt-8 pb-6 space-y-4">
        <div role="alert" className="p-6 rounded-[16px] border bg-risk-critical-surface border-risk-critical/40">
          <h3 className="text-[14px] font-bold text-risk-critical-foreground mb-1">Unable to load pledge</h3>
          <p className="text-[13px] text-risk-critical-foreground">{error ?? "Pledge not found"}</p>
        </div>
        <button type="button" onClick={retry} className={btnSecondary}>
          <RefreshCw size={15} /> Retry
        </button>
      </div>
    );
  }

  const { pledge, transactions, pricesAtPledge, customerStats } = data;
  const { isOpen, live, closed, atPledge, valueNow, ltvNow, change, monthlyInterest, staleSince, now } = view;
  const staleNote = staleSince
    ? `Metal prices last updated ${fmtDate(staleSince)} · values may be out of date`
    : null;

  const first = pledge.items[0];
  const firstLabel = first ? (first.itemName || first.itemType) : "Pledge";
  const title = pledge.items.length > 1 ? `${firstLabel} + ${pledge.items.length - 1} more` : firstLabel;
  const itemCount = `${pledge.items.length} item${pledge.items.length === 1 ? "" : "s"}`;
  const weightParts = [
    pledge.netWeightOfGold > 0 ? `${fmtGrams(pledge.netWeightOfGold)} gold` : null,
    pledge.netWeightOfSilver > 0 ? `${fmtGrams(pledge.netWeightOfSilver)} silver` : null,
  ].filter(Boolean) as string[];

  const tier = ltvNow !== null ? getRiskTier(ltvNow) : null;
  const daysHeld = daysBetween(pledge.pledgeDate, isOpen ? now : new Date(closed?.at ?? now));
  const closingWord = pledge.status === "SOLD" ? "Sold to shop" : "Released";
  // "—" when value is unknown; 0 means already past the UNDERWATER boundary.
  const underwaterLabel =
    !live || live.days === null
      ? "—"
      : live.days === 0
        ? "Already underwater"
        : `${live.days.toLocaleString("en-IN")} days`;

  /* ── Activity: disbursement, ledger rows, closing event ── */
  type Event = { key: string; at: string; title: string; amount: number | null; note?: string | null };
  const events: Event[] = [
    { key: "disbursed", at: pledge.pledgeDate, title: "Loan disbursed", amount: pledge.loanAmount },
    ...transactions.map((t) => ({
      key: t.id, at: t.createdAt, title: TXN_LABEL[t.type], amount: t.amount, note: t.note,
    })),
  ];
  if (!isOpen && closed?.at) {
    events.push({
      key: "closed",
      at: closed.at,
      title: closingWord,
      amount: closed.settled,
      note: closed.settled !== null ? "Total settled" : null,
    });
  }
  // Stable sort keeps "Loan disbursed" first when a ledger row shares its date.
  events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  /* ── Items table ── */
  const itemColumns: DataTableColumn<PledgeItem>[] = [
    {
      key: "item", header: "Item", role: "identity",
      cell: (i) => <span className="font-semibold text-foreground">{i.itemName || i.itemType}</span>,
    },
    {
      key: "net", header: "Net wt", role: "primary", align: "right",
      cell: (i) => <span className="font-semibold tabular-nums">{fmtGrams(i.netWeightOfMetal)}</span>,
    },
    { key: "metal", header: "Metal", role: "trailing", align: "center", cell: (i) => <MetalBadge metal={i.metalType} /> },
    { key: "type", header: "Type", cell: (i) => i.itemType },
    { key: "qty", header: "Qty", align: "center", cell: (i) => <span className="tabular-nums">{i.quantity}</span> },
    { key: "purity", header: "Purity", align: "center", cell: (i) => <span className="tabular-nums">{i.purity}%</span> },
    {
      key: "gross", header: "Gross wt", align: "right",
      cell: (i) => <span className="tabular-nums text-muted-foreground">{fmtGrams(i.grossWeight)}</span>,
    },
  ];

  const nowRates = rateLine(market?.gold?.inrPerGram ?? null, market?.silver?.inrPerGram ?? null);
  const nowUpdated = market?.gold?.createdAt ?? market?.silver?.createdAt ?? null;
  const pledgeRates = rateLine(pricesAtPledge.gold?.inrPerGram ?? null, pricesAtPledge.silver?.inrPerGram ?? null);
  const pledgeRateAt = pricesAtPledge.gold?.createdAt ?? pricesAtPledge.silver?.createdAt ?? null;
  const closingRates = closed ? rateLine(closed.gold, closed.silver) : "";

  const sellHref = `/customers/${customerId}/pledges/${pledge.id}/sell`;
  const releaseHref = `/customers/${customerId}/pledges/${pledge.id}/release`;

  /* ====================================================================== */
  /* UI                                                                      */
  /* ====================================================================== */
  return (
    <>
      {/* No side padding below lg: the shell's <main> supplies the mobile
          gutter. StickyActions reserves its own space at the bottom. */}
      <div className="max-w-[1100px] mx-auto lg:px-8 pt-4 lg:pt-8 pb-6 lg:pb-16 text-foreground flex flex-col gap-4 lg:gap-6">

        {/* ── 1. Header ── */}
        <section className="rounded-[24px] bg-card-alt p-4 lg:p-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-3 lg:gap-4 min-w-0 md:flex-1">
            <Link
              href={`/customers/${customerId}`}
              aria-label="Back to customer"
              className="size-11 shrink-0 inline-flex items-center justify-center rounded-full border border-border bg-card text-foreground hover:bg-accent transition-colors"
            >
              <ArrowLeft size={18} />
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <h1 className="text-[20px] lg:text-[26px] leading-tight font-bold text-foreground break-words">{title}</h1>
                <StatusBadge tone={STATUS_TONE[pledge.status]}>{STATUS_LABEL[pledge.status]}</StatusBadge>
              </div>
              {/* Each separator travels with the item after it, so a wrap
                  starts the new line with "·" instead of stranding one. */}
              <p className="mt-1.5 text-[13px] font-medium text-muted-foreground-subtle flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                <span>
                  Pledged by{" "}
                  <Link href={`/customers/${customerId}`} className="font-bold text-foreground underline-offset-4 hover:underline">
                    {pledge.customer.name}
                  </Link>
                </span>
                <span className="whitespace-nowrap"><span aria-hidden>· </span>{fmtDate(pledge.pledgeDate)}</span>
                <span className="whitespace-nowrap"><span aria-hidden>· </span>{itemCount}</span>
                {weightParts.map((w) => (
                  <span key={w} className="whitespace-nowrap"><span aria-hidden>· </span>{w}</span>
                ))}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 lg:gap-3 shrink-0">
            <button type="button" onClick={openReceipt} className={cn(btnSecondary, "flex-1 md:flex-none")}>
              <ReceiptText size={15} /> Receipt
            </button>
            {/* Mobile gets these from the sticky bar instead. */}
            {isOpen && (
              <>
                <Link href={sellHref} className={cn(btnSecondary, "hidden lg:inline-flex")}>
                  <Archive size={15} /> Move to Inventory
                </Link>
                <Link href={releaseHref} className={cn(btnPrimary, "hidden lg:inline-flex")}>
                  <Unlock size={15} /> Release Pledge
                </Link>
              </>
            )}
          </div>
        </section>

        {/* ── 2. Hero row ── */}
        <div className="grid gap-4 lg:gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">

          {/* Amount card */}
          <section className="rounded-[24px] bg-primary text-primary-foreground p-5 lg:p-7 flex flex-col justify-between gap-6">
            <div>
              <p className="text-[12px] font-bold tracking-wider uppercase opacity-80">
                {isOpen ? "Total due today" : "Total settled"}
              </p>
              <p className="mt-2 text-[32px] lg:text-[40px] font-bold leading-none tabular-nums break-words">
                {fmtINR(isOpen ? live?.interest.receivableAmount : closed?.settled)}
              </p>
              {!isOpen && closed?.at && (
                <p className="mt-2 text-[13px] opacity-80">{closingWord} on {fmtDate(closed.at)}</p>
              )}
            </div>
            <dl className="grid grid-cols-2 gap-4 border-t border-primary-foreground/25 pt-4">
              <div>
                <dt className="text-[12px] opacity-80">Principal</dt>
                <dd className="text-[16px] font-bold tabular-nums">{fmtINR(pledge.loanAmount)}</dd>
              </div>
              <div>
                <dt className="text-[12px] opacity-80">{isOpen ? "Interest accrued" : "Interest"}</dt>
                <dd className="text-[16px] font-bold tabular-nums">
                  {fmtINR(isOpen ? live?.interest.totalInterest : closed?.interest)}
                </dd>
              </div>
            </dl>
          </section>

          <div className="flex flex-col min-w-0">
            {/* LTV card */}
            <section className="flex-1 flex flex-col justify-between gap-4 bg-card border border-border rounded-[24px] p-5 lg:p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Eyebrow>{isOpen ? "Loan-to-value" : "Loan-to-value at closing"}</Eyebrow>
                  <p className="mt-1 text-[28px] font-bold leading-tight tabular-nums">{fmtLtv(ltvNow)}</p>
                  <p className="text-[13px] text-muted-foreground-subtle">
                    {valueNow !== null
                      ? <>of {fmtINR(valueNow)} market value</>
                      : isOpen ? "No current metal price" : "Not recorded at closing"}
                  </p>
                  {staleNote && (
                    <p className="mt-1 text-[12px] font-semibold text-risk-medium-foreground">{staleNote}</p>
                  )}
                </div>
                {tier && <StatusBadge tone={TIER_TONE[tier]}>{TIER_LABEL[tier]}</StatusBadge>}
              </div>
              {ltvNow !== null && <LtvBar ltv={ltvNow} />}
            </section>

          </div>
        </div>

        {/* Stat tiles — own full-width row so labels never wrap */}
        <div className="grid gap-3 lg:gap-4 grid-cols-2 lg:grid-cols-4">
          <StatTile
            label="Interest rate"
            value={`${pledge.interestRate}% / yr · ${pledge.allowCompounding ? COMPOUNDING_LABEL[pledge.compoundingDuration] : "simple"}`}
          />
          <StatTile
            label="Monthly interest"
            value={`${fmtINR(monthlyInterest)} / month`}
            sub={`on ${fmtINR(pledge.loanAmount)} principal`}
          />
          <StatTile
            label={isOpen ? "Days since pledge" : "Pledge duration"}
            value={`${daysHeld.toLocaleString("en-IN")} days`}
            sub={`From ${fmtDate(pledge.pledgeDate)}`}
          />
          {isOpen ? (
            <StatTile
              label="Approx. days to underwater"
              value={underwaterLabel}
              sub="if metal prices stay the same"
            />
          ) : (
            <StatTile label="Closed" value={fmtDate(closed?.at)} sub={closingWord} />
          )}
        </div>

        {/* ── 3. Items — full width so all seven columns have room ── */}
        <Card
          title="Items"
          aside={<span className="text-[13px] font-semibold text-muted-foreground-subtle">{itemCount}</span>}
        >
          <div className="px-0 lg:px-0 pb-1">
            <DataTable
              rows={pledge.items}
              columns={itemColumns}
              tableOrder={["item", "type", "metal", "qty", "purity", "gross", "net"]}
              rowId={(i) => i.id}
              label="Pledged items"
              empty={<p className="text-[13px] text-muted-foreground-subtle text-center py-8">No items recorded.</p>}
            />
          </div>
          {pledge.remark?.trim() && (
            <dl className="px-5 lg:px-6 pb-4">
              <Row label="Remark" value={pledge.remark.trim()} />
            </dl>
          )}
        </Card>

        {/* ── 4. Customer | Activity + photo ──
            Same 5fr / 7fr template as the hero row so column edges line up.
            Columns stretch to equal height and the last card in each takes
            the remainder, so neither column leaves an empty gap whatever the
            activity length. Two columns from md; one below. */}
        <div className="grid gap-4 lg:gap-6 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div className="flex flex-col gap-4 lg:gap-6 min-w-0">
            {/* Customer */}
            <Card
              className="flex-1"
              title="Customer"
              aside={
                <Link href={`/customers/${customerId}`} className="min-h-11 inline-flex items-center text-[13px] font-bold text-primary hover:underline">
                  View profile →
                </Link>
              }
            >
              <div className="px-5 lg:px-6 pb-5 flex flex-col gap-1">
                <p className="text-[16px] font-bold text-foreground">{pledge.customer.name}</p>
                {pledge.customer.mobile ? (
                  <a href={`tel:${pledge.customer.mobile}`} className="min-h-11 inline-flex items-center gap-2 text-[14px] font-semibold text-primary w-fit hover:underline">
                    <Phone size={15} aria-hidden /> {pledge.customer.mobile}
                  </a>
                ) : (
                  <p className="min-h-11 inline-flex items-center gap-2 text-[14px] text-muted-foreground-subtle">
                    <Phone size={15} aria-hidden /> —
                  </p>
                )}
                <p className="flex items-start gap-2 text-[13px] text-muted-foreground">
                  <MapPin size={15} className="mt-0.5 shrink-0" aria-hidden /> {pledge.customer.address || "—"}
                </p>
                <dl className="mt-3">
                  <Row label="Region" value={pledge.customer.region || "—"} />
                  <Row label="Active pledges" value={customerStats.openPledgeCount} />
                  <Row label="First pledge" value={fmtDate(customerStats.firstPledgeDate)} />
                </dl>
              </div>
            </Card>
          </div>

          <div className="flex flex-col gap-4 lg:gap-6 min-w-0">
            <Card
              title="Activity"
              aside={isOpen && (
                <button type="button" onClick={openTxnForm} className={cn(btnSecondary, "px-4")}>
                  <Plus size={15} /> Add transaction
                </button>
              )}
            >
              <ol className="px-5 lg:px-6 pb-5">
                {events.map((e) => (
                  <li key={e.key} className="flex items-start justify-between gap-4 py-3 border-t border-border first:border-t-0">
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold text-foreground">{e.title}</p>
                      <p className="text-[12px] text-muted-foreground-subtle break-words">
                        {fmtDate(e.at)}{e.note ? ` · ${e.note}` : ""}
                      </p>
                    </div>
                    <span className="text-[14px] font-bold text-foreground tabular-nums shrink-0">{fmtINR(e.amount)}</span>
                  </li>
                ))}
              </ol>
            </Card>

            {/* Photo */}
            <Card title="Photo" className="flex-1">
              {pledge.itemPhoto ? (
                <div className="px-5 lg:px-6 pb-5">
                  <button
                    type="button"
                    onClick={() => setPhotoOpen(true)}
                    aria-label="View full-size photo"
                    className="block w-full max-w-[360px] overflow-hidden rounded-[16px] bg-muted focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={pledge.itemPhoto} alt={`Photo of ${title}`} className="w-full aspect-[4/3] object-cover" />
                  </button>
                </div>
              ) : (
                <p className="px-5 lg:px-6 pb-5 flex items-center gap-2 text-[13px] text-muted-foreground-subtle">
                  <ImageOff size={15} aria-hidden /> No photo was added.
                </p>
              )}
            </Card>
          </div>
        </div>

        {/* ── 5. Valuation — least important, so last ── */}
        <Card title="Valuation">
          {staleNote && (
            <p role="status" className="mx-5 lg:mx-6 mb-1 px-3 py-2 rounded-[12px] bg-risk-medium-surface text-[12px] font-semibold text-risk-medium-foreground">
              {staleNote}
            </p>
          )}
          <dl className="px-5 lg:px-6 pb-2">
            {isOpen ? (
              <Row
                label="Market value now"
                sub={nowRates ? `${nowRates}${nowUpdated ? ` · updated ${fmtDateTime(nowUpdated)}` : ""}` : "No current metal price"}
                value={fmtINR(valueNow)}
              />
            ) : (
              <Row
                label="Market value at closing"
                sub={closingRates || (closed?.at ? `On ${fmtDate(closed.at)}` : undefined)}
                value={fmtINR(valueNow)}
              />
            )}

            {/* Optional: only when a price was recorded on the pledge date
                itself. Imported pledges usually predate price recording. */}
            {atPledge && (
              <>
                <Row
                  label="Market value at pledge"
                  sub={`${pledgeRates}${pledgeRateAt ? ` · recorded ${fmtDateTime(pledgeRateAt)}` : ""}`}
                  value={fmtINR(atPledge.marketValue)}
                />
                <Row
                  label="LTV at pledge"
                  sub="Loan amount ÷ market value at pledge"
                  value={
                    <span className="inline-flex items-center gap-2">
                      {fmtLtv(atPledge.ltv)}
                      {atPledge.riskTier && (
                        <StatusBadge tone={TIER_TONE[atPledge.riskTier]}>{TIER_LABEL[atPledge.riskTier]}</StatusBadge>
                      )}
                    </span>
                  }
                />
                <Row
                  label="Change since pledge"
                  sub={isOpen ? "Market value now vs at pledge" : "Market value at closing vs at pledge"}
                  value={change ? `${fmtSignedINR(change.amount)} (${change.pct >= 0 ? "+" : "−"}${Math.abs(change.pct).toFixed(1)}%)` : "—"}
                />
              </>
            )}

            {isOpen && (
              <Row
                label="Approx. days to underwater"
                sub={`if metal prices stay the same · underwater above ${UNDERWATER_AT}% LTV`}
                value={underwaterLabel}
              />
            )}
          </dl>
        </Card>

      </div>

      {/* Mobile actions — desktop has them in the header. */}
      {isOpen && (
        <StickyActions className="lg:hidden">
          <Link href={sellHref} className={cn(btnSecondary, "flex-1 px-3")}>
            <Archive size={15} /> Move to Inventory
          </Link>
          <Link href={releaseHref} className={cn(btnPrimary, "flex-1 px-3")}>
            <Unlock size={15} /> Release
          </Link>
        </StickyActions>
      )}

      {/* Add transaction */}
      {isOpen && (
        <Sheet
          open={txnOpen}
          onOpenChange={setTxnOpen}
          title="Add transaction"
          size="md"
          dismissible={!txnSaving}
          footer={
            <div className="flex w-full gap-2 lg:justify-end">
              <button type="button" onClick={() => setTxnOpen(false)} disabled={txnSaving} className={cn(btnSecondary, "flex-1 lg:flex-none disabled:opacity-50")}>
                Cancel
              </button>
              <button type="submit" form="txn-form" disabled={txnSaving} className={cn(btnPrimary, "flex-1 lg:flex-none disabled:opacity-50")}>
                {txnSaving && <Loader2 size={15} className="animate-spin" aria-hidden />} Save
              </button>
            </div>
          }
        >
          <form id="txn-form" onSubmit={submitTransaction} className="flex flex-col gap-5" noValidate>
            <fieldset>
              <legend className="mb-2 text-[13px] font-semibold text-foreground">Type</legend>
              <div className="flex flex-wrap gap-2" role="radiogroup">
                {TXN_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    role="radio"
                    aria-checked={txnType === t}
                    onClick={() => setTxnType(t)}
                    className={cn(
                      "min-h-11 px-4 rounded-full border text-[13px] font-semibold transition-colors",
                      txnType === t
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-foreground border-border hover:bg-accent",
                    )}
                  >
                    {TXN_LABEL[t]}
                  </button>
                ))}
              </div>
            </fieldset>

            <label className="flex flex-col gap-2">
              <span className="text-[13px] font-semibold text-foreground">Amount (₹)</span>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="e.g. 5000"
                value={txnAmount}
                onChange={(e) => setTxnAmount(e.target.value)}
                aria-invalid={txnError !== null && !(Number(txnAmount) > 0)}
                className="h-11"
                autoFocus
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-[13px] font-semibold text-foreground">Date</span>
              <Input
                type="date"
                value={txnDate}
                max={todayISO()}
                onChange={(e) => setTxnDate(e.target.value)}
                className="h-11"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-[13px] font-semibold text-foreground">Note <span className="font-normal text-muted-foreground-subtle">(optional)</span></span>
              <Input
                type="text"
                maxLength={1000}
                placeholder="e.g. part payment"
                value={txnNote}
                onChange={(e) => setTxnNote(e.target.value)}
                className="h-11"
              />
            </label>

            {txnError && (
              <p role="alert" className="p-3 rounded-[12px] bg-risk-critical-surface text-[13px] text-risk-critical-foreground">{txnError}</p>
            )}

            <p className="text-[12px] text-muted-foreground-subtle">
              Recorded for reference · not yet deducted from total due
            </p>
          </form>
        </Sheet>
      )}

      {/* Photo viewer */}
      {pledge.itemPhoto && (
        <Sheet open={photoOpen} onOpenChange={setPhotoOpen} title="Photo" size="lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={pledge.itemPhoto}
            alt={`Photo of ${title}`}
            className="w-full max-h-[75dvh] object-contain rounded-[12px] bg-muted"
          />
        </Sheet>
      )}

      {/* Receipt */}
      <Sheet
        open={receiptOpen}
        onOpenChange={closeReceipt}
        title="Receipt"
        size="full"
        footer={
          <button type="button" onClick={downloadReceipt} disabled={!receiptUrl} className={cn(btnPrimary, "w-full lg:w-auto disabled:opacity-50")}>
            <Download size={15} /> Download PDF
          </button>
        }
      >
        {receiptLoading ? (
          <div className="flex items-center justify-center gap-2 h-[60dvh] text-[13px] text-muted-foreground-subtle">
            <Loader2 size={18} className="animate-spin" aria-hidden /> Generating receipt…
          </div>
        ) : receiptError ? (
          <p role="alert" className="p-4 rounded-[12px] bg-risk-critical-surface text-[13px] text-risk-critical-foreground">{receiptError}</p>
        ) : receiptUrl ? (
          <iframe src={receiptUrl} title="Receipt preview" className="w-full h-[70dvh] rounded-[12px] border border-border bg-card" />
        ) : null}
      </Sheet>
    </>
  );
}
