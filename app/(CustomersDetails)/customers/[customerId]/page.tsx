"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import SubscriptionGuard from "@/components/SubscriptionGuard";
import {
  Edit3, Plus, MapPin, Phone,
  CheckCircle2, Eye, Unlock, Loader2, CheckSquare, Search, X, Trash, MoreHorizontal,
  Copy, QrCode, AlertCircle,
} from "lucide-react";

import { QRCodeCanvas } from "qrcode.react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import Sheet from "@/components/ui/Sheet";
import StickyActions from "@/components/ui/StickyActions";
import DataTable, { StatusBadge, type BadgeTone, type DataTableColumn } from "@/components/ui/DataTable";
import { isOpenPledgeStatus } from "@/lib/pledgeConstants";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
type Pledge = {
  id: string;
  status: "ACTIVE" | "RELEASED" | "OVERDUE" | "SOLD";
  pledgeDate: string;
  loanAmount: string;
  releaseDate: string | null;
  netWeightOfGold: number;
  netWeightOfSilver: number;
  itemLabel: string | null;
  itemCount: number;
};

type CustomerDetail = {
  id: string;
  name: string;
  address: string;
  region: string;
  mobile: string | null;
  aadharNo: string | null;
  remark: string | null;
  customerImg: string | null;
  idProofImg: string | null;
  createdAt?: string;
  pledges: Pledge[];
  viewToken: string;
  isPortalBlocked: boolean;
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */
function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function fmt(amount: string | number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 2,
  }).format(Number(amount));
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase();
}

/* ~2,101 customers were bulk-imported on this day with createdAt defaulted
   to the import moment, so for them "Registered" would show the import date,
   not when they became a customer. The true date was never captured. The
   line is hidden for that day rather than shown wrong. Side effect: a
   customer genuinely added by hand on 2026-07-26 also loses the line. */
const LEDGER_IMPORT_DAY_IST = "2026-07-26";

function isLedgerImportDay(value: string) {
  const d = new Date(value);
  if (isNaN(d.getTime())) return false;
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }) === LEDGER_IMPORT_DAY_IST;
}

const STATUS_TONE: Record<Pledge["status"], BadgeTone> = {
  ACTIVE: "active",
  OVERDUE: "overdue",
  RELEASED: "released",
  SOLD: "sold",
};

const STATUS_LABEL: Record<Pledge["status"], string> = {
  ACTIVE: "Active",
  OVERDUE: "Overdue",
  RELEASED: "Released",
  SOLD: "Sold to Shop",
};

type ProfileField = {
  label: string;
  key: "name" | "mobile" | "address" | "region" | "aadharNo";
  placeholder: string;
  type?: "text" | "tel";
  inputMode?: "text" | "tel" | "numeric";
  autoComplete?: string;
};

/* inputMode picks the phone keypad / number pad on mobile. Aadhaar stays
   type="text" so the spaces in "XXXX XXXX XXXX" survive. */
const PROFILE_FIELDS: ProfileField[] = [
  { label: "Full Name", key: "name", placeholder: "Customer name", autoComplete: "name" },
  { label: "Mobile Number", key: "mobile", placeholder: "+91 XXXXX XXXXX", type: "tel", inputMode: "tel", autoComplete: "tel" },
  { label: "Address", key: "address", placeholder: "Street, City", autoComplete: "street-address" },
  { label: "Region", key: "region", placeholder: "State / District", autoComplete: "address-level2" },
  { label: "Aadhaar Number", key: "aadharNo", placeholder: "XXXX XXXX XXXX", inputMode: "numeric", autoComplete: "off" },
];

/** One-line name for a pledge, used where the row itself is out of view. */
function pledgeTitle(p: Pledge) {
  return `${p.itemLabel || "Pledge"} · ${formatDate(p.pledgeDate)}`;
}

/* Server error codes from the pledge DELETE route, in words. RELEASED and
   SOLD pledges never offer Delete, so these are the residual cases. */
const DELETE_ERROR_TEXT: Record<string, string> = {
  AUDIT_RECORDS_EXIST: "This pledge has a release or sale record, so it can't be deleted.",
};

function deleteErrorText(code: unknown) {
  return (typeof code === "string" && DELETE_ERROR_TEXT[code]) || "Couldn't delete this pledge. Please try again.";
}

