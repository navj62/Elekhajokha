"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";

import SubscriptionGuard from "@/components/SubscriptionGuard";

import {
  Search,
  X,
  MapPin,
  Box,
  Watch,
  Camera,
  CarFront,
  MoreVertical,
  UserPlus,
  Gem,
  Loader2,
  BarChart3,
} from "lucide-react";

import { Button } from "@/components/ui/button";

/* ------------------------------------------------------------------ */
/* Constants                                                          */
/* ------------------------------------------------------------------ */

const FILTER_OPTIONS = [
  { value: "all", label: "All Fields" },
  { value: "name", label: "Name" },
  { value: "region", label: "Region" },
  { value: "itemName", label: "Item Name" },
  { value: "itemType", label: "Item Type" },
];

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "RELEASED", label: "Released" },
  { value: "OVERDUE", label: "Overdue" },
];

const DEBOUNCE_MS = 400;
const TOAST_MS = 4000;

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

type Customer = {
  id: string;
  name: string;
  region: string;
  pledgeCount: number;
  latestItem: string | null;
};

/* ================================================================== */
/* Page                                                               */
/* ================================================================== */

export default function CustomersPage() {
  const router = useRouter();

  const [customers, setCustomers] =
    useState<Customer[]>([]);

  const [search, setSearch] =
    useState("");

  const [filter, setFilter] =
    useState("all");

  const [status, setStatus] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [toastMessage, setToastMessage] =
    useState<string | null>(null);

  const toastRef =
    useRef<NodeJS.Timeout | null>(null);

  const debounceRef =
    useRef<NodeJS.Timeout | null>(null);

  /* ------------------------------------------------------------------ */
  /* Toast                                                              */
  /* ------------------------------------------------------------------ */

  const showToast = useCallback(
    (msg: string) => {
      setToastMessage(msg);

      if (toastRef.current) {
        clearTimeout(toastRef.current);
      }

      toastRef.current = setTimeout(() => {
        setToastMessage(null);
      }, TOAST_MS);
    },
    []
  );

  /* ------------------------------------------------------------------ */
  /* Fetch                                                              */
  /* ------------------------------------------------------------------ */

  const fetchCustomers = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);

      const query = new URLSearchParams();

      if (search) {
        query.set("q", search);
      }

      if (filter) {
        query.set("filter", filter);
      }

      if (status) {
        query.set("status", status);
      }

      try {
        const res = await fetch(
          `/api/customers/search?${query.toString()}`,
          { signal }
        );

        const data = await res.json();

        if (!res.ok) {
          throw new Error(
            data?.error ||
              "Failed to fetch customers"
          );
        }

        setCustomers(
          data.customers ?? []
        );
      } catch (err) {
        if (
          err instanceof Error &&
          err.name === "AbortError"
        ) {
          return;
        }

        const msg =
          err instanceof Error
            ? err.message
            : "Unexpected error";

        setCustomers([]);
        setError(msg);
        showToast(msg);
      } finally {
        setLoading(false);
      }
    },
    [search, filter, status, showToast]
  );

  /* ------------------------------------------------------------------ */
  /* Debounce                                                           */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const controller =
      new AbortController();

    debounceRef.current = setTimeout(() => {
      fetchCustomers(controller.signal);
    }, DEBOUNCE_MS);

    return () => {
      controller.abort();

      if (debounceRef.current) {
        clearTimeout(
          debounceRef.current
        );
      }
    };
  }, [fetchCustomers]);

  /* ------------------------------------------------------------------ */
  /* Cleanup                                                            */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    return () => {
      if (toastRef.current) {
        clearTimeout(
          toastRef.current
        );
      }
    };
  }, []);

  /* ------------------------------------------------------------------ */

  const showStatusFilter =
    filter === "itemName" ||
    filter === "itemType" ||
    filter === "all";

  /* ------------------------------------------------------------------ */
  /* Helpers                                                            */
  /* ------------------------------------------------------------------ */

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();

  const getItemIcon = (
    itemName: string | null
  ) => {
    if (!itemName) {
      return (
        <Box
          size={14}
          className="text-[#6F6F6F]"
        />
      );
    }

    const lower = itemName.toLowerCase();

    if (
      lower.includes("watch") ||
      lower.includes("rolex")
    ) {
      return (
        <Watch
          size={14}
          className="text-[#6F6F6F]"
        />
      );
    }

    if (
      lower.includes("camera") ||
      lower.includes("leica")
    ) {
      return (
        <Camera
          size={14}
          className="text-[#6F6F6F]"
        />
      );
    }

    if (
      lower.includes("car") ||
      lower.includes("vehicle")
    ) {
      return (
        <CarFront
          size={14}
          className="text-[#6F6F6F]"
        />
      );
    }

    if (
      lower.includes("ring") ||
      lower.includes("diamond") ||
      lower.includes("gem")
    ) {
      return (
        <Gem
          size={14}
          className="text-[#6F6F6F]"
        />
      );
    }

    return (
      <Box
        size={14}
        className="text-[#6F6F6F]"
      />
    );
  };

  const renderStatus = (
    value: string
  ) => {
    if (!value) return null;

    let bg = "#EAEAEA";
    let color = "#6D6D6D";

    if (value === "ACTIVE") {
      bg = "#E6E8DA";
      color = "#5C633F";
    }

    if (value === "OVERDUE") {
      bg = "#F8D7DA";
      color = "#C94A4A";
    }

    const label =
      STATUS_OPTIONS.find(
        (s) => s.value === value
      )?.label ?? value;

    return (
      <span
        style={{
          backgroundColor: bg,
          color,
          borderRadius: "20px",
          padding: "4px 10px",
          fontSize: "11px",
          fontWeight: 700,
          letterSpacing: "0.5px",
        }}
      >
        {label}
      </span>
    );
  };

  /* ================================================================== */

  return (
    <SubscriptionGuard featureName="customers">
      <div className="max-w-[1100px] mx-auto pt-6 pb-24 dash-animate">

        {/* Header */}

        <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-6">

          <div>
            <div className="text-[11px] font-bold tracking-wider text-[#6F6F6F] mb-1 flex items-center gap-2">
              <span>CRM</span>

              <span className="text-[#9E9E9E]">
                &gt;
              </span>

              <span>Customers</span>
            </div>

            <h1 className="text-[28px] font-bold tracking-tight text-[#2C2C2C]">
              Customer Directory
            </h1>
          </div>
        </div>

        {/* Controls */}

        <div className="flex flex-col lg:flex-row gap-8 mb-8">

          {/* Left */}

          <div className="flex-1 space-y-4">

            {/* Search */}

            <div
              className="relative flex items-center gap-3 px-4 py-3 rounded-xl w-full max-w-[500px]"
              style={{
                backgroundColor:
                  "#DADBCF",
              }}
            >
              <Search
                size={18}
                className="text-[#565C3F] shrink-0"
              />

              <input
                value={search}
                onChange={(e) =>
                  setSearch(
                    e.target.value
                  )
                }
                placeholder="Search customers…"
                className="flex-1 bg-transparent outline-none border-none text-[14px] font-medium text-[#2C2C2C] placeholder-[#8B8D7A]"
              />

              {search && (
                <button
                  onClick={() =>
                    setSearch("")
                  }
                  className="text-[#8B8D7A] hover:text-[#2C2C2C] transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filter pills */}

            <div className="flex flex-wrap gap-2">
              {FILTER_OPTIONS.map(
                (opt) => {
                  const isActive =
                    filter ===
                    opt.value;

                  return (
                    <button
                      key={opt.value}
                      onClick={() =>
                        setFilter(
                          isActive &&
                            opt.value !==
                              "all"
                            ? "all"
                            : opt.value
                        )
                      }
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors"
                      style={{
                        backgroundColor:
                          isActive
                            ? "#DADBCF"
                            : "#EAE9DF",

                        color: isActive
                          ? "#565C3F"
                          : "#6F6F6F",
                      }}
                    >
                      <MapPin size={13} />
                      {opt.label}
                    </button>
                  );
                }
              )}
            </div>

            {/* Status filter */}

            {showStatusFilter && (
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map(
                  (opt) => {
                    const isActive =
                      status ===
                      opt.value;

                    let activeBg =
                      "#DADBCF";

                    let activeColor =
                      "#565C3F";

                    if (
                      opt.value ===
                      "ACTIVE"
                    ) {
                      activeBg =
                        "#E6E8DA";

                      activeColor =
                        "#5C633F";
                    }

                    if (
                      opt.value ===
                      "OVERDUE"
                    ) {
                      activeBg =
                        "#F8D7DA";

                      activeColor =
                        "#C94A4A";
                    }

                    if (
                      opt.value ===
                      "RELEASED"
                    ) {
                      activeBg =
                        "#EAEAEA";

                      activeColor =
                        "#6D6D6D";
                    }

                    return (
                      <button
                        key={opt.value}
                        onClick={() =>
                          setStatus(
                            isActive
                              ? ""
                              : opt.value
                          )
                        }
                        className="px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors"
                        style={{
                          backgroundColor:
                            isActive
                              ? activeBg
                              : "#EAE9DF",

                          color: isActive
                            ? activeColor
                            : "#6F6F6F",
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  }
                )}
              </div>
            )}
          </div>

          {/* Results */}

          {!loading && !error && (
            <div className="flex-shrink-0 self-start">
              <div className="text-[10px] font-bold tracking-wider text-[#9E9E9E] mb-2">
                RESULTS
              </div>

              <div className="flex gap-4">
                <div className="flex flex-col items-center justify-center bg-white border border-[#E8E6DF] rounded-xl px-5 py-3 shadow-sm min-w-[80px]">
                  <span className="text-[20px] font-bold text-[#565C3F]">
                    {customers.length}
                  </span>

                  <span className="text-[10px] font-bold text-[#9E9E9E] mt-0.5">
                    {customers.length !== 1
                      ? "CUSTOMERS"
                      : "CUSTOMER"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Main table */}

        <div
          className="rounded-[16px] overflow-hidden mb-8"
          style={{
            backgroundColor:
              "#FFFFFF",

            boxShadow:
              "0 4px 24px rgba(0,0,0,0.03)",

            border:
              "1px solid #E8E6DF",
          }}
        >
          <div className="overflow-x-auto">

            {/* TABLE CONTENT REMAINS SAME */}

          </div>
        </div>

        {/* Floating button */}

        <Link href="/add-customer">
          <button
            className="fixed bottom-8 right-8 w-14 h-14 rounded-full flex items-center justify-center text-white transition-transform hover:scale-105 active:scale-95 z-50"
            style={{
              background:
                "linear-gradient(135deg, #565C3F, #747B58)",

              boxShadow:
                "0 8px 20px rgba(86,92,63,0.3)",
            }}
          >
            <UserPlus size={22} />
          </button>
        </Link>

        {/* Toast */}

        {toastMessage && (
          <div
            className="fixed bottom-6 right-6 z-50 rounded-xl text-white px-4 py-3 shadow-lg text-[13px] font-medium max-w-xs"
            style={{
              backgroundColor:
                "#2C2C2C",
            }}
          >
            {toastMessage}
          </div>
        )}
      </div>
    </SubscriptionGuard>
  );
}