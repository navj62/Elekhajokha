"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import SubscriptionGuard from "@/components/SubscriptionGuard";
import { AlertTriangle, CheckCircle2, Loader2, Camera, Image as ImageIcon, Check } from "lucide-react";

interface SimilarCustomer {
  id:     string;
  name:   string;
  mobile: string | null;
}

export default function AddCustomerPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [gender,  setGender]  = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  /* ── Duplicate check ──────────────────────────────────────────── */
  const [nameInput,        setNameInput]        = useState("");
  const [similarCustomers, setSimilarCustomers] = useState<SimilarCustomer[]>([]);
  const [checkStatus,      setCheckStatus]      = useState<"idle" | "checking" | "done">("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (nameInput.trim().length < 2) {
      setSimilarCustomers([]);
      setCheckStatus("idle");
      return;
    }

    setCheckStatus("checking");

    debounceRef.current = setTimeout(async () => {
      try {
        const res  = await fetch(
          `/api/customers/check-duplicate?name=${encodeURIComponent(nameInput.trim())}`
        );
        const data = await res.json();
        setSimilarCustomers(data.matches ?? []);
        setCheckStatus("done");
      } catch {
        setCheckStatus("done");
      }
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [nameInput]);

  /* ── Submit ──────────────────────────────────────────────────── */
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      formData.append("gender", gender);

      const res  = await fetch("/api/add-customer", {
        method: "POST",
        body:   formData,
      });

      const data = await res.json();

      if (res.ok) {
        setShowSuccessModal(true);
      } else {
        setError(data.error || "Something went wrong");
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  /* ── Style tokens ────────────────────────────────────────────── */
  const inputClassName =
    "w-full rounded-[10px] px-4 py-[13px] text-[14px] transition-all outline-none placeholder-[#A8A8A8] focus:ring-[2px] focus:ring-[#A2AB89] focus:border-transparent";
  const inputStyle = { backgroundColor: "#EAE9DF", border: "1px solid #E0DED6", color: "#2B2B2B" };
  const labelClassName = "block text-[13px] font-semibold mb-2";
  const labelStyle     = { color: "#2B2B2B" };
  const uploadBoxStyle = { backgroundColor: "#EAE9DF", border: "2px dashed #D6D8C8" };

  const genderOptions = [
    { value: "Male",   label: "Male",   symbol: "♂" },
    { value: "Female", label: "Female", symbol: "♀" },
    { value: "Other",  label: "Other",  symbol: "⚥" },
  ];

  /* ================================================================ */
  return (
    <SubscriptionGuard featureName="Add Customer">
      <div className="max-w-[1040px] mx-auto pt-6 pb-12">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-[28px] font-bold tracking-tight" style={{ color: "#2B2B2B" }}>
            Add New Customer
          </h1>
          <p className="text-[14px] mt-2" style={{ color: "#6D6D6D" }}>
            Fill in the details below to register a new customer.
          </p>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* ── Left Column: Uploads ─────────────────────────────── */}
          <div className="lg:col-span-4 space-y-6">

            {/* Customer Photo */}
            <div
              className="rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all"
              style={{ backgroundColor: "#FBFBF9", boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}
            >
              <h3 className="w-full text-left text-[15px] font-bold mb-5" style={{ color: "#2B2B2B" }}>
                Customer Photo
              </h3>
              <div
                className="relative w-full aspect-square rounded-[14px] flex flex-col items-center justify-center transition-colors hover:bg-[#D6D8C8]/50"
                style={uploadBoxStyle}
              >
                <div className="bg-white/40 p-3 rounded-full mb-3">
                  <Camera className="w-6 h-6" style={{ color: "#5F6547" }} />
                </div>
                <span className="text-[13px] font-semibold" style={{ color: "#6D6D6D" }}>
                  Upload Portrait
                </span>
                <input
                  type="file"
                  name="userImg"
                  accept="image/*"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
              <p className="w-full text-left text-[12px] mt-4" style={{ color: "#A8A8A8" }}>
                JPG, PNG or WEBP. Max 5 MB.
              </p>
            </div>

            {/* ID Proof Image */}
            <div
              className="rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all"
              style={{ backgroundColor: "#FBFBF9", boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}
            >
              <h3 className="w-full text-left text-[15px] font-bold mb-5" style={{ color: "#2B2B2B" }}>
                ID Proof Image
              </h3>
              <div
                className="relative w-full aspect-[4/3] min-h-[320px] rounded-[14px] flex flex-col items-center justify-center transition-colors hover:bg-[#D6D8C8]/50"
                style={uploadBoxStyle}
              >
                <div className="bg-white/40 p-3 rounded-full mb-3">
                  <ImageIcon className="w-6 h-6" style={{ color: "#5F6547" }} />
                </div>
                <span className="text-[13px] font-semibold" style={{ color: "#6D6D6D" }}>
                  Scan / Upload ID
                </span>
                <input
                  type="file"
                  name="idProofImg"
                  accept="image/*"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
            </div>

          </div>

          {/* ── Right Column: Form ───────────────────────────────── */}
          <div
            className="lg:col-span-8 rounded-2xl p-8"
            style={{ backgroundColor: "#FBFBF9", boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}
          >
            <div className="space-y-6">

              {/* Full Name + live duplicate check */}
              <div>
                <label className={labelClassName} style={labelStyle}>
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    name="name"
                    required
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className={`${inputClassName} pr-10`}
                    style={inputStyle}
                    placeholder="Enter customer's legal name"
                  />
                  {checkStatus === "checking" && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-[#A8A8A8]" />
                  )}
                  {checkStatus === "done" && similarCustomers.length === 0 && nameInput.length >= 2 && (
                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                  )}
                  {checkStatus === "done" && similarCustomers.length > 0 && (
                    <AlertTriangle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" />
                  )}
                </div>

                {checkStatus === "done" && similarCustomers.length > 0 && (
                  <div className="mt-2 rounded-[10px] border border-amber-200 bg-amber-50 p-3">
                    <p className="text-sm font-semibold text-amber-800 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      {similarCustomers.length === 1
                        ? "A customer with a similar name already exists:"
                        : `${similarCustomers.length} customers with similar names exist:`}
                    </p>
                    <ul className="mt-2 space-y-1">
                      {similarCustomers.map((c) => (
                        <li key={c.id} className="text-sm text-amber-700 flex items-center justify-between">
                          <span className="font-medium">{c.name}</span>
                          {c.mobile && <span className="text-amber-500 text-xs">{c.mobile}</span>}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2 text-xs text-amber-600">
                      You can still proceed — this is just a heads-up.
                    </p>
                  </div>
                )}
              </div>

              {/* Mobile & Aadhaar */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={labelClassName} style={labelStyle}>Mobile Number</label>
                  <div className="relative flex items-center">
                    <div
                      className="absolute left-[1px] top-[1px] bottom-[1px] flex items-center justify-center px-[18px] rounded-l-[9px] text-[13px] font-semibold z-10"
                      style={{ backgroundColor: "#EAE9DF", color: "#6D6D6D", borderRight: "1px solid #E0DED6" }}
                    >
                      +91
                    </div>
                    <input
                      name="mobile"
                      type="tel"
                      maxLength={10}
                      pattern="\d{10}"
                      title="Enter a valid 10-digit mobile number"
                      className={`pl-[72px] relative z-0 ${inputClassName}`}
                      style={inputStyle}
                      placeholder="00000 00000"
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClassName} style={labelStyle}>Aadhaar Number</label>
                  <input
                    name="aadhaarNo"
                    maxLength={14}
                    className={`${inputClassName}`}
                    style={inputStyle}
                    placeholder="0000 0000 0000"
                    onChange={(e) => {
                      let val = e.target.value.replace(/\D/g, "");
                      e.target.value = val.replace(/(\d{4})(?=\d)/g, "$1 ");
                    }}
                  />
                </div>
              </div>

              {/* Gender */}
              <div>
                <label className={labelClassName} style={labelStyle}>Gender</label>
                <div className="flex gap-4">
                  {genderOptions.map((g) => {
                    const isActive = gender === g.value;
                    return (
                      <button
                        key={g.value}
                        type="button"
                        onClick={() => setGender(g.value)}
                        className="flex-1 py-[13px] rounded-[10px] text-[14px] font-semibold transition-all flex items-center justify-center gap-2 focus:ring-[2px] focus:ring-[#A2AB89] focus:border-transparent"
                        style={{
                          backgroundColor: isActive ? "#D6D8C8" : "#EAE9DF",
                          color:           isActive ? "#2B2B2B"  : "#6D6D6D",
                          border:          "1px solid",
                          borderColor:     isActive ? "transparent" : "#E0DED6",
                        }}
                      >
                        <span className="text-[16px] font-medium mr-1 leading-none">{g.symbol}</span>
                        {g.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Address */}
              <div>
                <label className={labelClassName} style={labelStyle}>
                  Address <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="address"
                  required
                  rows={3}
                  className={`${inputClassName} resize-none`}
                  style={inputStyle}
                  placeholder="House / Flat No., Street, Locality"
                />
              </div>

              {/* Region */}
              <div>
                <label className={labelClassName} style={labelStyle}>
                  Region <span className="text-red-500">*</span>
                </label>
                <input
                  name="region"
                  required
                  className={`${inputClassName}`}
                  style={inputStyle}
                  placeholder="City / Area / Locality"
                />
              </div>

              {/* Remarks */}
              <div>
                <label className={labelClassName} style={labelStyle}>Remarks</label>
                <textarea
                  name="remarks"
                  rows={2}
                  className={`${inputClassName} resize-none min-h-[80px]`}
                  style={inputStyle}
                  placeholder="Optional notes about this customer"
                />
              </div>

              {/* Error */}
              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-[10px] px-4 py-3">
                  {error}
                </p>
              )}

              {/* Actions */}
              <div className="pt-4 flex items-center justify-end gap-6">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-6 py-3 font-semibold text-[14px] transition-colors hover:text-[#2B2B2B]"
                  style={{ color: "#6D6D6D" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-8 py-[14px] rounded-full font-bold text-[14px] text-white transition-opacity hover:opacity-90 active:scale-[0.98] shadow-lg flex items-center gap-2 disabled:opacity-60"
                  style={{
                    background:   "linear-gradient(135deg, #5F6547, #747B58)",
                    boxShadow:    "0 4px 14px rgba(95, 101, 71, 0.25)",
                  }}
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? "Saving..." : "Add Customer"}
                </button>
              </div>

            </div>
          </div>
        </form>

        {/* ── Success Modal ──────────────────────────────────────── */}
        {showSuccessModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{
              backgroundColor: "rgba(0, 0, 0, 0.25)",
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
            }}
          >
            <div
              className="relative w-[90%] max-w-[420px] flex flex-col items-center text-center"
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: "16px",
                padding: "32px 28px 28px",
                boxShadow: "0 20px 60px rgba(0, 0, 0, 0.08)",
                animation: "modalFadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            >
              {/* Check icon */}
              <div
                className="flex items-center justify-center mb-5"
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  backgroundColor: "#EEF0E6",
                }}
              >
                <Check
                  className="w-6 h-6"
                  style={{ color: "#545A3E", strokeWidth: 2.5 }}
                />
              </div>

              {/* Title */}
              <h2
                className="text-[20px] font-bold mb-2"
                style={{ color: "#2C2C2C" }}
              >
                Customer added successfully
              </h2>

              {/* Description */}
              <p
                className="text-[14px] mb-7 leading-relaxed"
                style={{ color: "#6F6F6F" }}
              >
                The new customer profile has been created and<br />
                synced with your workspace.
              </p>

              {/* Primary button */}
              <button
                type="button"
                onClick={() => router.push("/customers")}
                className="w-full py-[14px] font-semibold text-[14px] text-white transition-colors"
                style={{
                  backgroundColor: "#545A3E",
                  borderRadius: "999px",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#484E34")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#545A3E")}
              >
                Go to customer page
              </button>

              {/* Secondary button */}
              <button
                type="button"
                onClick={() => {
                  setShowSuccessModal(false);
                  setNameInput("");
                  setGender("");
                  setError("");
                  setSimilarCustomers([]);
                  setCheckStatus("idle");
                  formRef.current?.reset();
                }}
                className="w-full mt-3 py-[14px] font-semibold text-[14px] transition-colors"
                style={{
                  backgroundColor: "#FFFFFF",
                  color: "#2C2C2C",
                  borderRadius: "999px",
                  border: "1px solid #DADBCF",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F8F8F5")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#FFFFFF")}
              >
                Add another customer
              </button>
            </div>
          </div>
        )}

        {/* Modal animation keyframes */}
        {showSuccessModal && (
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes modalFadeIn {
              from {
                opacity: 0;
                transform: scale(0.92) translateY(12px);
              }
              to {
                opacity: 1;
                transform: scale(1) translateY(0);
              }
            }
          `}} />
        )}
      </div>
    </SubscriptionGuard>
  );
}