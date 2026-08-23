"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  AlertCircle,
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
import StickyActions from "@/components/ui/StickyActions";
import { PLEDGE_FORM_REQUIRED_KEYS } from "@/lib/pledgeFormKeys";

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
          invalid ? "border-risk-critical" : "border-border"
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
/* Inline field errors                                                */
/* ------------------------------------------------------------------ */

/** Error message under a field. `id` is what the input points aria-describedby at. */
function FieldError({ id, children }: { id: string; children?: string }) {
  if (!children) return null;
  return (
    /* risk-critical, not destructive: --destructive is a fill colour and
       measures 2.99:1 as text on --card, which fails. The risk-critical
       foreground is 8.31:1 light / 7.92:1 dark. */
    <p id={id} role="alert" className="mt-1.5 flex items-start gap-1.5 text-[12px] font-medium text-risk-critical-foreground">
      <AlertCircle size={13} className="mt-px shrink-0" />
      {children}
    </p>
  );
}

/** DOM id for a field, so a failed submit can scroll to and focus the first one. */
const fieldId = (key: string) => `f-${key.replace(/:/g, "-")}`;

/** Input classes, with the invalid state carried by the border as well as the message. */
const inputCls = (bad?: boolean, extra = "") =>
  `w-full min-h-11 px-4 py-3 rounded-[12px] border bg-[var(--card-alt)] text-[14px] text-foreground outline-none transition-colors ${
    bad ? "border-risk-critical focus:border-risk-critical" : "border-border focus:border-primary"
  }${extra}`;

/**
 * Client-side mirror of the create route's item validation
 * (app/api/customers/[customerId]/pledges/route.ts). Kept deliberately in
 * lockstep with it: the point is that the server round-trip stops happening,
 * not that the client is lenient. If a rule changes there, change it here.
 */
