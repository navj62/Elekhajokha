"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Camera,
  MoreVertical,
  Plus,
  ChevronDown,
  Copy,
  Loader2,
  Check,
  Trash2,
  X,
} from "lucide-react";

import SubscriptionGuard from "@/components/SubscriptionGuard";
import Sheet from "@/components/ui/Sheet";

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
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

/**
 * A calendar date as YYYY-MM-DD in the LOCAL zone.
 *
 * Never use `toISOString().split("T")[0]` for this. That converts to UTC, so
 * east of Greenwich a local midnight lands on the previous day — in IST it
 * shifted every picked pledge date back by one, which feeds
 * calculateHybridInterest and can move an amount owed across a duration
 * boundary. `<input type="date">` emits this format directly.
 */
const toLocalISODate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * Guards a decimal text field. These inputs are `type="text"` so a scroll
 * wheel cannot silently mutate a weight read off a physical scale, which
 * means they must reject non-numeric keystrokes themselves. Returns null for
 * input that should not be accepted at all.
 */
const decimalOnly = (v: string): string | null =>
  v === "" || /^\d*\.?\d*$/.test(v) ? v : null;

/* ------------------------------------------------------------------ */
/* Item Type Select (grouped, API-driven)                             */
/* ------------------------------------------------------------------ */

type ItemTypeGroup = { defaults: string[]; custom: string[] };

