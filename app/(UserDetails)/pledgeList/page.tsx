"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, Search, ChevronDown, ChevronDown as ChevronDownSmall,
  Calendar, X,
} from "lucide-react";
import SubscriptionGuard from "@/components/SubscriptionGuard";

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */
const ITEM_TYPES = [
  "Ring", "Necklace", "Bangles", "Chain", "Earrings",
  "Bracelet", "Anklet", "Pendant", "Bangle Set", "Other",
] as const;

const METAL_TYPES  = ["GOLD", "SILVER"] as const;
const STATUS_TYPES = ["ACTIVE", "RELEASED", "OVERDUE"] as const;

const DEBOUNCE_MS = 300;

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
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
  itemTypes:         string[];
  metalTypes:        string[];
}

interface Filters {
  search:    string;
  metalType: MetalTypeValue | "";
  itemType:  string;
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
/*  Status config                                                       */
/* ------------------------------------------------------------------ */
const STATUS_CFG: Record<string, { badge: string; border: string; dot: string }> = {
  ACTIVE:   { badge: "bg-[#E8EBD8] text-[#555B3F]",   border: "border-l-[#555B3F]",   dot: "bg-[#555B3F]" },
  RELEASED: { badge: "bg-[#F0EFEC] text-[#6F6F6F]",   border: "border-l-[#C5C7B8]",   dot: "bg-[#C5C7B8]" },
  OVERDUE:  { badge: "bg-[#FEE2E2] text-[#991B1B]",   border: "border-l-[#DC2626]",   dot: "bg-[#DC2626]" },
};

/* ------------------------------------------------------------------ */
/*  Pledge Card                                                         */
/* ------------------------------------------------------------------ */
function PledgeCard({ pledge, onClick }: { pledge: PledgeRow; onClick: () => void }) {
  const cfg = STATUS_CFG[pledge.status] ?? STATUS_CFG.RELEASED;
  const goldWt   = pledge.netWeightOfGold   > 0 ? pledge.netWeightOfGold.toFixed(3)   : null;
  const silverWt = pledge.netWeightOfSilver > 0 ? pledge.netWeightOfSilver.toFixed(3) : null;
  const metalLabel = pledge.metalTypes.join(", ");

  return (
    <div
      onClick={onClick}
      className={`bg-white border border-[#ECEAE4] border-l-4 ${cfg.border} rounded-[16px] hover:border-[#D5D3CC] hover:shadow-sm transition-all cursor-pointer`}
    >
      {/* ── Card Header ── */}
      <div className="flex items-start justify-between px-6 pt-5 pb-4">
        {/* Left — name + date + metal */}
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className="text-[16px] font-semibold text-[#2C2C2C] leading-tight">{pledge.customerName}</span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide ${cfg.badge}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
              {titleCase(pledge.status)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[12px] text-[#8C8F7A]">
            <Calendar size={11} className="text-[#C5C7B8]" />
            <span>{fmtDate(pledge.pledgeDate)}</span>
            <span className="text-[#D8D6CD]">•</span>
            <span className="font-semibold text-[#555B3F]">{metalLabel}</span>
          </div>
        </div>

        {/* Right — Loan Amount */}
        <div className="text-right shrink-0">
          <p className="text-[10px] font-bold tracking-widest text-[#8C8F7A] uppercase mb-1">Loan Amount</p>
          <p className="text-[22px] font-semibold text-[#2C2C2C] tabular-nums leading-none">{fmtINR(pledge.loanAmount)}</p>
        </div>
      </div>

      {/* ── Items Section ── */}
      <div className="mx-6 mb-5 bg-[#F5F4EF] rounded-[10px] px-4 py-3">
        <p className="text-[10px] font-bold tracking-widest text-[#8C8F7A] uppercase mb-1.5">Items Pledged</p>
        <p className="text-[13px] text-[#2C2C2C] font-medium">
          {pledge.itemTypes.length > 0 ? pledge.itemTypes.join(", ") : "—"}
        </p>
      </div>

      {/* ── Divider ── */}
      <div className="border-t border-[#F0EFEC] mx-6" />

      {/* ── Bottom Metadata ── */}
      <div className="flex items-center justify-between px-6 py-3">
        {/* Left — metal weights */}
        <div className="flex items-center gap-3 text-[12px] text-[#6F6F6F]">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#C9A14B]" />
            <span>Gold: <span className="font-semibold text-[#2C2C2C]">{goldWt ?? "0.000"} gm</span></span>
          </div>
          <span className="text-[#D8D6CD]">•</span>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#9E9E9E]" />
            <span>Silver: <span className="font-semibold text-[#2C2C2C]">{silverWt ?? "0.000"} gm</span></span>
          </div>
        </div>

        {/* Right — item count */}
        <p className="text-[12px] text-[#8C8F7A]">
          {pledge.itemCount} type{pledge.itemCount !== 1 ? "s" : ""}{" "}
          <span className="text-[#C5C7B8]">({pledge.totalItems} item{pledge.totalItems !== 1 ? "s" : ""})</span>
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Dropdown select (themed)                                            */
/* ------------------------------------------------------------------ */
function ThemedSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { label: string; value: string }[];
  placeholder: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`appearance-none pl-3 pr-8 py-2 text-[13px] font-medium bg-[#F0EFDF] border border-[#EAE8DD] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#C5C7B8] transition-colors cursor-pointer ${value ? "text-[#555B3F]" : "text-[#6F6F6F]"}`}
      >
        <option value="">{placeholder}</option>
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8C8F7A] pointer-events-none" />
    </div>
  );
}

/* ================================================================== */
/*  Page                                                                */
/* ================================================================== */
export default function PledgesPage() {
  const router = useRouter();

  const [pledges,     setPledges]     = useState<PledgeRow[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [hasMore,     setHasMore]     = useState(false);
  const [nextCursor,  setNextCursor]  = useState<string | null>(null);

  const [filters, setFilters] = useState<Filters>({
    search:    "",
    metalType: "",
    itemType:  "",
    status:    "",
  });

  // Staged filters — applied only on "Apply Filters"
  const [staged, setStaged] = useState<Filters>({
    search:    "",
    metalType: "",
    itemType:  "",
    status:    "",
  });

  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const abortRef    = useRef<AbortController | null>(null);

  /* ── Build query string ────────────────────────────────────────── */
  function buildParams(f: Filters, cursor?: string) {
    const p = new URLSearchParams();
    if (f.metalType) p.set("metalType", f.metalType);
    if (f.itemType)  p.set("itemType",  f.itemType);
    if (f.status)    p.set("status",    f.status);
    if (cursor)      p.set("cursor",    cursor);
    return p;
  }

  /* ── Fetch pledges ─────────────────────────────────────────────── */
  const fetchPledges = useCallback(async (f: Filters, signal: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch(`/api/pledgeList?${buildParams(f)}`, { signal });
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
  }, []);

  /* ── Load more ─────────────────────────────────────────────────── */
  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res  = await fetch(`/api/pledgeList?${buildParams(filters, nextCursor)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load more");
      setPledges(prev => [...prev, ...(data.pledges ?? [])]);
      setHasMore(data.hasMore ?? false);
      setNextCursor(data.nextCursor ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoadingMore(false);
    }
  }

  /* ── Effect: fetch on filter change ───────────────────────────── */
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current)    abortRef.current.abort();

    const controller = new AbortController();
    abortRef.current = controller;

    debounceRef.current = setTimeout(() => {
      fetchPledges(filters, controller.signal);
    }, DEBOUNCE_MS);

    return () => {
      controller.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [filters, fetchPledges]);

  /* ── Handlers ──────────────────────────────────────────────────── */
  function applyFilters() {
    setFilters({ ...staged });
  }
  function resetFilters() {
    const empty: Filters = { search: "", metalType: "", itemType: "", status: "" };
    setStaged(empty);
    setFilters(empty);
  }

  // Client-side search filter applied on top of server results
  const displayed = filters.search
    ? pledges.filter(p =>
        p.customerName.toLowerCase().includes(filters.search.toLowerCase()) ||
        p.id.toLowerCase().includes(filters.search.toLowerCase()) ||
        p.itemTypes.some(t => t.toLowerCase().includes(filters.search.toLowerCase()))
      )
    : pledges;

  const hasActiveFilters = !!(staged.metalType || staged.itemType || staged.status);

  /* ================================================================ */
  return (
    <SubscriptionGuard featureName="pledges">
      <div className="max-w-[900px] mx-auto pb-16 mt-4 font-sans text-[#2C2C2C]">

        {/* ── PAGE HEADER ── */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-[28px] font-medium tracking-tight text-[#2C2C2C] leading-none mb-1.5">
              All Pledges
            </h1>
            <p className="text-[13px] text-[#8C8F7A]">View and manage all customer pledges.</p>
          </div>

          {/* Results Card */}
          <div className="bg-white rounded-2xl border border-[#E8E6DF] w-[100px] flex flex-col justify-center items-center shadow-sm py-4 shrink-0">
            <div className="text-[9px] font-bold tracking-widest text-[#646657] uppercase mb-1.5">
              Results
            </div>
            <div className="text-[32px] font-semibold text-[#51553A] leading-none mb-0.5">
              {loading ? "—" : displayed.length}
            </div>
            <div className="text-[9px] font-bold text-[#51553A] uppercase tracking-widest mt-1">
              Pledges
            </div>
          </div>
        </div>

        {/* ── SEARCH & FILTER BAR ── */}
        <div className="bg-[#F5F4EF] rounded-2xl border border-[#E8E6DF] p-4 mb-7">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[220px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8C8F7A] pointer-events-none" />
              <input
                type="text"
                value={staged.search}
                onChange={e => {
                  setStaged(s => ({ ...s, search: e.target.value }));
                  setFilters(f => ({ ...f, search: e.target.value }));
                }}
                placeholder="Search by customer name, ID, or item..."
                className="w-full pl-9 pr-8 py-2.5 text-[13px] bg-white border border-[#E8E6DF] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#C5C7B8] text-[#2C2C2C] placeholder-[#8C8F7A]"
              />
              {staged.search && (
                <button
                  onClick={() => { setStaged(s => ({ ...s, search: "" })); setFilters(f => ({ ...f, search: "" })); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9E9E9E] hover:text-[#2C2C2C]"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Metal Type */}
            <ThemedSelect
              value={staged.metalType}
              onChange={v => setStaged(s => ({ ...s, metalType: v as MetalTypeValue | "" }))}
              placeholder="All Metal Types"
              options={METAL_TYPES.map(m => ({ label: titleCase(m), value: m }))}
            />

            {/* Item Type */}
            <ThemedSelect
              value={staged.itemType}
              onChange={v => setStaged(s => ({ ...s, itemType: v }))}
              placeholder="All Items"
              options={ITEM_TYPES.map(t => ({ label: t, value: t }))}
            />

            {/* Status */}
            <ThemedSelect
              value={staged.status}
              onChange={v => setStaged(s => ({ ...s, status: v as StatusValue | "" }))}
              placeholder="All Statuses"
              options={STATUS_TYPES.map(s => ({ label: titleCase(s), value: s }))}
            />

            {/* Reset */}
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="text-[13px] font-medium text-[#6F6F6F] hover:text-[#2C2C2C] transition-colors px-1"
              >
                Reset
              </button>
            )}

            {/* Apply */}
            <button
              onClick={applyFilters}
              className="ml-auto bg-[#555B3F] hover:bg-[#3D4230] text-white text-[13px] font-semibold px-5 py-2.5 rounded-[10px] transition-colors"
            >
              Apply Filters
            </button>
          </div>
        </div>

        {/* ── PLEDGE CARDS ── */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-[#555B3F]" size={28} />
          </div>
        ) : error ? (
          <div className="rounded-[16px] border border-red-200 bg-red-50 px-5 py-4 text-[13px] text-red-700">
            {error}
          </div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-20 space-y-2">
            <p className="text-[14px] text-[#8C8F7A]">No pledges found.</p>
            {hasActiveFilters && (
              <button onClick={resetFilters} className="text-[13px] text-[#555B3F] underline hover:opacity-70">
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {displayed.map(p => (
                <PledgeCard
                  key={p.id}
                  pledge={p}
                  onClick={() => router.push(`/customers/${p.customerId}/pledges/${p.id}`)}
                />
              ))}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="flex items-center gap-2 px-6 py-3 text-[13px] font-semibold text-[#555B3F] bg-white border border-[#ECEAE4] rounded-full hover:border-[#C5C7B8] hover:bg-[#F5F4EF] transition-all disabled:opacity-50"
                >
                  {loadingMore ? (
                    <><Loader2 className="animate-spin" size={14} /> Loading…</>
                  ) : (
                    <>Load more pledges <ChevronDownSmall size={14} /></>
                  )}
                </button>
              </div>
            )}
          </>
        )}

      </div>
    </SubscriptionGuard>
  );
}