function validateForm(input: {
  pledgeDate: string;
  loanAmount: string;
  interestRate: string;
  items: Item[];
}): Record<string, string> {
  const e: Record<string, string> = {};

  if (!input.pledgeDate) e.pledgeDate = "Pick the date this pledge was taken.";

  const loan = Number(input.loanAmount);
  if (!input.loanAmount) e.loanAmount = "Enter the loan amount.";
  else if (!isFinite(loan) || loan <= 0) e.loanAmount = "Loan amount must be greater than 0.";

  const rate = Number(input.interestRate);
  if (!input.interestRate) e.interestRate = "Enter the interest rate.";
  else if (!isFinite(rate) || rate <= 0) e.interestRate = "Interest rate must be greater than 0.";

  const LABEL: Record<string, string> = {
    grossWeight: "Gross weight",
    netWeight: "Net weight",
    purity: "Purity",
  };

  input.items.forEach((item) => {
    (["grossWeight", "netWeight", "purity"] as const).forEach((f) => {
      const key = `item:${item.id}:${f}`;
      const raw = item[f];
      const v = Number(raw);
      if (raw === "" || isNaN(v) || !isFinite(v)) e[key] = `${LABEL[f]} is required.`;
      else if (v <= 0) e[key] = `${LABEL[f]} must be greater than 0.`;
      else if (f === "purity" && v > 100) e[key] = "Purity cannot exceed 100%.";
      else if (f !== "purity" && v > 100000) e[key] = `${LABEL[f]} cannot exceed 100000 g.`;
    });

    // Only meaningful once both weights are individually valid.
    const g = Number(item.grossWeight);
    const n = Number(item.netWeight);
    const key = `item:${item.id}:netWeight`;
    if (!e[key] && !e[`item:${item.id}:grossWeight`] && n > g)
      e[key] = "Net weight cannot exceed gross weight.";
  });

  return e;
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

  /* Inline field errors, keyed by field or `item:<id>:<field>`. */
  const [errors, setErrors] = useState<Record<string, string>>({});
  /* Anything the server rejects that the client rules did not catch. Should
     stay empty in practice — the two rule sets mirror each other. */
  const [formError, setFormError] = useState<string | null>(null);

  /** Clears one field's error as soon as the owner edits it. */
  const clearError = (key: string) =>
    setErrors((prev) => (prev[key] ? { ...prev, [key]: "" } : prev));

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

    /* Validation lives in validateForm() so this function stays a submit
       path. On failure, move to the first bad field — on a phone it is
       usually off-screen, and without this a tap on Save looks like
       nothing happened. */
    const found = validateForm({ pledgeDate, loanAmount, interestRate, items });
    setErrors(found);
    setFormError(null);
    const firstKey = Object.keys(found)[0];
    if (firstKey) {
      const el = document.getElementById(fieldId(firstKey));
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      (el as HTMLElement | null)?.focus({ preventScroll: true });
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
      /* The photo was picked, previewed and then dropped: this FormData is
         built by hand, so the file input's own name never applied and the
         file was never sent. Every pledge saved from this screen had a null
         itemPhoto. "itemPhoto" is the key the create route reads and the
         column it writes. */
      const photoFile = pledgePhotoInputRef.current?.files?.[0];
      if (photoFile) formData.append("itemPhoto", photoFile);

      // Drift guard: catches a future append that gets dropped (the exact
      // class of bug that lost every pledge photo) before it reaches the
      // network. See PLEDGE_FORM_REQUIRED_KEYS for the contract with the route.
      if (process.env.NODE_ENV !== "production") {
        const missing = PLEDGE_FORM_REQUIRED_KEYS.filter((key) => !formData.has(key));
        if (missing.length) {
          throw new Error(`[pledge-add] FormData missing required key(s): ${missing.join(", ")}`);
        }
      }

      const res = await fetch(`/api/customers/${customerId}/pledges`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data?.details?.join(" ") || data?.error || "Failed to save pledge.");
        return;
      }

      setNewPledgeId(data.id);
      setShowSuccessModal(true);
    } catch (err) {
      console.error("PLEDGE SAVE ERROR:", err);
      setFormError("Could not save the pledge. Check your connection and try again.");
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
      <div className="font-sans">
        <div className="max-w-[1200px] mx-auto pt-4">

          {/* Header Summary Card */}
          {customer && (
            <div className="bg-card rounded-[24px] p-6 lg:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 border border-border mb-6 relative border-l-4 border-l-primary transition-all">

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
              <div className="bg-card rounded-[24px] p-6 lg:p-8 border border-border relative border-l-4 border-l-primary transition-all">

                <h3 className="text-[18px] font-bold text-foreground mb-6">Loan Details</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Pledge Date */}
                  <div>
                    <label htmlFor={fieldId("pledgeDate")} className="block text-[12px] font-bold tracking-wide text-muted-foreground-subtle mb-2">Pledge Date</label>
                    {/* Native picker. Replaced a bespoke calendar that stored
                        every picked date a day early via toISOString, rendered
                        month/year controls with no handlers behind them, and
                        was the app's third date pattern. Native is already
                        what seven other screens use. */}
                    <input
                      id={fieldId("pledgeDate")}
                      type="date"
                      value={pledgeDate}
                      min={customerSinceISO}
                      max={todayISO}
                      aria-invalid={!!errors.pledgeDate}
                      aria-describedby={errors.pledgeDate ? `${fieldId("pledgeDate")}-err` : undefined}
                      onChange={(e) => {
                        setPledgeDate(e.target.value);
                        clearError("pledgeDate");
                      }}
                      className={inputCls(!!errors.pledgeDate)}
                    />
                    <FieldError id={`${fieldId("pledgeDate")}-err`}>{errors.pledgeDate}</FieldError>
                  </div>

                  {/* Loan Amount */}
                  <div>
                    <label htmlFor={fieldId("loanAmount")} className="block text-[12px] font-bold tracking-wide text-muted-foreground-subtle mb-2">Loan Amount (₹)</label>
                    <input
                      id={fieldId("loanAmount")}
                      type="number"
                      inputMode="numeric"
                      placeholder="e.g. 50000"
                      value={loanAmount}
                      aria-invalid={!!errors.loanAmount}
                      aria-describedby={errors.loanAmount ? `${fieldId("loanAmount")}-err` : undefined}
                      onChange={(e) => {
                        setLoanAmount(e.target.value);
                        clearError("loanAmount");
                      }}
                      className={inputCls(!!errors.loanAmount, " [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none")}
                    />
                    <FieldError id={`${fieldId("loanAmount")}-err`}>{errors.loanAmount}</FieldError>
                  </div>

                  {/* Interest Rate */}
                  <div>
                    <label htmlFor={fieldId("interestRate")} className="block text-[12px] font-bold tracking-wide text-muted-foreground-subtle mb-2">Interest Rate (% p.a.)</label>
                    <input
                      id={fieldId("interestRate")}
                      type="text"
                      inputMode="decimal"
                      placeholder="e.g. 12"
                      value={interestRate}
                      aria-invalid={!!errors.interestRate}
                      aria-describedby={errors.interestRate ? `${fieldId("interestRate")}-err` : undefined}
                      onChange={(e) => {
                        const v = decimalOnly(e.target.value);
                        if (v !== null) {
                          setInterestRate(v);
                          clearError("interestRate");
                        }
                      }}
                      className={inputCls(!!errors.interestRate)}
                    />
                    <FieldError id={`${fieldId("interestRate")}-err`}>{errors.interestRate}</FieldError>
                  </div>

                  {/* Compounding Duration */}
                  <div>
                    <label className="block text-[12px] font-bold tracking-wide text-muted-foreground-subtle mb-2">Compounding Duration</label>
                    <div className="flex items-center bg-card-alt p-1 rounded-[12px] border border-border">
                      {(["Monthly", "Half-Yearly", "Yearly"] as const).map((opt) => (
                        <button
                          key={opt}
                          onClick={() => setCompounding(opt)}
                          className={`flex-1 min-h-11 py-3 text-[13px] font-bold rounded-[8px] transition-all ${compounding === opt
                            ? "bg-primary shadow-sm text-primary-foreground border border-border"
                            : "text-muted-foreground-subtle hover:text-foreground border border-transparent"
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
                <div key={item.id} className="bg-card rounded-[24px] p-6 lg:p-8 border border-border relative border-l-4 border-l-primary transition-all">

                  {/* Item Header */}
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-[18px] font-bold text-foreground">Item {index + 1}</h3>

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
                    <label className="block text-[12px] font-bold tracking-wide text-muted-foreground-subtle mb-2">Metal Type</label>
                    <div className="flex items-center bg-muted p-1 rounded-full max-w-[400px]">
                      {(["Gold", "Silver"] as const).map((metal) => (
                        <button
                          key={metal}
                          onClick={() => updateItem(item.id, "metalType", metal)}
                          className={`flex-1 min-h-11 py-3 text-[13px] font-bold rounded-full transition-all ${item.metalType === metal
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground-subtle hover:text-foreground"
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
                      <label className="block text-[12px] font-bold tracking-wide text-muted-foreground-subtle mb-2">Item Type</label>
                      <ItemTypeSelect
                        value={item.itemType}
                        onChange={(v) => updateItem(item.id, "itemType", v)}
                        groups={itemTypeGroups}
                      />
                    </div>
                    <div>
                      <label className="block text-[12px] font-bold tracking-wide text-muted-foreground-subtle mb-2">
                        Item Name <span className="font-normal text-muted-foreground-subtle">(optional)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Gold Necklace"
                        value={item.itemName}
                        onChange={(e) => updateItem(item.id, "itemName", e.target.value)}
                        className="w-full px-4 py-3 rounded-[12px] border border-border bg-card-alt text-[14px] text-foreground outline-none focus:border-primary transition-colors"
                      />
                    </div>
                  </div>

                  {/* Item Details Row 2 */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-6">
                    <div>
                      <label className="block text-[12px] font-bold tracking-wide text-muted-foreground-subtle mb-2">Quantity (pcs)</label>
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
                      <label htmlFor={fieldId(`item:${item.id}:grossWeight`)} className="block text-[12px] font-bold tracking-wide text-muted-foreground-subtle mb-2">Gross Weight (g)</label>
                      <input
                        id={fieldId(`item:${item.id}:grossWeight`)}
                        type="text"
                        inputMode="decimal"
                        placeholder="e.g. 22.500"
                        value={item.grossWeight}
                        aria-invalid={!!errors[`item:${item.id}:grossWeight`]}
                        aria-describedby={
                          errors[`item:${item.id}:grossWeight`]
                            ? `${fieldId(`item:${item.id}:grossWeight`)}-err`
                            : undefined
                        }
                        onChange={(e) => {
                          const v = decimalOnly(e.target.value);
                          if (v !== null) {
                            updateItem(item.id, "grossWeight", v);
                            clearError(`item:${item.id}:grossWeight`);
                          }
                        }}
                        className={inputCls(!!errors[`item:${item.id}:grossWeight`])}
                      />
                      <FieldError id={`${fieldId(`item:${item.id}:grossWeight`)}-err`}>
                        {errors[`item:${item.id}:grossWeight`]}
                      </FieldError>
                    </div>
                    <div>
                      <label htmlFor={fieldId(`item:${item.id}:netWeight`)} className="block text-[12px] font-bold tracking-wide text-muted-foreground-subtle mb-2">Net Weight (g)</label>
                      <input
                        id={fieldId(`item:${item.id}:netWeight`)}
                        type="text"
                        inputMode="decimal"
                        placeholder="e.g. 20.00"
                        value={item.netWeight}
                        aria-invalid={!!errors[`item:${item.id}:netWeight`]}
                        aria-describedby={
                          errors[`item:${item.id}:netWeight`]
                            ? `${fieldId(`item:${item.id}:netWeight`)}-err`
                            : undefined
                        }
                        onChange={(e) => {
                          const v = decimalOnly(e.target.value);
                          if (v !== null) {
                            updateItem(item.id, "netWeight", v);
                            clearError(`item:${item.id}:netWeight`);
                          }
                        }}
                        className={inputCls(!!errors[`item:${item.id}:netWeight`])}
                      />
                      <FieldError id={`${fieldId(`item:${item.id}:netWeight`)}-err`}>
                        {errors[`item:${item.id}:netWeight`]}
                      </FieldError>
                    </div>
                    <div>
                      <label htmlFor={fieldId(`item:${item.id}:purity`)} className="block text-[12px] font-bold tracking-wide text-muted-foreground-subtle mb-2">Purity (%)</label>
                      <input
                        id={fieldId(`item:${item.id}:purity`)}
                        type="text"
                        inputMode="decimal"
                        placeholder="e.g. 91.6"
                        value={item.purity}
                        aria-invalid={!!errors[`item:${item.id}:purity`]}
                        aria-describedby={
                          errors[`item:${item.id}:purity`]
                            ? `${fieldId(`item:${item.id}:purity`)}-err`
                            : undefined
                        }
                        onChange={(e) => {
                          const v = decimalOnly(e.target.value);
                          if (v !== null) {
                            updateItem(item.id, "purity", v);
                            clearError(`item:${item.id}:purity`);
                          }
                        }}
                        className={inputCls(!!errors[`item:${item.id}:purity`])}
                      />
                      <FieldError id={`${fieldId(`item:${item.id}:purity`)}-err`}>
                        {errors[`item:${item.id}:purity`]}
                      </FieldError>
                    </div>
                  </div>

                  {/* Net Metal Weight Summary */}
                  <div className="bg-card-alt rounded-[12px] px-6 py-4 flex items-center justify-between border border-border">
                    <span className="text-[13px] font-bold text-muted-foreground-subtle">Net Metal Weight</span>
                    <span className="text-[16px] font-bold text-foreground">
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
                  className="flex items-center gap-2 px-6 py-3 rounded-full text-[13px] font-bold transition-all bg-card text-foreground border border-border hover:bg-card-alt hover:border-border"
                >
                  <Plus size={16} /> Add Another Item
                </button>
              </div>

            </div>

            {/* ── RIGHT COLUMN (30%) ─────────────────────────────── */}
            <div className="flex flex-col gap-6">

              {/* Pledge Photo Section */}
              <div className="bg-card rounded-[24px] p-6 lg:p-8 border border-border">
                <h3 className="text-[18px] font-bold text-foreground mb-6">Pledge Photo</h3>

                <div className="relative w-full h-[200px] bg-muted rounded-[16px] flex flex-col items-center justify-center border border-border transition-colors hover:bg-accent overflow-hidden group">
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
                      <div className="w-12 h-12 bg-card rounded-full flex items-center justify-center mb-3 shadow-sm group-hover:scale-105 transition-transform z-0 pointer-events-none">
                        <Camera size={20} className="text-primary" />
                      </div>
                      <p className="text-[13px] font-bold text-foreground mb-1 z-0 pointer-events-none">Upload or drag photo</p>
                      <p className="text-[11px] text-muted-foreground-subtle z-0 pointer-events-none">JPG, PNG up to 5MB</p>
                    </>
                  )}
                  <input
                    type="file"
                    name="itemPhoto"
                    accept="image/*"
                    ref={pledgePhotoInputRef}
                    onChange={handlePledgePhotoChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    title={pledgePhotoPreview ? "Change photo" : "Upload photo"}
                  />
                </div>
              </div>

              {/* Remarks Section */}
              <div className="bg-card rounded-[24px] p-6 lg:p-8 border border-border">
                <h3 className="text-[18px] font-bold text-foreground mb-6">Remarks</h3>

                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Add any notes about condition, special instructions, or valuer comments..."
                  className="w-full h-[180px] px-4 py-4 rounded-[16px] border border-border bg-muted text-[14px] text-foreground outline-none focus:border-primary transition-colors resize-none placeholder:text-muted-foreground-subtle"
                />
              </div>

            </div>
          </div>
        </div>

        {formError && (
          <div
            role="alert"
            className="mt-6 flex items-start gap-2.5 rounded-[16px] border border-risk-critical/40 bg-risk-critical-surface p-4 text-[13px] text-risk-critical-foreground"
          >
            <AlertCircle size={18} className="mt-px shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {/* Sticky action bar. Was `fixed bottom-0 z-40`, which the mobile
            bottom nav (also z-40, rendered later) painted over: at 380px a
            tap on Save Pledge landed on the nav's More button. StickyActions
            owns the offset and the z-30 band, and reserves its own space in
            flow — which is why the wrapper no longer carries pb-32. */}
        <StickyActions
          leading={
            /* Hidden on the narrowest screens: at 380px the actions need
               the width, and this wrapped to five lines. The item count is
               already visible in the form itself. */
            <div className="hidden sm:flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0"></span>
              <div className="flex flex-col">
                <span className="text-[13px] font-bold text-foreground leading-tight mb-0.5">Unsaved Changes</span>
                <span className="text-[11px] font-medium text-muted-foreground-subtle">
                  {items.length} Item{items.length !== 1 ? "s" : ""} &bull; Ready to Save
                </span>
              </div>
            </div>
          }
        >
          <button
            onClick={() => router.back()}
            disabled={saving}
            className="min-h-11 px-6 rounded-full text-[13px] font-bold bg-secondary text-secondary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex min-h-11 items-center justify-center gap-2 px-6 rounded-full text-[13px] font-bold bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 min-w-[150px]"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : "Save Pledge"}
          </button>
        </StickyActions>

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
                className="text-risk-critical-foreground"
                onClick={() => {
                  if (target) handleRemoveItem(target.id);
                  setMenuItemId(null);
                }}
              />
            </Sheet.List>
          </Sheet>
        );
      })()}

      {/* Success — Sheet, not a hand-rolled fixed inset-0 dialog. */}
      <Sheet
        open={showSuccessModal}
        onOpenChange={(o) => !o && setShowSuccessModal(false)}
        title="Pledge added"
        description="The pledge has been saved against this customer."
        size="sm"
      >
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-[var(--card-alt)] border border-border">
            <Check className="text-primary" size={24} strokeWidth={2.5} />
          </div>
          <div className="flex w-full flex-col gap-3">
            <button
              onClick={() => router.push(`/customers/${customerId}/pledges/${newPledgeId}`)}
              className="w-full min-h-11 rounded-[12px] bg-primary text-primary-foreground text-[14px] font-bold hover:opacity-90 transition-opacity"
            >
              Go to pledge detail
            </button>
            <button
              onClick={resetForm}
              className="w-full min-h-11 rounded-[12px] bg-card border border-primary text-primary text-[14px] font-bold hover:bg-accent transition-colors"
            >
              Add another pledge
            </button>
          </div>
        </div>
      </Sheet>

    </SubscriptionGuard>
  );
}