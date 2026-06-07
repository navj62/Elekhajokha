"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import SubscriptionGuard from "@/components/SubscriptionGuard";
import {
  Edit3, Plus, Upload, MapPin, Phone,
  CheckCircle2, Eye, Trash2, Loader2,
} from "lucide-react";

import { QRCodeCanvas } from "qrcode.react";
import { Switch } from "@/components/ui/switch";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
type Pledge = {
  id: string;
  status: "ACTIVE" | "RELEASED" | "OVERDUE";
  pledgeDate: string;
  loanAmount: string;
  releaseDate: string | null;
  itemLabel: string | null;
  itemCount: number;
};

type CustomerDetail = {
  id: string;
  name: string;
  address: string;
  region: string;
  mobile: string | null;
  aadharNo: string | null;
  remark: string | null;
  customerImg: string | null;
  idProofImg: string | null;
  createdAt?: string;
  pledges: Pledge[];
  viewToken: string;
  isPortalBlocked: boolean;
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */
function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function fmt(amount: string | number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 2,
  }).format(Number(amount));
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase();
}

function renderStatusBadge(status?: string | null) {
  if (!status) return null;
  let bg = "#EAEAEA", color = "#6D6D6D", dot = "#A0A0A0";
  if (status === "ACTIVE") { bg = "#E6E8DA"; color = "#5C633F"; dot = "#838C58"; }
  if (status === "OVERDUE") { bg = "#F8D7DA"; color = "#C94A4A"; dot = "#D66666"; }
  const label = status.charAt(0) + status.slice(1).toLowerCase();
  return (
    <span style={{ backgroundColor: bg, color, borderRadius: "20px", padding: "4px 10px", fontSize: "10px", fontWeight: 700, letterSpacing: "0.5px", display: "inline-flex", alignItems: "center", gap: "6px" }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: dot }} />
      {label.toUpperCase()}
    </span>
  );
}

