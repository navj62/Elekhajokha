"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Loader2, X, ImageIcon } from "lucide-react";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";

/* ---------- Schema-aligned constants ---------- */
// matches: enum ItemType { GOLD SILVER }
const ITEM_TYPES = [
  { value: "GOLD",   label: "Gold"   },
  { value: "SILVER", label: "Silver" },
];

// matches: enum CompoundingDuration { MONTHLY QUARTERLY YEARLY }
const COMPOUNDING_OPTIONS = [
  { value: "MONTHLY",   label: "Monthly"   },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "YEARLY",    label: "Yearly"    },
];

interface Customer {
  id: string;
  name: string;
  address: string;
}

/* ------------------------------------------------------------------ */
export default function AddPledgePage() {
  const params     = useParams<{ customerId: string }>();
  const customerId = params?.customerId;
  const router     = useRouter();

  /* --- Customer --- */
  const [customer, setCustomer]           = useState<Customer | null>(null);
  const [customerLoading, setCustomerLoading] = useState(true);

  useEffect(() => {
    if (!customerId) return;
    fetch(`/api/customers/${customerId}`)
      .then((r) => r.json())
      .then((data) => setCustomer(data.customer))
      .catch(() => {})
      .finally(() => setCustomerLoading(false));
  }, [customerId]);

  /* --- Form --- */
  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    pledgeDate:           today,
    loanAmount:           "",
    itemType:             "GOLD",
    itemName:             "",
    grossWeight:          "",
    netWeight:            "",
    purity:               "",
    interestRate:         "",
    compoundingDuration:  "MONTHLY",
    remark:               "",
  });

  const [imageFile,    setImageFile]    = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const update = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  /* --- Image --- */
  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Please upload a valid image file"); return; }
    if (file.size > 5 * 1024 * 1024)    { setError("Image must be smaller than 5 MB");  return; }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setError("");
  }

  function removeImage() {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  /* --- Submit --- */
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (Number(form.netWeight) > Number(form.grossWeight)) {
      setError("Net weight cannot exceed gross weight");
      return;
    }
    if (Number(form.purity) <= 0 || Number(form.purity) > 100) {
      setError("Purity must be between 1 and 100");
      return;
    }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("customerId", customerId ?? "");

      // Append all text fields — keys match exact API field names
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));

      // Image under the key "itemPhoto" (matches schema field name)
      if (imageFile) fd.append("itemPhoto", imageFile);

      const res = await fetch("/api/pledges", { method: "POST", body: fd });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save pledge");
      }

      router.push(customerId ? `/customers/${customerId}` : "/customers");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  /* ---------------------------------------------------------------- */
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <Link
          href={customerId ? `/customers/${customerId}` : "/customers"}
          className="text-sm text-gray-500 hover:underline"
        >
          ← Back to Customer
        </Link>
        <h1 className="text-2xl font-bold mt-2">Add Pledge</h1>
        <p className="text-sm text-gray-500">Create a new pledge entry for this customer.</p>
      </div>

      <form onSubmit={submit} className="space-y-5">
        {/* Customer Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Customer Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <ReadField label="Customer Name"
              value={customerLoading ? "Loading…" : customer?.name ?? "—"} />
            <ReadField label="Address"
              value={customerLoading ? "Loading…" : customer?.address ?? "—"} />
          </CardContent>
        </Card>

        {/* Loan Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Loan Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField label="Pledge Date" required>
              <Input
                type="date"
                defaultValue={today}
                onChange={(e) => update("pledgeDate", e.target.value)}
                required
              />
            </FormField>

            <FormField label="Loan Amount (₹)" required>
              <Input
                type="number" min="0" step="0.01"
                placeholder="e.g. 50000"
                onChange={(e) => update("loanAmount", e.target.value)}
                required
              />
            </FormField>

            <FormField label="Interest Rate (% p.a.)" required>
              <Input
                type="number" min="0" step="0.01"
                placeholder="e.g. 12"
                onChange={(e) => update("interestRate", e.target.value)}
                required
              />
            </FormField>

            <FormField label="Compounding Duration" required>
              <select
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm bg-background"
                value={form.compoundingDuration}
                onChange={(e) => update("compoundingDuration", e.target.value)}
              >
                {COMPOUNDING_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </FormField>
          </CardContent>
        </Card>

        {/* Item Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Item Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Item Type pill radio */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Item Type <span className="text-red-500">*</span>
              </Label>
              <div className="flex gap-3 flex-wrap">
                {ITEM_TYPES.map((t) => (
                  <label
                    key={t.value}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md border cursor-pointer text-sm transition-colors ${
                      form.itemType === t.value
                        ? "border-black bg-black text-white"
                        : "border-gray-200 hover:border-gray-400"
                    }`}
                  >
                    <input
                      type="radio" name="itemType" value={t.value}
                      checked={form.itemType === t.value}
                      onChange={(e) => update("itemType", e.target.value)}
                      className="sr-only"
                    />
                    {t.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Item Name" required>
                <Input
                  placeholder="e.g. Gold Necklace"
                  onChange={(e) => update("itemName", e.target.value)}
                  required
                />
              </FormField>

              <FormField label="Purity (%)" required>
                <Input
                  type="number" min="0.01" max="100" step="0.01"
                  placeholder="e.g. 91.6"
                  onChange={(e) => update("purity", e.target.value)}
                  required
                />
              </FormField>

              <FormField label="Gross Weight (g)" required>
                <Input
                  type="number" min="0" step="0.001"
                  placeholder="e.g. 12.500"
                  onChange={(e) => update("grossWeight", e.target.value)}
                  required
                />
              </FormField>

              <FormField label="Net Weight (g)" required>
                <Input
                  type="number" min="0" step="0.001"
                  placeholder="e.g. 11.200"
                  onChange={(e) => update("netWeight", e.target.value)}
                  required
                />
              </FormField>
            </div>
          </CardContent>
        </Card>

        {/* Image Upload */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Item Photo</CardTitle>
          </CardHeader>
          <CardContent>
            {imagePreview ? (
              <div className="relative w-fit">
                <img
                  src={imagePreview} alt="Item preview"
                  className="h-48 rounded-md object-cover border"
                />
                <button
                  type="button" onClick={removeImage}
                  className="absolute -top-2 -right-2 bg-black text-white rounded-full p-0.5 hover:opacity-80"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-md p-8 cursor-pointer hover:border-gray-400 transition-colors">
                <ImageIcon size={28} className="text-gray-400" />
                <span className="text-sm text-gray-500">Click to upload a photo of the item</span>
                <span className="text-xs text-gray-400">PNG, JPG up to 5 MB</span>
                <input
                  ref={fileInputRef} type="file" accept="image/*" hidden
                  onChange={handleImageChange}
                />
              </label>
            )}
          </CardContent>
        </Card>

        {/* Remark */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Remark</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Any additional notes…"
              rows={3}
              onChange={(e) => update("remark", e.target.value)}
            />
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={loading} className="flex-1 sm:flex-none sm:px-10">
            {loading ? <Loader2 className="animate-spin" /> : "Save Pledge"}
          </Button>
          <Button
            type="button" variant="outline"
            onClick={() => router.push(customerId ? `/customers/${customerId}` : "/customers")}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

/* ---------- Helpers ---------- */
function ReadField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-sm font-medium text-gray-500">{label}</Label>
      <p className="text-sm font-medium py-2 px-3 rounded-md bg-gray-50 border min-h-[38px]">
        {value}
      </p>
    </div>
  );
}

function FormField({ label, required, children }: {
  label: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-sm font-medium">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}