"use client";

import { useState, useEffect, useRef } from "react";
import { useSignIn } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Eye, EyeOff, Mail, Lock, KeyRound, Loader2, ArrowLeft,
} from "lucide-react";

/**
 * Clerk Core 3 surfaces API failures as a ClerkAPIResponseError whose top-level
 * `code` is always "api_response_error" — the per-field code lives in `.errors[0]`.
 * Same defensive read as the sign-up page.
 */
type FieldError = { code?: string; message?: string; longMessage?: string };

function fieldCodeOf(err: unknown): string {
  const clerkError = err as (FieldError & { errors?: FieldError[] }) | null;
  return (clerkError?.errors?.[0] ?? clerkError)?.code ?? "";
}

/** Maps a Clerk error to a user-safe message. Raw Clerk text is never shown. */
function friendlyMessage(err: unknown, stage: "request" | "reset"): string {
  const code = fieldCodeOf(err);

  if (code === "too_many_requests" || code.includes("rate_limit")) {
    return "Too many attempts. Please wait a moment and try again.";
  }

  if (stage === "request") {
    if (code === "form_identifier_not_found") {
      return "No account found with that email.";
    }
    return "Something went wrong. Please try again.";
  }

  switch (code) {
    case "form_code_incorrect":
    case "verification_failed":
    case "verification_expired":
      return "That code is incorrect or has expired. Please try again.";
    case "verification_not_sent":
    case "verification_already_verified":
      return "Your code was already verified \u2014 just choose your new password and submit again.";
    case "form_password_pwned":
      return "That password has appeared in a data breach. Please choose a different one.";
    case "form_password_length_too_short":
      return "Your password must be at least 8 characters long.";
    default:
      return "Something went wrong. Please try again.";
  }
}

const MIN_PASSWORD_LENGTH = 8;

/** This app doesn't use 2FA, but fail loudly rather than silently if Clerk asks for it. */
const TWO_FACTOR_MESSAGE =
  "This account has two-factor authentication enabled, which this page cannot complete. Please sign in with your password, or contact support.";

