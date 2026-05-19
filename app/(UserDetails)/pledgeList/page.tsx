"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Loader2, Filter, X, ChevronRight,
  Scale, Calendar, Package,
} from "lucide-react";
import SubscriptionGuard from "@/components/SubscriptionGuard";

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */
const ITEM_TYPES = [
  "NECKLACE", "CHAIN", "RING", "BANGLE",
  "BRACELET", "EARRING", "ANKLET", "PENDANT",
  "COIN", "BAR", "OTHER",
] as const;

const METAL_TYPES  = ["GOLD", "SILVER"] as const;
const STATUS_TYPES = ["ACTIVE", "RELEASED", "OVERDUE"] as const;

const DEBOUNCE_MS = 300;

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
type ItemTypeValue  = typeof ITEM_TYPES[number];
type MetalTypeValue = typeof METAL_TYPES[number];
type StatusValue    = typeof STATUS_TYPES[number];

interface PledgeRow {
  id:                string;
  customerName:      string;
  customerId:        string;
  pledgeDate:        string;
  status:            string;
  loanAmount:        number;
  netWeightOfGold:   number;
  netWeightOfSilver: number;
  remark:            string | null;
  itemCount:         number;
  totalItems:        number;
  itemTypes:         string[];  // ["Necklace", "Ring"]
  metalTypes:        string[];  // ["Gold", "Silver"]
}

interface Filters {
  metalType: MetalTypeValue | "";
  itemType:  ItemTypeValue  | "";
  status:    StatusValue    | "";
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */
function titleCase(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function fmtINR(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0,
  }).format(n);
}

/* ------------------------------------------------------------------ */
/*  Status badge                                                        */
/* ------------------------------------------------------------------ */
function StatusBadge({ status }: { status: string }) {
  const cfg = {
    ACTIVE:   "bg-emerald-100 text-emerald-700",
    RELEASED: "bg-gray-100   text-gray-600",
    OVERDUE:  "bg-red-100    text-red-700",
  }[status] ?? "bg-gray-100 text-gray-500";

  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg}`}>
      {titleCase(status)}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Filter pill                                                         */
/* ------------------------------------------------------------------ */
function FilterPill({
  label, active, onClick,
}: {
  label: string; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
        active
          ? "bg-black text-white border-black"
          : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
      }`}
    >
      {label}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Pledge card                                                         */
