"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import {
  Camera, Loader2, UserPlus, Mail, Briefcase,
  Shield, Check, ArrowLeft, HelpCircle,
} from "lucide-react";

/* ═══════════════════════════════════════
   Sub-components
═══════════════════════════════════════ */

function InputField({
  label, placeholder, onChange, required = true, type = "text",
}: {
  label: string; placeholder?: string; onChange: (v: string) => void;
  required?: boolean; type?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-bold text-[#6F6F6F] tracking-widest uppercase">
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full bg-[#EDEBDD] text-[#2B2B2B] placeholder-[#A3A3A3] border-none rounded-[16px] h-[52px] px-5 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#585F42]/40 transition-all font-medium"
      />
    </div>
  );
}

function MobileField({
  label, placeholder, onChange,
}: {
  label: string; placeholder?: string; onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-bold text-[#6F6F6F] tracking-widest uppercase">
        {label}
      </label>
      <div className="flex bg-[#EDEBDD] rounded-[16px] overflow-hidden focus-within:ring-2 focus-within:ring-[#585F42]/40 transition-all h-[52px]">
        <div className="flex items-center justify-center px-4 shrink-0 border-r border-[#DADBCF]/50 text-[#2B2B2B] font-semibold text-[14px]">
          +91
        </div>
        <input
          type="tel"
          inputMode="numeric"
          pattern="[0-9]{10}"
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value.trim())}
          required
          className="w-full bg-transparent text-[#2B2B2B] placeholder-[#A3A3A3] border-none h-full px-4 text-[14px] focus:outline-none font-medium"
        />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   Page
═══════════════════════════════════════ */

export default function OnboardingPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  const [form, setForm] = useState({
    shopName: "",
    address: "",
    mobile: "",
    gender: "Male",
  });

  const [imageUploading, setImageUploading] = useState(false);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isLoaded)
    return (
      <div className="min-h-screen flex items-center justify-center font-medium bg-[#F5F4EF]">
        Loading...
      </div>
    );
  if (!user) {
    router.replace("/sign-in");
    return null;
  }
  const currentUser = user;

  const update = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  /* ── Submit ── */
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.shopName || !form.address || !form.mobile) {
      setError("Please fill all fields");
      return;
    }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("shopName", form.shopName);
      fd.append("address", form.address);
      fd.append("mobile", form.mobile);
      fd.append("gender", form.gender);
      if (profileImage) fd.append("profileImage", profileImage);

      const res = await fetch("/api/onboarding", { method: "POST", body: fd });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save onboarding details");
      }

      // 👇 THE CRITICAL FIX: Refresh Clerk session to get the new metadata
      await user?.reload();

      router.replace("/dashboard");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  /* ── Step config — all done/active for step 3 ── */
  const steps = [
    {
      icon: <UserPlus size={14} />,
      num: "STEP 1",
      label: "Account",
      sub: "Security credentials",
      status: "done",
    },
    {
      icon: <Mail size={14} />,
      num: "STEP 2",
      label: "Verification",
      sub: "Identity confirmation",
      status: "done",
    },
    {
      icon: <Briefcase size={14} />,
      num: "STEP 3",
      label: "Business Profile",
      sub: "Company details",
      status: "active",
    },
  ];

  /* ══════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════ */
  return (
    <div className="flex min-h-screen font-sans text-[#2B2B2B] bg-[#F5F4EF]">

      {/* ─────────── LEFT SIDEBAR ─────────── */}
      <div className="hidden md:flex w-[280px] xl:w-[320px] flex-col justify-between bg-[#EEEDE6] sticky top-0 h-screen overflow-hidden relative border-r border-[#DADBCF]/40">

        {/* Branding */}
        <div className="px-8 xl:px-12 pt-10">
          <h1 className="text-[20px] font-extrabold mb-1 tracking-tight text-[#2B2B2B]">
            E-Lekha-Jokha
          </h1>
          <p className="text-[10px] font-bold text-[#6F6F6F] tracking-widest uppercase mt-6">
            Onboarding
          </p>
          <p className="text-[13px] text-[#A3A3A3] font-medium mt-0.5">
            Step-by-step setup
          </p>
        </div>

        {/* Steps */}
        <div className="flex-1 flex items-center px-8 xl:px-12">
          <div className="flex flex-col w-full">
            {steps.map((step, i) => {
              const isDone = step.status === "done";
              const isActive = step.status === "active";
              const isLast = i === steps.length - 1;
              return (
                <div key={i} className="flex items-stretch gap-4">
                  {/* Circle + connector column */}
                  <div className="flex flex-col items-center shrink-0" style={{ width: "36px" }}>
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 z-10 transition-colors duration-500
                        ${isDone
                          ? "bg-[#585F42] text-white"
                          : isActive
                            ? "bg-transparent border-[2.5px] border-[#2B2B2B] text-[#2B2B2B]"
                            : "bg-transparent border-2 border-[#D6D4C2] text-[#C0BEB4]"
                        }`}
                    >
                      {isDone
                        ? <Check size={14} strokeWidth={3} />
                        : isActive
                          ? <div className="w-2.5 h-2.5 rounded-full bg-[#2B2B2B]" />
                          : step.icon}
                    </div>
                    {!isLast && (
                      <div
                        className={`w-[2px] flex-1 my-1 rounded-full transition-colors duration-500 ${isDone ? "bg-[#585F42]" : "bg-[#D6D4C2]"}`}
                        style={{ minHeight: "28px" }}
                      />
                    )}
                  </div>

                  {/* Text */}
                  <div
                    className={`flex-1 pt-1.5 ${isLast ? "pb-0" : "pb-7"} ${isActive ? "pr-3" : ""}`}
                  >
                    {isActive ? (
                      <div className="bg-[#DADBCF] rounded-2xl px-3 py-2.5 -ml-1 -mt-1">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-[#2B2B2B] mb-0.5">
                          {step.num}
                        </p>
                        <p className="font-bold text-[14px] leading-tight text-[#2B2B2B]">
                          {step.label}
                        </p>
                      </div>
                    ) : (
                      <>
                        <p className={`text-[9px] font-bold uppercase tracking-widest mb-0.5 ${isDone ? "text-[#585F42]" : "text-[#BEBDB2]"}`}>
                          {step.num}
                        </p>
                        <p className={`font-bold text-[13px] leading-tight ${isDone ? "text-[#2B2B2B]" : "text-[#A3A3A3]"}`}>
                          {step.label}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Secure Workspace badge */}
        <div className="px-8 xl:px-12 pb-10">
          <div className="bg-[#E6E5DC] rounded-xl p-4 flex flex-col items-center gap-2 transition-opacity">
            <Shield className="text-[#585F42]" size={18} />
            <p className="text-[#585F42] text-[9px] font-bold tracking-widest uppercase text-center">
              Secure Workspace
            </p>
          </div>
        </div>

        {/* Right-edge progress bar */}
        <div className="absolute right-0 top-0 h-full flex flex-col" style={{ width: "3px", gap: "16px" }}>
          {[0, 1, 2].map((segIdx) => (
            <div
              key={segIdx}
              style={{
                flex: 1,
                backgroundColor: "#585F42",
                transition: "background-color 0.5s ease",
              }}
            />
          ))}
        </div>
      </div>

      {/* ─────────── MIDDLE CONTENT ─────────── */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto hidden-scrollbar">
        <div className="w-full max-w-[860px] mx-auto pt-8 pb-10 px-6 lg:px-10 flex flex-col min-h-full">

          {/* Top bar */}
          <div className="flex items-center justify-between mb-10 w-full">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#6F6F6F]" />
              <span className="text-[#6F6F6F] text-[13px] font-medium">
                Active Step: Business Details
              </span>
            </div>
            <button className="text-[#A3A3A3] hover:text-[#585F42] transition-colors">
              <HelpCircle size={20} strokeWidth={2} />
            </button>
          </div>

          {/* Page heading */}
          <div className="mb-8">
            <h2 className="text-[40px] lg:text-[48px] font-extrabold mb-2 tracking-tight text-[#2B2B2B] leading-none">
              Complete your profile
            </h2>
            <p className="text-[#6F6F6F] text-[16px] mt-3">
              Add your business details to continue your journey with E-Lekha-Jokha.
            </p>
          </div>

          {/* ── Two-card row ── */}
          <div className="flex flex-col lg:flex-row gap-5 mb-6 items-stretch">

            {/* LEFT: Logo upload card */}
            <div className="bg-white rounded-[28px] p-8 lg:p-10 flex flex-col items-center justify-center w-full lg:w-[260px] shrink-0 border border-[#F0EFE8]">
              <div className="relative mb-6">
                <div
                  className={`w-[130px] h-[130px] rounded-full overflow-hidden flex items-center justify-center relative transition-all ${profileImage ? "bg-transparent" : "bg-[#7E836A]"}`}
                >
                  {profileImage ? (
                    <img
                      src={URL.createObjectURL(profileImage)}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : currentUser.imageUrl ? (
                    <img
                      src={currentUser.imageUrl}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-white p-4 text-center">
                      <Camera size={28} className="mb-2 opacity-80" />
                      <span className="text-[9px] font-medium tracking-wide uppercase opacity-70 leading-tight">
                        Profile Placeholder<br />Safe and work
                      </span>
                    </div>
                  )}
                </div>
                {/* Edit badge */}
                <label className="absolute bottom-1 right-1 w-[38px] h-[38px] bg-[#2B2B2B] text-white rounded-full flex items-center justify-center cursor-pointer hover:bg-[#585F42] transition-colors border-[3px] border-white">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => { if (e.target.files?.[0]) setProfileImage(e.target.files[0]); }}
                  />
                </label>
              </div>

              <h3 className="text-[#2B2B2B] font-bold text-[15px] mb-[6px]">Business Logo</h3>
              <p className="text-[#A3A3A3] text-[12.5px] text-center mb-1 font-medium">
                Recommended 500x500px
              </p>
              <p className="text-[#A3A3A3] text-[11px] text-center font-bold tracking-widest uppercase">
                PNG or JPG
              </p>
            </div>

            {/* RIGHT: Form card */}
            <div className="flex-1 bg-white rounded-[28px] p-8 lg:p-10 border border-[#F0EFE8] flex flex-col">
              <form id="onboarding-form" onSubmit={submit} className="flex flex-col gap-5 w-full flex-1">

                <InputField
                  label="SHOP NAME"
                  placeholder="e.g. Heritage Silks & Crafts"
                  onChange={(v) => update("shopName", v)}
                />

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#6F6F6F] tracking-widest uppercase">
                    ADDRESS
                  </label>
                  <textarea
                    placeholder="Street name, Building No, City, State, Zip"
                    onChange={(e) => update("address", e.target.value)}
                    required
                    rows={3}
                    className="w-full bg-[#EDEBDD] text-[#2B2B2B] placeholder-[#A3A3A3] border-none rounded-[16px] py-4 px-5 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#585F42]/40 transition-all font-medium resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <MobileField
                    label="10 DIGIT MOBILE NUMBER"
                    placeholder="98765 43210"
                    onChange={(v) => update("mobile", v)}
                  />

                  {/* Gender toggle */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[#6F6F6F] tracking-widest uppercase">
                      GENDER
                    </label>
                    <div className="flex gap-2 h-[52px] bg-[#EDEBDD] p-1.5 rounded-[16px]">
                      {["Male", "Female"].map((g) => {
                        const isSelected = form.gender === g;
                        return (
                          <label
                            key={g}
                            className={`flex-1 flex items-center justify-center gap-2 rounded-xl cursor-pointer transition-all duration-200
                              ${isSelected
                                ? "bg-white text-[#2B2B2B] font-bold shadow-sm"
                                : "text-[#6F6F6F] font-medium hover:text-[#2B2B2B]"
                              }`}
                          >
                            <input
                              type="radio"
                              className="hidden"
                              name="gender"
                              value={g}
                              checked={isSelected}
                              onChange={(e) => update("gender", e.target.value)}
                            />
                            <span className={`text-[15px] pb-0.5 ${isSelected ? "text-[#2B2B2B]" : "text-[#A3A3A3]"}`}>
                              {g === "Male" ? "♂" : "♀"}
                            </span>
                            <span className="text-[13.5px]">{g}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="text-red-500 text-[13px] font-medium bg-red-50 p-3 rounded-xl border border-red-100 flex items-center gap-2">
                    {error}
                  </div>
                )}
              </form>
            </div>
          </div>

          {/* ── Action footer row ── */}
          <div className="flex items-center justify-between mb-6">
            <button
              type="button"
              onClick={() => router.back()}
              className="text-[14px] font-bold text-[#6F6F6F] hover:text-[#2B2B2B] transition-colors flex items-center gap-2"
            >
              <ArrowLeft size={16} /> Back to Verification
            </button>
            <button
              type="submit"
              form="onboarding-form"
              disabled={loading || imageUploading}
              className="bg-[#585F42] hover:bg-[#4C5237] text-white h-[56px] px-8 rounded-full font-semibold text-[15px] flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] disabled:opacity-70"
            >
              {loading || imageUploading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <><span>Finish setup</span><Check size={18} strokeWidth={2.5} /></>
              )}
            </button>
          </div>

          {/* ── Quote card ── */}
          <div className="bg-[#F0EFE8] rounded-[24px] p-6 pr-8 flex flex-col md:flex-row items-center gap-6 mt-auto">
            <div className="w-[88px] h-[88px] rounded-[18px] overflow-hidden relative shrink-0">
              {/* 👇 THE SECOND FIX: Replaced Next/Image with standard img tag */}
              <img
                src="/editorial.png"
                alt="Quote visual"
                className="object-cover w-full h-full"
              />
            </div>
            <div className="flex-1 text-center md:text-left">
              <p className="text-[14px] text-[#2B2B2B] font-medium leading-[1.6] mb-2.5">
                &quot;Put your heart, mind, and soul into even your smallest acts. This is the secret of success.&quot;
              </p>
              <p className="text-[#A3A3A3] text-[12px] font-medium">— Swami Sivananda</p>
            </div>
          </div>

        </div>
      </div>

      {/* Scrollbar hide */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .hidden-scrollbar::-webkit-scrollbar { display: none; }
          .hidden-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        `,
      }} />
    </div>
  );
}