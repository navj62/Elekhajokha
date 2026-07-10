"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Loader2, CheckCircle, ArrowLeft, Calendar,
  AlertTriangle, RefreshCw, Phone, MapPin, Info, Archive,
} from "lucide-react";

import { calculateHybridInterest } from "@/lib/interest";

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */
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
}

interface Pledge {
  id: string;
  pledgeDate: string;
  loanAmount: number;
  interestRate: number;
  compoundingDuration: "MONTHLY" | "HALFYEARLY" | "YEARLY";
  allowCompounding: boolean;
  durationMonths: number | null;
  status: string;
  remark: string | null;
  itemPhoto: string | null;
  netWeightOfGold: number;
  netWeightOfSilver: number;
  releaseDate: string | null;
  receivableAmount: number | null;
  salePrice: number | null;
  inventoryItem: {
    id: string;
    acquiredCost: number;
    amountOwedAt: number | null;
    acquiredAt: string;
    status: string;
  } | null;
  items: PledgeItem[];
  customer: {
    id: string;
    name: string;
    address: string | null;
    mobile: string | null;
    region: string | null;
  };
}

type TransactionType = "REPAYMENT_PRINCIPAL" | "REPAYMENT_INTEREST" | "TOPUP";

interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  createdAt: string;
  note: string | null;
}

const TXN_LABEL: Record<TransactionType, string> = {
  REPAYMENT_PRINCIPAL: "Principal Payment",
  REPAYMENT_INTEREST:  "Interest Payment",
  TOPUP:               "Top-up",
};

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */
const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 2,
  }).format(n);

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });

const titleCase = (str: string) =>
  str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

const getInitials = (name: string) =>
  name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();

