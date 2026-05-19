"use client";

import { useState, useEffect } from "react";
import { useSignIn, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, User, Lock, BookOpen, Loader2 } from "lucide-react";

export default function SignInPage() {
  // 1. Core-3: Extract signIn and fetchStatus (isLoaded and setActive are gone)
  const { signIn, fetchStatus } = useSignIn();
  const { user, isLoaded: userLoaded } = useUser();
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (userLoaded && user) {
      router.replace("/dashboard");
    }
  }, [user, userLoaded, router]);

  // Guard clause: Wait for the signal to initialize
  if (!signIn || !userLoaded) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // 2. Core-3: Use the new dedicated .password() method
    // Notice how try/catch is gone; it returns an error object directly
    const { error: clerkError } = await signIn.password({
      identifier: username,
      password: password,
    });

    if (clerkError) {
      setError(clerkError.longMessage || clerkError.message || "Invalid credentials.");
      return;
    }

    // 3. Core-3: Check status directly on the reactive signIn object
    if (signIn.status === "complete") {
      // 4. Core-3: finalize() replaces setActive() and handles routing automatically
      await signIn.finalize({
        navigate: () => router.replace("/dashboard")
      });
    } else {
      console.warn("Sign in not complete. Status:", signIn.status);
    }
  }

  // 5. Core-3: Use fetchStatus for your UI loading spinner
  const isLoading = fetchStatus === "fetching";

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
              Don’t have an account?{" "}
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