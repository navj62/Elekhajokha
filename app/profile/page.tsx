"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Loader2, Camera, Store, MapPin, Phone, User, Users, TrendingUp, CreditCard, CalendarDays, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
interface Profile {
  id: string;
  firstName: string | null;
  lastName: string | null;
  username: string;
  email: string | null;
  mobile: string | null;
  shopName: string | null;
  address: string | null;
  gender: string | null;
  profileImageUrl: string | null;
  subscriptionStatus: string;
  subscriptionPlan: string | null;
  subscriptionEndDate: string | null;
  createdAt: string;
  totalCustomers: number;
  activePledges: number;
}

const GENDER_OPTIONS = [
  { value: "Male",   label: "Male"   },
  { value: "Female", label: "Female" },
  { value: "Other",  label: "Other"  },
];

/* ------------------------------------------------------------------ */
/*  Subscription helpers                                                */
/* ------------------------------------------------------------------ */
function daysRemaining(endDate: string | null): number | null {
  if (!endDate) return null;
  const diff = new Date(endDate).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function planLabel(plan: string | null): string {
  if (plan === "halfyearly") return "Half Yearly";
  if (plan === "yearly")     return "Yearly";
  return "—";
}

function SubscriptionCard({ profile, onUpgrade }: {
  profile: Profile;
  onUpgrade: () => void;
}) {
  const days    = daysRemaining(profile.subscriptionEndDate);
  const status  = profile.subscriptionStatus;
  const endDate = profile.subscriptionEndDate
    ? new Date(profile.subscriptionEndDate).toLocaleDateString("en-IN", {
        day: "numeric", month: "short", year: "numeric",
      })
    : null;

  // ── Active ──────────────────────────────────────────────────────────
  if (status === "active") {
    const urgent = days !== null && days <= 30;
    return (
      <Card className={urgent ? "border-orange-200" : "border-green-200"}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <CreditCard size={16} className="text-green-600" />
            Subscription
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Status</span>
            <span className="flex items-center gap-1.5 text-sm font-medium text-green-700">
              <CheckCircle2 size={14} /> Active
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Plan</span>
            <span className="text-sm font-medium">{planLabel(profile.subscriptionPlan)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Valid Until</span>
            <span className="text-sm font-medium flex items-center gap-1.5">
              <CalendarDays size={14} className="text-gray-400" />
              {endDate ?? "—"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Days Remaining</span>
            <span className={`text-sm font-semibold ${urgent ? "text-orange-600" : "text-green-700"}`}>
              {days !== null ? `${days} days` : "—"}
            </span>
          </div>

          {/* Progress bar */}
          {days !== null && (
            <div>
              <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${urgent ? "bg-orange-400" : "bg-green-500"}`}
                  style={{
                    width: `${Math.min(100, (days / (profile.subscriptionPlan === "yearly" ? 365 : 180)) * 100)}%`,
                  }}
                />
              </div>
              {urgent && (
                <p className="text-xs text-orange-600 mt-1.5 flex items-center gap-1">
                  <AlertTriangle size={12} /> Expiring soon — renew to avoid losing access
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // ── Trial ───────────────────────────────────────────────────────────
  if (status === "trial") {
    const urgent = days !== null && days <= 5;
    return (
      <Card className="border-yellow-200 bg-yellow-50/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <CreditCard size={16} className="text-yellow-600" />
            Subscription
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Status</span>
            <span className="flex items-center gap-1.5 text-sm font-medium text-yellow-700">
              <Clock size={14} /> Free Trial
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Trial Ends</span>
            <span className="text-sm font-medium">{endDate ?? "—"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Days Remaining</span>
            <span className={`text-sm font-semibold ${urgent ? "text-red-600" : "text-yellow-700"}`}>
              {days !== null ? `${days} days` : "—"}
            </span>
          </div>

          <div className={`rounded-lg p-3 text-sm ${urgent ? "bg-red-50 text-red-700 border border-red-200" : "bg-yellow-50 text-yellow-800 border border-yellow-200"}`}>
            {urgent
              ? `⚠ Only ${days} day${days === 1 ? "" : "s"} left — subscribe now to keep your data and access.`
              : "You're on a free trial. Subscribe before it ends to continue uninterrupted access."
            }
          </div>

          <Button onClick={onUpgrade} className="w-full bg-green-600 hover:bg-green-700 text-white">
            Subscribe Now →
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ── Expired / Halted ────────────────────────────────────────────────
  return (
    <Card className="border-red-200 bg-red-50/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <CreditCard size={16} className="text-red-500" />
          Subscription
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Status</span>
          <span className="flex items-center gap-1.5 text-sm font-medium text-red-600">
            <AlertTriangle size={14} />
            {status === "halted" ? "Payment Failed" : "Expired"}
          </span>
        </div>
        {profile.subscriptionPlan && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Last Plan</span>
            <span className="text-sm font-medium">{planLabel(profile.subscriptionPlan)}</span>
          </div>
        )}
        {endDate && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Expired On</span>
            <span className="text-sm font-medium">{endDate}</span>
          </div>
        )}
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {status === "halted"
            ? "Your payment failed. Please subscribe again to restore access."
            : "Your subscription has expired. Renew to regain full access."
          }
        </div>
        <Button onClick={onUpgrade} className="w-full bg-green-600 hover:bg-green-700 text-white">
          {status === "halted" ? "Retry Payment →" : "Renew Subscription →"}
        </Button>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */
export default function ProfilePage() {
  const { user, isLoaded: clerkLoaded } = useUser();
  const router = useRouter();

  const [profile,  setProfile]  = useState<Profile | null>(null);
  const [fetching, setFetching] = useState(true);
  const [fetchErr, setFetchErr] = useState("");

  const [editing, setEditing] = useState(false);
  const [form,    setForm]    = useState({
    firstName: "", lastName: "", mobile: "", shopName: "", address: "", gender: "",
  });
  const [saving,  setSaving]  = useState(false);
  const [saveErr, setSaveErr] = useState("");
  const [saved,   setSaved]   = useState(false);

  const [imgUploading, setImgUploading] = useState(false);

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword,      setNewPassword]      = useState("");
  const [confirmPassword,  setConfirmPassword]  = useState("");
  const [passwordSaving,   setPasswordSaving]   = useState(false);
  const [passwordErr,      setPasswordErr]      = useState("");
  const [passwordSaved,    setPasswordSaved]    = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setProfile(data);
        setForm({
          firstName: data.firstName ?? "",
          lastName:  data.lastName  ?? "",
          mobile:    data.mobile    ?? "",
          shopName:  data.shopName  ?? "",
          address:   data.address   ?? "",
          gender:    data.gender    ?? "",
        });
      })
      .catch((e) => setFetchErr(e.message))
      .finally(() => setFetching(false));
  }, []);

  async function handleSave() {
    setSaveErr(""); setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed to save"); }
      const updated = await res.json();
      setProfile((p) => p ? { ...p, ...updated } : p);
      setEditing(false); setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) { setSaveErr(e.message); }
    finally { setSaving(false); }
  }

  async function handleImageUpload(file: File) {
    if (!user) return;
    setImgUploading(true);
    try {
      await user.setProfileImage({ file });
      setProfile((p) => p ? { ...p, profileImageUrl: user.imageUrl } : p);
    } catch {}
    finally { setImgUploading(false); }
  }

  async function handlePasswordChange() {
    if (!user) return;
    setPasswordErr("");
    if (newPassword.length < 8) { setPasswordErr("Password must be at least 8 characters"); return; }
    if (newPassword !== confirmPassword) { setPasswordErr("Passwords do not match"); return; }
    setPasswordSaving(true);
    try {
      await user.updatePassword({ newPassword });
      setPasswordSaved(true); setNewPassword(""); setConfirmPassword(""); setShowPasswordForm(false);
      setTimeout(() => setPasswordSaved(false), 3000);
    } catch (e: any) { setPasswordErr(e.errors?.[0]?.message || "Failed to update password"); }
    finally { setPasswordSaving(false); }
  }

  if (fetching || !clerkLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  if (fetchErr || !profile) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Alert variant="destructive">
          <AlertDescription>{fetchErr || "Profile not found"}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const displayImage = user?.imageUrl || profile.profileImageUrl;
  const fullName     = [profile.firstName, profile.lastName].filter(Boolean).join(" ") || profile.username;
  const memberSince  = new Date(profile.createdAt).toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">

      <div>
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your account and shop details.</p>
      </div>

      {/* Profile Photo + Name */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            <div className="relative shrink-0">
              <div className="h-24 w-24 rounded-full overflow-hidden bg-gray-100 border">
                {displayImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={displayImage} alt={fullName} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-2xl font-bold text-gray-400">
                    {fullName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <label className="absolute bottom-0 right-0 bg-black text-white p-1.5 rounded-full cursor-pointer hover:opacity-80">
                {imgUploading ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
                <input type="file" accept="image/*" hidden
                  onChange={(e) => e.target.files && handleImageUpload(e.target.files[0])} />
              </label>
            </div>
            <div className="text-center sm:text-left">
              <h2 className="text-xl font-semibold">{fullName}</h2>
              <p className="text-sm text-gray-500">@{profile.username}</p>
              {profile.email && <p className="text-sm text-gray-500">{profile.email}</p>}
              <p className="text-xs text-gray-400 mt-1">Member since {memberSince}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center">
                <Users size={18} className="text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{profile.totalCustomers}</p>
                <p className="text-xs text-gray-500">Total Customers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-50 flex items-center justify-center">
                <TrendingUp size={18} className="text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{profile.activePledges}</p>
                <p className="text-xs text-gray-500">Active Pledges</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ← NEW: Subscription card */}
      <SubscriptionCard
        profile={profile}
        onUpgrade={() => router.push("/subscribe")}
      />

      {/* Shop & Personal Details */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">Shop & Personal Details</CardTitle>
          {!editing ? (
            <button type="button" onClick={() => setEditing(true)} className="text-sm text-blue-600 hover:underline">Edit</button>
          ) : (
            <button type="button" onClick={() => { setEditing(false); setSaveErr(""); }} className="text-sm text-gray-500 hover:underline">Cancel</button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {!editing ? (
            <div className="space-y-0">
              {[
                { icon: <Store size={15} />,  label: "Shop Name",  value: profile.shopName  || "—" },
                { icon: <MapPin size={15} />,  label: "Address",    value: profile.address   || "—" },
                { icon: <Phone size={15} />,   label: "Mobile",     value: profile.mobile    || "—" },
                { icon: <User size={15} />,    label: "First Name", value: profile.firstName || "—" },
                { icon: <User size={15} />,    label: "Last Name",  value: profile.lastName  || "—" },
                { icon: <User size={15} />,    label: "Gender",     value: profile.gender    || "—" },
              ].map(({ icon, label, value }) => (
                <div key={label} className="flex items-center gap-3 py-3 border-b last:border-0">
                  <span className="text-gray-400 shrink-0">{icon}</span>
                  <span className="text-sm text-gray-500 w-28 shrink-0">{label}</span>
                  <span className="text-sm font-medium text-gray-800">{value}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { key: "firstName", label: "First Name" },
                { key: "lastName",  label: "Last Name"  },
                { key: "shopName",  label: "Shop Name"  },
                { key: "mobile",    label: "Mobile"     },
              ].map(({ key, label }) => (
                <div key={key} className="space-y-1">
                  <Label className="text-sm">{label}</Label>
                  <Input
                    value={form[key as keyof typeof form]}
                    onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                  />
                </div>
              ))}
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-sm">Address</Label>
                <Input value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Gender</Label>
                <select className="w-full rounded-md border px-3 py-2 text-sm bg-background" value={form.gender}
                  onChange={(e) => setForm((p) => ({ ...p, gender: e.target.value }))}>
                  <option value="">Select</option>
                  {GENDER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              {saveErr && (
                <div className="sm:col-span-2">
                  <Alert variant="destructive"><AlertDescription>{saveErr}</AlertDescription></Alert>
                </div>
              )}
              <div className="sm:col-span-2">
                <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto sm:px-10">
                  {saving ? <Loader2 className="animate-spin" /> : "Save Changes"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">Password</CardTitle>
          <button type="button" onClick={() => { setShowPasswordForm((v) => !v); setPasswordErr(""); }}
            className="text-sm text-blue-600 hover:underline">
            {showPasswordForm ? "Cancel" : "Change Password"}
          </button>
        </CardHeader>
        {showPasswordForm && (
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label className="text-sm">New Password</Label>
              <Input type="password" placeholder="Min. 8 characters" value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">Confirm New Password</Label>
              <Input type="password" placeholder="Re-enter new password" value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>
            {passwordErr && <Alert variant="destructive"><AlertDescription>{passwordErr}</AlertDescription></Alert>}
            <Button onClick={handlePasswordChange} disabled={passwordSaving} className="w-full sm:w-auto sm:px-10">
              {passwordSaving ? <Loader2 className="animate-spin" /> : "Update Password"}
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Toasts */}
      {saved && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-green-600 text-white px-4 py-3 shadow-lg text-sm">
          Profile updated successfully
        </div>
      )}
      {passwordSaved && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-green-600 text-white px-4 py-3 shadow-lg text-sm">
          Password updated successfully
        </div>
      )}
    </div>
  );
}