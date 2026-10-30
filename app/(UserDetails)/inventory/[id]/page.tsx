"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, ReceiptText, ShoppingBag, RefreshCw, ImageOff, Phone,
} from "lucide-react";

import { LTV_MAX_5_2 } from "@/lib/pledgeConstants";
import { cn } from "@/lib/utils";
import SubscriptionGuard from "@/components/SubscriptionGuard";
import Sheet from "@/components/ui/Sheet";
import StickyActions from "@/components/ui/StickyActions";
import { StatusBadge } from "@/components/ui/DataTable";
import {
  Card, Eyebrow, MetalBadge, Row, btnPrimary, btnSecondary,
  fmtINR, fmtDate, fmtGrams, metalKind,
} from "@/components/ui/DetailParts";
import {
  fetchItem, valueToday, fmtChange, fmtSignedINR,
  type Item, type MarketRates, type FetchResult,
} from "@/components/inventory/inventoryItem";

/* -------------------------------------------------------------------------- */
/* Formatting                                                                  */
/* -------------------------------------------------------------------------- */
const DAY_MS = 1000 * 60 * 60 * 24;

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", hour: "numeric", minute: "2-digit",
  });
}
/** A stored LTV at the Decimal(5,2) ceiling means "at or above", not exact. */
function fmtLtv(ltv: number | null) {
  if (ltv === null) return "—";
  return ltv >= LTV_MAX_5_2 ? `≥${LTV_MAX_5_2}%` : `${ltv.toFixed(1)}%`;
}
/** A zero net weight means the item holds none of that metal. */
function fmtWeight(g: number) {
  return g > 0 ? fmtGrams(g) : "—";
}
function rateLine(gold: number | null, silver: number | null) {
  return [
    gold !== null ? `Gold ${fmtINR(gold)}/g` : null,
    silver !== null ? `Silver ${fmtINR(silver)}/g` : null,
  ].filter(Boolean).join(" · ");
}
/** Only the last four characters of an ID number are ever shown. */
function maskId(id: string) {
  const v = id.trim();
  return v.length > 4 ? `•••• ${v.slice(-4)}` : "••••";
}
/* ========================================================================== */
/* Page                                                                        */
/* ========================================================================== */
export default function InventoryItemPage() {
  const { id } = useParams<{ id: string }>();

  const [item, setItem] = useState<Item | null>(null);
  const [market, setMarket] = useState<MarketRates | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [photoOpen, setPhotoOpen] = useState(false);

  /* ── Load ── */
  // State is only set from the promise callback, never synchronously inside
  // the effect body. `cancelled` drops a response for an item we've left.
  const apply = useCallback((r: FetchResult) => {
    if (r.ok) {
      setItem(r.item);
      setMarket(r.market);
      setError(null);
    } else {
      setError(r.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchItem(id).then((r) => { if (!cancelled) apply(r); });
    return () => { cancelled = true; };
  }, [id, apply]);

  const reload = useCallback(() => {
    fetchItem(id).then(apply);
  }, [id, apply]);

  const retry = () => {
    setLoading(true);
    reload();
  };

  /* ── Derived view ── */
  const view = useMemo(() => {
    if (!item) return null;

    const holdsGold = item.netWeightOfGold > 0;
    const holdsSilver = item.netWeightOfSilver > 0;
    const valueNow = valueToday(item, market);
    const nowRates = rateLine(
      holdsGold ? market?.gold?.inrPerGram ?? null : null,
      holdsSilver ? market?.silver?.inrPerGram ?? null : null,
    );
    const nowUpdated = (holdsGold ? market?.gold?.createdAt : market?.silver?.createdAt) ?? null;

    // Rate recorded when entered. A pledge sale's audit row carries both
    // metals' prices; otherwise the item's single acquiredMetalRate. Never
    // looked up by date, never today's price.
    const sp = item.sourcePledge;
    const audit = sp?.audit ?? null;
    let entryRates = "";
    let entryRatesFrom = "";
    if (audit) {
      entryRates = rateLine(
        holdsGold ? audit.goldPricePerGram : null,
        holdsSilver ? audit.silverPricePerGram : null,
      );
      entryRatesFrom = "From the pledge's sale record";
    }
    if (!entryRates && item.acquiredMetalRate !== null) {
      const kind = metalKind(item.metalType);
      entryRates = rateLine(
        kind === "GOLD" ? item.acquiredMetalRate : null,
        kind === "SILVER" ? item.acquiredMetalRate : null,
      );
      entryRatesFrom = "From the purchase entry";
    }

    // Settlement — the immutable sale record first, then the pledge row.
    const settlement = item.sourceType === "PLEDGE_SALE"
      ? (() => {
          const saleDate = audit?.releaseDate ?? sp?.releaseDate ?? item.acquiredAt;
          const daysRan = sp?.pledgeDate
            ? Math.max(0, Math.floor((new Date(saleDate).getTime() - new Date(sp.pledgeDate).getTime()) / DAY_MS))
            : null;
          return {
            saleDate,
            daysRan,
            billedMonths: audit?.durationMonths ?? sp?.durationMonths ?? null,
            principal: audit?.principal ?? sp?.loanAmount ?? null,
            interest: audit?.totalInterest ?? sp?.totalInterest ?? null,
            owed: item.amountOwedAt ?? audit?.receivableAmount ?? sp?.receivableAmount ?? null,
          };
        })()
      : null;

    const profit =
      item.status === "SOLD" && item.soldPrice !== null && item.acquiredCost !== null
        ? item.soldPrice - item.acquiredCost
        : null;

    return { valueNow, nowRates, nowUpdated, entryRates, entryRatesFrom, audit, settlement, profit };
  }, [item, market]);

  /* ── Loading ── */
  if (loading) {
    return (
      <SubscriptionGuard>
        <div className="max-w-[1100px] mx-auto lg:px-8 pt-4 lg:pt-8 pb-6" aria-busy="true" aria-label="Loading item">
          <div className="rounded-[24px] bg-card-alt p-4 lg:p-6 mb-4 lg:mb-6">
            <div className="skeleton h-[26px] w-[220px] max-w-full mb-3" />
            <div className="skeleton h-[14px] w-[320px] max-w-full" />
          </div>
          <div className="grid gap-4 lg:gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <div className="skeleton h-[200px] rounded-[24px]" />
            <div className="skeleton h-[200px] rounded-[24px]" />
          </div>
        </div>
      </SubscriptionGuard>
    );
  }

  /* ── Error ── */
  if (error || !item || !view) {
    return (
      <SubscriptionGuard>
        <div className="max-w-[1100px] mx-auto lg:px-8 pt-4 lg:pt-8 pb-6 space-y-4">
          <div role="alert" className="p-6 rounded-[16px] border bg-risk-critical-surface border-risk-critical/40">
            <h3 className="text-[14px] font-bold text-risk-critical-foreground mb-1">Unable to load item</h3>
            <p className="text-[13px] text-risk-critical-foreground">{error ?? "Item not found"}</p>
          </div>
          <div className="flex gap-2">
            <Link href="/inventory" className={btnSecondary}>
              <ArrowLeft size={15} /> Inventory
            </Link>
            <button type="button" onClick={retry} className={btnSecondary}>
              <RefreshCw size={15} /> Retry
            </button>
          </div>
        </div>
      </SubscriptionGuard>
    );
  }

  const isInStock = item.status === "IN_STOCK";
  const fromPledge = item.sourceType === "PLEDGE_SALE";
  const sp = item.sourcePledge;
  const pledgeHref = sp ? `/customers/${sp.customerId}/pledges/${sp.id}` : null;
  const { valueNow, settlement, audit, profit } = view;
  const changeNow = valueNow !== null && item.acquiredCost !== null ? valueNow - item.acquiredCost : null;

  /* ====================================================================== */
  /* UI                                                                      */
  /* ====================================================================== */
  return (
    <SubscriptionGuard>
      {/* No side padding below lg: the shell's <main> supplies the mobile
          gutter. StickyActions reserves its own space at the bottom. */}
      <div className="max-w-[1100px] mx-auto lg:px-8 pt-4 lg:pt-8 pb-6 lg:pb-16 text-foreground flex flex-col gap-4 lg:gap-6">

        {/* ── 1. Header ── */}
        <section className="rounded-[24px] bg-card-alt p-4 lg:p-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-3 lg:gap-4 min-w-0 md:flex-1">
            <Link
              href="/inventory"
              aria-label="Back to inventory"
              className="size-11 shrink-0 inline-flex items-center justify-center rounded-full border border-border bg-card text-foreground hover:bg-accent transition-colors"
            >
              <ArrowLeft size={18} />
            </Link>
            <div className="min-w-0 flex-1">
              <h1 className="text-[20px] lg:text-[26px] leading-tight font-bold text-foreground break-words">{item.description}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <StatusBadge tone={isInStock ? "active" : "sold"}>{isInStock ? "In stock" : "Sold"}</StatusBadge>
                <MetalBadge metal={item.metalType} />
                <span className="inline-flex text-[11px] font-bold tracking-wide px-2 py-0.5 rounded-full border border-border text-muted-foreground">
                  {fromPledge ? "From pledge" : "Direct purchase"}
                </span>
                <span className="text-[13px] font-medium text-muted-foreground-subtle">
                  <span aria-hidden>· </span>{item.itemType}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 lg:gap-3 shrink-0">
            <Link href={`/inventory/${item.id}/receipt`} className={cn(btnSecondary, "flex-1 md:flex-none")}>
              <ReceiptText size={15} /> Receipt
            </Link>
            {/* Mobile gets this from the sticky bar instead. */}
            {isInStock && (
              <Link href={`/inventory/${item.id}/sell`} className={cn(btnPrimary, "hidden lg:inline-flex")}>
                <ShoppingBag size={15} /> Mark as sold
              </Link>
            )}
          </div>
        </section>

        {/* ── 2. Hero row ── */}
        <div className="grid gap-4 lg:gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">

          {/* Cost card */}
          <section className="rounded-[24px] bg-primary text-primary-foreground p-5 lg:p-7 flex flex-col justify-between gap-6">
            <div>
              <p className="text-[12px] font-bold tracking-wider uppercase opacity-80">Acquired for</p>
              <p className="mt-2 text-[32px] lg:text-[40px] font-bold leading-none tabular-nums break-words">
                {fmtINR(item.acquiredCost)}
              </p>
              <p className="mt-2 text-[13px] opacity-80">Acquired on {fmtDate(item.acquiredAt)}</p>
            </div>
            <dl className="grid grid-cols-3 gap-4 border-t border-primary-foreground/25 pt-4">
              <div className="min-w-0">
                <dt className="text-[12px] opacity-80">Gold</dt>
                <dd className="text-[16px] font-bold tabular-nums">{fmtWeight(item.netWeightOfGold)}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-[12px] opacity-80">Silver</dt>
                <dd className="text-[16px] font-bold tabular-nums">{fmtWeight(item.netWeightOfSilver)}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-[12px] opacity-80">Purity</dt>
                <dd className="text-[16px] font-bold tabular-nums">{item.purity !== null ? `${item.purity}%` : "—"}</dd>
              </div>
            </dl>
          </section>

          {/* Value now (in stock) / Sale (sold) */}
          {isInStock ? (
            <section className="flex flex-col justify-between gap-4 bg-card border border-border rounded-[24px] p-5 lg:p-6 min-w-0">
              <div>
                <Eyebrow>Market value now</Eyebrow>
                <p className="mt-1 text-[28px] font-bold leading-tight tabular-nums">{fmtINR(valueNow)}</p>
                <p className="text-[13px] text-muted-foreground-subtle">
                  {valueNow !== null
                    ? "if sold at today's metal price"
                    : metalKind(item.metalType) === "OTHER" && !(item.netWeightOfGold > 0 || item.netWeightOfSilver > 0)
                      ? "Not valued — no gold or silver weight"
                      : "No current metal price"}
                </p>
              </div>
              <dl>
                <Row
                  label="Change vs acquired cost"
                  sub="if sold at today's metal price"
                  value={changeNow !== null && item.acquiredCost !== null ? fmtChange(changeNow, item.acquiredCost) : "—"}
                />
                <Row
                  label="Today's rate"
                  sub={view.nowUpdated ? `Updated ${fmtDateTime(view.nowUpdated)}` : undefined}
                  value={view.nowRates || "—"}
                />
              </dl>
            </section>
          ) : (
            <section className="flex flex-col gap-2 bg-card border border-border rounded-[24px] p-5 lg:p-6 min-w-0">
              <Eyebrow>Sold for</Eyebrow>
              <p className="text-[28px] font-bold leading-tight tabular-nums">{fmtINR(item.soldPrice)}</p>
              <p className="text-[13px] text-muted-foreground-subtle">on {fmtDate(item.soldAt)}</p>
              <dl className="mt-2">
                <Row
                  label="Realised profit"
                  sub="Sale price − acquired cost"
                  value={
                    profit !== null ? (
                      <span className={profit < 0 ? "text-risk-critical-foreground" : undefined}>
                        {item.acquiredCost !== null ? fmtChange(profit, item.acquiredCost) : fmtSignedINR(profit)}
                      </span>
                    ) : "—"
                  }
                />
                <Row
                  label="Buyer"
                  value={item.buyerName || "—"}
                />
                {item.buyerMobile && (
                  <Row
                    label="Buyer mobile"
                    value={
                      <a href={`tel:${item.buyerMobile}`} className="inline-flex min-h-11 -my-3 items-center gap-1.5 text-primary hover:underline">
                        <Phone size={14} aria-hidden /> {item.buyerMobile}
                      </a>
                    }
                  />
                )}
                {item.saleNotes?.trim() && <Row label="Sale notes" value={item.saleNotes.trim()} />}
              </dl>
            </section>
          )}
        </div>

        {/* ── 3. Purchase details | Photo ── */}
        <div className="grid gap-4 lg:gap-6 md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <Card title="Purchase details">
            <dl className="px-5 lg:px-6 pb-4">
              {fromPledge ? (
                <Row
                  label="Customer"
                  sub="Sold their pledge to the shop"
                  value={
                    sp ? (
                      <Link href={`/customers/${sp.customerId}`} className="text-primary hover:underline underline-offset-4">
                        {sp.customerName}
                      </Link>
                    ) : "—"
                  }
                />
              ) : (
                <>
                  <Row label="Seller" value={item.sellerName || "—"} />
                  <Row label="Seller ID" value={item.sellerIdNum ? maskId(item.sellerIdNum) : "—"} />
                </>
              )}
              <Row label="Acquired on" value={fmtDate(item.acquiredAt)} />
              <Row label="Acquired cost" value={fmtINR(item.acquiredCost)} />
              {view.entryRates && (
                <Row label="Rate recorded when entered" sub={view.entryRatesFrom} value={view.entryRates} />
              )}
              <Row label="Item type" value={item.itemType} />
              <Row label="Gross weight" value={item.grossWeight !== null ? fmtGrams(item.grossWeight) : "—"} />
              {item.notes?.trim() && <Row label="Notes" value={item.notes.trim()} />}
            </dl>
          </Card>

          <Card title="Photo">
            {item.photoUrl ? (
              <div className="px-5 lg:px-6 pb-5">
                <button
                  type="button"
                  onClick={() => setPhotoOpen(true)}
                  aria-label="View full-size photo"
                  className="block w-full max-w-[360px] overflow-hidden rounded-[16px] bg-muted focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.photoUrl} alt={`Photo of ${item.description}`} className="w-full aspect-[4/3] object-cover" />
                </button>
              </div>
            ) : (
              <p className="px-5 lg:px-6 pb-5 flex items-center gap-2 text-[13px] text-muted-foreground-subtle">
                <ImageOff size={15} aria-hidden /> No photo
              </p>
            )}
          </Card>
        </div>

        {/* ── 4. Settlement — pledge-sourced items only ── */}
        {settlement && (
          <Card
            title="Settlement"
            aside={pledgeHref && (
              <Link href={pledgeHref} className="min-h-11 inline-flex items-center text-[13px] font-bold text-primary hover:underline">
                View pledge →
              </Link>
            )}
          >
            <p className="px-5 lg:px-6 pb-1 text-[13px] text-muted-foreground">
              This item came from a pledge that was closed by selling it to the shop.
            </p>
            <div className="grid md:grid-cols-2 md:gap-x-8 px-5 lg:px-6 pb-4">
              <dl>
                <Row label="Pledge date" value={fmtDate(sp?.pledgeDate)} />
                <Row label="Sale date" value={fmtDate(settlement.saleDate)} />
                <Row
                  label="Loan ran"
                  sub={settlement.billedMonths !== null ? `Billed as ${settlement.billedMonths} months` : undefined}
                  value={settlement.daysRan !== null ? `${settlement.daysRan.toLocaleString("en-IN")} days` : "—"}
                />
                <Row label="Principal" value={fmtINR(settlement.principal)} />
                <Row label="Interest" value={fmtINR(settlement.interest)} />
                <Row label="Total owed at sale" value={fmtINR(settlement.owed)} />
              </dl>
              <dl className="border-t border-border md:border-t-0">
                <Row label="Gold price at sale" value={audit?.goldPricePerGram != null ? `${fmtINR(audit.goldPricePerGram)}/g` : "—"} />
                <Row label="Silver price at sale" value={audit?.silverPricePerGram != null ? `${fmtINR(audit.silverPricePerGram)}/g` : "—"} />
                <Row label="Market value at sale" value={fmtINR(audit?.marketValueAtRelease)} />
                <Row label="LTV at sale" sub="Total owed ÷ market value" value={fmtLtv(audit?.ltvAtRelease ?? null)} />
              </dl>
            </div>
          </Card>
        )}

      </div>

      {/* Mobile action — desktop has it in the header. */}
      {isInStock && (
        <StickyActions className="lg:hidden">
          <Link href={`/inventory/${item.id}/sell`} className={cn(btnPrimary, "flex-1 px-3")}>
            <ShoppingBag size={15} /> Mark as sold
          </Link>
        </StickyActions>
      )}

      {/* Photo viewer */}
      {item.photoUrl && (
        <Sheet open={photoOpen} onOpenChange={setPhotoOpen} title="Photo" size="lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.photoUrl}
            alt={`Photo of ${item.description}`}
            className="w-full max-h-[75dvh] object-contain rounded-[12px] bg-muted"
          />
        </Sheet>
      )}
    </SubscriptionGuard>
  );
}
