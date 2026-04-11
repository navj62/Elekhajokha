"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useCallback } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import SubscriptionGuard from "@/components/SubscriptionGuard";
import { Loader2, Search, X, UserPlus } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */
const FILTER_OPTIONS = [
  { value: "all",      label: "All Fields" },
  { value: "name",     label: "Name"       },
  { value: "region",   label: "Region"     }, // ✅ was "address"
  { value: "itemName", label: "Item Name"  },
  { value: "itemType", label: "Item Type"  }, // ✅ new
];

const STATUS_OPTIONS = [
  { value: "",         label: "All Statuses" },
  { value: "ACTIVE",   label: "Active"       },
  { value: "RELEASED", label: "Released"     },
  { value: "OVERDUE",  label: "Overdue"      },
];

const DEBOUNCE_MS = 400;
const TOAST_MS    = 4000;

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
type Customer = {
  id:          string;
  name:        string;
  region:      string; // ✅ added
  pledgeCount: number;
  latestItem:  string | null;
};

/* ================================================================== */
/*  Page                                                                */
/* ================================================================== */
export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search,    setSearch]    = useState("");
  const [filter,    setFilter]    = useState("all");
  const [status,    setStatus]    = useState("");

  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const toastRef    = useRef<NodeJS.Timeout | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  /* ── Toast ─────────────────────────────────────────────────────── */
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastRef.current) clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToastMessage(null), TOAST_MS);
  }, []);

  /* ── Fetch ─────────────────────────────────────────────────────── */
  const fetchCustomers = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);

    const query = new URLSearchParams();
    if (search) query.set("q",      search);
    if (filter) query.set("filter", filter);
    if (status) query.set("status", status);

    try {
      const res  = await fetch(`/api/customers/search?${query.toString()}`, { signal });
      const data = await res.json();

      if (!res.ok) throw new Error(data?.error || "Failed to fetch customers");
      setCustomers(data.customers ?? []);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      const msg = err instanceof Error ? err.message : "Unexpected error";
      setCustomers([]);
      setError(msg);
      showToast(msg);
    } finally {
      setLoading(false);
    }
  }, [search, filter, status, showToast]);

  /* ── Single effect — debounced fetch on every dep change ─────── */
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const controller = new AbortController();

    debounceRef.current = setTimeout(() => {
      fetchCustomers(controller.signal);
    }, DEBOUNCE_MS);

    return () => {
      controller.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [fetchCustomers]);

  /* ── Toast cleanup ─────────────────────────────────────────────── */
  useEffect(() => {
    return () => { if (toastRef.current) clearTimeout(toastRef.current); };
  }, []);

  // ✅ Show status filter for item-related searches
  const showStatusFilter =
    filter === "itemName" || filter === "itemType" || filter === "all";

  /* ================================================================ */
  return (
    <SubscriptionGuard featureName="customers">
      <div className="max-w-4xl mx-auto p-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Customers</h1>
          <Link
            href="/add-customer"
            className="flex items-center gap-1.5 text-sm bg-black text-white px-4 py-2 rounded-lg hover:opacity-80 transition-opacity"
          >
            <UserPlus size={15} />
            Add Customer
          </Link>
        </div>

        {/* Search & filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customers…"
              className="w-full border pl-8 pr-8 py-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border px-3 py-2 rounded text-sm"
          >
            {FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {showStatusFilter && (
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="border px-3 py-2 rounded text-sm"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          )}
        </div>

        {/* Result count */}
        {!loading && !error && (
          <p className="text-xs text-gray-400 -mt-2">
            {customers.length} customer{customers.length !== 1 ? "s" : ""} found
            {search && ` for "${search}"`}
          </p>
        )}

        {/* States */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin text-gray-300" size={28} />
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : customers.length === 0 ? (
          <div className="text-center py-16 text-sm text-gray-400 space-y-2">
            <p>No customers found.</p>
            {search && (
              <button
                onClick={() => setSearch("")}
                className="text-xs underline hover:text-gray-600"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <ul className="space-y-3">
            {customers.map((cust) => (
              <li key={cust.id}>
                <Link
                  href={`/customers/${cust.id}`}
                  className="flex items-center justify-between border p-4 rounded-lg bg-white hover:border-gray-300 hover:shadow-sm transition-all"
                >
                  <div>
                    <h2 className="font-semibold text-gray-900">{cust.name}</h2>
                    {/* ✅ Show region instead of nothing */}
                    <p className="text-xs text-gray-400 mt-0.5">{cust.region}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Latest: {cust.latestItem || "—"}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block text-xs font-medium bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                      {cust.pledgeCount} pledge{cust.pledgeCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

      </div>

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-gray-900 text-white px-4 py-3 shadow-lg text-sm max-w-xs">
          {toastMessage}
        </div>
      )}
    </SubscriptionGuard>
  );
}