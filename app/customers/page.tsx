"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import DashboardLayout from "../dashboard/layout";
import { Search, MapPin, Box, Watch, Camera, CarFront, MoreVertical, Plus, UserPlus, Gem, Loader2 } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { getStatusKey } from "@/lib/translations";

type Customer = {
  id: string;
  name: string;
  address?: string;
  pledgeCount: number;
  latestItem: string | null;
  latestLoanAmount?: string | number | null;
  latestStatus?: "ACTIVE" | "RELEASED" | "OVERDUE" | null;
};

export default function CustomersPage() {
  const router = useRouter();
  const { language, t } = useLanguage();
  const locale = language === "hi" ? "hi-IN" : "en-IN";
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const stats = { active: 124, released: 42, overdue: 8 };

  const filterOptions = [
    { value: "name", label: t("sort_by_name"), icon: <MapPin size={14} /> },
    { value: "address", label: t("sort_by_address"), icon: <MapPin size={14} /> },
    { value: "itemName", label: t("sort_by_item"), icon: <Box size={14} /> },
  ];

  const fetchCustomers = async (currentPage: number, isNewSearch: boolean, signal?: AbortSignal) => {
    if (isNewSearch) setLoading(true);
    else setLoadingMore(true);
    setError(null);

    const query = new URLSearchParams();
    if (search) query.set("q", search);
    if (filter !== "all") query.set("filter", filter);
    query.set("page", currentPage.toString());

    try {
      const res = await fetch(`/api/customers/search?${query.toString()}`, { signal });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to fetch");

      setHasMore(data.hasMore ?? false);

      if (isNewSearch) {
        setCustomers(data.customers || []);
      } else {
        setCustomers(prev => [...prev, ...(data.customers || [])]);
      }
    } catch (err: any) {
      if (err.name === "AbortError") return;
      setError(err?.message || "Unexpected error");
      if (isNewSearch) setCustomers([]);
    } finally {
      if (isNewSearch) setLoading(false);
      else setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const controller = new AbortController();

    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchCustomers(1, true, controller.signal);
    }, 400);

    return () => {
      controller.abort();
    };
  }, [search, filter]);

  useEffect(() => {
    if (page === 1) return;
    const controller = new AbortController();
    fetchCustomers(page, false, controller.signal);
    return () => controller.abort();
  }, [page]);

  useEffect(() => {
    if (loading || loadingMore || !hasMore) return;

    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prev => prev + 1);
      }
    });

    if (loadMoreRef.current) observerRef.current.observe(loadMoreRef.current);

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [loading, loadingMore, hasMore]);

  const renderStatus = (status?: string | null) => {
    if (!status) return null;
    let bg = "#EAEAEA";
    let text = "#6D6D6D";
    if (status === "ACTIVE") { bg = "#E6E8DA"; text = "#5C633F"; }
    else if (status === "OVERDUE") { bg = "#F8D7DA"; text = "#C94A4A"; }

    const statusKey = getStatusKey(status);
    return (
      <span
        style={{ backgroundColor: bg, color: text, borderRadius: "20px", padding: "4px 10px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.5px" }}
      >
        {t(statusKey)}
      </span>
    );
  };

  const getRandomItemIcon = (itemName: string | null) => {
    if (!itemName) return <Box size={14} className="text-[#6F6F6F]" />;
    const lower = itemName.toLowerCase();
    if (lower.includes("watch") || lower.includes("rolex")) return <Watch size={14} className="text-[#6F6F6F]" />;
    if (lower.includes("camera") || lower.includes("leica")) return <Camera size={14} className="text-[#6F6F6F]" />;
    if (lower.includes("car") || lower.includes("sg") || lower.includes("vehicle")) return <CarFront size={14} className="text-[#6F6F6F]" />;
    if (lower.includes("ring") || lower.includes("brooch") || lower.includes("diamond")) return <Gem size={14} className="text-[#6F6F6F]" />;
    return <Box size={14} className="text-[#6F6F6F]" />;
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
  };

  return (
    <DashboardLayout>
      <div className="max-w-[1100px] mx-auto pt-6 pb-24 dash-animate">

        {/* Header Section */}
        <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="text-[11px] font-bold tracking-wider text-[#6F6F6F] mb-1 flex items-center gap-2">
              <span>{t("crm")}</span> <span className="text-[#9E9E9E]">&gt;</span> <span>{t("customers")}</span>
            </div>
            <h1 className="text-[28px] font-bold tracking-tight text-[#2C2C2C]">
              {t("customer_directory")}
            </h1>
          </div>
        </div>

        {/* Controls & Account Status */}
        <div className="flex flex-col lg:flex-row gap-8 mb-8">
          {/* Left: Search & Filter */}
          <div className="flex-1 space-y-4">
            {/* Search Bar */}
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all w-full max-w-[500px]"
              style={{ backgroundColor: "#DADBCF" }}
            >
              <Search size={18} className="text-[#565C3F]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("search_customers")}
                className="flex-1 bg-transparent outline-none border-none text-[14px] font-medium text-[#2C2C2C] placeholder-[#8B8D7A]"
              />
            </div>
            {/* Filter Pills */}
            <div className="flex flex-wrap gap-2">
              {filterOptions.map(opt => {
                const isActive = filter === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setFilter(isActive ? "all" : opt.value)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors"
                    style={{
                      backgroundColor: isActive ? "#DADBCF" : "#EAE9DF",
                      color: isActive ? "#565C3F" : "#6F6F6F"
                    }}
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Status Cards */}
          <div className="flex-shrink-0">
            <div className="text-[10px] font-bold tracking-wider text-[#9E9E9E] mb-2">{t("account_status")}</div>
            <div className="flex gap-4">
              <div className="flex flex-col items-center justify-center bg-white border border-[#E8E6DF] rounded-xl px-5 py-3 shadow-sm min-w-[80px]">
                <span className="text-[20px] font-bold text-[#565C3F]">{stats.active}</span>
                <span className="text-[10px] font-bold text-[#9E9E9E] mt-0.5">{t("active_label")}</span>
              </div>
              <div className="flex flex-col items-center justify-center bg-white border border-[#E8E6DF] rounded-xl px-5 py-3 shadow-sm min-w-[80px]">
                <span className="text-[20px] font-bold text-[#6D6D6D]">{stats.released}</span>
                <span className="text-[10px] font-bold text-[#9E9E9E] mt-0.5">{t("released_label")}</span>
              </div>
              <div className="flex flex-col items-center justify-center bg-[#FDF5F5] border border-[#FDE5E5] rounded-xl px-5 py-3 shadow-sm min-w-[80px]">
                <span className="text-[20px] font-bold text-[#C94A4A]">{stats.overdue}</span>
                <span className="text-[10px] font-bold text-[#C94A4A] mt-0.5">{t("overdue_label")}</span>
              </div>
            </div>
          </div>
        </div>

        {/* User Table Card */}
        <div
          className="rounded-[16px] overflow-hidden mb-8"
          style={{ backgroundColor: "#FFFFFF", boxShadow: "0 4px 24px rgba(0,0,0,0.03)", border: "1px solid #E8E6DF" }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr style={{ backgroundColor: "#FAFAF7", borderBottom: "1px solid #ECEAE4" }}>
                  <th className="px-6 py-4 text-[11px] font-bold text-[#9E9E9E] tracking-wider">{t("col_customer_details")}</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-[#9E9E9E] tracking-wider">{t("col_address")}</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-[#9E9E9E] tracking-wider">{t("col_primary_item")}</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-[#9E9E9E] tracking-wider">{t("col_loan_amount")}</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-[#9E9E9E] tracking-wider">{t("col_status")}</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-[#9E9E9E] tracking-wider lg:w-[60px]"></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <>
                    {[...Array(5)].map((_, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #ECEAE4" }}>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="skeleton" style={{ width: "40px", height: "40px", borderRadius: "50%", flexShrink: 0 }} />
                            <div>
                              <div className="skeleton" style={{ width: "120px", height: "14px", marginBottom: "6px" }} />
                              <div className="skeleton" style={{ width: "80px", height: "12px" }} />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5"><div className="skeleton" style={{ width: "140px", height: "13px" }} /></td>
                        <td className="px-6 py-5"><div className="skeleton" style={{ width: "100px", height: "13px" }} /></td>
                        <td className="px-6 py-5"><div className="skeleton" style={{ width: "80px", height: "14px" }} /></td>
                        <td className="px-6 py-5"><div className="skeleton" style={{ width: "60px", height: "22px", borderRadius: "20px" }} /></td>
                        <td className="px-6 py-5 text-right"><div className="skeleton" style={{ width: "16px", height: "16px", borderRadius: "50%", marginLeft: "auto" }} /></td>
                      </tr>
                    ))}
                  </>
                ) : error ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-[#C94A4A]">
                      <span className="text-[13px] font-medium">{error}</span>
                    </td>
                  </tr>
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-[#9E9E9E]">
                      <span className="text-[13px] font-medium">{t("no_customers_found")}</span>
                    </td>
                  </tr>
                ) : (
                  customers.map((cust, idx) => (
                    <tr
                      key={cust.id}
                      className="group cursor-pointer"
                      style={{
                        borderBottom: idx === customers.length - 1 ? "none" : "1px solid #ECEAE4",
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#F7F6F1"}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                      onClick={() => router.push(`/customers/${cust.id}`)}
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-bold"
                            style={{ backgroundColor: "#EAE9DF", color: "#565C3F" }}
                          >
                            {getInitials(cust.name)}
                          </div>
                          <div>
                            <div className="text-[14px] font-bold text-[#2C2C2C]">{cust.name}</div>
                            <div className="text-[12px] text-[#9E9E9E] font-medium mt-0.5">
                              ID: #{cust.id.split("-")[0].toUpperCase()}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        <div className="text-[13px] font-medium text-[#6F6F6F] max-w-[200px] truncate" title={cust.address || "—"}>
                          {cust.address || "—"}
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2 text-[13px] font-medium text-[#2C2C2C]">
                          {getRandomItemIcon(cust.latestItem)}
                          <span className="truncate max-w-[120px]">{cust.latestItem || "—"}</span>
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        <div className="text-[14px] font-bold text-[#2C2C2C]">
                          {cust.latestLoanAmount ? `₹${Number(cust.latestLoanAmount).toLocaleString(locale, { minimumFractionDigits: 2 })}` : "—"}
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        {renderStatus(cust.latestStatus || "ACTIVE")}
                      </td>

                      <td className="px-6 py-5 text-right">
                        <Link href={`/customers/${cust.id}`} onClick={(e) => e.stopPropagation()}>
                          <button className="p-2 -mr-2 rounded-full hover:bg-[#EAE9DF] text-[#9E9E9E] hover:text-[#2C2C2C] transition-colors">
                            <MoreVertical size={16} />
                          </button>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-4 flex items-center justify-between border-t" style={{ borderColor: "#ECEAE4", backgroundColor: "#FFFFFF" }}>
            <span className="text-[12px] font-medium text-[#9E9E9E]">
              {t("showing_customers", { count: customers.length })}
            </span>
            <div ref={loadMoreRef}>
              {hasMore ? (
                <span className="text-[12px] font-bold text-[#6F6F6F] flex items-center gap-2">
                  {loadingMore && <Loader2 size={12} className="animate-spin" />}
                  {loadingMore ? t("loading_more") : t("scroll_for_more")}
                </span>
              ) : (
                <span className="text-[12px] font-medium text-[#9E9E9E]">{t("all_loaded")}</span>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Insight Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-[14px] p-6 shadow-sm border" style={{ backgroundColor: "#FAFAF7", borderColor: "#ECEAE4" }}>
            <h3 className="text-[11px] font-bold tracking-wider text-[#9E9E9E] mb-2">{t("portfolio_health")}</h3>
            <p className="text-[13px] text-[#6F6F6F] leading-relaxed">
              {t("portfolio_health_desc")}
            </p>
          </div>
          <div className="rounded-[14px] p-6 shadow-sm border" style={{ backgroundColor: "#FAFAF7", borderColor: "#ECEAE4" }}>
            <h3 className="text-[11px] font-bold tracking-wider text-[#9E9E9E] mb-2">{t("monthly_releases")}</h3>
            <p className="text-[13px] text-[#6F6F6F] leading-relaxed">
              {t("monthly_releases_desc_1")}<br />{t("monthly_releases_desc_2")}
            </p>
          </div>
          <div className="rounded-[14px] p-6 shadow-sm border relative overflow-hidden" style={{ backgroundColor: "#FAFAF7", borderColor: "#ECEAE4" }}>
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#C94A4A]" />
            <h3 className="text-[11px] font-bold tracking-wider text-[#C94A4A] mb-2">{t("attention_needed")}</h3>
            <p className="text-[13px] text-[#2C2C2C] font-medium leading-relaxed">
              {t("attention_desc")}
            </p>
          </div>
        </div>

      </div>

      {/* Floating Action Button */}
      <Link href="/add-customer">
        <button
          className="fixed bottom-8 right-8 w-14 h-14 rounded-full flex items-center justify-center text-white transition-transform hover:scale-105 active:scale-95 z-50"
          style={{
            background: "linear-gradient(135deg, #565C3F, #747B58)",
            boxShadow: "0 8px 20px rgba(86,92,63,0.3)"
          }}
        >
          <UserPlus size={22} />
        </button>
      </Link>
    </DashboardLayout>
  );
}