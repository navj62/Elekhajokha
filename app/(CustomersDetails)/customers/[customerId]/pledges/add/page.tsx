"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Loader2, X, ImageIcon, Plus, Trash2 } from "lucide-react";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Input }               from "@/components/ui/input";
import { Button }              from "@/components/ui/button";
import { Label }               from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea }            from "@/components/ui/textarea";

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */
const ITEM_TYPES = [
  { value: "NECKLACE", label: "Necklace" },
  { value: "CHAIN",    label: "Chain"    },
  { value: "RING",     label: "Ring"     },
  { value: "BANGLE",   label: "Bangle"  },
  { value: "BRACELET", label: "Bracelet" },
  { value: "EARRING",  label: "Earring" },
  { value: "ANKLET",   label: "Anklet"  },
  { value: "PENDANT",  label: "Pendant" },
  { value: "COIN",     label: "Coin"    },
  { value: "BAR",      label: "Bar"     },
  { value: "OTHER",    label: "Other"   },
] as const;

const METAL_TYPES = [
  { value: "GOLD",   label: "Gold"   },
  { value: "SILVER", label: "Silver" },
] as const;

const COMPOUNDING_OPTIONS = [
  { value: "MONTHLY",    label: "Monthly"     },
  { value: "HALFYEARLY", label: "Half-Yearly" },
  { value: "YEARLY",     label: "Yearly"      },
] as const;

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
interface Customer {
  id:      string;
  name:    string;
  address: string;
}

interface ItemForm {
  itemType:    string;
  metalType:   string;
  itemName:    string;
  quantity:    string;
  grossWeight: string;
  netWeight:   string;
  purity:      string;
}

