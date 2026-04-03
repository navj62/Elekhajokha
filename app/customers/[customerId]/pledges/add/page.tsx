"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { 
  Loader2, X, ArrowLeft, Wallet, Diamond, 
  Camera, AlignLeft, CloudUpload, CheckCircle2 
} from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import DashboardLayout from "@/app/dashboard/layout";

interface Customer {
  id: string;
  name: string;
  address: string;
  createdAt: string;
}

export default function AddPledgePage() {
  const params = useParams<{ customerId: string }>();
  const customerId = params?.customerId;
  const router = useRouter();
  const { t } = useLanguage();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerLoading, setCustomerLoading] = useState(true);

  useEffect(() => {
    if (!customerId) return;
    fetch(`/api/customers/${customerId}`)
      .then((r) => r.json())
      .then((data) => setCustomer(data.customer))
      .catch(() => {})
      .finally(() => setCustomerLoading(false));
  }, [customerId]);

  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    pledgeDate: today,
    loanAmount: "",
    itemType: "GOLD",
    itemName: "",
    grossWeight: "",
    netWeight: "",
    purity: "",
    interestRate: "",
    compoundingDuration: "MONTHLY",
    remark: "",
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const update = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const ITEM_TYPES = [
    { value: "GOLD", label: t("gold") || "Gold" },
    { value: "SILVER", label: t("silver") || "Silver" },
  ];

  const COMPOUNDING_OPTIONS = [
    { value: "MONTHLY", label: t("monthly") || "Monthly" },
    { value: "QUARTERLY", label: t("quarterly") || "Quarterly" },
    { value: "YEARLY", label: t("yearly") || "Yearly" },
  ];

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError(t("image_type_error")); return; }
    if (file.size > 5 * 1024 * 1024) { setError(t("image_size_error")); return; }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setError("");
  }

  function removeImage() {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (Number(form.netWeight) > Number(form.grossWeight)) {
      setError(t("net_weight_error"));
      return;
    }
    if (Number(form.purity) <= 0 || Number(form.purity) > 100) {
      setError(t("purity_error"));
      return;
    }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("customerId", customerId ?? "");
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (imageFile) fd.append("itemPhoto", imageFile);

      const res = await fetch("/api/pledges", { method: "POST", body: fd });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save pledge");
      }

      router.push(customerId ? `/customers/${customerId}` : "/customers");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const mockTotalPledges = 14;
  const mockCreditScore = 780;
  const calculatedEstValue = Number(form.grossWeight) * 5500; // rough demo logic

  return (
    <DashboardLayout>
      <div className="font-sans text-[#2C2C2C]">
        <div className="max-w-[1200px] mx-auto space-y-8">
          
          {/* Header */}
          <div className="flex items-center justify-between mb-4 mt-2">
            <Link
              href={customerId ? `/customers/${customerId}` : "/customers"}
              className="flex flex-row items-center gap-2 hover:text-black transition-colors font-medium text-lg"
            >
              <ArrowLeft className="w-5 h-5" />
              {t("add_pledge")}
            </Link>
          </div>

        {/* Customer Banner */}
        <div className="bg-[#FAFAF7] rounded-[20px] p-6 lg:p-8 flex flex-col md:flex-row items-start md:items-center justify-between border border-[#E8E6DF] shadow-sm">
          <div className="flex items-center gap-5">
            <div className="w-[60px] h-[60px] rounded-full bg-[#545A3E] text-white flex items-center justify-center text-2xl font-bold shadow-md">
              {customer?.name?.charAt(0).toUpperCase() || "C"}
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1.5">
                <h2 className="text-2xl font-bold text-[#2C2C2C]">
                  {customerLoading ? t("loading_text") : customer?.name ?? "—"}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-[#545A3E] text-white text-[10px] font-bold tracking-wider">
                  ACTIVE
                </span>
              </div>
              <p className="text-sm text-[#6F6F6F]">
                Customer ID: <span className="font-semibold text-[#2C2C2C]">#{customer?.id?.substring(0,8).toUpperCase() || "..."}</span> &bull; Member since {customer?.createdAt ? new Date(customer.createdAt).getFullYear() : "..."}
              </p>
            </div>
          </div>
          
          <div className="flex gap-10 mt-6 md:mt-0 pt-6 md:pt-0 border-t md:border-t-0 md:border-l border-[#DADBCF] md:pl-10 w-full md:w-auto">
            <div className="text-left md:text-right">
              <p className="text-[10px] font-bold text-[#6F6F6F] uppercase tracking-wider mb-1">Total Pledges</p>
              <p className="text-2xl font-bold text-[#2C2C2C]">{mockTotalPledges}</p>
            </div>
            <div className="text-left md:text-right">
              <p className="text-[10px] font-bold text-[#6F6F6F] uppercase tracking-wider mb-1">Credit Score</p>
              <p className="text-2xl font-bold text-[#2C2C2C]">{mockCreditScore}</p>
            </div>
          </div>
        </div>

        {/* Form Grid Layout */}
        <form onSubmit={submit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            
            {/* Loan Details Card */}
            <div className="bg-[#FFFFFF] rounded-[20px] p-6 shadow-sm border border-[#E8E6DF]">
              <h3 className="flex items-center gap-2 text-[15px] font-bold text-[#2C2C2C] mb-6">
                <Wallet className="w-[18px] h-[18px] text-[#6F6F6F]" />
                Loan Details
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-[10px] font-bold tracking-wider text-[#6F6F6F] uppercase mb-2">Principal Amount (₹)</label>
                  <input 
                    type="number" min="0" step="0.01" 
                    value={form.loanAmount} onChange={e => update("loanAmount", e.target.value)} required 
                    className="w-full h-11 bg-[#EDEBDD] rounded-lg px-4 text-[#2C2C2C] outline-none border border-[#E5E3DA] focus:border-[#545A3E] focus:ring-1 focus:ring-[#545A3E] transition-all font-medium placeholder:text-[#A3A3A3]" 
                    placeholder="0.00" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold tracking-wider text-[#6F6F6F] uppercase mb-2">Interest Rate (%)</label>
                  <input 
                    type="number" min="0" step="0.01" 
                    value={form.interestRate} onChange={e => update("interestRate", e.target.value)} required 
                    className="w-full h-11 bg-[#EDEBDD] rounded-lg px-4 text-[#2C2C2C] outline-none border border-[#E5E3DA] focus:border-[#545A3E] focus:ring-1 focus:ring-[#545A3E] transition-all font-medium placeholder:text-[#A3A3A3]" 
                    placeholder="2.5" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold tracking-wider text-[#6F6F6F] uppercase mb-2">Payment Frequency</label>
                <div className="flex p-1 bg-[#EDEBDD] rounded-xl w-full sm:max-w-md border border-[#E5E3DA]">
                  {COMPOUNDING_OPTIONS.map(o => (
                    <button 
                      key={o.value} type="button" 
                      onClick={() => update("compoundingDuration", o.value)} 
                      className={`flex-1 py-2 text-[13px] font-semibold rounded-lg transition-all ${
                        form.compoundingDuration === o.value 
                          ? 'bg-[#545A3E] text-white shadow-sm' 
                          : 'text-[#6F6F6F] hover:bg-[#DADBCF]/50'
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Item Details Card */}
            <div className="bg-[#FFFFFF] rounded-[20px] p-6 shadow-sm border border-[#E8E6DF]">
              <h3 className="flex items-center gap-2 text-[15px] font-bold text-[#2C2C2C] mb-6">
                <Diamond className="w-[18px] h-[18px] text-[#6F6F6F]" />
                Item Details
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-[10px] font-bold tracking-wider text-[#6F6F6F] uppercase mb-2">Item Category</label>
                  <div className="flex p-1 bg-[#EDEBDD] rounded-xl w-full border border-[#E5E3DA]">
                    {ITEM_TYPES.map(o => (
                      <button 
                        key={o.value} type="button" 
                        onClick={() => update("itemType", o.value)} 
                        className={`flex-1 py-2 text-[13px] font-semibold rounded-lg transition-all ${
                          form.itemType === o.value 
                            ? 'bg-[#545A3E] text-white shadow-sm' 
                            : 'text-[#6F6F6F] hover:bg-[#DADBCF]/50'
                        }`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold tracking-wider text-[#6F6F6F] uppercase mb-2">Weight (Grams)</label>
                  <input 
                    type="number" min="0" step="0.001" 
                    value={form.grossWeight} onChange={e => { update("grossWeight", e.target.value); update("netWeight", e.target.value); }} required 
                    className="w-full h-11 bg-[#EDEBDD] rounded-lg px-4 text-[#2C2C2C] outline-none border border-[#E5E3DA] focus:border-[#545A3E] focus:ring-1 focus:ring-[#545A3E] transition-all font-medium placeholder:text-[#A3A3A3]" 
                    placeholder="0.00" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-bold tracking-wider text-[#6F6F6F] uppercase mb-2">Item Name</label>
                  <input 
                    type="text" 
                    value={form.itemName} onChange={e => update("itemName", e.target.value)} required 
                    className="w-full h-11 bg-[#EDEBDD] rounded-lg px-4 text-[#2C2C2C] outline-none border border-[#E5E3DA] focus:border-[#545A3E] focus:ring-1 focus:ring-[#545A3E] transition-all font-medium placeholder:text-[#A3A3A3]" 
                    placeholder="e.g. Gold Necklace" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold tracking-wider text-[#6F6F6F] uppercase mb-2">Purity (%)</label>
                  <input 
                    type="number" min="0" step="0.01" 
                    value={form.purity} onChange={e => update("purity", e.target.value)} required 
                    className="w-full h-11 bg-[#EDEBDD] rounded-lg px-4 text-[#2C2C2C] outline-none border border-[#E5E3DA] focus:border-[#545A3E] focus:ring-1 focus:ring-[#545A3E] transition-all font-medium placeholder:text-[#A3A3A3]" 
                    placeholder="91.6" 
                  />
                </div>
              </div>
            </div>
            
          </div>

          <div className="space-y-6">
            {/* Item Photo */}
            <div className="bg-[#FFFFFF] rounded-[20px] p-6 shadow-sm border border-[#E8E6DF]">
              <h3 className="flex items-center gap-2 text-[15px] font-bold text-[#2C2C2C] mb-6">
                <Camera className="w-[18px] h-[18px] text-[#6F6F6F]" />
                Item Photo
              </h3>
              
              {imagePreview ? (
                <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden border border-[#E5E3DA]">
                    <img src={imagePreview} alt="Item Preview" className="w-full h-full object-cover" />
                    <button type="button" onClick={removeImage} className="absolute top-2 right-2 flex items-center justify-center p-1.5 bg-[#F4F3EE] hover:bg-white text-[#545A3E] rounded-md shadow-sm transition-colors border border-[#DADBCF]">
                      <X size={16} />
                    </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-[180px] bg-[#F7F6F1] border-2 border-dashed border-[#DADBCF] hover:border-[#545A3E] hover:bg-[#FAFAF7] transition-all rounded-xl cursor-pointer">
                  <div className="w-[50px] h-[50px] bg-[#EDEBDD] rounded-full flex items-center justify-center mb-4 text-[#545A3E]">
                    <CloudUpload className="w-6 h-6" />
                  </div>
                  <p className="text-[13px] font-semibold text-[#2C2C2C] mb-1">Click to upload a photo</p>
                  <p className="text-[11px] text-[#6F6F6F]">of the item</p>
                  <p className="text-[9px] font-bold tracking-[0.15em] text-[#A3A3A3] uppercase mt-4">PNG, JPG UP TO 5 MB</p>
                  <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleImageChange} />
                </label>
              )}
            </div>

            {/* Remarks */}
            <div className="bg-[#FFFFFF] rounded-[20px] p-6 shadow-sm border border-[#E8E6DF]">
              <h3 className="flex items-center gap-2 text-[15px] font-bold text-[#2C2C2C] mb-6">
                <AlignLeft className="w-[18px] h-[18px] text-[#6F6F6F]" />
                Remarks
              </h3>
              <label className="block text-[10px] font-bold tracking-wider text-[#6F6F6F] uppercase mb-2">Additional Notes</label>
              <textarea 
                value={form.remark} onChange={e => update("remark", e.target.value)} 
                className="w-full h-28 bg-[#EDEBDD] rounded-xl p-4 text-[#2C2C2C] placeholder:text-[#A3A3A3] outline-none border border-[#E5E3DA] focus:border-[#545A3E] focus:ring-1 focus:ring-[#545A3E] transition-all resize-none text-[13px]" 
                placeholder="Internal notes for ledger administrators..." 
              />
            </div>

            {/* Summary Box */}
            <div className="bg-[#F6F5EF] rounded-[20px] p-6 shadow-sm border border-[#E8E6DF] relative">
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm font-medium">
                  {error}
                </div>
              )}
              
              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-[#6F6F6F] font-semibold">Estimated Value</span>
                  <span className="font-bold text-[#2C2C2C]">₹{calculatedEstValue > 0 ? calculatedEstValue.toFixed(2) : "0.00"}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-[#6F6F6F] font-semibold">Processing Fee</span>
                  <span className="font-bold text-[#2C2C2C]">₹25.00</span>
                </div>
              </div>

              <div className="border-t border-[#E8E6DF] pt-5 pb-6 flex justify-between items-center">
                <span className="text-[17px] font-bold text-[#2C2C2C]">Total Pledge</span>
                <span className="text-[22px] font-bold text-[#2C2C2C]">
                  ₹{Number(form.loanAmount) ? Number(form.loanAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : "0.00"}
                </span>
              </div>

              <button 
                type="submit" disabled={loading} 
                className="w-full h-[52px] bg-[#545A3E] hover:bg-[#484E34] text-white rounded-full font-semibold text-[15px] flex items-center justify-center gap-2 transition-colors disabled:opacity-70 shadow-md"
              >
                {loading ? <Loader2 className="w-[18px] h-[18px] animate-spin"/> : <CheckCircle2 className="w-[18px] h-[18px]"/>}
                {loading ? "Processing..." : "Add Pledge"}
              </button>
            </div>

            {/* System Status - Floating indicator style */}
            <div className="flex justify-end mt-4">
              <div className="bg-white rounded-xl shadow-sm border border-[#E8E6DF] py-2.5 px-3.5 flex items-center gap-3 pr-8">
                <div className="w-2 h-2 rounded-full bg-[#545A3E] shadow-[0_0_8px_rgba(84,90,62,0.6)] animate-pulse"></div>
                <div>
                  <p className="text-[8px] font-bold text-[#A3A3A3] tracking-[0.2em] uppercase mb-0.5">System Status</p>
                  <p className="text-[11px] font-bold text-[#2C2C2C]">Secure Ledger Sync Active</p>
                </div>
              </div>
            </div>
            
          </div>
        </form>

        </div>
      </div>
    </DashboardLayout>
  );
}