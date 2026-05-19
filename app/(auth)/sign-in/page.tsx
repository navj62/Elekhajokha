"use client";

import { useState, useEffect } from "react";
import { useSignIn, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  CardDescription,
} from "@/components/ui/card";
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
      // Handle other states like MFA if configured
      console.warn("Sign in not complete. Status:", signIn.status);
    }
  }

  // 5. Core-3: Use fetchStatus for your UI loading spinner
  const isLoading = fetchStatus === "fetching";

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
      <Card className="w-full max-w-md border-slate-200 bg-white shadow-xl">
        <CardHeader className="flex flex-col items-center space-y-1">
          <div className="bg-primary/10 p-3 rounded-full mb-2">
            <BookOpen className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold text-slate-900">
            E-Lekha-Jokha
          </CardTitle>
          <CardDescription className="text-slate-500">
            Securely sign in to your account
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="username"
                  className="pl-10"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="pl-10 pr-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <Alert variant="destructive" className="py-2">
                <AlertDescription className="text-xs">{error}</AlertDescription>
              </Alert>
            )}

            <Button className="w-full font-semibold" disabled={isLoading} type="submit">
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin mr-2 h-4 w-4" />
                  Authenticating...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex flex-col pt-4">
          <p className="text-sm text-slate-500">
            Don’t have an account?{" "}
            <Link href="/sign-up" className="font-semibold text-primary hover:underline underline-offset-4">
              Sign up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}