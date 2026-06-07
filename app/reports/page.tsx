"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ArrowLeft, ArrowRight, FileText, Loader2 } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────
interface CustomerRow {
  id: string;
  name: string;
  mobile: string | null;
  address: string | null;
  pledgeCount: number;
  totalLoan: number;
}

interface PledgeRow {
  index: number;
  customerName: string;
  pledgeDate: string;
  itemType: string;
  itemName: string;
  loanAmount: number;
  receivableAmount: number | null;
  status: string;
  itemPhoto: string | null;
}

interface Stats {
  totalCustomers: number;
  totalActivePledges: number;
  totalActiveLoanAmount: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function formatINR(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatDate(d: Date) {
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<"customer" | "pledge">("customer");

  // Data
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [pledges, setPledges] = useState<PledgeRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [adminName, setAdminName] = useState<string>("Admin");
  const [generatedOn] = useState(() => formatDate(new Date()));

  // Loading states
  const [loadingData, setLoadingData] = useState(true);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  // ── Fetch everything on mount ────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoadingData(true);
    try {
      const [profileRes, customersRes, pledgesRes, dashboardRes] = await Promise.all([
        fetch("/api/profile"),
        fetch("/api/reports/customers"),
        fetch("/api/reports/pledges"),
        fetch("/api/dashboard"),
      ]);

      if (profileRes.ok) {
        const p = await profileRes.json();
        const name = [p.firstName, p.lastName].filter(Boolean).join(" ") || p.username || "Admin";
        setAdminName(name);
      }

      if (customersRes.ok) setCustomers(await customersRes.json());
      if (pledgesRes.ok)   setPledges(await pledgesRes.json());

      if (dashboardRes.ok) {
        const d = await dashboardRes.json();
        setStats({
          totalCustomers: d.stats.totalCustomers,
          totalActivePledges: d.stats.totalActivePledges,
          totalActiveLoanAmount: d.stats.totalActiveLoanAmount,
        });
      }
    } catch (err) {
      console.error("Reports fetch error:", err);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── PDF generation ───────────────────────────────────────────────────────
  const handleGeneratePDF = async () => {
    setGeneratingPDF(true);
    try {
      const endpoint =
        activeTab === "customer"
          ? "/api/reports/customers?format=pdf"
          : "/api/reports/pledges?format=pdf";

      const res = await fetch(endpoint);
      if (!res.ok) throw new Error("PDF generation failed");

      const blob = await res.blob();
      const url  = window.URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = activeTab === "customer" ? "customers.pdf" : "pledges.pdf";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setGeneratingPDF(false);
    }
  };

  // ── Derived stats ────────────────────────────────────────────────────────
  const totalCustomers   = stats?.totalCustomers       ?? customers.length;
  const totalPledges     = pledges.length;
  const portfolioValue   = stats?.totalActiveLoanAmount ?? customers.reduce((s, c) => s + c.totalLoan, 0);
  const activePledges    = stats?.totalActivePledges   ?? pledges.filter(p => p.status === "ACTIVE").length;

  const recordCount = activeTab === "customer" ? customers.length : pledges.length;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="font-sans text-[#2C2C2C] max-w-[1200px] mx-auto pb-20 mt-6">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <h1 className="text-[28px] font-medium tracking-tight text-[#2C2C2C] flex items-baseline gap-4">
          Reports
          <span className="text-[14px] font-normal text-[#6F6F6F] tracking-normal">
            Customer &amp; pledge reporting center
          </span>
        </h1>

        <button
          onClick={handleGeneratePDF}
          disabled={generatingPDF || loadingData}
          className="bg-[#555B3F] text-white px-5 py-2.5 rounded-[12px] text-[13px] font-bold flex items-center gap-2 transition-colors hover:bg-[#4B5036] disabled:opacity-60 shadow-sm"
        >
          {generatingPDF ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <FileText size={16} />
          )}
          {activeTab === "customer" ? "Generate Customer Report" : "Generate Pledge Report"}
        </button>
      </div>

      {/* REPORT SWITCHER */}
      <div className="flex items-center gap-2 bg-[#F0EFDF] p-1.5 rounded-full mb-12 w-max border border-[#EAE8DD]">
        {(["customer", "pledge"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-7 py-2 rounded-full text-[12px] font-semibold transition-all ${
              activeTab === tab
                ? "bg-[#555B3F] text-white shadow-sm"
                : "text-[#6F6F6F] hover:text-[#2C2C2C]"
            }`}
          >
            {tab === "customer" ? "Customer Report" : "Pledge Report"}
          </button>
        ))}
      </div>

      {/* SUMMARY STRIP */}
      <div className="flex items-center w-full border-t border-b border-[#ECEAE4] py-10 mb-16">
        {[
          { label: "Customers",      value: loadingData ? "—" : String(totalCustomers) },
          { label: "Pledges",        value: loadingData ? "—" : String(totalPledges) },
          { label: "Portfolio Value",value: loadingData ? "—" : formatINR(portfolioValue), wide: true },
          { label: "Active Pledges", value: loadingData ? "—" : String(activePledges) },
        ].map((m, i, arr) => (
          <div
            key={m.label}
            className={`${m.wide ? "flex-[1.5]" : "flex-1"} flex flex-col items-center justify-center ${i < arr.length - 1 ? "border-r border-[#ECEAE4]" : ""}`}
          >
            <span className="text-[32px] font-semibold leading-none mb-1.5">{m.value}</span>
            <span className="text-[10px] font-semibold text-[#6F6F6F] uppercase tracking-wider">{m.label}</span>
          </div>
        ))}
      </div>

      {/* TABLE SECTION */}
      <div className="mb-6">
        <div className="flex items-baseline gap-3 mb-6">
          <h2 className="text-[18px] font-semibold text-[#2C2C2C]">
            {activeTab === "customer" ? "Customer Reports" : "Pledge Reports"}
          </h2>
          <span className="text-[12px] text-[#6F6F6F]">
            {loadingData ? "Loading…" : `${recordCount} total record${recordCount !== 1 ? "s" : ""}`}
          </span>
        </div>

        {loadingData ? (
          <div className="flex items-center gap-2 text-[#6F6F6F] text-[14px] py-12">
            <Loader2 size={18} className="animate-spin text-[#555B3F]" />
            Loading records…
          </div>
        ) : activeTab === "customer" ? (
          /* ── CUSTOMER TABLE ── */
          <div className="w-full">
            <div className="grid grid-cols-[1.5fr_1.5fr_2.5fr_1fr_1fr] gap-4 py-3 px-3 bg-[#3D4230] rounded-t-[8px] text-[11px] font-semibold text-white tracking-wider uppercase">
              <div>Name</div>
              <div>Mobile</div>
              <div>Address</div>
              <div className="text-center">Pledges</div>
              <div className="text-right">Loan Amount</div>
            </div>
            {customers.length === 0 ? (
              <div className="py-12 text-center text-[14px] text-[#9E9E9E]">No customers found.</div>
            ) : customers.map((c) => (
              <div key={c.id} className="grid grid-cols-[1.5fr_1.5fr_2.5fr_1fr_1fr] gap-4 px-3 py-4 border-b border-[#F4F3EE] text-[13px] items-center">
                <div className="font-semibold text-[#2C2C2C]">{c.name}</div>
                <div className="text-[#6F6F6F]">{c.mobile ?? "—"}</div>
                <div className="text-[#6F6F6F] pr-4 truncate">{c.address ?? "—"}</div>
                <div className="text-center">
                  <span className="inline-block bg-[#F0EFDF] text-[#555B3F] font-semibold text-[11px] px-2 py-0.5 rounded">
                    {c.pledgeCount}
                  </span>
                </div>
                <div className="text-right font-semibold text-[#555B3F]">
                  {c.totalLoan > 0 ? formatINR(c.totalLoan) : "—"}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* ── PLEDGE TABLE ── */
          <div className="w-full">
            <div className="grid grid-cols-[80px_1.2fr_1.2fr_1.5fr_1fr_1fr_100px] gap-4 py-3 px-3 bg-[#3D4230] rounded-t-[8px] text-[11px] font-semibold text-white tracking-wider uppercase">
              <div>Photo</div>
              <div>Customer</div>
              <div>Date</div>
              <div>Item</div>
              <div className="text-right">Loan Amount</div>
              <div className="text-right">Receivable</div>
              <div className="text-right">Status</div>
            </div>
            {pledges.length === 0 ? (
              <div className="py-12 text-center text-[14px] text-[#9E9E9E]">No pledges found.</div>
            ) : pledges.map((p, i) => (
              <div key={i} className="grid grid-cols-[80px_1.2fr_1.2fr_1.5fr_1fr_1fr_100px] gap-4 px-3 py-4 border-b border-[#F4F3EE] text-[13px] items-center">
                <div>
                  {p.itemPhoto ? (
                    <img
                      src={p.itemPhoto}
                      alt={p.itemName}
                      className="w-9 h-9 rounded-[6px] object-cover border border-[#ECEAE4]"
                    />
                  ) : (
                    <div className="w-9 h-9 bg-[#EAE8DD] rounded-[6px] border border-[#ECEAE4]" />
                  )}
                </div>
                <div className="font-semibold text-[#2C2C2C]">{p.customerName}</div>
                <div className="text-[#6F6F6F]">{p.pledgeDate}</div>
                <div className="text-[#6F6F6F]">{p.itemName}</div>
                <div className="text-right font-semibold text-[#2C2C2C]">{formatINR(p.loanAmount)}</div>
                <div className="text-right font-semibold text-[#2C2C2C]">
                  {p.receivableAmount != null ? formatINR(p.receivableAmount) : formatINR(p.loanAmount)}
                </div>
                <div className="text-right flex justify-end">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                      p.status === "ACTIVE"
                        ? "bg-[#E8EBD8] text-[#555B3F]"
                        : "bg-[#F4F3EE] text-[#9E9E9E]"
                    }`}
                  >
                    {p.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PAGINATION */}
      <div className="flex items-center justify-between py-4 text-[13px] text-[#6F6F6F] mb-12">
        <div>
          {loadingData
            ? "Loading…"
            : `Showing ${recordCount} of ${recordCount} ${activeTab === "customer" ? "customers" : "pledges"}`}
        </div>
        <div className="flex items-center gap-4">
          <button className="p-1 hover:text-[#2C2C2C] disabled:opacity-30" disabled>
            <ArrowLeft size={16} strokeWidth={2} />
          </button>
          <button className="p-1 hover:text-[#2C2C2C] disabled:opacity-30" disabled>
            <ArrowRight size={16} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* REPORT METADATA */}
      <div className="border-t border-[#ECEAE4] pt-8 flex flex-col md:flex-row justify-between gap-6 text-[13px] leading-relaxed">
        <div className="text-[#6F6F6F]">
          <div className="mb-1">
            <span className="font-bold text-[#2C2C2C]">Generated By:</span>{" "}
            {adminName} — Admin
          </div>
          <div>
            <span className="font-bold text-[#2C2C2C]">Generated On:</span>{" "}
            {generatedOn},{" "}
            <span className="font-bold text-[#2C2C2C]">Status:</span> Official Record
          </div>
        </div>
        <div className="text-[#6F6F6F] md:text-right">
          <div className="mb-1">
            <span className="font-bold text-[#2C2C2C]">Report Type:</span>{" "}
            {activeTab === "customer" ? "Customer Report" : "Pledge Report"}
          </div>
          <div>
            <span className="font-bold text-[#2C2C2C]">Records Included:</span>{" "}
            {recordCount} {activeTab === "customer" ? "Customer" : "Pledge"}{recordCount !== 1 ? "s" : ""}
          </div>
        </div>
      </div>

    </div>
  );
}