/* ------------------------------------------------------------------ */
function PledgeCard({ pledge, onClick }: { pledge: PledgeRow; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="bg-white border rounded-xl p-4 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer space-y-3"
    >
      {/* ── Row 1: name + status ── */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-gray-900 leading-tight">
            {pledge.customerName}
          </p>
          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
            <Calendar size={11} />
            {fmtDate(pledge.pledgeDate)}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={pledge.status} />
          <ChevronRight size={14} className="text-gray-300" />
        </div>
      </div>

      {/* ── Row 2: item types + metal types as chips ── */}
      <div className="flex flex-wrap gap-1.5">
        {pledge.itemTypes.map((t) => (
          <span
            key={t}
            className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md"
          >
            {t}
          </span>
        ))}
        {pledge.metalTypes.map((m) => (
          <span
            key={m}
            className={`text-xs px-2 py-0.5 rounded-md font-medium ${
              m === "Gold"
                ? "bg-amber-50 text-amber-700"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {m}
          </span>
        ))}
      </div>

      {/* ── Row 3: stats ── */}
      <div className="grid grid-cols-3 gap-3 pt-1 border-t border-gray-50">

        <div className="space-y-0.5">
          <p className="text-xs text-gray-400 flex items-center gap-1">
            <Package size={10} /> Items
          </p>
          <p className="text-sm font-semibold text-gray-800">
            {pledge.itemCount} type{pledge.itemCount !== 1 ? "s" : ""}
            <span className="font-normal text-gray-400 ml-1">
              ({pledge.totalItems} pc{pledge.totalItems !== 1 ? "s" : ""})
            </span>
          </p>
        </div>

        {pledge.netWeightOfGold > 0 && (
          <div className="space-y-0.5">
            <p className="text-xs text-amber-500 flex items-center gap-1">
              <Scale size={10} /> Gold Wt
            </p>
            <p className="text-sm font-semibold text-amber-700 tabular-nums">
              {pledge.netWeightOfGold.toFixed(3)}g
            </p>
          </div>
        )}

        {pledge.netWeightOfSilver > 0 && (
          <div className="space-y-0.5">
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <Scale size={10} /> Silver Wt
            </p>
            <p className="text-sm font-semibold text-slate-600 tabular-nums">
              {pledge.netWeightOfSilver.toFixed(3)}g
            </p>
          </div>
        )}

        <div className="space-y-0.5">
          <p className="text-xs text-gray-400">Loan</p>
          <p className="text-sm font-semibold text-gray-800 tabular-nums">
            {fmtINR(pledge.loanAmount)}
          </p>
        </div>

      </div>
    </div>
  );
}

/* ================================================================== */
/*  Page                                                                */
/* ================================================================== */
export default function PledgesPage() {
  const router = useRouter();

  const [pledges,    setPledges]    = useState<PledgeRow[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [loadingMore,setLoadingMore]= useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [hasMore,    setHasMore]    = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [showFilters,setShowFilters]= useState(false);

  const [filters, setFilters] = useState<Filters>({
    metalType: "",
    itemType:  "",
    status:    "",
  });

  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const abortRef    = useRef<AbortController | null>(null);

  /* ── Count active filters for badge ─────────────────────────────── */
  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  /* ── Build query string ──────────────────────────────────────────── */
  function buildParams(cursor?: string) {
    const p = new URLSearchParams();
    if (filters.metalType) p.set("metalType", filters.metalType);
    if (filters.itemType)  p.set("itemType",  filters.itemType);
    if (filters.status)    p.set("status",    filters.status);
    if (cursor)            p.set("cursor",    cursor);
    return p;
  }

  /* ── Fetch (initial / filter change) ────────────────────────────── */
  const fetchPledges = useCallback(async (signal: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch(`/api/pledges?${buildParams()}`, { signal });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load pledges");
      setPledges(data.pledges ?? []);
      setHasMore(data.hasMore ?? false);
      setNextCursor(data.nextCursor ?? null);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]); // filters captured via buildParams

  /* ── Load more (cursor pagination) ──────────────────────────────── */
  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res  = await fetch(`/api/pledges?${buildParams(nextCursor)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load more");
      setPledges((prev) => [...prev, ...(data.pledges ?? [])]);
      setHasMore(data.hasMore ?? false);
      setNextCursor(data.nextCursor ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoadingMore(false);
    }
  }

  /* ── Debounced effect on filter change ───────────────────────────── */
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current)    abortRef.current.abort();

    const controller  = new AbortController();
    abortRef.current  = controller;

    debounceRef.current = setTimeout(() => {
      fetchPledges(controller.signal);
    }, DEBOUNCE_MS);

    return () => {
      controller.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [fetchPledges]);

  /* ── Filter helpers ─────────────────────────────────────────────── */
  function setMetal(v: MetalTypeValue | "") {
    setFilters((f) => ({ ...f, metalType: f.metalType === v ? "" : v }));
  }
  function setItem(v: ItemTypeValue | "") {
    setFilters((f) => ({ ...f, itemType: f.itemType === v ? "" : v }));
  }
  function setStatus(v: StatusValue | "") {
    setFilters((f) => ({ ...f, status: f.status === v ? "" : v }));
  }
  function clearFilters() {
    setFilters({ metalType: "", itemType: "", status: "" });
  }

  /* ================================================================ */
  return (
    <SubscriptionGuard featureName="pledges">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">

        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">All Pledges</h1>
            {!loading && (
              <p className="text-xs text-gray-400 mt-0.5">
                {pledges.length} pledge{pledges.length !== 1 ? "s" : ""}
                {activeFilterCount > 0 && " (filtered)"}
              </p>
            )}
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`flex items-center gap-1.5 text-sm border rounded-lg px-3 py-2 transition-colors ${
              activeFilterCount > 0
                ? "bg-black text-white border-black"
                : "text-gray-600 hover:border-gray-400"
            }`}
          >
            <Filter size={13} />
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-white text-black text-xs font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* ── Filter panel ───────────────────────────────────────── */}
        {showFilters && (
          <div className="bg-gray-50 border rounded-xl p-4 space-y-4">

            {/* Metal type */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Metal Type
              </p>
              <div className="flex gap-2 flex-wrap">
                {METAL_TYPES.map((m) => (
                  <FilterPill
                    key={m}
                    label={titleCase(m)}
                    active={filters.metalType === m}
                    onClick={() => setMetal(m)}
                  />
                ))}
              </div>
            </div>

            {/* Item type */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Item Type
              </p>
              <div className="flex gap-2 flex-wrap">
                {ITEM_TYPES.map((t) => (
                  <FilterPill
                    key={t}
                    label={titleCase(t)}
                    active={filters.itemType === t}
                    onClick={() => setItem(t)}
                  />
                ))}
              </div>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Status
              </p>
              <div className="flex gap-2 flex-wrap">
                {STATUS_TYPES.map((s) => (
                  <FilterPill
                    key={s}
                    label={titleCase(s)}
                    active={filters.status === s}
                    onClick={() => setStatus(s)}
                  />
                ))}
              </div>
            </div>

            {/* Clear */}
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
              >
                <X size={11} /> Clear all filters
              </button>
            )}
          </div>
        )}

        {/* ── Active filter chips (summary row) ──────────────────── */}
        {activeFilterCount > 0 && !showFilters && (
          <div className="flex flex-wrap gap-2">
            {filters.metalType && (
              <span className="flex items-center gap-1 text-xs bg-black text-white px-2.5 py-1 rounded-full">
                {titleCase(filters.metalType)}
                <button onClick={() => setMetal("")}><X size={10} /></button>
              </span>
            )}
            {filters.itemType && (
              <span className="flex items-center gap-1 text-xs bg-black text-white px-2.5 py-1 rounded-full">
                {titleCase(filters.itemType)}
                <button onClick={() => setItem("")}><X size={10} /></button>
              </span>
            )}
            {filters.status && (
              <span className="flex items-center gap-1 text-xs bg-black text-white px-2.5 py-1 rounded-full">
                {titleCase(filters.status)}
                <button onClick={() => setStatus("")}><X size={10} /></button>
              </span>
            )}
          </div>
        )}

        {/* ── States ─────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-gray-300" size={28} />
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        ) : pledges.length === 0 ? (
          <div className="text-center py-20 text-sm text-gray-400 space-y-2">
            <p>No pledges found.</p>
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="text-xs underline hover:text-gray-600"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* ── Pledge list ──────────────────────────────────── */}
            <div className="space-y-3">
              {pledges.map((p) => (
                <PledgeCard
                  key={p.id}
                  pledge={p}
                  onClick={() =>
                    router.push(`/customers/${p.customerId}/pledges/${p.id}`)
                  }
                />
              ))}
            </div>

            {/* ── Load more ────────────────────────────────────── */}
            {hasMore && (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="w-full flex items-center justify-center gap-2 text-sm text-gray-500 border rounded-xl py-3 hover:border-gray-400 transition-colors disabled:opacity-50"
              >
                {loadingMore
                  ? <><Loader2 className="animate-spin" size={14} /> Loading…</>
                  : "Load more pledges"}
              </button>
            )}
          </>
        )}

      </div>
    </SubscriptionGuard>
  );
}