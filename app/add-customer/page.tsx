"use client";

import { useState } from "react";
import DashboardLayout from "../dashboard/layout";
import { Camera, Image as ImageIcon } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";

export default function AddCustomerPage() {
  const [loading, setLoading] = useState(false);
  const [gender, setGender] = useState("");
  const { t } = useLanguage();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.append("gender", gender);

    setTimeout(() => {
      setLoading(false);
      alert("Customer added successfully");
      e.currentTarget.reset();
      setGender("");
    }, 1000);
  }

  const inputClassName = "w-full rounded-[10px] px-4 py-[13px] text-[14px] transition-all outline-none placeholder-[#A8A8A8]";
  const inputStyle = {
    backgroundColor: "#EAE9DF",
    border: "1px solid #E0DED6",
    color: "#2B2B2B",
  };
  const focusClassName = "focus:ring-[2px] focus:ring-[#A2AB89] focus:border-transparent";

  const labelClassName = "block text-[13px] font-semibold mb-2";
  const labelStyle = { color: "#2B2B2B" };

  const uploadBoxStyle = {
    backgroundColor: "#EAE9DF",
    border: "2px dashed #D6D8C8",
  };

  const genderOptions = [
    { value: "Male", label: t("male"), symbol: "♂" },
    { value: "Female", label: t("female"), symbol: "♀" },
    { value: "Other", label: t("other"), symbol: "⚥" },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-[1040px] mx-auto pt-6 pb-12 dash-animate">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-[28px] font-bold tracking-tight" style={{ color: "#2B2B2B" }}>
            {t("add_customer")}
          </h1>
          <p className="text-[14px] mt-2" style={{ color: "#6D6D6D" }}>
            {t("add_customer_desc")}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left Column (Uploads) */}
          <div className="lg:col-span-4 space-y-6">

            {/* Customer Photo */}
            <div
              className="rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all"
              style={{ backgroundColor: "#FBFBF9", boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}
            >
              <h3 className="w-full text-left text-[15px] font-bold mb-5" style={{ color: "#2B2B2B" }}>
                {t("customer_photo")}
              </h3>
              <div
                className="relative w-full aspect-square rounded-[14px] flex flex-col items-center justify-center transition-colors hover:bg-[#D6D8C8]/50"
                style={uploadBoxStyle}
              >
                <div className="bg-white/40 p-3 rounded-full mb-3">
                  <Camera className="w-6 h-6" style={{ color: "#5F6547" }} />
                </div>
                <span className="text-[13px] font-semibold" style={{ color: "#6D6D6D" }}>{t("upload_portrait")}</span>
                <input type="file" name="userImg" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              </div>
              <p className="w-full text-left text-[12px] mt-4" style={{ color: "#A8A8A8" }}>
                {t("allowed_formats")}
              </p>
            </div>

            {/* ID Proof Image */}
            <div
              className="rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all"
              style={{ backgroundColor: "#FBFBF9", boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}
            >
              <h3 className="w-full text-left text-[15px] font-bold mb-5" style={{ color: "#2B2B2B" }}>
                {t("id_proof_image")}
              </h3>
              <div
                className="relative w-full aspect-[4/3] rounded-[14px] flex flex-col items-center justify-center transition-colors hover:bg-[#D6D8C8]/50"
                style={uploadBoxStyle}
              >
                <div className="bg-white/40 p-3 rounded-full mb-3">
                  <ImageIcon className="w-6 h-6" style={{ color: "#5F6547" }} />
                </div>
                <span className="text-[13px] font-semibold" style={{ color: "#6D6D6D" }}>{t("scan_upload_id")}</span>
                <input type="file" name="idProofImg" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              </div>
            </div>

          </div>

          {/* Right Column (Form) */}
          <div
            className="lg:col-span-8 rounded-2xl p-8"
            style={{ backgroundColor: "#FBFBF9", boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}
          >
            <div className="space-y-6">

              {/* Name */}
              <div>
                <label className={labelClassName} style={labelStyle}>{t("full_name")}</label>
                <input
                  name="name"
                  required
                  className={`${inputClassName} ${focusClassName}`}
                  style={inputStyle}
                  placeholder={t("enter_legal_name")}
                />
              </div>

              {/* Mobile & Aadhaar */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={labelClassName} style={labelStyle}>{t("mobile_number")}</label>
                  <div className="relative flex items-center">
                    <div
                      className="absolute left-[1px] top-[1px] bottom-[1px] flex items-center justify-center px-[18px] rounded-l-[9px] text-[13px] font-semibold z-10"
                      style={{ backgroundColor: "#EAE9DF", color: "#6D6D6D", borderRight: "1px solid #E0DED6" }}
                    >
                      +91
                    </div>
                    <input
                      name="mobile"
                      type="tel"
                      maxLength={10}
                      className={`pl-[72px] relative z-0 ${inputClassName} ${focusClassName}`}
                      style={inputStyle}
                      placeholder="00000 00000"
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClassName} style={labelStyle}>{t("aadhaar_number")}</label>
                  <input
                    name="aadhaarNo"
                    maxLength={14}
                    className={`${inputClassName} ${focusClassName}`}
                    style={inputStyle}
                    placeholder="0000 0000 0000"
                    onChange={(e) => {
                      let val = e.target.value.replace(/\D/g, '');
                      e.target.value = val.replace(/(\d{4})(?=\d)/g, '$1 ');
                    }}
                  />
                </div>
              </div>

              {/* Gender */}
              <div>
                <label className={labelClassName} style={labelStyle}>{t("gender")}</label>
                <div className="flex gap-4">
                  {genderOptions.map((g) => {
                    const isActive = gender === g.value;
                    return (
                      <button
                        key={g.value}
                        type="button"
                        onClick={() => setGender(g.value)}
                        className={`flex-1 py-[13px] rounded-[10px] text-[14px] font-semibold transition-all flex items-center justify-center gap-2 ${focusClassName}`}
                        style={{
                          backgroundColor: isActive ? "#D6D8C8" : "#EAE9DF",
                          color: isActive ? "#2B2B2B" : "#6D6D6D",
                          border: "1px solid",
                          borderColor: isActive ? "transparent" : "#E0DED6",
                        }}
                      >
                        <span className="text-[16px] font-medium mr-1 leading-none">{g.symbol}</span>
                        {g.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Address */}
              <div>
                <label className={labelClassName} style={labelStyle}>{t("address")}</label>
                <textarea
                  name="address"
                  required
                  rows={3}
                  className={`${inputClassName} ${focusClassName} resize-none`}
                  style={inputStyle}
                  placeholder={t("address_placeholder")}
                />
              </div>

              {/* Remarks */}
              <div>
                <label className={labelClassName} style={labelStyle}>{t("remarks")}</label>
                <textarea
                  name="remarks"
                  rows={2}
                  className={`${inputClassName} ${focusClassName} resize-none min-h-[80px]`}
                  style={inputStyle}
                  placeholder={t("remarks_placeholder")}
                />
              </div>

              {/* Actions */}
              <div className="pt-8 mb-2 flex items-center justify-end gap-6">
                <button
                  type="button"
                  className="px-6 py-3 font-semibold text-[14px] transition-colors hover:text-[#2B2B2B]"
                  style={{ color: "#6D6D6D" }}
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-8 py-[14px] rounded-full font-bold text-[14px] text-white transition-opacity hover:opacity-90 active:scale-[0.98] shadow-lg"
                  style={{
                    background: "linear-gradient(135deg, #5F6547, #747B58)",
                    boxShadow: "0 4px 14px rgba(95, 101, 71, 0.25)",
                  }}
                >
                  {loading ? t("saving") : t("save_customer")}
                </button>
              </div>

            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
