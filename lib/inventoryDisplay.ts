/**
 * Display rules for an inventory item's metal, purity and weight — pure, no
 * React, so the pages and the server-side PDF share one implementation.
 * Everything here is derived at display time; stored values (metalType,
 * purity, weights) are never rewritten.
 */

type Numberish = number | string | null | undefined;

const num = (v: Numberish): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/* -------------------------------------------------------------------------- */
/* Metal                                                                       */
/* -------------------------------------------------------------------------- */
export type MetalKind = "GOLD" | "SILVER" | "OTHER";
export type MetalDisplay = MetalKind | "MIXED";

/** Display-only case normalisation: "GOLD", "Gold" and "gold" are all GOLD.
 *  Stored values are never rewritten (pledge items store the enum in caps,
 *  direct purchases store title case). */
export function metalKind(metal: string): MetalKind {
  const m = metal.trim().toUpperCase();
  return m === "GOLD" || m === "SILVER" ? m : "OTHER";
}

/**
 * What an inventory item holds: MIXED when it carries both gold and silver
 * net weight (a mixed pledge sold to the shop — metalType names only the
 * first item's metal), otherwise its metalType.
 */
export function inventoryMetal(item: {
  metalType: string;
  netWeightOfGold: Numberish;
  netWeightOfSilver: Numberish;
}): MetalDisplay {
  if ((num(item.netWeightOfGold) ?? 0) > 0 && (num(item.netWeightOfSilver) ?? 0) > 0) return "MIXED";
  return metalKind(item.metalType);
}

export const METAL_LABEL: Record<MetalDisplay, string> = {
  GOLD:   "Gold",
  SILVER: "Silver",
  MIXED:  "Gold + Silver",
  OTHER:  "Other",
};

/* -------------------------------------------------------------------------- */
/* Purity                                                                      */
/* -------------------------------------------------------------------------- */
/** Standard gold purities, compared by value within PURITY_TOLERANCE. */
const GOLD_KARATS: [percent: number, karat: number][] = [
  [99.9, 24],
  [99.5, 24],
  [91.6, 22],
  [75,   18],
  [58.5, 14],
];
export const PURITY_TOLERANCE = 0.1;

function pct(p: number) {
  return `${p.toLocaleString("en-IN", { maximumFractionDigits: 3 })}%`;
}

/**
 * "22K (91.6%)" for standard gold, "83.3%" for other gold and for silver,
 * "Mixed purity" for a mixed item or a pledge item whose pieces differ
 * (stored purity null), "—" when there is no purity at all.
 */
export function formatPurity(args: {
  metal: MetalDisplay;
  purity: Numberish;
  sourceType?: string;
}): string {
  if (args.metal === "MIXED") return "Mixed purity";
  const p = num(args.purity);
  if (p === null) return args.sourceType === "PLEDGE_SALE" ? "Mixed purity" : "—";
  if (args.metal === "GOLD") {
    const karat = GOLD_KARATS.find(([std]) => Math.abs(p - std) <= PURITY_TOLERANCE)?.[1];
    if (karat !== undefined) return `${karat}K (${pct(p)})`;
  }
  return pct(p);
}

/* -------------------------------------------------------------------------- */
/* Weight                                                                      */
/* -------------------------------------------------------------------------- */
export function fmtGrams(g: number) {
  return `${g.toLocaleString("en-IN", { maximumFractionDigits: 3 })} g`;
}

/**
 * Inventory list weight cell: gross on top; below it the net weight of each
 * metal held ("Net: Au 10 g · Ag 1,000 g"), or null when the item holds
 * neither (e.g. a direct purchase of OTHER metal).
 */
export function weightText(item: {
  grossWeight: Numberish;
  netWeightOfGold: Numberish;
  netWeightOfSilver: Numberish;
}): { gross: string; net: string | null } {
  const gross = num(item.grossWeight);
  const gold = num(item.netWeightOfGold) ?? 0;
  const silver = num(item.netWeightOfSilver) ?? 0;
  const parts = [
    gold > 0 ? `Au ${fmtGrams(gold)}` : null,
    silver > 0 ? `Ag ${fmtGrams(silver)}` : null,
  ].filter(Boolean);
  return {
    gross: gross !== null ? fmtGrams(gross) : "—",
    net: parts.length > 0 ? `Net: ${parts.join(" · ")}` : null,
  };
}

/* -------------------------------------------------------------------------- */
/* Rate at purchase                                                            */
/* -------------------------------------------------------------------------- */
/**
 * Receipt "rate at purchase" rows. A mixed item sourced from a pledge shows
 * both metals' rates from the pledge's SOLD audit row, each labelled; every
 * other item shows its single acquiredMetalRate, as before.
 */
export function purchaseRateRows(args: {
  metal: MetalDisplay;
  metalType: string;
  acquiredMetalRate: Numberish;
  saleRates?: { gold: Numberish; silver: Numberish } | null;
}): { label: string; ratePerGram: number }[] {
  if (args.metal === "MIXED" && args.saleRates) {
    const gold = num(args.saleRates.gold);
    const silver = num(args.saleRates.silver);
    const rows = [
      gold !== null ? { label: "Gold rate at purchase", ratePerGram: gold } : null,
      silver !== null ? { label: "Silver rate at purchase", ratePerGram: silver } : null,
    ].filter((r): r is { label: string; ratePerGram: number } => r !== null);
    if (rows.length > 0) return rows;
  }
  const rate = num(args.acquiredMetalRate);
  return rate !== null
    ? [{ label: `${METAL_LABEL[metalKind(args.metalType)]} rate at purchase`, ratePerGram: rate }]
    : [];
}
