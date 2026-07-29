"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Archive,
  Inbox,
  Plus,
  X,
  ChevronDown,
  Loader2,
  IndianRupee,
  Package,
  ShoppingBag,
  TrendingUp,
  Scale,
  Search,
  MoreVertical,
  Eye,
  User,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import SubscriptionGuard from "@/components/SubscriptionGuard";
import MetalRateStrip from "@/components/inventory/MetalRateStrip";

/* ================================================================== */
/*  Types                                                               */
/* ================================================================== */

interface SourcePledge {
  id: string;
  customerId: string;
  customer: { name: string };
}

interface InventoryItem {
  id: string;
  sourceType: "PLEDGE_SALE" | "DIRECT_PURCHASE";
  sourcePledgeId: string | null;
  description: string;
  itemType: string;
  metalType: string;
  purity: string | null;
  weightGrams: string;
  photoUrl: string | null;
  acquiredAt: string;
  acquiredCost: string;
  amountOwedAt: string | null;
  status: "IN_STOCK" | "SOLD";
  soldAt: string | null;
  soldPrice: string | null;
  buyerName: string | null;
  buyerMobile: string | null;
  saleNotes: string | null;
  notes: string | null;
  sourcePledge: SourcePledge | null;
}

interface Summary {
  totalInStock: number;
  totalSold: number;
  totalValueInStock: number;
  totalSoldRevenue: number;
}

