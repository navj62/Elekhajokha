"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Loader2, ArrowLeft, AlertTriangle, CheckCircle2 } from "lucide-react";
import { calculateHybridInterest } from "@/lib/interest";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */
type Compounding = "MONTHLY" | "HALFYEARLY" | "YEARLY";

interface PreflightPledge {
  id: string;
  pledgeDate: string;
  loanAmount: number;
  interestRate: number;
  allowCompounding: boolean;
  compoundingDuration: Compounding;
  assetLabel: string;
  previewInterest: number;
  previewReceivable: number;
  previewMarketValue: number | null;
  previewLtv: number | null;
}

interface PreflightResponse {
  success: true;
  customerName: string;
  pledges: PreflightPledge[];
  totals: { principal: number; interest: number; receivable: number; count: number };
  prices: { goldPerGram: number | null; silverPerGram: number | null; updatedAt: string | null };
  latestPledgeDate: string;
}

// Per-pledge row: static preview fields + mutable compounding + locally recomputed amounts.
interface RowState extends PreflightPledge {
  marketValue: number | null;
  interest: number;
  receivable: number;
  ltv: number | null;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
const rupees = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

const toDateInput = (iso: string) => new Date(iso).toISOString().split("T")[0];

const COMPOUNDING_OPTIONS: Compounding[] = ["MONTHLY", "HALFYEARLY", "YEARLY"];

// Mirror financial-summary's ltvColor thresholds.
function ltvColor(ltv: number | null): string {
  if (ltv === null) return "var(--text-muted, #9E9E9E)";
  if (ltv < 65) return "#4D6B2A";
  if (ltv <= 75) return "#8A6B17";
  if (ltv <= 90) return "#9A4B14";
  return "#B91C1C";
}

// Build a row from a preflight pledge, recomputing amounts for the given compounding.
function buildRow(
  p: PreflightPledge,
  releaseDate: string,
  allowCompounding: boolean,
  compoundingDuration: Compounding
): RowState {
  const calc = calculateHybridInterest(
    p.loanAmount,
    p.interestRate,
    new Date(p.pledgeDate),
    new Date(releaseDate),
    allowCompounding,
    compoundingDuration
  );
  const mv = p.previewMarketValue;
  const ltv = mv !== null && mv > 0 ? Math.round((calc.receivableAmount / mv) * 10000) / 100 : null;
  return {
    ...p,
    allowCompounding,
    compoundingDuration,
    marketValue: mv,
    interest: calc.totalInterest,
    receivable: calc.receivableAmount,
    ltv,
  };
}

/* ================================================================== */
/* Inner page                                                          */
/* ================================================================== */
function BulkReleaseInner() {
  const params = useParams<{ customerId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const customerId = params.customerId;

  const idsParam = searchParams.get("ids") ?? "";
  const ids = idsParam.split(",").map((s) => s.trim()).filter(Boolean);

  const [releaseDate, setReleaseDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [minDate, setMinDate] = useState<string | undefined>(undefined);
  const [customerName, setCustomerName] = useState("");
  const [rows, setRows] = useState<RowState[]>([]);

  const [loading, setLoading] = useState(true);     // preflight in flight
  const [fatalError, setFatalError] = useState(""); // unrecoverable → show "Go back"
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState(""); // recoverable submit error (stay on page)
  const [showConfirm, setShowConfirm] = useState(false);
  const [successToast, setSuccessToast] = useState("");

  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const autoAdjustedRef = useRef(false); // prevent INVALID_RELEASE_DATE loops

  /* ---- Preflight ------------------------------------------------ */
  const runPreflight = useCallback(
    async (date: string) => {
      setLoading(true);
      setActionError("");
      try {
        const res = await fetch(
          `/api/customers/${customerId}/pledges/bulk-release/preflight`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pledgeIds: ids, releaseDate: date }),
          }
        );
        const data = await res.json();

        if (!res.ok) {
          switch (data?.error) {
            case "INVALID_RELEASE_DATE":
              // Auto-adjust the date once and re-preflight.
              if (!autoAdjustedRef.current && data.suggestedMinDate) {
                autoAdjustedRef.current = true;
                const next = toDateInput(data.suggestedMinDate);
                setMinDate(next);
                setReleaseDate(next);
                await runPreflight(next);
                return;
              }
              setFatalError("Release date is invalid for the selected pledges.");
              break;
            case "OWNERSHIP_VIOLATION":
              setFatalError("Some selected pledges aren't valid. Please re-select.");
              break;
            case "ALREADY_RELEASED":
              setFatalError("Some pledges were already released. Please refresh and try again.");
              break;
            case "NO_METAL_PRICES":
              setFatalError("Metal prices unavailable. Try again shortly.");
              break;
            default:
              setFatalError("Could not load the selected pledges. Please go back and try again.");
          }
          setLoading(false);
          return;
        }

        const pf = data as PreflightResponse;
        if (!pf.pledges.length) {
          setFatalError("No releasable pledges found. Please go back and re-select.");
          setLoading(false);
          return;
        }

        setCustomerName(pf.customerName);
        // Picker min = latest pledge date + 1 day (strict "after" on the server).
        const minSelectable = new Date(pf.latestPledgeDate);
        minSelectable.setDate(minSelectable.getDate() + 1);
        setMinDate(minSelectable.toISOString().split("T")[0]);

        // Seed rows with stored compounding defaults (server already computed these).
        setRows(
          pf.pledges.map((p) => ({
            ...p,
            allowCompounding: p.allowCompounding,
            compoundingDuration: p.compoundingDuration,
            marketValue: p.previewMarketValue,
            interest: p.previewInterest,
            receivable: p.previewReceivable,
            ltv: p.previewLtv,
          }))
        );
        setFatalError("");
        setLoading(false);
      } catch {
        setFatalError("Network error while loading pledges. Please try again.");
        setLoading(false);
      }
    },
    [customerId, idsParam] // eslint-disable-line react-hooks/exhaustive-deps
  );

