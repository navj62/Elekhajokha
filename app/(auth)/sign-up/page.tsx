"use client";

import { useState } from "react";
import { useSignUp } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Eye, EyeOff } from "lucide-react";

export default function SignUpPage() {
  // 1. Extract signUp (isLoaded and setActive are removed in v7)
  const { signUp } = useSignUp();
  const router = useRouter();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Guard clause: Wait for the SDK to initialize
  if (!signUp) return null;

  const update = (k: string, v: string) =>
    setForm((p) => ({ ...p, [k]: v }));

  /* ---------- Step 1: Create account & send OTP ---------- */
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
      // 2. Use the new password() method
      const createRes = await signUp.password({
        firstName: form.firstName,
        lastName: form.lastName,
        username: form.username,
        emailAddress: form.email,
        password: form.password,
      });

      if (createRes?.error) throw { errors: [createRes.error] };

      // 3. Use the new verifications API
      const prepRes = await signUp.verifications.sendEmailCode();
      if (prepRes?.error) throw { errors: [prepRes.error] };

      setPendingVerification(true);
    } catch (err: any) {
      setError(
        err.errors?.[0]?.longMessage ||
          err.errors?.[0]?.message ||
          "Sign up failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  /* ---------- Step 2: Verify OTP ---------- */
  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (code.length < 6) {
      setError("Please enter the complete 6-digit code");
      return;
    }

    setLoading(true);
    try {
      // 4. Verify using the new verifications API
      const verifyRes = await signUp.verifications.verifyEmailCode({ code });
      if (verifyRes?.error) throw { errors: [verifyRes.error] };

      // 5. Finalize session and navigate natively
      if (signUp.status === "complete") {
        await signUp.finalize({
          navigate: () => router.push("/onboarding"),
        });
      } else {
        setError("Verification incomplete. Please try again.");
      }
    } catch (err: any) {
      setError(
        err.errors?.[0]?.longMessage ||
          err.errors?.[0]?.message ||
          "Invalid code. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  /* ---------- Resend OTP with 30s cooldown ---------- */
  async function resendCode() {
    if (resendCooldown > 0) return;
    setError("");
    try {
      // 6. Resend using the new verifications API
      const res = await signUp.verifications.sendEmailCode();
      if (res?.error) throw { errors: [res.error] };

      setResendCooldown(30);
      const interval = setInterval(() => {
        setResendCooldown((c) => {
          if (c <= 1) {
            clearInterval(interval);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    } catch {
      setError("Could not resend code. Please try again.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-1">
          <CardTitle className="text-2xl font-bold">E-Lekha-Jokha</CardTitle>
          <CardDescription>
            {pendingVerification
              ? `Enter the 6-digit code sent to ${form.email}`
              : "Create your account to get started"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {!pendingVerification ? (
            /* ---------- Details Form ---------- */
            <form onSubmit={submit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <InputField
                  label="First name"
                  placeholder="John"
                  onChange={(v) => update("firstName", v)}
                />
                <InputField
                  label="Last name"
                  placeholder="Doe"
                  onChange={(v) => update("lastName", v)}
                />
              </div>

              <InputField
                label="Username"
                placeholder="johndoe123"
                autoComplete="username"
                onChange={(v) => update("username", v)}
              />

              <InputField
                label="Email"
                placeholder="john@example.com"
                type="email"
                autoComplete="email"
                onChange={(v) => update("email", v)}
              />

              <div className="space-y-1">
                <Label className="text-sm">Password</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Min. 8 characters"
                    autoComplete="new-password"
                    onChange={(e) => update("password", e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-sm">Confirm password</Label>
                <div className="relative">
                  <Input
                    type={showConfirm ? "text" : "password"}
                    placeholder="Re-enter your password"
                    autoComplete="new-password"
                    onChange={(e) => update("confirmPassword", e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button className="w-full" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : "Create account"}
              </Button>

              <p className="text-center text-sm text-slate-500">
                Already have an account?{" "}
                <a href="/sign-in" className="text-slate-900 font-medium hover:underline">
                  Sign in
                </a>
              </p>
            </form>
          ) : (
            /* ---------- OTP Form ---------- */
            <form onSubmit={verify} className="space-y-3">
              <div className="space-y-1">
                <Label className="text-sm">Verification code</Label>
                <Input
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  placeholder="Enter 6-digit code"
                  value={code}
                  onChange={(e) =>
                    setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  required
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button className="w-full" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : "Verify & continue"}
              </Button>

              <div className="flex items-center justify-between text-sm text-slate-500">
                <button
                  type="button"
                  className="hover:underline"
                  onClick={() => {
                    setPendingVerification(false);
                    setCode("");
                    setError("");
                  }}
                >
                  ← Back
                </button>

                <button
                  type="button"
                  onClick={resendCode}
                  disabled={resendCooldown > 0}
                  className="hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                </button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------- Reusable field ---------- */
function InputField({
  label,
  type = "text",
  placeholder,
  autoComplete,
  onChange,
}: {
  label: string;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-sm">{label}</Label>
      <Input
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        required
      />
    </div>
  );
}