"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const filterOptions = [
  { value: "all", label: "All Fields" },
  { value: "name", label: "Name" },
  { value: "address", label: "Address" },
  { value: "itemName", label: "Item Name" },
];

const statusOptions = [
  { value: "", label: "All Statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "RELEASED", label: "Released" },
  { value: "OVERDUE", label: "Overdue" },
];

type Customer = {
  id: string;
  name: string;
  pledgeCount: number;
  latestItem: string | null;
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [status, setStatus] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // ✅ TOAST HELPER
  const showToast = (msg: string) => {
    setToastMessage(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToastMessage(null), 4000);
  };

  // ✅ FETCH FUNCTION (with AbortController)
  const fetchCustomers = async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);

    const query = new URLSearchParams();
    if (search) query.set("q", search);
    if (filter) query.set("filter", filter);
    if (status) query.set("status", status);

    try {
      const res = await fetch(`/api/customers/search?${query.toString()}`, {
        signal,
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data?.error || "Failed to fetch");

      setCustomers(data.customers || []);
    } catch (err: any) {
      if (err.name === "AbortError") return;

      const msg = err?.message || "Unexpected error";
      setCustomers([]);
      setError(msg);
      showToast(msg);
    } finally {
      setLoading(false);
    }
  };

  // ✅ INITIAL LOAD
  useEffect(() => {
    const controller = new AbortController();
    fetchCustomers(controller.signal);

    return () => {
      controller.abort();
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // ✅ AUTO SEARCH (DEBOUNCED)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const controller = new AbortController();

    debounceRef.current = setTimeout(() => {
      fetchCustomers(controller.signal);
    }, 400); // 400ms debounce

    return () => controller.abort();
  }, [search, filter, status]);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Customers</h1>

      {/* SEARCH */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search..."
          className="flex-1 border p-2 rounded min-w-[200px]"
        />

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border p-2 rounded"
        >
          {filterOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {(filter === "itemName" || filter === "all") && (
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border p-2 rounded"
          >
            {statusOptions.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* STATES */}
      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : customers.length === 0 ? (
        <p>No customers found.</p>
      ) : (
        <ul className="space-y-4">
          {customers.map((cust) => (
            <li key={cust.id}>
              <Link
                href={`/customers/${cust.id}`}
                className="block border p-4 rounded shadow-sm bg-white hover:border-gray-300 hover:shadow transition"
              >
                <h2 className="font-semibold text-lg">{cust.name}</h2>
                <p className="text-sm text-gray-500">
                  Pledges: {cust.pledgeCount}
                </p>
                <p className="text-sm text-gray-500">
                  Latest Item: {cust.latestItem || "—"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* TOAST */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-gray-900 text-white px-4 py-3 shadow-lg text-sm">
          {toastMessage}
        </div>
      )}
    </div>
  );
}