  /* ---- Mount: guard ids, initial preflight ---------------------- */
  useEffect(() => {
    if (ids.length === 0) {
      router.replace(`/customers/${customerId}`);
      return;
    }
    runPreflight(releaseDate);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- Date change: debounced re-preflight (server round-trip) -- */
  function onDateChange(value: string) {
    setReleaseDate(value);
    autoAdjustedRef.current = true; // user picked a date; don't auto-override it
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runPreflight(value), 300);
  }

  /* ---- Per-pledge compounding change: LOCAL recompute only ------ */
  function setRowCompounding(id: string, allow: boolean) {
    setRows((prev) =>
      prev.map((r) =>
        r.id === id ? buildRow(r, releaseDate, allow, r.compoundingDuration) : r
      )
    );
  }
  function setRowDuration(id: string, duration: Compounding) {
    setRows((prev) =>
      prev.map((r) =>
        r.id === id ? buildRow(r, releaseDate, r.allowCompounding, duration) : r
      )
    );
  }

  /* ---- Totals (reflect overrides) ------------------------------- */
  const totals = rows.reduce(
    (acc, r) => {
      acc.principal += r.loanAmount;
      acc.interest += r.interest;
      acc.receivable += r.receivable;
      return acc;
    },
    { principal: 0, interest: 0, receivable: 0 }
  );

  /* ---- Submit (all-or-nothing on the server) -------------------- */
  async function handleConfirmRelease() {
    setSubmitting(true);
    setActionError("");
    try {
      const res = await fetch(`/api/customers/${customerId}/pledges/bulk-release`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          releaseDate,
          pledges: rows.map((r) => ({
            id: r.id,
            allowCompounding: r.allowCompounding,
            compoundingDuration: r.compoundingDuration,
          })),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setShowConfirm(false);
        if (data?.error === "ALREADY_RELEASED") {
          setActionError("One or more pledges were already released. Please refresh and re-select.");
        } else {
          setActionError("Could not complete release. Please try again.");
        }
        setSubmitting(false);
        return;
      }

      // Success — the server committed atomically (all-or-nothing).
      setShowConfirm(false);
      setSuccessToast(`${data.releasedCount} pledge${data.releasedCount !== 1 ? "s" : ""} released successfully`);
      setTimeout(() => router.push(`/customers/${customerId}`), 1100);
    } catch {
      setShowConfirm(false);
      setActionError("Could not complete release. Please try again.");
      setSubmitting(false);
    }
  }

  /* ================================================================ */
  /* Render states                                                    */
  /* ================================================================ */
  if (loading && rows.length === 0 && !fatalError) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-[#565C3F]" size={28} />
      </div>
    );
  }

