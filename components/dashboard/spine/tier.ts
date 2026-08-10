// Shared risk-tier vocabulary for the aging spine.
//
// Tier VALUES come from getRiskTier (lib/calculateLTV) — this module never
// re-derives them from an LTV number. It only maps an already-computed tier to
// its presentation: token names, glyph, and label (Invariant 8).
//
// Every tier carries a non-color channel (glyph + label) because risk drives
// money decisions and is read at a glance; color is never load-bearing here.

import { Shield, Eye, AlertTriangle, AlertOctagon, type LucideIcon } from "lucide-react";

export type RiskTier = "SAFE" | "WATCH" | "AT_RISK" | "UNDERWATER";

export interface TierPresentation {
  label: string;
  Icon: LucideIcon;
  /** Solid tier color — bar fills, glyphs on surface. */
  color: string;
  /** Tinted ground for badges. */
  surface: string;
  /** Readable ink on `surface`. */
  foreground: string;
}

const TIERS: Record<RiskTier, TierPresentation> = {
  SAFE: {
    label: "Safe",
    Icon: Shield,
    color: "var(--risk-low)",
    surface: "var(--risk-low-surface)",
    foreground: "var(--risk-low-foreground)",
  },
  WATCH: {
    label: "Watch",
    Icon: Eye,
    color: "var(--risk-medium)",
    surface: "var(--risk-medium-surface)",
    foreground: "var(--risk-medium-foreground)",
  },
  AT_RISK: {
    label: "At risk",
    Icon: AlertTriangle,
    color: "var(--risk-high)",
    surface: "var(--risk-high-surface)",
    foreground: "var(--risk-high-foreground)",
  },
  UNDERWATER: {
    label: "Underwater",
    Icon: AlertOctagon,
    color: "var(--risk-critical)",
    surface: "var(--risk-critical-surface)",
    foreground: "var(--risk-critical-foreground)",
  },
};

/** Presentation for a known tier. */
export function tierOf(tier: RiskTier): TierPresentation {
  return TIERS[tier];
}

/**
 * Presentation for a tier that may be absent — a pledge the risk cron has not
 * evaluated yet, or a book with no metal price on record. Renders as an
 * explicit unknown rather than defaulting to Safe.
 */
export const UNKNOWN_TIER: TierPresentation = {
  label: "Not yet valued",
  Icon: Shield,
  color: "var(--muted-foreground-subtle)",
  surface: "var(--muted)",
  foreground: "var(--muted-foreground)",
};

export function tierOrUnknown(tier: RiskTier | null): TierPresentation {
  return tier === null ? UNKNOWN_TIER : TIERS[tier];
}

/** Exact rupees. Abbreviation hides interest accrual when amounts are close. */
export const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
