"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { CheckCircle, Download, ArrowLeft, Package } from "lucide-react";
import SubscriptionGuard from "@/components/SubscriptionGuard";

interface ReceiptItem {
  id: string;
  description: string;
  itemType: string;
  metalType: string;
  purity: string | null;
  grossWeight: string;
  netWeightOfGold: string;
  netWeightOfSilver: string;
  acquiredCost: string;
  acquiredAt: string;
  acquiredMetalRate: string | null;
  sellerName: string | null;
  sellerIdNum: string | null;
  notes: string | null;
  photoUrl: string | null;
  sourceType: string;
}

interface Shop {
  shopName: string | null;
  mobile: string | null;
  address: string | null;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function LabelValue({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5" style={{ borderBottom: "1px solid var(--border)" }}>
      <span className="text-[12px] shrink-0" style={{ color: "var(--muted-foreground-subtle)" }}>{label}</span>
      <span className="text-[13px] font-medium text-right" style={{ color: "var(--foreground)" }}>{value}</span>
    </div>
  );
}

export default function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [item, setItem]   = useState<ReceiptItem | null>(null);
  const [shop, setShop]   = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => {
    fetch(`/api/inventory/${id}/receipt`)
      .then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json();
      })
      .then((d) => {
        setItem(d.item);
        setShop(d.shop);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [id]);

  function triggerDownload() {
    const url = `/api/inventory/${id}/receipt?format=pdf`;
    const a   = document.createElement("a");
    a.href     = url;
    a.download = `purchase-receipt_${id.slice(-8).toLowerCase()}.pdf`;
    a.click();
  }

  if (loading) {
    return (
      <SubscriptionGuard>
        <div className="py-6 max-w-[560px] mx-auto space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-12 rounded-[12px] animate-pulse"
              style={{ backgroundColor: "var(--border)" }}
            />
          ))}
        </div>
      </SubscriptionGuard>
    );
  }

  if (error || !item) {
    return (
      <SubscriptionGuard>
        <div className="py-6 max-w-[560px] mx-auto text-center space-y-3">
          <p className="text-[14px]" style={{ color: "var(--muted-foreground)" }}>
            Could not load receipt.
          </p>
          <Link href="/inventory" className="text-[13px] font-medium underline" style={{ color: "#565C3F" }}>
            Back to Inventory
          </Link>
        </div>
      </SubscriptionGuard>
    );
  }

  const acquiredCost = Number(item.acquiredCost);
  const metalLabel   = item.purity
    ? `${item.metalType} (${Number(item.purity).toFixed(2)}%)`
    : item.metalType;
  const netGold   = Number(item.netWeightOfGold);
  const netSilver = Number(item.netWeightOfSilver);
  const netWeight = netGold > 0 ? netGold : netSilver > 0 ? netSilver : null;

  return (
    <SubscriptionGuard>
      <div className="py-6 max-w-[560px] mx-auto space-y-6">

        {/* Back link */}
        <Link
          href="/inventory"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium hover:opacity-70 transition-opacity"
          style={{ color: "var(--muted-foreground)" }}
        >
          <ArrowLeft size={15} />
          Back to Inventory
        </Link>

        {/* Success header */}
        <div className="flex flex-col items-center text-center gap-3 pt-2">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "#E8F0DC" }}
          >
            <CheckCircle size={30} style={{ color: "#4D6B2A" }} />
          </div>
          <div>
            <h1 className="text-[20px] font-semibold" style={{ color: "var(--foreground)" }}>
              Purchase Recorded
            </h1>
            <p className="text-[13px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>
              Item added to inventory.
            </p>
          </div>
        </div>

        {/* Receipt card */}
        <div
          className="rounded-[18px] overflow-hidden"
          style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
        >
          {/* Olive header strip */}
          <div className="px-6 py-4" style={{ backgroundColor: "#565C3F" }}>
            {shop?.shopName && (
              <p className="text-white text-[14px] font-semibold">{shop.shopName}</p>
            )}
            {shop?.address && (
              <p className="text-[12px] mt-0.5" style={{ color: "rgba(255,255,255,0.75)" }}>{shop.address}</p>
            )}
            {shop?.mobile && (
              <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.75)" }}>Mobile: {shop.mobile}</p>
            )}
          </div>

          <div className="px-6 py-5 space-y-0">
            {/* Photo thumbnail */}
            {item.photoUrl && (
              <div className="mb-5">
                <img
                  src={item.photoUrl}
                  alt={item.description}
                  className="w-24 h-24 rounded-[12px] object-cover"
                />
              </div>
            )}
            {!item.photoUrl && (
              <div className="mb-5">
                <div
                  className="w-24 h-24 rounded-[12px] flex items-center justify-center"
                  style={{ backgroundColor: "var(--background)", border: "1px solid var(--border)" }}
                >
                  <Package size={28} style={{ color: "var(--muted-foreground-subtle)" }} />
                </div>
              </div>
            )}

            {/* Purchase price — prominent */}
            <div
              className="mb-5 px-5 py-4 rounded-[12px] text-center"
              style={{ backgroundColor: "#EAE9DF" }}
            >
              <p className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--muted-foreground-subtle)" }}>
                Purchase Price
              </p>
              <p className="text-[28px] font-bold" style={{ color: "#565C3F" }}>
                {"₹" + acquiredCost.toLocaleString("en-IN")}
              </p>
            </div>

            {/* Item details */}
            <div className="space-y-0">
              <LabelValue label="Description"  value={item.description} />
              <LabelValue label="Item Type"    value={item.itemType} />
              <LabelValue label="Metal"        value={metalLabel} />
              <LabelValue label="Gross Weight" value={`${Number(item.grossWeight).toFixed(3)} g`} />
              {netWeight !== null && (
                <LabelValue
                  label={`Net ${item.metalType} Weight`}
                  value={`${netWeight.toFixed(3)} g`}
                />
              )}
              {item.acquiredMetalRate != null && (
                <LabelValue
                  label={`${item.metalType.charAt(0).toUpperCase() + item.metalType.slice(1).toLowerCase()} rate at purchase`}
                  value={`₹${Number(item.acquiredMetalRate).toLocaleString("en-IN")}/g`}
                />
              )}
              <LabelValue label="Date Acquired" value={fmtDate(item.acquiredAt)} />
            </div>

            {/* Seller */}
            <div className="mt-4 pt-1 space-y-0">
              <p className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--muted-foreground-subtle)" }}>
                Seller
              </p>
              <LabelValue label="Seller Name"       value={item.sellerName ?? "—"} />
              <LabelValue label="Seller ID Number"  value={item.sellerIdNum ?? "—"} />
            </div>

            {/* Notes */}
            {item.notes && (
              <div className="mt-4 pt-1">
                <p className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--muted-foreground-subtle)" }}>
                  Notes
                </p>
                <p className="text-[13px]" style={{ color: "var(--muted-foreground)" }}>{item.notes}</p>
              </div>
            )}

            {/* Ref */}
            <p className="text-[11px] mt-4 pt-3" style={{ color: "var(--muted-foreground-subtle)", borderTop: "1px solid var(--border)" }}>
              Ref: {item.id.slice(-8).toUpperCase()}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={triggerDownload}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-[10px] text-[13px] font-semibold text-white transition-opacity hover:opacity-80"
            style={{ backgroundColor: "#565C3F" }}
          >
            <Download size={15} />
            Download PDF
          </button>
          <Link href="/inventory" className="flex-1">
            <button
              className="w-full py-3 rounded-[10px] text-[13px] font-semibold transition-colors"
              style={{
                backgroundColor: "var(--background)",
                border: "1px solid var(--border)",
                color: "var(--muted-foreground)",
              }}
            >
              Back to Inventory
            </button>
          </Link>
        </div>
      </div>
    </SubscriptionGuard>
  );
}
