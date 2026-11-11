"use client";

/**
 * Pledge detail — the layout below lg:. The desktop layout lives in the page
 * itself and is hidden below lg:; this one is hidden from lg: up.
 *
 * Presentation only. Every figure arrives already computed by the page (from
 * calculateHybridInterest / calculateLTV / daysToUnderwater) or formatted for
 * display; every action is the page's own handler or route. Nothing here
 * calculates money, LTV or risk.
 */
import { useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Archive, ReceiptText, Phone, ImageOff, Lock, Clock, Plus,
  ArrowUpRight, ArrowDownLeft, Unlock,
} from "lucide-react";

import { RISK_TIER_BOUNDARIES } from "@/lib/calculateLTV";
import { cn } from "@/lib/utils";
import StickyActions from "@/components/ui/StickyActions";
import { StatusBadge, type BadgeTone } from "@/components/ui/DataTable";
import {
  Card, MetalBadge, Row, btnPrimary, fmtINR, fmtGrams, metalKind,
} from "@/components/ui/DetailParts";
import { METAL_LABEL } from "@/lib/inventoryDisplay";

/* -------------------------------------------------------------------------- */
/* Props                                                                       */
/* -------------------------------------------------------------------------- */
export interface MobileItem {
  id: string;
  itemType: string;
  itemName: string | null;
  metalType: string;
  quantity: number;
  grossWeight: number;
  /** Weighed net weight (after stones etc.). */
  netWeight: number | null;
  purity: number;
  /** Pure-metal weight, server-derived. */
  netWeightOfMetal: number;
}

export type MobileEventKind = "out" | "in" | "released" | "sold";

export interface MobileEvent {
  key: string;
  kind: MobileEventKind;
  title: string;
  /** Already formatted, e.g. "12 Mar 2026 · part payment". */
  sub: string;
  amount: number | null;
}

/** A risk pill: the label and tone come from getRiskTier via the page. */
export interface MobileTier {
  label: string;
  tone: BadgeTone;
}

export interface PledgeDetailMobileProps {
  backHref: string;
  backLabel: string;
  title: string;
  /** "Pledged 13/05/26" (DD/MM/YY, kept short so it usually shares a line
   *  with the weight), followed by each "10.8 g gold" part. */
  pledgedOn: string;
  weightParts: string[];

  isOpen: boolean;
  sellHref: string;
  releaseHref: string;
  onReceipt: () => void;

  hero: {
    statusLabel: string;
    /** "Day 12 of loan" or "Held 40 days". */
    ageLabel: string;
    amountLabel: string;
    amount: number | null;
    principal: number;
    interestLabel: string;
    interest: number | null;
    rateLine: string;
    compoundingLine: string;
  };

  items: MobileItem[];
  itemPhoto: string | null;
  photoAlt: string;
  onPhoto: () => void;
  remark: string | null;

  events: MobileEvent[];
  onAddTransaction: () => void;

  safety: {
    ltvLabel: string;
    /** Formatted, e.g. "54.2%" or "—". */
    ltvText: string;
    ltv: number | null;
    tier: MobileTier | null;
    rows: { label: string; value: React.ReactNode }[];
    note: { text: string; warn: boolean } | null;
  };

  customer: {
    href: string;
    name: string;
    region: string | null;
    openPledgeCount: number;
    mobile: string | null;
  };
}

/* -------------------------------------------------------------------------- */
/* Pieces                                                                      */
/* -------------------------------------------------------------------------- */
const iconBtn =
  "size-11 shrink-0 inline-flex items-center justify-center rounded-full border border-border bg-card text-foreground hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";

/** Header action: the 44px round icon with a small word under it. The whole
 *  column is the tap target; the circle keeps the focus ring. */
const labelledAction = "group shrink-0 inline-flex flex-col items-center gap-1 focus-visible:outline-none";
const labelledCircle =
  "size-11 inline-flex items-center justify-center rounded-full border border-border bg-card text-foreground group-hover:bg-accent transition-colors group-focus-visible:ring-[3px] group-focus-visible:ring-ring/50";
const actionLabel = "text-[11px] font-semibold leading-none text-muted-foreground";

const FIT_MAX = 40;
const FIT_MIN = 28;

/** The hero total on one line: 40px when it fits, shrinking to no less than
 *  28px for long amounts. Never wraps mid-number. */