export default function ForgotPasswordPage() {
  const { signIn, fetchStatus } = useSignIn();
  const router = useRouter();

  // ── Stage machine ───────────────────────────────────────────────────────
  const [stage, setStage] = useState<"request" | "reset">("request");

  // Stage 1
  const [email, setEmail] = useState("");

  // Stage 2
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Resend cooldown ticker — hook must be above all early returns
  useEffect(() => {
    if (resendCooldown === 0) return;
    const timer = setInterval(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  if (!signIn) return null;

  const otpCode = otp.join("");
  const isBusy = submitting || fetchStatus === "fetching";

  // ── OTP helpers (mirrors the sign-in MFA screen) ────────────────────────
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
      setOtp(pasted.split(""));
      otpRefs.current[5]?.focus();
      e.preventDefault();
    }
  }

  // ── Stage 1: request a reset code ───────────────────────────────────────
  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setSubmitting(true);
    try {
      const { error: createError } = await signIn!.create({ identifier: email.trim() });
      if (createError) {
        setError(friendlyMessage(createError, "request"));
        return;
      }

      const { error: sendError } = await signIn!.resetPasswordEmailCode.sendCode();
      if (sendError) {
        setError(friendlyMessage(sendError, "request"));
        return;
      }

      setStage("reset");
      setOtp(Array(6).fill(""));
      setResendCooldown(30);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Stage 2: verify code, then set the new password ─────────────────────
  async function resetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (otpCode.length < 6) {
      setError("Please enter the complete 6-digit code.");
      return;
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(`Your password must be at least ${MIN_PASSWORD_LENGTH} characters long.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Those passwords don't match. Please re-enter them.");
      return;
    }

    setSubmitting(true);
    try {
      // A reset code is single-use: once verifyCode() succeeds the factor is
      // consumed and status moves to "needs_new_password". If submitPassword()
      // then fails (a pwned/short password, or a network blip), the user is
      // returned to this same form — and a second click must NOT re-verify, or
      // Clerk rejects it with "verification_not_sent" and the flow dead-ends.
      // So resume at the password step whenever the code is already verified.
      const statusBeforeVerify = signIn!.status;
      if (statusBeforeVerify !== "needs_new_password") {
        // Core 3 splits this into two calls: verifyCode() only takes the code and
        // moves status to "needs_new_password"; submitPassword() then completes.
        const { error: verifyError } = await signIn!.resetPasswordEmailCode.verifyCode({
          code: otpCode,
        });
        if (verifyError) {
          setError(friendlyMessage(verifyError, "reset"));
          return;
        }
      }

      // `signIn.status` is a readonly getter that Clerk mutates across awaits, so
      // each stage reads it into its own local — otherwise TS narrows the union
      // from the earlier check and flags the later one as unreachable.
      const statusAfterVerify = signIn!.status;
      if (statusAfterVerify === "needs_second_factor") {
        setError(TWO_FACTOR_MESSAGE);
        return;
      }

      const { error: passwordError } = await signIn!.resetPasswordEmailCode.submitPassword({
        password: newPassword,
      });
      if (passwordError) {
        setError(friendlyMessage(passwordError, "reset"));
        return;
      }

      const statusAfterReset = signIn!.status;
      if (statusAfterReset === "complete") {
        // Signs the user in. proxy.ts sends them on to /onboarding if needed.
        await signIn!.finalize({ navigate: () => router.replace("/dashboard") });
      } else if (statusAfterReset === "needs_second_factor") {
        setError(TWO_FACTOR_MESSAGE);
      } else {
        setError("Password reset could not be completed. Please try again or contact support.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  // ── Resend the code ─────────────────────────────────────────────────────
  async function resendCode() {
    if (resendCooldown > 0 || resending) return;
    setError("");
    setResending(true);
    try {
      const { error: sendError } = await signIn!.resetPasswordEmailCode.sendCode();
      if (sendError) {
        setError(friendlyMessage(sendError, "reset"));
        return;
      }
      setResendCooldown(30);
    } finally {
      setResending(false);
    }
  }

  const inputClass =
    "pl-[44px] h-[48px] rounded-[12px] border-none bg-[#EDEBDD] text-[#2C2C2C] placeholder:text-[#A3A3A3] focus-visible:ring-2 focus-visible:ring-[#585F42] focus-visible:ring-offset-0 transition-all font-medium text-base shadow-none";
  const labelClass =
    "text-[12px] tracking-[0.08em] text-[#6F6F6F] font-semibold uppercase ml-1";

  return (
    <div className="flex min-h-screen bg-[#F5F4EF] w-full font-sans">
      {/* Left: Image — identical to sign-in */}
      <div className="hidden lg:block lg:w-1/2 relative bg-[#585F42]/10 overflow-hidden">
        <Image
          src="/login3-bg.png"
          alt="E-Lekha-Jokha Background"
          fill
          priority
          sizes="50vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent pointer-events-none" />
        <div className="absolute bottom-[40px] left-[40px] flex flex-col gap-[12px] pointer-events-none z-10">
          <h2 className="text-white text-[40px] font-semibold leading-[1.2]">
            Precision in every entry.
          </h2>
          <p className="text-white/80 text-[14px] font-normal leading-[1.6] max-w-[320px]">
            E-Lekha-Jokha transforms complex financial data into a curated editorial workspace.
          </p>
        </div>
      </div>

      {/* Right: Form Container */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-[40px]">
        <div className="w-full max-w-[420px] flex flex-col justify-center">

          {/* Header */}
          <div className="flex flex-col items-center mb-[32px]">
            <div className="bg-[#DADBCF] p-[12px] rounded-full mb-[16px]">
              <KeyRound className="h-6 w-6 text-[#585F42]" />
            </div>
            <h1 className="text-[28px] md:text-[32px] font-semibold text-[#2B2B2B] text-center">
              {stage === "request" ? "Reset Your Password" : "Choose a New Password"}
            </h1>
            <p className="text-[#6F6F6F] mt-2 text-sm text-center leading-relaxed max-w-[320px]">
              {stage === "request"
                ? "Enter the email address on your account and we'll send you a 6-digit reset code."
                : `Enter the 6-digit code sent to ${email} and pick a new password.`}
            </p>
          </div>

          {/* ── Stage 1: request code ── */}
          {stage === "request" ? (
            <form onSubmit={requestCode} className="flex flex-col gap-[24px] w-full">
              <div className="space-y-[6px]">
                <Label htmlFor="email" className={labelClass}>
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#A3A3A3]" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    className={inputClass}
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              {error && (
                <Alert variant="destructive" className="py-3 border-none bg-red-50 text-red-600 rounded-[12px]">
                  <AlertDescription className="text-sm font-medium">{error}</AlertDescription>
                </Alert>
              )}

              {/* Smart CAPTCHA target — signIn.create() may trigger bot protection */}
              <div id="clerk-captcha" />

              <Button
                className="w-full h-[52px] rounded-[999px] bg-[#585F42] hover:bg-[#4C5237] text-white font-semibold text-base transition-all select-none border-none shadow-[0_8px_20px_rgba(0,0,0,0.08)] hover:shadow-[0_12px_24px_rgba(0,0,0,0.12)] hover:-translate-y-0.5"
                disabled={isBusy}
                type="submit"
              >
                {isBusy ? (
                  <><Loader2 className="animate-spin mr-2 h-5 w-5" />Sending code...</>
                ) : (
                  "Send reset code"
                )}
              </Button>
            </form>
          ) : (
            /* ── Stage 2: verify code + set new password ── */
            <form onSubmit={resetPassword} className="flex flex-col gap-[24px] w-full">
              <div className="space-y-[6px]">
                <Label className={labelClass}>Reset Code</Label>
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
                      autoFocus={idx === 0}
                      aria-label={`Reset code digit ${idx + 1}`}
                      className="flex-1 min-w-0 h-[64px] bg-[#EDEBDD] text-[#2B2B2B] border border-[#DDDDD4] rounded-2xl text-2xl font-semibold text-center focus:outline-none focus:ring-2 focus:ring-[#585F42]/30 focus:border-[#585F42] transition-all placeholder:text-[#C5C9BB] caret-[#585F42]"
                    />
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-[16px]">
                {/* New password */}
                <div className="space-y-[6px]">
                  <Label htmlFor="newPassword" className={labelClass}>
                    New Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#A3A3A3]" />
                    <Input
                      id="newPassword"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      className={`${inputClass} pr-[44px]`}
                      placeholder="At least 8 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#A3A3A3] hover:text-[#585F42] transition-colors"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {/* Confirm password */}
                <div className="space-y-[6px]">
                  <Label htmlFor="confirmPassword" className={labelClass}>
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#A3A3A3]" />
                    <Input
                      id="confirmPassword"
                      type={showConfirm ? "text" : "password"}
                      autoComplete="new-password"
                      className={`${inputClass} pr-[44px]`}
                      placeholder="Re-enter new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#A3A3A3] hover:text-[#585F42] transition-colors"
                      aria-label={showConfirm ? "Hide password" : "Show password"}
                    >
                      {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                    <p className="text-[13px] text-red-600 font-medium ml-1 mt-1">
                      Passwords don&apos;t match.
                    </p>
                  )}
                </div>
              </div>

              {error && (
                <Alert variant="destructive" className="py-3 border-none bg-red-50 text-red-600 rounded-[12px]">
                  <AlertDescription className="text-sm font-medium">{error}</AlertDescription>
                </Alert>
              )}

              <Button
                className="w-full h-[52px] rounded-[999px] bg-[#585F42] hover:bg-[#4C5237] text-white font-semibold text-base transition-all select-none border-none shadow-[0_8px_20px_rgba(0,0,0,0.08)] hover:shadow-[0_12px_24px_rgba(0,0,0,0.12)] hover:-translate-y-0.5"
                disabled={isBusy || resending}
                type="submit"
              >
                {isBusy ? (
                  <><Loader2 className="animate-spin mr-2 h-5 w-5" />Resetting...</>
                ) : (
                  "Reset Password & Sign In"
                )}
              </Button>

              {/* Back + Resend row */}
              <div className="flex items-center justify-between text-sm text-[#6F6F6F] font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setStage("request");
                    setOtp(Array(6).fill(""));
                    setNewPassword("");
                    setConfirmPassword("");
                    setError("");
                  }}
                  className="flex items-center gap-1.5 hover:text-[#585F42] transition-colors"
                >
                  <ArrowLeft size={14} /> Use a different email
                </button>
                <button
                  type="button"
                  onClick={resendCode}
                  disabled={resendCooldown > 0 || resending || isBusy}
                  className="hover:text-[#585F42] transition-colors disabled:opacity-40"
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                </button>
              </div>
            </form>
          )}

          {/* Footer */}
          <div className="mt-8 flex flex-col items-center w-full">
            <div className="w-full h-[1px] bg-[#E8E6DF] mb-6"></div>
            <p className="text-sm text-[#6F6F6F] font-medium">
              Remembered your password?{" "}
              <Link href="/sign-in" className="text-[#6F6F6F] hover:text-[#585F42] font-semibold transition-colors">
                Sign in
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
