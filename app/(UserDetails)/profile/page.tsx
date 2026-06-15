"use client";

import { useEffect, useState, useRef } from "react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Loader2, User, Mail, CalendarDays, Lock, CreditCard, Info, Edit2 } from "lucide-react";
import { useAlert } from "@/components/providers/AlertProvider";

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
  const { t, language, setLanguage } = useLanguage();
  const { showAlert } = useAlert();

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

  const [showImageMenu, setShowImageMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageUploading, setImageUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && user) {
      setImageUploading(true);
      try {
        await user.setProfileImage({ file });
      } catch (error) {
        console.error("Failed to upload image", error);
        showAlert("Failed to upload image.");
      } finally {
        setImageUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    }
  };

  const handleImageRemove = async () => {
    if (user) {
      setImageUploading(true);
      try {
        await user.setProfileImage({ file: null });
      } catch (error) {
        console.error("Failed to remove image", error);
        showAlert("Failed to remove image.");
      } finally {
        setImageUploading(false);
      }
    }
  };

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
          {t("manage_account")}
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
            <div className="relative -mt-12 flex flex-col items-center">
              <div 
                className="relative w-24 h-24 rounded-full border-[5px] border-white bg-[#E8EBD8] overflow-hidden cursor-pointer group shadow-sm transition-transform hover:scale-105"
                onClick={() => setShowImageMenu(!showImageMenu)}
              >
                {imageUploading ? (
                  <div className="w-full h-full flex items-center justify-center bg-white/80">
                    <Loader2 size={24} className="animate-spin text-[#6B7150]" />
                  </div>
                ) : user?.imageUrl ? (
                  <img src={user.imageUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User size={40} className="text-[#555B3F] mt-4 mx-auto" />
                )}
                {/* Hover overlay */}
                {!imageUploading && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Edit2 size={20} className="text-white" />
                  </div>
                )}
              </div>

              {/* Menu */}
              {showImageMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowImageMenu(false)} />
                  <div className="absolute top-[80px] bg-white border border-[#ECEAE4] rounded-[12px] shadow-[0_4px_20px_rgba(0,0,0,0.08)] p-2 z-20 w-[160px]">
                    <button 
                      className="w-full text-left px-3 py-2 text-[13px] font-medium text-[#2C2C2C] hover:bg-[#F9F8F3] rounded-[8px] transition-colors"
                      onClick={() => { fileInputRef.current?.click(); setShowImageMenu(false); }}
                    >
                      {t("upload_pic")}
                    </button>
                    {user?.hasImage && (
                      <button 
                        className="w-full text-left px-3 py-2 text-[13px] font-medium text-[#E53E3E] hover:bg-[#FFF5F5] rounded-[8px] transition-colors"
                        onClick={() => { handleImageRemove(); setShowImageMenu(false); }}
                      >
                        {t("remove_pic")}
                      </button>
                    )}
                    <div className="h-px w-full bg-[#F4F3EE] my-1"></div>
                    <button 
                      className="w-full text-left px-3 py-2 text-[13px] font-medium text-[#6F6F6F] hover:bg-[#F9F8F3] rounded-[8px] transition-colors"
                      onClick={() => setShowImageMenu(false)}
                    >
                      {t("cancel")}
                    </button>
                  </div>
                </>
              )}
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*"
                onChange={handleImageUpload}
              />
            </div>
            <div className="px-6 pb-6 pt-3">
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
                  <span>{t("member_since")} {memberSince}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Language Card */}
          <div className="bg-white rounded-[20px] border border-[#ECEAE4] shadow-sm p-6">
            <h3 className="text-[16px] font-semibold text-[#2C2C2C]">{t("language_section")}</h3>
            <p className="text-[12px] text-[#6F6F6F] mt-1 mb-4">{t("choose_language")}</p>

            <div className="flex p-1 bg-[#F9F8F3] rounded-[12px] border border-[#ECEAE4] mb-4">
              <button
                onClick={() => setLanguage("en")}
                className={`flex-1 text-[13px] font-semibold py-2 rounded-[10px] transition-all ${
                  language === "en"
                    ? "bg-[#555B3F] text-white shadow-sm"
                    : "text-[#6F6F6F] hover:bg-[#ECEAE4]"
                }`}
              >
                {t("english")}
              </button>
              <button
                onClick={() => setLanguage("hi")}
                className={`flex-1 text-[13px] font-semibold py-2 rounded-[10px] transition-all ${
                  language === "hi"
                    ? "bg-[#555B3F] text-white shadow-sm"
                    : "text-[#6F6F6F] hover:bg-[#ECEAE4]"
                }`}
              >
                {t("hindi")}
              </button>
            </div>

            <p className="text-[11px] text-[#8C8F7A] leading-relaxed">
              {t("language_desc")}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-[20px] border border-[#ECEAE4] shadow-sm py-6 px-4 text-center flex flex-col items-center justify-center">
              <span className="text-[28px] font-semibold text-[#2C2C2C] leading-none mb-2">{profile.totalCustomers}</span>
              <span className="text-[11px] text-[#6F6F6F] font-medium leading-tight">{t("total_customers")}</span>
            </div>
            <div className="bg-white rounded-[20px] border border-[#ECEAE4] shadow-sm py-6 px-4 text-center flex flex-col items-center justify-center">
              <span className="text-[28px] font-semibold text-[#2C2C2C] leading-none mb-2">{profile.activePledges}</span>
              <span className="text-[11px] text-[#6F6F6F] font-medium leading-tight">{t("active_pledges")}</span>
            </div>
          </div>

          {/* Security Card */}
          <div className="bg-white rounded-[20px] border border-[#ECEAE4] shadow-sm p-6">
            <h3 className="text-[16px] font-semibold text-[#2C2C2C]">{t("security")}</h3>
            <p className="text-[12px] text-[#6F6F6F] mt-1 mb-3">{t("security_desc")}</p>
            <p className="text-[11px] text-[#8C8F7A] mb-5">{t("last_password_update")}</p>

            <button className="w-full flex items-center justify-center gap-2 bg-[#E3E5C3] hover:bg-[#DEDCD4] text-[#2C2C2C] text-[13px] font-semibold py-3 rounded-[12px] transition-colors">
              <Lock size={14} /> {t("change_password")}
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
                  {isTrial ? t("free_trial") : t("status_active")}
                </span>
                <span className="text-[13px] text-[#6F6F6F] font-medium">
                  {t("ends")} {endDateStr}
                </span>
              </div>
              {days <= 14 && (
                <div>
                  <span className="bg-[#FEE2E2] text-[#991B1B] text-[11px] font-bold px-2.5 py-1 rounded-full">
                    {t("days_remaining", { days })}
                  </span>
                </div>
              )}
              <p className="text-[13px] text-[#2C2C2C] leading-relaxed">
                {isTrial ? t("trial_expires_msg") : t("active_sub_msg")}
              </p>
            </div>
            <div>
              <button onClick={() => router.push("/subscription")} className="bg-[#555B3F] hover:bg-[#3D4230] text-white text-[13px] font-semibold px-5 py-3 rounded-[12px] transition-colors flex items-center gap-2">
                {t("subscribe_now")} <span>→</span>
              </button>
            </div>
          </div>

          {/* Shop & Personal Details */}
          <div className="bg-white rounded-[20px] border border-[#ECEAE4] shadow-sm overflow-hidden">
            <div className="bg-[#555B3F] px-6 py-4 flex items-center justify-between">
              <h3 className="text-[16px] font-semibold text-[#F8FAD7]">{t("shop_personal_details")}</h3>
              <button
                onClick={() => editing ? handleSave() : setEditing(true)}
                className="text-white/90 hover:text-white text-[13px] font-medium flex items-center gap-1.5"
              >
                {editing ? (saving ? <Loader2 size={14} className="animate-spin" /> : t("save")) : <><Edit2 size={14} /> {t("edit")}</>}
              </button>
            </div>

            <div className="p-6 space-y-5">
              {saveErr && <div className="text-red-600 text-[12px]">{saveErr}</div>}

              <div>
                <label className="block text-[10px] font-bold tracking-widest text-[#8C8F7A] uppercase mb-2">{t("shop_name")}</label>
                <input
                  disabled={!editing}
                  value={form.shopName}
                  onChange={e => setForm({ ...form, shopName: e.target.value })}
                  className="w-full bg-[#F9F8F3] border border-[#ECEAE4] disabled:bg-[#F9F8F3] disabled:text-[#2C2C2C] rounded-[10px] px-4 py-3 text-[14px] text-[#2C2C2C] focus:outline-none focus:ring-2 focus:ring-[#8C8F7A] transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold tracking-widest text-[#8C8F7A] uppercase mb-2">{t("address_label")}</label>
                <input
                  disabled={!editing}
                  value={form.address}
                  onChange={e => setForm({ ...form, address: e.target.value })}
                  className="w-full bg-[#F9F8F3] border border-[#ECEAE4] disabled:bg-[#F9F8F3] disabled:text-[#2C2C2C] rounded-[10px] px-4 py-3 text-[14px] text-[#2C2C2C] focus:outline-none focus:ring-2 focus:ring-[#8C8F7A] transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] font-bold tracking-widest text-[#8C8F7A] uppercase mb-2">{t("mobile")}</label>
                  <input
                    disabled={!editing}
                    value={form.mobile}
                    onChange={e => setForm({ ...form, mobile: e.target.value })}
                    className="w-full bg-[#F9F8F3] border border-[#ECEAE4] disabled:bg-[#F9F8F3] disabled:text-[#2C2C2C] rounded-[10px] px-4 py-3 text-[14px] text-[#2C2C2C] focus:outline-none focus:ring-2 focus:ring-[#8C8F7A] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold tracking-widest text-[#8C8F7A] uppercase mb-2">{t("gender")}</label>
                  <select
                    disabled={!editing}
                    value={form.gender}
                    onChange={e => setForm({ ...form, gender: e.target.value })}
                    className="w-full bg-[#F9F8F3] border border-[#ECEAE4] disabled:bg-[#F9F8F3] disabled:text-[#2C2C2C] rounded-[10px] px-4 py-3 text-[14px] text-[#2C2C2C] focus:outline-none focus:ring-2 focus:ring-[#8C8F7A] transition-all appearance-none"
                  >
                    <option value="">{t("gender")}</option>
                    <option value="Male">{t("male")}</option>
                    <option value="Female">{t("female")}</option>
                    <option value="Other">{t("other")}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] font-bold tracking-widest text-[#8C8F7A] uppercase mb-2">{t("first_name")}</label>
                  <input
                    disabled={!editing}
                    value={form.firstName}
                    onChange={e => setForm({ ...form, firstName: e.target.value })}
                    className="w-full bg-[#F9F8F3] border border-[#ECEAE4] disabled:bg-[#F9F8F3] disabled:text-[#2C2C2C] rounded-[10px] px-4 py-3 text-[14px] text-[#2C2C2C] focus:outline-none focus:ring-2 focus:ring-[#8C8F7A] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold tracking-widest text-[#8C8F7A] uppercase mb-2">{t("last_name")}</label>
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
              <h3 className="text-[18px] font-semibold text-[#2C2C2C]">{t("receipt_terms")}</h3>
              <p className="text-[13px] text-[#6F6F6F] mt-1.5 leading-relaxed">
                {t("receipt_terms_desc")}
              </p>
            </div>

            <div className="space-y-6">
              {termsErr && <div className="text-red-600 text-[12px]">{termsErr}</div>}

              <div>
                <label className="block text-[13px] font-semibold text-[#2C2C2C] mb-2">{t("shopowner_copy_terms")}</label>
                <textarea
                  rows={4}
                  placeholder={"• मेरे द्वारा गिरवी रखी गई उपरोक्त रकम...\n• (each line is one term)"}
                  value={shopownerTerms}
                  onChange={e => setShopownerTerms(e.target.value)}
                  className="w-full bg-white border border-[#ECEAE4] rounded-[12px] px-4 py-3 text-[13px] text-[#2C2C2C] focus:outline-none focus:ring-2 focus:ring-[#8C8F7A] resize-none transition-all"
                />
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-[#2C2C2C] mb-2">{t("customer_copy_terms")}</label>
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
                  {t("default_hindi_terms_note")}
                </p>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleTermsSave}
                  disabled={termsSaving}
                  className="bg-[#6B7150] hover:bg-[#585E42] text-white text-[13px] font-semibold px-6 py-2.5 rounded-[12px] transition-colors flex items-center gap-2 shadow-sm"
                >
                  {termsSaving && <Loader2 size={14} className="animate-spin" />}
                  {t("save_terms")}
                </button>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}