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

/* ------------------------------------------------------------------ */
/*  Types                                                               */
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

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */
const COMPOUNDING_OPTIONS = [
  { value: "MONTHLY",   label: "Monthly",   n: 12 },
  { value: "QUARTERLY", label: "Quarterly", n: 4  },
  { value: "YEARLY",    label: "Yearly",    n: 1  },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Returns whole months and leftover days between two dates */
function monthsAndDays(from: Date, to: Date) {
  let years  = to.getFullYear()  - from.getFullYear();
  let months = to.getMonth()     - from.getMonth();
  let days   = to.getDate()      - from.getDate();

  if (days < 0) {
    months -= 1;
    // days remaining in the previous month
    const prevMonth = new Date(to.getFullYear(), to.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years  -= 1;
    months += 12;
  }

  return { totalMonths: years * 12 + months, days };
}

/* ------------------------------------------------------------------ */
/*  Simple Interest                                                     */
/*  I = P × (rate/12/100) × months                                     */
/*  With optional 15-day rounding rule                                 */
/* ------------------------------------------------------------------ */
function calcSimpleInterest(
  principal: number,
  annualRate: number,
  fromDate: Date,
  toDate: Date,
  roundHalfMonth: boolean
) {
  const { totalMonths, days } = monthsAndDays(fromDate, toDate);

  let months = totalMonths;

  if (roundHalfMonth) {
    // < 15 days leftover → +1 month, ≥ 15 days → +2 months
    if (days > 0 && days < 15)  months += 0;
    else if (days >= 15)         months += 1;
  } else {
    // Standard: count exact fractional months
    months = totalMonths + days / 30.4375;
  }

  // Ensure minimum 1 month
  months = Math.max(1, months);

  const monthlyRate    = annualRate / 12 / 100;
  const interest       = principal * monthlyRate * months;

  return {
    months:           Math.round(months * 100) / 100,
    totalInterest:    Math.round(interest * 100) / 100,
    receivableAmount: Math.round((principal + interest) * 100) / 100,
  };
}

/* ------------------------------------------------------------------ */
/*  Compound Interest                                                   */
/*  A = P × (1 + r/n)^(n × t)                                         */
/*  t = exact years between dates                                      */
/* ------------------------------------------------------------------ */
function calcCompoundInterest(
  principal: number,
  annualRate: number,
  compounding: string,
  fromDate: Date,
  toDate: Date
) {
  const option = COMPOUNDING_OPTIONS.find((o) => o.value === compounding);
  const n = option?.n ?? 12;

  const r = annualRate / 100;

  // Precise day count
  const msPerDay = 1000 * 60 * 60 * 24;
  const days = Math.floor((toDate.getTime() - fromDate.getTime()) / msPerDay);
  const t = days / 365; // years (using 365, not 365.25, for precision)

  const amount          = principal * Math.pow(1 + r / n, n * t);
  const totalInterest   = amount - principal;
  const receivableAmount = amount;

  return {
    days,
    totalInterest:    Math.round(totalInterest   * 100) / 100,
    receivableAmount: Math.round(receivableAmount * 100) / 100,
  };
}

/* ------------------------------------------------------------------ */
function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 2,
  }).format(n);
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2 border-b last:border-0 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}

