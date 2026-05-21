"use client";

import { useEffect, useState, useMemo }  from "react";
import Link                              from "next/link";
import { useParams, useRouter }          from "next/navigation";
import {
  Loader2, CheckCircle, ArrowLeft, Calendar,
  User, Tag, Scale, RefreshCw, AlertCircle,
} from "lucide-react";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button }                   from "@/components/ui/button";
import { Label }                    from "@/components/ui/label";
import { Input }                    from "@/components/ui/input";
import { Alert, AlertDescription }  from "@/components/ui/alert";
import { calculateHybridInterest }  from "@/lib/interest";

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

interface Pledge {
  id:                  string;
  pledgeDate:          string;
  loanAmount:          number;
  interestRate:        number;
  compoundingDuration: "MONTHLY" | "HALFYEARLY" | "YEARLY";
  allowCompounding:    boolean;
  durationMonths:      number | null;
  status:              string;
  remark:              string | null;
  itemPhoto:           string | null;
  netWeightOfGold:     number;
  netWeightOfSilver:   number;
  items:               PledgeItem[];
  customer: {
    id:      string;
    name:    string;
    address: string | null;
    mobile:  string | null;
    region:  string | null;
  };
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
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

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center py-2.5 border-b border-gray-50 last:border-0 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-right text-gray-900">{value}</span>
    </div>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: any; title: string }) {
  return (
    <CardTitle className="text-sm flex items-center gap-2 text-gray-600 font-medium">
      <Icon size={14} />
      {title}
    </CardTitle>
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
  const [releaseDate, setReleaseDate] = useState(today);

  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [released, setReleased] = useState(false);

  /* ── Fetch pledge ── */
  async function loadPledge() {
    setFetching(true);
    setFetchErr("");
    try {
      const res  = await fetch(
        `/api/customers/${params.customerId}/pledges/${params.pledgeId}`
      );
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
    ? new Date(releaseDate) <= new Date(pledge.pledgeDate)
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

  /* ── Release ── */
  async function handleRelease() {
    if (!pledge || !calc || isBeforePledge) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch(
        `/api/customers/${params.customerId}/pledges/${params.pledgeId}`,
        {
          method:  "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            releaseDate,
            allowCompounding:    pledge.allowCompounding,
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
  /*  States                                                           */
  /* ================================================================ */

  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-gray-300" size={28} />
      </div>
    );
  }

  if (fetchErr || !pledge) {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-3">
        <Alert variant="destructive">
          <AlertDescription>{fetchErr || "Pledge not found"}</AlertDescription>
        </Alert>
        <Button variant="outline" onClick={loadPledge} className="flex items-center gap-2">
          <RefreshCw size={13} /> Retry
        </Button>
      </div>
    );
  }

  if (released) {
    return (
      <div className="max-w-2xl mx-auto p-6 flex flex-col items-center justify-center min-h-[60vh] text-center gap-5">
        <div className="w-20 h-20 rounded-full bg-green-50 border border-green-100 flex items-center justify-center">
          <CheckCircle size={40} className="text-green-500" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Pledge Released</h2>
          <p className="text-gray-500 text-sm mt-2 leading-relaxed">
            The pledge for{" "}
            <span className="font-semibold text-gray-700">{pledge.customer.name}</span>{" "}
            has been successfully released on {fmtDate(releaseDate)}.
          </p>
        </div>
        {calc && (
          <div className="w-full max-w-sm bg-green-50 border border-green-100 rounded-xl p-4 text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">Principal</span>
              <span className="font-medium">{fmt(Number(pledge.loanAmount))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Interest collected</span>
              <span className="font-medium text-orange-600">{fmt(calc.totalInterest)}</span>
            </div>
            <div className="flex justify-between border-t border-green-200 pt-2">
              <span className="font-semibold text-green-800">Total received</span>
              <span className="font-bold text-green-700">{fmt(calc.receivableAmount)}</span>
            </div>
          </div>
        )}
        <Button
          onClick={() => router.push(`/customers/${params.customerId}`)}
          className="mt-2"
        >
          Back to Customer
        </Button>
      </div>
    );
  }

  const canRelease =
    pledge.status === "ACTIVE" && calc !== null && !isBeforePledge;

  /* ================================================================ */
  /*  Main render                                                      */
  /* ================================================================ */
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

      {/* ── Header ── */}
      <div>
        <Link
          href={`/customers/${params.customerId}/pledges/${params.pledgeId}`}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-4"
        >
          <ArrowLeft size={14} /> Back to pledge
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Release Pledge</h1>
            <p className="text-xs text-gray-400 mt-0.5 font-mono">
              #{pledge.id.slice(0, 8).toUpperCase()}
            </p>
          </div>
          <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${
            pledge.status === "ACTIVE"
              ? "bg-emerald-100 text-emerald-700 border-emerald-200"
              : "bg-gray-100 text-gray-600 border-gray-200"
          }`}>
            {titleCase(pledge.status)}
          </span>
        </div>
      </div>

      {/* ── Already released warning ── */}
      {pledge.status !== "ACTIVE" && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This pledge is already <strong>{pledge.status}</strong> and cannot be released again.
          </AlertDescription>
        </Alert>
      )}

      {/* ── Customer ── */}
      <Card>
        <CardHeader className="pb-2">
          <SectionTitle icon={User} title="Customer" />
        </CardHeader>
        <CardContent className="space-y-0">
          <InfoRow label="Name"    value={
            <Link href={`/customers/${pledge.customer.id}`} className="text-blue-600 hover:underline">
              {pledge.customer.name}
            </Link>
          } />
          {pledge.customer.mobile  && <InfoRow label="Mobile"  value={pledge.customer.mobile}  />}
          {pledge.customer.address && <InfoRow label="Address" value={pledge.customer.address} />}
          {pledge.customer.region  && <InfoRow label="Region"  value={pledge.customer.region}  />}
        </CardContent>
      </Card>

      {/* ── Pledge details ── */}
      <Card>
        <CardHeader className="pb-2">
          <SectionTitle icon={Calendar} title="Pledge Details" />
        </CardHeader>
        <CardContent className="space-y-0">
          <InfoRow label="Pledge Date"   value={fmtDate(pledge.pledgeDate)} />
          <InfoRow label="Loan Amount"   value={<span className="tabular-nums">{fmt(Number(pledge.loanAmount))}</span>} />
          <InfoRow label="Interest Rate" value={`${Number(pledge.interestRate).toFixed(2)}% p.a.`} />
          <InfoRow
            label="Interest Method"
            value={pledge.allowCompounding
              ? `${titleCase(pledge.compoundingDuration)} compounding`
              : "Simple interest"}
          />
          {pledge.remark && <InfoRow label="Remark" value={pledge.remark} />}
        </CardContent>
      </Card>

      {/* ── Items ── */}
      <Card>
        <CardHeader className="pb-2">
          <SectionTitle icon={Tag} title={`Pledged Items (${pledge.items.length})`} />
        </CardHeader>
        <CardContent className="space-y-3">
          {pledge.items.map((item, i) => (
            <div key={item.id} className="rounded-xl border-2 overflow-hidden border-gray-100 bg-gray-50/50">

              {/* Item header */}
              <div className="flex items-center gap-2.5 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Item {i + 1}
                </span>
                <span className="text-xs bg-white text-gray-600 border border-gray-200 px-2 py-0.5 rounded-md">
                  {titleCase(item.itemType)}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-md font-medium border ${
                  item.metalType === "GOLD"
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-slate-50 text-slate-600 border-slate-200"
                }`}>
                  {titleCase(item.metalType)}
                </span>
                <span className="text-xs text-gray-400 ml-auto border border-gray-200 rounded-full px-2 py-0.5">
                  {item.quantity} pc{item.quantity !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Item name */}
              {item.itemName && (
                <div className="px-4 pt-2.5 pb-0">
                  <p className="text-sm font-semibold text-gray-800">{item.itemName}</p>
                </div>
              )}

              {/* Weight grid */}
              <div className="grid grid-cols-4 divide-x divide-gray-100 border-t border-gray-100 mt-2.5">
                {[
                  { label: "Gross wt",  value: `${Number(item.grossWeight).toFixed(3)}g`      },
                  { label: "Net wt",    value: `${Number(item.netWeight).toFixed(3)}g`         },
                  { label: "Purity",    value: `${Number(item.purity).toFixed(2)}%`            },
                  { label: "Net metal", value: `${Number(item.netWeightOfMetal).toFixed(3)}g`  },
                ].map(({ label, value }) => (
                  <div key={label} className="flex flex-col items-center py-2.5 text-center">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">{label}</p>
                    <p className="text-sm font-semibold text-gray-900 tabular-nums">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Metal totals */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            {Number(pledge.netWeightOfGold) > 0 && (
              <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <Scale size={11} className="text-amber-400" />
                  <p className="text-xs text-amber-500 font-medium">Total gold</p>
                </div>
                <p className="text-base font-bold text-amber-800 tabular-nums">
                  {Number(pledge.netWeightOfGold).toFixed(3)}g
                </p>
              </div>
            )}
            {Number(pledge.netWeightOfSilver) > 0 && (
              <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <Scale size={11} className="text-slate-400" />
                  <p className="text-xs text-slate-500 font-medium">Total silver</p>
                </div>
                <p className="text-base font-bold text-slate-700 tabular-nums">
                  {Number(pledge.netWeightOfSilver).toFixed(3)}g
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Item photo ── */}
      {pledge.itemPhoto && (
        <Card>
          <CardHeader className="pb-2">
            <SectionTitle icon={Tag} title="Pledge Photo" />
          </CardHeader>
          <CardContent>
            <img
              src={pledge.itemPhoto}
              alt="Pledge item"
              className="h-48 rounded-lg object-cover border border-gray-200"
            />
          </CardContent>
        </Card>
      )}

      {/* ── Release calculation ── */}
      <Card>
        <CardHeader className="pb-2">
          <SectionTitle icon={Calendar} title="Release Calculation" />
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Date picker */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Release Date <span className="text-red-500">*</span>
            </Label>
            <Input
              type="date"
              value={releaseDate}
              min={pledge.pledgeDate}
              onChange={(e) => setReleaseDate(e.target.value)}
            />
            {isBeforePledge && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle size={11} /> Release date must be after the pledge date ({fmtDate(pledge.pledgeDate)})
              </p>
            )}
            {isFuture && !isBeforePledge && (
              <p className="text-xs text-amber-500 flex items-center gap-1">
                <AlertCircle size={11} /> You are calculating for a future date
              </p>
            )}
          </div>

          {/* Interest method — read-only */}
          <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
            <p className="text-xs text-gray-500 font-medium mb-0.5">Interest method</p>
            <p className="text-sm text-gray-800 font-medium">
              {pledge.allowCompounding
                ? `${titleCase(pledge.compoundingDuration)} compounding`
                : "Simple interest"}
              <span className="text-xs text-gray-400 font-normal ml-1.5">· set at pledge creation</span>
            </p>
          </div>

          {/* Calculation result */}
          {calc && !isBeforePledge ? (
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex justify-between px-4 py-3 text-sm border-b border-gray-100">
                <span className="text-gray-500">Duration</span>
                <span className="font-medium tabular-nums">{calc.T.toFixed(2)} months</span>
              </div>
              <div className="flex justify-between px-4 py-3 text-sm border-b border-gray-100">
                <span className="text-gray-500">Principal</span>
                <span className="font-medium tabular-nums">{fmt(Number(pledge.loanAmount))}</span>
              </div>
              <div className="flex justify-between px-4 py-3 text-sm border-b border-gray-100">
                <span className="text-gray-500">Total interest</span>
                <span className="font-semibold text-orange-600 tabular-nums">{fmt(calc.totalInterest)}</span>
              </div>
              <div className="flex justify-between px-4 py-4 bg-green-50">
                <span className="font-semibold text-green-800 text-sm">Total receivable</span>
                <span className="font-bold text-green-700 text-lg tabular-nums">{fmt(calc.receivableAmount)}</span>
              </div>
            </div>
          ) : !isBeforePledge ? (
            <div className="rounded-xl border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-400">
              Select a valid release date to calculate
            </div>
          ) : null}

        </CardContent>
      </Card>

      {/* ── Error ── */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* ── Actions ── */}
      <div className="flex gap-3 pb-4">
        <Button
          onClick={handleRelease}
          disabled={loading || !canRelease}
          className="flex-1 sm:flex-none sm:px-10 bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
        >
          {loading
            ? <><Loader2 className="animate-spin mr-2 w-4 h-4" />Releasing…</>
            : "Confirm Release"}
        </Button>
        <Button
          variant="outline"
          disabled={loading}
          onClick={() => router.push(`/customers/${params.customerId}/pledges/${params.pledgeId}`)}
        >
          Cancel
        </Button>
      </div>

    </div>
  );
}