/* ================================================================== */
/*  Page                                                                */
/* ================================================================== */
export default function CustomerDetailPage() {
  const params = useParams<{ customerId: string }>();
  const router = useRouter();
  const customerId = params?.customerId;

  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editingRemark, setEditingRemark] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", mobile: "", address: "", region: "", aadharNo: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const toastRef = useRef<NodeJS.Timeout | null>(null);

  function showToast(msg: string) {
    setToastMsg(msg);
    if (toastRef.current) clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToastMsg(null), 4000);
  }

  /* ---- Load ---------------------------------------------------- */
  useEffect(() => {
    if (!customerId) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/customers/${customerId}`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Unable to load customer.");
        setCustomer(data.customer);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unexpected error";
        setError(msg);
        showToast(msg);
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => { if (toastRef.current) clearTimeout(toastRef.current); };
  }, [customerId]);

  /* ---- Delete pledge ------------------------------------------ */
  async function handleDelete(pledgeId: string) {
    if (!customer) return;
    if (!window.confirm("Delete this pledge? This cannot be undone.")) return;
    setDeletingId(pledgeId);
    try {
      const res = await fetch(`/api/pledges/${pledgeId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Unable to delete pledge.");
      setCustomer({
        ...customer,
        pledges: customer.pledges.filter((p) => p.id !== pledgeId),
      });
      showToast("Pledge deleted.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setDeletingId(null);
    }
  }

  /* ---- Save Notes --------------------------------------------- */
  async function handleSaveNotes() {
    if (!customer) return;
    setSavingNotes(true);
    try {
      const res = await fetch(`/api/customers/${customerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remark: editingRemark }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Unable to save notes.");
      setCustomer({ ...customer, remark: editingRemark });
      setIsEditingNotes(false);
      showToast("Notes updated.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setSavingNotes(false);
    }
  }

  /* ---- Save Profile ------------------------------------------- */
  async function handleSaveProfile() {
    if (!customer) return;
    setSavingProfile(true);
    try {
      const res = await fetch(`/api/customers/${customerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Unable to save profile.");
      setCustomer({ ...customer, ...editForm });
      setShowEditModal(false);
      showToast("Profile updated.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setSavingProfile(false);
    }
  }

  if (!customerId) {
    return (
      <SubscriptionGuard featureName="Customer Details">
        <div className="max-w-[1100px] mx-auto pt-6 pb-24 px-6">
          <p className="text-[14px] text-[#9E9E9E]">Customer ID not provided.</p>
        </div>
      </SubscriptionGuard>
    );
  }

  /* ---- Financial summary calculations ------------------------- */
  const totalLoan = customer?.pledges.reduce((s, p) => s + Number(p.loanAmount), 0) ?? 0;
  const repaid = customer?.pledges.filter((p) => p.status === "RELEASED").reduce((s, p) => s + Number(p.loanAmount), 0) ?? 0;
  const outstanding = totalLoan - repaid;
  const progressValue = totalLoan > 0 ? (repaid / totalLoan) * 100 : 0;

  /* ================================================================ */
  return (
    <SubscriptionGuard featureName="Customer Details">
      <div
        className="max-w-[1100px] mx-auto px-6 lg:px-8 pt-8 pb-24 dash-animate text-[#2C2C2C]"
        style={{ minHeight: "100vh" }}
      >
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link
            href="/customers"
            className="text-[14px] font-bold text-[#2C2C2C] flex items-center gap-2 pb-2 border-b-2 border-[#555B3F] w-fit"
          >
            ← Customer Details
          </Link>
        </div>

        {/* ── Loading skeletons ─────────────────────────────────── */}
        {loading ? (
          <div className="space-y-6">
            <div className="rounded-[24px] p-6 flex flex-col md:flex-row md:items-center justify-between gap-6" style={{ backgroundColor: "#FAFAF7" }}>
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
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
              <div className="flex flex-col gap-6">
                <div className="bg-white rounded-[24px] p-8" style={{ border: "1px solid #ECEAE4" }}>
                  <div className="skeleton" style={{ width: 160, height: 18, marginBottom: 32 }} />
                  <div className="grid grid-cols-3 gap-4 mb-8">
                    {[1, 2, 3].map((i) => (
                      <div key={i}>
                        <div className="skeleton" style={{ width: 100, height: 10, marginBottom: 10 }} />
                        <div className="skeleton" style={{ width: 140, height: 28 }} />
                      </div>
                    ))}
                  </div>
                  <div className="skeleton" style={{ width: "100%", height: 12, borderRadius: 20 }} />
                </div>
              </div>
            </div>
          </div>

          /* ── Error ─────────────────────────────────────────────── */
        ) : error ? (
          <div className="p-6 rounded-[16px] border" style={{ backgroundColor: "#F8D7DA", borderColor: "#F5C2C7" }}>
            <h3 className="text-[14px] font-bold text-[#C94A4A] mb-1">Unable to load customer</h3>
            <p className="text-[13px] text-[#C94A4A]">{error}</p>
          </div>

          /* ── Not found ─────────────────────────────────────────── */
        ) : !customer ? (
          <div className="p-6 rounded-[16px] border text-center" style={{ backgroundColor: "#FFFFFF", borderColor: "#ECEAE4" }}>
            <p className="text-[14px] text-[#9E9E9E]">Customer not found.</p>
          </div>

          /* ── Loaded ────────────────────────────────────────────── */
        ) : (
          <div className="space-y-6">

            {/* Main Header Card */}
            <div
              className="rounded-[24px] p-4 lg:p-6 flex flex-col md:flex-row md:items-center justify-between gap-6"
              style={{ backgroundColor: "#FAFAF7" }}
            >
              <div className="flex items-center gap-5">
                {/* Avatar */}
                <div
                  className="w-[100px] h-[100px] flex-shrink-0 rounded-[20px] overflow-hidden relative"
                  style={{ backgroundColor: "#2C2C2C" }}
                >
                  {customer.customerImg ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={customer.customerImg} alt={customer.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full relative flex items-center justify-center" style={{ background: "linear-gradient(200deg, #F96F82 0%, #A92C48 50%, #2A1728 100%)" }}>
                      <svg className="absolute w-full h-full top-0 left-0" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <path d="M0,40 C30,60 50,20 100,50 L100,100 L0,100 Z" fill="#651C33" opacity="0.6" />
                        <path d="M0,55 C40,40 60,70 100,50 L100,100 L0,100 Z" fill="#2E1C23" />
                      </svg>
                      <span className="relative z-10 text-white text-2xl font-bold">{getInitials(customer.name)}</span>
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 z-10 bg-[#555B3F] text-white text-[9px] font-bold px-3 py-1 rounded-[12px] uppercase tracking-wider">
                    Active
                  </div>
                </div>

                <div className="w-full">
                  <h2 className="text-[26px] font-bold text-[#2C2C2C] mb-1">{customer.name}</h2>
                  <div className="text-[13px] font-medium text-[#6F6F6F] flex flex-wrap items-center gap-2 mb-2">
                    <span className="font-bold">ID: #{customer.id.split("-")[0].toUpperCase()}</span>
                    <span>•</span>
                    <span>{customer.region}</span>
                    {customer.createdAt && (
                      <>
                        <span>•</span>
                        <span>Registered {formatDate(customer.createdAt)}</span>
                      </>
                    )}
                  </div>

                  {/* Customer View Link */}
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <input
                      value={`${process.env.NEXT_PUBLIC_BASE_URL}/view/${customer.viewToken}`}
                      readOnly
                      className="border px-2 py-1 rounded text-xs w-full bg-gray-50"
                    />
                    <button
                      onClick={() =>
                        navigator.clipboard.writeText(
                          `${process.env.NEXT_PUBLIC_BASE_URL}/view/${customer.viewToken}`
                        )
                      }
                      className="bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600"
                    >
                      Copy
                    </button>
                    <button
                      onClick={() => setShowQR(!showQR)}
                      className="bg-gray-800 text-white px-3 py-1 rounded text-xs hover:bg-gray-900"
                    >
                      {showQR ? "Hide QR" : "View QR"}
                    </button>
                  </div>

                  {/* QR Code (Toggle) */}
                  {showQR && (
                    <div className="mt-3 flex flex-col items-start gap-2">
                      <div className="p-2 bg-white border rounded-lg">
                        <QRCodeCanvas
                          value={`${process.env.NEXT_PUBLIC_BASE_URL}/view/${customer.viewToken}`}
                          size={120}
                        />
                        <p className="text-xs text-gray-400">Scan to open customer page</p>
                      </div>
                    </div>
                  )}

                  {/* Portal toggle */}
                  <div className="mt-3 flex items-center gap-3">
                    <Switch
                      checked={!Boolean(customer.isPortalBlocked)}
                      onCheckedChange={async () => {
                        try {
                          const res = await fetch(`/api/customers/${customer.id}/toggle-portal`, { method: "PATCH" });
                          const data = await res.json();
                          if (!res.ok) throw new Error(data.error || "Failed");
                          setCustomer((prev) =>
                            prev ? { ...prev, isPortalBlocked: data.isPortalBlocked } : prev
                          );
                          showToast(data.isPortalBlocked ? "Portal access blocked" : "Portal access enabled");
                        } catch (err) {
                          console.error(err);
                          showToast("Failed to update portal access");
                        }
                      }}
                    />
                    <span className="text-sm text-gray-600">
                      {!customer.isPortalBlocked ? "Portal Enabled" : "Portal Blocked"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => {
                    setEditForm({
                      name: customer.name || "",
                      mobile: customer.mobile || "",
                      address: customer.address || "",
                      region: customer.region || "",
                      aadharNo: customer.aadharNo || "",
                    });
                    setShowEditModal(true);
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 cursor-pointer rounded-[20px] text-[13px] font-bold transition-colors bg-[#E6E4DC] text-[#6F6F6F] hover:bg-[#D8D6C8] hover:text-[#2C2C2C]"
                >
                  <Edit3 size={15} /> Edit Profile
                </button>
                <button className="flex items-center gap-2 px-5 py-2.5 rounded-[20px] text-[13px] font-bold transition-colors bg-[#E6E4DC] text-[#6F6F6F] hover:bg-[#D8D6C8] hover:text-[#2C2C2C]">
                  <Upload size={15} /> Export Data
                </button>
                <Link href={`/customers/${customerId}/pledges/add`}>
                  <button className="flex items-center gap-2 px-6 py-2.5 cursor-pointer rounded-[20px] text-[13px] font-bold transition-all text-white bg-[#555B3F] hover:bg-[#4B5036]">
                    <Plus size={15} /> Add Pledge
                  </button>
                </Link>
              </div>
            </div>

            {/* Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">

              {/* ── Left Column ────────────────────────────────── */}
              <div className="flex flex-col gap-6">

                {/* Financial Summary */}
                <div
                  className="bg-white rounded-[24px] p-6 lg:p-8 cursor-pointer transition-all duration-200 group"
                  style={{ border: "1px solid #ECEAE4" }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.border = "1.5px solid #555B3F";
                    el.style.backgroundColor = "#FAFAF5";
                    el.style.boxShadow = "0 6px 24px rgba(85,91,63,0.14)";
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.border = "1px solid #ECEAE4";
                    el.style.backgroundColor = "#ffffff";
                    el.style.boxShadow = "none";
                  }}
                  onClick={() => router.push(`/customers/${customerId}/financial-summary`)}
                >
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <h3 className="text-[17px] font-bold text-[#2C2C2C]">Financial Summary</h3>
                      <span className="text-[12px] font-semibold text-[#555B3F] opacity-0 group-hover:opacity-100 transition-opacity duration-150">View Details →</span>
                    </div>
                    <span className="bg-[#EAE9DF] text-[#555B3F] text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-widest">
                      {customer.pledges.length} Pledge{customer.pledges.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mb-8">
                    <div>
                      <p className="text-[10px] font-bold tracking-wider text-[#9E9E9E] mb-2 uppercase">Total Loan</p>
                      <p className="text-[24px] font-bold text-[#2C2C2C]">{fmt(totalLoan)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold tracking-wider text-[#9E9E9E] mb-2 uppercase">Repaid</p>
                      <p className="text-[24px] font-bold text-[#555B3F]">{fmt(repaid)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold tracking-wider text-[#9E9E9E] mb-2 uppercase">Outstanding</p>
                      <p className="text-[24px] font-bold text-[#C94A4A]">{fmt(outstanding)}</p>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] font-bold tracking-wider mb-2 uppercase">
                      <span className="text-[#6F6F6F]">Repayment Progress</span>
                      <span className="text-[#2C2C2C]">{progressValue.toFixed(1)}% Completed</span>
                    </div>
                    <div className="h-[12px] bg-[#E5E3DA] rounded-full overflow-hidden w-full relative">
                      <div
                        className="absolute top-0 left-0 h-full bg-[#555B3F] rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${progressValue}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Identity & Verification */}
                <div className="bg-white rounded-[24px] p-6 lg:p-8" style={{ border: "1px solid #ECEAE4" }}>
                  <h3 className="text-[17px] font-bold text-[#2C2C2C] mb-6">Identity & Verification</h3>
                  <div className="flex flex-col gap-4 mb-6 max-w-[340px]">
                    <div className="bg-[#FAFAF7] border border-[#ECEAE4] p-4 rounded-[12px] flex justify-between items-center h-[72px]">
                      <div>
                        <p className="text-[9px] font-bold tracking-wider text-[#9E9E9E] mb-1.5 uppercase">Aadhaar Number</p>
                        <p className="text-[14px] font-bold text-[#2C2C2C] tracking-[0.15em]">
                          {customer.aadharNo ? customer.aadharNo : "-"}
                        </p>
                      </div>
                      <div className="text-[#555B3F] bg-[#DADBCF] p-1.5 rounded-full">
                        <CheckCircle2 size={16} fill="currentColor" stroke="#DADBCF" />
                      </div>
                    </div>
                    <div className="bg-[#FAFAF7] border border-[#ECEAE4] p-4 rounded-[12px] flex justify-between items-center h-[72px]">
                      <div>
                        <p className="text-[9px] font-bold tracking-wider text-[#9E9E9E] mb-1.5 uppercase">ID Proof Document</p>
                        <p className="text-[14px] font-bold text-[#2C2C2C]">
                          {customer.idProofImg ? "Document Uploaded" : "Not Uploaded"}
                        </p>
                      </div>
                      {customer.idProofImg && (
                        <div className="text-[#555B3F] bg-[#DADBCF] p-1.5 rounded-full">
                          <CheckCircle2 size={16} fill="currentColor" stroke="#DADBCF" />
                        </div>
                      )}
                    </div>
                  </div>
                  {customer.idProofImg && (
                    <div>
                      <p className="text-[9px] font-bold tracking-wider text-[#9E9E9E] mb-3 uppercase">ID Proof Preview</p>
                      <div className="w-[300px] h-[160px] rounded-[16px] overflow-hidden bg-[#2C2C2C]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={customer.idProofImg} alt="ID Proof" className="w-full h-full object-cover" />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Right Column ───────────────────────────────── */}
              <div className="flex flex-col gap-6">

                {/* Contact Details */}
                <div className="rounded-[24px] p-6 lg:p-8" style={{ backgroundColor: "#E2E0C8" }}>
                  <h3 className="text-[17px] font-bold text-[#2C2C2C] mb-8">Contact Details</h3>
                  <div className="flex gap-4 items-start mb-6">
                    <div className="w-10 h-10 rounded-full bg-white border border-[#ECEAE4] flex items-center justify-center shrink-0">
                      <Phone size={16} className="text-[#2C2C2C]" />
                    </div>
                    <div>
                      <p className="text-[9px] font-bold tracking-wider text-[#9E9E9E] mb-1 uppercase">Phone Number</p>
                      <p className="text-[14px] font-medium text-[#2C2C2C]">{customer.mobile || "—"}</p>
                    </div>
                  </div>
                  <div className="flex gap-4 items-start">
                    <div className="w-10 h-10 rounded-full bg-white border border-[#ECEAE4] flex items-center justify-center shrink-0 relative top-1">
                      <MapPin size={16} className="text-[#2C2C2C]" />
                    </div>
                    <div>
                      <p className="text-[9px] font-bold tracking-wider text-[#9E9E9E] mb-1 uppercase">Residential Address</p>
                      <p className="text-[14px] font-medium text-[#2C2C2C] leading-snug">{customer.address || "—"}</p>
                      {customer.region && (
                        <p className="text-[12px] font-medium text-[#9E9E9E] mt-1">{customer.region}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Internal Remarks */}
                <div
                  className="rounded-[24px] p-6 lg:p-8 flex-1 flex flex-col"
                  style={{ backgroundColor: "#E2E0C8", minHeight: "280px" }}
                >
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-[17px] font-bold text-[#2C2C2C]">Internal Remarks</h3>
                    {isEditingNotes ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setIsEditingNotes(false)}
                          className="text-[12px] font-semibold text-[#9E9E9E] hover:text-[#2C2C2C] transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveNotes}
                          disabled={savingNotes}
                          className="text-[12px] font-semibold bg-[#555B3F] text-white px-3 py-1.5 rounded-[12px] hover:bg-[#4B5036] transition-colors disabled:opacity-50"
                        >
                          {savingNotes ? "Saving..." : "Save Notes"}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingRemark(customer.remark || "");
                          setIsEditingNotes(true);
                        }}
                        className="text-[13px] font-semibold text-[#2C2C2C] hover:text-black transition-colors"
                      >
                        Edit Notes
                      </button>
                    )}
                  </div>
                  <div className="bg-[#F4F3EE] rounded-[16px] p-5 flex-1 flex flex-col justify-between border border-[#E8E6DF]">
                    <div className="text-[14px] leading-[1.7] text-[#6F6F6F] flex-1 flex flex-col">
                      {isEditingNotes ? (
                        <textarea
                          value={editingRemark}
                          onChange={(e) => setEditingRemark(e.target.value)}
                          placeholder="Add internal remarks here..."
                          className="w-full flex-1 bg-transparent border-none outline-none resize-none text-[#2C2C2C] placeholder-[#9E9E9E]"
                        />
                      ) : (
                        customer.remark
                          ? <p>{customer.remark}</p>
                          : <p className="italic text-[#9E9E9E]">No remarks added yet.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Transaction History Table */}
            <div className="bg-white rounded-[24px] mt-2 mb-6" style={{ border: "1px solid #ECEAE4" }}>
              <div
                className="p-6 flex items-center justify-between"
                style={{ borderBottom: "1px solid #ECEAE4" }}
              >
                <h3 className="text-[17px] font-bold text-[#2C2C2C]">Transaction History</h3>
                <span className="text-[12px] font-medium text-[#9E9E9E]">
                  {customer.pledges.length} total
                </span>
              </div>

              {customer.pledges.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <p className="text-[13px] font-medium text-[#9E9E9E] mb-4">No pledges yet.</p>
                  <Link href={`/customers/${customerId}/pledges/add`}>
                    <button className="text-[13px] font-bold px-4 py-2 rounded-[12px] bg-[#DADBCF] text-[#555B3F] hover:bg-[#D4D5C8] transition-colors">
                      Create First Pledge
                    </button>
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr style={{ borderBottom: "1px solid #ECEAE4" }}>
                        <th className="px-6 lg:px-8 py-5 text-[10px] font-bold text-[#9E9E9E] tracking-wider uppercase">Pledge Date</th>
                        <th className="px-6 lg:px-8 py-5 text-[10px] font-bold text-[#9E9E9E] tracking-wider uppercase">Item</th>
                        <th className="px-6 lg:px-8 py-5 text-[10px] font-bold text-[#9E9E9E] tracking-wider uppercase">Loan Amount</th>
                        <th className="px-6 lg:px-8 py-5 text-[10px] font-bold text-[#9E9E9E] tracking-wider uppercase">Release Date</th>
                        <th className="px-6 lg:px-8 py-5 text-[10px] font-bold text-[#9E9E9E] tracking-wider uppercase">Status</th>
                        <th className="px-6 py-5 text-[10px] font-bold text-[#9E9E9E] tracking-wider uppercase text-right w-[110px]">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customer.pledges.map((pledge, idx) => (
                        <tr
                          key={pledge.id}
                          className="group cursor-pointer transition-colors duration-200"
                          style={{ borderBottom: idx === customer.pledges.length - 1 ? "none" : "1px solid #ECEAE4" }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#FAFAF7")}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                          onClick={() => router.push(`/customers/${customerId}/pledges/${pledge.id}`)}
                        >
                          <td className="px-6 lg:px-8 py-5">
                            <div className="text-[13px] font-bold text-[#2C2C2C]">{formatDate(pledge.pledgeDate)}</div>
                          </td>
                          <td className="px-6 lg:px-8 py-5">
                            <div className="text-[13px] font-bold text-[#2C2C2C]">{pledge.itemLabel || "—"}</div>
                            {pledge.itemCount > 1 && (
                              <div className="text-[11px] text-[#9E9E9E] mt-0.5">
                                +{pledge.itemCount - 1} more item{pledge.itemCount > 2 ? "s" : ""}
                              </div>
                            )}
                          </td>
                          <td className="px-6 lg:px-8 py-5">
                            <div className="text-[13px] font-bold text-[#2C2C2C]">{fmt(pledge.loanAmount)}</div>
                          </td>
                          <td className="px-6 lg:px-8 py-5">
                            <div className="text-[13px] font-semibold text-[#6F6F6F]">{formatDate(pledge.releaseDate)}</div>
                          </td>
                          <td className="px-6 lg:px-8 py-5">
                            {renderStatusBadge(pledge.status)}
                          </td>
                          <td
                            className="px-6 py-5 text-right"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-end gap-1">
                              <Link href={`/customers/${customerId}/pledges/${pledge.id}`}>
                                <button className="p-2 rounded-full hover:bg-[#EAE9DF] text-[#9E9E9E] hover:text-[#2C2C2C] transition-colors">
                                  <Eye size={15} />
                                </button>
                              </Link>
                              <Link href={`/customers/${customerId}/pledges/${pledge.id}/release`}>
                                <button
                                  disabled={pledge.status === "RELEASED"}
                                  className="p-2 rounded-full hover:bg-[#EAE9DF] text-[#9E9E9E] hover:text-[#555B3F] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                  title="Release Pledge"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="p-4 border-t border-[#ECEAE4] flex justify-center">
                <button className="text-[10px] font-bold tracking-widest uppercase text-[#9E9E9E] hover:text-[#2C2C2C] py-2 transition-colors">
                  View All Transactions
                </button>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setShowEditModal(false)}>
          <div
            className="bg-white rounded-[24px] p-8 w-full max-w-[500px] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-[20px] font-bold text-[#2C2C2C] mb-6">Edit Profile</h3>
            <div className="flex flex-col gap-4">
              {([
                { label: "Full Name", key: "name", placeholder: "Customer name" },
                { label: "Mobile Number", key: "mobile", placeholder: "+91 XXXXX XXXXX" },
                { label: "Address", key: "address", placeholder: "Street, City" },
                { label: "Region", key: "region", placeholder: "State / District" },
                { label: "Aadhaar Number", key: "aadharNo", placeholder: "XXXX XXXX XXXX" },
              ] as { label: string; key: keyof typeof editForm; placeholder: string }[]).map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label className="block text-[11px] font-bold tracking-wider text-[#9E9E9E] uppercase mb-1.5">{label}</label>
                  <input
                    value={editForm[key]}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full px-4 py-3 rounded-[12px] border border-[#E0DED6] bg-[#FAFAF7] text-[14px] text-[#2C2C2C] outline-none focus:border-[#555B3F] transition-colors"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3 mt-8">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-5 py-2.5 rounded-[20px] text-[13px] font-bold bg-[#F0EEE8] text-[#6F6F6F] hover:bg-[#E6E4DC] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="px-5 py-2.5 rounded-[20px] text-[13px] font-bold bg-[#555B3F] text-white hover:bg-[#4B5036] transition-colors disabled:opacity-50"
              >
                {savingProfile ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toastMsg && (
        <div
          className="fixed bottom-8 right-8 z-50 rounded-[12px] text-white px-5 py-3 shadow-xl text-[13px] font-bold flex items-center gap-2"
          style={{ backgroundColor: "#2C2C2C", border: "1px solid #4B5036" }}
        >
          <CheckCircle2 size={16} className="text-[#A9B37E]" />
          {toastMsg}
        </div>
      )}
    </SubscriptionGuard>
  );
}