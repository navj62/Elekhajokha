"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useParams }                                          from "next/navigation";
import Link                                                   from "next/link";
import {
  Loader2, ArrowLeft, User, Calendar, Tag,
  Scale, TrendingUp, Receipt, Plus, ChevronUp, RefreshCw,
} from "lucide-react";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Input }                from "@/components/ui/input";
import { Button }               from "@/components/ui/button";
import { Label }                from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { calculateLTV }            from "@/lib/calculateLTV";
import { calculateHybridInterest } from "@/lib/interest";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
interface PledgeItem {
  id:               string;
  itemType:         string;
  metalType:        string;
  itemName:         string | null;
  quantity:         number;
  grossWeight:      number;
  netWeight:        number;
  purity:           number;
  netWeightOfMetal: number;
}

interface Transaction {
  id:        string;
  amount:    string;   // ✅ FIX 1 — keep as string, Prisma Decimal → string in JSON
  type:      "REPAYMENT_PRINCIPAL" | "REPAYMENT_INTEREST" | "TOPUP";
  note:      string | null;
  createdAt: string;
}

interface PledgeDetail {
  id:                  string;
  pledgeDate:          string;
  status:              string;
  loanAmount:          number;
  interestRate:        number;
  compoundingDuration: "MONTHLY" | "HALFYEARLY" | "YEARLY";
  allowCompounding:    boolean;
  durationMonths:      number | null;
  netWeightOfGold:     number;
  netWeightOfSilver:   number;
  totalInterest:       number | null;
  receivableAmount:    number | null;
  remark:              string | null;
  itemPhoto:           string | null;
  items:               PledgeItem[];
  customer: {
    id:      string;
    name:    string;
    mobile:  string | null;
    address: string | null;
    region:  string | null;
  };
}