interface LivePrices {
  gold:   number;   // ₹ per gram
  silver: number;   // ₹ per gram
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */
function calcNetWeightOfMetal(item: ItemForm): string {
  const nw = parseFloat(item.netWeight);
  const pu = parseFloat(item.purity);
  if (nw > 0 && pu > 0 && !isNaN(nw) && !isNaN(pu)) {
    return (nw * (pu / 100)).toFixed(3);
  }
  return "";
}

function defaultItem(): ItemForm {
  return {
    itemType:    "NECKLACE",
    metalType:   "GOLD",
    itemName:    "",
    quantity:    "1",
    grossWeight: "",
    netWeight:   "",
    purity:      "",
  };
}

/* ------------------------------------------------------------------ */
/*  FormField                                                           */
/* ------------------------------------------------------------------ */
function FormField({
  label, hint, required, children,
}: {
  label:     string;
  hint?:     string;
  required?: boolean;
  children:  React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label className="flex items-center gap-1">
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/* ================================================================== */
/*  Page                                                                */
/* ================================================================== */
export default function AddPledgePage() {
  const params     = useParams<{ customerId: string }>();
  const customerId = params?.customerId;
  const router     = useRouter();

  /* ---- Customer -------------------------------------------------- */
  const [customer,        setCustomer]        = useState<Customer | null>(null);
  const [customerLoading, setCustomerLoading] = useState(true);

  useEffect(() => {
    if (!customerId) return;
    fetch(`/api/customers/${customerId}`)
      .then((r) => r.json())
      .then(setCustomer)
      .catch(() => {})
      .finally(() => setCustomerLoading(false));
  }, [customerId]);

  /* ---- Live metal prices ----------------------------------------- */
  const [prices,     setPrices]     = useState<LivePrices | null>(null);
  const [priceError, setPriceError] = useState(false);

  useEffect(() => {
    async function loadPrices() {
      try {
        const res  = await fetch("/api/latest-prices");
        const data = await res.json();
        // data.gold.perGram and data.silver.perGram — from our route
        setPrices({
          gold:   data.gold?.perGram   ?? 0,
          silver: data.silver?.perGram ?? 0,
        });
        setPriceError(false);
      } catch {
        setPriceError(true);
      }
    }
    loadPrices();
    const id = setInterval(loadPrices, 60_000);
    return () => clearInterval(id);
  }, []);

  /* ---- Loan state ------------------------------------------------ */
  const today = new Date().toISOString().split("T")[0];

  const [loan, setLoan] = useState({
    pledgeDate:          today,
    loanAmount:          "",
    interestRate:        "",
    compoundingDuration: "YEARLY",
    allowCompounding:    true,
    durationMonths:      "12",
    remark:              "",
  });

  const updateLoan = (k: string, v: string | boolean) =>
    setLoan((prev) => ({ ...prev, [k]: v }));

  /* ---- Items ----------------------------------------------------- */
  const [items, setItems] = useState<ItemForm[]>([defaultItem()]);

  function updateItem(index: number, key: keyof ItemForm, value: string) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [key]: value } : item))
    );
  }
  const addItem    = () => setItems((prev) => [...prev, defaultItem()]);
  const removeItem = (index: number) =>
    setItems((prev) => prev.length === 1 ? prev : prev.filter((_, i) => i !== index));

  /* ---- Metal aggregates — fully derived -------------------------- */
  const { netWeightOfGold, netWeightOfSilver } = useMemo(() => {
    let gold = 0, silver = 0;
    for (const item of items) {
      const v = parseFloat(calcNetWeightOfMetal(item)) || 0;
      if (item.metalType === "GOLD")   gold   += v;
      if (item.metalType === "SILVER") silver += v;
    }
    return {
      netWeightOfGold:   parseFloat(gold.toFixed(3)),
      netWeightOfSilver: parseFloat(silver.toFixed(3)),
    };
  }, [items]);

  /* ---- Loan insights — derived ----------------------------------- */
  const loanAmountNum  = Number(loan.loanAmount)    || 0;
  const interestRateNum = Number(loan.interestRate) || 0;
  const durationYears  = (Number(loan.durationMonths) || 0) / 12;

  const goldValue   = prices ? netWeightOfGold   * prices.gold   : 0;
  const silverValue = prices ? netWeightOfSilver * prices.silver : 0;
  const totalValue  = goldValue + silverValue;

  const ltv              = totalValue > 0 ? (loanAmountNum / totalValue) * 100 : 0;
  const estimatedInterest = loanAmountNum * (interestRateNum / 100) * durationYears;
  const totalRepayment   = loanAmountNum + estimatedInterest;

  /* ---- Validation ------------------------------------------------ */
  const validationError = useMemo((): string | null => {
    if (!loan.loanAmount || loanAmountNum <= 0)
      return "Loan amount must be greater than 0";
    if (!loan.interestRate || interestRateNum <= 0)
      return "Interest rate must be greater than 0";
    if (interestRateNum > 100)
      return "Interest rate cannot exceed 100%";
    if (!loan.pledgeDate)
      return "Pledge date is required";
    if (!loan.durationMonths || Number(loan.durationMonths) <= 0)
      return "Duration must be greater than 0";

    for (let i = 0; i < items.length; i++) {
      const item  = items[i];
      const label = `Item ${i + 1}`;
      if (!item.grossWeight || Number(item.grossWeight) <= 0)
        return `${label}: Gross weight must be greater than 0`;
      if (!item.netWeight || Number(item.netWeight) <= 0)
        return `${label}: Net weight must be greater than 0`;
      if (Number(item.netWeight) > Number(item.grossWeight))
        return `${label}: Net weight cannot exceed gross weight`;
      if (!item.purity || Number(item.purity) <= 0 || Number(item.purity) > 100)
        return `${label}: Purity must be between 1 and 100`;
      if (!calcNetWeightOfMetal(item))
        return `${label}: Could not calculate net metal weight`;
    }

    if (netWeightOfGold === 0 && netWeightOfSilver === 0)
      return "At least one item must have a valid metal weight";

    return null;
  }, [loan, items, loanAmountNum, interestRateNum, netWeightOfGold, netWeightOfSilver]);

  const isValid = validationError === null;

  /* ---- Image ----------------------------------------------------- */
  const [imageFile,    setImageFile] = useState<File | null>(null);
  const [imagePreview, setPreview]   = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean up object URL on unmount to avoid memory leaks
  useEffect(() => {
    return () => { if (imagePreview) URL.revokeObjectURL(imagePreview); };
  }, [imagePreview]);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Please upload a valid image file"); return; }
    if (file.size > 5 * 1024 * 1024)    { setError("Image must be smaller than 5 MB");  return; }
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
    setError("");
  }

  function removeImage() {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  /* ---- UI state -------------------------------------------------- */
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const [submitted, setSubmitted] = useState(false); // show errors only after first submit

  /* ---- Submit ---------------------------------------------------- */
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);

    if (!isValid) {
      setError(validationError ?? "Please fix the errors above");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const fd = new FormData();

      fd.append("customerId", customerId ?? "");
      fd.append("status",     "ACTIVE");

      // Loan fields
      fd.append("pledgeDate",          loan.pledgeDate);
      fd.append("loanAmount",          loan.loanAmount);
      fd.append("interestRate",        loan.interestRate);
      fd.append("compoundingDuration", loan.compoundingDuration);
      fd.append("allowCompounding",    String(loan.allowCompounding));
      fd.append("durationMonths",      loan.durationMonths);
      fd.append("remark",              loan.remark);

      // Metal aggregates
      fd.append("netWeightOfGold",   netWeightOfGold.toFixed(3));
      fd.append("netWeightOfSilver", netWeightOfSilver.toFixed(3));

      // Items — all numerics converted before sending
      const itemsPayload = items.map((item) => ({
        itemType:         item.itemType,
        metalType:        item.metalType,
        itemName:         item.itemName,
        quantity:         Number(item.quantity),
        grossWeight:      Number(item.grossWeight),
        netWeight:        Number(item.netWeight),
        purity:           Number(item.purity),
        netWeightOfMetal: Number(calcNetWeightOfMetal(item)),
      }));
      fd.append("items", JSON.stringify(itemsPayload));

      if (imageFile) fd.append("itemPhoto", imageFile);

      const res = await fetch("/api/pledges", { method: "POST", body: fd });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save pledge");
      }

      router.push(customerId ? `/customers/${customerId}` : "/customers");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  /* ================================================================ */
  /*  Render                                                            */
  /* ================================================================ */
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">

      {customerId && (
        <Link
          href={`/customers/${customerId}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Back to customer
        </Link>
      )}

      <h1 className="text-2xl font-bold">Add Pledge</h1>

      {/* Customer banner */}
      {customerLoading ? (
        <p className="text-sm text-muted-foreground">Loading customer…</p>
      ) : customer ? (
        <p className="text-sm text-muted-foreground">
          Customer:{" "}
          <span className="font-medium text-foreground">{customer.name}</span>
          {customer.address && ` · ${customer.address}`}
        </p>
      ) : null}

      {/* Price source indicator */}
      {priceError && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded px-3 py-1.5">
          ⚠ Live prices unavailable — loan insights hidden
        </p>
      )}

      <form onSubmit={submit} className="space-y-5">

        {/* ── Loan Details ─────────────────────────────────────── */}
        <Card>
          <CardHeader><CardTitle>Loan Details</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">

            <FormField label="Pledge Date" required>
              <Input
                type="date"
                value={loan.pledgeDate}
                onChange={(e) => updateLoan("pledgeDate", e.target.value)}
                required
              />
            </FormField>

            <FormField label="Loan Amount (₹)" required>
              <Input
                type="number" min="1" step="0.01"
                placeholder="e.g. 50000"
                value={loan.loanAmount}
                onChange={(e) => updateLoan("loanAmount", e.target.value)}
                required
              />
            </FormField>

            <FormField label="Interest Rate (% p.a.)" required>
              <Input
                type="number" min="0.01" max="100" step="0.01"
                placeholder="e.g. 12"
                value={loan.interestRate}
                onChange={(e) => updateLoan("interestRate", e.target.value)}
                required
              />
            </FormField>

            <FormField label="Duration (months)" required>
              <Input
                type="number" min="1" step="1"
                placeholder="e.g. 12"
                value={loan.durationMonths}
                onChange={(e) => updateLoan("durationMonths", e.target.value)}
                required
              />
            </FormField>

            <FormField label="Compounding Duration" required>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={loan.compoundingDuration}
                onChange={(e) => updateLoan("compoundingDuration", e.target.value)}
              >
                {COMPOUNDING_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </FormField>

            {/* Allow Compounding toggle */}
            <div className="flex items-center justify-between rounded-md border px-4 py-3">
              <div>
                <p className="text-sm font-medium">Allow Compounding</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {loan.allowCompounding
                    ? "Hybrid: compound per cycle + simple for remainder"
                    : "Pure simple interest — P × (1 + R × T)"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => updateLoan("allowCompounding", !loan.allowCompounding)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                  loan.allowCompounding ? "bg-black" : "bg-gray-200"
                }`}
              >
                <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                  loan.allowCompounding ? "translate-x-6" : "translate-x-1"
                }`} />
              </button>
            </div>

          </CardContent>
        </Card>

        {/* ── Item Details ─────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>
              Item Details
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({items.length} {items.length === 1 ? "item" : "items"})
              </span>
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            {items.map((item, index) => (
              <div key={index} className="space-y-4">

                {/* Item header */}
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Item {index + 1}
                  </p>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="text-destructive hover:text-destructive/80 transition-colors"
                      aria-label="Remove item"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">

                  <FormField label="Item Type" required>
                    <select
                      className="w-full border rounded-md px-3 py-2 text-sm"
                      value={item.itemType}
                      onChange={(e) => updateItem(index, "itemType", e.target.value)}
                    >
                      {ITEM_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </FormField>

                  <FormField label="Metal Type" required>
                    <select
                      className="w-full border rounded-md px-3 py-2 text-sm"
                      value={item.metalType}
                      onChange={(e) => updateItem(index, "metalType", e.target.value)}
                    >
                      {METAL_TYPES.map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </FormField>

                  <FormField label="Item Name">
                    <Input
                      type="text"
                      placeholder="e.g. Gold Necklace (optional)"
                      value={item.itemName}
                      onChange={(e) => updateItem(index, "itemName", e.target.value)}
                    />
                  </FormField>

                  <FormField label="Quantity (pcs)" hint="Informational only">
                    <Input
                      type="number" min="1" step="1"
                      placeholder="e.g. 2"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, "quantity", e.target.value)}
                    />
                  </FormField>

                  <FormField label="Gross Weight (g)" required>
                    <Input
                      type="number" min="0.001" step="0.001"
                      placeholder="e.g. 22.500"
                      value={item.grossWeight}
                      onChange={(e) => updateItem(index, "grossWeight", e.target.value)}
                    />
                  </FormField>

                  <FormField label="Net Weight (g)" required>
                    <Input
                      type="number" min="0.001" step="0.001"
                      placeholder="e.g. 20.000"
                      value={item.netWeight}
                      onChange={(e) => updateItem(index, "netWeight", e.target.value)}
                    />
                  </FormField>

                  <FormField label="Purity (%)" required>
                    <Input
                      type="number" min="0.01" max="100" step="0.01"
                      placeholder="e.g. 91.6"
                      value={item.purity}
                      onChange={(e) => updateItem(index, "purity", e.target.value)}
                    />
                  </FormField>

                  {/* Auto-calculated — derived, never stored in state */}
                  <FormField
                    label="Net Metal Weight (g)"
                    hint="Auto · Net Weight × (Purity ÷ 100)"
                  >
                    <Input
                      type="text"
                      value={calcNetWeightOfMetal(item)}
                      readOnly
                      placeholder="Fill net weight & purity"
                      className="bg-muted cursor-not-allowed text-muted-foreground font-medium"
                    />
                  </FormField>

                </div>

                {index < items.length - 1 && <div className="border-t pt-2" />}
              </div>
            ))}

            <button
              type="button"
              onClick={addItem}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground border border-dashed rounded-md px-4 py-2.5 w-full justify-center transition-colors"
            >
              <Plus size={14} /> Add Another Item
            </button>
          </CardContent>
        </Card>

        {/* ── Metal Summary ─────────────────────────────────────── */}
        {(netWeightOfGold > 0 || netWeightOfSilver > 0) && (
          <Card>
            <CardHeader><CardTitle>Metal Summary</CardTitle></CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4">
              <div className="flex items-center justify-between rounded-lg bg-amber-50 border border-amber-100 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🥇</span>
                  <span className="text-sm font-medium text-amber-800">Net Gold Weight</span>
                </div>
                <span className="text-sm font-bold text-amber-900 tabular-nums">
                  {netWeightOfGold > 0 ? `${netWeightOfGold.toFixed(3)} g` : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-gray-50 border border-gray-200 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🥈</span>
                  <span className="text-sm font-medium text-gray-700">Net Silver Weight</span>
                </div>
                <span className="text-sm font-bold text-gray-900 tabular-nums">
                  {netWeightOfSilver > 0 ? `${netWeightOfSilver.toFixed(3)} g` : "—"}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Loan Insights (only when live prices available) ───── */}
        {prices && totalValue > 0 && (
          <Card>
            <CardHeader><CardTitle>Loan Insights</CardTitle></CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4">

              <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3">
                <p className="text-xs text-blue-600 font-medium uppercase tracking-wide mb-1">
                  Collateral Value
                </p>
                <p className="text-lg font-bold text-blue-900">
                  ₹{totalValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </p>
                {goldValue > 0 && (
                  <p className="text-xs text-blue-500 mt-0.5">
                    Gold ₹{goldValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    {silverValue > 0 && ` + Silver ₹${silverValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
                  </p>
                )}
              </div>

              <div className={`rounded-lg border px-4 py-3 ${
                ltv > 75
                  ? "bg-red-50 border-red-200"
                  : ltv > 60
                  ? "bg-amber-50 border-amber-100"
                  : "bg-green-50 border-green-100"
              }`}>
                <p className={`text-xs font-medium uppercase tracking-wide mb-1 ${
                  ltv > 75 ? "text-red-600" : ltv > 60 ? "text-amber-600" : "text-green-600"
                }`}>
                  Loan-to-Value (LTV)
                </p>
                <p className={`text-lg font-bold ${
                  ltv > 75 ? "text-red-800" : ltv > 60 ? "text-amber-800" : "text-green-800"
                }`}>
                  {ltv.toFixed(1)}%
                </p>
                <p className={`text-xs mt-0.5 ${
                  ltv > 75 ? "text-red-500" : ltv > 60 ? "text-amber-500" : "text-green-500"
                }`}>
                  {ltv > 75 ? "⚠ High risk" : ltv > 60 ? "Moderate" : "Safe range"}
                </p>
              </div>

              {loan.durationMonths && loanAmountNum > 0 && interestRateNum > 0 && (
                <>
                  <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3">
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">
                      Est. Interest
                    </p>
                    <p className="text-lg font-bold text-gray-800">
                      ₹{estimatedInterest.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      over {loan.durationMonths} months
                    </p>
                  </div>

                  <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3">
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">
                      Total Repayment
                    </p>
                    <p className="text-lg font-bold text-gray-800">
                      ₹{totalRepayment.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">Principal + interest</p>
                  </div>
                </>
              )}

            </CardContent>
          </Card>
        )}

        {/* ── Photo ─────────────────────────────────────────────── */}
        <Card>
          <CardHeader><CardTitle>Pledge Photo</CardTitle></CardHeader>
          <CardContent>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />
            {imagePreview ? (
              <div className="relative w-40 h-40">
                <img
                  src={imagePreview}
                  alt="Item preview"
                  className="w-full h-full object-cover rounded-lg border"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-0.5"
                  aria-label="Remove image"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center w-40 h-40 border-2 border-dashed rounded-lg text-muted-foreground hover:border-primary hover:text-primary transition-colors"
              >
                <ImageIcon className="w-8 h-8 mb-2" />
                <span className="text-xs">Upload photo</span>
              </button>
            )}
          </CardContent>
        </Card>

        {/* ── Remarks ───────────────────────────────────────────── */}
        <Card>
          <CardHeader><CardTitle>Remarks</CardTitle></CardHeader>
          <CardContent>
            <Textarea
              placeholder="Any additional notes…"
              value={loan.remark}
              onChange={(e) => updateLoan("remark", e.target.value)}
              rows={3}
            />
          </CardContent>
        </Card>

        {/* ── Error — only after first submit attempt ───────────── */}
        {(error || (submitted && !isValid)) && (
          <Alert variant="destructive">
            <AlertDescription>
              {error || validationError}
            </AlertDescription>
          </Alert>
        )}

        {/* ── Actions ───────────────────────────────────────────── */}
        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={loading || (submitted && !isValid)}
            className="flex-1 sm:flex-none"
          >
            {loading
              ? <><Loader2 className="animate-spin mr-2 w-4 h-4" />Saving…</>
              : "Save Pledge"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => router.back()}
          >
            Cancel
          </Button>
        </div>

      </form>
    </div>
  );
}