"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Loader2,
  ArrowLeft,
  User,
  Calendar,
  Tag,
  TrendingUp,
  Receipt,
  Plus,
  ChevronUp,
  RefreshCw,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";

import { calculateLTV } from "@/lib/calculateLTV";
import { calculateHybridInterest } from "@/lib/interest";
import ReceiptModal from "@/components/ReceiptModal";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
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
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const TRANSACTION_TYPES = [
  { value: "REPAYMENT_PRINCIPAL", label: "Principal Repayment" },
  { value: "REPAYMENT_INTEREST", label: "Interest Payment" },
  { value: "TOPUP", label: "Top-Up" },
] as const;

const QUICK_AMOUNTS = [1000, 5000, 10000] as const;

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function fmtINR(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function titleCase(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, string> = {
    ACTIVE: "bg-emerald-100 text-emerald-700",
    RELEASED: "bg-gray-100 text-gray-600",
    OVERDUE: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`text-xs font-medium px-2.5 py-1 rounded-full ${
        cfg[status] ?? "bg-gray-100 text-gray-500"
      }`}
    >
      {titleCase(status)}
    </span>
  );
}

function TxnBadge({ type }: { type: Transaction["type"] }) {
  const cfg = {
    REPAYMENT_PRINCIPAL: {
      label: "Principal",
      cls: "bg-emerald-100 text-emerald-700",
    },
    REPAYMENT_INTEREST: {
      label: "Interest",
      cls: "bg-blue-100 text-blue-700",
    },
    TOPUP: {
      label: "Top-Up",
      cls: "bg-amber-100 text-amber-700",
    },
  }[type];

  return (
    <span
      className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.cls}`}
    >
      {cfg.label}
    </span>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  );
}

/* ========================================================================== */
/* Page                                                                       */
/* ========================================================================== */

export default function PledgeDetailPage() {
  const params = useParams<{
    customerId: string;
    pledgeId: string;
  }>();

  const [pledge, setPledge] = useState<PledgeDetail | null>(null);
  const [market, setMarket] = useState<MarketRates | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* ---------------------------------------------------------------------- */
  /* Transaction form                                                       */
  /* ---------------------------------------------------------------------- */

  const [txnAmount, setTxnAmount] = useState("");
  const [txnType, setTxnType] =
    useState<Transaction["type"]>("REPAYMENT_PRINCIPAL");
  const [txnNote, setTxnNote] = useState("");

  const [txnLoading, setTxnLoading] = useState(false);
  const [txnError, setTxnError] = useState("");

  const [showForm, setShowForm] = useState(false);

  const amountRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showForm) {
      amountRef.current?.focus();
    }
  }, [showForm]);

  /* ---------------------------------------------------------------------- */
  /* Load                                                                   */
  /* ---------------------------------------------------------------------- */

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [pledgeRes, marketRes, txnRes] = await Promise.all([
        fetch(
          `/api/customers/${params.customerId}/pledges/${params.pledgeId}`
        ),
        fetch("/api/market-rates"),
        fetch(
          `/api/customers/${params.customerId}/pledges/${params.pledgeId}/transactions`
        ),
      ]);

      if (!pledgeRes.ok) {
        const d = await pledgeRes.json().catch(() => ({}));
        throw new Error(
          d.error || `Failed to load pledge (${pledgeRes.status})`
        );
      }

      const pledgeRaw = await pledgeRes.json();
      const pledgeData = pledgeRaw?.pledge ?? pledgeRaw;

      if (!pledgeData?.id) {
        throw new Error("Invalid pledge data received from server");
      }

      setPledge(pledgeData);

      if (marketRes.ok) {
        const m = await marketRes.json();

        setMarket({
          goldPerGram: m?.gold?.inrPerGram
            ? Number(m.gold.inrPerGram)
            : null,
          silverPerGram: m?.silver?.inrPerGram
            ? Number(m.silver.inrPerGram)
            : null,
          updatedAt: m?.gold?.createdAt ?? null,
        });
      }

      if (txnRes.ok) {
        const txns = await txnRes.json();

        setTransactions(
          Array.isArray(txns.transactions) ? txns.transactions : []
        );
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load pledge"
      );
    } finally {
      setLoading(false);
    }
  }, [params.customerId, params.pledgeId]);

  useEffect(() => {
    load();
  }, [load]);

  /* ---------------------------------------------------------------------- */
  /* Calculations                                                           */
  /* ---------------------------------------------------------------------- */

  const calculations = useMemo(() => {
    if (!pledge) return null;

    const now = new Date();
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
      principal: pledge.loanAmount,
      rate: pledge.interestRate,
      pledgeDate,
      currentDate: now,
      allowCompounding: pledge.allowCompounding,
      compoundingDuration: pledge.compoundingDuration,
      goldWeight: pledge.netWeightOfGold,
      silverWeight: pledge.netWeightOfSilver,
      goldPrice: market?.goldPerGram ?? null,
      silverPrice: market?.silverPerGram ?? null,
    });

    return { interest, ltv };
  }, [pledge, market]);

  /* ---------------------------------------------------------------------- */
  /* Submit transaction                                                     */
  /* ---------------------------------------------------------------------- */

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
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount,
            type: txnType,
            note: txnNote.trim() || undefined,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to add transaction");
      }

      setTransactions((prev) => [data.transaction, ...prev]);

      setTxnAmount("");
      setTxnNote("");
      setShowForm(false);
    } catch (err) {
      setTxnError(
        err instanceof Error ? err.message : "Unexpected error"
      );
    } finally {
      setTxnLoading(false);
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Loading                                                                */
  /* ---------------------------------------------------------------------- */

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-gray-300" size={28} />
      </div>
    );
  }

  /* ---------------------------------------------------------------------- */
  /* Error                                                                  */
  /* ---------------------------------------------------------------------- */

  if (error || !pledge) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-3">
        <Alert variant="destructive">
          <AlertDescription>
            {error ?? "Pledge not found"}
          </AlertDescription>
        </Alert>

        <Button
          variant="outline"
          onClick={load}
          className="flex items-center gap-2"
        >
          <RefreshCw size={13} />
          Retry
        </Button>
      </div>
    );
  }

  const { interest, ltv: ltvResult } = calculations!;

  /* ====================================================================== */
  /* UI                                                                     */
  /* ====================================================================== */

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">

      {/* Header */}
      <div>
        <Link
          href={`/customers/${params.customerId}`}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-3"
        >
          <ArrowLeft size={14} />
          Back to customer
        </Link>

        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Pledge Details
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              #{pledge.id.slice(0, 8).toUpperCase()}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <StatusBadge status={pledge.status} />

            {pledge.status === "ACTIVE" && (
              <Link
                href={`/customers/${params.customerId}/pledges/${params.pledgeId}/release`}
              >
                <Button
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Release
                </Button>
              </Link>
            )}

            <ReceiptModal
              customerId={params.customerId}
              pledgeId={pledge.id}
            />
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* ── Customer Info ── */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <User size={14} />
              Customer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            <InfoRow label="Name" value={pledge.customer.name} />
            <InfoRow
              label="Mobile"
              value={pledge.customer.mobile ?? "—"}
            />
            <InfoRow
              label="Address"
              value={pledge.customer.address ?? "—"}
            />
            <InfoRow
              label="Region"
              value={pledge.customer.region ?? "—"}
            />
          </CardContent>
        </Card>

        {/* ── Loan Info ── */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Calendar size={14} />
              Loan Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            <InfoRow
              label="Pledge Date"
              value={fmtDate(pledge.pledgeDate)}
            />
            <InfoRow
              label="Loan Amount"
              value={fmtINR(pledge.loanAmount)}
            />
            <InfoRow
              label="Interest Rate"
              value={`${pledge.interestRate}% p.a.`}
            />
            <InfoRow
              label="Compounding"
              value={
                pledge.allowCompounding
                  ? titleCase(pledge.compoundingDuration)
                  : "None"
              }
            />
            {pledge.durationMonths != null && (
              <InfoRow
                label="Duration"
                value={`${pledge.durationMonths} months`}
              />
            )}
            {pledge.remark && (
              <InfoRow label="Remark" value={pledge.remark} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Interest & LTV ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <TrendingUp size={14} />
            Interest &amp; LTV
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Principal</p>
              <p className="text-base font-semibold text-gray-900">
                {fmtINR(pledge.loanAmount)}
              </p>
            </div>
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Accrued Interest</p>
              <p className="text-base font-semibold text-blue-700">
                {fmtINR(interest.interest)}
              </p>
            </div>
            <div className="bg-amber-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Total Due</p>
              <p className="text-base font-semibold text-amber-700">
                {fmtINR(interest.total)}
              </p>
            </div>
            <div
              className={`rounded-lg p-3 ${
                ltvResult?.ltv != null && ltvResult.ltv > 75
                  ? "bg-red-50"
                  : "bg-emerald-50"
              }`}
            >
              <p className="text-xs text-gray-500 mb-1">LTV</p>
              <p
                className={`text-base font-semibold ${
                  ltvResult?.ltv != null && ltvResult.ltv > 75
                    ? "text-red-600"
                    : "text-emerald-700"
                }`}
              >
                {ltvResult?.ltv != null
                  ? `${ltvResult.ltv.toFixed(1)}%`
                  : "N/A"}
              </p>
            </div>
          </div>

          {market && (
            <p className="text-xs text-gray-400 mt-3">
              Market rates — Gold:{" "}
              {market.goldPerGram != null
                ? fmtINR(market.goldPerGram) + "/g"
                : "N/A"}{" "}
              · Silver:{" "}
              {market.silverPerGram != null
                ? fmtINR(market.silverPerGram) + "/g"
                : "N/A"}
              {market.updatedAt && (
                <> · Updated {fmtDate(market.updatedAt)}</>
              )}
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Pledged Items ── */}
      {pledge.items.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Tag size={14} />
              Pledged Items ({pledge.items.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-50">
              {pledge.items.map((item) => (
                <div
                  key={item.id}
                  className="px-5 py-3 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {item.itemName ?? item.itemType}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {item.metalType} · Qty {item.quantity} · Purity{" "}
                      {item.purity}%
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium text-gray-900">
                      {Number(item.netWeightOfMetal).toFixed(2)}g net
                    </p>
                    <p className="text-xs text-gray-400">
                      {Number(item.grossWeight).toFixed(2)}g gross
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Transactions ── */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Receipt size={14} />
              Transactions ({transactions.length})
            </CardTitle>

            {pledge.status === "ACTIVE" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowForm((v) => !v)}
                className="flex items-center gap-1.5 text-xs"
              >
                {showForm ? (
                  <>
                    <ChevronUp size={12} /> Cancel
                  </>
                ) : (
                  <>
                    <Plus size={12} /> Add
                  </>
                )}
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Add-transaction form */}
          {showForm && (
            <form
              onSubmit={submitTransaction}
              className="border border-gray-100 rounded-lg p-4 space-y-3 bg-gray-50"
            >
              {txnError && (
                <Alert variant="destructive" className="py-2">
                  <AlertDescription className="text-xs">
                    {txnError}
                  </AlertDescription>
                </Alert>
              )}

              {/* Type selector */}
              <div className="space-y-1.5">
                <Label className="text-xs">Type</Label>
                <div className="flex gap-2 flex-wrap">
                  {TRANSACTION_TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() =>
                        setTxnType(t.value as Transaction["type"])
                      }
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                        txnType === t.value
                          ? "bg-gray-900 text-white border-gray-900"
                          : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount */}
              <div className="space-y-1.5">
                <Label htmlFor="txn-amount" className="text-xs">
                  Amount (₹)
                </Label>
                <Input
                  id="txn-amount"
                  ref={amountRef}
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="0.00"
                  value={txnAmount}
                  onChange={(e) => setTxnAmount(e.target.value)}
                  className="h-8 text-sm"
                />
                <div className="flex gap-1.5">
                  {QUICK_AMOUNTS.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setTxnAmount(String(q))}
                      className="text-xs px-2 py-1 rounded border border-gray-200 bg-white text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors"
                    >
                      +{(q / 1000).toFixed(0)}k
                    </button>
                  ))}
                </div>
              </div>

              {/* Note */}
              <div className="space-y-1.5">
                <Label htmlFor="txn-note" className="text-xs">
                  Note (optional)
                </Label>
                <Input
                  id="txn-note"
                  placeholder="e.g. partial payment"
                  value={txnNote}
                  onChange={(e) => setTxnNote(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>

              <Button
                type="submit"
                size="sm"
                disabled={txnLoading}
                className="w-full"
              >
                {txnLoading ? (
                  <Loader2 size={13} className="animate-spin mr-1.5" />
                ) : null}
                Save Transaction
              </Button>
            </form>
          )}

          {/* Transaction list */}
          {transactions.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">
              No transactions yet
            </p>
          ) : (
            <div className="divide-y divide-gray-50">
              {transactions.map((txn) => (
                <div
                  key={txn.id}
                  className="flex items-center justify-between py-3 gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <TxnBadge type={txn.type} />
                      {txn.note && (
                        <span className="text-xs text-gray-400 truncate">
                          {txn.note}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">
                      {fmtDate(txn.createdAt)}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 shrink-0">
                    {fmtINR(Number(txn.amount))}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}