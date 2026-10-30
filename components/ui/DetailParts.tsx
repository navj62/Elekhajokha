/**
 * Shared building blocks for the record-detail pages (pledge detail,
 * inventory item detail): one card, one label/value row, one stat tile, one
 * set of formatters, so the two pages cannot drift apart.
 */
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* Formatting                                                                  */
/* -------------------------------------------------------------------------- */
/** Exact rupees. Unknown is always "—", never ₹0. */
export function fmtINR(n: number | null | undefined) {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 2,
  }).format(n);
}
export function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}
export function fmtGrams(g: number) {
  return `${g.toLocaleString("en-IN", { maximumFractionDigits: 3 })} g`;
}

/* -------------------------------------------------------------------------- */
/* Components                                                                  */
/* -------------------------------------------------------------------------- */
export function Card({ title, aside, children, className }: {
  title?: React.ReactNode;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("bg-card border border-border rounded-[24px] overflow-hidden", className)}>
      {title && (
        <div className="flex items-center justify-between gap-3 px-5 lg:px-6 pt-5 pb-3">
          <h2 className="text-[15px] font-bold text-foreground">{title}</h2>
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}

export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("text-[11px] font-bold tracking-wider uppercase text-muted-foreground-subtle", className)}>
      {children}
    </p>
  );
}

export type MetalKind = "GOLD" | "SILVER" | "OTHER";

/** Display-only case normalisation: "GOLD", "Gold" and "gold" are all GOLD.
 *  Stored values are never rewritten (pledge items store the enum in caps,
 *  direct purchases store title case). */
export function metalKind(metal: string): MetalKind {
  const m = metal.trim().toUpperCase();
  return m === "GOLD" || m === "SILVER" ? m : "OTHER";
}

const METAL_BADGE: Record<MetalKind, { label: string; className: string }> = {
  GOLD:   { label: "Gold",   className: "bg-gold-surface text-gold-foreground" },
  SILVER: { label: "Silver", className: "bg-silver-surface text-silver-foreground" },
  OTHER:  { label: "Other",  className: "bg-muted text-muted-foreground" },
};

export function MetalBadge({ metal }: { metal: string }) {
  const badge = METAL_BADGE[metalKind(metal)];
  return (
    <span className={cn(
      "inline-flex text-[11px] font-bold tracking-wide px-2 py-0.5 rounded-full",
      badge.className,
    )}>
      {badge.label}
    </span>
  );
}

export function StatTile({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="h-full bg-card border border-border rounded-[16px] px-4 py-3.5 min-w-0">
      <Eyebrow>{label}</Eyebrow>
      <p className="mt-1 text-[18px] font-bold text-foreground tabular-nums leading-tight">{value}</p>
      {sub && <p className="mt-0.5 text-[12px] text-muted-foreground-subtle">{sub}</p>}
    </div>
  );
}

/**
 * The one label/value row on a detail page: muted label left, bold value right.
 * Must sit inside a <dl>. The label takes the free space; the value keeps its
 * natural width up to 60% and wraps beyond that (long remarks), never truncates.
 */
export function Row({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3 border-t border-border first:border-t-0">
      <dt className="min-w-0 flex-[1_1_0%]">
        <span className="block text-[13px] text-muted-foreground">{label}</span>
        {sub && <span className="block text-[12px] text-muted-foreground-subtle">{sub}</span>}
      </dt>
      <dd className="min-w-0 max-w-[60%] text-right text-[14px] font-bold text-foreground tabular-nums break-words">
        {value}
      </dd>
    </div>
  );
}

const btnBase =
  "inline-flex min-h-11 items-center justify-center gap-2 px-5 rounded-full text-[13px] font-bold transition-opacity hover:opacity-90";
export const btnPrimary = `${btnBase} bg-primary text-primary-foreground`;
export const btnSecondary = `${btnBase} bg-secondary text-secondary-foreground`;
