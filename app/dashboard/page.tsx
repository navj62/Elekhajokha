"use client";

import { SignOutButton, UserButton } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { Loader2, TrendingUp, RefreshCw } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
interface MetalPrice {
  id:          string;
  metal:       "GOLD" | "SILVER";
  usdPerOunce: number;
  inrPerGram:  number;
  createdAt:   string;
}

interface MarketRates {
  gold:   MetalPrice | null;
  silver: MetalPrice | null;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */
function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style:                "currency",
    currency:             "INR",
    maximumFractionDigits: 2,
  }).format(n);
}

function timeAgo(dateStr: string): string {
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  if (mins  < 1)  return "just now";
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/* ------------------------------------------------------------------ */
/*  Metal Rate Card                                                     */
/* ------------------------------------------------------------------ */
function MetalCard({
  label,
  emoji,
  price,
}: {
  label: string;
  emoji: string;
  price: MetalPrice | null;
}) {
  if (!price) {
    return (
      <div className="rounded-xl border bg-gray-50 p-5 text-center text-sm text-gray-400">
        No {label} data yet — waiting for first cron run.
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-white p-5 space-y-3 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{emoji}</span>
          <span className="font-semibold text-gray-700">{label}</span>
        </div>
        <TrendingUp size={16} className="text-green-500" />
      </div>

      <div>
        <p className="text-2xl font-bold text-gray-900">
          {fmt(price.inrPerGram)}
          <span className="text-sm font-normal text-gray-400 ml-1">/gram</span>
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          ${Number(price.usdPerOunce).toFixed(2)}/oz
        </p>
      </div>

      <p className="text-xs text-gray-400">
        Updated {timeAgo(price.createdAt)}
      </p>
    </div>
  );
}

/* ================================================================== */
/*  Page                                                                */
/* ================================================================== */
export default function DashboardPage() {
  const [rates,      setRates]      = useState<MarketRates | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");
  const [refreshing, setRefreshing] = useState(false);

  async function loadRates(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      // ✅ Cache-bust with timestamp — prevents browser/Next.js serving stale response
      const res  = await fetch(`/api/market-rates?t=${Date.now()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load rates");
      setRates(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load rates");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadRates();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ---- Top bar ----------------------------------------------- */}
      <div className="border-b bg-white px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">Dashboard</h1>
        <div className="flex items-center gap-3">
          <UserButton />
          <SignOutButton>
            <button className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
              Sign out
            </button>
          </SignOutButton>
        </div>
      </div>

      {/* ---- Content ----------------------------------------------- */}
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">

        {/* Market Rates */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                Live Market Rates
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Updated every 2 hours · Yahoo Finance + Alpha Vantage
              </p>
            </div>
            <button
              onClick={() => loadRates(true)}
              disabled={refreshing}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 border rounded-md px-3 py-1.5 transition-colors disabled:opacity-50"
            >
              <RefreshCw
                size={12}
                className={refreshing ? "animate-spin" : ""}
              />
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-gray-300" size={28} />
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Dim cards slightly while refreshing so user sees something is happening */}
              <div className={refreshing ? "opacity-50 transition-opacity" : ""}>
                <MetalCard label="Gold"   emoji="🥇" price={rates?.gold   ?? null} />
              </div>
              <div className={refreshing ? "opacity-50 transition-opacity" : ""}>
                <MetalCard label="Silver" emoji="🥈" price={rates?.silver ?? null} />
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}