/* ================================================================== */
/* Page                                                                 */
/* ================================================================== */
export default function ReleasePledgePage() {
  const params = useParams<{ customerId: string; pledgeId: string }>();
  const router = useRouter();

  const today = new Date().toISOString().split("T")[0];

  const [releaseDate, setReleaseDate] = useState(today);
  const [pledge, setPledge] = useState<Pledge | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [allowCompounding, setAllowCompounding] = useState(false);
  const [compoundingDuration, setCompoundingDuration] =
    useState<"MONTHLY" | "HALFYEARLY" | "YEARLY">("MONTHLY");
  const [fetching, setFetching] = useState(true);
  const [fetchErr, setFetchErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [released, setReleased] = useState(false);

  /* ── Fetch pledge ── */
  async function loadPledge() {
    setFetching(true);
    setFetchErr("");
    try {
      const res = await fetch(`/api/customers/${params.customerId}/pledges/${params.pledgeId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load pledge");
      const p = data?.pledge ?? data;
      if (!p?.id) throw new Error("Invalid pledge data");
      setPledge(p);
      setTransactions(Array.isArray(data?.transactions) ? data.transactions : []);
      // Seed the editable toggle from the pledge's stored values.
      setAllowCompounding(Boolean(p.allowCompounding));
      setCompoundingDuration(p.compoundingDuration ?? "MONTHLY");
    } catch (e) {
      setFetchErr(e instanceof Error ? e.message : "Failed to load pledge");
    } finally {
      setFetching(false);
    }
  }

  useEffect(() => { if (params.pledgeId) loadPledge(); }, [params.pledgeId]);

  /* ── Validation ── */
  const isBeforePledge = pledge
    ? new Date(releaseDate) < new Date(pledge.pledgeDate)
    : false;

  /* ── Calculation ── */
  const calc = useMemo(() => {
    if (!pledge || isBeforePledge) return null;
    return calculateHybridInterest(
      Number(pledge.loanAmount),
      Number(pledge.interestRate),
      new Date(pledge.pledgeDate),
      new Date(releaseDate),
      allowCompounding,
      compoundingDuration
    );
  }, [pledge, releaseDate, isBeforePledge, allowCompounding, compoundingDuration]);

  const canRelease = pledge?.status === "ACTIVE" && calc !== null && !isBeforePledge;

  /* ── Payment history totals ── */
  const txnTotals = useMemo(() => {
    let paid = 0;
    let toppedUp = 0;
    for (const t of transactions) {
      if (t.type === "TOPUP") toppedUp += Number(t.amount);
      else paid += Number(t.amount); // REPAYMENT_PRINCIPAL + REPAYMENT_INTEREST
    }
    return { paid, toppedUp };
  }, [transactions]);

  /* ── Release ── */
  async function handleRelease() {
    if (!pledge || !calc || isBeforePledge) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch(
        `/api/customers/${params.customerId}/pledges/${params.pledgeId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            releaseDate,
            allowCompounding,
            compoundingDuration,
          }),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to release pledge");
      }
      setReleased(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to release pledge");
    } finally {
      setLoading(false);
    }
  }

  /* ================================================================ */
  /* States                                                             */
  /* ================================================================ */

  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-[#6B7150]" size={28} />
      </div>
    );
  }

  if (fetchErr || !pledge) {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-4">
        <div className="rounded-[16px] border border-red-200 bg-red-50 px-5 py-4 text-[13px] text-red-700">
          {fetchErr || "Pledge not found"}
        </div>
        <button
          onClick={loadPledge}
          className="flex items-center gap-2 text-[13px] font-semibold text-[#6B7150] border border-[#ECEAE4] rounded-[10px] px-4 py-2 hover:bg-[#F9F8F3] transition-colors"
        >
          <RefreshCw size={13} /> Retry
        </button>
      </div>
    );
  }

  if (released) {
    return (
      <div className="max-w-2xl mx-auto p-6 flex flex-col items-center justify-center min-h-[60vh] text-center gap-5">
        <div className="w-20 h-20 rounded-full bg-[#E8EBD8] border border-[#D3D9BB] flex items-center justify-center">
          <CheckCircle size={40} className="text-[#6B7150]" />
        </div>
        <div>
          <h2 className="text-[24px] font-semibold text-[#2C2C2C]">Pledge Released</h2>
          <p className="text-[13px] text-[#6F6F6F] mt-2 leading-relaxed">
            The pledge for{" "}
            <span className="font-semibold text-[#2C2C2C]">{pledge.customer.name}</span>{" "}
            has been successfully released on {fmtDate(releaseDate)}.
          </p>
        </div>
        {calc && (
          <div className="w-full max-w-sm bg-[#F9F8F3] border border-[#ECEAE4] rounded-[16px] p-5 text-[13px] space-y-2.5">
            <div className="flex justify-between">
              <span className="text-[#6F6F6F]">Principal</span>
              <span className="font-semibold text-[#2C2C2C]">{fmt(Number(pledge.loanAmount))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6F6F6F]">Interest collected</span>
              <span className="font-semibold text-[#B91C1C]">{fmt(calc.totalInterest)}</span>
            </div>
            <div className="flex justify-between border-t border-[#ECEAE4] pt-2.5 mt-2">
              <span className="font-semibold text-[#2C2C2C]">Total received</span>
              <span className="font-bold text-[#6B7150] text-[16px]">{fmt(calc.receivableAmount)}</span>
            </div>
          </div>
        )}
        <button
          onClick={() => router.push(`/customers/${params.customerId}`)}
          className="bg-[#6B7150] hover:bg-[#585E42] text-white text-[13px] font-semibold px-6 py-2.5 rounded-[10px] transition-colors mt-2"
        >
          Back to Customer
        </button>
      </div>
    );
  }

  /* ── Closed-state guards ── */
  if (pledge.status === "RELEASED") {
    return (
      <div className="max-w-2xl mx-auto p-6 flex flex-col items-center justify-center min-h-[60vh] text-center gap-5">
        <div className="w-20 h-20 rounded-full bg-[#E8EBD8] border border-[#D3D9BB] flex items-center justify-center">
          <CheckCircle size={40} className="text-[#6B7150]" />
        </div>
        <h2 className="text-[24px] font-semibold text-[#2C2C2C]">This Pledge Has Already Been Released</h2>
        <div className="w-full max-w-sm bg-[#F9F8F3] border border-[#ECEAE4] rounded-[16px] p-5 text-[13px] space-y-2.5">
          <div className="flex justify-between">
            <span className="text-[#6F6F6F]">Released on</span>
            <span className="font-semibold text-[#2C2C2C]">
              {pledge.releaseDate ? fmtDate(pledge.releaseDate) : "—"}
            </span>
          </div>
          <div className="flex justify-between border-t border-[#ECEAE4] pt-2.5 mt-2">
            <span className="font-semibold text-[#2C2C2C]">Receivable Amount</span>
            <span className="font-bold text-[#6B7150] text-[16px]">
              ₹{Math.round(Number(pledge.receivableAmount ?? 0)).toLocaleString("en-IN")}
            </span>
          </div>
        </div>
        <button
          onClick={() => router.push(`/customers/${params.customerId}`)}
          className="bg-[#6B7150] hover:bg-[#585E42] text-white text-[13px] font-semibold px-6 py-2.5 rounded-[10px] transition-colors mt-2"
        >
          Back to Customer
        </button>
      </div>
    );
  }

  if (pledge.status === "SOLD") {
    const salePriceNum        = Number(pledge.salePrice ?? 0);
    const storedAmountOwed    = Number(pledge.receivableAmount ?? 0);
    const storedCashToPay     = Math.max(salePriceNum - storedAmountOwed, 0);
    const storedUncoveredLoss = Math.max(storedAmountOwed - salePriceNum, 0);
    return (
      <div className="max-w-2xl mx-auto p-6 flex flex-col items-center justify-center min-h-[60vh] text-center gap-5">
        <div className="w-20 h-20 rounded-full bg-[#FEF3C7] border border-[#FDE68A] flex items-center justify-center">
          <Archive size={36} className="text-[#92400E]" />
        </div>
        <h2 className="text-[24px] font-semibold text-[#2C2C2C]">This Pledge Was Sold to the Shop</h2>
        <div className="w-full max-w-sm bg-[#F9F8F3] border border-[#ECEAE4] rounded-[16px] p-5 text-[13px] space-y-2.5">
          <div className="flex justify-between">
            <span className="text-[#6F6F6F]">Date</span>
            <span className="font-semibold text-[#2C2C2C]">
              {pledge.releaseDate ? fmtDate(pledge.releaseDate) : "—"}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#6F6F6F]">Acquisition Cost</span>
            <span className="font-semibold text-[#2C2C2C]">
              ₹{Math.round(salePriceNum).toLocaleString("en-IN")}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#6F6F6F]">Cash Paid to Customer</span>
            <span className={`font-semibold tabular-nums ${storedCashToPay > 0 ? "text-[#565C3F]" : "text-[#6F6F6F]"}`}>
              ₹{Math.round(storedCashToPay).toLocaleString("en-IN")}
            </span>
          </div>
          {storedUncoveredLoss > 0 && (
            <p className="text-[11px] text-[#B45309] bg-[#FFF7ED] border border-[#FED7AA] rounded-[8px] px-3 py-2 text-left">
              No cash payment — the loan amount exceeded the item&apos;s stated value. The shop absorbed ₹{Math.round(storedUncoveredLoss).toLocaleString("en-IN")} as an uncovered loss on this pledge.
            </p>
          )}
          {storedCashToPay === 0 && storedUncoveredLoss === 0 && (
            <p className="text-[11px] text-[#6F6F6F]">Break even — no cash payment.</p>
          )}
          {pledge.inventoryItem && (
            <div className="flex justify-between items-center border-t border-[#ECEAE4] pt-2.5 mt-2">
              <span className="text-[#6F6F6F]">Inventory</span>
              <Link href="/inventory" className="text-[#6B7150] font-semibold underline underline-offset-2">
                View in Inventory →
              </Link>
            </div>
          )}
        </div>
        <button
          onClick={() => router.push(`/customers/${params.customerId}`)}
          className="bg-[#6B7150] hover:bg-[#585E42] text-white text-[13px] font-semibold px-6 py-2.5 rounded-[10px] transition-colors mt-2"
        >
          Back to Customer
        </button>
      </div>
    );
  }

  /* ================================================================ */
  /* Main render                                                        */
  /* ================================================================ */
  return (
    <div className="max-w-[1200px] mx-auto pb-16 mt-4 font-sans text-[#2C2C2C]">

      {/* ── PAGE HEADER ── */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex gap-4 items-start">
          <Link
            href={`/customers/${params.customerId}/pledges/${params.pledgeId}`}
            className="flex items-center justify-center w-10 h-10 shrink-0 bg-[#E8EBD8] rounded-full text-[#555B3F] hover:bg-[#D3D9BB] transition-colors mt-0.5"
          >
            <ArrowLeft size={18} strokeWidth={2.5} />
          </Link>
          <div>
            <h1 className="text-[32px] font-semibold tracking-tight text-[#2C2C2C] leading-none mb-2">
              Release Pledge
            </h1>
            <p className="text-[14px] text-[#6F6F6F]">
              Calculate interest and release this pledge
            </p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wider uppercase px-3 py-1.5 rounded-full ${pledge.status === "ACTIVE"
          ? "bg-[#E8EBD8] text-[#555B3F]"
          : "bg-[#ECEAE4] text-[#6F6F6F]"
          }`}>
          {pledge.status === "ACTIVE" && <div className="w-1.5 h-1.5 rounded-full bg-[#555B3F]" />}
          {titleCase(pledge.status)}
        </span>
      </div>

      {/* ── PAYMENT HISTORY ── */}
      <div className="bg-white border border-[#ECEAE4] rounded-[20px] p-6 shadow-sm mb-6">
        <p className="text-[10px] uppercase tracking-wider font-bold text-[#8C8F7A] mb-4">
          Payment History
        </p>

        {transactions.length === 0 ? (
          <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>
            No payments recorded for this pledge.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto rounded-[12px] border border-[#ECEAE4]">
              <table className="w-full text-[13px] bg-[#F9F8F3]">
                <thead>
                  <tr className="border-b border-[#ECEAE4] text-[#8C8F7A] text-[10px] font-bold tracking-widest uppercase">
                    <th className="text-left px-4 py-3">Date</th>
                    <th className="text-left px-4 py-3">Type</th>
                    <th className="text-right px-4 py-3">Amount</th>
                    <th className="text-left px-4 py-3">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ECEAE4]">
                  {transactions.map(t => (
                    <tr key={t.id} className="bg-[#FDFCF9]">
                      <td className="px-4 py-3 text-[#6F6F6F] whitespace-nowrap">
                        {fmtDate(t.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-[#F0EFEC] text-[#6F6F6F]">
                          {TXN_LABEL[t.type]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-[#2C2C2C] tabular-nums whitespace-nowrap">
                        ₹{Number(t.amount).toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3 text-[#8C8F7A]">{t.note ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 space-y-1 text-[13px]">
              {txnTotals.paid > 0 && (
                <p className="font-semibold text-[#2C2C2C]">
                  Total paid: ₹{txnTotals.paid.toLocaleString("en-IN")}
                </p>
              )}
              {txnTotals.toppedUp > 0 && (
                <p className="font-semibold text-[#2C2C2C]">
                  Total topped up: ₹{txnTotals.toppedUp.toLocaleString("en-IN")}
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── MAIN LAYOUT ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[65fr_35fr] gap-6 items-start">

        {/* ════════════════════════════════════ */}
        {/* LEFT COLUMN                          */}
        {/* ════════════════════════════════════ */}
        <div className="bg-white border border-[#ECEAE4] rounded-[20px] p-6 shadow-sm">

          <div className="flex items-center gap-2 text-[16px] font-semibold text-[#2C2C2C] mb-6">
            <Info size={18} className="text-[#8C8F7A]" /> Pledge Details
          </div>

          {/* Customer Section */}
          <div className="mb-6">
            <p className="text-[10px] font-bold tracking-widest text-[#8C8F7A] uppercase mb-2">Customer</p>
            <div className="bg-[#F9F8F3] rounded-[12px] p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#E8EBD8] flex items-center justify-center text-[15px] font-bold text-[#555B3F] shrink-0">
                  {getInitials(pledge.customer.name)}
                </div>
                <div>
                  <p className="text-[15px] font-semibold text-[#2C2C2C]">{pledge.customer.name}</p>
                  <div className="flex items-center gap-1 text-[12px] text-[#6F6F6F] mt-0.5">
                    <MapPin size={11} className="text-[#8C8F7A]" /> {pledge.customer.address || "No address"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-[13px] font-medium text-[#2C2C2C]">
                <Phone size={13} className="text-[#8C8F7A]" /> {pledge.customer.mobile || "—"}
              </div>
            </div>
          </div>

          {/* Loan Information */}
          <div className="mb-8">
            <p className="text-[10px] font-bold tracking-widest text-[#8C8F7A] uppercase mb-2">Loan Information</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#F9F8F3] rounded-[12px] p-4">
                <p className="text-[11px] font-medium text-[#8C8F7A] mb-1">Loan Amount</p>
                <p className="text-[20px] font-semibold text-[#2C2C2C] tabular-nums">{fmt(Number(pledge.loanAmount))}</p>
              </div>
              <div className="bg-[#F9F8F3] rounded-[12px] p-4">
                <p className="text-[11px] font-medium text-[#8C8F7A] mb-1">Pledge Date</p>
                <p className="text-[15px] font-semibold text-[#2C2C2C] mt-1">{fmtDate(pledge.pledgeDate)}</p>
              </div>
              <div className="bg-[#F9F8F3] rounded-[12px] p-4">
                <p className="text-[11px] font-medium text-[#8C8F7A] mb-1">Annual Interest Rate</p>
                <p className="text-[15px] font-semibold text-[#2C2C2C] mt-1">{Number(pledge.interestRate)}%</p>
              </div>
              <div className="bg-[#F9F8F3] rounded-[12px] p-4">
                <p className="text-[11px] font-medium text-[#8C8F7A] mb-1">Compounding</p>
                <p className="text-[15px] font-semibold text-[#2C2C2C] mt-1">
                  {pledge.allowCompounding ? titleCase(pledge.compoundingDuration) : "None"}
                </p>
              </div>
            </div>
          </div>

          {/* Pledged Items */}
          <div>
            <p className="text-[16px] font-semibold text-[#2C2C2C] mb-4">Pledged Items ({pledge.items.length})</p>

            <div className="overflow-x-auto rounded-[12px] border border-[#ECEAE4] mb-4">
              <table className="w-full text-[13px] bg-[#F9F8F3]">
                <thead>
                  <tr className="border-b border-[#ECEAE4] text-[#8C8F7A] text-[10px] font-bold tracking-widest uppercase">
                    <th className="text-left px-4 py-3">Item</th>
                    <th className="text-left px-4 py-3">Type</th>
                    <th className="text-center px-4 py-3">Qty</th>
                    <th className="text-right px-4 py-3">Gross Wt</th>
                    <th className="text-right px-4 py-3">Net Wt</th>
                    <th className="text-right px-4 py-3">Purity</th>
                    <th className="text-right px-4 py-3">Net Metal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ECEAE4]">
                  {pledge.items.map(item => (
                    <tr key={item.id} className="bg-[#FDFCF9]">
                      <td className="px-4 py-3 font-semibold text-[#2C2C2C] whitespace-nowrap">
                        {item.itemName || item.itemType}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${item.metalType === "GOLD" ? "bg-[#FDF4DC] text-[#8B6914]" : "bg-[#F0EFEC] text-[#6F6F6F]"
                          }`}>
                          {item.metalType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-[#6F6F6F] whitespace-nowrap">{item.quantity} pc</td>
                      <td className="px-4 py-3 text-right text-[#6F6F6F] tabular-nums">{Number(item.grossWeight).toFixed(3)}g</td>
                      <td className="px-4 py-3 text-right text-[#6F6F6F] tabular-nums">{Number(item.netWeight).toFixed(3)}g</td>
                      <td className="px-4 py-3 text-right text-[#6F6F6F] tabular-nums">{Number(item.purity).toFixed(2)}%</td>
                      <td className="px-4 py-3 text-right font-semibold text-[#2C2C2C] tabular-nums">{Number(item.netWeightOfMetal).toFixed(3)}g</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Metal Totals */}
            <div className="flex gap-4">
              {Number(pledge.netWeightOfSilver) > 0 && (
                <div className="flex-1 bg-[#656950] rounded-[12px] p-3 flex items-center justify-between text-white shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-[13px] font-bold">
                      S
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-white/80">Total Silver</p>
                      <p className="text-[15px] font-bold">{Number(pledge.netWeightOfSilver).toFixed(3)}g</p>
                    </div>
                  </div>
                </div>
              )}
              {Number(pledge.netWeightOfGold) > 0 && (
                <div className="flex-1 bg-[#5A5F45] rounded-[12px] p-3 flex items-center justify-between text-white shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-[13px] font-bold">
                      G
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-white/80">Total Gold</p>
                      <p className="text-[15px] font-bold">{Number(pledge.netWeightOfGold).toFixed(3)}g</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* ════════════════════════════════════ */}
        {/* RIGHT COLUMN                         */}
        {/* ════════════════════════════════════ */}
        <div className="bg-white border border-[#ECEAE4] rounded-[20px] p-6 shadow-sm sticky top-6">

          <div className="flex items-center gap-2 text-[16px] font-semibold text-[#2C2C2C] mb-6">
            <Calendar size={18} className="text-[#8C8F7A]" /> Interest Calculation
          </div>

          <div className="space-y-5">
            {/* Release Date */}
            <div>
              <label className="block text-[11px] font-bold tracking-widest text-[#2C2C2C] mb-2 uppercase">
                Release Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={releaseDate}
                  min={pledge.pledgeDate}
                  onChange={e => setReleaseDate(e.target.value)}
                  className="w-full bg-[#F9F8F3] border border-[#ECEAE4] rounded-[12px] px-4 py-3 text-[14px] text-[#2C2C2C] focus:outline-none focus:ring-2 focus:ring-[#8C8F7A] transition-all"
                />
              </div>
              {isBeforePledge && (
                <p className="text-[11px] text-red-600 flex items-center gap-1 mt-1.5">
                  <AlertTriangle size={11} /> Must be after pledge date ({fmtDate(pledge.pledgeDate)})
                </p>
              )}
            </div>

            {/* Interest Method */}
            <div>
              <label className="block text-[11px] font-bold tracking-widest text-[#2C2C2C] mb-2 uppercase">
                Interest Method
              </label>

              <label className="flex items-center gap-3 cursor-pointer select-none bg-[#F9F8F3] border border-[#ECEAE4] rounded-[12px] px-4 py-3">
                <input
                  type="checkbox"
                  checked={allowCompounding}
                  onChange={e => setAllowCompounding(e.target.checked)}
                  className="h-4 w-4 accent-[#6B7150] cursor-pointer"
                />
                <span className="text-[14px] font-medium text-[#2C2C2C]">Compound interest</span>
              </label>

              <p className="text-[11px] text-[#8C8F7A] mt-1.5 ml-1 leading-relaxed">
                Off = simple interest on principal. On = interest compounds per{" "}
                {titleCase(compoundingDuration)} cycle.
              </p>

              {allowCompounding && (
                <div className="mt-3">
                  <label className="block text-[10px] font-bold tracking-widest text-[#8C8F7A] mb-1.5 uppercase">
                    Compounding Cycle
                  </label>
                  <select
                    value={compoundingDuration}
                    onChange={e =>
                      setCompoundingDuration(
                        e.target.value as "MONTHLY" | "HALFYEARLY" | "YEARLY"
                      )
                    }
                    className="w-full bg-[#F9F8F3] border border-[#ECEAE4] rounded-[12px] px-4 py-3 text-[14px] text-[#2C2C2C] focus:outline-none focus:ring-2 focus:ring-[#8C8F7A] transition-all"
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="HALFYEARLY">Half-yearly</option>
                    <option value="YEARLY">Yearly</option>
                  </select>
                </div>
              )}
            </div>

            {/* Calculation Summary */}
            <div className="bg-[#F9F8F3] rounded-[16px] overflow-hidden mt-6">
              <div className="px-5 py-4">
                <h3 className="text-[10px] font-bold tracking-widest uppercase text-[#2C2C2C] mb-4">Calculation Summary</h3>

                {calc && !isBeforePledge ? (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-[13px]">
                      <span className="text-[#6F6F6F]">Duration</span>
                      <span className="font-semibold text-[#2C2C2C]">{calc.T.toFixed(2)} months</span>
                    </div>
                    <div className="flex justify-between items-center text-[13px]">
                      <span className="text-[#6F6F6F]">Principal</span>
                      <span className="font-semibold text-[#2C2C2C]">{fmt(Number(pledge.loanAmount))}</span>
                    </div>
                    <div className="flex justify-between items-center text-[13px]">
                      <span className="text-[#6F6F6F]">Total Interest</span>
                      <span className="font-semibold text-[#B91C1C]">{fmt(calc.totalInterest)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-[13px] text-[#8C8F7A] py-4 text-center">
                    Select a valid release date to view calculation.
                  </div>
                )}
              </div>

              <div className="bg-[#F4F3EE] px-5 py-4 border-t border-[#ECEAE4]">
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-semibold text-[#6F6F6F]">Receivable Amount</span>
                  <span className="text-[24px] font-bold text-[#555B3F] tabular-nums">
                    {calc && !isBeforePledge ? fmt(calc.receivableAmount) : "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* Warning Box */}
            <div className="bg-[#FFF5F5] border border-[#FEE2E2] rounded-[12px] p-4 flex gap-3 items-start">
              <AlertTriangle size={16} className="text-[#DC2626] shrink-0 mt-0.5" />
              <p className="text-[12px] text-[#991B1B] leading-relaxed">
                By releasing this pledge, the pledge status will change to <span className="font-semibold">Released</span> and all pledged items will be marked returned.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-[12px] p-3 rounded-[10px]">
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4 pt-2">
              <button
                type="button"
                onClick={() => router.push(`/customers/${params.customerId}/pledges/${params.pledgeId}`)}
                className="flex-1 bg-[#EAE8E1] hover:bg-[#DEDCD4] text-[#2C2C2C] text-[14px] font-semibold py-3.5 rounded-[12px] transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRelease}
                disabled={loading || !canRelease}
                className="flex-1 flex items-center justify-center gap-2 bg-[#6B7150] hover:bg-[#585E42] text-white text-[14px] font-semibold py-3.5 rounded-[12px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {loading ? (
                  <Loader2 className="animate-spin w-4 h-4" />
                ) : (
                  <>Release Pledge </>
                )}
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}