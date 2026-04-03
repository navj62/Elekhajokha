"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import DashboardLayout from "../../dashboard/layout";
import { ArrowLeft, Loader2, Edit3, Plus, Camera, Trash2, Eye, Upload, MapPin, Mail, Phone, CheckCircle2, MoreVertical } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { getStatusKey } from "@/lib/translations";

type Pledge = {
  id: string;
  itemName: string;
  status: string;
  pledgeDate: string;
  loanAmount: string;
  releaseDate: string | null;
};

type CustomerDetail = {
  id: string;
  name: string;
  address: string;
  mobile: string | null;
  aadharNo: string | null;
  remark: string | null;
  customerImg: string | null;
  idProofImg: string | null;
  createdAt: string;
  pledges: Pledge[];
};

export default function CustomerDetailPage() {
  const params = useParams<{ customerId: string }>();
  const router = useRouter();
  const customerId = params?.customerId;
  const { language, t } = useLanguage();
  const locale = language === "hi" ? "hi-IN" : "en-IN";

  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!customerId) return;
    const loadCustomer = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/customers/${customerId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || t("unable_to_load"));
        setCustomer(data.customer);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unexpected error";
        setError(message);
        showToast(message);
      } finally {
        setLoading(false);
      }
    };

    loadCustomer();
    return () => { if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current); };
  }, [customerId]);

  const showToast = (message: string) => {
    setToastMessage(message);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToastMessage(null), 4000);
  };

  const handleDelete = async (pledgeId: string) => {
    if (!customer) return;
    const confirmed = window.confirm(t("delete_confirm"));
    if (!confirmed) return;
    setDeletingId(pledgeId);
    try {
      const res = await fetch(`/api/pledges/${pledgeId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Unable to delete item.");
      setCustomer({
        ...customer,
        pledges: customer.pledges.filter((pledge) => pledge.id !== pledgeId),
      });
      showToast(t("item_deleted"));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error";
      showToast(message);
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (value?: string | null) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
  };

  const renderStatusBadge = (status?: string | null) => {
    if (!status) return null;
    let bg = "#EAEAEA";
    let text = "#6D6D6D";
    let dot = "#A0A0A0";
    if (status === "ACTIVE") { bg = "#E6E8DA"; text = "#5C633F"; dot = "#838C58"; }
    else if (status === "OVERDUE") { bg = "#F8D7DA"; text = "#C94A4A"; dot = "#D66666"; }

    const statusKey = getStatusKey(status);
    return (
      <span
        style={{ backgroundColor: bg, color: text, borderRadius: "20px", padding: "4px 10px", fontSize: "10px", fontWeight: 700, letterSpacing: "0.5px", display: "inline-flex", alignItems: "center", gap: "6px" }}
      >
        <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: dot }}></span>
        {t(statusKey).toUpperCase()}
      </span>
    );
  };

  if (!customerId) {
    return (
      <DashboardLayout>
        <div className="max-w-[1100px] mx-auto pt-6 pb-24 dash-animate px-6">
          <p className="text-[14px] text-[#9E9E9E]">{t("customer_id_missing")}</p>
        </div>
      </DashboardLayout>
    );
  }

  // Calculations for Financial Summary
  const totalLoanAmount = customer?.pledges.reduce((sum, p) => sum + Number(p.loanAmount), 0) || 0;
  const repaidAmount = customer?.pledges.filter(p => p.status === "RELEASED").reduce((sum, p) => sum + Number(p.loanAmount), 0) || 0;
  const outstandingAmount = totalLoanAmount - repaidAmount;
  const progressValue = totalLoanAmount > 0 ? (repaidAmount / totalLoanAmount) * 100 : 0;

  return (
    <DashboardLayout>
      <div className="max-w-[1100px] mx-auto px-6 lg:px-8 pt-8 pb-24 dash-animate text-[#2C2C2C]" style={{ backgroundColor: "#F4F3EE", minHeight: "100vh" }}>

        {/* Top Breadcrumb */}
        <div className="mb-6 flex">
          <Link href="/customers" className="text-[14px] font-bold text-[#2C2C2C] flex items-center gap-2 pb-2 border-b-2 border-[#555B3F]">
            Customer Details
          </Link>
        </div>

        {loading ? (
          <div className="space-y-6">
            {/* Skeleton: Header Card */}
            <div className="rounded-[24px] p-4 lg:p-6 flex flex-col md:flex-row md:items-center justify-between gap-6" style={{ backgroundColor: "#FAFAF7" }}>
              <div className="flex items-center gap-5">
                <div className="skeleton" style={{ width: 100, height: 100, borderRadius: 20, flexShrink: 0 }} />
                <div>
                  <div className="skeleton" style={{ width: 200, height: 22, marginBottom: 10 }} />
                  <div className="skeleton" style={{ width: 260, height: 14 }} />
                </div>
              </div>
              <div className="flex gap-3">
                <div className="skeleton" style={{ width: 130, height: 40, borderRadius: 20 }} />
                <div className="skeleton" style={{ width: 130, height: 40, borderRadius: 20 }} />
                <div className="skeleton" style={{ width: 140, height: 40, borderRadius: 20 }} />
              </div>
            </div>

            {/* Skeleton: Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
              {/* Left Column */}
              <div className="flex flex-col gap-6">
                {/* Financial Summary */}
                <div className="bg-white rounded-[24px] p-6 lg:p-8" style={{ border: "1px solid #ECEAE4" }}>
                  <div className="flex items-center justify-between mb-8">
                    <div className="skeleton" style={{ width: 160, height: 18 }} />
                    <div className="skeleton" style={{ width: 80, height: 26, borderRadius: 20 }} />
                  </div>
                  <div className="grid grid-cols-3 gap-4 mb-8">
                    {[1, 2, 3].map(i => (
                      <div key={i}>
                        <div className="skeleton" style={{ width: 100, height: 10, marginBottom: 10 }} />
                        <div className="skeleton" style={{ width: 140, height: 28 }} />
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <div className="skeleton" style={{ width: 120, height: 10 }} />
                      <div className="skeleton" style={{ width: 100, height: 10 }} />
                    </div>
                    <div className="skeleton" style={{ width: "100%", height: 12, borderRadius: 20 }} />
                    <div className="skeleton" style={{ width: 180, height: 12, marginTop: 14 }} />
                  </div>
                </div>

                {/* Identity & Verification */}
                <div className="bg-white rounded-[24px] p-6 lg:p-8" style={{ border: "1px solid #ECEAE4" }}>
                  <div className="skeleton" style={{ width: 180, height: 18, marginBottom: 24 }} />
                  <div className="flex flex-col gap-4 mb-6 max-w-[340px]">
                    <div className="skeleton" style={{ width: "100%", height: 72, borderRadius: 12 }} />
                    <div className="skeleton" style={{ width: "100%", height: 72, borderRadius: 12 }} />
                  </div>
                  <div className="skeleton" style={{ width: 120, height: 10, marginBottom: 12 }} />
                  <div className="skeleton" style={{ width: 300, height: 160, borderRadius: 16 }} />
                </div>
              </div>

              {/* Right Column */}
              <div className="flex flex-col gap-6 h-full">
                {/* Contact Details */}
                <div className="rounded-[24px] p-6 lg:p-8" style={{ backgroundColor: "#F4F3EE" }}>
                  <div className="skeleton" style={{ width: 140, height: 18, marginBottom: 32 }} />
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex gap-4 items-start mb-6">
                      <div className="skeleton" style={{ width: 40, height: 40, borderRadius: "50%", flexShrink: 0 }} />
                      <div>
                        <div className="skeleton" style={{ width: 90, height: 10, marginBottom: 8 }} />
                        <div className="skeleton" style={{ width: 180, height: 14 }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Internal Remarks */}
                <div className="rounded-[24px] p-6 lg:p-8 flex-1" style={{ backgroundColor: "#EAE9DF", minHeight: 320 }}>
                  <div className="flex items-center justify-between mb-6">
                    <div className="skeleton" style={{ width: 140, height: 18 }} />
                    <div className="skeleton" style={{ width: 70, height: 12 }} />
                  </div>
                  <div className="skeleton" style={{ width: "100%", height: 14, marginBottom: 10 }} />
                  <div className="skeleton" style={{ width: "90%", height: 14, marginBottom: 10 }} />
                  <div className="skeleton" style={{ width: "75%", height: 14, marginBottom: 10 }} />
                  <div className="skeleton" style={{ width: "100%", height: 14, marginBottom: 10 }} />
                  <div className="skeleton" style={{ width: "60%", height: 14, marginBottom: 24 }} />
                  <div className="flex items-center gap-3 mt-auto">
                    <div className="skeleton" style={{ width: 28, height: 28, borderRadius: "50%" }} />
                    <div className="skeleton" style={{ width: 200, height: 10 }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Skeleton: Transaction History Table */}
            <div className="bg-white rounded-[24px]" style={{ border: "1px solid #ECEAE4" }}>
              <div className="p-6 flex items-center justify-between" style={{ borderBottom: "1px solid #ECEAE4" }}>
                <div className="skeleton" style={{ width: 170, height: 18 }} />
                <div className="flex items-center gap-4">
                  <div className="skeleton" style={{ width: 100, height: 14 }} />
                  <div className="skeleton" style={{ width: 20, height: 20, borderRadius: 4 }} />
                </div>
              </div>
              <div>
                {/* Header row */}
                <div className="flex gap-4 px-6 lg:px-8 py-5" style={{ borderBottom: "1px solid #ECEAE4" }}>
                  {[80, 70, 90, 90, 60, 50].map((w, i) => (
                    <div key={i} className="skeleton" style={{ width: w, height: 10, flex: 1 }} />
                  ))}
                </div>
                {/* Data rows */}
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="flex gap-4 px-6 lg:px-8 py-5 items-center" style={{ borderBottom: i < 4 ? "1px solid #ECEAE4" : "none" }}>
                    <div className="skeleton" style={{ flex: 1, height: 14 }} />
                    <div className="skeleton" style={{ flex: 1, height: 14 }} />
                    <div className="skeleton" style={{ flex: 1, height: 14 }} />
                    <div className="skeleton" style={{ flex: 1, height: 14 }} />
                    <div className="skeleton" style={{ width: 60, height: 22, borderRadius: 20 }} />
                    <div className="skeleton" style={{ width: 18, height: 18, borderRadius: "50%" }} />
                  </div>
                ))}
              </div>
              <div className="p-4 flex justify-center" style={{ borderTop: "1px solid #ECEAE4" }}>
                <div className="skeleton" style={{ width: 160, height: 12 }} />
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="p-6 bg-[#F8D7DA] rounded-[16px] border border-[#F5C2C7]">
            <h3 className="text-[14px] font-bold text-[#C94A4A] mb-1">{t("unable_to_load")}</h3>
            <p className="text-[13px] text-[#C94A4A]">{error}</p>
          </div>
        ) : !customer ? (
          <div className="p-6 bg-white rounded-[16px] border border-[#ECEAE4] text-center">
            <p className="text-[14px] text-[#9E9E9E]">{t("customer_not_found")}</p>
          </div>
        ) : (
          <div className="space-y-6">

            {/* Main Header Card */}
            <div
              className="rounded-[24px] p-4 lg:p-6 flex flex-col md:flex-row md:items-center justify-between gap-6"
              style={{ backgroundColor: "#FAFAF7" }}
            >
              <div className="flex items-center gap-5">
                <div
                  className="w-[100px] h-[100px] flex-shrink-0 rounded-[20px] flex items-center justify-center text-[28px] font-bold overflow-hidden relative"
                  style={{ backgroundColor: "#2C2C2C", color: "#FFFFFF" }}
                >
                  {customer.customerImg ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={customer.customerImg} alt={customer.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full relative" style={{ background: "linear-gradient(200deg, #F96F82 0%, #A92C48 50%, #2A1728 100%)" }}>
                      {/* Wavy abstract background to mimic image */}
                      <svg className="absolute w-full h-full top-0 left-0" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <path d="M0,40 C30,60 50,20 100,50 L100,100 L0,100 Z" fill="#651C33" opacity="0.6" />
                        <path d="M0,55 C40,40 60,70 100,50 L100,100 L0,100 Z" fill="#2E1C23" />
                      </svg>
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 z-10 bg-[#555B3F] text-white text-[9px] font-bold px-3 py-1 rounded-[12px] uppercase tracking-wider">
                    Active
                  </div>
                </div>
                <div>
                  <h2 className="text-[26px] font-bold text-[#2C2C2C] mb-1">{customer.name}</h2>
                  <div className="text-[13px] font-medium text-[#6F6F6F] flex items-center gap-2">
                    <span className="font-bold">ID: #{customer.id.split("-")[0].toUpperCase()}</span>
                    <span>•</span>
                    <span>Registered {formatDate(customer.createdAt)}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button className="flex items-center gap-2 px-5 py-2.5 rounded-[20px] text-[13px] font-bold transition-colors bg-[#E6E4DC] text-[#6F6F6F] hover:bg-[#D8D6C8] hover:text-[#2C2C2C]">
                  <Edit3 size={15} /> Edit Profile
                </button>
                <button className="flex items-center gap-2 px-5 py-2.5 rounded-[20px] text-[13px] font-bold transition-colors bg-[#E6E4DC] text-[#6F6F6F] hover:bg-[#D8D6C8] hover:text-[#2C2C2C]">
                  <Upload size={15} /> Export Data
                </button>
                <Link href={`/customers/${customerId}/pledges/add`}>
                  <button className="flex items-center gap-2 px-6 py-2.5 rounded-[20px] text-[13px] font-bold transition-all text-white bg-[#555B3F] hover:bg-[#4B5036]">
                    <Plus size={15} /> New Pledge
                  </button>
                </Link>
              </div>
            </div>

            {/* Grid Layout Section */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
              {/* Left Column */}
              <div className="flex flex-col gap-6">
                {/* Financial Summary */}
                <div className="bg-[#FFFFFF] rounded-[24px] p-6 lg:p-8" style={{ border: "1px solid #ECEAE4" }}>
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-[17px] font-bold text-[#2C2C2C]">Financial Summary</h3>
                    <span className="bg-[#EAE9DF] text-[#555B3F] text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-widest">FY 2023-24</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mb-8">
                    <div>
                      <p className="text-[10px] font-bold tracking-wider text-[#9E9E9E] mb-2 uppercase">Total Loan Amount</p>
                      <p className="text-[28px] font-bold text-[#2C2C2C]">${totalLoanAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold tracking-wider text-[#9E9E9E] mb-2 uppercase">Repaid Amount</p>
                      <p className="text-[28px] font-bold text-[#555B3F]">${repaidAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold tracking-wider text-[#9E9E9E] mb-2 uppercase">Outstanding</p>
                      <p className="text-[28px] font-bold text-[#C94A4A]">${outstandingAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] font-bold tracking-wider mb-2 uppercase">
                      <span className="text-[#6F6F6F]">Repayment Progress</span>
                      <span className="text-[#2C2C2C]">{progressValue.toFixed(1)}% Completed</span>
                    </div>
                    <div className="h-[12px] bg-[#E5E3DA] rounded-full overflow-hidden w-full relative">
                      <div className="absolute top-0 left-0 h-full bg-[#555B3F] rounded-full transition-all duration-1000 ease-out" style={{ width: `${progressValue}%` }}></div>
                    </div>
                    <p className="text-[11px] font-medium text-[#9E9E9E] mt-4">
                      Next payment due: <span className="text-[#2C2C2C] font-bold">Oct 15, 2023</span>
                    </p>
                  </div>
                </div>

                {/* Identity & Verification */}
                <div className="bg-[#FFFFFF] rounded-[24px] p-6 lg:p-8" style={{ border: "1px solid #ECEAE4" }}>
                  <h3 className="text-[17px] font-bold text-[#2C2C2C] mb-6">Identity & Verification</h3>
                  <div className="flex flex-col gap-4 mb-6 max-w-[340px]">
                    <div className="bg-[#FAFAF7] border border-[#ECEAE4] p-4 rounded-[12px] flex justify-between items-center h-[72px]">
                      <div>
                        <p className="text-[9px] font-bold tracking-wider text-[#9E9E9E] mb-1.5 uppercase">Pan Number</p>
                        <p className="text-[14px] font-bold text-[#2C2C2C] tracking-[0.15em]">ABCDE****F</p>
                      </div>
                      <div className="text-[#555B3F] bg-[#DADBCF] p-1.5 rounded-full">
                        <CheckCircle2 size={16} fill="currentColor" stroke="#DADBCF" className="text-[#555B3F]" />
                      </div>
                    </div>
                    <div className="bg-[#FAFAF7] border border-[#ECEAE4] p-4 rounded-[12px] flex justify-between items-center h-[72px]">
                      <div>
                        <p className="text-[9px] font-bold tracking-wider text-[#9E9E9E] mb-1.5 uppercase">Aadhaar Number</p>
                        <p className="text-[14px] font-bold text-[#2C2C2C] tracking-[0.15em]">
                          {customer.aadharNo ? customer.aadharNo.replace(/.(?=.{4})/g, '*') : "**** **** 9021"}
                        </p>
                      </div>
                      <div className="text-[#555B3F] bg-[#DADBCF] p-1.5 rounded-full">
                        <CheckCircle2 size={16} fill="currentColor" stroke="#DADBCF" className="text-[#555B3F]" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold tracking-wider text-[#9E9E9E] mb-3 uppercase">ID Proof Document</p>
                    <div className="w-[300px] h-[160px] rounded-[16px] overflow-hidden bg-[#2C2C2C] relative">
                      {customer.idProofImg ? (
                        <img src={customer.idProofImg} alt="ID" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full p-4 flex flex-col justify-end text-white/50 bg-[#1A1A1A] text-[10px]">
                          <div className="w-full h-full bg-[#333] rounded mb-2 flex items-center justify-center border border-white/10 relative overflow-hidden">
                            <div className="absolute top-2 w-[40px] h-[40px] rounded-full bg-white/10" />
                            <div className="absolute right-2 top-2 w-10 h-2 rounded bg-white/10" />
                            <div className="absolute right-2 top-5 w-16 h-2 rounded bg-white/10" />
                            <img src="https://images.unsplash.com/photo-1634024409392-5eb8db54619c?q=80&w=600&auto=format&fit=crop" className="absolute inset-0 w-full h-full object-cover opacity-60" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="flex flex-col gap-6 h-full">
                {/* Contact Details */}
                <div className="bg-[#E2E0C8] rounded-[24px] p-6 lg:p-8 flex-shrink-0">
                  <h3 className="text-[17px] font-bold text-[#2C2C2C] mb-8">Contact Details</h3>

                  <div className="flex gap-4 items-start mb-6">
                    <div className="w-10 h-10 rounded-full bg-white border border-[#ECEAE4] flex items-center justify-center text-[#2C2C2C] shrink-0">
                      <Mail size={16} />
                    </div>
                    <div>
                      <p className="text-[9px] font-bold tracking-wider text-[#9E9E9E] mb-1 uppercase">Email Address</p>
                      <p className="text-[14px] font-medium text-[#2C2C2C]">{customer.name.split(" ").join("").toLowerCase() + "@gmail.com"}</p>
                    </div>
                  </div>

                  <div className="flex gap-4 items-start mb-6">
                    <div className="w-10 h-10 rounded-full bg-white border border-[#ECEAE4] flex items-center justify-center text-[#2C2C2C] shrink-0">
                      <Phone size={16} />
                    </div>
                    <div>
                      <p className="text-[9px] font-bold tracking-wider text-[#9E9E9E] mb-1 uppercase">Phone Number</p>
                      <p className="text-[14px] font-medium text-[#2C2C2C]">{customer.mobile || "7853831567"}</p>
                    </div>
                  </div>

                  <div className="flex gap-4 items-start">
                    <div className="w-10 h-10 rounded-full bg-white border border-[#ECEAE4] flex items-center justify-center text-[#2C2C2C] shrink-0 relative top-1">
                      <MapPin size={16} />
                    </div>
                    <div>
                      <p className="text-[9px] font-bold tracking-wider text-[#9E9E9E] mb-1 uppercase">Residential Address</p>
                      <p className="text-[14px] font-medium text-[#2C2C2C] leading-snug w-[200px]">
                        {customer.address || "422 Birchwood Drive, Willow Creek, VT 05401"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Internal Remarks */}
                <div className="bg-[#E2E0C8] rounded-[24px] p-6 lg:p-8 flex-1 flex flex-col" style={{ minHeight: "320px" }}>
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-[17px] font-bold text-[#2C2C2C]">Internal Remarks</h3>
                    <button className="text-[13px] font-semibold text-[#2C2C2C] hover:text-[#000000] transition-colors">Edit Notes</button>
                  </div>
                  <div className="bg-[#F4F3EE] rounded-[16px] p-5 lg:p-6 flex-1 flex flex-col justify-between border border-[#E8E6DF]">
                    <div className="text-[14px] leading-[1.7] text-[#6F6F6F] mb-6">
                      {customer.remark && (
                        <p className="mb-4">{customer.remark}</p>
                      )}
                      <p>
                        <span className="font-bold text-[#2C2C2C]">Note from Aug 12:</span> Requested a loan limit increase for upcoming agricultural cycle. Approval pending review of Q3 statements.
                      </p>
                    </div>
                    <div className="flex items-center gap-3 pt-4 border-t border-[#F0EFE8]">
                      <div className="w-[28px] h-[28px] rounded-full bg-[#DADBCF] border border-white flex items-center justify-center text-[9px] font-bold text-[#555B3F]">JD</div>
                      <p className="text-[11px] font-medium text-[#6F6F6F]">Last updated by Julian Dane, Senior Manager</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Transaction History (Table) */}
            <div className="bg-[#FFFFFF] rounded-[24px] mt-2 mb-6" style={{ border: "1px solid #ECEAE4" }}>
              <div className="p-6 flex items-center justify-between" style={{ borderBottom: "1px solid #ECEAE4" }}>
                <h3 className="text-[17px] font-bold text-[#2C2C2C]">Transaction History</h3>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 cursor-pointer text-[12px] font-bold text-[#6F6F6F] hover:text-[#2C2C2C]">
                    All Statuses <span className="opacity-70">▼</span>
                  </div>
                  <button className="text-[#6F6F6F] hover:text-[#2C2C2C]">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr style={{ borderBottom: "1px solid #ECEAE4" }}>
                      <th className="px-6 lg:px-8 py-5 text-[10px] font-bold text-[#9E9E9E] tracking-wider uppercase">Pledge Date</th>
                      <th className="px-6 lg:px-8 py-5 text-[10px] font-bold text-[#9E9E9E] tracking-wider uppercase">Item Name</th>
                      <th className="px-6 lg:px-8 py-5 text-[10px] font-bold text-[#9E9E9E] tracking-wider uppercase">Loan Amount</th>
                      <th className="px-6 lg:px-8 py-5 text-[10px] font-bold text-[#9E9E9E] tracking-wider uppercase">Release Date</th>
                      <th className="px-6 lg:px-8 py-5 text-[10px] font-bold text-[#9E9E9E] tracking-wider uppercase">Status</th>
                      <th className="px-6 py-5 text-[10px] font-bold text-[#9E9E9E] tracking-wider uppercase text-right w-[100px]">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customer.pledges.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-[#9E9E9E]">
                          <p className="text-[13px] font-medium mb-4">{t("no_items_yet")}</p>
                          <Link href={`/customers/${customerId}/pledges/add`}>
                            <button className="text-[13px] font-bold px-4 py-2 rounded-[12px] bg-[#DADBCF] text-[#555B3F] hover:bg-[#D4D5C8] transition-colors">
                              {t("create_first_item")}
                            </button>
                          </Link>
                        </td>
                      </tr>
                    ) : (
                      customer.pledges.map((pledge, idx) => (
                        <tr
                          key={pledge.id}
                          className="group transition-colors duration-200 cursor-pointer hover:bg-[#FAFAF7]"
                          style={{ borderBottom: idx === customer.pledges.length - 1 ? "none" : "1px solid #ECEAE4" }}
                          onClick={() => router.push(`/customers/${customerId}/pledges/${pledge.id}`)}
                        >
                          <td className="px-6 lg:px-8 py-5">
                            <div className="text-[13px] font-bold text-[#2C2C2C]">{formatDate(pledge.pledgeDate)}</div>
                          </td>
                          <td className="px-6 lg:px-8 py-5">
                            <div className="text-[13px] font-bold text-[#2C2C2C]">{pledge.itemName}</div>
                          </td>
                          <td className="px-6 lg:px-8 py-5">
                            <div className="text-[13px] font-bold text-[#2C2C2C]">
                              ${Number(pledge.loanAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </div>
                          </td>
                          <td className="px-6 lg:px-8 py-5">
                            <div className="text-[13px] font-semibold text-[#6F6F6F]">{pledge.releaseDate ? formatDate(pledge.releaseDate) : "—"}</div>
                          </td>
                          <td className="px-6 lg:px-8 py-5">
                            {renderStatusBadge(pledge.status)}
                          </td>
                          <td className="px-6 py-5 text-right w-[100px]">
                            <div className="flex items-center justify-end gap-1">
                              <button className="p-2 text-[#9E9E9E] hover:text-[#2C2C2C] transition-colors">
                                <MoreVertical size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="p-4 border-t border-[#ECEAE4] flex justify-center">
                <button className="text-[10px] font-bold tracking-widest uppercase text-[#9E9E9E] hover:text-[#2C2C2C] py-2">
                  View All Transactions
                </button>
              </div>
            </div>

          </div>
        )}
      </div>

      {toastMessage && (
        <div className="fixed bottom-8 right-8 z-50 rounded-[12px] text-white px-5 py-3 shadow-xl text-[13px] font-bold transition-all animate-in slide-in-from-bottom flex items-center gap-2"
          style={{ backgroundColor: "#2C2C2C", border: "1px solid #4B5036" }}>
          <CheckCircle2 size={16} className="text-[#A9B37E]" />
          {toastMessage}
        </div>
      )}
    </DashboardLayout>
  );
}