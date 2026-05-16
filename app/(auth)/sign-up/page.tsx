//sign-up page.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { useSignUp } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import {
  Loader2, Eye, EyeOff, UserPlus, Mail, Briefcase,
  Shield, Edit3, Globe, Check, ArrowLeft, ArrowRight,
} from "lucide-react";
import Image from "next/image";

export default function SignUpPage() {
  // ── v7: only destructure signUp (isLoaded / setActive removed)
  const { signUp } = useSignUp();
  const router = useRouter();

  const [form, setForm] = useState({
    firstName: "", lastName: "", username: "",
    email: "", password: "", confirmPassword: "",
  });

  const [pendingVerification, setPendingVerification] = useState(false);
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Guard: wait for SDK to initialise
  if (!signUp) return <div className="p-10">Loading...</div>;

  const update = (k: string, v: string) =>
    setForm((p) => ({ ...p, [k]: v }));

  const code = otp.join("");

  /* ── OTP helpers (unchanged from frontend) ── */
  function handleOtpChange(idx: number, val: string) {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[idx] = digit;
    setOtp(next);
    if (digit && idx < 5) otpRefs.current[idx + 1]?.focus();
  }

  function handleOtpKeyDown(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !otp[idx] && idx > 0)
      otpRefs.current[idx - 1]?.focus();
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      const arr = pasted.split("");
      setOtp(arr);
      arr.forEach((val, i) => {
        if (otpRefs.current[i]) otpRefs.current[i]!.value = val;
      });
      otpRefs.current[5]?.focus();
      e.preventDefault();
    }
  }

  /* ── Resend cooldown via useEffect (cleaner than inline setInterval) ── */
  useEffect(() => {
    if (resendCooldown === 0) return;
    const timer = setInterval(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  /* ── Step 1: Create account & send OTP (v7 API) ── */
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      // v7: signUp.password() instead of signUp.create()
      const createRes = await signUp.password({
        firstName: form.firstName,
        lastName: form.lastName,
        username: form.username,
        emailAddress: form.email,
        password: form.password,
      });
      if (createRes?.error) throw { errors: [createRes.error] };

      // v7: signUp.verifications.sendEmailCode() instead of prepareEmailAddressVerification
      const prepRes = await signUp.verifications.sendEmailCode();
      if (prepRes?.error) throw { errors: [prepRes.error] };

      setPendingVerification(true);
      setOtp(Array(6).fill(""));
    } catch (err: unknown) {
      const e = err as { errors?: { message?: string; longMessage?: string }[] };
      setError(
        e.errors?.[0]?.longMessage ||
        e.errors?.[0]?.message ||
        "Sign up failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  /* ── Step 2: Verify OTP (v7 API) ── */
  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (code.length < 6) {
      setError("Enter complete 6-digit code");
      return;
    }

    setLoading(true);
    try {
      // v7: signUp.verifications.verifyEmailCode() instead of attemptEmailAddressVerification
      const verifyRes = await signUp.verifications.verifyEmailCode({ code });
      if (verifyRes?.error) throw { errors: [verifyRes.error] };

      // v7: signUp.finalize() with navigate callback instead of setActive
      if (signUp.status === "complete") {
        await signUp.finalize({
          navigate: () => router.push("/onboarding"),
        });
      } else {
        setError("Verification incomplete. Please try again.");
      }
    } catch (err: unknown) {
      const e = err as { errors?: { message?: string; longMessage?: string }[] };
      setError(
        e.errors?.[0]?.longMessage ||
        e.errors?.[0]?.message ||
        "Invalid code. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  /* ── Resend OTP (v7 API) ── */
  async function resendCode() {
    if (resendCooldown > 0) return;
    setError("");
    try {
      // v7: signUp.verifications.sendEmailCode() instead of prepareEmailAddressVerification
      const res = await signUp.verifications.sendEmailCode();
      if (res?.error) throw { errors: [res.error] };
      setResendCooldown(30);
    } catch {
      setError("Could not resend code. Please try again.");
    }
  }

  /* ── Step config (unchanged from frontend) ── */
  const activeStep = pendingVerification ? 1 : 0;

  const steps = [
    {
      icon: <UserPlus size={16} />,
      num: "STEP 1",
      label: "Account",
      sub: "Security credentials",
      status: pendingVerification ? "done" : "active",
    },
    {
      icon: <Mail size={16} />,
      num: "STEP 2",
      label: "Verification",
      sub: "Identity confirmation",
      status: pendingVerification ? "active" : "pending",
    },
    {
      icon: <Briefcase size={16} />,
      num: "STEP 3",
      label: "Business Profile",
      sub: "Company details",
      status: "pending",
    },
  ];

  /* ══════════════════════════════════════════
     RENDER  (100% original frontend markup)
  ══════════════════════════════════════════ */
  return (
    <div className="flex min-h-screen font-sans text-[#2B2B2B] bg-[#F5F4EF]">

      {/* ─────────── LEFT SIDEBAR ─────────── */}
      <div className="hidden md:flex w-[280px] xl:w-[320px] flex-col justify-between bg-[#F5F4EF] sticky top-0 h-screen overflow-hidden relative">

        {/* Branding */}
        <div className="px-8 xl:px-12 pt-10">
          <h1 className="text-xl font-bold mb-1 tracking-tight">E-Lekha-Jokha</h1>
          <p className="text-[13px] text-[#6F6F6F]">
            Onboarding<br />Step-by-step setup
          </p>
        </div>

        {/* Steps — vertical line connector style */}
        <div className="flex-1 flex items-center px-8 xl:px-12">
          <div className="flex flex-col w-full">
            {steps.map((step, i) => {
              const isDone = step.status === "done";
              const isActive = step.status === "active";
              const isPending = step.status === "pending";
              const isLast = i === steps.length - 1;
              return (
                <div key={i} className="flex items-stretch gap-5">
                  {/* Icon + connector line column */}
                  <div className="flex flex-col items-center shrink-0" style={{ width: "40px" }}>
                    {/* Circle */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors duration-500 z-10
                      ${isDone ? "bg-[#5F6648] text-white" : isActive ? "bg-transparent border-2 border-[#5F6648] text-[#5F6648]" : "bg-transparent border-2 border-[#D6D4C2] text-[#C0BEB4]"}
                    `}>
                      {isDone ? <Check size={16} strokeWidth={2.5} /> : step.icon}
                    </div>
                    {/* Connector line */}
                    {!isLast && (
                      <div className={`w-[2px] flex-1 my-1 rounded-full transition-colors duration-500
                        ${isDone ? "bg-[#5F6648]" : "bg-[#D6D4C2]"}
                      `} style={{ minHeight: "32px" }} />
                    )}
                  </div>
                  {/* Text */}
                  <div className={`pt-1 ${isLast ? "pb-0" : "pb-8"}`}>
                    <p className={`text-[10px] font-bold uppercase tracking-widest mb-0.5
                      ${isPending ? "text-[#BEBDB2]" : "text-[#5F6648]"}`}>
                      {step.num}
                    </p>
                    <p className={`font-bold text-[14px] leading-tight
                      ${isPending ? "text-[#A3A3A3]" : "text-[#2B2B2B]"}`}>
                      {step.label}
                    </p>
                    <p className={`text-[12px] mt-0.5
                      ${isPending ? "text-[#BEBDB2]" : "text-[#6F6F6F]"}`}>
                      {step.sub}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Secure Workspace badge */}
        <div className="px-8 xl:px-12 pb-10">
          <div className="bg-[#EDEBDD] rounded-xl p-4 flex flex-col items-center gap-2 opacity-80 hover:opacity-100 transition-opacity">
            <Shield className="text-[#5A6043]" size={20} />
            <p className="text-[#5A6043] text-[10px] font-bold tracking-widest uppercase text-center">
              Secure Workspace
            </p>
          </div>
        </div>

        {/* Right-edge progress bar — 3 segments */}
        <div className="absolute right-0 top-0 h-full flex flex-col" style={{ width: "4px", gap: "16px" }}>
          {[0, 1, 2].map((segIdx) => (
            <div
              key={segIdx}
              style={{
                flex: 1,
                backgroundColor: segIdx <= activeStep ? "#5F6648" : "#E0DED4",
                transition: "background-color 0.5s ease",
              }}
            />
          ))}
        </div>
      </div>

      {/* ─────────── MIDDLE CONTENT ─────────── */}
      <div className="flex-1 flex flex-col pt-12 pb-8 px-6 lg:px-16 overflow-y-auto h-screen">
        <div className="max-w-[520px] w-full mx-auto flex-1 flex flex-col">

          {/* ══════ STEP 1 ══════ */}
          {!pendingVerification ? (
            <>
              <div className="mb-8">
                <h2 className="text-4xl font-extrabold mb-3 tracking-tighter">E-Lekha-Jokha</h2>
                <p className="text-[#6F6F6F] text-[15px] font-medium">
                  Create your account to get started
                </p>
              </div>

              <div className="bg-white/60 backdrop-blur-sm rounded-[32px] p-8 sm:p-10 border border-[#E8E6DE] mb-8">
                <form onSubmit={submit} className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <InputField label="FIRST NAME" placeholder="John" onChange={(v) => update("firstName", v)} />
                    <InputField label="LAST NAME" placeholder="Doe" onChange={(v) => update("lastName", v)} />
                  </div>
                  <InputField
                    label="USERNAME" placeholder="@ johndoe123"
                    autoComplete="username" onChange={(v) => update("username", v)}
                  />
                  <InputField
                    label="EMAIL" placeholder="john@example.com"
                    type="email" autoComplete="email" onChange={(v) => update("email", v)}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <PasswordField
                      label="PASSWORD" placeholder="Min. 8 characters"
                      show={showPassword} toggle={() => setShowPassword((v) => !v)}
                      onChange={(v) => update("password", v)}
                    />
                    <PasswordField
                      label="CONFIRM PASSWORD" placeholder="Re-enter password"
                      show={showConfirm} toggle={() => setShowConfirm((v) => !v)}
                      onChange={(v) => update("confirmPassword", v)}
                    />
                  </div>

                  {error && <ErrorBox msg={error} />}

                  <button
                    type="submit" disabled={loading}
                    className="w-full bg-[#5A6043] hover:bg-[#4E5438] text-white rounded-[20px] h-[56px] font-semibold text-[15px] flex items-center justify-center gap-2 transition-all mt-4 active:scale-[0.98]"
                  >
                    {loading
                      ? <Loader2 className="animate-spin" size={20} />
                      : <><span>Create account</span><ArrowRight size={16} /></>}
                  </button>

                  <p className="text-center text-[14px] text-[#6F6F6F] mt-6 font-medium">
                    Already have an account?{" "}
                    <a href="/sign-in" className="text-[#2B2B2B] font-bold hover:text-[#5A6043] transition-colors">
                      Sign in
                    </a>
                  </p>
                </form>
              </div>
            </>
          ) : (

            /* ══════ STEP 2 ══════ */
            <>
              {/* Header */}
              <div className="mb-10">
                <p className="text-[11px] font-bold tracking-[0.15em] uppercase text-[#5F6648] mb-4">
                  Step 2: Security Check
                </p>
                <h2 className="text-5xl font-extrabold tracking-tighter text-[#2B2B2B] leading-none">
                  Code Verification
                </h2>
              </div>

              {/* OTP card — white, rounded, generous padding */}
              <div className="bg-white rounded-[28px] p-8 sm:p-10 border border-[#ECEAE4] mb-5 shadow-sm">
                <form onSubmit={verify} className="space-y-8">
                  <p className="text-[15px] text-[#6F6F6F] font-medium leading-relaxed">
                    Enter the 6-digit code sent to{" "}
                    <span className="text-[#2B2B2B] font-semibold">
                      {form.email || "john@example.com"}
                    </span>
                  </p>

                  {/* 6 OTP boxes — square-ish, large, matching image */}
                  <div className="flex gap-3" onPaste={handleOtpPaste}>
                    {otp.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => { otpRefs.current[idx] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        placeholder="·"
                        className="flex-1 min-w-0 h-[72px] bg-[#EDEEE6] text-[#2B2B2B] border border-[#DDDDD4] rounded-2xl text-2xl font-semibold text-center focus:outline-none focus:ring-2 focus:ring-[#5A6043]/30 focus:border-[#5A6043] transition-all placeholder:text-[#C5C9BB] caret-[#5F6648]"
                      />
                    ))}
                  </div>

                  {error && <ErrorBox msg={error} />}

                  {/* Verify button — full pill shape as in image */}
                  <button
                    type="submit" disabled={loading}
                    className="w-full bg-[#5A6043] hover:bg-[#4E5438] text-white rounded-full h-[60px] font-semibold text-[16px] flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                  >
                    {loading
                      ? <Loader2 className="animate-spin" size={20} />
                      : <><span>Verify &amp; continue</span><ArrowRight size={16} /></>}
                  </button>

                  {/* Back / Resend row */}
                  <div className="flex items-center justify-between text-[14px] text-[#6F6F6F] font-semibold pt-1">
                    <button
                      type="button"
                      onClick={() => { setPendingVerification(false); setOtp(Array(6).fill("")); setError(""); }}
                      className="flex items-center gap-1.5 hover:text-[#5A6043] transition-colors"
                    >
                      <ArrowLeft size={14} /> Back
                    </button>
                    <button
                      type="button" onClick={resendCode} disabled={resendCooldown > 0}
                      className="font-semibold hover:text-[#5A6043] transition-colors disabled:opacity-40"
                    >
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                    </button>
                  </div>
                </form>
              </div>

              {/* Secure Verification banner — flat, borderless bg, matching image */}
              <div className="flex items-start gap-4 bg-[#F0EFE7] rounded-[20px] px-6 py-5">
                <div className="w-8 h-8 rounded-full bg-[#E0E2D6] flex items-center justify-center shrink-0 mt-0.5">
                  <Shield size={15} className="text-[#5A6043]" />
                </div>
                <div>
                  <p className="font-bold text-[14px] text-[#2B2B2B] mb-1">Secure Verification</p>
                  <p className="text-[13px] text-[#6F6F6F] leading-relaxed">
                    We use industry-standard encryption to protect your account during
                    the onboarding process. Never share your 6-digit code with anyone.
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Footer */}
          <div className="mt-auto pt-6 border-t border-[#ECEAE4] flex items-center justify-between text-[10px] font-bold text-[#A3A3A3] tracking-widest uppercase pb-4">
            <div className="flex gap-8">
              <a href="#" className="hover:text-[#5A6043] transition-colors">Privacy</a>
              <a href="#" className="hover:text-[#5A6043] transition-colors">Terms</a>
              <a href="#" className="hover:text-[#5A6043] transition-colors">Help</a>
            </div>
            <div className="flex items-center gap-2 hover:text-[#5A6043] transition-colors cursor-pointer">
              <Globe size={14} /><span>English (US)</span>
            </div>
          </div>

        </div>
      </div>

      {/* ─────────── RIGHT SIDEBAR ─────────── */}
      <div className="hidden xl:flex w-[380px] h-screen sticky top-0 relative overflow-hidden bg-[#F5F4EF]">

        {!pendingVerification ? (
          <div className="flex flex-col gap-6 p-8 w-full h-full">
            <div className="bg-white rounded-[32px] p-8 flex-1 flex flex-col border border-[#ECEAE4]">
              <div className="w-12 h-12 rounded-full bg-[#E8EDE0] flex items-center justify-center mb-6 text-[#5A6043]">
                <Edit3 size={20} strokeWidth={2.5} />
              </div>
              <h3 className="text-[22px] font-bold mb-3 tracking-tight text-[#2B2B2B]">
                Precision<br />Bookkeeping
              </h3>
              <p className="text-[#6F6F6F] text-[15px] leading-relaxed mb-8">
                Manage your finances with the elegance of a classic ledger, refined for the modern age.
              </p>
              <div className="bg-[#F0EFE7] rounded-[20px] p-6 mt-auto">
                <div className="h-2 w-full  bg-[#DADBCF] rounded-full mb-3 opacity-60" />
                <div className="h-2 w-3/4   bg-[#DADBCF] rounded-full mb-3 opacity-60" />
                <div className="h-2 w-1/2   bg-[#DADBCF] rounded-full       opacity-60" />
              </div>
            </div>

            <div className="bg-white rounded-[32px] flex-1 overflow-hidden relative border border-[#ECEAE4] group">
              <Image
                src="/editorial.png" alt="Editorial Workspace" fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
                sizes="400px" priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
              <div className="absolute bottom-8 left-8 right-8">
                <p className="text-white text-[10px] font-bold tracking-[0.2em] uppercase leading-relaxed">
                  Editorial Workspace<br />V1.0
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full h-full relative">
            <div className="relative w-full h-full">
              <Image
                src="/verification-bg.png"
                alt="Verification background"
                fill
                className="object-cover"
                sizes="400px"
                priority
              />
            </div>
            <div className="absolute inset-0 bg-black/15" />
            <div
              className="absolute bottom-10 left-6 right-6 rounded-[28px] p-7"
              style={{
                background: "rgba(255,255,255,0.22)",
                backdropFilter: "blur(22px)",
                WebkitBackdropFilter: "blur(22px)",
                border: "1px solid rgba(255,255,255,0.30)",
              }}
            >
              <div className="w-10 h-10 rounded-full bg-white/25 flex items-center justify-center mb-5">
                <Shield size={18} className="text-white" />
              </div>
              <p className="text-white text-[18px] font-bold leading-snug tracking-tight mb-6">
                "Precision in numbers starts with clarity in identity."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <Shield size={14} className="text-white/70" />
                </div>
                <div>
                  <p className="text-white text-[13px] font-bold leading-none mb-1">System Compliance</p>
                  <p className="text-white/55 text-[10px] font-bold tracking-widest uppercase">Verified Authority</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

/* ═══════════════════════════════════════
   Shared sub-components (unchanged)
═══════════════════════════════════════ */

function InputField({
  label, type = "text", placeholder, autoComplete, onChange,
}: {
  label: string; type?: string; placeholder?: string;
  autoComplete?: string; onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-bold text-[#6F6F6F] tracking-widest uppercase">{label}</label>
      <input
        type={type} placeholder={placeholder} autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)} required
        className="w-full bg-[#E8EDE0] text-[#2C2C2C] placeholder:text-[#A3A3A3] border-none rounded-2xl h-14 px-5 text-[15px] focus:outline-none focus:ring-2 focus:ring-[#5A6043]/40 transition-all font-medium"
      />
    </div>
  );
}

function PasswordField({
  label, placeholder, show, toggle, onChange,
}: {
  label: string; placeholder: string; show: boolean;
  toggle: () => void; onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-bold text-[#6F6F6F] tracking-widest uppercase">{label}</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"} placeholder={placeholder}
          autoComplete="new-password" onChange={(e) => onChange(e.target.value)} required
          className="w-full bg-[#E8EDE0] text-[#2C2C2C] placeholder:text-[#A3A3A3] border-none rounded-2xl h-14 px-5 pr-12 text-[15px] focus:outline-none focus:ring-2 focus:ring-[#5A6043]/40 transition-all font-medium"
        />
        <button
          type="button" onClick={toggle}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-[#A3A3A3] hover:text-[#5A6043] transition-colors"
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div className="text-red-500 text-sm font-medium bg-red-50 p-3 rounded-xl border border-red-100 flex items-center gap-2">
      <Shield size={16} />{msg}
    </div>
  );
}