function ItemTypeSelect({
  value,
  onChange,
  groups,
  invalid,
  describedBy,
}: {
  value: string;
  onChange: (v: string) => void;
  groups: ItemTypeGroup;
  invalid?: boolean;
  describedBy?: string;
}) {
  const [open, setOpen] = useState(false);

  const renderGroup = (label: string, items: string[]) =>
    items.length > 0 ? (
      <div key={label}>
        <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground-subtle">
          {label}
        </div>
        <Sheet.List>
          {items.map((opt) => (
            <Sheet.Item
              key={opt}
              label={opt}
              aria-pressed={opt === value}
              trailing={opt === value ? <Check size={16} /> : undefined}
              className={opt === value ? "bg-accent font-bold" : undefined}
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
            />
          ))}
        </Sheet.List>
      </div>
    ) : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        /* A button that opens a dialog — not a combobox: the listbox lives in
           a portal that exists only while open, so aria-controls could never
           point at anything. The invalid state reaches assistive tech through
           the error text referenced by aria-describedby. */
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-describedby={describedBy}
        className={`w-full min-h-11 flex items-center justify-between px-4 py-3 rounded-[12px] border bg-[var(--card-alt)] text-[14px] text-foreground outline-none transition-colors hover:border-primary focus-visible:border-primary ${
          invalid ? "border-destructive" : "border-border"
        }`}
      >
        <span className={value ? "" : "text-muted-foreground-subtle"}>{value || "Select type"}</span>
        <ChevronDown size={16} className="text-muted-foreground-subtle shrink-0" />
      </button>

      {/* Sheet, not a popover: the old menu paired an absolutely-positioned
          panel with a `fixed inset-0 z-40` click-catcher, which sat above a
          z-30 action bar. Sheet is the one modal primitive and is responsive
          in CSS (bottom sheet < lg, centred dialog at lg+), so there is no
          media query and no hydration mismatch. */}
      <Sheet open={open} onOpenChange={setOpen} title="Item type" size="sm">
        {renderGroup("Standard types", groups.defaults)}
        {renderGroup("Custom types", groups.custom)}
      </Sheet>
    </>
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
  const [pledgePhotoPreview, setPledgePhotoPreview] = useState<string | null>(null);
  const pledgePhotoInputRef = useRef<HTMLInputElement>(null);

  const handlePledgePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPledgePhotoPreview(URL.createObjectURL(file));
    }
  };

  const clearPledgePhoto = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setPledgePhotoPreview(null);
    if (pledgePhotoInputRef.current) pledgePhotoInputRef.current.value = "";
  };

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

  /* Which item's action sheet is open. One page-level Sheet keyed by id,
     rather than one mounted Sheet per item card. */
  const [menuItemId, setMenuItemId] = useState<string | null>(null);

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

    // Default date to today, in the shop's zone rather than UTC.
    setPledgeDate(toLocalISODate(new Date()));

    // Fetch item types
    fetch("/api/item-types")
      .then((r) => r.json())
      .then((data) => {
        setItemTypeGroups({
          defaults: (data.defaults ?? []).map((t: { label: string }) => t.label),
          custom: (data.custom ?? []).map((t: { label: string }) => t.label),
        });
      })
      .catch(() => { });
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

  const updateItem = <K extends keyof Item>(id: string, field: K, value: Item[K]) => {
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

  /* Bounds for the pledge date. A pledge cannot be taken in the future, and
     cannot predate the customer record it hangs off. NOTE: these are a UI
     affordance only — the create route validates presence and nothing else,
     so neither bound is enforced server-side. */
  const todayISO = toLocalISODate(new Date());
  const customerSinceISO = customer?.createdAt
    ? toLocalISODate(new Date(customer.createdAt))
    : undefined;

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
                    <h2 className="text-[24px] font-bold text-foreground leading-none">{customer.name}</h2>
                    <span className="bg-primary text-primary-foreground text-[9px] font-bold px-2 py-0.5 rounded-[12px] uppercase tracking-wider">
                      Active
                    </span>
                  </div>
                  {/* Rendered only when the date is real. The previous fallback
                      invented "2022" for any customer without a createdAt. */}
                  {customer.createdAt && (
                    <div className="text-[13px] font-medium text-muted-foreground-subtle flex items-center gap-2">
                      <span>Member since {new Date(customer.createdAt).getFullYear()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Risk Score was a hardcoded 0. The real score comes from
                  computeCustomerRiskScore, which this endpoint does not return,
                  and a create screen is not a risk surface — so it is gone
                  rather than faked. */}
              <div className="flex items-center gap-8 text-center">
                <div>
                  <p className="text-[10px] font-bold tracking-wider text-muted-foreground-subtle uppercase mb-1">Total Pledges</p>
                  <p className="text-[24px] font-bold text-foreground leading-none">{customer.totalPledges}</p>
                </div>
              </div>
            </div>
          )}

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
                    <label htmlFor="pledgeDate" className="block text-[12px] font-bold tracking-wide text-muted-foreground-subtle mb-2">Pledge Date</label>
                    {/* Native picker. Replaced a bespoke calendar that stored
                        every picked date a day early via toISOString, rendered
                        month/year controls with no handlers behind them, and
                        was the app's third date pattern. Native is already
                        what seven other screens use. */}
                    <input
                      id="pledgeDate"
                      type="date"
                      value={pledgeDate}
                      min={customerSinceISO}
                      max={todayISO}
                      onChange={(e) => setPledgeDate(e.target.value)}
                      className="w-full min-h-11 px-4 py-3 rounded-[12px] border border-border bg-[var(--card-alt)] text-[14px] text-foreground outline-none focus:border-primary transition-colors"
                    />
                  </div>

                  {/* Loan Amount */}
                  <div>
                    <label className="block text-[12px] font-bold tracking-wide text-[#6F6F6F] mb-2">Loan Amount (₹)</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      placeholder="e.g. 50000"
                      value={loanAmount}
                      onChange={(e) => setLoanAmount(e.target.value)}
                      className="w-full min-h-11 px-4 py-3 rounded-[12px] border border-border bg-[var(--card-alt)] text-[14px] text-foreground outline-none focus:border-primary transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>

                  {/* Interest Rate */}
                  <div>
                    <label className="block text-[12px] font-bold tracking-wide text-[#6F6F6F] mb-2">Interest Rate (% p.a.)</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="e.g. 12"
                      value={interestRate}
                      onChange={(e) => {
                        const v = decimalOnly(e.target.value);
                        if (v !== null) setInterestRate(v);
                      }}
                      className="w-full min-h-11 px-4 py-3 rounded-[12px] border border-border bg-[var(--card-alt)] text-[14px] text-foreground outline-none focus:border-primary transition-colors"
                    />
                  </div>

                  {/* Compounding Duration */}
                  <div>
                    <label className="block text-[12px] font-bold tracking-wide text-[#6F6F6F] mb-2">Compounding Duration</label>
                    <div className="flex items-center bg-[#FAFAF8] p-1 rounded-[12px] border border-[#ECEAE4]">
                      {(["Monthly", "Half-Yearly", "Yearly"] as const).map((opt) => (
                        <button
                          key={opt}
                          onClick={() => setCompounding(opt)}
                          className={`flex-1 min-h-11 py-3 text-[13px] font-bold rounded-[8px] transition-all ${compounding === opt
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

                    {/* Opens a Sheet. This was a hover-revealed menu
                        (`opacity-0 invisible group-hover:visible`), which on
                        touch left Duplicate and Delete with no reachable path
                        at all — an item entered by mistake could not be
                        removed on a phone. */}
                    <button
                      type="button"
                      onClick={() => setMenuItemId(item.id)}
                      aria-haspopup="dialog"
                      aria-label={`Actions for item ${index + 1}`}
                      className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground-subtle transition-colors hover:bg-[var(--card-alt)] hover:text-foreground"
                    >
                      <MoreVertical size={18} />
                    </button>
                  </div>

                  {/* Metal Type Segmented Control */}
                  <div className="mb-6">
                    <label className="block text-[12px] font-bold tracking-wide text-[#6F6F6F] mb-2">Metal Type</label>
                    <div className="flex items-center bg-[#EBE9E0] p-1 rounded-full max-w-[400px]">
                      {(["Gold", "Silver"] as const).map((metal) => (
                        <button
                          key={metal}
                          onClick={() => updateItem(item.id, "metalType", metal)}
                          className={`flex-1 min-h-11 py-3 text-[13px] font-bold rounded-full transition-all ${item.metalType === metal
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
                        inputMode="numeric"
                        placeholder="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, "quantity", e.target.value)}
                        className="w-full min-h-11 px-4 py-3 rounded-[12px] border border-border bg-[var(--card-alt)] text-[14px] text-foreground outline-none focus:border-primary transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[12px] font-bold tracking-wide text-[#6F6F6F] mb-2">Gross Weight (g)</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="e.g. 22.500"
                        value={item.grossWeight}
                        onChange={(e) => {
                          const v = decimalOnly(e.target.value);
                          if (v !== null) updateItem(item.id, "grossWeight", v);
                        }}
                        className="w-full min-h-11 px-4 py-3 rounded-[12px] border border-border bg-[var(--card-alt)] text-[14px] text-foreground outline-none focus:border-primary transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[12px] font-bold tracking-wide text-[#6F6F6F] mb-2">Net Weight (g)</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="e.g. 20.00"
                        value={item.netWeight}
                        onChange={(e) => {
                          const v = decimalOnly(e.target.value);
                          if (v !== null) updateItem(item.id, "netWeight", v);
                        }}
                        className="w-full min-h-11 px-4 py-3 rounded-[12px] border border-border bg-[var(--card-alt)] text-[14px] text-foreground outline-none focus:border-primary transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[12px] font-bold tracking-wide text-[#6F6F6F] mb-2">Purity (%)</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="e.g. 91.6"
                        value={item.purity}
                        onChange={(e) => {
                          const v = decimalOnly(e.target.value);
                          if (v !== null) updateItem(item.id, "purity", v);
                        }}
                        className="w-full min-h-11 px-4 py-3 rounded-[12px] border border-border bg-[var(--card-alt)] text-[14px] text-foreground outline-none focus:border-primary transition-colors"
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

                <div className="relative w-full h-[200px] bg-[#EBE9E0] rounded-[16px] flex flex-col items-center justify-center border border-[#D8D6CD] transition-colors hover:bg-[#E4E2D8] overflow-hidden group">
                  {pledgePhotoPreview ? (
                    <>
                      <img src={pledgePhotoPreview} alt="Pledge" className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none" />
                      <button
                        type="button"
                        onClick={clearPledgePhoto}
                        aria-label="Remove photo"
                        /* Always visible: this was opacity-0 until hover, so
                           on touch there was no way to clear a wrong photo. */
                        className="absolute top-1 right-1 z-20 inline-flex size-11 items-center justify-center bg-black/55 hover:bg-black/75 text-white rounded-full transition-colors cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-3 shadow-sm group-hover:scale-105 transition-transform z-0 pointer-events-none">
                        <Camera size={20} className="text-[#555B3F]" />
                      </div>
                      <p className="text-[13px] font-bold text-[#2C2C2C] mb-1 z-0 pointer-events-none">Upload or drag photo</p>
                      <p className="text-[11px] text-[#6F6F6F] z-0 pointer-events-none">JPG, PNG up to 5MB</p>
                    </>
                  )}
                  <input
                    type="file"
                    name="pledgePhoto"
                    accept="image/*"
                    ref={pledgePhotoInputRef}
                    onChange={handlePledgePhotoChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    title={pledgePhotoPreview ? "Change photo" : "Upload photo"}
                  />
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

      {/* Item actions — one Sheet for the whole list, keyed by item id. */}
      {(() => {
        const target = items.find((i) => i.id === menuItemId) ?? null;
        const onlyItem = items.length === 1;
        return (
          <Sheet
            open={menuItemId !== null}
            onOpenChange={(o) => !o && setMenuItemId(null)}
            title={target ? `Item ${items.indexOf(target) + 1}` : "Item"}
            description={target?.itemType || undefined}
            size="sm"
          >
            <Sheet.List>
              <Sheet.Item
                icon={<Copy size={16} />}
                label="Duplicate item"
                onClick={() => {
                  if (target) handleDuplicateItem(target);
                  setMenuItemId(null);
                }}
              />
              <Sheet.Item
                icon={<Trash2 size={16} />}
                label="Delete item"
                disabled={onlyItem}
                /* Disabled with the reason shown, rather than a row that
                   silently does nothing on the last remaining item. */
                trailing={onlyItem ? "Only item" : undefined}
                className="text-destructive"
                onClick={() => {
                  if (target) handleRemoveItem(target.id);
                  setMenuItemId(null);
                }}
              />
            </Sheet.List>
          </Sheet>
        );
      })()}

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