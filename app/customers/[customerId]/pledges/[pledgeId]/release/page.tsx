"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Loader2, CheckCircle } from "lucide-react";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { getStatusKey } from "@/lib/translations";

/* ------------------------------------------------------------------ */
interface Pledge {
  id: string;
  pledgeDate: string;
  loanAmount: number;
  itemType: string;
  itemName: string;
  grossWeight: number;
  netWeight: number;
  purity: number;
  interestRate: number;
  compoundingDuration: "MONTHLY" | "QUARTERLY" | "YEARLY";
  status: string;
  remark: string | null;
  itemPhoto: string | null;
  customer: { id: string; name: string; address: string };
}

const COMPOUNDING_OPTIONS = [
  { value: "MONTHLY", n: 12 },
  { value: "QUARTERLY", n: 4 },
  { value: "YEARLY", n: 1 },
];

function monthsAndDays(from: Date, to: Date) {
  let years = to.getFullYear() - from.getFullYear();
  let months = to.getMonth() - from.getMonth();
  let days = to.getDate() - from.getDate();
  if (days < 0) {
    months -= 1;
    const prevMonth = new Date(to.getFullYear(), to.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return { totalMonths: years * 12 + months, days };
}

function calcSimpleInterest(principal: number, annualRate: number, fromDate: Date, toDate: Date, roundHalfMonth: boolean) {
  const { totalMonths, days } = monthsAndDays(fromDate, toDate);
  let months = totalMonths;
  if (roundHalfMonth) {
    if (days > 0 && days < 15) months += 1;
    else if (days >= 15) months += 2;
  } else {
    months = totalMonths + days / 30.4375;
  }
  months = Math.max(1, months);
  const monthlyRate = annualRate / 12 / 100;
  const interest = principal * monthlyRate * months;
  return {
    months: Math.round(months * 100) / 100,
    totalInterest: Math.round(interest * 100) / 100,
    receivableAmount: Math.round((principal + interest) * 100) / 100,
  };
}

function calcCompoundInterest(principal: number, annualRate: number, compounding: string, fromDate: Date, toDate: Date) {
  const option = COMPOUNDING_OPTIONS.find((o) => o.value === compounding);
  const n = option?.n ?? 12;
  const r = annualRate / 100;
  const msPerDay = 1000 * 60 * 60 * 24;
  const days = Math.floor((toDate.getTime() - fromDate.getTime()) / msPerDay);
  const t = days / 365;
  const amount = principal * Math.pow(1 + r / n, n * t);
  const totalInterest = amount - principal;
  return {
    days,
    totalInterest: Math.round(totalInterest * 100) / 100,
    receivableAmount: Math.round(amount * 100) / 100,
  };
}

/* ================================================================== */
export default function ReleasePledgePage() {
  const params = useParams<{ customerId: string; pledgeId: string }>();
  const router = useRouter();
  const { language, t } = useLanguage();
  const locale = language === "hi" ? "hi-IN" : "en-IN";

  function fmt(n: number) {
    return new Intl.NumberFormat(locale, {
      style: "currency", currency: "INR", maximumFractionDigits: 2,
    }).format(n);
  }

  const [pledge, setPledge] = useState<Pledge | null>(null);
  const [fetching, setFetching] = useState(true);
  const [fetchErr, setFetchErr] = useState("");

  const today = new Date().toISOString().split("T")[0];

  const [releaseDate, setReleaseDate] = useState(today);
  const [compounding, setCompounding] = useState("MONTHLY");
  const [useCompound, setUseCompound] = useState(false);
  const [roundHalfMonth, setRoundHalfMonth] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [released, setReleased] = useState(false);

  const compoundingLabels: Record<string, string> = {
    MONTHLY: t("monthly"),
    QUARTERLY: t("quarterly"),
    YEARLY: t("yearly"),
  };

  useEffect(() => {
    if (!params.pledgeId) return;
    fetch(`/api/pledges/${params.pledgeId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setPledge(data.pledge);
        setCompounding(data.pledge.compoundingDuration);
      })
      .catch((e) => setFetchErr(e.message))
      .finally(() => setFetching(false));
  }, [params.pledgeId]);

  const isBeforePledge = pledge
    ? new Date(releaseDate) < new Date(pledge.pledgeDate)
    : false;

  const simpleCalc = pledge && !isBeforePledge
    ? calcSimpleInterest(Number(pledge.loanAmount), Number(pledge.interestRate), new Date(pledge.pledgeDate), new Date(releaseDate), roundHalfMonth)
    : null;

  const compoundCalc = pledge && !isBeforePledge
    ? calcCompoundInterest(Number(pledge.loanAmount), Number(pledge.interestRate), compounding, new Date(pledge.pledgeDate), new Date(releaseDate))
    : null;

  const calc = useCompound ? compoundCalc : simpleCalc;

  async function handleRelease() {
    if (!pledge || !calc) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/pledges/${pledge.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          releaseDate,
          totalInterest: calc.totalInterest,
          receivableAmount: calc.receivableAmount,
          compoundingDuration: compounding,
          status: "RELEASED",
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to release pledge");
      }
      setReleased(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (fetching) {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <div>
          <div className="skeleton" style={{ width: "140px", height: "14px", marginBottom: "12px" }} />
          <div className="skeleton" style={{ width: "200px", height: "28px", marginBottom: "6px" }} />
          <div className="skeleton" style={{ width: "220px", height: "14px" }} />
        </div>
        <div className="border rounded-2xl bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4" style={{ borderBottom: "1px solid #e5e7eb" }}>
            <div className="skeleton" style={{ width: "140px", height: "16px" }} />
          </div>
          <div className="divide-y">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="flex justify-between px-6 py-3">
                <div className="skeleton" style={{ width: "100px", height: "14px" }} />
                <div className="skeleton" style={{ width: "120px", height: "14px" }} />
              </div>
            ))}
          </div>
        </div>
        <div className="border rounded-2xl bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4" style={{ borderBottom: "1px solid #e5e7eb" }}>
            <div className="skeleton" style={{ width: "160px", height: "16px" }} />
          </div>
          <div className="p-6 space-y-4">
            <div className="skeleton" style={{ width: "100%", height: "40px", borderRadius: "6px" }} />
            <div className="flex gap-2">
              <div className="skeleton flex-1" style={{ height: "40px", borderRadius: "6px" }} />
              <div className="skeleton flex-1" style={{ height: "40px", borderRadius: "6px" }} />
            </div>
            <div className="skeleton" style={{ width: "100%", height: "120px", borderRadius: "6px" }} />
          </div>
        </div>
        <div className="flex gap-3">
          <div className="skeleton" style={{ width: "140px", height: "40px", borderRadius: "6px" }} />
          <div className="skeleton" style={{ width: "80px", height: "40px", borderRadius: "6px" }} />
        </div>
      </div>
    );
  }

  if (fetchErr || !pledge) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Alert variant="destructive">
          <AlertDescription>{fetchErr || t("pledge_not_found")}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (released) {
    return (
      <div className="max-w-2xl mx-auto p-6 flex flex-col items-center gap-4 min-h-[40vh] justify-center text-center">
        <CheckCircle size={52} className="text-green-500" />
        <h2 className="text-2xl font-bold">{t("pledge_released")}</h2>
        <p className="text-gray-500 text-sm">
          {t("pledge_released_desc", { name: pledge.customer.name })}
        </p>
        <Button onClick={() => router.push(`/customers/${params.customerId}`)}>
          {t("back_to_cust_btn")}
        </Button>
      </div>
    );
  }

  const pledgeDateFormatted = new Date(pledge.pledgeDate).toLocaleDateString(locale, {
    day: "2-digit", month: "short", year: "numeric",
  });

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <Link href={`/customers/${params.customerId}/pledges/${params.pledgeId}`} className="text-sm text-gray-500 hover:underline">
          {t("back_to_pledge")}
        </Link>
        <div className="flex items-center gap-3 mt-2">
          <h1 className="text-2xl font-bold">{t("release_pledge")}</h1>
          <Badge variant={pledge.status === "ACTIVE" ? "default" : "secondary"}>
            {t(getStatusKey(pledge.status))}
          </Badge>
        </div>
        <p className="text-sm text-gray-500 mt-1">{t("review_confirm")}</p>
      </div>

      {pledge.status !== "ACTIVE" && (
        <Alert variant="destructive">
          <AlertDescription>
            {t("already_released", { status: t(getStatusKey(pledge.status)) })}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">{t("pledge_details")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          <DetailRow label={t("customer_name_label")} value={pledge.customer.name} />
          <DetailRow label={t("address")} value={pledge.customer.address} />
          <DetailRow label={t("item_name")} value={pledge.itemName} />
          <DetailRow label={t("item_type_label")} value={pledge.itemType} />
          <DetailRow label={t("gross_weight_label")} value={`${Number(pledge.grossWeight).toFixed(3)} g`} />
          <DetailRow label={t("net_weight_label")} value={`${Number(pledge.netWeight).toFixed(3)} g`} />
          <DetailRow label={t("purity")} value={`${Number(pledge.purity).toFixed(2)}%`} />
          <DetailRow label={t("col_pledge_date")} value={pledgeDateFormatted} />
          <DetailRow label={t("col_loan_amount")} value={fmt(Number(pledge.loanAmount))} />
          <DetailRow label={t("interest_rate")} value={`${Number(pledge.interestRate).toFixed(2)}% p.a.`} />
        </CardContent>
      </Card>

      {pledge.itemPhoto && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">{t("item_photo")}</CardTitle>
          </CardHeader>
          <CardContent>
            <img src={pledge.itemPhoto} alt="Pledge item" className="h-48 rounded-md object-cover border" />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">{t("release_calculation")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label className="text-sm font-medium">
              {t("release_date")} <span className="text-red-500">*</span>
            </Label>
            <Input type="date" value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)} />
            {isBeforePledge && (
              <p className="text-xs text-red-500">{t("release_before_error")}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label className="text-sm font-medium">{t("interest_type")}</Label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setUseCompound(false)}
                className={`flex-1 py-2 rounded-md border text-sm font-medium transition-colors ${!useCompound ? "bg-black text-white border-black" : "bg-white text-gray-700 border-gray-200 hover:border-gray-400"}`}>
                {t("simple")}
              </button>
              <button type="button" onClick={() => setUseCompound(true)}
                className={`flex-1 py-2 rounded-md border text-sm font-medium transition-colors ${useCompound ? "bg-black text-white border-black" : "bg-white text-gray-700 border-gray-200 hover:border-gray-400"}`}>
                {t("compound")}
              </button>
            </div>
          </div>

          {!useCompound && (
            <div className="flex items-center justify-between rounded-md border px-4 py-3">
              <div>
                <p className="text-sm font-medium">{t("fifteen_day_rule")}</p>
                <p className="text-xs text-gray-500 mt-0.5">{t("fifteen_day_desc")}</p>
              </div>
              <button type="button" onClick={() => setRoundHalfMonth((v) => !v)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${roundHalfMonth ? "bg-black" : "bg-gray-200"}`}>
                <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${roundHalfMonth ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
          )}

          {useCompound && (
            <div className="space-y-1">
              <Label className="text-sm font-medium">{t("compounding_duration")}</Label>
              <div className="flex items-center gap-2">
                <select className="w-full rounded-md border px-3 py-2 text-sm bg-background" value={compounding} onChange={(e) => setCompounding(e.target.value)}>
                  {COMPOUNDING_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{compoundingLabels[o.value]}</option>
                  ))}
                </select>
                {compounding !== pledge.compoundingDuration && (
                  <button type="button" onClick={() => setCompounding(pledge.compoundingDuration)} className="text-xs text-blue-600 hover:underline whitespace-nowrap">
                    {t("reset")}
                  </button>
                )}
              </div>
              {compounding !== pledge.compoundingDuration && (
                <p className="text-xs text-orange-500">
                  {t("original_label")}: {compoundingLabels[pledge.compoundingDuration]}
                </p>
              )}
            </div>
          )}

          {calc && !isBeforePledge ? (
            <div className="rounded-md bg-gray-50 border divide-y">
              {!useCompound && simpleCalc && (
                <div className="flex justify-between px-4 py-3 text-sm">
                  <span className="text-gray-500">{t("duration")}</span>
                  <span className="font-medium">{simpleCalc.months} {t("months_unit")}</span>
                </div>
              )}
              {useCompound && compoundCalc && (
                <div className="flex justify-between px-4 py-3 text-sm">
                  <span className="text-gray-500">{t("duration")}</span>
                  <span className="font-medium">{compoundCalc.days} {t("days_unit")}</span>
                </div>
              )}
              <div className="flex justify-between px-4 py-3 text-sm">
                <span className="text-gray-500">{t("principal")}</span>
                <span className="font-medium">{fmt(Number(pledge.loanAmount))}</span>
              </div>
              <div className="flex justify-between px-4 py-3 text-sm">
                <span className="text-gray-500">{t("total_interest")}</span>
                <span className="font-medium text-orange-600">{fmt(calc.totalInterest)}</span>
              </div>
              <div className="flex justify-between px-4 py-3 text-sm bg-green-50 rounded-b-md">
                <span className="font-semibold text-green-800">{t("receivable_amount")}</span>
                <span className="font-bold text-green-700 text-base">{fmt(calc.receivableAmount)}</span>
              </div>
            </div>
          ) : !isBeforePledge ? (
            <div className="rounded-md bg-gray-50 border px-4 py-3 text-sm text-gray-400 text-center">
              {t("select_valid_date")}
            </div>
          ) : null}

          {useCompound && simpleCalc && compoundCalc && !isBeforePledge && (
            <div className="rounded-md border divide-y text-sm">
              <div className="grid grid-cols-3 px-4 py-2 bg-gray-50 text-xs text-gray-500 font-medium">
                <span></span>
                <span className="text-center">{t("simple")}</span>
                <span className="text-center">{t("compound")}</span>
              </div>
              <div className="grid grid-cols-3 px-4 py-3">
                <span className="text-gray-500">{t("interest_col")}</span>
                <span className="text-center">{fmt(simpleCalc.totalInterest)}</span>
                <span className="text-center text-orange-600">{fmt(compoundCalc.totalInterest)}</span>
              </div>
              <div className="grid grid-cols-3 px-4 py-3">
                <span className="text-gray-500">{t("receivable_col")}</span>
                <span className="text-center">{fmt(simpleCalc.receivableAmount)}</span>
                <span className="text-center text-green-700 font-semibold">{fmt(compoundCalc.receivableAmount)}</span>
              </div>
            </div>
          )}

        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-3">
        <Button
          onClick={handleRelease}
          disabled={loading || pledge.status !== "ACTIVE" || !calc || isBeforePledge}
          className="flex-1 sm:flex-none sm:px-10 bg-green-600 hover:bg-green-700"
        >
          {loading ? <Loader2 className="animate-spin" /> : t("confirm_release")}
        </Button>
        <Button variant="outline" onClick={() => router.push(`/customers/${params.customerId}/pledges/${params.pledgeId}`)}>
          {t("cancel")}
        </Button>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2 border-b last:border-0 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}