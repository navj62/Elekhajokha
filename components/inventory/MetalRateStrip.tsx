"use client";

import { useEffect, useState } from "react";
import { TrendingUp, Clock, RefreshCw } from "lucide-react";

interface Rate {
  inrPerGram: string | null;
  createdAt: string | null;
}

interface MarketRates {
  gold: Rate | null;
  silver: Rate | null;
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function MetalRateStrip({ variant }: { variant: "full" | "compact" }) {
  const [rates, setRates] = useState<MarketRates | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadRates = () => {
    setLoading(true);
    setError(false);
    fetch("/api/market-rates")
      .then((r) => r.json())
      .then((d: MarketRates) => {
        setRates(d);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadRates();
  }, []);

  const goldPrice =
    rates?.gold?.inrPerGram != null ? Number(rates.gold.inrPerGram) : null;
  const silverPrice =
    rates?.silver?.inrPerGram != null ? Number(rates.silver.inrPerGram) : null;
  const updatedAt =
    rates?.gold?.createdAt ?? rates?.silver?.createdAt ?? null;

  const noData = goldPrice === null && silverPrice === null;

  if (variant === "compact") {
    if (loading) {
      return (
        <div className="px-8 pb-3">
          <p className="text-[11px]" style={{ color: "var(--muted-foreground-subtle)" }}>
            Loading rates...
          </p>
        </div>
      );
    }
    if (error || noData) {
      return (
        <div className="px-8 pb-3">
          <p className="text-[11px]" style={{ color: "var(--muted-foreground-subtle)" }}>
            Rates unavailable
          </p>
        </div>
      );
    }
    return (
      <div className="px-8 pb-3 flex flex-col gap-0.5">
        {goldPrice !== null && (
          <p className="text-[11px] font-medium" style={{ color: "var(--muted-foreground-subtle)" }}>
            Gold ₹{goldPrice.toLocaleString("en-IN")}/g
          </p>
        )}
        {silverPrice !== null && (
          <p className="text-[11px] font-medium" style={{ color: "var(--muted-foreground-subtle)" }}>
            Silver ₹{silverPrice.toLocaleString("en-IN")}/g
          </p>
        )}
      </div>
    );
  }

  // full variant
  if (loading && !rates) {
    return (
      <div className="rounded-[14px] bg-[#F4F3EA] border border-[#EAE9DF] px-5 py-3 w-full flex items-center justify-between">
        <p className="text-[13px]" style={{ color: "var(--muted-foreground-subtle)" }}>
          Loading market rates...
        </p>
      </div>
    );
  }
  if ((error || noData) && !rates) {
    return (
      <div className="rounded-[14px] bg-[#F4F3EA] border border-[#EAE9DF] px-5 py-3 w-full flex items-center justify-between">
        <p className="text-[13px]" style={{ color: "var(--muted-foreground-subtle)" }}>
          Rates unavailable
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-[14px] bg-[#F4F3EA] border border-[#EAE9DF] px-5 py-3 w-full flex items-center justify-between flex-wrap gap-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      <div className="flex items-center gap-6 flex-wrap text-[13px] text-[var(--muted-foreground)] font-normal">
        <div className="flex items-center gap-2 font-medium text-[var(--foreground)]">
          <TrendingUp size={16} className="text-[#5E6442]" />
          <span>Market Rates:</span>
        </div>
        {goldPrice !== null && (
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#EAB308] shrink-0" />
            <span>Gold: <span className="font-medium text-[var(--foreground)]">₹{goldPrice.toLocaleString("en-IN")}/g</span></span>
          </div>
        )}
        {silverPrice !== null && (
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#94A3B8] shrink-0" />
            <span>Silver: <span className="font-medium text-[var(--foreground)]">₹{silverPrice.toLocaleString("en-IN")}/g</span></span>
          </div>
        )}
        {updatedAt && (
          <div className="flex items-center gap-1.5">
            <Clock size={14} />
            <span>{relativeTime(updatedAt)}</span>
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={loadRates}
        disabled={loading}
        className="flex items-center gap-1.5 text-[12px] font-semibold text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors cursor-pointer ml-auto disabled:opacity-50"
      >
        <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        <span>REFRESH</span>
      </button>
    </div>
  );
}