interface MarketRates {
  goldPerGram:   number | null;
  silverPerGram: number | null;
  updatedAt:     string | null;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */
const TRANSACTION_TYPES = [
  { value: "REPAYMENT_PRINCIPAL", label: "Principal Repayment" },
  { value: "REPAYMENT_INTEREST",  label: "Interest Payment"    },
  { value: "TOPUP",               label: "Top-Up"              },
] as const;

// ✅ FIX 9 — quick amount shortcuts
const QUICK_AMOUNTS = [1000, 5000, 10000] as const;

/* ------------------------------------------------------------------ */
/*  Formatters                                                          */
/* ------------------------------------------------------------------ */
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

/* ------------------------------------------------------------------ */
/*  UI helpers                                                          */
/* ------------------------------------------------------------------ */
function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, string> = {
    ACTIVE:   "bg-emerald-100 text-emerald-700",
    RELEASED: "bg-gray-100   text-gray-600",
    OVERDUE:  "bg-red-100    text-red-700",
  };
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${cfg[status] ?? "bg-gray-100 text-gray-500"}`}>
      {titleCase(status)}
    </span>
  );
}

function TxnBadge({ type }: { type: Transaction["type"] }) {
  const cfg = {
    REPAYMENT_PRINCIPAL: { label: "Principal", cls: "bg-emerald-100 text-emerald-700" },
    REPAYMENT_INTEREST:  { label: "Interest",  cls: "bg-blue-100   text-blue-700"    },
    TOPUP:               { label: "Top-Up",    cls: "bg-amber-100  text-amber-700"   },
  }[type];
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  );
}

/* ================================================================== */
/*  Page                                                                */
/* ================================================================== */
export default function PledgeDetailPage() {
  const params = useParams<{ customerId: string; pledgeId: string }>();

  const [pledge,       setPledge]       = useState<PledgeDetail | null>(null);
  const [market,       setMarket]       = useState<MarketRates | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);

  /* ── Transaction form ─────────────────────────────────────────── */
  const [txnAmount,  setTxnAmount]  = useState("");
  const [txnType,    setTxnType]    = useState<Transaction["type"]>("REPAYMENT_PRINCIPAL");
  const [txnNote,    setTxnNote]    = useState("");
  const [txnLoading, setTxnLoading] = useState(false);
  const [txnError,   setTxnError]   = useState("");
  const [showForm,   setShowForm]   = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);

  // ✅ FIX 7 — auto-focus amount input when form opens
  useEffect(() => {
    if (showForm) amountRef.current?.focus();
  }, [showForm]);

  /* ── Load ─────────────────────────────────────────────────────── */
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pledgeRes, marketRes, txnRes] = await Promise.all([
        fetch(`/api/pledges/${params.pledgeId}`),
        fetch("/api/market-rates"),
        fetch(`/api/pledges/${params.pledgeId}/transactions`),
      ]);

      if (!pledgeRes.ok) {
        const d = await pledgeRes.json().catch(() => ({}));
        throw new Error(d.error || `Failed to load pledge (${pledgeRes.status})`);
      }

      const pledgeRaw  = await pledgeRes.json();
      const pledgeData = pledgeRaw?.pledge ?? pledgeRaw;

      if (!pledgeData?.id) {
        throw new Error("Invalid pledge data received from server");
      }
      setPledge(pledgeData);

      if (marketRes.ok) {
        const m = await marketRes.json();
        setMarket({
          goldPerGram:   m?.gold?.inrPerGram   ? Number(m.gold.inrPerGram)   : null,
          silverPerGram: m?.silver?.inrPerGram ? Number(m.silver.inrPerGram) : null,
          updatedAt:     m?.gold?.createdAt    ?? null,
        });
      }

      // ✅ FIX 5 — log warning but don't silently swallow
      if (txnRes.ok) {
        const txns = await txnRes.json();
        setTransactions(Array.isArray(txns.transactions) ? txns.transactions : []);
      } else {
        console.warn(`Transactions failed to load: ${txnRes.status}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load pledge");
    } finally {
      setLoading(false);
    }
  }, [params.pledgeId]);

  useEffect(() => { load(); }, [load]);

  /* ── Calculations ─────────────────────────────────────────────── */
  // ✅ FIX 3 — useMemo so calculations don't run on every render
  const calculations = useMemo(() => {
    if (!pledge) return null;

    const now        = new Date();
    const pledgeDate = new Date(pledge.pledgeDate);

    const interest = calculateHybridInterest(
      pledge.loanAmount,
      pledge.interestRate,
      pledgeDate,
      now,
      pledge.allowCompounding,
      pledge.compoundingDuration
    );

    const ltv = calculateLTV({
      principal:           pledge.loanAmount,
      rate:                pledge.interestRate,
      pledgeDate,
      currentDate:         now,
      allowCompounding:    pledge.allowCompounding,
      compoundingDuration: pledge.compoundingDuration,
      goldWeight:          pledge.netWeightOfGold,
      silverWeight:        pledge.netWeightOfSilver,
      goldPrice:           market?.goldPerGram   ?? null,
      silverPrice:         market?.silverPerGram ?? null,
    });

    return { interest, ltv };
  }, [pledge, market]); // only recalculates when pledge or market prices change

  /* ── Add transaction ──────────────────────────────────────────── */
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
      const res = await fetch(`/api/pledges/${params.pledgeId}/transactions`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          amount,
          type: txnType,
          note: txnNote.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add transaction");

      // ✅ FIX 2 — no Number() conversion, keep amount as string from API
      setTransactions((prev) => [data.transaction, ...prev]);
      setTxnAmount("");
      setTxnNote("");
      setShowForm(false);
    } catch (err) {
      setTxnError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setTxnLoading(false);
    }
  }

  /* ================================================================ */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-gray-300" size={28} />
      </div>
    );
  }

  // ✅ FIX 6 — retry button on error
  if (error || !pledge) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-3">
        <Alert variant="destructive">
          <AlertDescription>{error ?? "Pledge not found"}</AlertDescription>
        </Alert>
        <Button variant="outline" onClick={load} className="flex items-center gap-2">
          <RefreshCw size={13} /> Retry
        </Button>
      </div>
    );
  }

  const { interest, ltv: ltvResult } = calculations!;

  /* ================================================================ */
  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div>
        <Link
          href={`/customers/${params.customerId}`}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-3"
        >
          <ArrowLeft size={14} /> Back to customer
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start justify-between gap-3">
  <div>
    <h1 className="text-2xl font-bold text-gray-900">Pledge Details</h1>
    <p className="text-xs text-gray-400 mt-0.5">
      #{pledge.id.slice(0, 8).toUpperCase()}
    </p>
  </div>

  <div className="flex items-center gap-2">
    <StatusBadge status={pledge.status} />

    {pledge.status === "ACTIVE" && (
      <Link href={`/customers/${params.customerId}/pledges/${params.pledgeId}/release`}>
        <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white">
          Release
        </Button>
      </Link>
    )}
  </div>
