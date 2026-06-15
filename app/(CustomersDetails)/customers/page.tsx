"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";

import SubscriptionGuard from "@/components/SubscriptionGuard";
import { useLanguage } from "@/components/providers/LanguageProvider";
import {
  Search,
  Box,
  Watch,
  Camera,
  CarFront,
  Gem,
  Loader2,
  Pin,
  PinOff,
  MapPin,
  ArrowDownAZ,
  Filter,
  UserPlus,
  Calendar,
  X,
} from "lucide-react";


/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

type Customer = {
  id: string;
  name: string;
  region: string;
  pledgeCount: number;
  latestItem: string | null;
  isPinned: boolean;
};

const DEBOUNCE_MS = 400;
const TOAST_MS = 4000;

/* ================================================================== */
/* Page                                                               */
/* ================================================================== */

export default function CustomersPage() {
  const router = useRouter();
  const { t } = useLanguage();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("");
  const [filterBy, setFilterBy] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Dropdown states
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null); // "name", "address", "itemName", "itemType", "filter"

  const toastRef = useRef<NodeJS.Timeout | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  /* ------------------------------------------------------------------ */
  /* Helpers & Hooks                                                    */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastRef.current) clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToastMessage(null), TOAST_MS);
  }, []);

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase();

  const getShortId = (id: string) => `#CU-${id.substring(0, 4).toUpperCase()}`;

  const getItemIcon = (itemName: string | null) => {
    if (!itemName) return <Box size={14} className="text-[#8C8F7A]" />;
    const lower = itemName.toLowerCase();
    if (lower.includes("watch") || lower.includes("rolex")) return <Watch size={14} className="text-[#8C8F7A]" />;
    if (lower.includes("camera") || lower.includes("leica")) return <Camera size={14} className="text-[#8C8F7A]" />;
    if (lower.includes("car") || lower.includes("vehicle")) return <CarFront size={14} className="text-[#8C8F7A]" />;
    if (lower.includes("ring") || lower.includes("diamond") || lower.includes("gem") || lower.includes("brooch")) return <Gem size={14} className="text-[#8C8F7A]" />;
    return <Box size={14} className="text-[#8C8F7A]" />;
  };

  /* ------------------------------------------------------------------ */
  /* Fetch & Pin                                                        */
  /* ------------------------------------------------------------------ */

  const fetchCustomers = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    const query = new URLSearchParams();
    if (search) query.set("q", search);
    if (sortBy) query.set("sortBy", sortBy);
    if (filterBy) query.set("filterBy", filterBy);

    try {
      const res = await fetch(`/api/customers/search?${query.toString()}`, { signal });
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
  }, [search, sortBy, filterBy, showToast]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const controller = new AbortController();
    debounceRef.current = setTimeout(() => fetchCustomers(controller.signal), DEBOUNCE_MS);
    return () => {
      controller.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [fetchCustomers]);

  const togglePin = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/customers/${id}/pin`, { method: "PATCH" });
      if (!res.ok) throw new Error("Failed to update pin status");
      const data = await res.json();
      setCustomers((prev) => {
        const next = prev.map((c) => (c.id === id ? { ...c, isPinned: data.isPinned } : c));
        return next.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return 0; // optimistic sort relies on backend for complete ordering
        });
      });
      showToast(data.isPinned ? "Customer pinned" : "Customer unpinned");
    } catch (err) {
      showToast("Error updating pin status");
    }
  };

  /* ------------------------------------------------------------------ */
  /* Render Helpers                                                     */
  /* ------------------------------------------------------------------ */

  const handleDropdownSelect = (type: "sort" | "filter", val: string) => {
    if (type === "sort") {
      setSortBy(val);
    } else {
      setFilterBy(val);
    }
    setActiveDropdown(null);
  };

  const renderDropdownMenu = (type: string) => {
    if (activeDropdown !== type) return null;

    let options: { label: string; val: string }[] = [];
    if (type === "name") {
      options = [
        { label: "A-Z", val: "name-asc" },
        { label: "Z-A", val: "name-desc" },
        { label: t("reset"), val: "" },
      ];
    } else if (type === "itemType") {
      options = [
        { label: t("gold"), val: "itemtype-gold" },
        { label: t("silver"), val: "itemtype-silver" },
        { label: t("reset"), val: "" },
      ];
    } else if (type === "date") {
      options = [
        { label: "Newest First", val: "newest" },
        { label: "Oldest First", val: "oldest" },
        { label: t("reset"), val: "" },
      ];
    }

    return (
      <div className="absolute top-full left-0 mt-2 w-40 bg-white border border-[#E8E6DF] rounded-xl shadow-lg z-50 overflow-hidden text-[#2C2C2C]">
        {options.map((opt) => (
          <button
            key={opt.val}
            onClick={() => handleDropdownSelect("sort", opt.val)}
            className={`w-full text-left px-4 py-2 text-[13px] font-medium transition-colors hover:bg-[#F5F4EF] ${sortBy === opt.val ? "bg-[#F5F4EF] text-[#565C3F]" : ""
              }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    );
  };

  /* ================================================================== */

  return (
    <SubscriptionGuard featureName="customers">
      <div className="text-[#2C2C2C] font-sans pt-6">

        {/* Header */}
        <div className="mb-10">
          <div className="text-[11px] font-bold tracking-widest text-[#8C8F7A] mb-2 uppercase flex items-center gap-2">
            <span>{t("crm")}</span>
            <span className="text-[#C5C7B8]">&gt;</span>
            <span>{t("customers")}</span>
          </div>
          <h1 className="text-[28px] font-medium tracking-tight text-[#37392C] leading-none">
            {t("customer_directory")}
          </h1>
        </div>

        {/* Search Workspace & Results Panel */}
        <div className="flex flex-col lg:flex-row gap-8 mb-8">
          <div className="flex-1 bg-[#F5F4EF] rounded-2xl p-6 border border-[#E8E6DF] relative">
            <div className="flex items-center gap-3 bg-[#EAE9DF] rounded-xl px-4 py-3 border border-[#D8D6CD] mb-6">
              <Search size={18} className="text-[#565C3F]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("Search by name, item type or date")}
                className="flex-1 bg-transparent outline-none border-none text-[15px] text-[#2C2C2C] placeholder-[#8C8F7A]"
              />
              {search.length > 0 && (
                <button
                  onClick={() => setSearch("")}
                  className="text-[#8C8F7A] hover:text-[#2C2C2C] transition-colors p-1 rounded-md"
                  aria-label="Clear search"
                >
                  <X size={24} className="hover:bg-[#565C3F] hover:text-white text-[#565C3F] rounded-full p-1 cursor-pointer " />
                </button>
              )}
            </div>

            {/* Sort & Filter Pills */}
            <div className="flex flex-wrap items-center gap-3" ref={dropdownRef}>
              <div className="relative">
                <button
                  onClick={() => setActiveDropdown(activeDropdown === "name" ? null : "name")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium transition-colors ${sortBy.startsWith("name") ? "bg-[#EAE9DF] text-[#2C2C2C] border border-[#D8D6CD]" : "bg-[#F0EEDC] text-[#565C3F] border border-transparent hover:bg-[#EAE9DF]"}`}
                >
                  <ArrowDownAZ size={14} /> {t("sort_by_name")}
                </button>
                {renderDropdownMenu("name")}
              </div>

              <div className="relative">
                <button
                  onClick={() => setActiveDropdown(activeDropdown === "date" ? null : "date")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium transition-colors ${sortBy === "newest" || sortBy === "oldest" ? "bg-[#EAE9DF] text-[#2C2C2C] border border-[#D8D6CD]" : "bg-[#F0EEDC] text-[#565C3F] border border-transparent hover:bg-[#EAE9DF]"}`}
                >
                  <Calendar size={14} /> Sort by Date
                </button>
                {renderDropdownMenu("date")}
              </div>

              <div className="relative">
                <button
                  onClick={() => setActiveDropdown(activeDropdown === "itemType" ? null : "itemType")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium transition-colors ${sortBy.startsWith("itemtype") ? "bg-[#EAE9DF] text-[#2C2C2C] border border-[#D8D6CD]" : "bg-[#F0EEDC] text-[#565C3F] border border-transparent hover:bg-[#EAE9DF]"}`}
                >
                  <Box size={14} /> {t("item_type")}
                </button>
                {renderDropdownMenu("itemType")}
              </div>
            </div>
          </div>

          {/* Results Panel */}
          <div className="bg-white rounded-2xl border border-[#E8E6DF] w-full lg:w-[220px] flex flex-col justify-center items-center shadow-sm py-6 h-auto self-stretch">
            <div className="text-[10px] font-bold tracking-widest text-[#646657] uppercase mb-4">
              {t("results")}
            </div>
            <div className="text-[48px] font-semibold text-[#51553A] leading-none mb-1">
              {customers.length}
            </div>
            <div className="text-[11px] font-bold text-[#51553A] uppercase tracking-widest mt-1">
              {t("customers")}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-[#E8E6DF] rounded-2xl shadow-sm overflow-hidden mb-8">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#3D4230] border-b border-[#2C2E1F]">
                  <th className="w-12 px-6 py-3.5 text-center text-[11px] font-semibold tracking-wider text-white">#</th>
                  <th className="text-left px-6 py-3.5 text-[11px] font-semibold tracking-wider text-white">{t("col_customer_details").toUpperCase()}</th>
                  <th className="text-left px-6 py-3.5 text-[11px] font-semibold tracking-wider text-white">{t("col_address").toUpperCase()}</th>
                  <th className="text-left px-6 py-3.5 text-[11px] font-semibold tracking-wider text-white">{t("col_primary_item").toUpperCase()}</th>
                  <th className="text-center px-6 py-3.5 text-[11px] font-semibold tracking-wider text-white">{t("pledges").toUpperCase()}</th>
                  <th className="px-6 py-3.5" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-20">
                      <Loader2 className="animate-spin mx-auto text-[#565C3F]" size={24} />
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={6} className="text-center py-20 text-[#C94A4A] text-[13px]">{error}</td>
                  </tr>
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-20">
                      <div className="text-[13px] font-medium text-[#8C8F7A]">{t("no_customers_found")}</div>
                    </td>
                  </tr>
                ) : (
                  customers.map((customer, index) => (
                    <tr
                      key={customer.id}
                      className="group border-b border-[#F0EEE8] hover:bg-[#FCFCFA] transition-colors cursor-pointer"
                      onClick={() => router.push(`/customers/${customer.id}`)}
                    >
                      {/* Number / Pin Indicator */}
                      <td className="px-6 py-5 text-center align-middle">
                        {customer.isPinned ? (
                          <Pin size={14} className="mx-auto text-[#565C3F] fill-[#565C3F] -rotate-45" />
                        ) : (
                          <span className="text-[13px] font-semibold text-[#8C8F7A]">{index + 1}</span>
                        )}
                      </td>

                      {/* Details */}
                      <td className="px-6 py-5 align-middle">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-semibold text-[#565C3F] bg-[#F0EEDC] shrink-0 border border-[#D8D6CD]">
                            {getInitials(customer.name)}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-[#2C2C2C] text-[13px]">{customer.name}</span>
                            <span className="text-[#8C8F7A] text-[11px] mt-0.5">ID: {getShortId(customer.id)}</span>
                          </div>
                        </div>
                      </td>

                      {/* Region */}
                      <td className="px-6 py-5 align-middle">
                        <div className="text-[#6F6F6F] text-[13px] max-w-[200px] truncate leading-relaxed">
                          {customer.region || "—"}
                        </div>
                      </td>

                      {/* Latest Item */}
                      <td className="px-6 py-5 align-middle">
                        <div className="flex items-center gap-2 text-[#2C2C2C] font-medium text-[13px]">
                          {getItemIcon(customer.latestItem)}
                          <span className="truncate max-w-[150px]">{customer.latestItem || "—"}</span>
                        </div>
                      </td>

                      {/* Pledges */}
                      <td className="px-6 py-5 text-center align-middle">
                        <span className="inline-block text-[#2C2C2C] font-semibold text-[13px]">
                          {customer.pledgeCount}
                        </span>
                      </td>

                      {/* Pin Action */}
                      <td className="px-6 py-5 text-right align-middle">
                        <button
                          onClick={(e) => togglePin(customer.id, e)}
                          className="p-2 text-[#C5C7B8] hover:text-[#565C3F] hover:bg-[#F0EEDC] rounded-lg transition-all group-hover:opacity-100 opacity-0"
                          title={customer.isPinned ? "Unpin Customer" : "Pin Customer"}
                        >
                          {customer.isPinned ? <PinOff size={18} /> : <Pin size={18} />}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Floating Add Customer */}
        <Link href="/add-customer">
          <button className="fixed bottom-8 right-8 w-14 h-14 rounded-full flex items-center justify-center text-white transition-transform hover:scale-105 active:scale-95 z-50 bg-[#565C3F] shadow-lg">
            <UserPlus size={22} />
          </button>
        </Link>

        {/* Toast */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-[#2C2C2C] text-white px-5 py-3 shadow-lg text-[13px] font-medium">
            {toastMessage}
          </div>
        )}
      </div>
    </SubscriptionGuard>
  );
}