function FitAmount({ children }: { children: string }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [size, setSize] = useState(FIT_MAX);

  useLayoutEffect(() => {
    const box = boxRef.current;
    const text = textRef.current;
    if (!box || !text) return;
    const fit = () => {
      const current = parseFloat(getComputedStyle(text).fontSize) || FIT_MAX;
      const naturalAtMax = (text.scrollWidth * FIT_MAX) / current;
      const next = naturalAtMax <= box.clientWidth
        ? FIT_MAX
        : Math.max(FIT_MIN, Math.floor((FIT_MAX * box.clientWidth) / naturalAtMax));
      setSize(next);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(box);
    return () => ro.disconnect();
  }, [children]);

  return (
    <div ref={boxRef} className="mt-1 min-w-0">
      <span
        ref={textRef}
        className="block whitespace-nowrap font-bold leading-none tabular-nums"
        style={{ fontSize: size }}
      >
        {children}
      </span>
    </div>
  );
}

function SectionHeading({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-2.5">
      <h2 className="text-[15px] font-bold text-foreground">{children}</h2>
      {aside}
    </div>
  );
}

/** 64px photo square: tappable when there is a photo, a plain placeholder when not. */
function PhotoThumb({ src, alt, onOpen }: { src: string | null; alt: string; onOpen: () => void }) {
  if (!src) {
    return (
      <div className="size-16 shrink-0 rounded-[14px] bg-muted text-muted-foreground flex flex-col items-center justify-center gap-0.5">
        <ImageOff size={18} aria-hidden />
        <span className="text-[10px] font-semibold">No photo</span>
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="View full-size photo"
      className="size-16 shrink-0 overflow-hidden rounded-[14px] bg-muted focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="size-full object-cover" />
    </button>
  );
}

const EVENT_ICON: Record<MobileEventKind, React.ComponentType<{ size?: number; "aria-hidden"?: boolean }>> = {
  out: ArrowUpRight,
  in: ArrowDownLeft,
  released: Unlock,
  sold: Archive,
};

/** Three zones on the app's own boundaries: safe ≤ SAFE, caution up to AT_RISK, risk above. */
function SafetyBar({ ltv }: { ltv: number }) {
  const safe = RISK_TIER_BOUNDARIES.SAFE;
  const risk = RISK_TIER_BOUNDARIES.AT_RISK;
  const fill = Math.min(Math.max(ltv, 0), 100);
  return (
    <div role="img" aria-label={`LTV ${ltv.toFixed(1)}%. Caution from ${safe}%, risk above ${risk}%.`}>
      {/* Ticks sit outside the clipped track so they can stand proud of it,
          the same marker as the desktop bar. */}
      <div className="relative">
        <div className="relative h-2.5 rounded-full overflow-hidden bg-muted">
          <span aria-hidden className="absolute inset-y-0 bg-risk-medium-surface" style={{ left: `${safe}%`, width: `${risk - safe}%` }} />
          <span aria-hidden className="absolute inset-y-0 right-0 bg-risk-critical-surface" style={{ left: `${risk}%` }} />
          <span aria-hidden className="absolute inset-y-0 left-0 rounded-full bg-primary" style={{ width: `${fill}%` }} />
        </div>
        {[safe, risk].map((b) => (
          <span
            key={b}
            aria-hidden
            className="absolute -top-1 -bottom-1 w-0.5 -translate-x-1/2 rounded-full bg-foreground/60"
            style={{ left: `${b}%` }}
          />
        ))}
      </div>
      <div aria-hidden className="relative h-4 mt-1.5 text-[11px] font-semibold text-muted-foreground tabular-nums">
        <span className="absolute left-0">0%</span>
        <span className="absolute -translate-x-1/2" style={{ left: `${safe}%` }}>{safe}</span>
        <span className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `${risk}%` }}>{risk} · risk</span>
      </div>
    </div>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? "" : "";
  return (first + last).toUpperCase();
}

/* ========================================================================== */
/* Layout                                                                      */
/* ========================================================================== */
export default function PledgeDetailMobile(p: PledgeDetailMobileProps) {
  const single = p.items.length === 1;

  return (
    <>
      {/* The shell's <main> supplies the side gutter. From md the column is
          capped and centred rather than stretched across a tablet. */}
      <div className="lg:hidden max-w-[640px] mx-auto pt-4 pb-6 text-foreground flex flex-col gap-6">

        {/* ── Header ── */}
        <header className="flex items-start gap-3">
          <Link href={p.backHref} aria-label={p.backLabel} className={iconBtn}>
            <ArrowLeft size={18} />
          </Link>
          <div className="min-w-0 flex-1 pt-0.5">
            <h1 className="text-[20px] leading-tight font-bold text-foreground break-words">{p.title}</h1>
            {/* Every part stays whole and carries a leading "·" in a fixed
                12px slot. The row is pulled 12px left inside a clipped box, so
                the dot of whichever part starts a line falls outside it: a
                wrapped line never starts (or ends) with "·". */}
            <p className="mt-1 overflow-hidden text-[13px] text-muted-foreground">
              <span className="-ml-3 flex flex-wrap">
                {[p.pledgedOn, ...p.weightParts].map((part) => (
                  <span key={part} className="inline-flex whitespace-nowrap tabular-nums">
                    <span aria-hidden className="w-3 shrink-0 text-center">·</span>
                    {part}
                  </span>
                ))}
              </span>
            </p>
          </div>
          <div className="flex items-start gap-2 shrink-0">
            <button type="button" onClick={p.onReceipt} aria-label="Receipt" className={labelledAction}>
              <span className={labelledCircle}><ReceiptText size={18} aria-hidden /></span>
              <span aria-hidden className={actionLabel}>Receipt</span>
            </button>
            {p.isOpen && (
              <Link href={p.sellHref} aria-label="Move to inventory" className={labelledAction}>
                <span className={labelledCircle}><Archive size={18} aria-hidden /></span>
                <span aria-hidden className={actionLabel}>Inventory</span>
              </Link>
            )}
          </div>
        </header>

        {/* ── Hero: amount due ── */}
        <section className="rounded-[24px] bg-primary text-primary-foreground p-5">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/15 px-2.5 py-1 text-[12px] font-bold">
              <span aria-hidden className="size-1.5 rounded-full bg-primary-foreground" />
              {p.hero.statusLabel}
            </span>
            <span className="text-[13px] font-semibold opacity-90 tabular-nums">{p.hero.ageLabel}</span>
          </div>

          <p className="mt-5 text-[13px] font-semibold opacity-90">{p.hero.amountLabel}</p>
          <FitAmount>{fmtINR(p.hero.amount)}</FitAmount>

          <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-primary-foreground/25 pt-4">
            <div className="min-w-0">
              <dt className="text-[12px] opacity-90">Principal</dt>
              <dd className="text-[16px] font-bold tabular-nums break-words">{fmtINR(p.hero.principal)}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-[12px] opacity-90">{p.hero.interestLabel}</dt>
              <dd className="text-[16px] font-bold tabular-nums break-words">{fmtINR(p.hero.interest)}</dd>
            </div>
          </dl>

          <p className="mt-4 text-[13px] opacity-90 tabular-nums">{p.hero.rateLine}</p>
          <p className="text-[12px] opacity-90">{p.hero.compoundingLine}</p>
        </section>

        {/* ── Items ── */}
        <section>
          <SectionHeading>Items · {p.items.length}</SectionHeading>
          <div className="flex flex-col gap-3">
            {/* One photo per pledge: on the card when there is one item,
                otherwise once, above the cards. */}
            {!single && (
              <Card>
                <div className="p-4 flex items-center gap-3">
                  <PhotoThumb src={p.itemPhoto} alt={p.photoAlt} onOpen={p.onPhoto} />
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-foreground">Pledge photo</p>
                    <p className="text-[12px] text-muted-foreground">
                      {p.itemPhoto ? "One photo for all items · tap to view" : "No photo was added."}
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {p.items.length === 0 && (
              <Card>
                <p className="p-4 text-[13px] text-muted-foreground text-center">No items recorded.</p>
              </Card>
            )}

            {p.items.map((i) => {
              const kind = metalKind(i.metalType);
              return (
                <Card key={i.id}>
                  <div className="p-4 flex items-start gap-3">
                    {single && <PhotoThumb src={p.itemPhoto} alt={p.photoAlt} onOpen={p.onPhoto} />}
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-bold text-foreground break-words">{i.itemName || i.itemType}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted-foreground">
                        <MetalBadge metal={i.metalType} />
                        {i.itemName && <span>{i.itemType}</span>}
                        <span className="tabular-nums">Qty {i.quantity}</span>
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[18px] font-bold text-foreground tabular-nums leading-tight">{fmtGrams(i.netWeightOfMetal)}</p>
                      <p className="text-[11px] text-muted-foreground">{METAL_LABEL[kind].toLowerCase()} metal</p>
                    </div>
                  </div>
                  <dl className="grid grid-cols-3 gap-2 border-t border-border px-4 py-3">
                    <div className="min-w-0">
                      <dt className="text-[11px] text-muted-foreground">Gross wt</dt>
                      <dd className="text-[13px] font-semibold tabular-nums">{fmtGrams(i.grossWeight)}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-[11px] text-muted-foreground">Net wt</dt>
                      <dd className="text-[13px] font-semibold tabular-nums">{i.netWeight !== null ? fmtGrams(i.netWeight) : "—"}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-[11px] text-muted-foreground">Purity</dt>
                      <dd className="text-[13px] font-semibold tabular-nums">{i.purity}%</dd>
                    </div>
                  </dl>
                </Card>
              );
            })}

            {p.remark && (
              <p className="px-1 text-[13px] text-muted-foreground break-words">
                <span className="font-semibold text-foreground">Remark:</span> {p.remark}
              </p>
            )}
          </div>
        </section>

        {/* ── Activity ── */}
        <section>
          <SectionHeading
            aside={p.isOpen && (
              <button
                type="button"
                onClick={p.onAddTransaction}
                className="min-h-11 -mr-2 px-2 inline-flex items-center gap-1.5 rounded-full text-[13px] font-bold text-primary hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <Plus size={15} aria-hidden /> Add transaction
              </button>
            )}
          >
            Activity
          </SectionHeading>
          <Card>
            <ol>
              {p.events.map((e) => {
                const Icon = EVENT_ICON[e.kind];
                return (
                  <li key={e.key} className="flex items-center gap-3 px-4 py-3 border-t border-border first:border-t-0">
                    <span className="size-9 shrink-0 rounded-full bg-muted text-muted-foreground inline-flex items-center justify-center">
                      <Icon size={16} aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-semibold text-foreground">{e.title}</p>
                      <p className="text-[12px] text-muted-foreground break-words">{e.sub}</p>
                    </div>
                    <span className="text-[14px] font-bold text-foreground tabular-nums shrink-0">{fmtINR(e.amount)}</span>
                  </li>
                );
              })}
            </ol>
          </Card>
        </section>

        {/* ── Loan safety ── */}
        <section>
          <SectionHeading>Loan safety</SectionHeading>
          <Card>
            <div className="p-4 flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[13px] text-muted-foreground">{p.safety.ltvLabel}</p>
                  <p className="mt-0.5 text-[30px] font-bold leading-tight tabular-nums">{p.safety.ltvText}</p>
                </div>
                {p.safety.tier && <StatusBadge tone={p.safety.tier.tone}>{p.safety.tier.label}</StatusBadge>}
              </div>

              {p.safety.ltv !== null && <SafetyBar ltv={p.safety.ltv} />}

              <dl>
                {p.safety.rows.map((r) => (
                  <Row key={r.label} label={r.label} value={r.value} />
                ))}
              </dl>

              {p.safety.note && (
                <p
                  className={cn(
                    "flex items-start gap-2 px-3 py-2 rounded-[12px] text-[12px] font-semibold",
                    p.safety.note.warn
                      ? "bg-risk-medium-surface text-risk-medium-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  <Clock size={14} className="mt-px shrink-0" aria-hidden />
                  <span>{p.safety.note.text}</span>
                </p>
              )}
            </div>
          </Card>
        </section>

        {/* ── Customer ── */}
        <section>
          <SectionHeading>Customer</SectionHeading>
          <Card>
            <div className="flex items-center gap-2 pr-4">
              <Link
                href={p.customer.href}
                className="min-w-0 flex-1 flex items-center gap-3 p-4 hover:bg-accent/50 transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/50"
              >
                <span aria-hidden className="size-12 shrink-0 rounded-full bg-secondary text-secondary-foreground inline-flex items-center justify-center text-[15px] font-bold">
                  {initials(p.customer.name)}
                </span>
                <span className="min-w-0">
                  <span className="block text-[15px] font-bold text-foreground break-words">{p.customer.name}</span>
                  {/* Each part stays whole; a wrap starts the new line with "·". */}
                  <span className="flex flex-wrap gap-x-1.5 text-[13px] text-muted-foreground">
                    {p.customer.region?.trim() && <span className="break-words">{p.customer.region.trim()}</span>}
                    <span className="whitespace-nowrap tabular-nums">
                      {p.customer.region?.trim() && <span aria-hidden>· </span>}
                      {p.customer.openPledgeCount} active pledge{p.customer.openPledgeCount === 1 ? "" : "s"}
                    </span>
                  </span>
                </span>
              </Link>
              {p.customer.mobile && (
                <a href={`tel:${p.customer.mobile}`} aria-label={`Call ${p.customer.name}`} className={iconBtn}>
                  <Phone size={18} />
                </a>
              )}
            </div>
          </Card>
        </section>
      </div>

      {/* ── Release — open pledges only; closed pledges have no bar, as before ── */}
      {p.isOpen && (
        <StickyActions className="lg:hidden" contentMaxWidth={640}>
          <Link href={p.releaseHref} className={cn(btnPrimary, "flex-1 px-4 tabular-nums")}>
            <Lock size={15} aria-hidden /> Release · {fmtINR(p.hero.amount)}
          </Link>
        </StickyActions>
      )}
    </>
  );
}
