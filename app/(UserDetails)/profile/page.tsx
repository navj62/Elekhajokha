"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Loader2, User, Mail, CalendarDays, Lock, CreditCard, Info, Edit2 } from "lucide-react";

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
  shopownerTerms: string | null;
  customerTerms: string | null;
}

export default function ProfilePage() {
  const { user, isLoaded: clerkLoaded } = useUser();
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [fetching, setFetching] = useState(true);
  const [fetchErr, setFetchErr] = useState("");

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    firstName: "", lastName: "", mobile: "", shopName: "", address: "", gender: "",
  });
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState("");

  // ── Terms state ──────────────────────────────────────────────────────
  const [shopownerTerms, setShopownerTerms] = useState("");
  const [customerTerms, setCustomerTerms] = useState("");
  const [termsSaving, setTermsSaving] = useState(false);
  const [termsErr, setTermsErr] = useState("");

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setProfile(data);
        setForm({
          firstName: data.firstName ?? "",
          lastName: data.lastName ?? "",
          mobile: data.mobile ?? "",
          shopName: data.shopName ?? "",
          address: data.address ?? "",
          gender: data.gender ?? "",
        });
        setShopownerTerms(data.shopownerTerms ?? "");
        setCustomerTerms(data.customerTerms ?? "");
      })
      .catch((e) => setFetchErr(e.message))
      .finally(() => setFetching(false));
  }, []);

  async function handleSave() {
    setSaveErr(""); setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      const res = await fetch("/api/profile", { method: "PATCH", body: fd });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed to save"); }
      const updated = await res.json();
      setProfile((p) => p ? { ...p, ...updated } : p);
      setEditing(false);
    } catch (e: any) { setSaveErr(e.message); }
    finally { setSaving(false); }
  }

  async function handleTermsSave() {
    setTermsErr(""); setTermsSaving(true);
    try {
      const fd = new FormData();
      fd.append("shopownerTerms", shopownerTerms);
      fd.append("customerTerms", customerTerms);
      const res = await fetch("/api/profile", { method: "PATCH", body: fd });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed"); }
    } catch (e: any) { setTermsErr(e.message); }
    finally { setTermsSaving(false); }
  }

  if (!clerkLoaded || fetching) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-[#6B7150]" size={28} />
      </div>
    );
  }

  if (fetchErr || !profile) {
    return (
      <div className="p-6 text-red-600 bg-red-50 rounded-lg max-w-2xl mx-auto mt-10 text-[13px]">
        {fetchErr || "Failed to load profile"}
      </div>
    );
  }

  const memberSince = profile.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "";

  const diff = profile.subscriptionEndDate ? new Date(profile.subscriptionEndDate).getTime() - Date.now() : 0;
  const days = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  const endDateStr = profile.subscriptionEndDate
    ? new Date(profile.subscriptionEndDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : "";

  const isTrial = profile.subscriptionStatus === "trial";

  return (
    <div className="max-w-[1200px] mx-auto pb-16 mt-4 font-sans text-[#2C2C2C]">
      {/* ── PAGE HEADER ── */}
      <div className="mb-8">
        <h1 className="text-[32px] font-semibold tracking-tight text-[#2C2C2C] leading-none mb-2">
          Profile
        </h1>
        <p className="text-[14px] text-[#6F6F6F]">
          Manage your account and shop details.
        </p>
      </div>

      {/* ── PAGE LAYOUT ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[35fr_65fr] gap-8 items-start">

        {/* ════════════════════════════════════ */}
        {/* LEFT COLUMN                          */}
        {/* ════════════════════════════════════ */}
        <div className="space-y-6">

          {/* Profile Card */}
          <div className="bg-white rounded-[20px] overflow-hidden border border-[#ECEAE4] shadow-sm text-center">
            <div className="bg-[#6B7150] h-[100px] w-full"></div>
            <div className="relative -mt-12 mb-3 flex justify-center">
              <div className="w-24 h-24 rounded-full border-[5px] border-white bg-[#E8EBD8] overflow-hidden">
                {user?.imageUrl ? (
                  <img src={user.imageUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User size={40} className="text-[#555B3F] mt-4 mx-auto" />
                )}
              </div>
            </div>
            <div className="px-6 pb-6">
              <h2 className="text-[20px] font-semibold text-[#2C2C2C]">{form.firstName} {form.lastName}</h2>
              <p className="text-[13px] text-[#8C8F7A] mt-0.5">@{profile.username || "user"}</p>

              <div className="h-px w-full bg-[#F4F3EE] my-5"></div>

              <div className="space-y-3.5 text-[13px] text-[#2C2C2C] font-medium">
                <div className="flex items-center gap-3 justify-center">
                  <Mail size={15} className="text-[#6F6F6F]" />
                  <span>{profile.email}</span>
                </div>
                <div className="flex items-center gap-3 justify-center">
                  <CalendarDays size={15} className="text-[#6F6F6F]" />
                  <span>Member since {memberSince}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Language Card */}
          <div className="bg-white rounded-[20px] border border-[#ECEAE4] shadow-sm p-6">
            <h3 className="text-[16px] font-semibold text-[#2C2C2C]">Language</h3>
            <p className="text-[12px] text-[#6F6F6F] mt-1 mb-4">Choose application language</p>

            <div className="flex p-1 bg-[#F9F8F3] rounded-[12px] border border-[#ECEAE4] mb-4">
              <button className="flex-1 bg-[#555B3F] text-white text-[13px] font-semibold py-2 rounded-[10px] shadow-sm">
                English
              </button>
              <button className="flex-1 text-[#6F6F6F] text-[13px] font-medium py-2 rounded-[10px] hover:bg-[#ECEAE4] transition-colors">
                हिन्दी
              </button>
            </div>

            <p className="text-[11px] text-[#8C8F7A] leading-relaxed">
              This changes menus, reports, receipts, and customer-facing text.
            </p>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-[20px] border border-[#ECEAE4] shadow-sm py-6 px-4 text-center flex flex-col items-center justify-center">
              <span className="text-[28px] font-semibold text-[#2C2C2C] leading-none mb-2">{profile.totalCustomers}</span>
              <span className="text-[11px] text-[#6F6F6F] font-medium leading-tight">Total<br />Customers</span>
            </div>
            <div className="bg-white rounded-[20px] border border-[#ECEAE4] shadow-sm py-6 px-4 text-center flex flex-col items-center justify-center">
              <span className="text-[28px] font-semibold text-[#2C2C2C] leading-none mb-2">{profile.activePledges}</span>
              <span className="text-[11px] text-[#6F6F6F] font-medium leading-tight">Active<br />Pledges</span>
            </div>
          </div>

          {/* Security Card */}
          <div className="bg-white rounded-[20px] border border-[#ECEAE4] shadow-sm p-6">
            <h3 className="text-[16px] font-semibold text-[#2C2C2C]">Security</h3>
            <p className="text-[12px] text-[#6F6F6F] mt-1 mb-3">Update your password to keep your account secure.</p>
            <p className="text-[11px] text-[#8C8F7A] mb-5">Last password update: 14 days ago</p>

            <button className="w-full flex items-center justify-center gap-2 bg-[#E3E5C3] hover:bg-[#DEDCD4] text-[#2C2C2C] text-[13px] font-semibold py-3 rounded-[12px] transition-colors">
              <Lock size={14} /> Change Password
            </button>
          </div>

        </div>


        {/* ════════════════════════════════════ */}
        {/* RIGHT COLUMN                         */}
        {/* ════════════════════════════════════ */}
        <div className="space-y-6">

          {/* Subscription Banner */}
          <div className="bg-white border border-[#ECEAE4] rounded-[20px] p-6 shadow-sm flex items-center justify-between">
            <div className="space-y-3 max-w-[70%]">
              <div className="flex items-center gap-3">
                <span className="bg-[#E8EBD8] text-[#555B3F] text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
                  {isTrial ? "Free Trial" : "Active"}
                </span>
                <span className="text-[13px] text-[#6F6F6F] font-medium">
                  Ends {endDateStr}
                </span>
              </div>
              {days <= 14 && (
                <div>
                  <span className="bg-[#FEE2E2] text-[#991B1B] text-[11px] font-bold px-2.5 py-1 rounded-full">
                    {days} days remaining
                  </span>
                </div>
              )}
              <p className="text-[13px] text-[#2C2C2C] leading-relaxed">
                {isTrial
                  ? "Your free trial will expire soon. Subscribe before it ends to avoid interruption."
                  : "Your subscription is active and in good standing."}
              </p>
            </div>
            <div>
              <button onClick={() => router.push("/subscription")} className="bg-[#555B3F] hover:bg-[#3D4230] text-white text-[13px] font-semibold px-5 py-3 rounded-[12px] transition-colors flex items-center gap-2">
                Subscribe Now <span>→</span>
              </button>
            </div>
          </div>

          {/* Shop & Personal Details */}
          <div className="bg-white rounded-[20px] border border-[#ECEAE4] shadow-sm overflow-hidden">
            <div className="bg-[#555B3F] px-6 py-4 flex items-center justify-between">
              <h3 className="text-[16px] font-semibold text-[#F8FAD7]">Shop & Personal Details</h3>
              <button
                onClick={() => editing ? handleSave() : setEditing(true)}
                className="text-white/90 hover:text-white text-[13px] font-medium flex items-center gap-1.5"
              >
                {editing ? (saving ? <Loader2 size={14} className="animate-spin" /> : "Save") : <><Edit2 size={14} /> Edit</>}
              </button>
            </div>

            <div className="p-6 space-y-5">
              {saveErr && <div className="text-red-600 text-[12px]">{saveErr}</div>}

              <div>
                <label className="block text-[10px] font-bold tracking-widest text-[#8C8F7A] uppercase mb-2">Shop Name</label>
                <input
                  disabled={!editing}
                  value={form.shopName}
                  onChange={e => setForm({ ...form, shopName: e.target.value })}
                  className="w-full bg-[#F9F8F3] border border-[#ECEAE4] disabled:bg-[#F9F8F3] disabled:text-[#2C2C2C] rounded-[10px] px-4 py-3 text-[14px] text-[#2C2C2C] focus:outline-none focus:ring-2 focus:ring-[#8C8F7A] transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold tracking-widest text-[#8C8F7A] uppercase mb-2">Address</label>
                <input
                  disabled={!editing}
                  value={form.address}
                  onChange={e => setForm({ ...form, address: e.target.value })}
                  className="w-full bg-[#F9F8F3] border border-[#ECEAE4] disabled:bg-[#F9F8F3] disabled:text-[#2C2C2C] rounded-[10px] px-4 py-3 text-[14px] text-[#2C2C2C] focus:outline-none focus:ring-2 focus:ring-[#8C8F7A] transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] font-bold tracking-widest text-[#8C8F7A] uppercase mb-2">Mobile</label>
                  <input
                    disabled={!editing}
                    value={form.mobile}
                    onChange={e => setForm({ ...form, mobile: e.target.value })}
                    className="w-full bg-[#F9F8F3] border border-[#ECEAE4] disabled:bg-[#F9F8F3] disabled:text-[#2C2C2C] rounded-[10px] px-4 py-3 text-[14px] text-[#2C2C2C] focus:outline-none focus:ring-2 focus:ring-[#8C8F7A] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold tracking-widest text-[#8C8F7A] uppercase mb-2">Gender</label>
                  <select
                    disabled={!editing}
                    value={form.gender}
                    onChange={e => setForm({ ...form, gender: e.target.value })}
                    className="w-full bg-[#F9F8F3] border border-[#ECEAE4] disabled:bg-[#F9F8F3] disabled:text-[#2C2C2C] rounded-[10px] px-4 py-3 text-[14px] text-[#2C2C2C] focus:outline-none focus:ring-2 focus:ring-[#8C8F7A] transition-all appearance-none"
                  >
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] font-bold tracking-widest text-[#8C8F7A] uppercase mb-2">First Name</label>
                  <input
                    disabled={!editing}
                    value={form.firstName}
                    onChange={e => setForm({ ...form, firstName: e.target.value })}
                    className="w-full bg-[#F9F8F3] border border-[#ECEAE4] disabled:bg-[#F9F8F3] disabled:text-[#2C2C2C] rounded-[10px] px-4 py-3 text-[14px] text-[#2C2C2C] focus:outline-none focus:ring-2 focus:ring-[#8C8F7A] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold tracking-widest text-[#8C8F7A] uppercase mb-2">Last Name</label>
                  <input
                    disabled={!editing}
                    value={form.lastName}
                    onChange={e => setForm({ ...form, lastName: e.target.value })}
                    className="w-full bg-[#F9F8F3] border border-[#ECEAE4] disabled:bg-[#F9F8F3] disabled:text-[#2C2C2C] rounded-[10px] px-4 py-3 text-[14px] text-[#2C2C2C] focus:outline-none focus:ring-2 focus:ring-[#8C8F7A] transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Receipt Terms & Conditions */}
          <div className="bg-white rounded-[20px] border border-[#ECEAE4] shadow-sm p-6">
            <div className="mb-5">
              <h3 className="text-[18px] font-semibold text-[#2C2C2C]">Receipt Terms & Conditions</h3>
              <p className="text-[13px] text-[#6F6F6F] mt-1.5 leading-relaxed">
                Shown on PDF receipts. Leave empty to use default Hindi terms. Each line = one point.
              </p>
            </div>

            <div className="space-y-6">
              {termsErr && <div className="text-red-600 text-[12px]">{termsErr}</div>}

              <div>
                <label className="block text-[13px] font-semibold text-[#2C2C2C] mb-2">Shopowner Copy terms</label>
                <textarea
                  rows={4}
                  placeholder={"• मेरे द्वारा गिरवी रखी गई उपरोक्त रकम...\n• (each line is one term)"}
                  value={shopownerTerms}
                  onChange={e => setShopownerTerms(e.target.value)}
                  className="w-full bg-white border border-[#ECEAE4] rounded-[12px] px-4 py-3 text-[13px] text-[#2C2C2C] focus:outline-none focus:ring-2 focus:ring-[#8C8F7A] resize-none transition-all"
                />
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-[#2C2C2C] mb-2">Customer copy terms</label>
                <textarea
                  rows={4}
                  placeholder={"• गिरवी रखी गयी रकम का 1 वर्ष मे...\n• (each line is one term)"}
                  value={customerTerms}
                  onChange={e => setCustomerTerms(e.target.value)}
                  className="w-full bg-white border border-[#ECEAE4] rounded-[12px] px-4 py-3 text-[13px] text-[#2C2C2C] focus:outline-none focus:ring-2 focus:ring-[#8C8F7A] resize-none transition-all"
                />
              </div>

              <div className="bg-[#F9F8F3] border border-[#ECEAE4] rounded-[12px] p-4 flex gap-3 items-start">
                <Info size={16} className="text-[#8C8F7A] shrink-0 mt-0.5" />
                <p className="text-[12px] text-[#6F6F6F] leading-relaxed">
                  Default Hindi terms will automatically be used if this field is left empty.
                </p>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleTermsSave}
                  disabled={termsSaving}
                  className="bg-[#6B7150] hover:bg-[#585E42] text-white text-[13px] font-semibold px-6 py-2.5 rounded-[12px] transition-colors flex items-center gap-2 shadow-sm"
                >
                  {termsSaving && <Loader2 size={14} className="animate-spin" />}
                  Save Terms
                </button>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}