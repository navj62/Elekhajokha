"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronDown,
  Loader2,
  UploadCloud,
  X,
  AlertCircle,
} from "lucide-react";
import SubscriptionGuard from "@/components/SubscriptionGuard";
import { ThemedDatePicker } from "@/components/ui/ThemedDatePicker";
import { ThemedSelect } from "@/components/ui/ThemedSelect";
import MetalRateStrip from "@/components/inventory/MetalRateStrip";

interface ItemType {
  id: string;
  label: string;
  isDefault: boolean;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// Styling tokens matching prompt specs exactly: height 48px, 15px regular, focus ring
const inputCls =
  "w-full h-[48px] px-3.5 rounded-[12px] text-[15px] font-normal text-[var(--foreground)] bg-[#FAFAF7] border border-[#EAE9DF] outline-none focus:ring-2 focus:ring-[#A2AB89] focus:bg-white transition-all";

const labelCls = "block text-[14px] font-medium text-[var(--muted-foreground)] mb-1.5";

export default function BuyItemPage() {
  const router = useRouter();

  const [itemTypes, setItemTypes] = useState<{ defaults: ItemType[]; custom: ItemType[] }>({
    defaults: [],
    custom: [],
  });

  const [form, setForm] = useState({
    description: "",
    itemType: "",
    metalType: "Gold",
    purity: "",
    weightGrams: "",
    acquiredCost: "",
    acquiredAt: todayISO(),
    sellerName: "",
    sellerIdNum: "",
    notes: "",
  });

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/item-types")
      .then((r) => r.json())
      .then((d) => {
        if (d.defaults) setItemTypes(d);
      })
      .catch(() => { });
  }, []);

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => {
      const n = { ...e };
      delete n[key];
      return n;
    });
  }

  function handleFileSelection(file: File | null) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setErrors((e) => ({ ...e, photo: "Photo must be under 5 MB." }));
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setErrors((e) => {
      const n = { ...e };
      delete n.photo;
      return n;
    });
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    handleFileSelection(e.target.files?.[0] ?? null);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0] ?? null;
    if (file && file.type.startsWith("image/")) {
      handleFileSelection(file);
    }
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!form.description.trim()) next.description = "Description is required.";
    if (!form.itemType) next.itemType = "Item type is required.";
    if (!form.metalType) next.metalType = "Metal type is required.";
    const wg = Number(form.weightGrams);
    if (!form.weightGrams || isNaN(wg) || wg <= 0)
      next.weightGrams = "Weight must be greater than 0.";
    const ac = Number(form.acquiredCost);
    if (form.acquiredCost === "" || isNaN(ac) || ac < 0)
      next.acquiredCost = "Purchase price must be ≥ 0.";
    if (!form.acquiredAt) next.acquiredAt = "Date acquired is required.";
    if (form.acquiredAt > todayISO()) next.acquiredAt = "Date cannot be in the future.";
    if (!form.sellerName.trim()) next.sellerName = "Seller name is required.";
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
      fd.append("description", form.description.trim());
      fd.append("itemType", form.itemType);
      fd.append("metalType", form.metalType);
      if (form.purity) fd.append("purity", form.purity);
      fd.append("grossWeight", form.weightGrams);
      fd.append("acquiredCost", form.acquiredCost);
      fd.append("acquiredAt", form.acquiredAt);
      fd.append("sellerName", form.sellerName.trim());
      if (form.sellerIdNum.trim()) fd.append("sellerIdNum", form.sellerIdNum.trim());
      if (form.notes.trim()) fd.append("notes", form.notes.trim());
      if (photoFile) fd.append("photo", photoFile);

      const res = await fetch("/api/inventory", { method: "POST", body: fd });
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
      <div className="min-h-screen bg-[#F7F5EF] py-8 px-4 sm:px-6">
        <div className="max-w-[1140px] mx-auto space-y-7">

          {/* Header Section */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Link
                href="/inventory"
                className="flex items-center justify-center w-9 h-9 bg-[#E3E5C3] border border-[#ECEAE4] rounded-full shadow-sm text-[#2C2C2C] hover:bg-[#F5F4EF] transition-colors shrink-0 cursor-pointer"
                title="Back to Inventory"
              >
                <ArrowLeft size={18} className="text-[#5E6442]" strokeWidth={2.2} />
              </Link>
              <span className="text-[14px] font-medium text-[var(--muted-foreground)]">Back to Inventory</span>
            </div>

            <h1 className="text-[36px] font-semibold leading-tight text-[var(--foreground)]">
              Buy New Item
            </h1>
            <p className="text-[15px] text-[var(--muted-foreground-subtle)] mt-1">
              Record a direct purchase and add it into your live inventory.
            </p>

            <div className="mt-4">
              <MetalRateStrip variant="full" />
            </div>
          </div>

          {/* 2-Column Minimalist Layout (35% Left / 65% Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-[24px] items-stretch">

            {/* LEFT COLUMN (35% -> col-span-4): Single Vertical Card */}
            <div className="lg:col-span-4 flex">
              <div className="rounded-[20px] p-[24px] bg-[#FFFFFF] border border-[#EAE9DF] shadow-xs w-full flex flex-col justify-between space-y-[24px]">

                {/* Photo Upload Box (Large Square, Height 280px) */}
                <div className="shrink-0">
                  <label className={labelCls}>Photo Upload (optional)</label>
                  <div
                    onClick={() => !photoPreview && fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`h-[280px] w-full rounded-[16px] border-2 border-dashed transition-all relative overflow-hidden flex flex-col items-center justify-center text-center p-4 ${isDragging
                      ? "border-[#5E6442] bg-[#EAE9DF]/50"
                      : photoPreview
                        ? "border-[#5E6442] bg-[#FAFAF7]"
                        : "border-[#A2AB89] hover:border-[#5E6442] bg-[#FAFAF7] hover:bg-[#F5F4E7]/40 cursor-pointer"
                      }`}
                  >
                    {photoPreview ? (
                      <div className="relative w-full h-full flex items-center justify-center group">
                        <img
                          src={photoPreview}
                          alt="preview"
                          className="w-full h-full object-contain rounded-[12px]"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPhotoFile(null);
                            setPhotoPreview(null);
                            if (fileInputRef.current) fileInputRef.current.value = "";
                          }}
                          className="absolute top-3 right-3 p-2 rounded-full bg-white/90 hover:bg-white text-red-600 shadow-md transition-all cursor-pointer"
                          title="Remove image"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2 pointer-events-none">
                        <div className="w-14 h-14 rounded-full bg-[#EAE9DF]/70 mx-auto flex items-center justify-center">
                          <UploadCloud size={28} className="text-[#5E6442]" />
                        </div>
                        <p className="text-[15px] font-medium text-[var(--foreground)]">
                          Click or drag photo here
                        </p>
                        <p className="text-[13px] text-[var(--muted-foreground-subtle)]">
                          Supports JPEG, PNG, WEBP up to 5 MB
                        </p>
                      </div>
                    )}
                  </div>
                  {errors.photo && <p className="text-[13px] mt-1.5 text-red-600 font-medium">{errors.photo}</p>}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handlePhotoChange}
                  />
                </div>

                {/* Notes Textarea (Height 140px, expands to fill remaining card height) */}
                <div className="flex-1 flex flex-col">
                  <label className={labelCls}>Notes (optional)</label>
                  <textarea
                    maxLength={500}
                    value={form.notes}
                    onChange={(e) => set("notes", e.target.value)}
                    placeholder="Add any additional details or provenance..."
                    className="w-full flex-1 min-h-[140px] px-3.5 py-3 rounded-[12px] text-[15px] font-normal text-[var(--foreground)] bg-[#FAFAF7] border border-[#A2AB89] outline-none focus:ring-2 focus:ring-[#A2AB89] focus:bg-white transition-all resize-none placeholder:text-[var(--muted-foreground-subtle)]"
                  />
                </div>

              </div>
            </div>

            {/* RIGHT COLUMN (65% -> col-span-8): Single Form Card */}
            <div className="lg:col-span-8 flex">
              <div className="rounded-[20px] p-[24px] bg-[#FFFFFF] border border-[#EAE9DF] shadow-xs w-full">
                <form onSubmit={handleSubmit} className="space-y-6">

                  {/* Order 1: Description (full width) */}
                  <div>
                    <label className={labelCls}>Description *</label>
                    <input
                      type="text"
                      maxLength={200}
                      value={form.description}
                      onChange={(e) => set("description", e.target.value)}
                      placeholder="e.g. Gold necklace with temple pendant"
                      className={inputCls}
                    />
                    {errors.description && <p className="text-[13px] mt-1.5 text-red-600 font-medium">{errors.description}</p>}
                  </div>

                  {/* Order 2: Row -> Item Type | Metal Type */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className={labelCls}>Item Type *</label>
                      <ThemedSelect
                        value={form.itemType}
                        onChange={(val) => set("itemType", val)}
                        options={[
                          ...["Ring", "Pendant", "Chain", "Bracelet", "Coin", "Necklace", "Earrings", "Bangle"].map((t) => ({
                            value: t,
                            label: t,
                            group: "Standard Types",
                          })),
                          ...itemTypes.defaults.map((t) => ({
                            value: t.label,
                            label: t.label,
                            group: "Default Types",
                          })),
                          ...itemTypes.custom.map((t) => ({
                            value: t.label,
                            label: t.label,
                            group: "Custom Types",
                          })),
                          { value: "Other", label: "Other" },
                        ]}
                        placeholder="Select type"
                      />
                      {errors.itemType && <p className="text-[13px] mt-1.5 text-red-600 font-medium">{errors.itemType}</p>}
                    </div>

                    <div>
                      <label className={labelCls}>Metal Type *</label>
                      <ThemedSelect
                        value={form.metalType}
                        onChange={(val) => set("metalType", val)}
                        options={["Gold", "Silver", "Platinum", "Other"]}
                        placeholder="Select metal"
                      />
                      {errors.metalType && <p className="text-[13px] mt-1.5 text-red-600 font-medium">{errors.metalType}</p>}
                    </div>
                  </div>

                  {/* Order 3: Row -> Purity (optional) | Weight (grams) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className={labelCls}>Purity (optional)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="any"
                        value={form.purity}
                        onChange={(e) => set("purity", e.target.value)}
                        placeholder="e.g. 91.67 or 22"
                        className={inputCls}
                      />
                    </div>

                    <div>
                      <label className={labelCls}>Weight (grams) *</label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0.001"
                          step="any"
                          value={form.weightGrams}
                          onChange={(e) => set("weightGrams", e.target.value)}
                          placeholder="e.g. 12.500"
                          className={`${inputCls} pr-10`}
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[14px] font-medium text-[var(--muted-foreground-subtle)] pointer-events-none">
                          g
                        </span>
                      </div>
                      {errors.weightGrams && <p className="text-[13px] mt-1.5 text-red-600 font-medium">{errors.weightGrams}</p>}
                    </div>
                  </div>

                  {/* Order 4: Row -> Purchase Price | Date Acquired (using ThemedDatePicker) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className={labelCls}>Purchase Price (₹) *</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] font-medium text-[var(--muted-foreground-subtle)] pointer-events-none">
                          ₹
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={form.acquiredCost}
                          onChange={(e) => set("acquiredCost", e.target.value)}
                          placeholder="45000"
                          className={`${inputCls} pl-8`}
                        />
                      </div>
                      {errors.acquiredCost && <p className="text-[13px] mt-1.5 text-red-600 font-medium">{errors.acquiredCost}</p>}
                    </div>

                    <div>
                      <label className={labelCls}>Date Acquired *</label>
                      <div className="w-full">
                        <ThemedDatePicker
                          value={form.acquiredAt}
                          onChange={(val) => set("acquiredAt", val)}
                          placeholder="Select date"
                          className="h-[48px] px-3.5 rounded-[12px] bg-[#FAFAF7] border border-[#EAE9DF] text-[15px] font-normal text-[var(--foreground)] hover:border-[#8C8F7A] transition-all w-full"
                        />
                      </div>
                      {errors.acquiredAt && <p className="text-[13px] mt-1.5 text-red-600 font-medium">{errors.acquiredAt}</p>}
                    </div>
                  </div>

                  {/* Order 5: Row -> Seller Name | Seller ID Number */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className={labelCls}>Seller Name *</label>
                      <input
                        type="text"
                        value={form.sellerName}
                        onChange={(e) => set("sellerName", e.target.value)}
                        placeholder="e.g. Ramesh Kumar"
                        className={inputCls}
                      />
                      {errors.sellerName && <p className="text-[13px] mt-1.5 text-red-600 font-medium">{errors.sellerName}</p>}
                    </div>

                    <div>
                      <label className={labelCls}>Seller ID Number (optional)</label>
                      <input
                        type="text"
                        value={form.sellerIdNum}
                        onChange={(e) => set("sellerIdNum", e.target.value)}
                        placeholder="PAN / Aadhaar / Bill No."
                        className={inputCls}
                      />
                    </div>
                  </div>

                  {globalError && (
                    <div className="p-3.5 rounded-[12px] bg-red-50 border border-red-200 text-red-700 text-[14px] flex items-center gap-2">
                      <AlertCircle size={18} className="shrink-0" />
                      <span>{globalError}</span>
                    </div>
                  )}

                  {/* Order 6: Bottom action row -> Cancel | Record Purchase */}
                  <div className="pt-4 mt-6 border-t border-[#EAE9DF] sticky bottom-0 sm:static sm:border-t-0 sm:pt-0 sm:mt-8 bg-white py-3 sm:py-0 flex flex-col-reverse sm:flex-row sm:justify-end gap-3 z-10">
                    <Link href="/inventory" className="w-full sm:w-auto">
                      <button
                        type="button"
                        className="w-full sm:w-auto h-[48px] px-6 rounded-[12px] text-[15px] font-medium text-[var(--foreground)] bg-[#EAE9DF] hover:bg-[#dcdbd0] transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                    </Link>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full sm:w-auto h-[48px] px-7 rounded-[12px] text-[15px] font-medium text-white bg-[#5E6442] hover:bg-[#4d5236] shadow-sm hover:shadow transition-all disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {submitting && <Loader2 size={18} className="animate-spin" />}
                      {submitting ? "Recording…" : "Record Purchase"}
                    </button>
                  </div>

                </form>
              </div>
            </div>

          </div>

        </div>
      </div>
    </SubscriptionGuard>
  );
}
