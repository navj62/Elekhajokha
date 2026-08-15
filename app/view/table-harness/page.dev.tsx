"use client";

/* ------------------------------------------------------------------ */
/*  SCRATCH HARNESS — Phase 2 Step 1. Not a product surface.           */
/*                                                                     */
/*  Exercises DataTable at a 6-column and an 8-column config, plus     */
/*  StickyActions against the real BottomNav, so both breakpoints can  */
/*  be reviewed before the pattern is applied to 19 tables.            */
/*                                                                     */
/*  It lives under /view/* because that prefix is already public in    */
/*  proxy.ts, which lets it be driven headlessly without an auth       */
/*  session. It is hard-disabled outside development, and every figure */
/*  below is fabricated — no real customer data touches this file.     */
/*                                                                     */
/*  DELETE once the pattern is signed off.                             */
/* ------------------------------------------------------------------ */

import { notFound } from "next/navigation";

import AppShell from "@/components/layout/AppShell";
import { DataTable, StatusBadge, type BadgeTone, type DataTableColumn } from "@/components/ui/DataTable";
import StickyActions from "@/components/ui/StickyActions";
import { useTheme } from "@/components/providers/ThemeProvider";
import * as React from "react";

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

/* ── Fixture A: 6 columns — the customer-detail pledge table ──────── */

interface PledgeRow {
  id: string;
  customer: string;
  region: string;
  pledgeDate: string;
  item: string;
  itemDetail: string;
  loanAmount: number;
  releaseDate: string | null;
  status: { tone: BadgeTone; word: string };
}

const PLEDGE_ROWS: PledgeRow[] = [
  { id: "p1", customer: "Test Customer One", region: "Sample Region", pledgeDate: "12 Mar 2026", item: "Necklace", itemDetail: "22K · 18.450 g", loanAmount: 124500, releaseDate: null, status: { tone: "active", word: "Active" } },
  { id: "p2", customer: "Test Customer Two", region: "Sample Region", pledgeDate: "03 Jan 2026", item: "Bangle Set", itemDetail: "22K · 44.120 g", loanAmount: 286000, releaseDate: null, status: { tone: "active", word: "Active" } },
  { id: "p3", customer: "Test Customer Three", region: "Another Region", pledgeDate: "28 Nov 2025", item: "Chain", itemDetail: "18K · 9.300 g", loanAmount: 47250, releaseDate: "14 Feb 2026", status: { tone: "released", word: "Released" } },
  { id: "p4", customer: "Test Customer Four", region: "Sample Region", pledgeDate: "09 Sep 2025", item: "Ring", itemDetail: "22K · 4.875 g", loanAmount: 31900, releaseDate: "02 Jan 2026", status: { tone: "sold", word: "Sold to Shop" } },
];

const PLEDGE_COLUMNS: DataTableColumn<PledgeRow>[] = [
  {
    key: "customer",
    header: "Customer",
    role: "identity",
    cell: (r) => (
      <div className="min-w-0">
        <div className="truncate">{r.customer}</div>
        <div className="mt-0.5 text-[12px] font-medium text-muted-foreground-subtle">{r.region}</div>
      </div>
    ),
  },
  {
    key: "loan",
    header: "Loan Amount",
    label: "Loan Amount",
    role: "primary",
    align: "right",
    cell: (r) => inr(r.loanAmount),
  },
  {
    key: "status",
    header: "Status",
    role: "trailing",
    cell: (r) => <StatusBadge tone={r.status.tone}>{r.status.word}</StatusBadge>,
  },
  { key: "pledgeDate", header: "Pledge Date", cell: (r) => r.pledgeDate },
  {
    key: "item",
    header: "Item",
    cell: (r) => (
      <div className="min-w-0">
        <div>{r.item}</div>
        <div className="mt-0.5 text-[12px] font-medium text-muted-foreground-subtle">{r.itemDetail}</div>
      </div>
    ),
  },
  { key: "releaseDate", header: "Release Date", cell: (r) => r.releaseDate ?? "—" },
];

/* ── Fixture B: 8 columns — the bulk-release preflight ────────────── */

interface PreflightRow {
  id: string;
  asset: string;
  assetDetail: string;
  pledgeDate: string;
  duration: string;
  principal: number;
  interest: number;
  receivable: number;
  ltv: number;
  risk: { tone: BadgeTone; word: string };
  compounding: string;
}

const PREFLIGHT_ROWS: PreflightRow[] = [
  { id: "b1", asset: "Necklace", assetDetail: "22K · 18.450 g net", pledgeDate: "12 Mar 2026", duration: "5.5 months", principal: 124500, interest: 13695, receivable: 138195, ltv: 61.4, risk: { tone: "safe", word: "Safe" }, compounding: "Half-yearly" },
  { id: "b2", asset: "Bangle Set", assetDetail: "22K · 44.120 g net", pledgeDate: "03 Jan 2026", duration: "7.5 months", principal: 286000, interest: 42900, receivable: 328900, ltv: 72.8, risk: { tone: "watch", word: "Watch" }, compounding: "Half-yearly" },
  { id: "b3", asset: "Chain + Pendant", assetDetail: "18K · 9.300 g net", pledgeDate: "28 Nov 2025", duration: "8.5 months", principal: 47250, interest: 8032, receivable: 55282, ltv: 86.1, risk: { tone: "at-risk", word: "At Risk" }, compounding: "None" },
  { id: "b4", asset: "Ring", assetDetail: "22K · 4.875 g net", pledgeDate: "09 Sep 2025", duration: "11 months", principal: 31900, interest: 7018, receivable: 38918, ltv: 104.3, risk: { tone: "critical", word: "Underwater" }, compounding: "Yearly" },
];