/* ================================================================== */
/*  Helpers                                                             */
/* ================================================================== */

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function fmtINR(n: number) {
  return "₹" + n.toLocaleString("en-IN");
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/* ================================================================== */
/*  Sell Modal                                                          */
/* ================================================================== */

function SellModal({
  item,
  onClose,
  onSuccess,
}: {
  item: InventoryItem;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    soldPrice: "",
    soldAt: todayISO(),
    buyerName: "",
    buyerMobile: "",
    saleNotes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const soldPriceNum = Number(form.soldPrice);
  const acquiredCost = Number(item.acquiredCost);
  const profit = !isNaN(soldPriceNum) && form.soldPrice !== "" ? soldPriceNum - acquiredCost : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (isNaN(soldPriceNum) || soldPriceNum <= 0) {
      setError("Sale price must be > 0.");
      return;
    }
    if (!form.soldAt) {
      setError("Sale date is required.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/inventory/${item.id}/sell`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          soldPrice: soldPriceNum,
          soldAt: form.soldAt,
          buyerName: form.buyerName.trim() || null,
          buyerMobile: form.buyerMobile.trim() || null,
          saleNotes: form.saleNotes.trim() || null,
        }),
      });
      const data = await res.json();
      if (res.status === 409)
        throw new Error("This item was already sold.");
      if (!res.ok)
        throw new Error(data?.error ?? "Failed to record sale.");
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setSubmitting(false);
    }
  }

  const metalLabel = item.purity
    ? `${item.metalType} ${Number(item.purity).toFixed(0)}K`
    : item.metalType;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-[480px] rounded-[22px] p-7 shadow-2xl"
        style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-[#EAE9DF] transition-colors"
          style={{ color: "var(--muted-foreground)" }}
        >
          <X size={18} />
        </button>

        <h2 className="text-[18px] font-bold mb-1" style={{ color: "var(--foreground)" }}>
          Record Sale
        </h2>

        {/* Item summary */}
        <div
          className="flex items-center gap-3 p-3.5 rounded-[14px] mb-5 mt-3"
          style={{ backgroundColor: "var(--background)", border: "1px solid var(--border)" }}
        >
          {item.photoUrl ? (
            <img src={item.photoUrl} alt="" className="w-11 h-11 rounded-xl object-cover shrink-0 border border-black/5 shadow-sm" />
          ) : (
            <div
              className="w-11 h-11 rounded-xl shrink-0 flex items-center justify-center bg-[#F5F4E7] border border-[#EAE9DF] text-[#565C3F]"
            >
              <Package size={18} />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-[14px] font-semibold truncate" style={{ color: "var(--foreground)" }}>
              {item.description}
            </p>
            <p className="text-[12px] mt-0.5 font-medium" style={{ color: "var(--muted-foreground)" }}>
              {metalLabel} · {Number(item.weightGrams).toFixed(2)}g ·{" "}
              <span style={{ color: "var(--muted-foreground-subtle)" }}>
                Acquired for {acquiredCost === 0 ? "free (forfeited)" : fmtINR(acquiredCost)}
              </span>
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Sale Price */}
          <div>
            <label className="block text-[12px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--muted-foreground)" }}>
              Sale Price (₹) *
            </label>
            <input
              type="number"
              min="0.01"
              step="any"
              value={form.soldPrice}
              onChange={(e) => setForm((f) => ({ ...f, soldPrice: e.target.value }))}
              placeholder="e.g. 55000"
              className="w-full px-3.5 py-2.5 rounded-[12px] text-[13.5px] font-medium outline-none focus:ring-2 focus:ring-[#565C3F] transition-all"
              style={{
                backgroundColor: "var(--background)",
                border: "1px solid var(--border)",
                color: "var(--foreground)",
              }}
            />
          </div>

          {/* Live profit */}
          {profit !== null && (
            <div
              className="px-3.5 py-2.5 rounded-[12px] text-[13px] font-bold flex items-center justify-between"
              style={{
                backgroundColor: profit > 0 ? "#E8F0DC" : profit < 0 ? "#FEE2E2" : "var(--background)",
                color: profit > 0 ? "#4D6B2A" : profit < 0 ? "#991B1B" : "var(--muted-foreground)",
                border: `1px solid ${profit > 0 ? "#C8D9A8" : profit < 0 ? "#FECACA" : "var(--border)"}`,
              }}
            >
              <span>{profit > 0 ? "Estimated Profit" : profit < 0 ? "Estimated Loss" : "Break Even"}</span>
              <span>{profit > 0 ? `+${fmtINR(profit)}` : profit < 0 ? `-${fmtINR(Math.abs(profit))}` : "₹0"}</span>
            </div>
          )}

          {/* Sale Date */}
          <div>
            <label className="block text-[12px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--muted-foreground)" }}>
              Sale Date *
            </label>
            <input
              type="date"
              max={todayISO()}
              value={form.soldAt}
              onChange={(e) => setForm((f) => ({ ...f, soldAt: e.target.value }))}
              className="w-full px-3.5 py-2.5 rounded-[12px] text-[13.5px] font-medium outline-none focus:ring-2 focus:ring-[#565C3F] transition-all"
              style={{
                backgroundColor: "var(--background)",
                border: "1px solid var(--border)",
                color: "var(--foreground)",
              }}
            />
          </div>

          {/* Buyer Name + Mobile */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--muted-foreground)" }}>
                Buyer Name (opt)
              </label>
              <input
                type="text"
                value={form.buyerName}
                onChange={(e) => setForm((f) => ({ ...f, buyerName: e.target.value }))}
                placeholder="e.g. Sunita Devi"
                className="w-full px-3.5 py-2.5 rounded-[12px] text-[13.5px] font-medium outline-none focus:ring-2 focus:ring-[#565C3F] transition-all"
                style={{
                  backgroundColor: "var(--background)",
                  border: "1px solid var(--border)",
                  color: "var(--foreground)",
                }}
              />
            </div>

            <div>
              <label className="block text-[12px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--muted-foreground)" }}>
                Buyer Mobile (opt)
              </label>
              <input
                type="text"
                value={form.buyerMobile}
                onChange={(e) => setForm((f) => ({ ...f, buyerMobile: e.target.value }))}
                placeholder="e.g. 9876543210"
                className="w-full px-3.5 py-2.5 rounded-[12px] text-[13.5px] font-medium outline-none focus:ring-2 focus:ring-[#565C3F] transition-all"
                style={{
                  backgroundColor: "var(--background)",
                  border: "1px solid var(--border)",
                  color: "var(--foreground)",
                }}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[12px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--muted-foreground)" }}>
              Notes (optional)
            </label>
            <textarea
              rows={2}
              value={form.saleNotes}
              onChange={(e) => setForm((f) => ({ ...f, saleNotes: e.target.value }))}
              placeholder="Any sale details"
              className="w-full px-3.5 py-2.5 rounded-[12px] text-[13.5px] font-medium outline-none resize-none focus:ring-2 focus:ring-[#565C3F] transition-all"
              style={{
                backgroundColor: "var(--background)",
                border: "1px solid var(--border)",
                color: "var(--foreground)",
              }}
            />
          </div>

          {error && (
            <div
              className="px-3.5 py-2.5 rounded-[12px] text-[13px] font-semibold bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA]"
            >
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-[12px] text-[13.5px] font-semibold transition-colors bg-[#FAFAF7] border border-[#EAE9DF] text-[var(--muted-foreground)] hover:bg-[#EAE9DF]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 rounded-[12px] text-[13.5px] font-semibold text-white flex items-center justify-center gap-2 transition-all bg-[#565C3F] hover:bg-[#464b33] disabled:opacity-60 shadow-sm"
            >
              {submitting && <Loader2 size={15} className="animate-spin" />}
              {submitting ? "Recording…" : "Record Sale"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Item Details Modal (Row Click)                                      */
/* ================================================================== */

function ItemDetailsModal({
  item,
  onClose,
  onSell,
}: {
  item: InventoryItem;
  onClose: () => void;
  onSell: (item: InventoryItem) => void;
}) {
  const acquiredCost = Number(item.acquiredCost);
  const amountOwedAt = item.amountOwedAt !== null ? Number(item.amountOwedAt) : null;
  const net = amountOwedAt !== null ? amountOwedAt - acquiredCost : null;
  const metalLabel = item.purity ? `${item.metalType} ${Number(item.purity).toFixed(0)}K` : item.metalType;
  const displayId = item.id.startsWith("INV-") ? item.id : `INV-${item.id.slice(-4).toUpperCase()}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-[580px] rounded-[24px] p-7 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-[#EAE9DF] shrink-0">
          <div className="flex items-center gap-3.5">
            {item.photoUrl ? (
              <img src={item.photoUrl} alt="" className="w-14 h-14 rounded-[14px] object-cover border border-black/5 shadow-sm" />
            ) : (
              <div className="w-14 h-14 rounded-[14px] flex items-center justify-center bg-[#F5F4E7] border border-[#EAE9DF] text-[#565C3F]">
                <Package size={24} />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-[19px] font-bold text-[var(--foreground)]">{item.description}</h2>
                <span className="px-2 py-0.5 rounded-[6px] text-[11px] font-bold uppercase tracking-wider bg-[#F5F4E7] text-[#565C3F] border border-[#EAE9DF]">
                  {displayId}
                </span>
              </div>
              <p className="text-[13px] text-[var(--muted-foreground)] mt-0.5 font-medium">
                {item.itemType} · {metalLabel} · {Number(item.weightGrams).toFixed(2)}g
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[#EAE9DF] text-[var(--muted-foreground)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="py-5 space-y-5 overflow-y-auto pr-1 flex-1 text-[13.5px]">
          {/* Status & Net Box */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-[16px] bg-[#FAFAF7] border border-[#EAE9DF]">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted-foreground-subtle)] block mb-1.5">Status</span>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-bold ${item.status === "IN_STOCK" ? "bg-[#E8F0DC] text-[#4D6B2A]" : "bg-[#E2E8F0] text-[#334155]"
                }`}>
                <span className={`w-2 h-2 rounded-full ${item.status === "IN_STOCK" ? "bg-[#4D6B2A]" : "bg-[#334155]"}`} />
                {item.status === "IN_STOCK" ? "In Stock" : "Sold"}
              </span>
            </div>
            <div className="p-4 rounded-[16px] bg-[#FAFAF7] border border-[#EAE9DF]">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted-foreground-subtle)] block mb-1.5">Net Recovery / Margin</span>
              {net !== null ? (
                <span className={`text-[15px] font-extrabold ${net > 0 ? "text-[#4D6B2A]" : net < 0 ? "text-[#B91C1C]" : "text-[var(--foreground)]"}`}>
                  {net > 0 ? `+${fmtINR(net)} recovered` : net < 0 ? `${fmtINR(net)} loss` : "Break even"}
                </span>
              ) : (
                <span className="text-[13px] text-[var(--muted-foreground-subtle)] font-medium">No recovery recorded</span>
              )}
            </div>
          </div>

          {/* Details Grid */}
          <div className="space-y-2.5">
            <h3 className="text-[12px] font-bold uppercase tracking-wider text-[var(--muted-foreground-subtle)]">Acquisition Details</h3>
            <div className="grid grid-cols-2 gap-y-3.5 gap-x-4 p-4 rounded-[16px] bg-[var(--background)] border border-[#EAE9DF]">
              <div>
                <span className="text-[11.5px] text-[var(--muted-foreground-subtle)] font-medium block">Source</span>
                {item.sourceType === "PLEDGE_SALE" && item.sourcePledge ? (
                  <Link href={`/customers/${item.sourcePledge.customerId}`} className="font-semibold text-[#565C3F] hover:underline inline-flex items-center gap-1 mt-0.5">
                    <Archive size={12} />
                    Pledge · {item.sourcePledge.customer.name}
                  </Link>
                ) : (
                  <span className="font-semibold text-[var(--foreground)] mt-0.5 block">Direct Purchase</span>
                )}
              </div>
              <div>
                <span className="text-[11.5px] text-[var(--muted-foreground-subtle)] font-medium block">Acquired Date</span>
                <span className="font-semibold text-[var(--foreground)] mt-0.5 block">{fmtDate(item.acquiredAt)}</span>
              </div>
              <div>
                <span className="text-[11.5px] text-[var(--muted-foreground-subtle)] font-medium block">Acquired Cost</span>
                <span className="font-bold text-[var(--foreground)] mt-0.5 block">
                  {acquiredCost === 0 ? "Forfeited (₹0)" : fmtINR(acquiredCost)}
                </span>
              </div>
              {item.amountOwedAt !== null && (
                <div>
                  <span className="text-[11.5px] text-[var(--muted-foreground-subtle)] font-medium block">Amount Owed at Forfeiture</span>
                  <span className="font-semibold text-[var(--foreground)] mt-0.5 block">{fmtINR(Number(item.amountOwedAt))}</span>
                </div>
              )}
            </div>
          </div>

          {/* Sold Details if Sold */}
          {item.status === "SOLD" && (
            <div className="space-y-2.5">
              <h3 className="text-[12px] font-bold uppercase tracking-wider text-[var(--muted-foreground-subtle)]">Sale Information</h3>
              <div className="grid grid-cols-2 gap-y-3.5 gap-x-4 p-4 rounded-[16px] bg-[#F5F4E7]/40 border border-[#EAE9DF]">
                <div>
                  <span className="text-[11.5px] text-[var(--muted-foreground-subtle)] font-medium block">Sold Price</span>
                  <span className="font-bold text-[#4D6B2A] text-[15px] mt-0.5 block">{item.soldPrice ? fmtINR(Number(item.soldPrice)) : "—"}</span>
                </div>
                <div>
                  <span className="text-[11.5px] text-[var(--muted-foreground-subtle)] font-medium block">Sale Date</span>
                  <span className="font-semibold text-[var(--foreground)] mt-0.5 block">{item.soldAt ? fmtDate(item.soldAt) : "—"}</span>
                </div>
                {item.buyerName && (
                  <div>
                    <span className="text-[11.5px] text-[var(--muted-foreground-subtle)] font-medium block">Buyer Name</span>
                    <span className="font-semibold text-[var(--foreground)] mt-0.5 block">{item.buyerName}</span>
                  </div>
                )}
                {item.buyerMobile && (
                  <div>
                    <span className="text-[11.5px] text-[var(--muted-foreground-subtle)] font-medium block">Buyer Mobile</span>
                    <span className="font-semibold text-[var(--foreground)] mt-0.5 block">{item.buyerMobile}</span>
                  </div>
                )}
                {item.saleNotes && (
                  <div className="col-span-2">
                    <span className="text-[11.5px] text-[var(--muted-foreground-subtle)] font-medium block">Sale Notes</span>
                    <p className="font-normal text-[var(--muted-foreground)] mt-1 bg-white p-3 rounded-[12px] border border-[#EAE9DF] text-[13px]">{item.saleNotes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {item.notes && (
            <div className="space-y-1.5">
              <span className="text-[12px] font-bold uppercase tracking-wider text-[var(--muted-foreground-subtle)] block">General Notes</span>
              <p className="p-3.5 rounded-[14px] bg-[#FAFAF7] border border-[#EAE9DF] text-[13px] text-[var(--muted-foreground)]">
                {item.notes}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-[#EAE9DF] flex items-center justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-[12px] text-[13.5px] font-semibold bg-[#FAFAF7] border border-[#EAE9DF] text-[var(--muted-foreground)] hover:bg-[#EAE9DF] transition-colors"
          >
            Close
          </button>
          {item.status === "IN_STOCK" && (
            <button
              onClick={() => { onClose(); onSell(item); }}
              className="px-5 py-2.5 rounded-[12px] text-[13.5px] font-semibold text-white bg-[#565C3F] hover:bg-[#464b33] flex items-center gap-2 transition-all shadow-sm"
            >
              <ShoppingBag size={15} />
              Record Sale
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Filter Pill                                                         */
/* ================================================================== */

function Pill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`h-[38px] px-4 rounded-full text-[13px] font-semibold transition-all duration-180 flex items-center justify-center shrink-0 ${active
        ? "bg-[#565C3F] text-white shadow-[0_2px_8px_rgba(86,92,63,0.25)]"
        : "bg-[#FAFAF7] text-[var(--muted-foreground)] border border-[#EAE9DF] hover:bg-[#EAE9DF]/60 hover:text-[var(--foreground)]"
        }`}
    >
      {label}
    </button>
  );
}

/* ================================================================== */
/*  Table Row                                                           */
/* ================================================================== */

function InventoryRow({
  item,
  onSell,
  onViewDetails,
  openMenuId,
  setOpenMenuId,
}: {
  item: InventoryItem;
  onSell: (item: InventoryItem) => void;
  onViewDetails: (item: InventoryItem) => void;
  openMenuId: string | null;
  setOpenMenuId: (id: string | null) => void;
}) {
  const acquiredCost = Number(item.acquiredCost);
  const amountOwedAt = item.amountOwedAt !== null ? Number(item.amountOwedAt) : null;
  const net = amountOwedAt !== null ? amountOwedAt - acquiredCost : null;
  const metalLabel = item.purity ? `${item.metalType} ${Number(item.purity).toFixed(0)}K` : item.metalType;
  const displayId = item.id.startsWith("INV-") ? item.id : `INV-${item.id.slice(-4).toUpperCase()}`;

  const isGold = item.metalType.toLowerCase().includes("gold");
  const isSilver = item.metalType.toLowerCase().includes("silver");

  return (
    <tr
      onClick={() => onViewDetails(item)}
      className="group cursor-pointer border-b border-[#EAE9DF] transition-all duration-[150ms] ease-in-out hover:bg-[#FAFAF7]"
      style={{ minHeight: "64px" }}
    >
      {/* 1. Item */}
      <td className="py-2.5 pl-4 pr-3 align-middle">
        <div className="flex items-center gap-3">
          {item.photoUrl ? (
            <img src={item.photoUrl} alt="" className="w-[40px] h-[40px] rounded-[10px] object-cover shrink-0 border border-black/5" />
          ) : (
            <div className="w-[40px] h-[40px] rounded-[10px] shrink-0 flex items-center justify-center bg-[#FAFAF7] border border-[#EAE9DF] text-[var(--muted-foreground-subtle)]">
              <Package size={16} />
            </div>
          )}
          <div className="min-w-0 flex flex-col justify-center max-w-[220px]" style={{ gap: "2px" }}>
            <p className="text-[15px] font-medium text-[var(--foreground)] truncate leading-tight group-hover:text-[#565C3F] transition-colors">
              {item.description}
            </p>
            <div className="flex items-center gap-1.5 flex-wrap">
              {item.sourceType === "PLEDGE_SALE" && item.sourcePledge ? (
                <span className="text-[12px] text-[var(--muted-foreground-subtle)] font-normal truncate flex items-center gap-1">
                  <Archive size={10} className="text-[var(--muted-foreground-subtle)]" />
                  From pledge · {item.sourcePledge.customer.name}
                </span>
              ) : (
                <span className="text-[12px] text-[var(--muted-foreground-subtle)] font-normal">
                  Direct Purchase
                </span>
              )}
            </div>
          </div>
        </div>
      </td>

      {/* 2. Type */}
      <td className="py-2.5 px-3 align-middle text-[13.5px] font-normal text-[var(--foreground)] whitespace-nowrap">
        {item.itemType}
      </td>

      {/* 3. Metal */}
      <td className="py-2.5 px-3 align-middle text-[13.5px] font-normal text-[var(--foreground)] whitespace-nowrap">
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full shrink-0 ${isGold ? "bg-[#D97706]" : isSilver ? "bg-[#64748B]" : "bg-[#A2AB89]"}`} />
          <span>{metalLabel}</span>
        </div>
      </td>

      {/* 4. Weight */}
      <td className="py-2.5 px-3 align-middle text-[13.5px] font-normal text-[var(--foreground)] whitespace-nowrap">
        {Number(item.weightGrams).toFixed(2)}g
      </td>

      {/* 5. Acquired */}
      <td className="py-2.5 px-3 align-middle text-[13.5px] font-normal text-[var(--muted-foreground)] whitespace-nowrap">
        {fmtDate(item.acquiredAt)}
      </td>

      {/* 6. Cost */}
      <td className="py-2.5 px-3 align-middle whitespace-nowrap">
        {acquiredCost === 0 ? (
          <span className="inline-block px-2 py-0.5 rounded-[4px] text-[11px] font-medium uppercase tracking-wide bg-[#FFF4D1]/60 text-[#8A6B17] border border-[#FDE6B8]">
            Forfeited
          </span>
        ) : (
          <span className="text-[13.5px] font-medium text-[var(--foreground)]">{fmtINR(acquiredCost)}</span>
        )}
      </td>

      {/* 7. Net */}
      <td className="py-2.5 px-3 align-middle whitespace-nowrap">
        {net !== null ? (
          <span className={`text-[13.5px] font-medium ${net > 0 ? "text-[#4D6B2A]" : net < 0 ? "text-[#B91C1C]" : "text-[var(--muted-foreground)]"}`}>
            {net > 0 ? `+${fmtINR(net)}` : net < 0 ? `${fmtINR(net)}` : "Break even"}
          </span>
        ) : (
          <span className="text-[var(--muted-foreground-subtle)] text-[13.5px]">—</span>
        )}
      </td>

      {/* 8. Status */}
      <td className="py-2.5 px-3 align-middle whitespace-nowrap">
        <span className={`inline-flex items-center justify-center h-[26px] px-2.5 rounded-full text-[11.5px] font-medium tracking-wide border shrink-0 ${item.status === "IN_STOCK"
          ? "bg-[#E8F0DC]/60 text-[#4D6B2A] border-[#C8D9A8]/50"
          : "bg-[#E2E8F0]/60 text-[#334155] border-[#CBD5E1]/50"
          }`}>
          {item.status === "IN_STOCK" ? "In Stock" : "Sold"}
        </span>
      </td>

      {/* 9. Actions */}
      <td className="py-2.5 pl-3 pr-4 align-middle text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1.5">
          {item.status === "IN_STOCK" && (
            <button
              onClick={() => onSell(item)}
              className="h-[28px] px-3 rounded-[6px] bg-[#565C3F] text-white text-[11.5px] font-medium hover:bg-[#464b33] active:scale-[0.97] transition-all shadow-sm shrink-0"
            >
              Sell
            </button>
          )}
          <div className="relative">
            <button
              onClick={() => setOpenMenuId(openMenuId === item.id ? null : item.id)}
              className="p-1.5 rounded-[8px] hover:bg-[#EAE9DF] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              <MoreVertical size={16} />
            </button>
            {openMenuId === item.id && (
              <div className="absolute right-0 top-full mt-1 w-44 rounded-[12px] bg-[var(--card)] border border-[#EAE9DF] shadow-xl py-1.5 z-30 text-left animate-in fade-in zoom-in-95 duration-150">
                <button
                  onClick={() => { setOpenMenuId(null); onViewDetails(item); }}
                  className="w-full px-3.5 py-2 text-[13px] font-medium text-[var(--foreground)] hover:bg-[#FAFAF7] flex items-center gap-2.5 transition-colors"
                >
                  <Eye size={14} className="text-[var(--muted-foreground-subtle)]" />
                  View Details
                </button>
                {item.status === "IN_STOCK" && (
                  <button
                    onClick={() => { setOpenMenuId(null); onSell(item); }}
                    className="w-full px-3.5 py-2 text-[13px] font-medium text-[#4D6B2A] hover:bg-[#E8F0DC]/50 flex items-center gap-2.5 transition-colors"
                  >
                    <ShoppingBag size={14} />
                    Record Sale
                  </button>
                )}
                {item.sourceType === "PLEDGE_SALE" && item.sourcePledge && (
                  <Link
                    href={`/customers/${item.sourcePledge.customerId}`}
                    onClick={() => setOpenMenuId(null)}
                    className="w-full px-3.5 py-2 text-[13px] font-medium text-[var(--foreground)] hover:bg-[#FAFAF7] flex items-center gap-2.5 transition-colors"
                  >
                    <User size={14} className="text-[var(--muted-foreground-subtle)]" />
                    View Customer
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}

/* ================================================================== */
/*  Main Page                                                           */
/* ================================================================== */

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [summary, setSummary] = useState<Summary>({
    totalInStock: 0,
    totalSold: 0,
    totalValueInStock: 0,
    totalSoldRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<"in_stock" | "sold" | "all">("in_stock");
  const [filterSource, setFilterSource] = useState<"all" | "pledge" | "direct">("all");
  const [filterMetal, setFilterMetal] = useState<"all" | "gold" | "silver" | "other">("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "value_high" | "value_low">("newest");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sellItem, setSellItem] = useState<InventoryItem | null>(null);
  const [viewDetailsItem, setViewDetailsItem] = useState<InventoryItem | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    if (toastRef.current) clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(null), 4000);
  }

  const loadInventory = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        status: filterStatus,
        sourceType: filterSource,
        metalType: filterMetal,
        sortBy,
      });
      const res = await fetch(`/api/inventory?${params}`);
      const data = await res.json();
      if (res.ok) {
        setItems(data.items ?? []);
        setSummary(data.summary ?? {
          totalInStock: 0, totalSold: 0, totalValueInStock: 0, totalSoldRevenue: 0,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterSource, filterMetal, sortBy]);

  useEffect(() => { loadInventory(); }, [loadInventory]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus, filterSource, filterMetal, filterType, sortBy]);

  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  // Filter items instantly by searchQuery and Type
  const filteredItems = items.filter((item) => {
    if (filterType !== "all") {
      if (filterType === "Other") {
        const standardTypes = ["pendant", "ring", "chain", "bracelet", "coin"];
        if (standardTypes.includes(item.itemType.toLowerCase())) return false;
      } else {
        if (item.itemType.toLowerCase() !== filterType.toLowerCase()) return false;
      }
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const displayId = `inv-${item.id.slice(-4).toLowerCase()}`;
    return (
      item.description.toLowerCase().includes(q) ||
      item.itemType.toLowerCase().includes(q) ||
      item.metalType.toLowerCase().includes(q) ||
      item.id.toLowerCase().includes(q) ||
      displayId.includes(q) ||
      (item.buyerName && item.buyerName.toLowerCase().includes(q)) ||
      (item.sourcePledge && item.sourcePledge.customer.name.toLowerCase().includes(q))
    );
  });

  const pageSize = 10;
  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;
  const paginatedItems = filteredItems.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <SubscriptionGuard>
      <div className="py-6 space-y-4" onClick={() => setOpenMenuId(null)}>

        {/* Toast */}
        {toast && (
          <div
            className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-[12px] text-[13px] font-semibold text-white shadow-xl animate-in fade-in slide-in-from-bottom-3 duration-200"
            style={{ backgroundColor: "#565C3F" }}
          >
            {toast}
          </div>
        )}

        {/* Header + Subtitle + Add Item CTA */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-[var(--foreground)] leading-tight">
              Inventory
            </h1>
            <p className="text-[13px] mt-0.5 text-[var(--muted-foreground-subtle)] font-normal">
              Items acquired through pledges and direct purchases
            </p>
            <div className="mt-2">
              <MetalRateStrip variant="full" />
            </div>
          </div>
          <Link href="/inventory/buy" className="shrink-0">
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-[10px] text-[13px] font-medium text-white bg-[#565C3F] hover:bg-[#464b33] shadow-sm transition-all duration-150 active:scale-[0.98] cursor-pointer"
            >
              <Plus size={15} strokeWidth={2} />
              Add Item
            </button>
          </Link>
        </div>

        {/* Stats Strip (Single Container) */}
        <div className="rounded-[16px] bg-[var(--card)] border border-[#EAE9DF] shadow-[0_1px_3px_rgba(0,0,0,0.015)] overflow-hidden">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 lg:divide-x divide-[#EAE9DF]">
            {[
              {
                icon: <Package size={18} className="text-[#565C3F]" strokeWidth={2} />,
                iconBg: "bg-[#F5F4E7]",
                label: "IN STOCK",
                value: summary.totalInStock.toLocaleString("en-IN"),
                subtext: "Total items available",
                subtextColor: "text-[#565C3F]",
              },
              {
                icon: <IndianRupee size={18} className="text-[#8A6B17]" strokeWidth={2} />,
                iconBg: "bg-[#FFF4D1]/60",
                label: "ACQUIRED VALUE",
                value: fmtINR(summary.totalValueInStock),
                subtext: "Total acquisition cost",
                subtextColor: "text-[#8A6B17]",
              },
              {
                icon: <ShoppingBag size={18} className="text-[#4338CA]" strokeWidth={2} />,
                iconBg: "bg-[#E0E7FF]/60",
                label: "SOLD",
                value: summary.totalSold.toLocaleString("en-IN"),
                subtext: "Items sold",
                subtextColor: "text-[#4338CA]",
              },
              {
                icon: <Scale size={18} className="text-[#4D6B2A]" strokeWidth={2} />,
                iconBg: "bg-[#E8F0DC]/60",
                label: "NET VALUE",
                value: fmtINR(summary.totalValueInStock - summary.totalSoldRevenue),
                subtext: "Acquired value - Sold revenue",
                subtextColor: "text-[#4D6B2A]",
              },
            ].map((card) => (
              <div
                key={card.label}
                className="p-4 flex items-center gap-3.5 transition-all duration-180 hover:bg-[#FAFAF7]/50"
                style={{ height: "100px", maxHeight: "100px" }}
              >
                <div
                  className={`w-[40px] h-[40px] rounded-[10px] flex items-center justify-center shrink-0 ${card.iconBg}`}
                >
                  {card.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground-subtle)] block truncate mb-0.5">
                    {card.label}
                  </span>
                  <span className="text-[24px] font-semibold text-[var(--foreground)] block leading-tight truncate my-0.5 tracking-tight">
                    {card.value}
                  </span>
                  <span className={`text-[12px] font-normal block truncate ${card.subtextColor}`}>
                    {card.subtext}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Filter Row */}
        <div className="flex items-center justify-between gap-3 flex-wrap bg-[var(--card)] p-2.5 rounded-[16px] border border-[#EAE9DF] shadow-[0_1px_3px_rgba(0,0,0,0.01)]">
          {/* Search bar taking 30-35% width */}
          <div className="flex items-center gap-2 px-3.5 h-[36px] rounded-full bg-[#FAFAF7] border border-[#EAE9DF] focus-within:border-[#565C3F] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#565C3F]/10 transition-all w-full md:w-[32%] min-w-[240px]">
            <Search size={14} className="text-[var(--muted-foreground-subtle)] shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search inventory items..."
              className="w-full bg-transparent outline-none text-[13px] font-normal text-[var(--foreground)] placeholder-[var(--muted-foreground-subtle)]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="p-0.5 hover:bg-[#EAE9DF] rounded-full text-[var(--muted-foreground-subtle)] transition-colors"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Filters + Sort aligning in same row */}
          <div className="flex items-center gap-2 flex-wrap flex-1 justify-end">
            {/* Stock Filter */}
            <div className="relative shrink-0">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
                className="pl-3.5 pr-8 h-[36px] rounded-full text-[13px] font-medium appearance-none outline-none focus:ring-2 focus:ring-[#565C3F] bg-[#FAFAF7] border border-[#EAE9DF] text-[var(--foreground)] cursor-pointer transition-all hover:bg-[#EAE9DF]/50"
              >
                <option value="in_stock">In Stock</option>
                <option value="sold">Sold</option>
                <option value="all">All Stock</option>
              </select>
              <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--muted-foreground-subtle)]" />
            </div>

            {/* Source Filter */}
            <div className="relative shrink-0">
              <select
                value={filterSource}
                onChange={(e) => setFilterSource(e.target.value as typeof filterSource)}
                className="pl-3.5 pr-8 h-[36px] rounded-full text-[13px] font-medium appearance-none outline-none focus:ring-2 focus:ring-[#565C3F] bg-[#FAFAF7] border border-[#EAE9DF] text-[var(--foreground)] cursor-pointer transition-all hover:bg-[#EAE9DF]/50"
              >
                <option value="all">All Sources</option>
                <option value="pledge">From Pledges</option>
                <option value="direct">Direct Purchase</option>
              </select>
              <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--muted-foreground-subtle)]" />
            </div>

            {/* Metal Filter */}
            <div className="relative shrink-0">
              <select
                value={filterMetal}
                onChange={(e) => setFilterMetal(e.target.value as typeof filterMetal)}
                className="pl-3.5 pr-8 h-[36px] rounded-full text-[13px] font-medium appearance-none outline-none focus:ring-2 focus:ring-[#565C3F] bg-[#FAFAF7] border border-[#EAE9DF] text-[var(--foreground)] cursor-pointer transition-all hover:bg-[#EAE9DF]/50"
              >
                <option value="all">All Metals</option>
                <option value="gold">Gold</option>
                <option value="silver">Silver</option>
                <option value="other">Other</option>
              </select>
              <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--muted-foreground-subtle)]" />
            </div>

            {/* Type Filter */}
            <div className="relative shrink-0">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="pl-3.5 pr-8 h-[36px] rounded-full text-[13px] font-medium appearance-none outline-none focus:ring-2 focus:ring-[#565C3F] bg-[#FAFAF7] border border-[#EAE9DF] text-[var(--foreground)] cursor-pointer transition-all hover:bg-[#EAE9DF]/50"
              >
                <option value="all">All Types</option>
                <option value="Pendant">Pendant</option>
                <option value="Ring">Ring</option>
                <option value="Chain">Chain</option>
                <option value="Bracelet">Bracelet</option>
                <option value="Coin">Coin</option>
                <option value="Other">Other</option>
              </select>
              <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--muted-foreground-subtle)]" />
            </div>

            {/* Sort */}
            <div className="relative shrink-0">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="pl-3.5 pr-8 h-[36px] rounded-full text-[13px] font-medium appearance-none outline-none focus:ring-2 focus:ring-[#565C3F] bg-[#FAFAF7] border border-[#EAE9DF] text-[var(--foreground)] cursor-pointer transition-all hover:bg-[#EAE9DF]/50"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="value_high">Value (high→low)</option>
                <option value="value_low">Value (low→high)</option>
              </select>
              <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--muted-foreground-subtle)]" />
            </div>
          </div>
        </div>

        {/* Inventory Table */}
        <div className="rounded-[20px] bg-[var(--card)] border border-[#EAE9DF] shadow-[0_2px_16px_rgba(0,0,0,0.02)] overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 size={24} className="animate-spin text-[#565C3F]" />
              <p className="text-[13px] font-medium text-[var(--muted-foreground)]">Loading inventory items…</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-16 h-16 rounded-full bg-[#FAFAF7] flex items-center justify-center text-[#565C3F] mb-1 border border-[#EAE9DF]">
                <Inbox size={32} strokeWidth={1.5} />
              </div>
              <p className="text-[15px] font-semibold text-[var(--foreground)]">
                {searchQuery || filterType !== "all" ? "No matching items found" : "No inventory items yet"}
              </p>
              <p className="text-[13px] text-[var(--muted-foreground)] max-w-sm text-center font-normal">
                {searchQuery || filterType !== "all"
                  ? `We couldn't find anything matching your search and filters. Try adjusting them.`
                  : "Add your first item or add a pledge to inventory to get started."}
              </p>
              {(searchQuery || filterType !== "all") && (
                <button
                  onClick={() => { setSearchQuery(""); setFilterType("all"); }}
                  className="mt-2 px-4 py-2 rounded-[8px] bg-[#565C3F] text-white text-[12px] font-medium hover:bg-[#464b33] transition-colors"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div className="p-3">
              <div className="overflow-x-auto rounded-[14px] border border-[#EAE9DF]/80">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-[#FAFAF7] border-b border-[#EAE9DF]" style={{ height: "44px" }}>
                      {["ITEM", "TYPE", "METAL", "WEIGHT", "ACQUIRED", "COST", "NET", "STATUS", "ACTIONS"].map((h, i) => (
                        <th
                          key={h}
                          className={`py-2.5 px-3 text-[11px] font-medium tracking-wider uppercase text-[var(--muted-foreground-subtle)] whitespace-nowrap ${i === 0 ? "pl-4" : i === 8 ? "pr-4 text-right" : ""
                            }`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedItems.map((item) => (
                      <InventoryRow
                        key={item.id}
                        item={item}
                        onSell={setSellItem}
                        onViewDetails={setViewDetailsItem}
                        openMenuId={openMenuId}
                        setOpenMenuId={setOpenMenuId}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-end pt-3 px-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="w-[32px] h-[32px] rounded-[8px] flex items-center justify-center bg-[#FAFAF7] border border-[#EAE9DF] text-[var(--muted-foreground)] hover:bg-[#EAE9DF] disabled:opacity-40 disabled:pointer-events-none transition-colors"
                    >
                      <ChevronLeft size={15} />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        onClick={() => setCurrentPage(p)}
                        className={`w-[32px] h-[32px] rounded-[8px] flex items-center justify-center font-medium text-[12.5px] transition-all duration-180 ${currentPage === p
                          ? "bg-[#565C3F] text-white shadow-sm"
                          : "bg-[#FAFAF7] border border-[#EAE9DF] text-[var(--muted-foreground)] hover:bg-[#EAE9DF]"
                          }`}
                      >
                        {p}
                      </button>
                    ))}
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="w-[32px] h-[32px] rounded-[8px] flex items-center justify-center bg-[#FAFAF7] border border-[#EAE9DF] text-[var(--muted-foreground)] hover:bg-[#EAE9DF] disabled:opacity-40 disabled:pointer-events-none transition-colors"
                    >
                      <ChevronRight size={15} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {sellItem && (
        <SellModal
          item={sellItem}
          onClose={() => setSellItem(null)}
          onSuccess={() => {
            setSellItem(null);
            showToast("Item sold successfully.");
            loadInventory();
          }}
        />
      )}

      {viewDetailsItem && (
        <ItemDetailsModal
          item={viewDetailsItem}
          onClose={() => setViewDetailsItem(null)}
          onSell={(item) => {
            setViewDetailsItem(null);
            setSellItem(item);
          }}
        />
      )}
    </SubscriptionGuard>
  );
}
