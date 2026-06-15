"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Loader2, CheckCircle, ArrowLeft, Calendar,
  AlertTriangle, RefreshCw, Check, Phone, MapPin, Info
} from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
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
  items: PledgeItem[];
  customer: {
    id: string;
    name: string;
    address: string | null;
    mobile: string | null;
    region: string | null;
  };
}

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
  const { t } = useLanguage();

  const today = new Date().toISOString().split("T")[0];

  const [releaseDate, setReleaseDate] = useState(today);
  const [pledge, setPledge] = useState<Pledge | null>(null);
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

  const isFuture = new Date(releaseDate) > new Date(today);

  /* ── Calculation ── */
  const calc = useMemo(() => {
    if (!pledge || isBeforePledge) return null;
    return calculateHybridInterest(
      Number(pledge.loanAmount),
      Number(pledge.interestRate),
      new Date(pledge.pledgeDate),
      new Date(releaseDate),
      pledge.allowCompounding,
      pledge.compoundingDuration
    );
  }, [pledge, releaseDate, isBeforePledge]);

  const canRelease = pledge?.status === "ACTIVE" && calc !== null && !isBeforePledge;

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
            allowCompounding: pledge.allowCompounding,
            compoundingDuration: pledge.compoundingDuration,
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
          <h2 className="text-[24px] font-semibold text-[#2C2C2C]">{t("pledge_released")}</h2>
          <p className="text-[13px] text-[#6F6F6F] mt-2 leading-relaxed">
            {t("pledge_released_for")}{" "}
            <span className="font-semibold text-[#2C2C2C]">{pledge.customer.name}</span>{" "}
            {t("pledge_released_on")} {fmtDate(releaseDate)}.
          </p>
        </div>
        {calc && (
          <div className="w-full max-w-sm bg-[#F9F8F3] border border-[#ECEAE4] rounded-[16px] p-5 text-[13px] space-y-2.5">
            <div className="flex justify-between">
              <span className="text-[#6F6F6F]">{t("principal")}</span>
              <span className="font-semibold text-[#2C2C2C]">{fmt(Number(pledge.loanAmount))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6F6F6F]">{t("interest_collected")}</span>
              <span className="font-semibold text-[#B91C1C]">{fmt(calc.totalInterest)}</span>
            </div>
            <div className="flex justify-between border-t border-[#ECEAE4] pt-2.5 mt-2">
              <span className="font-semibold text-[#2C2C2C]">{t("total_receivable")}</span>
              <span className="font-bold text-[#6B7150] text-[16px]">{fmt(calc.receivableAmount)}</span>
            </div>
          </div>
        )}
        <button
          onClick={() => router.push(`/customers/${params.customerId}`)}
          className="bg-[#6B7150] hover:bg-[#585E42] text-white text-[13px] font-semibold px-6 py-2.5 rounded-[10px] transition-colors mt-2"
        >
          {t("back_to_customer")}
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
              {t("release_pledge")}
            </h1>
            <p className="text-[14px] text-[#6F6F6F]">
              {t("release_pledge_desc")}
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

      {/* ── MAIN LAYOUT ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[65fr_35fr] gap-6 items-start">

        {/* ════════════════════════════════════ */}
        {/* LEFT COLUMN                          */}
        {/* ════════════════════════════════════ */}
        <div className="bg-white border border-[#ECEAE4] rounded-[20px] p-6 shadow-sm">

          <div className="flex items-center gap-2 text-[16px] font-semibold text-[#2C2C2C] mb-6">
            <Info size={18} className="text-[#8C8F7A]" /> {t("pledge_details")}
          </div>

          {/* Customer Section */}
          <div className="mb-6">
            <p className="text-[10px] font-bold tracking-widest text-[#8C8F7A] uppercase mb-2">{t("customer")}</p>
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
            <p className="text-[10px] font-bold tracking-widest text-[#8C8F7A] uppercase mb-2">{t("loan_information")}</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#F9F8F3] rounded-[12px] p-4">
                <p className="text-[11px] font-medium text-[#8C8F7A] mb-1">{t("loan_amount")}</p>
                <p className="text-[20px] font-semibold text-[#2C2C2C] tabular-nums">{fmt(Number(pledge.loanAmount))}</p>
              </div>
              <div className="bg-[#F9F8F3] rounded-[12px] p-4">
                <p className="text-[11px] font-medium text-[#8C8F7A] mb-1">{t("pledge_date")}</p>
                <p className="text-[15px] font-semibold text-[#2C2C2C] mt-1">{fmtDate(pledge.pledgeDate)}</p>
              </div>
              <div className="bg-[#F9F8F3] rounded-[12px] p-4">
                <p className="text-[11px] font-medium text-[#8C8F7A] mb-1">{t("interest_rate")}</p>
                <p className="text-[15px] font-semibold text-[#2C2C2C] mt-1">{Number(pledge.interestRate)}%</p>
              </div>
              <div className="bg-[#F9F8F3] rounded-[12px] p-4">
                <p className="text-[11px] font-medium text-[#8C8F7A] mb-1">{t("compounding")}</p>
                <p className="text-[15px] font-semibold text-[#2C2C2C] mt-1">
                  {pledge.allowCompounding ? titleCase(pledge.compoundingDuration) : "None"}
                </p>
              </div>
            </div>
          </div>

          {/* Pledged Items */}
          <div>
            <p className="text-[16px] font-semibold text-[#2C2C2C] mb-4">{t("pledged_items")} ({pledge.items.length})</p>

            <div className="overflow-x-auto rounded-[12px] border border-[#ECEAE4] mb-4">
              <table className="w-full text-[13px] bg-[#F9F8F3]">
                <thead>
                  <tr className="border-b border-[#ECEAE4] text-[#8C8F7A] text-[10px] font-bold tracking-widest uppercase">
                    <th className="text-left px-4 py-3">{t("item_name")}</th>
                    <th className="text-left px-4 py-3">{t("metal_type")}</th>
                    <th className="text-center px-4 py-3">{t("quantity")}</th>
                    <th className="text-right px-4 py-3">{t("gross_weight")}</th>
                    <th className="text-right px-4 py-3">{t("net_weight")}</th>
                    <th className="text-right px-4 py-3">{t("purity")}</th>
                    <th className="text-right px-4 py-3">{t("net_metal")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ECEAE4]">
                  {pledge.items.map(item => (
                    <tr key={item.id} className="bg-[#FDFCF9]">
                      <td className="px-4 py-3 font-semibold text-[#2C2C2C] whitespace-nowrap">
                        {item.itemName || titleCase(item.itemType)}
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
            <Calendar size={18} className="text-[#8C8F7A]" /> {t("interest_calculation")}
          </div>

          <div className="space-y-5">
            {/* Release Date */}
            <div>
              <label className="block text-[11px] font-bold tracking-widest text-[#2C2C2C] mb-2 uppercase">
                {t("release_date")}
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
                {t("interest_method")}
              </label>
              <div className="w-full bg-[#F9F8F3] border border-[#ECEAE4] rounded-[12px] px-4 py-3 text-[14px] text-[#6F6F6F] cursor-not-allowed">
                {pledge.allowCompounding ? `${titleCase(pledge.compoundingDuration)} compounding` : "Simple interest"}
              </div>
              <p className="text-[11px] text-[#8C8F7A] mt-1.5 ml-1">Set at pledge creation</p>
            </div>

            {/* Calculation Summary */}
            <div className="bg-[#F9F8F3] rounded-[16px] overflow-hidden mt-6">
              <div className="px-5 py-4">
                <h3 className="text-[10px] font-bold tracking-widest uppercase text-[#2C2C2C] mb-4">{t("calculation_summary")}</h3>

                {calc && !isBeforePledge ? (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-[13px]">
                      <span className="text-[#6F6F6F]">{t("duration")}</span>
                      <span className="font-semibold text-[#2C2C2C]">{calc.T.toFixed(2)} {t("months")}</span>
                    </div>
                    <div className="flex justify-between items-center text-[13px]">
                      <span className="text-[#6F6F6F]">{t("principal")}</span>
                      <span className="font-semibold text-[#2C2C2C]">{fmt(Number(pledge.loanAmount))}</span>
                    </div>
                    <div className="flex justify-between items-center text-[13px]">
                      <span className="text-[#6F6F6F]">{t("total_interest")}</span>
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
                  <span className="text-[14px] font-semibold text-[#6F6F6F]">{t("receivable_amount")}</span>
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
                {t("cancel")}
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
                  <>{t("release_pledge")} </>
                )}
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}