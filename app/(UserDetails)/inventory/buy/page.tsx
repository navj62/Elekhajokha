"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronDown,
  Loader2,
  Package,
  X,
} from "lucide-react";
import SubscriptionGuard from "@/components/SubscriptionGuard";
import MetalRateStrip from "@/components/inventory/MetalRateStrip";

interface ItemType {
  id: string;
  label: string;
  isDefault: boolean;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

const inputCls =
  "w-full px-3 py-2 rounded-[10px] text-[13px] outline-none focus:ring-2 focus:ring-[#A2AB89]";
const inputStyle = {
  backgroundColor: "var(--main-bg)",
  border: "1px solid var(--border-light)",
  color: "var(--text-primary)",
} as React.CSSProperties;

const labelCls = "block text-[12px] font-semibold mb-1";

export default function BuyItemPage() {
  const router = useRouter();

  const [itemTypes, setItemTypes] = useState<{ defaults: ItemType[]; custom: ItemType[] }>({
    defaults: [],
    custom: [],
  });

  const [form, setForm] = useState({
    description:  "",
    itemType:     "",
    metalType:    "Gold",
    purity:       "",
    weightGrams:  "",
    acquiredCost: "",
    acquiredAt:   todayISO(),
    sellerName:   "",
    sellerIdNum:  "",
    notes:        "",
  });

  const [photoFile, setPhotoFile]     = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting]   = useState(false);
  const [errors, setErrors]           = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/item-types")
      .then((r) => r.json())
      .then((d) => { if (d.defaults) setItemTypes(d); })
      .catch(() => {});
  }, []);

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => { const n = { ...e }; delete n[key]; return n; });
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setErrors((e) => ({ ...e, photo: "Photo must be under 5 MB." }));
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setErrors((e) => { const n = { ...e }; delete n.photo; return n; });
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!form.description.trim())          next.description  = "Description is required.";
    if (!form.itemType)                    next.itemType     = "Item type is required.";
    if (!form.metalType)                   next.metalType    = "Metal type is required.";
    const wg = Number(form.weightGrams);
    if (!form.weightGrams || isNaN(wg) || wg <= 0)
                                           next.weightGrams  = "Weight must be > 0.";
    const ac = Number(form.acquiredCost);
    if (form.acquiredCost === "" || isNaN(ac) || ac < 0)
                                           next.acquiredCost = "Purchase price must be ≥ 0.";
    if (!form.acquiredAt)                  next.acquiredAt   = "Date acquired is required.";
    if (form.acquiredAt > todayISO())      next.acquiredAt   = "Date cannot be in the future.";
    if (!form.sellerName.trim())           next.sellerName   = "Seller name is required.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGlobalError(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("description",  form.description.trim());
      fd.append("itemType",     form.itemType);
      fd.append("metalType",    form.metalType);
      if (form.purity) fd.append("purity", form.purity);
      fd.append("weightGrams",  form.weightGrams);
      fd.append("acquiredCost", form.acquiredCost);
      fd.append("acquiredAt",   form.acquiredAt);
      fd.append("sellerName",   form.sellerName.trim());
      if (form.sellerIdNum.trim()) fd.append("sellerIdNum", form.sellerIdNum.trim());
      if (form.notes.trim())       fd.append("notes",       form.notes.trim());
      if (photoFile)               fd.append("photo",       photoFile);

      const res  = await fetch("/api/inventory", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setGlobalError(data?.message ?? data?.error ?? "Failed to record purchase.");
        return;
      }
      router.push(`/inventory/${data.item.id}/receipt`);
    } catch {
      setGlobalError("Unexpected error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SubscriptionGuard>
      <div className="py-6 max-w-[680px] mx-auto space-y-6">

        {/* Back + title */}
        <div>
          <Link
            href="/inventory"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium mb-4 hover:opacity-70 transition-opacity"
            style={{ color: "var(--text-secondary)" }}
          >
            <ArrowLeft size={15} />
            Back to Inventory
          </Link>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
            Buy New Item
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
            Record a direct purchase, no pledge involved.
          </p>
          <div className="mt-2">
            <MetalRateStrip variant="full" />
          </div>
        </div>

        {/* Form card */}
        <div
          className="rounded-[18px] p-7 space-y-5"
          style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border-light)" }}
        >
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Description */}
            <div>
              <label className={labelCls} style={{ color: "var(--text-secondary)" }}>
                Description *
              </label>
              <input
                type="text"
                maxLength={200}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="e.g. Gold necklace with pendant"
                className={inputCls}
                style={inputStyle}
              />
              {errors.description && <p className="text-[11.5px] mt-1 text-red-600">{errors.description}</p>}
            </div>

            {/* Item Type + Metal Type */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls} style={{ color: "var(--text-secondary)" }}>
                  Item Type *
                </label>
                <div className="relative">
                  <select
                    value={form.itemType}
                    onChange={(e) => set("itemType", e.target.value)}
                    className={`${inputCls} appearance-none`}
                    style={inputStyle}
                  >
                    <option value="">Select type</option>
                    {itemTypes.defaults.length > 0 && (
                      <optgroup label="Standard Types">
                        {itemTypes.defaults.map((t) => (
                          <option key={t.id} value={t.label}>{t.label}</option>
                        ))}
                      </optgroup>
                    )}
                    {itemTypes.custom.length > 0 && (
                      <optgroup label="Custom Types">
                        {itemTypes.custom.map((t) => (
                          <option key={t.id} value={t.label}>{t.label}</option>
                        ))}
                      </optgroup>
                    )}
                    {itemTypes.defaults.length === 0 && itemTypes.custom.length === 0 && (
                      <option value="Other">Other</option>
                    )}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-muted)" }} />
                </div>
                {errors.itemType && <p className="text-[11.5px] mt-1 text-red-600">{errors.itemType}</p>}
              </div>

              <div>
                <label className={labelCls} style={{ color: "var(--text-secondary)" }}>
                  Metal Type *
                </label>
                <div className="relative">
                  <select
                    value={form.metalType}
                    onChange={(e) => set("metalType", e.target.value)}
                    className={`${inputCls} appearance-none`}
                    style={inputStyle}
                  >
                    <option value="Gold">Gold</option>
                    <option value="Silver">Silver</option>
                    <option value="Other">Other</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-muted)" }} />
                </div>
                {errors.metalType && <p className="text-[11.5px] mt-1 text-red-600">{errors.metalType}</p>}
              </div>
            </div>

            {/* Purity + Weight */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls} style={{ color: "var(--text-secondary)" }}>
                  Purity (optional)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="any"
                  value={form.purity}
                  onChange={(e) => set("purity", e.target.value)}
                  placeholder="e.g. 91.67"
                  className={inputCls}
                  style={inputStyle}
                />
              </div>

              <div>
                <label className={labelCls} style={{ color: "var(--text-secondary)" }}>
                  Weight (grams) *
                </label>
                <input
                  type="number"
                  min="0.001"
                  step="any"
                  value={form.weightGrams}
                  onChange={(e) => set("weightGrams", e.target.value)}
                  placeholder="e.g. 12.5"
                  className={inputCls}
                  style={inputStyle}
                />
                {errors.weightGrams && <p className="text-[11.5px] mt-1 text-red-600">{errors.weightGrams}</p>}
              </div>
            </div>

            {/* Purchase Price + Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls} style={{ color: "var(--text-secondary)" }}>
                  Purchase Price (₹) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={form.acquiredCost}
                  onChange={(e) => set("acquiredCost", e.target.value)}
                  placeholder="e.g. 45000"
                  className={inputCls}
                  style={inputStyle}
                />
                {errors.acquiredCost && <p className="text-[11.5px] mt-1 text-red-600">{errors.acquiredCost}</p>}
              </div>

              <div>
                <label className={labelCls} style={{ color: "var(--text-secondary)" }}>
                  Date Acquired *
                </label>
                <input
                  type="date"
                  max={todayISO()}
                  value={form.acquiredAt}
                  onChange={(e) => set("acquiredAt", e.target.value)}
                  className={inputCls}
                  style={inputStyle}
                />
                {errors.acquiredAt && <p className="text-[11.5px] mt-1 text-red-600">{errors.acquiredAt}</p>}
              </div>
            </div>

            {/* Seller Name + ID */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls} style={{ color: "var(--text-secondary)" }}>
                  Seller Name *
                </label>
                <input
                  type="text"
                  value={form.sellerName}
                  onChange={(e) => set("sellerName", e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className={inputCls}
                  style={inputStyle}
                />
                {errors.sellerName && <p className="text-[11.5px] mt-1 text-red-600">{errors.sellerName}</p>}
              </div>

              <div>
                <label className={labelCls} style={{ color: "var(--text-secondary)" }}>
                  Seller ID Number (optional)
                </label>
                <input
                  type="text"
                  value={form.sellerIdNum}
                  onChange={(e) => set("sellerIdNum", e.target.value)}
                  placeholder="PAN / Aadhaar"
                  className={inputCls}
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Photo */}
            <div>
              <label className={labelCls} style={{ color: "var(--text-secondary)" }}>
                Photo (optional, max 5 MB)
              </label>
              <div
                className="flex items-center gap-3 px-3 py-2.5 rounded-[10px] cursor-pointer"
                style={{
                  backgroundColor: "var(--main-bg)",
                  border: "1px dashed var(--border-light)",
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                {photoPreview ? (
                  <img src={photoPreview} alt="preview" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                ) : (
                  <div
                    className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center"
                    style={{ backgroundColor: "var(--border-light)" }}
                  >
                    <Package size={16} style={{ color: "var(--text-muted)" }} />
                  </div>
                )}
                <span className="text-[12.5px]" style={{ color: "var(--text-secondary)" }}>
                  {photoFile ? photoFile.name : "Click to upload JPEG / PNG / WEBP"}
                </span>
                {photoFile && (
                  <button
                    type="button"
                    className="ml-auto p-1 rounded-full hover:bg-[#EAE9DF]"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPhotoFile(null);
                      setPhotoPreview(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  >
                    <X size={13} style={{ color: "var(--text-muted)" }} />
                  </button>
                )}
              </div>
              {errors.photo && <p className="text-[11.5px] mt-1 text-red-600">{errors.photo}</p>}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handlePhotoChange}
              />
            </div>

            {/* Notes */}
            <div>
              <label className={labelCls} style={{ color: "var(--text-secondary)" }}>
                Notes (optional)
              </label>
              <textarea
                maxLength={500}
                rows={3}
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Any additional details"
                className="w-full px-3 py-2 rounded-[10px] text-[13px] outline-none resize-none focus:ring-2 focus:ring-[#A2AB89]"
                style={inputStyle}
              />
            </div>

            {globalError && (
              <div
                className="px-3 py-2 rounded-[10px] text-[12.5px]"
                style={{ backgroundColor: "#FEE2E2", color: "#B91C1C" }}
              >
                {globalError}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-[10px] text-[14px] font-semibold text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
              style={{ backgroundColor: "#565C3F" }}
            >
              {submitting && <Loader2 size={15} className="animate-spin" />}
              {submitting ? "Recording…" : "Record Purchase"}
            </button>
          </form>
        </div>
      </div>
    </SubscriptionGuard>
  );
}
