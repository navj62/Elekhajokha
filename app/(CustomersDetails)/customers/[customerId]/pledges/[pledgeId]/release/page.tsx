"use client";

import { useEffect, useState, useMemo } from "react";
import Link                             from "next/link";
import { useParams, useRouter }         from "next/navigation";
import { Loader2, CheckCircle }         from "lucide-react";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button }              from "@/components/ui/button";
import { Label }               from "@/components/ui/label";
import { Input }               from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge }               from "@/components/ui/badge";
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
function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 2,
  }).format(n);
}

function titleCase(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
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
  const [releaseDate, setReleaseDate] = useState(today);

  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [released, setReleased] = useState(false);

  /* ── Fetch pledge ─────────────────────────────────────────────── */
  useEffect(() => {
    if (!params.pledgeId) return;
    fetch(`/api/pledges/${params.pledgeId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        const p = data?.pledge ?? data;
        if (!p?.id) throw new Error("Invalid pledge data");
        setPledge(p);
      })
      .catch((e) => setFetchErr(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setFetching(false));
  }, [params.pledgeId]);

  /* ── Validation ───────────────────────────────────────────────── */
  const isBeforePledge = pledge
    ? new Date(releaseDate) <= new Date(pledge.pledgeDate)
    : false;

  /* ── Calculation ──────────────────────────────────────────────── */
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

  /* ── Release ──────────────────────────────────────────────────── */
  async function handleRelease() {
    if (!pledge || !calc) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/pledges/${pledge.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          releaseDate,
          // ✅ Required by route — recalculates server-side using these values
          // Uses whatever was stored at pledge creation — not overrideable
          allowCompounding:    pledge.allowCompounding,
          compoundingDuration: pledge.compoundingDuration,
          // ✅ status not needed — route always sets "RELEASED"
        }),
      });

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
  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  if (fetchErr || !pledge) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Alert variant="destructive">
          <AlertDescription>{fetchErr || "Pledge not found"}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (released) {
    return (
      <div className="max-w-2xl mx-auto p-6 flex flex-col items-center gap-4 min-h-[40vh] justify-center text-center">
        <CheckCircle size={52} className="text-green-500" />
        <h2 className="text-2xl font-bold">Pledge Released</h2>
        <p className="text-gray-500 text-sm">
          The pledge for{" "}
          <span className="font-medium">{pledge.customer.name}</span> has been
          successfully released.
        </p>
        <Button onClick={() => router.push(`/customers/${params.customerId}`)}>
          Back to Customer
        </Button>
      </div>
    );
  }

  /* ================================================================ */
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
          <DetailRow label="Customer"      value={pledge.customer.name} />
          {pledge.customer.mobile  && <DetailRow label="Mobile"  value={pledge.customer.mobile}  />}
          {pledge.customer.address && <DetailRow label="Address" value={pledge.customer.address} />}
          {pledge.customer.region  && <DetailRow label="Region"  value={pledge.customer.region}  />}
          <DetailRow
            label="Pledge Date"
            value={new Date(pledge.pledgeDate).toLocaleDateString("en-IN", {
              day: "2-digit", month: "short", year: "numeric",
            })}
          />
          <DetailRow label="Loan Amount"   value={fmt(Number(pledge.loanAmount))} />
          <DetailRow label="Interest Rate" value={`${Number(pledge.interestRate).toFixed(2)}% p.a.`} />
          <DetailRow
            label="Interest Method"
            value={pledge.allowCompounding
              ? `${titleCase(pledge.compoundingDuration)} Compounding`
              : "Simple Interest"}
          />
          {pledge.remark && <DetailRow label="Remark" value={pledge.remark} />}
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            Pledged Items ({pledge.items.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {pledge.items.map((item, i) => (
            <div key={item.id} className="rounded-lg border bg-gray-50 p-3 space-y-2">
              <div className="flex items-center gap-2">
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
                <span className="text-xs text-gray-400 ml-auto">
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
                <p className="text-xs text-amber-500 mb-1">Total Gold</p>
                <p className="text-sm font-bold text-amber-800 tabular-nums">
                  {Number(pledge.netWeightOfGold).toFixed(3)}g
                </p>
              </div>
            )}
            {pledge.netWeightOfSilver > 0 && (
              <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
                <p className="text-xs text-slate-500 mb-1">Total Silver</p>
                <p className="text-sm font-bold text-slate-700 tabular-nums">
                  {Number(pledge.netWeightOfSilver).toFixed(3)}g
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Item photo */}
      {pledge.itemPhoto && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Item Photo</CardTitle>
          </CardHeader>
          <CardContent>
            <img
              src={pledge.itemPhoto}
              alt="Pledge item"
              className="h-48 rounded-md object-cover border"
            />
          </CardContent>
        </Card>
      )}

      {/* Release Calculation */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Release Calculation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

          <div className="space-y-1">
            <Label className="text-sm font-medium">
              Release Date <span className="text-red-500">*</span>
            </Label>
            <Input
              type="date"
              value={releaseDate}
              min={pledge.pledgeDate} // browser-level guard
              onChange={(e) => setReleaseDate(e.target.value)}
            />
            {isBeforePledge && (
              <p className="text-xs text-red-500">
                Release date must be after the pledge date.
              </p>
            )}
          </div>

          {/* Interest method — read-only, set at pledge creation */}
          <div className="rounded-md border bg-gray-50 px-4 py-3">
            <p className="text-sm font-medium text-gray-700">Interest Method</p>
            <p className="text-sm text-gray-500 mt-0.5">
              {pledge.allowCompounding
                ? `${titleCase(pledge.compoundingDuration)} Compounding`
                : "Simple Interest"}
              {" "}· set at pledge creation
            </p>
          </div>

          {/* Calculation result */}
          {calc && !isBeforePledge ? (
            <div className="rounded-md bg-gray-50 border divide-y">
              <div className="flex justify-between px-4 py-3 text-sm">
                <span className="text-gray-500">Duration</span>
                <span className="font-medium tabular-nums">{calc.T.toFixed(2)} months</span>
              </div>
              <div className="flex justify-between px-4 py-3 text-sm">
                <span className="text-gray-500">Principal</span>
                <span className="font-medium tabular-nums">{fmt(Number(pledge.loanAmount))}</span>
              </div>
              <div className="flex justify-between px-4 py-3 text-sm">
                <span className="text-gray-500">Total Interest</span>
                <span className="font-medium text-orange-600 tabular-nums">
                  {fmt(calc.totalInterest)}
                </span>
              </div>
              <div className="flex justify-between px-4 py-3 text-sm bg-green-50 rounded-b-md">
                <span className="font-semibold text-green-800">Receivable Amount</span>
                <span className="font-bold text-green-700 text-base tabular-nums">
                  {fmt(calc.receivableAmount)}
                </span>
              </div>
            </div>
          ) : !isBeforePledge ? (
            <div className="rounded-md bg-gray-50 border px-4 py-3 text-sm text-gray-400 text-center">
              Select a valid release date to calculate.
            </div>
          ) : null}

        </CardContent>
      </Card>

      {/* Error */}
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
          {loading
            ? <><Loader2 className="animate-spin mr-2 w-4 h-4" /> Releasing…</>
            : "Confirm Release"}
        </Button>
        <Button
          variant="outline"
          disabled={loading}
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