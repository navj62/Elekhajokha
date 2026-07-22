"use client";

import { useState, useEffect, useRef } from "react";
import { useSignIn, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Eye, EyeOff, User, Lock, BookOpen, Loader2, Shield, ArrowLeft,
} from "lucide-react";

type MfaStrategy = "email_code" | "phone_code" | "totp" | "backup_code";

export default function SignInPage() {
  const { signIn, fetchStatus } = useSignIn();
  const { user, isLoaded: userLoaded } = useUser();
  const router = useRouter();

  // Credential fields
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  // MFA / second-factor state
  const [mfaActive, setMfaActive] = useState(false);
  const [mfaStrategy, setMfaStrategy] = useState<MfaStrategy | null>(null);
  const [mfaSending, setMfaSending] = useState(false);
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const [backupCode, setBackupCode] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Resend cooldown ticker — hook must be above all early returns
  useEffect(() => {
    if (resendCooldown === 0) return;
    const timer = setInterval(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (userLoaded && user) {
      router.replace("/dashboard");
    }
  }, [user, userLoaded, router]);

  if (!signIn || !userLoaded) return null;

  const otpCode = otp.join("");
  const isLoading = fetchStatus === "fetching";

  // ── OTP helpers (ported from sign-up) ──────────────────────────────────
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

  // ── Send code for chosen strategy ─────────────────────────────────────
  async function sendMfaCode(strategy: MfaStrategy): Promise<boolean> {
    if (strategy === "email_code") {
      setMfaSending(true);
      const { error: err } = await signIn.mfa.sendEmailCode();
      setMfaSending(false);
      if (err) { setError(err.longMessage || err.message || "Failed to send verification code."); return false; }
      setResendCooldown(30);
    } else if (strategy === "phone_code") {
      setMfaSending(true);
      const { error: err } = await signIn.mfa.sendPhoneCode();
      setMfaSending(false);
      if (err) { setError(err.longMessage || err.message || "Failed to send verification code."); return false; }
      setResendCooldown(30);
    }
    // totp / backup_code: no send step
    return true;
  }

  // ── Enter MFA mode: pick strategy, send code if needed ────────────────
  async function enterMfa() {
    const factors = signIn.supportedSecondFactors ?? [];
    const preference: MfaStrategy[] = ["email_code", "phone_code", "totp", "backup_code"];
    const chosen = preference.find((s) => factors.some((f) => f.strategy === s)) ?? null;

    if (!chosen) {
      setError("Additional verification is required but no supported method was found. Please contact support.");
      return;
    }

    setMfaStrategy(chosen);
    setMfaActive(true);
    setOtp(Array(6).fill(""));
    setBackupCode("");
    setError("");
    await sendMfaCode(chosen);
  }

  // ── Resend code ───────────────────────────────────────────────────────
  async function resendMfaCode() {
    if (resendCooldown > 0 || !mfaStrategy) return;
    setError("");
    await sendMfaCode(mfaStrategy);
  }

  // ── Verify MFA code ───────────────────────────────────────────────────
  async function verifyMfa(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const code = mfaStrategy === "backup_code" ? backupCode.trim() : otpCode;

    if (!code) {
      setError("Please enter the verification code.");
      return;
    }
    if (mfaStrategy !== "backup_code" && code.length < 6) {
      setError("Please enter the complete 6-digit code.");
      return;
    }

    let clerkError;
    if (mfaStrategy === "email_code") {
      ({ error: clerkError } = await signIn.mfa.verifyEmailCode({ code }));
    } else if (mfaStrategy === "phone_code") {
      ({ error: clerkError } = await signIn.mfa.verifyPhoneCode({ code }));
    } else if (mfaStrategy === "totp") {
      ({ error: clerkError } = await signIn.mfa.verifyTOTP({ code }));
    } else if (mfaStrategy === "backup_code") {
      ({ error: clerkError } = await signIn.mfa.verifyBackupCode({ code }));
    }

    if (clerkError) {
      setError(clerkError.longMessage || clerkError.message || "Invalid code. Please try again.");
      return;
    }

    if (signIn.status === "complete") {
      await signIn.finalize({ navigate: () => router.replace("/dashboard") });
    } else {
      setError("Verification incomplete. Please try again or contact support.");
    }
  }

  // ── Step 1: Password sign-in ──────────────────────────────────────────
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const { error: clerkError } = await signIn.password({
      identifier: username,
      password: password,
    });

    if (clerkError) {
      setError(clerkError.longMessage || clerkError.message || "Invalid credentials.");
      return;
    }

    if (signIn.status === "complete") {
      await signIn.finalize({ navigate: () => router.replace("/dashboard") });
    } else if (
      signIn.status === "needs_client_trust" ||
      signIn.status === "needs_second_factor"
    ) {
      await enterMfa();
    } else if (signIn.status === "needs_new_password") {
      setError(
        "Your password has expired and must be reset before you can sign in. Use 'Forgot Password' below to set a new one."
      );
    } else {
      setError("Sign-in could not be completed. Please try again or contact support.");
    }
  }

  // ── MFA screen ────────────────────────────────────────────────────────
  if (mfaActive) {
    const canResend = mfaStrategy === "email_code" || mfaStrategy === "phone_code";
    const isBackup = mfaStrategy === "backup_code";

    const hint =
      mfaStrategy === "email_code" ? "Enter the 6-digit code sent to your email address." :
      mfaStrategy === "phone_code" ? "Enter the 6-digit code sent to your phone." :
      mfaStrategy === "totp"       ? "Enter the 6-digit code from your authenticator app." :
                                     "Enter one of your saved backup codes.";

    return (
      <div className="flex min-h-screen bg-[#F5F4EF] w-full font-sans">
        {/* Left image — identical to main sign-in */}
        <div className="hidden lg:block lg:w-1/2 relative bg-[#585F42]/10 overflow-hidden">
          <Image
            src="/login3-bg.png"
            alt="E-Lekha-Jokha Background"
            fill priority sizes="50vw"
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

        {/* Right: MFA form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-[40px]">
          <div className="w-full max-w-[420px] flex flex-col justify-center">

            {/* Header */}
            <div className="flex flex-col items-center mb-[32px]">
              <div className="bg-[#DADBCF] p-[12px] rounded-full mb-[16px]">
                <Shield className="h-6 w-6 text-[#585F42]" />
              </div>
              <h1 className="text-[28px] md:text-[32px] font-semibold text-[#2B2B2B] text-center">
                Verify Your Identity
              </h1>
              <p className="text-[#6F6F6F] mt-2 text-sm text-center leading-relaxed max-w-[300px]">
                {hint}
              </p>
            </div>

            {mfaSending && (
              <div className="flex items-center justify-center gap-2 text-[#6F6F6F] text-sm mb-6">
                <Loader2 className="animate-spin h-4 w-4" /> Sending code…
              </div>
            )}

            <form onSubmit={verifyMfa} className="flex flex-col gap-[24px] w-full">
              {/* Backup code: plain text input */}
              {isBackup ? (
                <div className="space-y-[6px]">
                  <Label className="text-[12px] tracking-[0.08em] text-[#6F6F6F] font-semibold uppercase ml-1">
                    Backup Code
                  </Label>
                  <Input
                    value={backupCode}
                    onChange={(e) => setBackupCode(e.target.value)}
                    placeholder="e.g. a1b2-c3d4-e5f6"
                    className="h-[48px] rounded-[12px] border-none bg-[#EDEBDD] text-[#2C2C2C] placeholder:text-[#A3A3A3] focus-visible:ring-2 focus-visible:ring-[#585F42] focus-visible:ring-offset-0 font-medium text-base shadow-none"
                    autoFocus
                  />
                </div>
              ) : (
                /* OTP digit boxes */
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
                      className="flex-1 min-w-0 h-[64px] bg-[#EDEBDD] text-[#2B2B2B] border border-[#DDDDD4] rounded-2xl text-2xl font-semibold text-center focus:outline-none focus:ring-2 focus:ring-[#585F42]/30 focus:border-[#585F42] transition-all placeholder:text-[#C5C9BB] caret-[#585F42]"
                    />
                  ))}
                </div>
              )}

              {error && (
                <Alert variant="destructive" className="py-3 border-none bg-red-50 text-red-600 rounded-[12px]">
                  <AlertDescription className="text-sm font-medium">{error}</AlertDescription>
                </Alert>
              )}

              <Button
                className="w-full h-[52px] rounded-[999px] bg-[#585F42] hover:bg-[#4C5237] text-white font-semibold text-base transition-all select-none border-none shadow-[0_8px_20px_rgba(0,0,0,0.08)] hover:shadow-[0_12px_24px_rgba(0,0,0,0.12)] hover:-translate-y-0.5"
                disabled={isLoading || mfaSending}
                type="submit"
              >
                {isLoading ? (
                  <><Loader2 className="animate-spin mr-2 h-5 w-5" />Verifying…</>
                ) : (
                  "Verify & Sign In"
                )}
              </Button>
            </form>

            {/* Back + Resend row */}
            <div className="mt-6 flex items-center justify-between text-sm text-[#6F6F6F] font-semibold">
              <button
                type="button"
                onClick={() => {
                  setMfaActive(false);
                  setOtp(Array(6).fill(""));
                  setBackupCode("");
                  setError("");
                }}
                className="flex items-center gap-1.5 hover:text-[#585F42] transition-colors"
              >
                <ArrowLeft size={14} /> Back to Sign In
              </button>
              {canResend && (
                <button
                  type="button"
                  onClick={resendMfaCode}
                  disabled={resendCooldown > 0 || mfaSending}
                  className="hover:text-[#585F42] transition-colors disabled:opacity-40"
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                </button>
              )}
            </div>

          </div>
        </div>
      </div>
    );
  }

  // ── Main sign-in form (unchanged) ─────────────────────────────────────
  return (
    <div className="flex min-h-screen bg-[#F5F4EF] w-full font-sans">
      {/* Left: Image */}
      <div className="hidden lg:block lg:w-1/2 relative bg-[#585F42]/10 overflow-hidden">
        <Image
          src="/login3-bg.png"
          alt="E-Lekha-Jokha Background"
          fill
          priority
          sizes="50vw"
          className="object-cover object-center"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent pointer-events-none" />

        {/* Text Block */}
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
              <BookOpen className="h-6 w-6 text-[#585F42]" />
            </div>
            <h1 className="text-[32px] md:text-[36px] font-semibold text-[#2B2B2B]">
              E-Lekha-Jokha
            </h1>
            <p className="text-[#6F6F6F] mt-1 text-sm tracking-wide">
              Securely sign in to your account
            </p>
          </div>

          <form onSubmit={submit} className="flex flex-col gap-[24px] w-full">
            <div className="flex flex-col gap-[16px]">

              {/* Username Input */}
              <div className="space-y-[6px]">
                <Label htmlFor="username" className="text-[12px] tracking-[0.08em] text-[#6F6F6F] font-semibold uppercase ml-1">
                  Username
                </Label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#A3A3A3]" />
                  <Input
                    id="username"
                    className="pl-[44px] h-[48px] rounded-[12px] border-none bg-[#EDEBDD] text-[#2C2C2C] placeholder:text-[#A3A3A3] focus-visible:ring-2 focus-visible:ring-[#585F42] focus-visible:ring-offset-0 transition-all font-medium text-base shadow-none"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-[6px]">
                <Label htmlFor="password" className="text-[12px] tracking-[0.08em] text-[#6F6F6F] font-semibold uppercase ml-1">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#A3A3A3]" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    className="pl-[44px] pr-[44px] h-[48px] rounded-[12px] border-none bg-[#EDEBDD] text-[#2C2C2C] placeholder:text-[#A3A3A3] focus-visible:ring-2 focus-visible:ring-[#585F42] focus-visible:ring-offset-0 transition-all font-medium text-base shadow-none"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="remember"
                    className="h-4 w-4 rounded-[4px] border-none text-[#585F42] focus:ring-[#585F42] focus:ring-offset-1 bg-[#EDEBDD] cursor-pointer accent-[#585F42]"
                  />
                  <label
                    htmlFor="remember"
                    className="text-sm font-medium leading-none text-[#6F6F6F] cursor-pointer select-none"
                  >
                    Remember me
                  </label>
                </div>
                <Link href="#" className="text-[12px] tracking-[0.08em] font-bold text-[#6F6F6F] hover:text-[#585F42] transition-colors">
                  FORGOT PASSWORD?
                </Link>
              </div>
            </div>

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive" className="py-3 border-none bg-red-50 text-red-600 rounded-[12px]">
                <AlertDescription className="text-sm font-medium">{error}</AlertDescription>
              </Alert>
            )}

            {/* Submit Button */}
            <Button
              className="mt-[16px] w-full h-[52px] rounded-[999px] bg-[#585F42] hover:bg-[#4C5237] text-white font-semibold text-base transition-all select-none border-none shadow-[0_8px_20px_rgba(0,0,0,0.08)] hover:shadow-[0_12px_24px_rgba(0,0,0,0.12)] hover:-translate-y-0.5"
              disabled={isLoading}
              type="submit"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin mr-2 h-5 w-5" />
                  Authenticating...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-8 flex flex-col items-center w-full">
            <div className="w-full h-[1px] bg-[#E8E6DF] mb-6"></div>
            <p className="text-sm text-[#6F6F6F] font-medium">
              Don&apos;t have an account?{" "}
              <Link href="/sign-up" className="text-[#6F6F6F] hover:text-[#585F42] font-semibold transition-colors">
                Sign up
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
