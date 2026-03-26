"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Camera, Loader2 } from "lucide-react";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function OnboardingPage() {
  /* ---------------- HOOKS ---------------- */
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

  /* ---------------- AUTH GUARDS ---------------- */
  if (!isLoaded) return null;

  if (!user) {
    router.replace("/sign-in");
    return null;
  }

  const currentUser = user; // TS-safe alias

  /* ---------------- HELPERS ---------------- */
  const update = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

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

      if (profileImage) {
        fd.append("profileImage", profileImage);
      }

      const res = await fetch("/api/onboarding", {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save onboarding details");
      }

      router.replace("/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  /* ---------------- UI ---------------- */
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="text-center space-y-1">
          <CardTitle className="text-2xl font-semibold">
            Complete your profile
          </CardTitle>
          <CardDescription>
            Add your business details to continue
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* Profile Image */}
          <div className="flex flex-col items-center mb-6">
            <div className="relative">
              <img
                src={
                  profileImage
                    ? URL.createObjectURL(profileImage)
                    : currentUser.imageUrl
                }
                alt="Profile"
                className="h-24 w-24 rounded-full object-cover border bg-white"
              />

              <label className="absolute bottom-0 right-0 bg-black text-white p-1.5 rounded-full cursor-pointer hover:opacity-90">
                <Camera size={14} />
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setProfileImage(e.target.files[0]);
                    }
                  }}
                />
              </label>
            </div>

            {imageUploading && (
              <p className="text-xs text-slate-500 mt-2">
                Uploading profile picture…
              </p>
            )}
          </div>

          {/* Form */}
          <form onSubmit={submit} className="space-y-4">
            <InputField
              label="Shop name"
              onChange={(v) => update("shopName", v)}
            />

            <InputField
              label="Address"
              onChange={(v) => update("address", v)}
            />

            <MobileField
              label="Mobile number"
              onChange={(v) => update("mobile", v)}
            />

            <div>
              <Label>Gender</Label>
              <select
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                value={form.gender}
                onChange={(e) => update("gender", e.target.value)}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              className="w-full"
              disabled={loading || imageUploading}
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : (
                "Finish setup"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------------- REUSABLE FIELDS ---------------- */

function InputField({
  label,
  onChange,
}: {
  label: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input onChange={(e) => onChange(e.target.value.trim())} required />
    </div>
  );
}

function MobileField({
  label,
  onChange,
}: {
  label: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input
        type="tel"
        inputMode="numeric"
        pattern="[0-9]{10}"
        placeholder="10 digit mobile number"
        onChange={(e) => onChange(e.target.value.trim())}
        required
      />
    </div>
  );
}