</div>
          
        </div>
      </div>

      

      {/* ── Customer ───────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-gray-600">
            <User size={14} /> Customer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          <InfoRow label="Name" value={
            <Link href={`/customers/${pledge.customer.id}`} className="text-blue-600 hover:underline">
              {pledge.customer.name}
            </Link>
          } />
          {pledge.customer.mobile  && <InfoRow label="Mobile"  value={pledge.customer.mobile}  />}
          {pledge.customer.address && <InfoRow label="Address" value={pledge.customer.address} />}
          {pledge.customer.region  && <InfoRow label="Region"  value={pledge.customer.region}  />}
        </CardContent>
      </Card>

      {/* ── Loan details ───────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-gray-600">
            <Calendar size={14} /> Loan Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          <InfoRow label="Pledge Date"   value={fmtDate(pledge.pledgeDate)} />
          <InfoRow label="Loan Amount"   value={<span className="tabular-nums">{fmtINR(pledge.loanAmount)}</span>} />
          <InfoRow label="Interest Rate" value={`${pledge.interestRate}% p.a.`} />
          <InfoRow
            label="Compounding"
            value={`${titleCase(pledge.compoundingDuration)}${pledge.allowCompounding ? "" : " (Simple)"}`}
          />
          {pledge.durationMonths !== null && (
            <InfoRow label="Duration" value={`${pledge.durationMonths} months`} />
          )}
          {pledge.remark && <InfoRow label="Remark" value={pledge.remark} />}
        </CardContent>
      </Card>

      {/* ── Items ──────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-gray-600">
            <Tag size={14} /> Pledged Items ({pledge.items.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {pledge.items.map((item, i) => (
            <div key={item.id} className="rounded-lg border bg-gray-50 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Item {i + 1}
                  </span>
                  <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-md">
                    {titleCase(item.itemType)}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                    item.metalType === "GOLD"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-slate-100 text-slate-600"
                  }`}>
                    {titleCase(item.metalType)}
                  </span>
                </div>
                <span className="text-xs text-gray-400 shrink-0">
                  {item.quantity} pc{item.quantity !== 1 ? "s" : ""}
                </span>
              </div>

              {item.itemName && (
                <p className="text-sm text-gray-700 font-medium">{item.itemName}</p>
              )}

              <div className="grid grid-cols-4 gap-2 text-xs">
                <div>
                  <p className="text-gray-400">Gross Wt</p>
                  <p className="font-medium tabular-nums">{Number(item.grossWeight).toFixed(3)}g</p>
                </div>
                <div>
                  <p className="text-gray-400">Net Wt</p>
                  <p className="font-medium tabular-nums">{Number(item.netWeight).toFixed(3)}g</p>
                </div>
                <div>
                  <p className="text-gray-400">Purity</p>
                  <p className="font-medium tabular-nums">{Number(item.purity).toFixed(2)}%</p>
                </div>
                <div>
                  <p className="text-gray-400">Net Metal</p>
                  <p className="font-semibold tabular-nums">{Number(item.netWeightOfMetal).toFixed(3)}g</p>
                </div>
              </div>
            </div>
          ))}

          {/* Metal totals */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            {pledge.netWeightOfGold > 0 && (
              <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2">
                <p className="text-xs text-amber-500 flex items-center gap-1 mb-1">
                  <Scale size={10} /> Total Gold
                </p>
                <p className="text-base font-bold text-amber-800 tabular-nums">
                  {Number(pledge.netWeightOfGold).toFixed(3)}g
                </p>
              </div>
            )}
            {pledge.netWeightOfSilver > 0 && (
              <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
                <p className="text-xs text-slate-500 flex items-center gap-1 mb-1">
                  <Scale size={10} /> Total Silver
                </p>
                <p className="text-base font-bold text-slate-700 tabular-nums">
                  {Number(pledge.netWeightOfSilver).toFixed(3)}g
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Financials ─────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-gray-600">
            <TrendingUp size={14} /> Financials
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          {ltvResult.marketValue !== null ? (
            <>
              {market?.goldPerGram && pledge.netWeightOfGold > 0 && (
                <InfoRow
                  label="Gold Value"
                  value={
                    <span className="text-amber-700 font-semibold tabular-nums">
                      {fmtINR(pledge.netWeightOfGold * market.goldPerGram)}
                      <span className="text-xs text-gray-400 ml-1 font-normal">
                        @{fmtINR(market.goldPerGram)}/g
                      </span>
                    </span>
                  }
                />
              )}
              {market?.silverPerGram && pledge.netWeightOfSilver > 0 && (
                <InfoRow
                  label="Silver Value"
                  value={
                    <span className="text-slate-700 font-semibold tabular-nums">
                      {fmtINR(pledge.netWeightOfSilver * market.silverPerGram)}
                      <span className="text-xs text-gray-400 ml-1 font-normal">
                        @{fmtINR(market.silverPerGram)}/g
                      </span>
                    </span>
                  }
                />
              )}
              <InfoRow
                label="Total Market Value"
                value={<span className="text-blue-700 font-bold tabular-nums">{fmtINR(ltvResult.marketValue)}</span>}
              />
              {ltvResult.ltv !== null && (
                <InfoRow
                  label="LTV"
                  value={
                    <span className={`font-bold tabular-nums ${
                      ltvResult.ltv > 90 ? "text-red-600"
                      : ltvResult.ltv > 75 ? "text-orange-600"
                      : ltvResult.ltv > 65 ? "text-amber-600"
                      : "text-emerald-600"
                    }`}>
                      {ltvResult.ltv.toFixed(1)}%
                      {ltvResult.riskTier && (
                        <span className="text-xs font-normal text-gray-400 ml-1.5">
                          ({ltvResult.riskTier.replace("_", " ")})
                        </span>
                      )}
                    </span>
                  }
                />
              )}
              <div className="border-t border-gray-100 my-1" />
            </>
          ) : (
            <p className="text-xs text-gray-400 py-2 pb-3">
              Market value unavailable — run the cron job first.
            </p>
          )}

          <InfoRow
            label="Principal"
            value={<span className="tabular-nums">{fmtINR(pledge.loanAmount)}</span>}
          />
          <InfoRow
            label={`Interest Till Today (${interest.T.toFixed(1)} months)`}
            value={
              <span className="text-orange-600 font-semibold tabular-nums">
                {fmtINR(interest.totalInterest)}
              </span>
            }
          />
          <InfoRow
            label="Total Amount Due"
            value={
              <span className="text-gray-900 font-bold tabular-nums text-base">
                {fmtINR(interest.receivableAmount)}
              </span>
            }
          />
        </CardContent>
      </Card>

      {/* ── Transactions ───────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2 text-gray-600">
              <Receipt size={14} /> Transactions ({transactions.length})
            </CardTitle>
            {/* ✅ FIX 4 — guard toggle during loading */}
            <button
              onClick={() => {
                if (txnLoading) return;
                setShowForm((v) => !v);
                setTxnError("");
              }}
              disabled={txnLoading}
              className="flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-900 border rounded-md px-2.5 py-1.5 transition-colors disabled:opacity-40"
            >
              {showForm
                ? <><ChevronUp size={12} /> Cancel</>
                : <><Plus size={12} /> Add</>}
            </button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* ── Form ── */}
          {showForm && (
            <form
              onSubmit={submitTransaction}
              className="rounded-lg border bg-gray-50 p-4 space-y-3"
            >
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                New Transaction
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">
                    Amount (₹) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    ref={amountRef}
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="e.g. 5000"
                    value={txnAmount}
                    onChange={(e) => setTxnAmount(e.target.value)}
                    required
                  />
                  {/* ✅ FIX 9 — quick amount buttons */}
                  <div className="flex gap-1.5 pt-0.5">
                    {QUICK_AMOUNTS.map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setTxnAmount(String(amt))}
                        className="text-xs text-gray-500 border rounded px-2 py-0.5 hover:border-gray-400 hover:text-gray-800 transition-colors"
                      >
                        ₹{(amt / 1000).toFixed(0)}k
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Type</Label>
                  <select
                    className="w-full border rounded-md px-3 py-2 text-sm bg-white"
                    value={txnType}
                    onChange={(e) => setTxnType(e.target.value as Transaction["type"])}
                  >
                    {TRANSACTION_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Note (optional)</Label>
                <Input
                  type="text"
                  placeholder="e.g. Partial repayment by customer"
                  value={txnNote}
                  onChange={(e) => setTxnNote(e.target.value)}
                />
              </div>

              {txnError && (
                <Alert variant="destructive" className="py-2">
                  <AlertDescription className="text-xs">{txnError}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" disabled={txnLoading} size="sm">
                {txnLoading
                  ? <><Loader2 className="animate-spin mr-1.5 w-3 h-3" />Saving…</>
                  : "Save Transaction"}
              </Button>
            </form>
          )}

          {/* ── History ── */}
          {transactions.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">
              No transactions recorded yet.
            </p>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b text-xs text-gray-500 uppercase tracking-wide">
                    <th className="text-left px-3 py-2.5 font-medium">Date</th>
                    <th className="text-left px-3 py-2.5 font-medium">Type</th>
                    <th className="text-right px-3 py-2.5 font-medium">Amount</th>
                    <th className="text-left px-3 py-2.5 font-medium">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {transactions.map((txn) => (
                    <tr key={txn.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap text-xs">
                        {fmtDate(txn.createdAt)}
                      </td>
                      <td className="px-3 py-2.5">
                        <TxnBadge type={txn.type} />
                      </td>
                      {/* ✅ FIX 8 — direction colour: TOPUP = red (money out), repayments = green */}
                      <td className={`px-3 py-2.5 text-right font-semibold tabular-nums ${
                        txn.type === "TOPUP" ? "text-red-600" : "text-emerald-600"
                      }`}>
                        {/* ✅ FIX 1 — Number(txn.amount) only at display time, not stored as number */}
                        {fmtINR(Number(txn.amount))}
                      </td>
                      <td className="px-3 py-2.5 text-gray-500 max-w-[160px] truncate text-xs">
                        {txn.note ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}