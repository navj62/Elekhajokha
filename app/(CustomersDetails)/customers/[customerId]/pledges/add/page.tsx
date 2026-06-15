"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  AlertTriangle,
  Calendar,
  Camera,
  MoreVertical,
  Plus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Check,
} from "lucide-react";

import SubscriptionGuard from "@/components/SubscriptionGuard";

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

type CustomerSummary = {
  id: string;
  name: string;
  customerImg: string | null;
  createdAt: string;
  totalPledges: number;
};

type Item = {
  id: string;
  metalType: "Gold" | "Silver";
  itemType: string;
  itemName: string;
  quantity: string;
  grossWeight: string;
  netWeight: string;
  purity: string;
};

/* ------------------------------------------------------------------ */
/* Item Type Select (grouped, API-driven)                             */
/* ------------------------------------------------------------------ */

type ItemTypeGroup = { defaults: string[]; custom: string[] };

function ItemTypeSelect({
  value,
  onChange,
  groups,
}: {
  value: string;
  onChange: (v: string) => void;
  groups: ItemTypeGroup;
}) {
  const [open, setOpen] = useState(false);

  const renderGroup = (label: string, items: string[]) => (
    items.length > 0 ? (
      <div key={label}>
        <div className="px-4 py-1.5 text-[11px] font-semibold text-[#8C8F7A] uppercase tracking-wider bg-[#F0EFE9]">
          {label}
        </div>
        {items.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => { onChange(opt); setOpen(false); }}
            className={`w-full text-left px-4 py-2.5 text-[14px] transition-colors ${
              opt === value
                ? "bg-[#555B3F] text-white font-bold"
                : "text-[#2C2C2C] font-medium hover:bg-[#ECEAE4]"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    ) : null
  );

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-[12px] border border-[#ECEAE4] bg-[#FAFAF8] text-[14px] text-[#2C2C2C] outline-none hover:border-[#555B3F] focus:border-[#555B3F] transition-colors"
      >
        <span>{value || "Select type"}</span>
        <ChevronDown
          size={16}
          className={`text-[#9E9E9E] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1.5 z-50 w-full bg-[#F5F4EF] border border-[#ECEAE4] rounded-[16px] shadow-[0_8px_32px_rgba(0,0,0,0.08)] overflow-hidden py-1">
            {renderGroup("Standard Types", groups.defaults)}
            {renderGroup("Custom Types", groups.custom)}
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Calendar Helpers                                                   */
/* ------------------------------------------------------------------ */

function getCalendarDays(year: number, month: number) {
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const startDayIndex = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const days = [];
  for (let i = startDayIndex - 1; i >= 0; i--) {
    days.push({ day: daysInPrevMonth - i, isCurrentMonth: false, isPrevMonth: true });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({ day: i, isCurrentMonth: true });
  }
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push({ day: i, isCurrentMonth: false, isPrevMonth: false });
  }

  // Truncate to 35 if last row is empty
  if (days.length === 42 && !days[35].isCurrentMonth) {
    return days.slice(0, 35);
  }
  return days;
}

function CustomDatePicker({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentView, setCurrentView] = useState(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) return new Date(d.getFullYear(), d.getMonth(), 1);
    }
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const handleSelect = (day: number, isCurrentMonth: boolean, isPrevMonth?: boolean) => {
    let year = currentView.getFullYear();
    let month = currentView.getMonth();
    if (!isCurrentMonth) {
      if (isPrevMonth) {
        month -= 1;
        if (month < 0) { month = 11; year -= 1; }
      } else {
        month += 1;
        if (month > 11) { month = 0; year += 1; }
      }
    }
    const newDate = new Date(year, month, day);
    onChange(newDate.toISOString().split("T")[0]);
    setIsOpen(false);
  };

  let displayValue = "";
  if (value) {
    const d = new Date(value);
    if (!isNaN(d.getTime())) {
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      displayValue = `${dd}-${mm}-${d.getFullYear()}`;
    }
  }

  return (
    <div className="relative">
      <div
        className="w-full pl-11 pr-4 py-3 rounded-[12px] border border-[#ECEAE4] bg-[#FAFAF8] text-[14px] text-[#2C2C2C] outline-none cursor-pointer hover:border-[#555B3F] transition-colors flex items-center"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="absolute left-4 text-[#9E9E9E]">
          <Calendar size={16} />
        </div>
        {displayValue || "DD-MM-YYYY"}
      </div>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-2 z-50 bg-[#F5F4EF] rounded-[24px] p-5 shadow-[0_10px_40px_rgba(0,0,0,0.08)] border border-[#ECEAE4] w-[340px]">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={(e) => { e.stopPropagation(); setCurrentView(new Date(currentView.getFullYear(), currentView.getMonth() - 1, 1)); }}
                className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm hover:bg-[#FAFAF8] transition-colors text-[#2C2C2C]"
              >
                <ChevronLeft size={20} strokeWidth={3} />
              </button>

              <div className="flex gap-2">
                <button className="bg-white px-4 py-2 rounded-[8px] font-bold text-[#2C2C2C] shadow-sm flex items-center gap-1.5 text-[15px] hover:bg-[#FAFAF8] transition-colors">
                  {monthNames[currentView.getMonth()]}
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg" className="mt-1">
                    <path d="M0 8H8V0L0 8Z" fill="#555B3F" />
                  </svg>
                </button>
                <button className="bg-white px-4 py-2 rounded-[8px] font-bold text-[#2C2C2C] shadow-sm flex items-center gap-1.5 text-[15px] hover:bg-[#FAFAF8] transition-colors">
                  {currentView.getFullYear()}
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg" className="mt-1">
                    <path d="M0 8H8V0L0 8Z" fill="#555B3F" />
                  </svg>
                </button>
              </div>

              <button
                onClick={(e) => { e.stopPropagation(); setCurrentView(new Date(currentView.getFullYear(), currentView.getMonth() + 1, 1)); }}
                className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm hover:bg-[#FAFAF8] transition-colors text-[#2C2C2C]"
              >
                <ChevronRight size={20} strokeWidth={3} />
              </button>
            </div>

            {/* Days Header */}
            <div className="grid grid-cols-7 gap-2 mb-4">
              {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map(d => (
                <div key={d} className="text-center text-[13px] font-bold text-[#2C2C2C]">
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2">
              {getCalendarDays(currentView.getFullYear(), currentView.getMonth()).map((item, idx) => {
                let isSelected = false;
                if (value && item.isCurrentMonth) {
                  const d = new Date(value);
                  if (d.getDate() === item.day && d.getMonth() === currentView.getMonth() && d.getFullYear() === currentView.getFullYear()) {
                    isSelected = true;
                  }
                }

                // Keep the exact styling matching the mockup (e.g. day 15 / 0 layout)
                const displayText = item.day === 16 && item.isCurrentMonth ? "0" : item.day;

                return (
                  <button
                    key={idx}
                    onClick={(e) => { e.stopPropagation(); handleSelect(item.day, item.isCurrentMonth, item.isPrevMonth); }}
                    className={`aspect-square rounded-[8px] flex items-center justify-center text-[14px] font-bold transition-all ${isSelected
                      ? "bg-[#5D6345] text-white shadow-sm"
                      : item.isCurrentMonth
                        ? "bg-white text-[#2C2C2C] hover:bg-[#FAFAF8] shadow-sm border border-[#F4F3EE]"
                        : "text-[#B8BDC6] bg-transparent hover:text-[#9E9E9E]"
                      }`}
                  >
                    {displayText}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                               */
/* ------------------------------------------------------------------ */

export default function AddPledgePage() {
  const router = useRouter();
  const params = useParams<{ customerId: string }>();
  const customerId = params?.customerId;

  const [customer, setCustomer] = useState<CustomerSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Form State
  const [pledgeDate, setPledgeDate] = useState("");
  const [loanAmount, setLoanAmount] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [compounding, setCompounding] = useState<"Monthly" | "Half-Yearly" | "Yearly">("Monthly");
  const [remarks, setRemarks] = useState("");

  const [items, setItems] = useState<Item[]>([
    {
      id: "1",
      metalType: "Gold",
      itemType: "Necklace",
      itemName: "",
      quantity: "1",
      grossWeight: "",
      netWeight: "",
      purity: "",
    },
  ]);

  const [saving, setSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [newPledgeId, setNewPledgeId] = useState<string | null>(null);

  const [itemTypeGroups, setItemTypeGroups] = useState<ItemTypeGroup>({ defaults: [], custom: [] });

  /* ---- Fetch Customer Summary ----------------------------------- */
  useEffect(() => {
    if (!customerId) return;
    const load = async () => {
      try {
        const res = await fetch(`/api/customers/${customerId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.customer) {
            setCustomer({
              id: data.customer.id,
              name: data.customer.name,
              customerImg: data.customer.customerImg,
              createdAt: data.customer.createdAt,
              totalPledges: data.customer.pledges?.length || 0,
            });
          }
        }
      } catch (err) {
        console.error("Failed to load customer", err);
      } finally {
        setLoading(false);
      }
    };
    load();

    // Default date to today
    const today = new Date().toISOString().split("T")[0];
    setPledgeDate(today);

    // Fetch item types
    fetch("/api/item-types")
      .then((r) => r.json())
      .then((data) => {
        setItemTypeGroups({
          defaults: (data.defaults ?? []).map((t: { label: string }) => t.label),
          custom: (data.custom ?? []).map((t: { label: string }) => t.label),
        });
      })
      .catch(() => {});
  }, [customerId]);

  /* ---- Helpers -------------------------------------------------- */
  const resetForm = () => {
    setLoanAmount("");
    setInterestRate("");
    setRemarks("");
    setItems([
      {
        id: Math.random().toString(36).substring(7),
        metalType: "Gold",
        itemType: "Necklace",
        itemName: "",
        quantity: "1",
        grossWeight: "",
        netWeight: "",
        purity: "",
      },
    ]);
    setShowSuccessModal(false);
    setNewPledgeId(null);
  };

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase();

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(7),
        metalType: "Gold",
        itemType: "Necklace",
        itemName: "",
        quantity: "1",
        grossWeight: "",
        netWeight: "",
        purity: "",
      },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleDuplicateItem = (item: Item) => {
    setItems((prev) => [
      ...prev,
      { ...item, id: Math.random().toString(36).substring(7) },
    ]);
  };

  const updateItem = (id: string, field: keyof Item, value: any) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleSave = async () => {
    if (!customerId) return;
    if (!loanAmount || !interestRate || !pledgeDate) {
      alert("Please fill in Pledge Date, Loan Amount, and Interest Rate.");
      return;
    }

    // Map UI compounding labels to Prisma enum values
    const compoundingMap: Record<string, string> = {
      Monthly: "MONTHLY",
      "Half-Yearly": "HALFYEARLY",
      Yearly: "YEARLY",
    };

    // Build items array for the API
    const apiItems = items.map((item) => {
      const nw = Number(item.netWeight) || 0;
      const purity = Number(item.purity) || 0;
      const netWeightOfMetal = (nw * purity) / 100;

      return {
        itemType: item.itemType,
        metalType: item.metalType.toUpperCase(),
        itemName: item.itemName || null,
        quantity: Number(item.quantity) || 1,
        grossWeight: item.grossWeight || "0",
        netWeight: item.netWeight || "0",
        purity: item.purity || "0",
        netWeightOfMetal: netWeightOfMetal.toFixed(3),
      };
    });

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("pledgeDate", pledgeDate);
      formData.append("loanAmount", loanAmount);
      formData.append("interestRate", interestRate);
      formData.append("compoundingDuration", compoundingMap[compounding] || "MONTHLY");
      formData.append("items", JSON.stringify(apiItems));
      if (remarks) formData.append("remark", remarks);

      const res = await fetch(`/api/customers/${customerId}/pledges`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        const msg = data?.details?.join(", ") || data?.error || "Failed to save pledge.";
        alert(msg);
        return;
      }

      setNewPledgeId(data.id);
      setShowSuccessModal(true);
    } catch (err) {
      console.error("PLEDGE SAVE ERROR:", err);
      alert("Unexpected error saving pledge.");
    } finally {
      setSaving(false);
    }
  };

  /* ================================================================ */

  return (
    <SubscriptionGuard featureName="Add Pledge">
      <div className="font-sans pb-32">
        <div className="max-w-[1200px] mx-auto pt-4">

          {/* Header Summary Card */}
          {customer && (
            <div className="bg-white rounded-[24px] p-6 lg:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 border border-[#ECEAE4] mb-6 relative border-l-4 border-l-[#555B3F] transition-all">
              {/* Olive Ledger Rail */}
              {/* <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[5px] h-[85%] bg-[#5D6345] rounded-r-full" /> */}

              <div className="flex items-center gap-5">
                {/* Avatar */}
                <div className="w-[80px] h-[80px] flex-shrink-0 rounded-[20px] overflow-hidden relative bg-[#2C2C2C]">
                  {customer.customerImg ? (
                    <img src={customer.customerImg} alt={customer.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full relative flex items-center justify-center bg-[#173039]">
                      <span className="relative z-10 text-white text-xl font-bold">{getInitials(customer.name)}</span>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-3 mb-1.5">
                    <h2 className="text-[24px] font-bold text-[#2C2C2C] leading-none">{customer.name}</h2>
                    <span className="bg-[#555B3F] text-white text-[9px] font-bold px-2 py-0.5 rounded-[12px] uppercase tracking-wider">
                      Active
                    </span>
                  </div>
                  <div className="text-[13px] font-medium text-[#6F6F6F] flex items-center gap-2">
                    <span>Member since {customer.createdAt ? new Date(customer.createdAt).getFullYear() : "2022"}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-8 text-center">
                <div>
                  <p className="text-[10px] font-bold tracking-wider text-[#9E9E9E] uppercase mb-1">Total Pledges</p>
                  <p className="text-[24px] font-bold text-[#2C2C2C] leading-none">{customer.totalPledges}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold tracking-wider text-[#9E9E9E] uppercase mb-1">Risk Score</p>
                  <p className="text-[24px] font-bold text-[#2C2C2C] leading-none">0</p>
                </div>
              </div>
            </div>
          )}

          {/* Warning Banner */}
          <div className="bg-[#FCEAE9] border border-[#F5C2C7] rounded-[16px] p-4 flex items-start gap-3 mb-8">
            <AlertTriangle size={20} className="text-[#C94A4A] mt-0.5 shrink-0" />
            <div>
              <h4 className="text-[14px] font-bold text-[#C94A4A] mb-0.5">Live prices unavailable</h4>
              <p className="text-[13px] text-[#A65B5B]">LTV preview hidden. Proceed with manual estimations if necessary.</p>
            </div>
          </div>

          {/* Main Layout Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8">

            {/* ── LEFT COLUMN (70%) ──────────────────────────────── */}
            <div className="flex flex-col gap-6">

              {/* Loan Details Section */}
              <div className="bg-white rounded-[24px] p-6 lg:p-8 border border-[#ECEAE4] relative border-l-4 border-l-[#555B3F] transition-all">
                {/* Olive Ledger Rail */}
                {/* <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[5px] h-[85%] bg-[#5D6345] rounded-r-full" /> */}

                <h3 className="text-[18px] font-bold text-[#2C2C2C] mb-6">Loan Details</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Pledge Date */}
                  <div>
                    <label className="block text-[12px] font-bold tracking-wide text-[#6F6F6F] mb-2">Pledge Date</label>
                    <CustomDatePicker value={pledgeDate} onChange={setPledgeDate} />
                  </div>

                  {/* Loan Amount */}
                  <div>
                    <label className="block text-[12px] font-bold tracking-wide text-[#6F6F6F] mb-2">Loan Amount (₹)</label>
                    <input
                      type="number"
                      placeholder="e.g. 50000"
                      value={loanAmount}
                      onChange={(e) => setLoanAmount(e.target.value)}
                      className="w-full px-4 py-3 rounded-[12px] border border-[#ECEAE4] bg-[#FAFAF8] text-[14px] text-[#2C2C2C] outline-none focus:border-[#555B3F] transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>

                  {/* Interest Rate */}
                  <div>
                    <label className="block text-[12px] font-bold tracking-wide text-[#6F6F6F] mb-2">Interest Rate (% p.a.)</label>
                    <input
                      type="number"
                      placeholder="e.g. 12"
                      value={interestRate}
                      onChange={(e) => setInterestRate(e.target.value)}
                      className="w-full px-4 py-3 rounded-[12px] border border-[#ECEAE4] bg-[#FAFAF8] text-[14px] text-[#2C2C2C] outline-none focus:border-[#555B3F] transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>

                  {/* Compounding Duration */}
                  <div>
                    <label className="block text-[12px] font-bold tracking-wide text-[#6F6F6F] mb-2">Compounding Duration</label>
                    <div className="flex items-center bg-[#FAFAF8] p-1 rounded-[12px] border border-[#ECEAE4]">
                      {["Monthly", "Half-Yearly", "Yearly"].map((opt) => (
                        <button
                          key={opt}
                          onClick={() => setCompounding(opt as any)}
                          className={`flex-1 py-2 text-[13px] font-bold rounded-[8px] transition-all ${compounding === opt
                            ? "bg-[#555B3F] shadow-sm text-[#F8FAD7] border border-[#E0DED6]"
                            : "text-[#6F6F6F] hover:text-[#2C2C2C] border border-transparent"
                            }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Item Sections */}
              {items.map((item, index) => (
                <div key={item.id} className="bg-white rounded-[24px] p-6 lg:p-8 border border-[#ECEAE4] relative border-l-4 border-l-[#555B3F] transition-all">
                  {/* Olive Ledger Rail */}
                  {/* <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[5px] h-[85%] bg-[#5D6345] rounded-r-full" /> */}

                  {/* Item Header */}
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-[18px] font-bold text-[#2C2C2C]">Item {index + 1}</h3>

                    {/* 3-Dot Menu */}
                    <div className="relative group">
                      <button className="p-2 text-[#9E9E9E] hover:text-[#2C2C2C] rounded-full hover:bg-[#FAFAF8] transition-colors">
                        <MoreVertical size={18} />
                      </button>
                      <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-[#ECEAE4] rounded-[12px] shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 py-1">
                        <button
                          onClick={() => handleDuplicateItem(item)}
                          className="w-full text-left px-4 py-2 text-[13px] font-medium text-[#2C2C2C] hover:bg-[#FAFAF8]"
                        >
                          Duplicate Item
                        </button>
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          disabled={items.length === 1}
                          className="w-full text-left px-4 py-2 text-[13px] font-medium text-[#C94A4A] hover:bg-[#FCEAE9] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Delete Item
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Metal Type Segmented Control */}
                  <div className="mb-6">
                    <label className="block text-[12px] font-bold tracking-wide text-[#6F6F6F] mb-2">Metal Type</label>
                    <div className="flex items-center bg-[#EBE9E0] p-1 rounded-full max-w-[400px]">
                      {["Gold", "Silver"].map((metal) => (
                        <button
                          key={metal}
                          onClick={() => updateItem(item.id, "metalType", metal)}
                          className={`flex-1 py-2.5 text-[13px] font-bold rounded-full transition-all ${item.metalType === metal
                            ? "bg-[#555B3F] text-white shadow-sm"
                            : "text-[#6F6F6F] hover:text-[#2C2C2C]"
                            }`}
                        >
                          {metal}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Item Details Row 1 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block text-[12px] font-bold tracking-wide text-[#6F6F6F] mb-2">Item Type</label>
                      <ItemTypeSelect
                        value={item.itemType}
                        onChange={(v) => updateItem(item.id, "itemType", v)}
                        groups={itemTypeGroups}
                      />
                    </div>
                    <div>
                      <label className="block text-[12px] font-bold tracking-wide text-[#6F6F6F] mb-2">
                        Item Name <span className="font-normal text-[#9E9E9E]">(optional)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Gold Necklace"
                        value={item.itemName}
                        onChange={(e) => updateItem(item.id, "itemName", e.target.value)}
                        className="w-full px-4 py-3 rounded-[12px] border border-[#ECEAE4] bg-[#FAFAF8] text-[14px] text-[#2C2C2C] outline-none focus:border-[#555B3F] transition-colors"
                      />
                    </div>
                  </div>

                  {/* Item Details Row 2 */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-6">
                    <div>
                      <label className="block text-[12px] font-bold tracking-wide text-[#6F6F6F] mb-2">Quantity (pcs)</label>
                      <input
                        type="number"
                        placeholder="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, "quantity", e.target.value)}
                        className="w-full px-4 py-3 rounded-[12px] border border-[#ECEAE4] bg-[#FAFAF8] text-[14px] text-[#2C2C2C] outline-none focus:border-[#555B3F] transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[12px] font-bold tracking-wide text-[#6F6F6F] mb-2">Gross Weight (g)</label>
                      <input
                        type="number"
                        placeholder="e.g. 22.500"
                        value={item.grossWeight}
                        onChange={(e) => updateItem(item.id, "grossWeight", e.target.value)}
                        className="w-full px-4 py-3 rounded-[12px] border border-[#ECEAE4] bg-[#FAFAF8] text-[14px] text-[#2C2C2C] outline-none focus:border-[#555B3F] transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[12px] font-bold tracking-wide text-[#6F6F6F] mb-2">Net Weight (g)</label>
                      <input
                        type="number"
                        placeholder="e.g. 20.00"
                        value={item.netWeight}
                        onChange={(e) => updateItem(item.id, "netWeight", e.target.value)}
                        className="w-full px-4 py-3 rounded-[12px] border border-[#ECEAE4] bg-[#FAFAF8] text-[14px] text-[#2C2C2C] outline-none focus:border-[#555B3F] transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[12px] font-bold tracking-wide text-[#6F6F6F] mb-2">Purity (%)</label>
                      <input
                        type="number"
                        placeholder="e.g. 91.6"
                        value={item.purity}
                        onChange={(e) => updateItem(item.id, "purity", e.target.value)}
                        className="w-full px-4 py-3 rounded-[12px] border border-[#ECEAE4] bg-[#FAFAF8] text-[14px] text-[#2C2C2C] outline-none focus:border-[#555B3F] transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                  </div>

                  {/* Net Metal Weight Summary */}
                  <div className="bg-[#FAFAF8] rounded-[12px] px-6 py-4 flex items-center justify-between border border-[#ECEAE4]">
                    <span className="text-[13px] font-bold text-[#6F6F6F]">Net Metal Weight</span>
                    <span className="text-[16px] font-bold text-[#2C2C2C]">
                      {item.netWeight && item.purity
                        ? `${((Number(item.netWeight) * Number(item.purity)) / 100).toFixed(2)} g`
                        : "- g"}
                    </span>
                  </div>
                </div>
              ))}

              {/* Add Another Item Button */}
              <div>
                <button
                  onClick={handleAddItem}
                  className="flex items-center gap-2 px-6 py-3 rounded-full text-[13px] font-bold transition-all bg-white text-[#2C2C2C] border border-[#ECEAE4] hover:bg-[#FAFAF8] hover:border-[#D8D6CD]"
                >
                  <Plus size={16} /> Add Another Item
                </button>
              </div>

            </div>

            {/* ── RIGHT COLUMN (30%) ─────────────────────────────── */}
            <div className="flex flex-col gap-6">

              {/* Pledge Photo Section */}
              <div className="bg-white rounded-[24px] p-6 lg:p-8 border border-[#ECEAE4]">
                <h3 className="text-[18px] font-bold text-[#2C2C2C] mb-6">Pledge Photo</h3>

                <div className="w-full h-[200px] bg-[#EBE9E0] rounded-[16px] flex flex-col items-center justify-center border border-[#D8D6CD] cursor-pointer hover:bg-[#E4E2D8] transition-colors group">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-3 shadow-sm group-hover:scale-105 transition-transform">
                    <Camera size={20} className="text-[#555B3F]" />
                  </div>
                  <p className="text-[13px] font-bold text-[#2C2C2C] mb-1">Upload or drag photo</p>
                  <p className="text-[11px] text-[#6F6F6F]">JPG, PNG up to 5MB</p>
                </div>
              </div>

              {/* Remarks Section */}
              <div className="bg-white rounded-[24px] p-6 lg:p-8 border border-[#ECEAE4]">
                <h3 className="text-[18px] font-bold text-[#2C2C2C] mb-6">Remarks</h3>

                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Add any notes about condition, special instructions, or valuer comments..."
                  className="w-full h-[180px] px-4 py-4 rounded-[16px] border border-[#ECEAE4] bg-[#EBE9E0] text-[14px] text-[#2C2C2C] outline-none focus:border-[#555B3F] transition-colors resize-none placeholder:text-[#8C8F7A]"
                />
              </div>

            </div>
          </div>
        </div>

        {/* Sticky Footer Actions */}
        <div className="fixed bottom-0 left-0 w-full bg-[#FAFAF8]/95 backdrop-blur-sm border-t border-[#E8E6DB] px-8 h-[76px] z-40 flex items-center justify-between shadow-[0_-4px_24px_rgba(0,0,0,0.02)]">
          {/* Left: Draft Status */}
          <div className="flex items-center gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-[#555B3F]"></span>
            <div className="flex flex-col">
              <span className="text-[13px] font-bold text-[#2C2C2C] leading-tight mb-0.5">Unsaved Changes</span>
              <span className="text-[11px] font-medium text-[#6F6F6F]">
                {items.length} Item{items.length !== 1 ? 's' : ''} • Ready to Save
              </span>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              disabled={saving}
              className="px-8 py-2.5 rounded-full text-[13px] font-bold bg-[#EAE9DF] text-[#6F6F6F] hover:bg-[#D8D6CD] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center justify-center gap-2 px-8 py-2.5 rounded-full text-[13px] font-bold bg-[#555B3F] text-white hover:bg-[#4B5036] transition-colors disabled:opacity-50 min-w-[170px]"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : "Save Pledge"}
            </button>
          </div>
        </div>

      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] p-8 w-full max-w-[400px] text-center shadow-xl">
            <div className="w-14 h-14 bg-[#FAFAF8] border border-[#ECEAE4] rounded-full flex items-center justify-center mx-auto mb-5">
              <Check className="text-[#555B3F]" size={24} strokeWidth={2.5} />
            </div>
            <h3 className="text-[20px] font-bold text-[#2C2C2C] mb-2">Pledge added successfully</h3>
            <p className="text-[14px] text-[#6F6F6F] mb-8">
              The new pledge has been created and synced with your workspace.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => router.push(`/customers/${customerId}/pledges/${newPledgeId}`)}
                className="w-full py-3 rounded-[12px] bg-[#555B3F] text-white text-[14px] font-bold hover:bg-[#4B5036] transition-colors"
              >
                Go to pledge detail
              </button>
              <button
                onClick={resetForm}
                className="w-full py-3 rounded-[12px] bg-white border border-[#555B3F] text-[#555B3F] text-[14px] font-bold hover:bg-[#FAFAF8] transition-colors"
              >
                Add another pledge
              </button>
            </div>
          </div>
        </div>
      )}

    </SubscriptionGuard>
  );
}