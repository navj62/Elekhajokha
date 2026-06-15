"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Loader2, ArrowLeft, User, Phone, MapPin, Percent,
  Calendar, Clock, ChevronUp, Plus, FileText, X,
  TrendingUp, Package, RefreshCw, Receipt as ReceiptIcon,
} from "lucide-react";

import { calculateLTV } from "@/lib/calculateLTV";
import { calculateHybridInterest } from "@/lib/interest";
import ReceiptModal from "@/components/ReceiptModal";

/* -------------------------------------------------------------------------- */
/* Types                                                                       */
/* -------------------------------------------------------------------------- */
interface PledgeItem {
  id: string;
  itemType: string;
  metalType: string;
  itemName: string | null;
  quantity: number;
  grossWeight: number;
  netWeight: number;
  purity: number;
  netWeightOfMetal: number;
  itemPhoto: string | null;
}

interface Transaction {
  id: string;
  amount: string;
  type: "REPAYMENT_PRINCIPAL" | "REPAYMENT_INTEREST" | "TOPUP";
  note: string | null;
  createdAt: string;
}

interface PledgeDetail {
  id: string;
  pledgeDate: string;
  status: string;
  loanAmount: number;
  interestRate: number;
  compoundingDuration: "MONTHLY" | "HALFYEARLY" | "YEARLY";
  allowCompounding: boolean;
  durationMonths: number | null;
  netWeightOfGold: number;
  netWeightOfSilver: number;
  totalInterest: number | null;
  receivableAmount: number | null;
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

interface MarketRates {
  goldPerGram: number | null;
  silverPerGram: number | null;
  updatedAt: string | null;
}

/* -------------------------------------------------------------------------- */
/* Constants                                                                   */
/* -------------------------------------------------------------------------- */
const TRANSACTION_TYPES = [
  { value: "REPAYMENT_PRINCIPAL", label: "Principal Payment" },
  { value: "REPAYMENT_INTEREST", label: "Interest Payment" },
  { value: "TOPUP", label: "Top-Up" },
] as const;

const QUICK_AMOUNTS = [1000, 5000, 10000] as const;

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */
function fmtINR(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 2,
  }).format(n);
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}
function titleCase(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

/* -------------------------------------------------------------------------- */
/* Sub-components                                                              */
/* -------------------------------------------------------------------------- */

// Status badge — Linen Ledger palette
function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, string> = {
    ACTIVE: "bg-[#E8EBD8] text-[#555B3F] border border-[#D3D9BB]",
    RELEASED: "bg-[#F0EFEC] text-[#6F6F6F] border border-[#E0DEDB]",
    OVERDUE: "bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA]",
  };
  const dotCfg: Record<string, string> = {
    ACTIVE: "bg-[#555B3F]", RELEASED: "bg-[#9E9E9E]", OVERDUE: "bg-[#DC2626]",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full ${cfg[status] ?? cfg.RELEASED}`}>
      <div className={`w-1.5 h-1.5 rounded-full ${dotCfg[status] ?? dotCfg.RELEASED}`} />
      {titleCase(status)}
    </span>
  );
}

// Transaction type badge
function TxnBadge({ type }: { type: Transaction["type"] }) {
  const cfg = {
    REPAYMENT_PRINCIPAL: { label: "Principal", cls: "bg-[#E8EBD8] text-[#555B3F]" },
    REPAYMENT_INTEREST: { label: "Interest", cls: "bg-[#EEF2FF] text-[#4338CA]" },
    TOPUP: { label: "Top-up", cls: "bg-[#FEF3C7] text-[#92400E]" },
  }[type];
  return (
    <span className={`text-[10px] font-bold tracking-wide px-2 py-0.5 rounded-full ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

// Metal type badge (for items table)
function MetalBadge({ metal }: { metal: string }) {
  const isGold = metal.toUpperCase() === "GOLD";
  return (
    <span className={`text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-full uppercase ${isGold ? "bg-[#FDF4DC] text-[#8B6914]" : "bg-[#F0EFEC] text-[#6F6F6F]"}`}>
      {metal}
    </span>
  );
}

/* ========================================================================== */
/* Page                                                                        */
/* ========================================================================== */
export default function PledgeDetailPage() {
  const params = useParams<{ customerId: string; pledgeId: string }>();

  const [pledge, setPledge] = useState<PledgeDetail | null>(null);
  const [market, setMarket] = useState<MarketRates | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Transaction form state
  const [txnAmount, setTxnAmount] = useState("");
  const [txnType, setTxnType] = useState<Transaction["type"]>("REPAYMENT_PRINCIPAL");
  const [txnNote, setTxnNote] = useState("");
  const [txnLoading, setTxnLoading] = useState(false);
  const [txnError, setTxnError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);

  // Modal states
  const [showAllTxnModal, setShowAllTxnModal] = useState(false);
  const [showAllPledgesModal, setShowAllPledgesModal] = useState(false);
  const [allPledges, setAllPledges] = useState<any[]>([]);
  const [loadingPledges, setLoadingPledges] = useState(false);

  const handleViewAllPledges = async () => {
    setShowAllPledgesModal(true);
    if (allPledges.length > 0) return;
    setLoadingPledges(true);
    try {
      const res = await fetch(`/api/customers/${params.customerId}/pledges`);
      const data = await res.json();
      if (res.ok) setAllPledges(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPledges(false);
    }
  };

  useEffect(() => {
    if (showForm) amountRef.current?.focus();
  }, [showForm]);

  /* ── Load ── */
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pledgeRes, marketRes, txnRes] = await Promise.all([
        fetch(`/api/customers/${params.customerId}/pledges/${params.pledgeId}`),
        fetch("/api/market-rates"),
        fetch(`/api/customers/${params.customerId}/pledges/${params.pledgeId}/transactions`),
      ]);
      if (!pledgeRes.ok) {
        const d = await pledgeRes.json().catch(() => ({}));
        throw new Error(d.error || `Failed to load pledge (${pledgeRes.status})`);
      }
      const pledgeRaw = await pledgeRes.json();
      const pledgeData = pledgeRaw?.pledge ?? pledgeRaw;
      if (!pledgeData?.id) throw new Error("Invalid pledge data received from server");
      setPledge(pledgeData);

      if (marketRes.ok) {
        const m = await marketRes.json();
        setMarket({
          goldPerGram: m?.gold?.inrPerGram ? Number(m.gold.inrPerGram) : null,
          silverPerGram: m?.silver?.inrPerGram ? Number(m.silver.inrPerGram) : null,
          updatedAt: m?.gold?.createdAt ?? null,
        });
      }
      if (txnRes.ok) {
        const txns = await txnRes.json();
        setTransactions(Array.isArray(txns.transactions) ? txns.transactions : []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load pledge");
    } finally {
      setLoading(false);
    }
  }, [params.customerId, params.pledgeId]);

  useEffect(() => { load(); }, [load]);

  /* ── Calculations ── */
  const calculations = useMemo(() => {
    if (!pledge) return null;
    const now = new Date();
    const pledgeDate = new Date(pledge.pledgeDate);
    const interest = calculateHybridInterest(
      pledge.loanAmount, pledge.interestRate, pledgeDate, now,
      pledge.allowCompounding, pledge.compoundingDuration
    );
    const ltv = calculateLTV({
      principal: pledge.loanAmount,
      rate: pledge.interestRate,
      pledgeDate, currentDate: now,
      allowCompounding: pledge.allowCompounding,
      compoundingDuration: pledge.compoundingDuration,
      goldWeight: pledge.netWeightOfGold,
      silverWeight: pledge.netWeightOfSilver,
      goldPrice: market?.goldPerGram ?? null,
      silverPrice: market?.silverPerGram ?? null,
    });
    return { interest, ltv };
  }, [pledge, market]);

  /* ── Submit transaction ── */
  async function submitTransaction(e: React.FormEvent) {
    e.preventDefault();
    setTxnError("");
    const amount = parseFloat(txnAmount);
    if (!txnAmount || isNaN(amount) || amount <= 0) {
      setTxnError("Enter a valid amount greater than 0");
      amountRef.current?.focus();
      return;
    }
    setTxnLoading(true);
    try {
      const res = await fetch(
        `/api/customers/${params.customerId}/pledges/${params.pledgeId}/transactions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount, type: txnType, note: txnNote.trim() || undefined }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add transaction");
      setTransactions(prev => [data.transaction, ...prev]);
      setTxnAmount("");
      setTxnNote("");
      setShowForm(false);
    } catch (err) {
      setTxnError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setTxnLoading(false);
    }
  }

  /* ── Loading state ── */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-[#555B3F]" size={28} />
      </div>
    );
  }

  /* ── Error state ── */
  if (error || !pledge) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-4">
        <div className="rounded-[16px] border border-red-200 bg-red-50 px-5 py-4 text-[13px] text-red-700">
          {error ?? "Pledge not found"}
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 text-[13px] font-semibold text-[#555B3F] border border-[#ECEAE4] rounded-[10px] px-4 py-2 hover:bg-[#F5F4EF] transition-colors"
        >
          <RefreshCw size={13} /> Retry
        </button>
      </div>
    );
  }

  const { interest, ltv: ltvResult } = calculations!;
  const ltvPct = ltvResult?.ltv ?? null;
  const ltvSafe = ltvPct !== null && ltvPct <= 65;
  const ltvBarPct = ltvPct !== null ? Math.min(ltvPct, 100) : 0;

  /* ====================================================================== */
  /* UI                                                                      */
  /* ====================================================================== */
  return (
    <div className="max-w-[1100px] mx-auto pb-16 mt-4 font-sans text-[#2C2C2C]">

      {/* ── PAGE HEADER ── */}
      <div className="flex items-start justify-between mb-5">
        <div>
          {/* Breadcrumb */}
          <div className="flex items-center gap-3 mb-2.5">
            <Link
              href={`/customers/${params.customerId}`}
              className="flex items-center justify-center w-8 h-8 bg-[#E3E5C3] border border-[#ECEAE4] rounded-full shadow-sm text-[#2C2C2C] hover:bg-[#F5F4EF] transition-colors"
            >
              <ArrowLeft size={16} strokeWidth={2} />
            </Link>
            <StatusBadge status={pledge.status} />
          </div>
          <h1 className="text-[28px] font-medium tracking-tight text-[#2C2C2C] leading-none">
            Pledge Details
          </h1>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2.5 mt-1">
          <ReceiptModal customerId={params.customerId} pledgeId={pledge.id} />
          {pledge.status === "ACTIVE" && (
            <Link href={`/customers/${params.customerId}/pledges/${params.pledgeId}/release`}>
              <button className="flex items-center gap-1.5 bg-[#555B3F] hover:bg-[#3D4230] text-white text-[13px] font-semibold px-4 py-2 rounded-[10px] transition-colors">
                <TrendingUp size={13} /> Release
              </button>
            </Link>
          )}
        </div>
      </div>

      {/* ── MARKET RATES BANNER ── */}
      <div className="flex items-center justify-between bg-[#E8EBD8] border border-[#ECEAE4] rounded-[12px] px-5 py-3 mb-6">
        <div className="flex items-center gap-2 text-[12px] text-[#6F6F6F]">
          <TrendingUp size={13} className="text-[#8C8F7A]" />
          <span className="font-semibold text-[#2C2C2C]">Market Rates:</span>
          {market?.goldPerGram && (
            <>
              <div className="w-1.5 h-1.5 rounded-full bg-[#C9A14B]" />
              <span>Gold: <span className="font-semibold text-[#2C2C2C]">{fmtINR(market.goldPerGram)}/g</span></span>
            </>
          )}
          {market?.silverPerGram && (
            <>
              <span className="text-[#D8D6CD]">•</span>
              <div className="w-1.5 h-1.5 rounded-full bg-[#9E9E9E]" />
              <span>Silver: <span className="font-semibold text-[#2C2C2C]">{fmtINR(market.silverPerGram)}/g</span></span>
            </>
          )}
          {!market?.goldPerGram && !market?.silverPerGram && (
            <span className="text-[#9E9E9E]">No market data available</span>
          )}
        </div>
        {market?.updatedAt && (
          <span className="text-[11px] font-semibold text-[#2C2C2C]">Updated: {fmtDate(market.updatedAt)}</span>
        )}
      </div>

      {/* ── KPI STRIP ── */}
      <div className="bg-white border border-[#ECEAE4] rounded-[16px] mb-6 overflow-hidden">
        <div className="grid grid-cols-4 divide-x divide-[#F4F3EE]">
          {/* Principal */}
          <div className="px-6 py-5">
            <p className="text-[10px] font-bold tracking-widest text-[#8C8F7A] uppercase mb-1.5">Principal Amount</p>
            <p className="text-[22px] font-semibold text-[#2C2C2C] tabular-nums">{fmtINR(pledge.loanAmount)}</p>
          </div>
          {/* Accrued Interest */}
          <div className="px-6 py-5">
            <p className="text-[10px] font-bold tracking-widest text-[#8C8F7A] uppercase mb-1.5">Accrued Interest</p>
            <p className="text-[22px] font-semibold text-[#2C2C2C] tabular-nums">{fmtINR(interest.totalInterest)}</p>
          </div>
          {/* Total Due */}
          <div className="px-6 py-5">
            <p className="text-[10px] font-bold tracking-widest text-[#8C8F7A] uppercase mb-1.5">Total Due</p>
            <p className="text-[22px] font-semibold text-[#2C2C2C] tabular-nums">{fmtINR(interest.receivableAmount)}</p>
          </div>
          {/* LTV */}
          <div className="px-6 py-5">
            <p className="text-[10px] font-bold tracking-widest text-[#8C8F7A] uppercase mb-1.5">Loan-to-Value (LTV)</p>
            <div className="flex items-baseline gap-2">
              <p className={`text-[22px] font-semibold tabular-nums ${ltvPct !== null && ltvPct > 75 ? "text-[#DC2626]" : "text-[#555B3F]"}`}>
                {ltvPct !== null ? `${ltvPct.toFixed(1)}%` : "N/A"}
              </p>
              {ltvPct !== null && (
                <span className={`text-[10px] font-bold tracking-wide px-1.5 py-0.5 rounded-full ${ltvSafe ? "bg-[#E8EBD8] text-[#555B3F]" : "bg-[#FEE2E2] text-[#991B1B]"}`}>
                  {ltvSafe ? "Safe" : ltvPct <= 75 ? "Watch" : "At Risk"}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── TWO-COLUMN LAYOUT ── */}
      <div className="grid grid-cols-[320px_1fr] gap-5">

        {/* ════════════════════════════════════ */}
        {/* LEFT COLUMN                          */}
        {/* ════════════════════════════════════ */}
        <div className="space-y-4">

          {/* Customer Details Card */}
          <div className="bg-white rounded-[16px] overflow-hidden border border-[#ECEAE4] border-t-4 border-t-[#555B3F] hover:border-[#D5D3CC] hover:shadow-sm transition-all cursor-pointer">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#F4F3EE]">
              <div className="flex items-center gap-2 text-[13px] font-semibold text-[#2C2C2C]">
                <User size={13} className="text-[#8C8F7A]" /> Customer Details
              </div>
              <Link
                href={`/customers/${params.customerId}`}
                className="text-[11px] font-semibold text-[#555B3F] hover:underline"
              >
                View Profile →
              </Link>
            </div>
            <div className="px-5 py-4 space-y-4">
              {/* Avatar + Name */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#F0EFDF] border border-[#E5E3D0] flex items-center justify-center text-[13px] font-semibold text-[#555B3F] shrink-0">
                  {getInitials(pledge.customer.name)}
                </div>
                <div>
                  <p className="text-[15px] font-semibold text-[#2C2C2C]">{pledge.customer.name}</p>
                </div>
              </div>
              {/* Contact details */}
              <div className="space-y-2.5 text-[12px] text-[#6F6F6F]">
                <div className="flex items-start gap-2">
                  <Phone size={11} className="text-[#C5C7B8] mt-0.5 shrink-0" />
                  <span className="font-medium text-[#2C2C2C]">{pledge.customer.mobile ?? "—"}</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin size={11} className="text-[#C5C7B8] mt-0.5 shrink-0" />
                  <span>{pledge.customer.address ?? "—"}</span>
                </div>
                {pledge.customer.region && (
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 shrink-0" />
                    <span className="text-[10px] font-bold tracking-widest uppercase text-[#8C8F7A]">Region</span>
                    <span className="text-[#2C2C2C] font-medium ml-auto">{pledge.customer.region}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Financial Structure Card */}
          <div className="bg-white rounded-[16px] overflow-hidden border border-[#ECEAE4] border-t-4 border-t-[#555B3F] hover:border-[#D5D3CC] hover:shadow-sm transition-all cursor-pointer">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-[#F4F3EE] text-[13px] font-semibold text-[#2C2C2C]">
              <FileText size={13} className="text-[#8C8F7A]" /> Financial Structure
            </div>
            <div className="px-5 py-5 space-y-4">
              {/* Loan Amount */}
              <div>
                <p className="text-[10px] font-bold tracking-widest text-[#8C8F7A] uppercase mb-1">Loan Amount</p>
                <p className="text-[26px] font-semibold text-[#2C2C2C] tabular-nums">{fmtINR(pledge.loanAmount)}</p>
              </div>

              {/* LTV Mini Card */}
              <div className="bg-[#F5F4EF] border border-[#ECEAE4] rounded-[12px] px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[9px] font-bold tracking-widest text-[#8C8F7A] uppercase">Loan-to-Value (LTV)</p>
                  {ltvPct !== null && (
                    <span className={`text-[9px] font-bold tracking-wide px-1.5 py-0.5 rounded-full ${ltvSafe ? "bg-[#E8EBD8] text-[#555B3F]" : "bg-[#FEE2E2] text-[#991B1B]"}`}>
                      {ltvSafe ? "Safe" : "Watch"}
                    </span>
                  )}
                </div>
                <p className="text-[20px] font-semibold text-[#2C2C2C] tabular-nums mb-3">
                  {ltvPct !== null ? `${ltvPct.toFixed(1)}%` : "N/A"}
                </p>
                {/* LTV Meter */}
                <div className="relative">
                  <div className="h-1.5 bg-[#ECEAE4] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${ltvPct !== null && ltvPct > 75 ? "bg-[#DC2626]" : ltvPct !== null && ltvPct > 65 ? "bg-[#D97706]" : "bg-[#555B3F]"}`}
                      style={{ width: `${ltvBarPct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1.5 text-[9px] text-[#9E9E9E]">
                    <span>0%</span>
                    <span>Safe Limit (50%)</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>

              {/* Financial details */}
              <div className="space-y-0 border-t border-[#F4F3EE] pt-3">
                {[
                  { icon: Percent, label: "Interest Rate", value: `${pledge.interestRate}% / yr` },
                  { icon: Calendar, label: "Pledge Date", value: fmtDate(pledge.pledgeDate) },
                  { icon: Clock, label: "Compounding", value: pledge.allowCompounding ? titleCase(pledge.compoundingDuration) : "None" },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center justify-between py-2.5 border-b border-[#F4F3EE] last:border-0">
                    <div className="flex items-center gap-2 text-[12px] text-[#8C8F7A]">
                      <Icon size={11} className="text-[#C5C7B8]" /> {label}
                    </div>
                    <span className="text-[12px] font-semibold text-[#2C2C2C]">{value}</span>
                  </div>
                ))}
                {pledge.remark && (
                  <div className="pt-2.5 text-[12px] text-[#6F6F6F] italic">
                    &ldquo;{pledge.remark}&rdquo;
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════ */}
        {/* RIGHT COLUMN                         */}
        {/* ════════════════════════════════════ */}
        <div className="space-y-5">

          {/* Pledged Items Card */}
          <div className="bg-[white] border border-[#ECEAE4] rounded-[16px] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#F4F3EE]">
              <div className="flex items-center gap-2 text-[13px] font-semibold text-[#2C2C2C]">
                <Package size={13} className="text-[#8C8F7A]" /> Pledged Items
              </div>
              <span className="text-[11px] font-semibold text-[#6F6F6F]">{pledge.items.length} Item{pledge.items.length !== 1 ? "s" : ""}</span>
            </div>

            {pledge.items.length === 0 ? (
              <p className="text-[13px] text-[#9E9E9E] text-center py-10">No items recorded.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[13px] bg-[#FBFAEF]">
                  <thead>
                    <tr className="bg-[#EFEFDF] text-[#6F6F6F] text-[10px] font-semibold tracking-wider uppercase">
                      <th className="text-left px-5 py-3">Item</th>
                      <th className="text-center px-4 py-3">Qty</th>
                      <th className="text-center px-4 py-3">Purity %</th>
                      <th className="text-center px-4 py-3">Type</th>
                      <th className="text-right px-5 py-3">Net Wt</th>
                      <th className="text-right px-5 py-3">Gross Wt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pledge.items.map(item => (
                      <tr key={item.id} className="border-b border-[#F4F3EE] hover:bg-[#FAFAF8] transition-colors">
                        <td className="px-5 py-3.5 font-semibold text-[#2C2C2C]">
                          {item.itemName ? (
                            <>
                              <span>{item.itemName}</span>
                              <span className="ml-1 text-[11px] text-[#9E9E9E]">({item.itemType})</span>
                            </>
                          ) : item.itemType}
                        </td>
                        <td className="px-4 py-3.5 text-center text-[#2C2C2C]">{item.quantity}</td>
                        <td className="px-4 py-3.5 text-center text-[#6F6F6F] tabular-nums">{item.purity}</td>
                        <td className="px-4 py-3.5 text-center">
                          <MetalBadge metal={item.metalType} />
                        </td>
                        <td className="px-5 py-3.5 text-right font-semibold text-[#2C2C2C] tabular-nums">
                          {Number(item.netWeightOfMetal).toFixed(2)}g
                        </td>
                        <td className="px-5 py-3.5 text-right text-[#6F6F6F] tabular-nums">
                          {Number(item.grossWeight).toFixed(2)}g
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="px-6 py-3.5 border-t border-[#F4F3EE]">
              <button
                onClick={handleViewAllPledges}
                className="text-[12px] font-semibold text-[#555B3F] hover:underline"
              >
                View All Pledges →
              </button>
            </div>
          </div>

          {/* Transactions Card */}
          <div className="bg-white border border-[#ECEAE4] rounded-[16px] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#F4F3EE]">
              <div className="flex items-center gap-2 text-[13px] font-semibold text-[#2C2C2C]">
                <ReceiptIcon size={13} className="text-[#8C8F7A]" /> Transactions
              </div>
              {pledge.status === "ACTIVE" && (
                <button
                  onClick={() => setShowForm(v => !v)}
                  className="flex items-center gap-1.5 bg-[#555B3F] hover:bg-[#3D4230] text-white text-[11px] font-semibold px-3 py-1.5 rounded-[8px] transition-colors"
                >
                  {showForm ? <><ChevronUp size={11} /> Cancel</> : <><Plus size={11} /> Add Record</>}
                </button>
              )}
            </div>

            {/* Transaction Form */}
            {showForm && (
              <form onSubmit={submitTransaction} className="border-b border-[#F4F3EE] bg-[#F5F4EF] px-6 py-5 space-y-4">
                {txnError && (
                  <div className="rounded-[10px] border border-red-200 bg-red-50 px-4 py-2.5 text-[12px] text-red-700">
                    {txnError}
                  </div>
                )}
                {/* Type pills */}
                <div>
                  <p className="text-[10px] font-bold tracking-widest text-[#8C8F7A] uppercase mb-2">Type</p>
                  <div className="flex gap-2 flex-wrap">
                    {TRANSACTION_TYPES.map(t => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setTxnType(t.value as Transaction["type"])}
                        className={`text-[12px] px-3 py-1.5 rounded-full border font-medium transition-colors ${txnType === t.value ? "bg-[#555B3F] text-white border-[#555B3F]" : "bg-white text-[#6F6F6F] border-[#ECEAE4] hover:border-[#C5C7B8]"}`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Amount */}
                <div>
                  <p className="text-[10px] font-bold tracking-widest text-[#8C8F7A] uppercase mb-2">Amount (₹)</p>
                  <input
                    ref={amountRef}
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="0.00"
                    value={txnAmount}
                    onChange={e => setTxnAmount(e.target.value)}
                    className="w-full px-3 py-2 text-[13px] bg-white border border-[#ECEAE4] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#C5C7B8] text-[#2C2C2C] placeholder-[#9E9E9E]"
                  />
                  <div className="flex gap-1.5 mt-2">
                    {QUICK_AMOUNTS.map(q => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setTxnAmount(String(q))}
                        className="text-[11px] px-2.5 py-1 rounded-full border border-[#ECEAE4] bg-white text-[#6F6F6F] hover:border-[#C5C7B8] hover:text-[#2C2C2C] transition-colors"
                      >
                        +{(q / 1000).toFixed(0)}k
                      </button>
                    ))}
                  </div>
                </div>
                {/* Note */}
                <div>
                  <p className="text-[10px] font-bold tracking-widest text-[#8C8F7A] uppercase mb-2">Note (optional)</p>
                  <input
                    type="text"
                    placeholder="e.g. partial payment"
                    value={txnNote}
                    onChange={e => setTxnNote(e.target.value)}
                    className="w-full px-3 py-2 text-[13px] bg-white border border-[#ECEAE4] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#C5C7B8] text-[#2C2C2C] placeholder-[#9E9E9E]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={txnLoading}
                  className="w-full flex items-center justify-center gap-2 bg-[#555B3F] hover:bg-[#3D4230] text-white text-[13px] font-semibold py-2.5 rounded-[10px] transition-colors disabled:opacity-50"
                >
                  {txnLoading && <Loader2 size={13} className="animate-spin" />}
                  Save Transaction
                </button>
              </form>
            )}

            {/* Transactions list */}
            {transactions.length === 0 ? (
              <div className="flex flex-col items-center py-14 gap-3">
                <div className="w-12 h-12 rounded-full bg-[#F5F4EF] flex items-center justify-center">
                  <ReceiptIcon size={20} className="text-[#C5C7B8]" />
                </div>
                <p className="text-[14px] font-semibold text-[#2C2C2C]">No transactions yet</p>
                <p className="text-[12px] text-[#8C8F7A] text-center max-w-[280px]">
                  There are currently no payments or partial releases recorded for this pledge.
                </p>
                {pledge.status === "ACTIVE" && (
                  <button
                    onClick={() => setShowForm(true)}
                    className="mt-1 flex items-center gap-1.5 text-[12px] font-semibold text-white bg-[#555B3F] hover:bg-[#3D4230] px-4 py-2 rounded-[10px] transition-colors"
                  >
                    <Plus size={12} /> Record Transaction
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px] bg-[#FBFAEF]">
                    <thead>
                      <tr className="bg-[#EFEFDF] text-[#6F6F6F] text-[10px] font-semibold tracking-wider uppercase">
                        <th className="text-left px-5 py-3">Date</th>
                        <th className="text-left px-5 py-3">Type</th>
                        <th className="text-left px-5 py-3">Description</th>
                        <th className="text-right px-5 py-3">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.slice(0, 5).map(txn => (
                        <tr key={txn.id} className="border-b border-[#F4F3EE] hover:bg-[#FAFAF8] transition-colors">
                          <td className="px-5 py-3.5 text-[#6F6F6F]">{fmtDate(txn.createdAt)}</td>
                          <td className="px-5 py-3.5">
                            <TxnBadge type={txn.type} />
                          </td>
                          <td className="px-5 py-3.5 text-[#6F6F6F]">{txn.note ?? "—"}</td>
                          <td className="px-5 py-3.5 text-right font-semibold text-[#2C2C2C] tabular-nums">
                            {fmtINR(Number(txn.amount))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-6 py-3.5 border-t border-[#F4F3EE]">
                  <button onClick={() => setShowAllTxnModal(true)} className="text-[12px] font-semibold text-[#555B3F] hover:underline">
                    View All Transactions →
                  </button>
                </div>
              </>
            )}
          </div>

        </div>
        {/* end right column */}
      </div>

      {/* ── TRANSACTIONS MODAL ── */}
      {showAllTxnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-[#FAF9F6] rounded-[24px] shadow-xl w-full max-w-3xl flex flex-col overflow-hidden max-h-[85vh]">
            <div className="flex items-center gap-4 px-6 py-5 bg-[#FAF9F6] border-b border-[#ECEAE4]">
              <button onClick={() => setShowAllTxnModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-[#ECEAE4] hover:bg-[#F5F4EF] transition-colors text-[#2C2C2C]">
                <X size={16} />
              </button>
              <h2 className="text-[20px] font-medium text-[#2C2C2C]">Transactions</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-6 bg-[#FAF9F6]">
              {transactions.length === 0 ? (
                <p className="text-center text-[#6F6F6F] text-[13px] py-10">No transactions recorded.</p>
              ) : (
                <div className="overflow-hidden rounded-[16px] border border-[#ECEAE4]">
                  <table className="w-full text-[13px] bg-[#FBFAEF]">
                    <thead>
                      <tr className="bg-[#EFEFDF] text-[#6F6F6F] text-[10px] font-semibold tracking-wider uppercase border-b border-[#ECEAE4]">
                        <th className="text-left px-5 py-3">Date</th>
                        <th className="text-left px-5 py-3">Type</th>
                        <th className="text-left px-5 py-3">Description</th>
                        <th className="text-right px-5 py-3">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#ECEAE4]">
                      {transactions.map(txn => (
                        <tr key={txn.id} className="hover:bg-[#F5F4EF] transition-colors">
                          <td className="px-5 py-3.5 text-[#6F6F6F]">{fmtDate(txn.createdAt)}</td>
                          <td className="px-5 py-3.5"><TxnBadge type={txn.type} /></td>
                          <td className="px-5 py-3.5 text-[#6F6F6F]">{txn.note ?? "—"}</td>
                          <td className="px-5 py-3.5 text-right font-semibold text-[#2C2C2C] tabular-nums">{fmtINR(Number(txn.amount))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── ALL PLEDGES MODAL ── */}
      {showAllPledgesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-[#FAF9F6] rounded-[24px] shadow-xl w-full max-w-4xl flex flex-col overflow-hidden max-h-[85vh]">
            <div className="flex items-center gap-4 px-6 py-5 bg-[#FAF9F6] border-b border-[#ECEAE4]">
              <button onClick={() => setShowAllPledgesModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-[#ECEAE4] hover:bg-[#F5F4EF] transition-colors text-[#2C2C2C]">
                <X size={16} />
              </button>
              <h2 className="text-[20px] font-medium text-[#2C2C2C]">All Pledges</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-6 bg-[#FAF9F6]">
              {loadingPledges ? (
                <div className="flex justify-center py-10"><Loader2 className="animate-spin text-[#555B3F]" size={24} /></div>
              ) : allPledges.length === 0 ? (
                <p className="text-center text-[#6F6F6F] text-[13px] py-10">No pledges found.</p>
              ) : (
                <div className="overflow-hidden rounded-[16px] border border-[#ECEAE4]">
                  <table className="w-full text-[13px] bg-[#FBFAEF]">
                    <thead>
                      <tr className="bg-[#EFEFDF] text-[#6F6F6F] text-[10px] font-semibold tracking-wider uppercase border-b border-[#ECEAE4]">
                        <th className="text-left px-5 py-3">Date</th>
                        <th className="text-left px-5 py-3">Status</th>
                        <th className="text-left px-5 py-3">Items</th>
                        <th className="text-right px-5 py-3">Loan Amount</th>
                        <th className="text-right px-5 py-3">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#ECEAE4]">
                      {allPledges.map(p => (
                        <tr key={p.id} className="hover:bg-[#F5F4EF] transition-colors">
                          <td className="px-5 py-3.5 text-[#6F6F6F]">{fmtDate(p.pledgeDate)}</td>
                          <td className="px-5 py-3.5"><StatusBadge status={p.status} /></td>
                          <td className="px-5 py-3.5 text-[#6F6F6F]">{p.items?.length || 0} items</td>
                          <td className="px-5 py-3.5 text-right font-semibold text-[#2C2C2C] tabular-nums">{fmtINR(Number(p.loanAmount))}</td>
                          <td className="px-5 py-3.5 text-right">
                            <Link href={`/customers/${params.customerId}/pledges/${p.id}`} onClick={() => setShowAllPledgesModal(false)} className="text-[#555B3F] hover:underline font-semibold">View</Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}