const PREFLIGHT_COLUMNS: DataTableColumn<PreflightRow>[] = [
  {
    key: "asset",
    header: "Asset",
    role: "identity",
    cell: (r) => (
      <div className="min-w-0">
        <div className="truncate">{r.asset}</div>
        <div className="mt-0.5 text-[12px] font-medium text-muted-foreground-subtle">{r.assetDetail}</div>
      </div>
    ),
  },
  {
    key: "receivable",
    header: "Receivable",
    label: "Receivable",
    role: "primary",
    align: "right",
    cell: (r) => inr(r.receivable),
  },
  {
    key: "risk",
    header: "Risk",
    role: "trailing",
    cell: (r) => <StatusBadge tone={r.risk.tone}>{r.risk.word}</StatusBadge>,
  },
  { key: "pledgeDate", header: "Pledge Date", cell: (r) => r.pledgeDate },
  { key: "duration", header: "Duration", align: "right", cell: (r) => r.duration },
  { key: "principal", header: "Principal", align: "right", cell: (r) => inr(r.principal) },
  { key: "interest", header: "Interest", align: "right", cell: (r) => inr(r.interest) },
  { key: "ltv", header: "LTV", align: "right", cell: (r) => `${r.ltv.toFixed(1)}%` },
  { key: "compounding", header: "Compounding", cell: (r) => r.compounding },
];

/* ── Harness ─────────────────────────────────────────────────────── */

const BTN_GHOST =
  "inline-flex items-center justify-center rounded-full border border-border bg-card px-4 text-[13px] font-bold text-foreground transition-colors hover:bg-accent";
const BTN_SOLID =
  "inline-flex items-center justify-center rounded-full bg-primary px-5 text-[13px] font-bold text-primary-foreground transition-opacity hover:opacity-90";

export default function TableHarnessPage() {
  const { theme, toggleTheme } = useTheme();
  const [selected, setSelected] = React.useState<string[]>([]);
  const [width, setWidth] = React.useState<number | null>(null);

  React.useEffect(() => {
    const on = () => setWidth(window.innerWidth);
    on();
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);

  const toggle = (id: string, next: boolean) =>
    setSelected((prev) => (next ? [...prev, id] : prev.filter((x) => x !== id)));

  // After the hooks, so the guard never changes hook order.
  if (process.env.NODE_ENV === "production") notFound();

  return (
    /* The /view layout centres content on a gray page for the customer
       portal. Escape it so the harness renders against real tokens. */
    <div className="fixed inset-0 z-0 overflow-hidden bg-background">
      <AppShell>
        <div className="space-y-10 pt-2">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-[22px] font-bold text-foreground">DataTable harness</h1>
              <p className="mt-0.5 text-[13px] text-muted-foreground">
                Viewport {width ?? "…"}px · {width !== null && width >= 1024 ? "table" : "cards"} ·{" "}
                {theme} theme · fabricated data
              </p>
            </div>
            <button type="button" onClick={toggleTheme} className={`${BTN_GHOST} h-11`}>
              Switch to {theme === "light" ? "dark" : "light"}
            </button>
          </header>

          <section className="space-y-3">
            <h2 className="text-[15px] font-bold text-foreground">
              6 columns — customer pledges (selection + row actions)
            </h2>
            <DataTable
              rows={PLEDGE_ROWS}
              columns={PLEDGE_COLUMNS}
              /* Cards want identity → loan → status. The existing desktop
                 table reads date → item → loan → release → status, and owners
                 have been reading it that way; tableOrder keeps it. */
              tableOrder={["customer", "pledgeDate", "item", "loan", "releaseDate", "status"]}
              rowId={(r) => r.id}
              label="Pledges"
              rowLabel={(r) => `${r.customer}, ${r.item}`}
              rowHref={() => "#"}
              selection={{
                selectedIds: selected,
                onToggle: toggle,
                onToggleAll: (next) => setSelected(next ? PLEDGE_ROWS.filter((r) => r.status.tone === "active").map((r) => r.id) : []),
                isSelectable: (r) => r.status.tone === "active",
              }}
              actions={(r) => (
                <>
                  <button type="button" className={BTN_GHOST} disabled={r.status.tone !== "active"}>
                    Release
                  </button>
                  <button type="button" className={BTN_GHOST}>
                    Delete
                  </button>
                </>
              )}
            />
          </section>

          <section className="space-y-3">
            <h2 className="text-[15px] font-bold text-foreground">
              8 columns — bulk-release preflight (read-only)
            </h2>
            <DataTable
              rows={PREFLIGHT_ROWS}
              columns={PREFLIGHT_COLUMNS}
              rowId={(r) => r.id}
              label="Bulk release preflight"
              rowLabel={(r) => r.asset}
            />
          </section>

          <StickyActions
            leading={
              <span className="text-[13px] font-semibold text-foreground">
                {selected.length} selected
              </span>
            }
          >
            <button type="button" className={`${BTN_GHOST} h-11`}>
              Cancel
            </button>
            <button type="button" className={`${BTN_SOLID} h-11`}>
              Save Pledge
            </button>
          </StickyActions>
        </div>
      </AppShell>
    </div>
  );
}
