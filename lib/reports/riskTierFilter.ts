// lib/reports/riskTierFilter.ts
//
// Risk-tier filter for the Active Pledges report. Client-safe (no Prisma) so
// the Reports page, the shared report query and the export all parse and label
// tiers the same way.
//
// The tier itself always comes from getRiskTier (which reads
// RISK_TIER_BOUNDARIES) applied to the LTV the report already computed via
// calculateLTV — no formula lives here. A pledge with no LTV (no metal price,
// or nothing to value) is UNKNOWN, never SAFE.
import { getRiskTier, type RiskTier } from "@/lib/calculateLTV";

export type ReportRiskTier = RiskTier | "UNKNOWN";

/** Canonical order — chips, the `tiers` param and file filter blocks all use it. */
export const REPORT_RISK_TIERS: readonly ReportRiskTier[] = ["SAFE", "WATCH", "AT_RISK", "UNDERWATER", "UNKNOWN"];

export const REPORT_RISK_TIER_LABEL: Record<ReportRiskTier, string> = {
  SAFE: "Safe",
  WATCH: "Watch",
  AT_RISK: "At Risk",
  UNDERWATER: "Underwater",
  UNKNOWN: "Unknown",
};

export function reportRiskTier(ltv: number | null): ReportRiskTier {
  return ltv === null ? "UNKNOWN" : getRiskTier(ltv);
}

/**
 * `tiers=AT_RISK,UNDERWATER` → ["AT_RISK", "UNDERWATER"]. Case-insensitive,
 * de-duplicated, returned in canonical order; unknown values are ignored, so a
 * bad or empty param means "no tier filter" rather than an error.
 */
export function parseRiskTiers(param: string | null | undefined): ReportRiskTier[] {
  if (!param) return [];
  const wanted = new Set(param.split(",").map((t) => t.trim().toUpperCase()));
  return REPORT_RISK_TIERS.filter((t) => wanted.has(t));
}

export function emptyRiskTierCounts(): Record<ReportRiskTier, number> {
  return { SAFE: 0, WATCH: 0, AT_RISK: 0, UNDERWATER: 0, UNKNOWN: 0 };
}

/** "Risk tiers: At Risk, Underwater" / "Risk tiers: All" — the files' filter block. */
export function riskTiersLabel(tiers: readonly ReportRiskTier[]): string {
  return `Risk tiers: ${tiers.length ? tiers.map((t) => REPORT_RISK_TIER_LABEL[t]).join(", ") : "All"}`;
}