/* ================================================================== */
/*  Page                                                                */
/* ================================================================== */
export default function CustomerDetailPage() {
  const params = useParams<{ customerId: string }>();
  const router = useRouter();
  const customerId = params?.customerId;

  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; kind: "success" | "error" } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editingRemark, setEditingRemark] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", mobile: "", address: "", region: "", aadharNo: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showReleased, setShowReleased] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [metalFilter, setMetalFilter] = useState<"ALL" | "GOLD" | "SILVER">("ALL");
  const [sortBy, setSortBy] = useState("date_desc");
  /* Which pledge's row action sheet is open. One page-level Sheet keyed by
     pledge, rather than one mounted Sheet per card. */
  const [rowMenu, setRowMenu] = useState<Pledge | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; step: "INITIAL" | "PAYMENT_WARNING"; count?: number } | null>(null);
  const toastRef = useRef<NodeJS.Timeout | null>(null);

  /* ---- Client-side search / filter / sort (no API calls) ------ */
  const displayedPledges = useMemo(() => {
    let result = customer?.pledges ?? [];

    // 1. Show-released toggle (default OFF → active + overdue; ON → all)
    if (!showReleased) {
      result = result.filter((p) => isOpenPledgeStatus(p.status));
    }

    // 2. Search — asset label + formatted pledge date (case-insensitive)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          (p.itemLabel?.toLowerCase().includes(q) ?? false) ||
          formatDate(p.pledgeDate).toLowerCase().includes(q)
      );
    }

    // 3. Metal filter — uses the denormalized per-pledge metal weights.
    //    A mixed pledge (both gold AND silver) matches BOTH pills.
    if (metalFilter !== "ALL") {
      result = result.filter((p) =>
        metalFilter === "GOLD" ? p.netWeightOfGold > 0 : p.netWeightOfSilver > 0
      );
    }

    // 4. Sort (new array — never mutate state)
    const sorted = [...result];
    sorted.sort((a, b) => {
      switch (sortBy) {
        case "date_asc":
          return new Date(a.pledgeDate).getTime() - new Date(b.pledgeDate).getTime();
        case "loan_desc":
          return Number(b.loanAmount) - Number(a.loanAmount);
        case "loan_asc":
          return Number(a.loanAmount) - Number(b.loanAmount);
        case "date_desc":
        default:
          return new Date(b.pledgeDate).getTime() - new Date(a.pledgeDate).getTime();
      }
    });
    return sorted;
  }, [customer?.pledges, showReleased, searchQuery, metalFilter, sortBy]);

  const filtersActive =
    searchQuery.trim() !== "" || metalFilter !== "ALL" || !showReleased;

  function clearFilters() {
    setSearchQuery("");
    setMetalFilter("ALL");
    setSortBy("date_desc");
    // Note: intentionally does NOT touch showReleased.
  }

  function showToast(msg: string, kind: "success" | "error" = "success") {
    setToast({ msg, kind });
    if (toastRef.current) clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(null), 4000);
  }

  /* ---- Load ---------------------------------------------------- */
  useEffect(() => {
    if (!customerId) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/customers/${customerId}`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Unable to load customer.");
        setCustomer(data.customer);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unexpected error";
        setError(msg);
        showToast(msg, "error");
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => { if (toastRef.current) clearTimeout(toastRef.current); };
  }, [customerId]);

  /* ---- Delete pledge ------------------------------------------ */
  async function executeDelete(pledgeId: string, forceDelete = false) {
    if (!customer) return;
    setDeletingId(pledgeId);
    setDeleteConfirm(null);
    try {
      const url =
        `/api/customers/${customerId}/pledges/${pledgeId}` +
        (forceDelete ? "?confirmDelete=true" : "");
      const res = await fetch(url, { method: "DELETE" });
      const data = await res.json();

      // Server guards against erasing part-payment history
      if (res.status === 409 && data?.error === "PENDING_TRANSACTIONS") {
        const n = data.transactionCount ?? 0;
        setDeleteConfirm({ id: pledgeId, step: "PAYMENT_WARNING", count: n });
        return;
      }

      if (!res.ok) throw new Error(deleteErrorText(data?.error));
      setCustomer({
        ...customer,
        pledges: customer.pledges.filter((p) => p.id !== pledgeId),
      });
      showToast("Pledge deleted.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Unexpected error", "error");
    } finally {
      setDeletingId(null);
    }
  }

  /* ---- Save Notes --------------------------------------------- */
  async function handleSaveNotes() {
    if (!customer) return;
    setSavingNotes(true);
    try {
      const res = await fetch(`/api/customers/${customerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remark: editingRemark }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Unable to save notes.");
      setCustomer({ ...customer, remark: editingRemark });
      setIsEditingNotes(false);
      showToast("Notes updated.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Unexpected error", "error");
    } finally {
      setSavingNotes(false);
    }
  }

  /* ---- Save Profile ------------------------------------------- */
  async function handleSaveProfile() {
    if (!customer) return;
    setSavingProfile(true);
    try {
      const res = await fetch(`/api/customers/${customerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Unable to save profile.");
      setCustomer({ ...customer, ...editForm });
      setShowEditModal(false);
      showToast("Profile updated.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Unexpected error", "error");
    } finally {
      setSavingProfile(false);
    }
  }

  if (!customerId) {
    return (
      <SubscriptionGuard featureName="Customer Details">
        <div className="max-w-[1100px] mx-auto pt-6 pb-24 px-6">
          <p className="text-[14px] text-muted-foreground-subtle">Customer ID not provided.</p>
        </div>
      </SubscriptionGuard>
    );
  }

  /* ---- Financial summary calculations ------------------------- */
  const totalLoan = customer?.pledges.reduce((s, p) => s + Number(p.loanAmount), 0) ?? 0;
  const repaid = customer?.pledges.filter((p) => p.status === "RELEASED").reduce((s, p) => s + Number(p.loanAmount), 0) ?? 0;
  const outstanding = totalLoan - repaid;
  const progressValue = totalLoan > 0 ? (repaid / totalLoan) * 100 : 0;

  /* ---- Bulk selection (ACTIVE or OVERDUE pledges) ------------- */
  const activePledges = customer?.pledges.filter((p) => isOpenPledgeStatus(p.status)) ?? [];

  function toggleOne(id: string, next: boolean) {
    setSelectedIds((prev) => {
      const set = new Set(prev);
      if (next) set.add(id);
      else set.delete(id);
      return set;
    });
  }

  /* Select-all acts on the open pledges currently on screen, so a search or
     metal filter can never leave pledges selected that the owner cannot see. */
  function toggleAllShown(next: boolean) {
    const shown = displayedPledges.filter((p) => isOpenPledgeStatus(p.status)).map((p) => p.id);
    setSelectedIds((prev) => {
      const set = new Set(prev);
      for (const id of shown) {
        if (next) set.add(id);
        else set.delete(id);
      }
      return set;
    });
  }

  const pledgeColumns: DataTableColumn<Pledge>[] = [
    {
      key: "item",
      header: "Item",
      role: "identity",
      cell: (p) => (
        <>
          <span className="font-bold text-foreground">{p.itemLabel || "—"}</span>
          {p.itemCount > 1 && (
            <span className="block text-[11px] font-medium text-muted-foreground-subtle mt-0.5">
              +{p.itemCount - 1} more item{p.itemCount > 2 ? "s" : ""}
            </span>
          )}
        </>
      ),
    },
    {
      key: "loan",
      header: "Loan Amount",
      role: "primary",
      cell: (p) => <span className="font-bold tabular-nums">{fmt(p.loanAmount)}</span>,
    },
    {
      key: "status",
      header: "Status",
      role: "trailing",
      cell: (p) => <StatusBadge tone={STATUS_TONE[p.status]}>{STATUS_LABEL[p.status]}</StatusBadge>,
    },
    {
      key: "pledgeDate",
      header: "Pledge Date",
      cell: (p) => <span className="font-bold">{formatDate(p.pledgeDate)}</span>,
    },
    {
      key: "releaseDate",
      header: "Release Date",
      cell: (p) => <span className="font-semibold text-muted-foreground">{formatDate(p.releaseDate)}</span>,
    },
  ];

  /* Rule B (destructive row actions): Delete never sits on the card face.
     Mobile shows the one forward action, Release, plus "More", which opens
     a sheet holding Delete. Desktop keeps the icon pair it always had.
     Closed pledges offer neither; the card foot still needs one labelled
     button (DataTable always renders the strip), so it is "View details". */
  function renderPledgeActions(p: Pledge) {
    const detailHref = `/customers/${customerId}/pledges/${p.id}`;
    if (!isOpenPledgeStatus(p.status)) {
      return (
        <Link
          href={detailHref}
          className="lg:hidden inline-flex items-center justify-center gap-2 rounded-full border border-border text-[13px] font-bold text-foreground hover:bg-accent transition-colors"
        >
          <Eye size={15} /> View details
        </Link>
      );
    }
    const deleting = deletingId === p.id;
    return (
      <>
        <Link
          href={`/customers/${customerId}/pledges/${p.id}/release`}
          className="lg:hidden inline-flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground text-[13px] font-bold hover:opacity-90 transition-opacity"
        >
          <Unlock size={15} /> Release
        </Link>
        <button
          type="button"
          onClick={() => setRowMenu(p)}
          disabled={deleting}
          aria-label={`More actions for ${pledgeTitle(p)}`}
          className="lg:hidden inline-flex items-center justify-center gap-2 rounded-full border border-border text-[13px] font-bold text-foreground hover:bg-accent transition-colors disabled:opacity-50"
        >
          {deleting ? <Loader2 size={15} className="animate-spin" /> : <MoreHorizontal size={15} />} More
        </button>

        <Link
          href={`/customers/${customerId}/pledges/${p.id}/release`}
          title="Release this pledge"
          aria-label={`Release ${pledgeTitle(p)}`}
          className="hidden lg:inline-flex p-2 rounded-full text-muted-foreground-subtle hover:bg-accent hover:text-primary transition-colors"
        >
          <Unlock size={15} />
        </Link>
        <button
          type="button"
          disabled={deleting}
          onClick={() => setDeleteConfirm({ id: p.id, step: "INITIAL" })}
          title="Delete pledge"
          aria-label={`Delete ${pledgeTitle(p)}`}
          className="hidden lg:inline-flex p-2 rounded-full text-muted-foreground-subtle hover:bg-accent hover:text-risk-critical-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {deleting ? <Loader2 size={15} className="animate-spin text-risk-critical-foreground" /> : <Trash size={15} />}
        </button>
      </>
    );
  }

  const confirmPledge = deleteConfirm
    ? customer?.pledges.find((p) => p.id === deleteConfirm.id) ?? null
    : null;

  function releaseSelected() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    router.push(`/customers/${customerId}/release-bulk?ids=${ids.join(",")}`);
  }

  /* ---- Customer portal ---------------------------------------- */
  const portalUrl = customer ? `${process.env.NEXT_PUBLIC_BASE_URL}/view/${customer.viewToken}` : "";

  async function copyPortalLink() {
    try {
      await navigator.clipboard.writeText(portalUrl);
      showToast("Portal link copied.");
    } catch {
      // Clipboard can be refused (permissions, insecure context). The QR
      // sheet prints the URL, so there is always a manual fallback.
      showToast("Couldn't copy. Open Show QR to see the link.", "error");
    }
  }

  async function toggleCustomerPortal() {
    if (!customer) return;
    try {
      const res = await fetch(`/api/customers/${customer.id}/toggle-portal`, { method: "PATCH" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setCustomer((prev) =>
        prev ? { ...prev, isPortalBlocked: data.isPortalBlocked } : prev
      );
      showToast(data.isPortalBlocked ? "Portal access blocked" : "Portal access enabled");
    } catch (err) {
      console.error(err);
      showToast("Failed to update portal access", "error");
    }
  }

  /* ================================================================ */
  return (
    <SubscriptionGuard featureName="Customer Details">
      {/* Remaining hex in this file is the fallback avatar's gradient
          illustration only — artwork, not UI chrome, so not tokenised. */}
      {/* No side padding below lg: the shell's <main> already supplies the
          mobile gutter. No pb-* either: StickyActions reserves its own space. */}
      <div className="max-w-[1100px] mx-auto lg:px-8 pt-4 lg:pt-8 pb-6 lg:pb-24 dash-animate text-foreground">
        {/* Breadcrumb */}
        <div className="mb-4 lg:mb-6">
          <Link
            href="/customers"
            className="min-h-11 text-[14px] font-bold text-foreground flex items-center gap-2 border-b-2 border-primary w-fit"
          >
            ← Customer Details
          </Link>
        </div>

        {/* ── Loading skeletons ─────────────────────────────────── */}
        {loading ? (
          /* Mirrors the loaded layout at both breakpoints, so nothing jumps
             and nothing overflows at 380px while it loads. */
          <div className="flex flex-col gap-4 lg:gap-6" aria-busy="true" aria-label="Loading customer">
            <div className="rounded-[24px] p-4 lg:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 lg:gap-6 bg-card-alt">
              <div className="flex items-center gap-4 lg:gap-5 min-w-0">
                <div className="skeleton size-14 lg:size-[100px] shrink-0 rounded-2xl lg:rounded-[20px]" />
                <div className="min-w-0 flex-1">
                  <div className="skeleton h-[22px] w-[180px] max-w-full mb-2.5" />
                  <div className="skeleton h-[14px] w-[220px] max-w-full" />
                </div>
              </div>
              <div className="skeleton h-11 w-full md:w-[140px] rounded-full" />
            </div>
            <div className="bg-card rounded-[24px] p-5 lg:p-8 border border-border lg:max-w-[calc(100%-404px)]">
              <div className="skeleton h-[18px] w-[160px] mb-6 lg:mb-8" />
              <div className="flex flex-col gap-3 mb-6 lg:grid lg:grid-cols-3 lg:gap-4 lg:mb-8">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between gap-3 lg:block">
                    <div className="skeleton h-[10px] w-[90px] lg:mb-2.5" />
                    <div className="skeleton h-[20px] lg:h-[28px] w-[120px] lg:w-[140px] max-w-full" />
                  </div>
                ))}
              </div>
              <div className="skeleton h-[12px] w-full rounded-full" />
            </div>
          </div>

          /* ── Error ─────────────────────────────────────────────── */
        ) : error ? (
          <div role="alert" className="p-6 rounded-[16px] border bg-risk-critical-surface border-risk-critical/40">
            <h3 className="text-[14px] font-bold text-risk-critical-foreground mb-1">Unable to load customer</h3>
            <p className="text-[13px] text-risk-critical-foreground">{error}</p>
          </div>

          /* ── Not found ─────────────────────────────────────────── */
        ) : !customer ? (
          <div className="p-6 rounded-[16px] border text-center bg-card border-border">
            <p className="text-[14px] text-muted-foreground-subtle">Customer not found.</p>
          </div>

          /* ── Loaded ────────────────────────────────────────────── */
        ) : (
          <div className="flex flex-col gap-4 lg:gap-6">

            {/* Header */}
            <section className="rounded-[24px] bg-card-alt p-4 lg:p-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="flex items-start gap-4 lg:gap-5 min-w-0">
                {/* Avatar */}
                <div className="size-14 lg:size-[100px] shrink-0 rounded-2xl lg:rounded-[20px] overflow-hidden relative bg-muted">
                  {customer.customerImg ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={customer.customerImg} alt={customer.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full relative flex items-center justify-center" style={{ background: "linear-gradient(200deg, #F96F82 0%, #A92C48 50%, #2A1728 100%)" }}>
                      <svg className="absolute w-full h-full top-0 left-0" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
                        <path d="M0,40 C30,60 50,20 100,50 L100,100 L0,100 Z" fill="#651C33" opacity="0.6" />
                        <path d="M0,55 C40,40 60,70 100,50 L100,100 L0,100 Z" fill="#2E1C23" />
                      </svg>
                      <span className="relative z-10 text-white text-lg lg:text-2xl font-bold">{getInitials(customer.name)}</span>
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h2 className="text-[20px] lg:text-[26px] leading-tight font-bold text-foreground break-words">{customer.name}</h2>
                  {/* Each separator travels with the item after it, so a wrap
                      starts the new line with "•" instead of stranding one. */}
                  <p className="mt-1 text-[13px] font-medium text-muted-foreground-subtle flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="font-bold whitespace-nowrap">ID: #{customer.id.split("-")[0].toUpperCase()}</span>
                    {customer.region && (
                      <span className="whitespace-nowrap"><span aria-hidden>• </span>{customer.region}</span>
                    )}
                    {customer.createdAt && !isLedgerImportDay(customer.createdAt) && (
                      <span className="whitespace-nowrap"><span aria-hidden>• </span>Registered {formatDate(customer.createdAt)}</span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 lg:gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setEditForm({
                      name: customer.name || "",
                      mobile: customer.mobile || "",
                      address: customer.address || "",
                      region: customer.region || "",
                      aadharNo: customer.aadharNo || "",
                    });
                    setShowEditModal(true);
                  }}
                  className="inline-flex min-h-11 flex-1 md:flex-none items-center justify-center gap-2 px-5 rounded-full text-[13px] font-bold bg-secondary text-secondary-foreground hover:opacity-90 transition-opacity"
                >
                  <Edit3 size={15} /> Edit profile
                </button>
                {/* Mobile gets Add Pledge from the sticky bar instead. */}
                <Link
                  href={`/customers/${customerId}/pledges/add`}
                  className="hidden lg:inline-flex min-h-11 items-center gap-2 px-6 rounded-full text-[13px] font-bold bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  <Plus size={15} /> Add Pledge
                </Link>
              </div>

              {/* Customer portal: on/off, copy link, QR */}
              <div className="md:basis-full md:order-last rounded-2xl border border-border bg-card px-3 py-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex min-h-11 items-center gap-3 cursor-pointer">
                  <Switch
                    checked={!customer.isPortalBlocked}
                    onCheckedChange={toggleCustomerPortal}
                    aria-label="Customer portal access"
                  />
                  <span className="min-w-0">
                    <span className="block text-[13px] font-bold text-foreground">Customer portal</span>
                    <span className="block text-[12px] text-muted-foreground-subtle">
                      {customer.isPortalBlocked ? "Blocked — the link will not open" : "On — customer can view their pledges"}
                    </span>
                  </span>
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={copyPortalLink}
                    className="inline-flex min-h-11 flex-1 sm:flex-none items-center justify-center gap-2 px-4 rounded-full border border-border text-[13px] font-bold text-foreground hover:bg-accent transition-colors"
                  >
                    <Copy size={15} /> Copy link
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowQR(true)}
                    className="inline-flex min-h-11 flex-1 sm:flex-none items-center justify-center gap-2 px-4 rounded-full border border-border text-[13px] font-bold text-foreground hover:bg-accent transition-colors"
                  >
                    <QrCode size={15} /> Show QR
                  </button>
                </div>
              </div>
            </section>

            {/* Body. DOM order is the desktop reading order (left column, then
                right, then pledges). Below lg: the two column wrappers become
                display:contents so their cards join one flex column, and
                order-* puts pledges second — on a phone the owner opens a
                customer to act on pledges, which used to sit ~4 screens down. */}
            <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[1fr_380px] lg:gap-6">

              {/* ── Left column ── */}
              <div className="contents lg:flex lg:flex-col lg:gap-6">

                {/* Financial summary */}
                <Link
                  href={`/customers/${customerId}/financial-summary`}
                  className="order-1 lg:order-none group block bg-card rounded-[24px] p-5 lg:p-8 border border-border transition-all duration-200 hover:border-primary hover:bg-card-alt hover:shadow-[0_6px_24px_rgb(85_91_63/0.14)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
                >
                  <div className="flex items-center justify-between gap-3 mb-5 lg:mb-8">
                    <div className="flex items-center gap-3 min-w-0">
                      <h3 className="text-[17px] font-bold text-foreground">Financial Summary</h3>
                      {/* Desktop: revealed on hover. Mobile has its own cue at
                          the card foot — there is no hover on touch, and inline
                          here it wrapped the title onto two lines. */}
                      <span className="hidden lg:inline text-[12px] font-semibold text-primary whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-150">
                        View details →
                      </span>
                    </div>
                    <span className="shrink-0 bg-accent text-accent-foreground text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-widest">
                      {customer.pledges.length} Pledge{customer.pledges.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  {/* Rows on mobile: three 24px amounts do not fit side by side
                      at 380px. Exact values, never abbreviated. */}
                  <dl className="flex flex-col gap-3 mb-5 lg:grid lg:grid-cols-3 lg:gap-4 lg:mb-8">
                    <div className="flex items-baseline justify-between gap-3 lg:block">
                      <dt className="text-[10px] font-bold tracking-wider text-muted-foreground-subtle uppercase lg:mb-2">Total Loan</dt>
                      <dd className="text-[17px] lg:text-[24px] font-bold tabular-nums text-foreground">{fmt(totalLoan)}</dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-3 lg:block">
                      <dt className="text-[10px] font-bold tracking-wider text-muted-foreground-subtle uppercase lg:mb-2">Repaid</dt>
                      <dd className="text-[17px] lg:text-[24px] font-bold tabular-nums text-primary">{fmt(repaid)}</dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-3 lg:block">
                      <dt className="text-[10px] font-bold tracking-wider text-muted-foreground-subtle uppercase lg:mb-2">Outstanding</dt>
                      <dd className="text-[17px] lg:text-[24px] font-bold tabular-nums text-risk-critical-foreground">{fmt(outstanding)}</dd>
                    </div>
                  </dl>
                  <div>
                    <div className="flex justify-between gap-3 text-[10px] font-bold tracking-wider mb-2 uppercase">
                      <span className="text-muted-foreground-subtle">Repayment Progress</span>
                      <span className="text-foreground">{progressValue.toFixed(1)}% Completed</span>
                    </div>
                    <div className="h-[12px] bg-muted rounded-full overflow-hidden w-full relative">
                      <div
                        className="absolute top-0 left-0 h-full bg-primary rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${progressValue}%` }}
                      />
                    </div>
                  </div>
                  <p className="lg:hidden mt-4 text-right text-[13px] font-semibold text-primary">View details →</p>
                </Link>

                {/* Identity & Verification */}
                <section className="order-4 lg:order-none bg-card rounded-[24px] p-5 lg:p-8 border border-border">
                  <h3 className="text-[17px] font-bold text-foreground mb-5 lg:mb-6">Identity & Verification</h3>
                  <div className="flex flex-col gap-3 lg:gap-4 mb-5 lg:mb-6 lg:max-w-[340px]">
                    <div className="bg-card-alt border border-border p-4 rounded-[12px] flex justify-between items-center gap-3 min-h-[72px]">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold tracking-wider text-muted-foreground-subtle mb-1.5 uppercase">Aadhaar Number</p>
                        <p className="text-[14px] font-bold text-foreground tracking-[0.15em] break-all">
                          {customer.aadharNo ? customer.aadharNo : "-"}
                        </p>
                      </div>
                      {customer.aadharNo && (
                        <div className="shrink-0 text-primary bg-accent p-1.5 rounded-full">
                          <CheckCircle2 size={16} aria-label="Recorded" />
                        </div>
                      )}
                    </div>
                    <div className="bg-card-alt border border-border p-4 rounded-[12px] flex justify-between items-center gap-3 min-h-[72px]">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold tracking-wider text-muted-foreground-subtle mb-1.5 uppercase">ID Proof Document</p>
                        <p className="text-[14px] font-bold text-foreground">
                          {customer.idProofImg ? "Document Uploaded" : "Not Uploaded"}
                        </p>
                      </div>
                      {customer.idProofImg && (
                        <div className="shrink-0 text-primary bg-accent p-1.5 rounded-full">
                          <CheckCircle2 size={16} aria-label="Uploaded" />
                        </div>
                      )}
                    </div>
                  </div>
                  {customer.idProofImg && (
                    <div>
                      <p className="text-[10px] font-bold tracking-wider text-muted-foreground-subtle mb-3 uppercase">ID Proof Preview</p>
                      <div className="w-full max-w-[300px] aspect-[15/8] rounded-[16px] overflow-hidden bg-muted">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={customer.idProofImg} alt="ID Proof" className="w-full h-full object-cover" />
                      </div>
                    </div>
                  )}
                </section>
              </div>

              {/* ── Right column ── */}
              <div className="contents lg:flex lg:flex-col lg:gap-6">

                {/* Contact Details */}
                <section className="order-3 lg:order-none rounded-[24px] p-5 lg:p-8 bg-muted">
                  <h3 className="text-[17px] font-bold text-foreground mb-4 lg:mb-8">Contact Details</h3>
                  <div className="flex gap-4 items-center mb-4 lg:mb-6">
                    <div className="size-10 rounded-full bg-card border border-border flex items-center justify-center shrink-0">
                      <Phone size={16} className="text-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold tracking-wider text-muted-foreground-subtle mb-1 uppercase">Phone Number</p>
                      {customer.mobile ? (
                        <a
                          href={`tel:${customer.mobile.replace(/[^\d+]/g, "")}`}
                          className="inline-flex min-h-11 items-center text-[15px] font-semibold text-primary underline-offset-2 hover:underline -my-2"
                        >
                          {customer.mobile}
                        </a>
                      ) : (
                        <p className="text-[14px] font-medium text-foreground">—</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-4 items-start">
                    <div className="size-10 rounded-full bg-card border border-border flex items-center justify-center shrink-0 relative top-1">
                      <MapPin size={16} className="text-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold tracking-wider text-muted-foreground-subtle mb-1 uppercase">Residential Address</p>
                      <p className="text-[14px] font-medium text-foreground leading-snug break-words">{customer.address || "—"}</p>
                      {customer.region && (
                        <p className="text-[12px] font-medium text-muted-foreground-subtle mt-1">{customer.region}</p>
                      )}
                    </div>
                  </div>
                </section>

                {/* Internal Remarks */}
                <section className="order-5 lg:order-none rounded-[24px] p-5 lg:p-8 flex-1 flex flex-col bg-muted lg:min-h-[280px]">
                  <div className="flex items-center justify-between gap-3 mb-4 lg:mb-5">
                    <h3 className="text-[17px] font-bold text-foreground">Internal Remarks</h3>
                    {isEditingNotes ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsEditingNotes(false)}
                          className="min-h-11 px-3 rounded-full text-[13px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveNotes}
                          disabled={savingNotes}
                          className="min-h-11 px-4 rounded-full text-[13px] font-bold bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                          {savingNotes ? "Saving..." : "Save Notes"}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingRemark(customer.remark || "");
                          setIsEditingNotes(true);
                        }}
                        className="min-h-11 -mr-3 px-3 rounded-full text-[13px] font-semibold text-foreground hover:bg-accent transition-colors"
                      >
                        Edit Notes
                      </button>
                    )}
                  </div>
                  <div className="bg-card rounded-[16px] p-4 lg:p-5 flex-1 flex flex-col border border-border">
                    <div className="text-[14px] leading-[1.7] text-muted-foreground flex-1 flex flex-col">
                      {isEditingNotes ? (
                        <textarea
                          value={editingRemark}
                          onChange={(e) => setEditingRemark(e.target.value)}
                          placeholder="Add internal remarks here..."
                          aria-label="Internal remarks"
                          className="w-full flex-1 min-h-[120px] bg-transparent border-none outline-none resize-none text-foreground placeholder:text-muted-foreground-subtle"
                        />
                      ) : (
                        customer.remark
                          ? <p className="whitespace-pre-wrap break-words">{customer.remark}</p>
                          : <p className="italic text-muted-foreground-subtle">No remarks added yet.</p>
                      )}
                    </div>
                  </div>
                </section>
              </div>

              {/* Pledges */}
              <section className="order-2 lg:order-none lg:col-span-2 bg-card rounded-[24px] border border-border">
                <div className="p-4 lg:p-6 border-b border-border">
                  <div className="flex items-center gap-x-3 gap-y-1 flex-wrap mb-3 lg:mb-4">
                    <h3 className="text-[17px] font-bold text-foreground">Pledges</h3>
                    {activePledges.length > 0 && (
                      <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground-subtle">
                        <CheckSquare size={14} />
                        Select pledges to release multiple at once
                      </span>
                    )}
                  </div>

                  {customer.pledges.length > 0 && (
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                      {/* Search + metal pills */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="relative w-full sm:w-[240px]">
                          <Search
                            size={15}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground-subtle pointer-events-none"
                          />
                          <input
                            type="search"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search pledges..."
                            aria-label="Search pledges by item or date"
                            className="w-full h-11 pl-9 pr-11 rounded-[12px] text-[14px] text-foreground bg-card border border-border placeholder:text-muted-foreground-subtle focus:outline-none focus:ring-2 focus:ring-ring transition-all [&::-webkit-search-cancel-button]:appearance-none"
                          />
                          {searchQuery && (
                            <button
                              type="button"
                              onClick={() => setSearchQuery("")}
                              aria-label="Clear search"
                              className="absolute right-0 top-0 size-11 inline-flex items-center justify-center text-muted-foreground-subtle hover:text-foreground transition-colors"
                            >
                              <X size={15} />
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 overflow-x-auto" role="group" aria-label="Filter by metal">
                          {(["ALL", "GOLD", "SILVER"] as const).map((m) => {
                            const active = metalFilter === m;
                            const label = m === "ALL" ? "All" : m.charAt(0) + m.slice(1).toLowerCase();
                            return (
                              <button
                                key={m}
                                type="button"
                                onClick={() => setMetalFilter(m)}
                                aria-pressed={active}
                                className={
                                  "min-h-11 lg:min-h-9 rounded-full px-4 text-[13px] font-semibold whitespace-nowrap transition-colors border " +
                                  (active
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-transparent text-muted-foreground-subtle border-border hover:bg-accent")
                                }
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Sort + show-released */}
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <label className="flex items-center gap-2 shrink-0">
                          <span className="text-[12px] text-muted-foreground-subtle whitespace-nowrap">Sort by</span>
                          <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="h-11 lg:h-9 px-3 rounded-[12px] text-[13px] text-foreground bg-card border border-border focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                          >
                            <option value="date_desc">Date (newest first)</option>
                            <option value="date_asc">Date (oldest first)</option>
                            <option value="loan_desc">Loan Amount (high→low)</option>
                            <option value="loan_asc">Loan Amount (low→high)</option>
                            {/* LTV options omitted — lastCalculatedLtv is not available on this view. */}
                          </select>
                        </label>

                        <label className="flex min-h-11 items-center gap-2 shrink-0 cursor-pointer">
                          <Switch checked={showReleased} onCheckedChange={setShowReleased} />
                          <span className="text-[12px] text-muted-foreground whitespace-nowrap">Show released</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {customer.pledges.length > 0 && (
                    <p className="text-[12px] mt-3 text-muted-foreground-subtle" aria-live="polite">
                      {filtersActive
                        ? `Showing ${displayedPledges.length} of ${customer.pledges.length} pledges`
                        : `${customer.pledges.length} pledges total`}
                    </p>
                  )}
                </div>

              {customer.pledges.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <p className="text-[13px] font-medium text-muted-foreground-subtle mb-4">No pledges yet.</p>
                  <Link
                    href={`/customers/${customerId}/pledges/add`}
                    className="inline-flex min-h-11 items-center px-5 rounded-full text-[13px] font-bold bg-accent text-primary hover:opacity-90 transition-opacity"
                  >
                    Create First Pledge
                  </Link>
                </div>
              ) : displayedPledges.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <p className="text-[13px] font-medium text-muted-foreground-subtle mb-3">No pledges match your filters.</p>
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="min-h-11 px-3 text-[13px] font-semibold text-primary underline underline-offset-2 hover:opacity-80 transition-opacity"
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                <div className="p-4 lg:p-6">
                  <DataTable
                    label="Pledges"
                    rows={displayedPledges}
                    columns={pledgeColumns}
                    tableOrder={["pledgeDate", "item", "loan", "releaseDate", "status"]}
                    rowId={(p) => p.id}
                    rowLabel={pledgeTitle}
                    rowHref={(p) => `/customers/${customerId}/pledges/${p.id}`}
                    actions={renderPledgeActions}
                    selection={{
                      selectedIds: Array.from(selectedIds),
                      onToggle: toggleOne,
                      onToggleAll: toggleAllShown,
                      isSelectable: (p) => isOpenPledgeStatus(p.status),
                    }}
                  />
                </div>
              )}
              </section>
            </div>
          </div>
        )}
      </div>

      {/* Bottom action bar — one bar, two modes.
          Default: Add Pledge (mobile only; desktop has it in the header).
          Selecting: "N selected" + Clear + Release. On desktop this mode is
          pinned to the viewport as the old bar was, so a Release button never
          ends up below a long list. While mounted it retires the FAB
          (globals.css), which Add Pledge replaces on this screen. */}
      {customer && (selectedIds.size > 0 ? (
        <StickyActions
          className="lg:fixed lg:inset-x-0 lg:z-30 lg:mt-0 lg:bg-card lg:px-10 lg:py-4 lg:shadow-[0_-4px_24px_rgb(0_0_0/0.05)]"
          leading={
            <span className="text-[13px] font-bold text-foreground whitespace-nowrap">
              {selectedIds.size} selected
            </span>
          }
        >
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="min-h-11 px-4 rounded-full border border-border text-[13px] font-bold text-foreground hover:bg-accent transition-colors"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={releaseSelected}
            className="inline-flex min-h-11 items-center gap-2 px-5 rounded-full text-[13px] font-bold bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <Unlock size={15} /> Release ({selectedIds.size})
          </button>
        </StickyActions>
      ) : (
        <StickyActions className="lg:hidden">
          <Link
            href={`/customers/${customerId}/pledges/add`}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full text-[14px] font-bold bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <Plus size={16} /> Add Pledge
          </Link>
        </StickyActions>
      ))}

      {/* Toast. Top of the screen on mobile, where neither the sticky bar nor
          the bottom nav can cover it; bottom-right on desktop as before. */}
      {toast && (
        <div
          role={toast.kind === "error" ? "alert" : "status"}
          className="fixed z-50 inset-x-4 top-[calc(var(--topbar-h)+0.5rem)] lg:inset-x-auto lg:top-auto lg:right-8 lg:bottom-8 lg:max-w-[420px] rounded-[12px] bg-foreground text-background px-4 py-3 shadow-xl text-[13px] font-bold flex items-start gap-2"
        >
          {toast.kind === "error"
            ? <AlertCircle size={16} className="mt-px shrink-0 text-risk-critical" />
            : <CheckCircle2 size={16} className="mt-px shrink-0 text-success" />}
          <span className="min-w-0">{toast.msg}</span>
        </div>
      )}

      {/* Customer portal QR. Large enough to scan from across the counter;
          always on white, since a QR on a dark surface may not scan. */}
      <Sheet
        open={showQR && !!customer}
        onOpenChange={setShowQR}
        title="Customer portal"
        description={customer ? `Scan to open ${customer.name}'s pledge statement.` : undefined}
        size="sm"
      >
        {customer && (
          <div className="flex flex-col items-center gap-3 pb-2">
            {customer.isPortalBlocked && (
              <p role="alert" className="w-full rounded-[12px] bg-risk-critical-surface px-3 py-2 text-[12px] font-semibold text-risk-critical-foreground">
                Portal is blocked — this code will not open until access is turned back on.
              </p>
            )}
            <div className="rounded-2xl bg-white p-4">
              <QRCodeCanvas value={portalUrl} size={240} />
            </div>
            <p className="w-full break-all text-center text-[12px] text-muted-foreground-subtle">{portalUrl}</p>
            <button
              type="button"
              onClick={copyPortalLink}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-border text-[13px] font-bold text-foreground hover:bg-accent transition-colors"
            >
              <Copy size={15} /> Copy link
            </button>
          </div>
        )}
      </Sheet>

      {/* Edit profile */}
      <Sheet
        open={showEditModal}
        onOpenChange={setShowEditModal}
        title="Edit profile"
        size="md"
        dismissible={!savingProfile}
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              disabled={savingProfile}
              className="min-h-11 flex-1 lg:flex-none px-5 rounded-full text-[13px] font-bold bg-secondary text-secondary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveProfile}
              disabled={savingProfile}
              className="min-h-11 flex-1 lg:flex-none px-5 rounded-full text-[13px] font-bold bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {savingProfile ? "Saving..." : "Save changes"}
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-4 pt-1">
          {PROFILE_FIELDS.map(({ label, key, placeholder, inputMode, autoComplete, type }) => (
            <div key={key}>
              <label htmlFor={`edit-${key}`} className="block text-[11px] font-bold tracking-wider text-muted-foreground-subtle uppercase mb-1.5">
                {label}
              </label>
              <input
                id={`edit-${key}`}
                type={type ?? "text"}
                inputMode={inputMode}
                autoComplete={autoComplete}
                value={editForm[key]}
                onChange={(e) => setEditForm((prev) => ({ ...prev, [key]: e.target.value }))}
                placeholder={placeholder}
                className="w-full h-11 px-4 rounded-[12px] border border-border bg-card-alt text-[16px] lg:text-[14px] text-foreground placeholder:text-muted-foreground-subtle outline-none focus:border-primary transition-colors"
              />
            </div>
          ))}
        </div>
      </Sheet>

      {/* Row actions (mobile "More") */}
      <Sheet
        open={rowMenu !== null}
        onOpenChange={(open) => { if (!open) setRowMenu(null); }}
        title={rowMenu ? pledgeTitle(rowMenu) : "Pledge"}
        description={rowMenu ? fmt(rowMenu.loanAmount) : undefined}
        size="sm"
      >
        {rowMenu && (
          <Sheet.List>
            <Sheet.Item
              icon={<Eye size={18} />}
              label="View pledge"
              onClick={() => {
                const id = rowMenu.id;
                setRowMenu(null);
                router.push(`/customers/${customerId}/pledges/${id}`);
              }}
            />
            <li role="separator" aria-hidden className="mx-3 my-1 h-px bg-border" />
            <Sheet.Item
              tone="destructive"
              icon={<Trash size={18} />}
              label="Delete pledge"
              onClick={() => {
                const id = rowMenu.id;
                setRowMenu(null);
                setDeleteConfirm({ id, step: "INITIAL" });
              }}
            />
          </Sheet.List>
        )}
      </Sheet>

      {/* Delete confirmation. Names the pledge: on mobile the sheet covers
          the row the owner tapped. The destructive action is the filled
          primary; the dismiss is a quieter outline — not a Yes/No pair. */}
      <Sheet
        open={deleteConfirm !== null}
        onOpenChange={(open) => { if (!open) setDeleteConfirm(null); }}
        title={deleteConfirm?.step === "PAYMENT_WARNING" ? "Delete anyway?" : "Delete this pledge?"}
        description={confirmPledge ? `${pledgeTitle(confirmPledge)} · ${fmt(confirmPledge.loanAmount)}` : undefined}
        size="sm"
        footer={
          deleteConfirm && (
            <>
              <Button
                variant="outline"
                onClick={() => setDeleteConfirm(null)}
                className="min-h-11 flex-1 rounded-full text-[13px] font-bold lg:flex-none lg:px-5"
              >
                Keep pledge
              </Button>
              <Button
                variant="destructive"
                onClick={() => executeDelete(deleteConfirm.id, deleteConfirm.step === "PAYMENT_WARNING")}
                className="min-h-11 flex-1 rounded-full text-[13px] font-bold lg:flex-none lg:px-5"
              >
                <Trash size={15} /> Delete pledge
              </Button>
            </>
          )
        }
      >
        <p className="text-[14px] leading-relaxed text-muted-foreground">
          {deleteConfirm?.step === "PAYMENT_WARNING"
            ? `This pledge has ${deleteConfirm.count} part-payment${deleteConfirm.count === 1 ? "" : "s"} recorded. Deleting it permanently erases that payment history.`
            : "The pledge and its items are permanently removed. This can't be undone."}
        </p>
      </Sheet>
    </SubscriptionGuard>
  );
}