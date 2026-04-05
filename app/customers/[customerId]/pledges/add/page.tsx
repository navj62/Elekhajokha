"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Loader2, X, ImageIcon } from "lucide-react";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Input }               from "@/components/ui/input";
import { Button }              from "@/components/ui/button";
import { Label }               from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea }            from "@/components/ui/textarea";

/* ---------- Schema-aligned constants ---------- */
const ITEM_TYPES = [
  { value: "GOLD",   label: "Gold"   },
  { value: "SILVER", label: "Silver" },
];

const COMPOUNDING_OPTIONS = [
  { value: "MONTHLY",   label: "Monthly"   },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "YEARLY",    label: "Yearly"    },
];

interface Customer {
  id:      string;
  name:    string;
  address: string;
}

/* ------------------------------------------------------------------ */
export default function AddPledgePage() {
  const params     = useParams<{ customerId: string }>();
  const customerId = params?.customerId;
  const router     = useRouter();

  /* Customer */
  const [customer, setCustomer]           = useState<Customer | null>(null);
  const [customerLoading, setCustomerLoading] = useState(true);

  useEffect(() => {
    if (!customerId) return;
    fetch(`/api/customers/${customerId}`)
      .then((r) => r.json())
      .then(setCustomer)
      .catch(() => {})
      .finally(() => setCustomerLoading(false));
  }, [customerId]);

  /* Form state — all controlled */
  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    pledgeDate:          today,
    loanAmount:          "",
    itemType:            "GOLD",
    itemName:            "",
    grossWeight:         "",
    netWeight:           "",
    purity:              "",
    interestRate:        "",
    compoundingDuration: "MONTHLY",
    remark:              "",
  });

  const update = (k: string, v: string) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  /* ✅ Derived — no useState/useEffect needed, zero extra renders */
  const nw = parseFloat(form.netWeight);
  const pu = parseFloat(form.purity);
  const netWeightOfMetal =
    nw > 0 && pu > 0 && !isNaN(nw) && !isNaN(pu)
      ? (nw * (pu / 100)).toFixed(3)
      : "";

  /* Image */
  const [imageFile,    setImageFile]    = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* UI state */
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  /* ----------------------------------------------------------------
   * Handlers
   * ---------------------------------------------------------------- */
  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please upload a valid image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be smaller than 5 MB");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setError("");
  }

  function removeImage() {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    /* ── Validations ── */
    if (Number(form.grossWeight) <= 0) {
      setError("Gross weight must be greater than 0");
      return;
    }
    if (Number(form.netWeight) <= 0) {
      setError("Net weight must be greater than 0");
      return;
    }
    if (Number(form.netWeight) > Number(form.grossWeight)) {
      setError("Net weight cannot exceed gross weight");
      return;
    }
    if (Number(form.purity) <= 0 || Number(form.purity) > 100) {
      setError("Purity must be between 1 and 100");
      return;
    }
    if (!netWeightOfMetal) {
      setError("Net metal weight could not be calculated — check purity and net weight");
      return;
    }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("customerId", customerId ?? "");

      Object.entries(form).forEach(([k, v]) => fd.append(k, v));

      /* Send computed net metal weight to backend */
      fd.append("netWeightOfMetal", netWeightOfMetal);

      if (imageFile) fd.append("itemPhoto", imageFile);

      const res = await fetch("/api/pledges", {
        method: "POST",
        body: fd,
      });

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

  /* ----------------------------------------------------------------
   * Render
   * ---------------------------------------------------------------- */
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">

      {/* Back link */}
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
          Customer: <span className="font-medium text-foreground">{customer.name}</span>
          {customer.address && ` · ${customer.address}`}
        </p>
      ) : null}

      <form onSubmit={submit} className="space-y-5">

        {/* ── Loan Details ── */}
        <Card>
          <CardHeader><CardTitle>Loan Details</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">

            <FormField label="Pledge Date" required>
              <Input
                type="date"
                value={form.pledgeDate}
                onChange={(e) => update("pledgeDate", e.target.value)}
                required
              />
            </FormField>

            <FormField label="Loan Amount (₹)" required>
              <Input
                type="number"
                min="1"
                step="0.01"
                placeholder="e.g. 50000"
                value={form.loanAmount}
                onChange={(e) => update("loanAmount", e.target.value)}
                required
              />
            </FormField>

            <FormField label="Interest Rate (%)" required>
              <Input
                type="number"
                min="0.01"
                max="100"
                step="0.01"
                placeholder="e.g. 12"
                value={form.interestRate}
                onChange={(e) => update("interestRate", e.target.value)}
                required
              />
            </FormField>

            <FormField label="Compounding" required>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={form.compoundingDuration}
                onChange={(e) => update("compoundingDuration", e.target.value)}
                required
              >
                {COMPOUNDING_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </FormField>

          </CardContent>
        </Card>

        {/* ── Item Details ── */}
        <Card>
          <CardHeader><CardTitle>Item Details</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">

            <FormField label="Item Type" required>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={form.itemType}
                onChange={(e) => update("itemType", e.target.value)}
                required
              >
                {ITEM_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </FormField>

            <FormField label="Item Name" required>
              <Input
                type="text"
                placeholder="e.g. Gold Necklace"
                value={form.itemName}
                onChange={(e) => update("itemName", e.target.value)}
                required
              />
            </FormField>

            <FormField label="Gross Weight (g)" required>
              <Input
                type="number"
                min="0.001"
                step="0.001"
                placeholder="e.g. 22.500"
                value={form.grossWeight}
                onChange={(e) => update("grossWeight", e.target.value)}
                required
              />
            </FormField>

            <FormField label="Net Weight (g)" required>
              <Input
                type="number"
                min="0.001"
                step="0.001"
                placeholder="e.g. 20.000"
                value={form.netWeight}
                onChange={(e) => update("netWeight", e.target.value)}
                required
              />
            </FormField>

            <FormField label="Purity (%)" required>
              <Input
                type="number"
                min="0.01"
                max="100"
                step="0.01"
                placeholder="e.g. 91.6"
                value={form.purity}
                onChange={(e) => update("purity", e.target.value)}
                required
              />
            </FormField>

            {/* ✅ Auto-calculated — derived from netWeight × (purity / 100) */}
            <FormField
              label="Net Metal Weight (g)"
              hint="Auto-calculated · Net Weight × (Purity ÷ 100)"
            >
              <Input
                type="number"
                value={netWeightOfMetal}
                readOnly
                placeholder="Fill purity & net weight"
                className="bg-muted cursor-not-allowed text-muted-foreground font-medium"
              />
            </FormField>

          </CardContent>
        </Card>

        {/* ── Photo ── */}
        <Card>
          <CardHeader><CardTitle>Item Photo</CardTitle></CardHeader>
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
                  alt="Preview"
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

        {/* ── Remarks ── */}
        <Card>
          <CardHeader><CardTitle>Remarks</CardTitle></CardHeader>
          <CardContent>
            <Textarea
              placeholder="Any additional notes…"
              value={form.remark}
              onChange={(e) => update("remark", e.target.value)}
              rows={3}
            />
          </CardContent>
        </Card>

        {/* ── Error ── */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* ── Actions ── */}
        <div className="flex gap-3">
          <Button type="submit" disabled={loading} className="flex-1 sm:flex-none">
            {loading
              ? <><Loader2 className="animate-spin mr-2 w-4 h-4" /> Saving…</>
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

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

function FormField({
  label,
  hint,
  required,
  children,
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
      {hint && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}