// lib/inventorySourceParam.ts
//
// The inventory list's source filter in the page URL: `?sourceType=PLEDGE_SALE`
// or `?sourceType=DIRECT_PURCHASE` (the InventoryItem.sourceType values, so a
// link like the bulk-forfeit toast's can name them directly). Anything else —
// absent, lower-case, unknown — means no filter. Client-safe.

export type SourceFilter = "all" | "pledge" | "direct";

/** URL value → the page's source filter. */
export function sourceFilterFromParam(value: string | null | undefined): SourceFilter {
  if (value === "PLEDGE_SALE") return "pledge";
  if (value === "DIRECT_PURCHASE") return "direct";
  return "all";
}

/** The page's source filter → URL value, or null to leave it out. */
export function sourceParamFromFilter(filter: SourceFilter): "PLEDGE_SALE" | "DIRECT_PURCHASE" | null {
  if (filter === "pledge") return "PLEDGE_SALE";
  if (filter === "direct") return "DIRECT_PURCHASE";
  return null;
}

/**
 * The current query string with `sourceType` set for `filter` (or removed for
 * "all"), other params kept. Returns "" when nothing is left.
 */
export function withSourceParam(search: string, filter: SourceFilter): string {
  const p = new URLSearchParams(search);
  const value = sourceParamFromFilter(filter);
  if (value) p.set("sourceType", value);
  else p.delete("sourceType");
  const qs = p.toString();
  return qs ? `?${qs}` : "";
}
