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
  grossWeight: string;
  netWeightOfGold: string;
  netWeightOfSilver: string;
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

interface ItemType {
  id: string;
  label: string;
  isDefault: boolean;
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
    soldPrice:   "",
    soldAt:      todayISO(),
    buyerName:   "",
    buyerMobile: "",
    saleNotes:   "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const soldPriceNum  = Number(form.soldPrice);
  const acquiredCost  = Number(item.acquiredCost);
  const profit        = !isNaN(soldPriceNum) && form.soldPrice !== "" ? soldPriceNum - acquiredCost : null;

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
          soldPrice:   soldPriceNum,
          soldAt:      form.soldAt,
          buyerName:   form.buyerName.trim()   || null,
          buyerMobile: form.buyerMobile.trim() || null,
          saleNotes:   form.saleNotes.trim()   || null,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div
        className="relative w-full max-w-[480px] rounded-[18px] p-7"
        style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border-light)" }}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-[#EAE9DF] transition-colors"
          style={{ color: "var(--text-secondary)" }}
        >
          <X size={18} />
        </button>

        <h2 className="text-[17px] font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
          Record Sale
        </h2>

        {/* Item summary */}
        <div
          className="flex items-center gap-3 p-3 rounded-[12px] mb-5 mt-3"
          style={{ backgroundColor: "var(--main-bg)", border: "1px solid var(--border-light)" }}
        >
          {item.photoUrl ? (
            <img src={item.photoUrl} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
          ) : (
            <div
              className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center"
              style={{ backgroundColor: "var(--border-light)" }}
            >
              <Package size={16} style={{ color: "var(--text-muted)" }} />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-[13px] font-semibold truncate" style={{ color: "var(--text-primary)" }}>
              {item.description}
            </p>
            <p className="text-[11.5px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
              {metalLabel} · {Number(item.grossWeight).toFixed(2)}g ·{" "}
              <span style={{ color: "var(--text-muted)" }}>
                Acquired for {acquiredCost === 0 ? "free (forfeited)" : fmtINR(acquiredCost)}
              </span>
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Sale Price */}
          <div>
            <label className="block text-[12px] font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>
              Sale Price (₹) *
            </label>
            <input
              type="number"
              min="0.01"
              step="any"
              value={form.soldPrice}
              onChange={(e) => setForm((f) => ({ ...f, soldPrice: e.target.value }))}
              placeholder="e.g. 55000"
              className="w-full px-3 py-2 rounded-[10px] text-[13px] outline-none focus:ring-2 focus:ring-[#A2AB89]"
              style={{
                backgroundColor: "var(--main-bg)",
                border: "1px solid var(--border-light)",
                color: "var(--text-primary)",
              }}
            />
          </div>

          {/* Live profit */}
          {profit !== null && (
            <div
              className="px-3 py-2 rounded-[10px] text-[12.5px] font-semibold"
              style={{
                backgroundColor: profit > 0 ? "#F0F4E8" : profit < 0 ? "#FFF4F0" : "var(--main-bg)",
                color: profit > 0 ? "#4D6B2A" : profit < 0 ? "#9A4B14" : "var(--text-secondary)",
                border: `1px solid ${profit > 0 ? "#C8D9A8" : profit < 0 ? "#F5D0BC" : "var(--border-light)"}`,
              }}
            >
              {profit > 0
                ? `Profit: ${fmtINR(profit)}`
                : profit < 0
                ? `Loss: ${fmtINR(Math.abs(profit))}`
                : "Break even"}
            </div>
          )}

          {/* Sale Date */}
          <div>
            <label className="block text-[12px] font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>
              Sale Date *
            </label>
            <input
              type="date"
              max={todayISO()}
              value={form.soldAt}
              onChange={(e) => setForm((f) => ({ ...f, soldAt: e.target.value }))}
              className="w-full px-3 py-2 rounded-[10px] text-[13px] outline-none focus:ring-2 focus:ring-[#A2AB89]"
              style={{
                backgroundColor: "var(--main-bg)",
                border: "1px solid var(--border-light)",
                color: "var(--text-primary)",
              }}
            />
          </div>

          {/* Buyer Name + Mobile */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>
                Buyer Name (optional)
              </label>
              <input
                type="text"
                value={form.buyerName}
                onChange={(e) => setForm((f) => ({ ...f, buyerName: e.target.value }))}
                placeholder="e.g. Sunita Devi"
                className="w-full px-3 py-2 rounded-[10px] text-[13px] outline-none focus:ring-2 focus:ring-[#A2AB89]"
                style={{
                  backgroundColor: "var(--main-bg)",
                  border: "1px solid var(--border-light)",
                  color: "var(--text-primary)",
                }}
              />
            </div>

            <div>
              <label className="block text-[12px] font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>
                Buyer Mobile (optional)
              </label>
              <input
                type="text"
                value={form.buyerMobile}
                onChange={(e) => setForm((f) => ({ ...f, buyerMobile: e.target.value }))}
                placeholder="e.g. 9876543210"
                className="w-full px-3 py-2 rounded-[10px] text-[13px] outline-none focus:ring-2 focus:ring-[#A2AB89]"
                style={{
                  backgroundColor: "var(--main-bg)",
                  border: "1px solid var(--border-light)",
                  color: "var(--text-primary)",
                }}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[12px] font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>
              Notes (optional)
            </label>
            <textarea
              rows={2}
              value={form.saleNotes}
              onChange={(e) => setForm((f) => ({ ...f, saleNotes: e.target.value }))}
              placeholder="Any sale details"
              className="w-full px-3 py-2 rounded-[10px] text-[13px] outline-none resize-none focus:ring-2 focus:ring-[#A2AB89]"
              style={{
                backgroundColor: "var(--main-bg)",
                border: "1px solid var(--border-light)",
                color: "var(--text-primary)",
              }}
            />
          </div>

          {error && (
            <div
              className="px-3 py-2 rounded-[10px] text-[12.5px]"
              style={{ backgroundColor: "#FEE2E2", color: "#B91C1C" }}
            >
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-[10px] text-[13px] font-semibold transition-colors"
              style={{
                backgroundColor: "var(--main-bg)",
                border: "1px solid var(--border-light)",
                color: "var(--text-secondary)",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 rounded-[10px] text-[13px] font-semibold text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
              style={{ backgroundColor: "#565C3F" }}
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              {submitting ? "Recording…" : "Record Sale"}
            </button>
          </div>
        </form>
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
      className="px-3 py-1.5 rounded-full text-[12px] font-semibold transition-colors"
      style={{
        backgroundColor: active ? "#565C3F" : "var(--main-bg)",
        color: active ? "#fff" : "var(--text-secondary)",
        border: `1px solid ${active ? "#565C3F" : "var(--border-light)"}`,
      }}
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
}: {
  item: InventoryItem;
  onSell: (item: InventoryItem) => void;
}) {
  const acquiredCost = Number(item.acquiredCost);
  const amountOwedAt = item.amountOwedAt !== null ? Number(item.amountOwedAt) : null;
  // net: amountOwedAt - acquiredCost (positive = recovered more than you paid → green)
  const net = amountOwedAt !== null ? amountOwedAt - acquiredCost : null;

  const metalLabel = item.purity
    ? `${item.metalType} ${Number(item.purity).toFixed(0)}K`
    : item.metalType;

  // A single item populates at most one net field; show whichever is non-zero.
  const netGold   = Number(item.netWeightOfGold);
  const netSilver = Number(item.netWeightOfSilver);
  const netMetalWeight = netGold > 0 ? netGold : netSilver > 0 ? netSilver : null;

  return (
    <tr style={{ borderBottom: "1px solid var(--border-light)" }}>
      {/* Photo */}
      <td className="py-3 pl-4 pr-2 w-12">
        {item.photoUrl ? (
          <img
            src={item.photoUrl}
            alt=""
            className="w-10 h-10 rounded-lg object-cover"
          />
        ) : (
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center opacity-50"
            style={{ backgroundColor: "var(--border-light)" }}
          >
            <Package size={14} style={{ color: "var(--text-muted)" }} />
          </div>
        )}
      </td>

      {/* Item */}
      <td className="py-3 px-3">
        <p className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
          {item.description}
        </p>
        {item.sourceType === "PLEDGE_SALE" && item.sourcePledge ? (
          <Link
            href={`/customers/${item.sourcePledge.customerId}`}
            className="inline-flex items-center gap-1 mt-0.5 text-[11px] font-medium hover:underline"
            style={{ color: "#565C3F" }}
          >
            <Archive size={10} />
            From pledge · {item.sourcePledge.customer.name}
          </Link>
        ) : (
          <span className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
            Direct Purchase
          </span>
        )}
      </td>

      {/* Type */}
      <td className="py-3 px-3 text-[12.5px]" style={{ color: "var(--text-secondary)" }}>
        {item.itemType}
      </td>

      {/* Metal */}
      <td className="py-3 px-3 text-[12.5px]" style={{ color: "var(--text-secondary)" }}>
        {metalLabel}
      </td>

      {/* Weight */}
      <td className="py-3 px-3">
        <p className="text-[12.5px]" style={{ color: "var(--text-secondary)" }}>
          {Number(item.grossWeight).toFixed(2)}g
        </p>
        {netMetalWeight !== null && (
          <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
            net {netMetalWeight.toFixed(3)}g
          </p>
        )}
      </td>

      {/* Acquired */}
      <td className="py-3 px-3 text-[12.5px]" style={{ color: "var(--text-secondary)" }}>
        {fmtDate(item.acquiredAt)}
      </td>

      {/* Cost */}
      <td className="py-3 px-3">
        {acquiredCost === 0 ? (
          <span
            className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold"
            style={{ backgroundColor: "#FFF4D1", color: "#8A6B17" }}
          >
            Forfeited
          </span>
        ) : (
          <span className="text-[12.5px]" style={{ color: "var(--text-primary)" }}>
            {fmtINR(acquiredCost)}
          </span>
        )}
      </td>

      {/* Net */}
      <td className="py-3 px-3">
        {net !== null ? (
          <span
            className="text-[12px] font-semibold"
            style={{
              color: net > 0 ? "#4D6B2A" : net < 0 ? "#9A4B14" : "var(--text-secondary)",
            }}
          >
            {net > 0
              ? `+${fmtINR(net)} recovered`
              : net < 0
              ? `${fmtINR(net)} loss`
              : "Break even"}
          </span>
        ) : (
          <span style={{ color: "var(--text-muted)" }}>—</span>
        )}
      </td>

      {/* Status / Action */}
      <td className="py-3 px-3 pr-4">
        {item.status === "IN_STOCK" ? (
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
              style={{ backgroundColor: "#E8F0DC", color: "#4D6B2A" }}
            >
              In Stock
            </span>
            <button
              onClick={() => onSell(item)}
              className="px-2.5 py-1 rounded-[8px] text-[11.5px] font-semibold text-white transition-opacity hover:opacity-80"
              style={{ backgroundColor: "#565C3F" }}
            >
              Sell
            </button>
          </div>
        ) : (
          <div>
            <p className="text-[12px] font-semibold" style={{ color: "var(--text-primary)" }}>
              Sold · {item.soldPrice ? fmtINR(Number(item.soldPrice)) : ""}
            </p>
            {item.soldAt && (
              <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                {fmtDate(item.soldAt)}
              </p>
            )}
            {item.soldPrice && (
              (() => {
                const sp = Number(item.soldPrice);
                const margin = sp - acquiredCost;
                return (
                  <p
                    className="text-[11px] font-semibold mt-0.5"
                    style={{ color: margin >= 0 ? "#4D6B2A" : "#B91C1C" }}
                  >
                    {margin >= 0 ? `+${fmtINR(margin)}` : fmtINR(margin)}
                  </p>
                );
              })()
            )}
          </div>
        )}
      </td>
    </tr>
  );
}

/* ================================================================== */
/*  Main Page                                                           */
/* ================================================================== */

export default function InventoryPage() {
  const [items, setItems]       = useState<InventoryItem[]>([]);
  const [summary, setSummary]   = useState<Summary>({
    totalInStock: 0,
    totalSold: 0,
    totalValueInStock: 0,
    totalSoldRevenue: 0,
  });
  const [loading, setLoading]   = useState(true);
  const [filterStatus, setFilterStatus]     = useState<"in_stock" | "sold" | "all">("in_stock");
  const [filterSource, setFilterSource]     = useState<"all" | "pledge" | "direct">("all");
  const [filterMetal, setFilterMetal]       = useState<"all" | "gold" | "silver" | "other">("all");
  const [sortBy, setSortBy]                 = useState<"newest" | "oldest" | "value_high" | "value_low">("newest");
  const [sellItem, setSellItem]             = useState<InventoryItem | null>(null);
  const [toast, setToast]                   = useState<string | null>(null);
  const toastRef                            = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    if (toastRef.current) clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(null), 4000);
  }

  const loadInventory = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        status:     filterStatus,
        sourceType: filterSource,
        metalType:  filterMetal,
        sortBy,
      });
      const res  = await fetch(`/api/inventory?${params}`);
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

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadInventory(); }, [loadInventory]);

  return (
    <SubscriptionGuard>
      <div className="py-6 space-y-6">

        {/* Toast */}
        {toast && (
          <div
            className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-[12px] text-[13px] font-semibold text-white shadow-lg"
            style={{ backgroundColor: "#565C3F" }}
          >
            {toast}
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
              Inventory
            </h1>
            <p className="text-[13px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
              Items acquired through pledges and direct purchases
            </p>
            <div className="mt-1.5">
              <MetalRateStrip variant="full" />
            </div>
          </div>
          <Link href="/inventory/buy">
            <button
              className="flex items-center gap-2 px-4 py-2.5 rounded-[10px] text-[13px] font-semibold text-white transition-opacity hover:opacity-80"
              style={{ backgroundColor: "#565C3F" }}
            >
              <Plus size={15} />
              Add Item
            </button>
          </Link>
        </div>

        {/* Summary Strip */}
        <div
          className="rounded-[18px] p-0 flex items-center"
          style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border-light)" }}
        >
          {[
            {
              icon: <Package size={16} style={{ color: "#565C3F" }} strokeWidth={2.2} />,
              label: "IN STOCK",
              value: summary.totalInStock.toLocaleString("en-IN"),
              divider: true,
            },
            {
              icon: <IndianRupee size={16} style={{ color: "#565C3F" }} strokeWidth={2.2} />,
              label: "ACQUIRED VALUE",
              value: fmtINR(summary.totalValueInStock),
              divider: true,
            },
            {
              icon: <ShoppingBag size={16} style={{ color: "#565C3F" }} strokeWidth={2.2} />,
              label: "SOLD",
              value: summary.totalSold.toLocaleString("en-IN"),
              divider: true,
            },
            {
              icon: <TrendingUp size={16} style={{ color: "#565C3F" }} strokeWidth={2.2} />,
              label: "SOLD REVENUE",
              value: fmtINR(summary.totalSoldRevenue),
              divider: false,
            },
          ].map((card) => (
            <div key={card.label} className="flex-1 p-6 flex flex-col items-center justify-center relative">
              <div className="flex items-center gap-2 mb-2">
                {card.icon}
                <span
                  className="text-[10px] font-bold tracking-wider uppercase"
                  style={{ color: "var(--text-muted)" }}
                >
                  {card.label}
                </span>
              </div>
              <span className="text-[22px] font-bold" style={{ color: "var(--text-primary)" }}>
                {card.value}
              </span>
              {card.divider && (
                <div className="absolute right-0 top-6 bottom-6 w-px" style={{ backgroundColor: "var(--border-light)" }} />
              )}
            </div>
          ))}
        </div>

        {/* Filters + Sort */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Status */}
            <div className="flex items-center gap-1">
              <Pill label="In Stock" active={filterStatus === "in_stock"} onClick={() => setFilterStatus("in_stock")} />
              <Pill label="Sold"     active={filterStatus === "sold"}     onClick={() => setFilterStatus("sold")} />
              <Pill label="All"      active={filterStatus === "all"}      onClick={() => setFilterStatus("all")} />
            </div>

            <div className="w-px h-5" style={{ backgroundColor: "var(--border-light)" }} />

            {/* Source */}
            <div className="flex items-center gap-1">
              <Pill label="All Sources"    active={filterSource === "all"}    onClick={() => setFilterSource("all")} />
              <Pill label="From Pledges"   active={filterSource === "pledge"} onClick={() => setFilterSource("pledge")} />
              <Pill label="Direct Purchase" active={filterSource === "direct"} onClick={() => setFilterSource("direct")} />
            </div>

            <div className="w-px h-5" style={{ backgroundColor: "var(--border-light)" }} />

            {/* Metal */}
            <div className="flex items-center gap-1">
              <Pill label="All Metals" active={filterMetal === "all"}    onClick={() => setFilterMetal("all")} />
              <Pill label="Gold"       active={filterMetal === "gold"}   onClick={() => setFilterMetal("gold")} />
              <Pill label="Silver"     active={filterMetal === "silver"} onClick={() => setFilterMetal("silver")} />
              <Pill label="Other"      active={filterMetal === "other"}  onClick={() => setFilterMetal("other")} />
            </div>
          </div>

          {/* Sort */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="pl-3 pr-7 py-1.5 rounded-[10px] text-[12.5px] font-medium appearance-none outline-none focus:ring-2 focus:ring-[#A2AB89]"
              style={{
                backgroundColor: "var(--main-bg)",
                border: "1px solid var(--border-light)",
                color: "var(--text-secondary)",
              }}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="value_high">Value (high→low)</option>
              <option value="value_low">Value (low→high)</option>
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-muted)" }} />
          </div>
        </div>

        {/* Table */}
        <div
          className="rounded-[18px] overflow-hidden"
          style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border-light)" }}
        >
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={20} className="animate-spin" style={{ color: "var(--text-muted)" }} />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Inbox size={32} style={{ color: "var(--text-muted)" }} strokeWidth={1.5} />
              <p className="text-[14px] font-semibold" style={{ color: "var(--text-primary)" }}>
                No inventory items yet.
              </p>
              <p className="text-[12.5px]" style={{ color: "var(--text-secondary)" }}>
                Add your first item or add a pledge to inventory.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-light)" }}>
                    {["", "ITEM", "TYPE", "METAL", "WEIGHT", "ACQUIRED", "COST", "NET", "STATUS"].map(
                      (h) => (
                        <th
                          key={h}
                          className="py-3 px-3 text-left text-[10.5px] font-bold tracking-wider uppercase first:pl-4 last:pr-4"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <InventoryRow
                      key={item.id}
                      item={item}
                      onSell={setSellItem}
                    />
                  ))}
                </tbody>
              </table>
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
            showToast("Item sold.");
            loadInventory();
          }}
        />
      )}
    </SubscriptionGuard>
  );
}