/* ================================================================== */
/*  Page                                                                */
/* ================================================================== */
export default function ReleasePledgePage() {
  const params = useParams<{ customerId: string; pledgeId: string }>();
  const router = useRouter();

  const [pledge,   setPledge]   = useState<Pledge | null>(null);
  const [fetching, setFetching] = useState(true);
  const [fetchErr, setFetchErr] = useState("");

  const today = new Date().toISOString().split("T")[0];

  const [releaseDate,    setReleaseDate]    = useState(today);
  const [compounding,    setCompounding]    = useState("MONTHLY");
  const [useCompound,    setUseCompound]    = useState(false);   // simple by default
  const [roundHalfMonth, setRoundHalfMonth] = useState(false);   // 15-day rule off by default

  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [released, setReleased] = useState(false);

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
    ? calcSimpleInterest(
        Number(pledge.loanAmount),
        Number(pledge.interestRate),
        new Date(pledge.pledgeDate),
        new Date(releaseDate),
        roundHalfMonth
      )
    : null;

  const compoundCalc = pledge && !isBeforePledge
    ? calcCompoundInterest(
        Number(pledge.loanAmount),
        Number(pledge.interestRate),
        compounding,
        new Date(pledge.pledgeDate),
        new Date(releaseDate)
      )
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
          totalInterest:       calc.totalInterest,
          receivableAmount:    calc.receivableAmount,
          compoundingDuration: compounding,
          status:              "RELEASED",
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

  /* --- Loading --- */
  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  /* --- Error --- */
  if (fetchErr || !pledge) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Alert variant="destructive">
          <AlertDescription>{fetchErr || "Pledge not found"}</AlertDescription>
        </Alert>
      </div>
    );
  }

  /* --- Success --- */
  if (released) {
    return (
      <div className="max-w-2xl mx-auto p-6 flex flex-col items-center gap-4 min-h-[40vh] justify-center text-center">
        <CheckCircle size={52} className="text-green-500" />
        <h2 className="text-2xl font-bold">Pledge Released</h2>
        <p className="text-gray-500 text-sm">
          The pledge for <span className="font-medium">{pledge.customer.name}</span> has
          been successfully released.
        </p>
        <Button onClick={() => router.push(`/customers/${params.customerId}`)}>
          Back to Customer
        </Button>
      </div>
    );
  }

  const pledgeDateFormatted = new Date(pledge.pledgeDate).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">

      {/* Header */}
      <div>
        <Link
          href={`/customers/${params.customerId}/pledges/${params.pledgeId}`}
          className="text-sm text-gray-500 hover:underline"
        >
          ← Back to Pledge
        </Link>
        <div className="flex items-center gap-3 mt-2">
          <h1 className="text-2xl font-bold">Release Pledge</h1>
          <Badge variant={pledge.status === "ACTIVE" ? "default" : "secondary"}>
            {pledge.status}
          </Badge>
        </div>
        <p className="text-sm text-gray-500 mt-1">Review and confirm the release.</p>
      </div>

      {pledge.status !== "ACTIVE" && (
        <Alert variant="destructive">
          <AlertDescription>
            This pledge is already <strong>{pledge.status}</strong> and cannot be released again.
          </AlertDescription>
        </Alert>
      )}

      {/* Pledge Details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Pledge Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          <DetailRow label="Customer Name" value={pledge.customer.name} />
          <DetailRow label="Address"       value={pledge.customer.address} />
          <DetailRow label="Item Name"     value={pledge.itemName} />
          <DetailRow label="Item Type"     value={pledge.itemType} />
          <DetailRow label="Gross Weight"  value={`${Number(pledge.grossWeight).toFixed(3)} g`} />
          <DetailRow label="Net Weight"    value={`${Number(pledge.netWeight).toFixed(3)} g`} />
          <DetailRow label="Purity"        value={`${Number(pledge.purity).toFixed(2)}%`} />
          <DetailRow label="Pledge Date"   value={pledgeDateFormatted} />
          <DetailRow label="Loan Amount"   value={fmt(Number(pledge.loanAmount))} />
          <DetailRow label="Interest Rate" value={`${Number(pledge.interestRate).toFixed(2)}% p.a.`} />
        </CardContent>
      </Card>

      {/* Item Photo */}
      {pledge.itemPhoto && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Item Photo</CardTitle>
          </CardHeader>
          <CardContent>
            <img src={pledge.itemPhoto} alt="Pledge item"
              className="h-48 rounded-md object-cover border" />
          </CardContent>
        </Card>
      )}

      {/* Calculation Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Release Calculation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Release Date */}
          <div className="space-y-1">
            <Label className="text-sm font-medium">
              Release Date <span className="text-red-500">*</span>
            </Label>
            <Input
              type="date"
              value={releaseDate}
              onChange={(e) => setReleaseDate(e.target.value)}
            />
            {isBeforePledge && (
              <p className="text-xs text-red-500">
                Release date cannot be before the pledge date.
              </p>
            )}
          </div>

          {/* Interest Type Toggle */}
          <div className="space-y-1">
            <Label className="text-sm font-medium">Interest Type</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setUseCompound(false)}
                className={`flex-1 py-2 rounded-md border text-sm font-medium transition-colors ${
                  !useCompound
                    ? "bg-black text-white border-black"
                    : "bg-white text-gray-700 border-gray-200 hover:border-gray-400"
                }`}
              >
                Simple
              </button>
              <button
                type="button"
                onClick={() => setUseCompound(true)}
                className={`flex-1 py-2 rounded-md border text-sm font-medium transition-colors ${
                  useCompound
                    ? "bg-black text-white border-black"
                    : "bg-white text-gray-700 border-gray-200 hover:border-gray-400"
                }`}
              >
                Compound
              </button>
            </div>
          </div>

          {/* Simple: 15-day rounding rule */}
          {!useCompound && (
            <div className="flex items-center justify-between rounded-md border px-4 py-3">
              <div>
                <p className="text-sm font-medium">15-day rounding rule</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  &lt; 15 days → +1 month &nbsp;|&nbsp; ≥ 15 days → +2 months
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRoundHalfMonth((v) => !v)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  roundHalfMonth ? "bg-black" : "bg-gray-200"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                    roundHalfMonth ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          )}

          {/* Compound: duration selector */}
          {useCompound && (
            <div className="space-y-1">
              <Label className="text-sm font-medium">Compounding Duration</Label>
              <div className="flex items-center gap-2">
                <select
                  className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                  value={compounding}
                  onChange={(e) => setCompounding(e.target.value)}
                >
                  {COMPOUNDING_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                {compounding !== pledge.compoundingDuration && (
                  <button
                    type="button"
                    onClick={() => setCompounding(pledge.compoundingDuration)}
                    className="text-xs text-blue-600 hover:underline whitespace-nowrap"
                  >
                    Reset
                  </button>
                )}
              </div>
              {compounding !== pledge.compoundingDuration && (
                <p className="text-xs text-orange-500">
                  Original: {COMPOUNDING_OPTIONS.find((o) => o.value === pledge.compoundingDuration)?.label}
                </p>
              )}
            </div>
          )}

          {/* Result breakdown */}
          {calc && !isBeforePledge ? (
            <div className="rounded-md bg-gray-50 border divide-y">
              {/* Simple: show months */}
              {!useCompound && simpleCalc && (
                <div className="flex justify-between px-4 py-3 text-sm">
                  <span className="text-gray-500">Duration</span>
                  <span className="font-medium">{simpleCalc.months} months</span>
                </div>
              )}
              {/* Compound: show days */}
              {useCompound && compoundCalc && (
                <div className="flex justify-between px-4 py-3 text-sm">
                  <span className="text-gray-500">Duration</span>
                  <span className="font-medium">{compoundCalc.days} days</span>
                </div>
              )}
              <div className="flex justify-between px-4 py-3 text-sm">
                <span className="text-gray-500">Principal</span>
                <span className="font-medium">{fmt(Number(pledge.loanAmount))}</span>
              </div>
              <div className="flex justify-between px-4 py-3 text-sm">
                <span className="text-gray-500">Total Interest</span>
                <span className="font-medium text-orange-600">{fmt(calc.totalInterest)}</span>
              </div>
              <div className="flex justify-between px-4 py-3 text-sm bg-green-50 rounded-b-md">
                <span className="font-semibold text-green-800">Receivable Amount</span>
                <span className="font-bold text-green-700 text-base">{fmt(calc.receivableAmount)}</span>
              </div>
            </div>
          ) : !isBeforePledge ? (
            <div className="rounded-md bg-gray-50 border px-4 py-3 text-sm text-gray-400 text-center">
              Select a valid release date to calculate.
            </div>
          ) : null}

          {/* Comparison table when compound is active */}
          {useCompound && simpleCalc && compoundCalc && !isBeforePledge && (
            <div className="rounded-md border divide-y text-sm">
              <div className="grid grid-cols-3 px-4 py-2 bg-gray-50 text-xs uppercase text-gray-500 font-medium">
                <span></span>
                <span className="text-center">Simple</span>
                <span className="text-center">Compound</span>
              </div>
              <div className="grid grid-cols-3 px-4 py-3">
                <span className="text-gray-500">Interest</span>
                <span className="text-center">{fmt(simpleCalc.totalInterest)}</span>
                <span className="text-center text-orange-600">{fmt(compoundCalc.totalInterest)}</span>
              </div>
              <div className="grid grid-cols-3 px-4 py-3">
                <span className="text-gray-500">Receivable</span>
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

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          onClick={handleRelease}
          disabled={loading || pledge.status !== "ACTIVE" || !calc || isBeforePledge}
          className="flex-1 sm:flex-none sm:px-10 bg-green-600 hover:bg-green-700"
        >
          {loading ? <Loader2 className="animate-spin" /> : "Confirm Release"}
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            router.push(`/customers/${params.customerId}/pledges/${params.pledgeId}`)
          }
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}