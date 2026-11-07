// valueToday — the inventory item and sell pages' market value at today's
// price. A mixed gold + silver item must be valued on both metals.
import { describe, it, expect } from "vitest";
import { valueToday, type Item, type MarketRates } from "@/components/inventory/inventoryItem";

const item = (over: Partial<Item>): Item => ({
  id: "inv_1", sourceType: "PLEDGE_SALE", status: "IN_STOCK", description: "Ring + Anklet (2 items)",
  itemType: "Ring", metalType: "GOLD", purity: null, grossWeight: 1112,
  netWeightOfGold: 0, netWeightOfSilver: 0, photoUrl: null, acquiredAt: "2026-11-01T00:00:00.000Z",
  acquiredCost: 50000, amountOwedAt: 50000, acquiredMetalRate: 10000, sellerName: null, sellerIdNum: null,
  soldAt: null, soldPrice: null, buyerName: null, buyerMobile: null, saleNotes: null, notes: null, sourcePledge: null,
  ...over,
});
const at = "2026-11-06T00:00:00.000Z";
const RATES: MarketRates = { gold: { inrPerGram: 10000, createdAt: at }, silver: { inrPerGram: 100, createdAt: at } };

describe("valueToday", () => {
  it("mixed 10 g gold + 1,000 g silver is valued on both metals, whatever metalType says", () => {
    const mixed = item({ netWeightOfGold: 10, netWeightOfSilver: 1000 });
    expect(valueToday(mixed, RATES)).toBeCloseTo(10 * 10000 + 1000 * 100, 6);
    expect(valueToday({ ...mixed, metalType: "SILVER" }, RATES)).toBeCloseTo(10 * 10000 + 1000 * 100, 6);
  });

  it("a mixed item with one metal unpriced is not valued (no partial value)", () => {
    const mixed = item({ netWeightOfGold: 10, netWeightOfSilver: 1000 });
    expect(valueToday(mixed, { ...RATES, silver: null })).toBeNull();
  });

  it("an item holding neither metal is not valued", () => {
    expect(valueToday(item({ metalType: "Other" }), RATES)).toBeNull();
  });
});