  if (fatalError) {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-4">
        <div className="rounded-[16px] border border-red-200 bg-red-50 px-5 py-4 text-[13px] text-red-700 flex items-start gap-2">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" /> {fatalError}
        </div>
        <Link
          href={`/customers/${customerId}`}
          className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#565C3F] border border-[#ECEAE4] rounded-[10px] px-4 py-2 hover:bg-[#F9F8F3] transition-colors"
        >
          <ArrowLeft size={14} /> Go back
        </Link>
      </div>
    );
  }

  const count = rows.length;

  return (
    <div className="max-w-[1100px] mx-auto px-6 lg:px-8 pt-8 pb-28 text-[#2C2C2C]">
      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        <Link
          href={`/customers/${customerId}`}
          className="flex items-center justify-center w-10 h-10 shrink-0 bg-[#E8EBD8] rounded-full text-[#555B3F] hover:bg-[#D3D9BB] transition-colors mt-0.5"
        >
          <ArrowLeft size={18} strokeWidth={2.5} />
        </Link>
        <div>
          <h1 className="text-[30px] font-semibold tracking-tight leading-none mb-2">
            Release {count} Pledge{count !== 1 ? "s" : ""}
          </h1>
          <p className="text-[14px] text-[#6F6F6F]">{customerName}</p>
        </div>
      </div>

      {/* Card 1 — Release Settings */}
      <div className="bg-white border border-[#ECEAE4] rounded-[20px] p-6 shadow-sm mb-6">
        <p className="text-[10px] uppercase tracking-wider font-bold text-[#8C8F7A] mb-4">Release Settings</p>
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div>
            <label className="block text-[11px] font-bold tracking-widest text-[#2C2C2C] mb-2 uppercase">
              Release Date
            </label>
            <div className="flex items-center gap-3">
              <input
                type="date"
                value={releaseDate}
                min={minDate}
                onChange={(e) => onDateChange(e.target.value)}
                className="bg-[#F9F8F3] border border-[#ECEAE4] rounded-[12px] px-4 py-3 text-[14px] text-[#2C2C2C] focus:outline-none focus:ring-2 focus:ring-[#8C8F7A] transition-all"
              />
              {loading && <Loader2 className="animate-spin text-[#8C8F7A]" size={16} />}
            </div>
          </div>
          <p className="text-[12px] text-[#8C8F7A] sm:pb-3.5">
            All selected pledges will be released on this date.
          </p>
        </div>
      </div>

      {/* Card 2 — Per-Pledge Details */}
      <div className="bg-white border border-[#ECEAE4] rounded-[20px] p-6 shadow-sm mb-6">
        <p className="text-[10px] uppercase tracking-wider font-bold text-[#8C8F7A] mb-4">Pledge Details</p>
        <div className="overflow-x-auto rounded-[12px] border border-[#ECEAE4]">
          <table className="w-full text-[13px] bg-[#F9F8F3]">
            <thead>
              <tr className="border-b border-[#ECEAE4] text-[#8C8F7A] text-[10px] font-bold tracking-widest uppercase">
                <th className="text-left px-4 py-3">Asset</th>
                <th className="text-right px-4 py-3">Principal</th>
                <th className="text-right px-4 py-3">Interest</th>
                <th className="text-right px-4 py-3">Receivable</th>
                <th className="text-right px-4 py-3">LTV</th>
                <th className="text-left px-4 py-3">Compounding</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ECEAE4]">
              {rows.map((r) => (
                <tr key={r.id} className="bg-[#FDFCF9] align-top">
                  <td className="px-4 py-3 font-semibold text-[#2C2C2C]">{r.assetLabel}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-[#2C2C2C]">{rupees(r.loanAmount)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-[#B91C1C]">{rupees(r.interest)}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold text-[#2C2C2C]">{rupees(r.receivable)}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold" style={{ color: ltvColor(r.ltv) }}>
                    {r.ltv !== null ? r.ltv.toFixed(1) + "%" : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={r.allowCompounding}
                        onChange={(e) => setRowCompounding(r.id, e.target.checked)}
                        className="h-4 w-4 accent-[#565C3F] cursor-pointer"
                      />
                      <span className="text-[12px] font-medium text-[#2C2C2C]">Compound</span>
                    </label>
                    {r.allowCompounding && (
                      <select
                        value={r.compoundingDuration}
                        onChange={(e) => setRowDuration(r.id, e.target.value as Compounding)}
                        className="mt-2 bg-white border border-[#ECEAE4] rounded-[8px] px-2 py-1 text-[12px] text-[#2C2C2C] focus:outline-none focus:ring-2 focus:ring-[#8C8F7A]"
                      >
                        {COMPOUNDING_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt.charAt(0) + opt.slice(1).toLowerCase()}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Card 3 — Totals Summary */}
      <div className="bg-white border border-[#ECEAE4] rounded-[20px] p-6 shadow-sm mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-[10px] font-bold tracking-wider text-[#9E9E9E] mb-2 uppercase">Total Principal</p>
            <p className="text-[24px] font-bold text-[#2C2C2C] tabular-nums">{rupees(totals.principal)}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-wider text-[#9E9E9E] mb-2 uppercase">Total Interest</p>
            <p className="text-[24px] font-bold text-[#B91C1C] tabular-nums">{rupees(totals.interest)}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-wider text-[#9E9E9E] mb-2 uppercase">Total Receivable</p>
            <p className="text-[24px] font-bold text-[#565C3F] tabular-nums">{rupees(totals.receivable)}</p>
          </div>
        </div>
        <p className="text-[12px] text-[#8C8F7A] mt-4">
          {count} pledge{count !== 1 ? "s" : ""} to release on {fmtDate(releaseDate)}
        </p>
      </div>

      {/* Card 4 — Action */}
      <div className="bg-white border border-[#ECEAE4] rounded-[20px] p-6 shadow-sm">
        {actionError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-[12px] p-3 rounded-[10px] mb-4 flex items-start gap-2">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" /> {actionError}
          </div>
        )}
        <button
          onClick={() => setShowConfirm(true)}
          disabled={count === 0 || loading || submitting}
          className="w-full flex items-center justify-center gap-2 bg-[#565C3F] hover:bg-[#4B5036] text-white text-[14px] font-semibold py-3.5 rounded-[12px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          Release {count} Pledge{count !== 1 ? "s" : ""}
        </button>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => !submitting && setShowConfirm(false)}
        >
          <div className="bg-white rounded-[24px] p-7 w-full max-w-[440px] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[19px] font-bold text-[#2C2C2C] mb-4">
              Confirm release of {count} pledge{count !== 1 ? "s" : ""}?
            </h3>
            <div className="bg-[#F9F8F3] border border-[#ECEAE4] rounded-[14px] p-4 text-[13px] space-y-2 mb-4">
              <div className="flex justify-between">
                <span className="text-[#6F6F6F]">Customer</span>
                <span className="font-semibold text-[#2C2C2C]">{customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6F6F6F]">Total Receivable</span>
                <span className="font-bold text-[#565C3F]">{rupees(totals.receivable)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6F6F6F]">Release Date</span>
                <span className="font-semibold text-[#2C2C2C]">{fmtDate(releaseDate)}</span>
              </div>
            </div>
            <p className="text-[12px] text-[#8C8F7A] leading-relaxed mb-5">
              This will permanently release these pledges and create audit records.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={submitting}
                className="flex-1 bg-[#EAE8E1] hover:bg-[#DEDCD4] text-[#2C2C2C] text-[13px] font-semibold py-3 rounded-[12px] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRelease}
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 bg-[#565C3F] hover:bg-[#4B5036] text-white text-[13px] font-semibold py-3 rounded-[12px] transition-colors disabled:opacity-50"
              >
                {submitting ? (<><Loader2 className="animate-spin w-4 h-4" /> Releasing...</>) : "Confirm Release"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {successToast && (
        <div
          className="fixed bottom-8 right-8 z-50 rounded-[12px] text-white px-5 py-3 shadow-xl text-[13px] font-bold flex items-center gap-2"
          style={{ backgroundColor: "#2C2C2C", border: "1px solid #4B5036" }}
        >
          <CheckCircle2 size={16} className="text-[#A9B37E]" />
          {successToast}
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/* Page (Suspense boundary for useSearchParams)                        */
/* ================================================================== */
export default function BulkReleasePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="animate-spin text-[#565C3F]" size={28} />
        </div>
      }
    >
      <BulkReleaseInner />
    </Suspense>
  );
}
