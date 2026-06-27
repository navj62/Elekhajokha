"use client";

import { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";

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

  useEffect(() => {
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
          <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            Loading rates...
          </p>
        </div>
      );
    }
    if (error || noData) {
      return (
        <div className="px-8 pb-3">
          <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            Rates unavailable
          </p>
        </div>
      );
    }
    return (
      <div className="px-8 pb-3 flex flex-col gap-0.5">
        {goldPrice !== null && (
          <p className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>
            Gold ₹{goldPrice.toLocaleString("en-IN")}/g
          </p>
        )}
        {silverPrice !== null && (
          <p className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>
            Silver ₹{silverPrice.toLocaleString("en-IN")}/g
          </p>
        )}
      </div>
    );
  }

  // full variant
  if (loading) {
    return (
      <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>
        Loading rates...
      </p>
    );
  }
  if (error || noData) {
    return (
      <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>
        Rates unavailable
      </p>
    );
  }
  return (
    <div className="flex items-center gap-1.5">
      <TrendingUp size={13} style={{ color: "var(--text-muted)" }} />
      <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>
        {goldPrice !== null && `Gold ₹${goldPrice.toLocaleString("en-IN")}/g`}
        {goldPrice !== null && silverPrice !== null && " · "}
        {silverPrice !== null && `Silver ₹${silverPrice.toLocaleString("en-IN")}/g`}
        {updatedAt && ` · Updated ${relativeTime(updatedAt)}`}
      </p>
    </div>
  );
}
