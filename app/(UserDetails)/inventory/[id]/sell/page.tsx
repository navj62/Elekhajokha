"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, RefreshCw, ImageOff, Loader2, AlertTriangle, Package } from "lucide-react";

import { cn } from "@/lib/utils";
import SubscriptionGuard from "@/components/SubscriptionGuard";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card, Eyebrow, MetalBadge, Row, btnPrimary, btnSecondary,
  fmtINR, fmtDate, fmtGrams,
} from "@/components/ui/DetailParts";
import {
  fetchItem, valueToday, fmtChange, localISO,
  type Item, type MarketRates, type FetchResult,
} from "@/components/inventory/inventoryItem";

/* -------------------------------------------------------------------------- */
/* Form                                                                        */
/* -------------------------------------------------------------------------- */
type Field = "soldPrice" | "soldAt" | "buyerName" | "buyerMobile" | "saleNotes";
type FormValues = Record<Field, string>;
type FieldErrors = Partial<Record<Field, string>>;

const NOTES_MAX = 1000;
const BUYER_NAME_MAX = 200; // the route's limit

/** A positive rupee amount, or null when the input isn't one. */
function parsePrice(v: string): number | null {
  if (!v.trim()) return null;
  const n = Number(v.trim());
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** The page's own checks. The route re-validates price/date/lengths. */
function validate(v: FormValues, minDate: string, maxDate: string, acquiredLabel: string): FieldErrors {
  const e: FieldErrors = {};
  if (!v.soldPrice.trim()) e.soldPrice = "Enter the sale price.";
  else if (parsePrice(v.soldPrice) === null) e.soldPrice = "Enter an amount greater than ₹0, digits only (e.g. 25000).";

  if (!v.soldAt) e.soldAt = "Choose the sale date.";
  else if (v.soldAt < minDate) e.soldAt = `Can't be before the item was acquired (${acquiredLabel}).`;
  else if (v.soldAt > maxDate) e.soldAt = "Can't be in the future.";

  if (v.buyerName.length > BUYER_NAME_MAX) e.buyerName = `At most ${BUYER_NAME_MAX} characters.`;
  // Exactly as typed: no spaces, symbols or +91.
  if (v.buyerMobile !== "" && !/^\d{10}$/.test(v.buyerMobile)) {
    e.buyerMobile = "Enter exactly 10 digits, with no spaces, symbols or +91.";
  }
  if (v.saleNotes.length > NOTES_MAX) e.saleNotes = `At most ${NOTES_MAX} characters.`;
  return e;
}

/* -------------------------------------------------------------------------- */
/* Sub-components                                                              */
/* -------------------------------------------------------------------------- */
/** Signed amount and %, coloured AND marked + / − so colour is never the only cue. */
function ProfitValue({ profit, cost }: { profit: number | null; cost: number | null }) {
  if (profit === null) return <>—</>;
  if (profit === 0) return <>₹0 · break even</>;
  return (
    <span className={profit > 0 ? "text-risk-low-foreground" : "text-risk-critical-foreground"}>
      {cost !== null ? fmtChange(profit, cost) : null}
    </span>
  );
}

function LossWarning({ loss }: { loss: number }) {
  return (
    <p role="status" className="flex items-start gap-2 px-3 py-2.5 rounded-[12px] bg-risk-medium-surface text-[13px] font-semibold text-risk-medium-foreground">
      <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden />
      This price is {fmtINR(loss)} below what the item cost — the sale will be recorded as a loss.
    </p>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return <p id={id} className="text-[12px] font-semibold text-risk-critical-foreground">{message}</p>;
}

/* ========================================================================== */
/* Page                                                                        */
/* ========================================================================== */
export default function SellInventoryItemPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [item, setItem] = useState<Item | null>(null);
  const [market, setMarket] = useState<MarketRates | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [step, setStep] = useState<"form" | "review">("form");
  const [values, setValues] = useState<FormValues>(() => ({
    soldPrice: "", soldAt: localISO(new Date()), buyerName: "", buyerMobile: "", saleNotes: "",
  }));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [alreadySold, setAlreadySold] = useState(false);
  // State updates are async; the ref blocks a second click in the same tick.
  const submitting = useRef(false);

  /* ── Load ── */
  // State is only set from the promise callback, never synchronously inside
  // the effect body. `cancelled` drops a response for an item we've left.
  const apply = useCallback((r: FetchResult) => {
    if (r.ok) {
      setItem(r.item);
      setMarket(r.market);
      setLoadError(null);
    } else {
      setLoadError(r.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchItem(id).then((r) => { if (!cancelled) apply(r); });
    return () => { cancelled = true; };
  }, [id, apply]);

  const retry = () => {
    setLoading(true);
    fetchItem(id).then(apply);
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <SubscriptionGuard>
        <div className="max-w-[1100px] mx-auto lg:px-8 pt-4 lg:pt-8 pb-6" aria-busy="true" aria-label="Loading item">
          <div className="rounded-[24px] bg-card-alt p-4 lg:p-6 mb-4 lg:mb-6">
            <div className="skeleton h-[26px] w-[220px] max-w-full mb-3" />
            <div className="skeleton h-[14px] w-[320px] max-w-full" />
          </div>
          <div className="grid gap-4 lg:gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <div className="skeleton h-[320px] rounded-[24px]" />
            <div className="skeleton h-[320px] rounded-[24px]" />
          </div>
        </div>
      </SubscriptionGuard>
    );
  }

  /* ── Error ── */
  if (loadError || !item) {
    return (
      <SubscriptionGuard>
        <div className="max-w-[1100px] mx-auto lg:px-8 pt-4 lg:pt-8 pb-6 space-y-4">
          <div role="alert" className="p-6 rounded-[16px] border bg-risk-critical-surface border-risk-critical/40">
            <h3 className="text-[14px] font-bold text-risk-critical-foreground mb-1">Unable to load item</h3>
            <p className="text-[13px] text-risk-critical-foreground">{loadError ?? "Item not found"}</p>
          </div>
          <div className="flex gap-2">
            <Link href="/inventory" className={btnSecondary}>
              <ArrowLeft size={15} /> Inventory
            </Link>
            <button type="button" onClick={retry} className={btnSecondary}>
              <RefreshCw size={15} /> Retry
            </button>
          </div>
        </div>
      </SubscriptionGuard>
    );
  }

  /* ── Derived ── */
  const itemHref = `/inventory/${item.id}`;
  const cost = item.acquiredCost;
  const minDate = localISO(new Date(item.acquiredAt));
  const maxDate = localISO(new Date());
  const price = parsePrice(values.soldPrice);
  const profit = price !== null && cost !== null ? price - cost : null;
  const valueNow = valueToday(item, market);
  const sp = item.sourcePledge;

  const set = (field: Field) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const v = e.target.value;
    setValues((prev) => ({ ...prev, [field]: v }));
    // Re-check only a field that is already showing an error.
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const review = (e: React.FormEvent) => {
    e.preventDefault();
    const found = validate(values, minDate, maxDate, fmtDate(item.acquiredAt));
    setErrors(found);
    if (Object.keys(found).length > 0) {
      const first = (Object.keys(found) as Field[])[0];
      document.getElementById(`sell-${first}`)?.focus();
      return;
    }
    setServerError(null);
    setStep("review");
  };

  const confirm = async () => {
    if (submitting.current || price === null) return;
    submitting.current = true;
    setSaving(true);
    setServerError(null);
    try {
      const res = await fetch(`/api/inventory/${item.id}/sell`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          soldPrice: price,
          soldAt: values.soldAt,
          buyerName: values.buyerName.trim() || null,
          buyerMobile: values.buyerMobile || null,
          saleNotes: values.saleNotes.trim() || null,
        }),
      });
      if (res.ok) {
        // Stay "saving" (button disabled) until the detail page replaces this one.
        router.push(itemHref);
        return;
      }
      const data = await res.json().catch(() => null);
      if (res.status === 409) {
        setAlreadySold(true);
      } else if (res.status === 400) {
        setServerError(
          data?.error === "VALIDATION" && typeof data.message === "string"
            ? data.message
            : "The sale details weren't accepted. Go back, check them and try again.",
        );
      } else {
        setServerError("Couldn't record the sale. Please try again.");
      }
    } catch {
      setServerError("Couldn't record the sale. Check your connection and try again.");
    }
    submitting.current = false;
    setSaving(false);
  };

  /* ====================================================================== */
  /* UI                                                                      */
  /* ====================================================================== */
  const header = (
    <section className="rounded-[24px] bg-card-alt p-4 lg:p-6 flex items-start gap-3 lg:gap-4">
      <Link
        href={itemHref}
        aria-label="Back to item"
        className="size-11 shrink-0 inline-flex items-center justify-center rounded-full border border-border bg-card text-foreground hover:bg-accent transition-colors"
      >
        <ArrowLeft size={18} />
      </Link>
      <div className="min-w-0 flex-1">
        <h1 className="text-[20px] lg:text-[26px] leading-tight font-bold text-foreground">Sell item</h1>
        <p className="mt-1 text-[13px] font-medium text-muted-foreground-subtle break-words">{item.description}</p>
      </div>
    </section>
  );

  /* ── Already sold when the page opened ── */
  if (item.status === "SOLD") {
    const soldProfit = item.soldPrice !== null && cost !== null ? item.soldPrice - cost : null;
    return (
      <SubscriptionGuard>
        <div className="max-w-[1100px] mx-auto lg:px-8 pt-4 lg:pt-8 pb-6 lg:pb-16 text-foreground flex flex-col gap-4 lg:gap-6">
          {header}
          <Card title="This item has already been sold" className="lg:max-w-[640px]">
            <dl className="px-5 lg:px-6 pb-2">
              <Row label="Sold for" value={fmtINR(item.soldPrice)} />
              <Row label="Sale date" value={fmtDate(item.soldAt)} />
              <Row label="Buyer" value={item.buyerName || "—"} />
              <Row label="Profit / loss" sub="Sale price − acquired cost" value={<ProfitValue profit={soldProfit} cost={cost} />} />
            </dl>
            <div className="px-5 lg:px-6 pb-5">
              <Link href={itemHref} className={cn(btnPrimary, "w-full sm:w-auto")}>View item</Link>
            </div>
          </Card>
        </div>
      </SubscriptionGuard>
    );
  }

  const errId = (f: Field) => `sell-${f}-error`;
  const fieldProps = (f: Field) => ({
    id: `sell-${f}`,
    value: values[f],
    onChange: set(f),
    "aria-invalid": errors[f] ? true : undefined,
    "aria-describedby": errors[f] ? errId(f) : undefined,
  });
  const labelCls = "text-[13px] font-semibold text-foreground";
  const optional = <span className="font-normal text-muted-foreground-subtle">(optional)</span>;

  return (
    <SubscriptionGuard>
      <div className="max-w-[1100px] mx-auto lg:px-8 pt-4 lg:pt-8 pb-6 lg:pb-16 text-foreground flex flex-col gap-4 lg:gap-6">
        {header}

        <div className="grid gap-4 lg:gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] items-start">

          {/* ── LEFT — item summary (read-only) ── */}
          <Card title="Item">
            <div className="px-5 lg:px-6 flex items-start gap-4">
              {item.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.photoUrl} alt={`Photo of ${item.description}`} className="size-20 shrink-0 rounded-[16px] object-cover bg-muted" />
              ) : (
                <div className="size-20 shrink-0 rounded-[16px] bg-muted text-muted-foreground-subtle flex flex-col items-center justify-center gap-1">
                  <ImageOff size={18} aria-hidden />
                  <span className="text-[11px] font-semibold">No photo</span>
                </div>
              )}
              <div className="min-w-0">
                <p className="text-[16px] font-bold text-foreground break-words">{item.description}</p>
                <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[13px] text-muted-foreground">
                  <MetalBadge metal={item.metalType} /> {item.itemType}
                </p>
              </div>
            </div>
            <dl className="px-5 lg:px-6 pt-2 pb-4">
              <Row label="Purity" value={item.purity !== null ? `${item.purity}%` : "—"} />
              <Row label="Gross weight" value={item.grossWeight !== null ? fmtGrams(item.grossWeight) : "—"} />
              <Row
                label="Net weight"
                value={
                  [
                    item.netWeightOfGold > 0 ? `Gold ${fmtGrams(item.netWeightOfGold)}` : null,
                    item.netWeightOfSilver > 0 ? `Silver ${fmtGrams(item.netWeightOfSilver)}` : null,
                  ].filter(Boolean).join(" · ") || "—"
                }
              />
              <Row label="Acquired on" value={fmtDate(item.acquiredAt)} />
              <Row label="Acquired cost" value={fmtINR(cost)} />
              <Row
                label="Source"
                value={
                  item.sourceType === "PLEDGE_SALE" ? (
                    sp ? (
                      <Link href={`/customers/${sp.customerId}/pledges/${sp.id}`} className="text-primary hover:underline underline-offset-4">
                        Pledge · {sp.customerName}
                      </Link>
                    ) : "From pledge"
                  ) : (
                    <>Direct purchase{item.sellerName ? ` · ${item.sellerName}` : ""}</>
                  )
                }
              />
            </dl>
          </Card>

          {/* ── RIGHT — sale form / review ── */}
          {step === "form" ? (
            <Card title="Sale details">
              <form onSubmit={review} noValidate className="px-5 lg:px-6 pb-5 flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <label htmlFor="sell-soldPrice" className={labelCls}>Sold price (₹)</label>
                  <Input {...fieldProps("soldPrice")} type="text" inputMode="decimal" placeholder="e.g. 25000" className="h-11" autoFocus />
                  <FieldError id={errId("soldPrice")} message={errors.soldPrice} />
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="sell-soldAt" className={labelCls}>Sale date</label>
                  <Input {...fieldProps("soldAt")} type="date" min={minDate} max={maxDate} className="h-11" />
                  <FieldError id={errId("soldAt")} message={errors.soldAt} />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="flex flex-col gap-2 min-w-0">
                    <label htmlFor="sell-buyerName" className={labelCls}>Buyer name {optional}</label>
                    <Input {...fieldProps("buyerName")} type="text" maxLength={BUYER_NAME_MAX} autoComplete="off" className="h-11" />
                    <FieldError id={errId("buyerName")} message={errors.buyerName} />
                  </div>
                  <div className="flex flex-col gap-2 min-w-0">
                    <label htmlFor="sell-buyerMobile" className={labelCls}>Buyer mobile {optional}</label>
                    <Input {...fieldProps("buyerMobile")} type="tel" inputMode="numeric" placeholder="10 digits" autoComplete="off" className="h-11" />
                    <FieldError id={errId("buyerMobile")} message={errors.buyerMobile} />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="sell-saleNotes" className={labelCls}>Notes {optional}</label>
                  <Textarea {...fieldProps("saleNotes")} rows={3} maxLength={NOTES_MAX} />
                  <div className="flex items-start justify-between gap-3">
                    <FieldError id={errId("saleNotes")} message={errors.saleNotes} />
                    <span className="ml-auto text-[12px] text-muted-foreground-subtle tabular-nums">
                      {values.saleNotes.length}/{NOTES_MAX}
                    </span>
                  </div>
                </div>

                {/* Live preview */}
                <section aria-label="Sale preview" aria-live="polite" className="rounded-[16px] bg-muted/50 border border-border px-4 pt-3 pb-1">
                  <Eyebrow>Preview</Eyebrow>
                  <dl>
                    <Row label="Acquired cost" value={fmtINR(cost)} />
                    <Row label="Market value today" sub="at today's metal price" value={fmtINR(valueNow)} />
                    <Row label="Profit / loss" sub="Sold price − acquired cost" value={<ProfitValue profit={profit} cost={cost} />} />
                  </dl>
                </section>
                {profit !== null && profit < 0 && <LossWarning loss={-profit} />}

                <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
                  <Link href={itemHref} className={cn(btnSecondary, "w-full sm:w-auto")}>Cancel</Link>
                  <button type="submit" className={cn(btnPrimary, "w-full sm:w-auto")}>Review sale</button>
                </div>
              </form>
            </Card>
          ) : (
            <Card title="Review sale">
              <dl className="px-5 lg:px-6">
                <Row label="Item" value={item.description} />
                <Row label="Sold price" value={fmtINR(price)} />
                <Row label="Sale date" value={fmtDate(values.soldAt)} />
                <Row
                  label="Buyer"
                  value={[values.buyerName.trim(), values.buyerMobile].filter(Boolean).join(" · ") || "—"}
                />
                {values.saleNotes.trim() && <Row label="Notes" value={values.saleNotes.trim()} />}
                <Row label="Profit / loss" sub="vs acquired cost" value={<ProfitValue profit={profit} cost={cost} />} />
              </dl>
              <div className="px-5 lg:px-6 pt-2 pb-5 flex flex-col gap-3">
                {profit !== null && profit < 0 && <LossWarning loss={-profit} />}

                {alreadySold && (
                  <p role="alert" className="p-3 rounded-[12px] bg-risk-critical-surface text-[13px] text-risk-critical-foreground">
                    This item was already sold.{" "}
                    <Link href={itemHref} className="font-bold underline underline-offset-4">View item</Link>
                  </p>
                )}
                {serverError && (
                  <p role="alert" className="p-3 rounded-[12px] bg-risk-critical-surface text-[13px] text-risk-critical-foreground">{serverError}</p>
                )}

                <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
                  <button
                    type="button"
                    onClick={() => { setStep("form"); setServerError(null); }}
                    disabled={saving}
                    className={cn(btnSecondary, "w-full sm:w-auto disabled:opacity-50")}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={confirm}
                    disabled={saving || alreadySold}
                    className={cn(btnPrimary, "w-full sm:w-auto disabled:opacity-50")}
                  >
                    {saving ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <Package size={15} aria-hidden />}
                    {saving ? "Saving…" : "Confirm sale"}
                  </button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </SubscriptionGuard>
  );
}
