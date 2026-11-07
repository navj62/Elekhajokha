// Inventory display rules shared by the list, item, sell and receipt pages
// and the purchase-receipt PDF.
import { describe, it, expect } from "vitest";
import {
  inventoryMetal, metalKind, formatPurity, weightText, purchaseRateRows, METAL_LABEL, PURITY_TOLERANCE,
} from "@/lib/inventoryDisplay";

const metalOf = (metalType: string, gold: number | string, silver: number | string) =>
  inventoryMetal({ metalType, netWeightOfGold: gold, netWeightOfSilver: silver });

describe("inventoryMetal", () => {
  it("gold, silver and other follow metalType, case-insensitively", () => {
    for (const m of ["GOLD", "Gold", "gold", " gold "]) expect(metalOf(m, 9.16, 0)).toBe("GOLD");
    for (const m of ["SILVER", "Silver", "silver"]) expect(metalOf(m, 0, 40)).toBe("SILVER");
    for (const m of ["Other", "OTHER", "platinum", ""]) expect(metalOf(m, 0, 0)).toBe("OTHER");
  });

  it("both net weights > 0 → MIXED, whatever metalType says", () => {
    expect(metalOf("GOLD", 10, 1000)).toBe("MIXED");
    expect(metalOf("SILVER", "10.000", "1000.000")).toBe("MIXED"); // Decimal strings from the API
    expect(METAL_LABEL.MIXED).toBe("Gold + Silver");
  });

  it("one metal only is never MIXED; zero or missing weights don't count", () => {
    expect(metalOf("GOLD", 10, 0)).toBe("GOLD");
    expect(metalOf("GOLD", 10, "0.000")).toBe("GOLD");
    expect(inventoryMetal({ metalType: "Silver", netWeightOfGold: null, netWeightOfSilver: 5 })).toBe("SILVER");
  });

  it("metalKind never returns MIXED", () => {
    expect(metalKind("MIXED")).toBe("OTHER");
  });
});

describe("formatPurity", () => {
  const gold = (purity: number | string | null) => formatPurity({ metal: "GOLD", purity });

  it("maps each standard gold purity to karat + percent", () => {
    expect(gold(99.9)).toBe("24K (99.9%)");
    expect(gold(99.5)).toBe("24K (99.5%)");
    expect(gold(91.6)).toBe("22K (91.6%)");
    expect(gold(75)).toBe("18K (75%)");
    expect(gold(58.5)).toBe("14K (58.5%)");
  });

  it("matches by value within the tolerance (Decimal strings, 91.67, 91.60)", () => {
    expect(gold("91.600")).toBe("22K (91.6%)");
    expect(gold(91.67)).toBe("22K (91.67%)");
    expect(gold(75.05)).toBe("18K (75.05%)");
    expect(gold(91.6 + PURITY_TOLERANCE)).toMatch(/^22K/);
    expect(gold(91.6 + PURITY_TOLERANCE + 0.05)).toBe("91.75%");
  });

  it("non-standard gold → percent only", () => {
    expect(gold(83.3)).toBe("83.3%");
    expect(gold(95)).toBe("95%");
  });

  it("silver → percent only, even at a 'gold' value", () => {
    expect(formatPurity({ metal: "SILVER", purity: 92.5 })).toBe("92.5%");
    expect(formatPurity({ metal: "SILVER", purity: 91.6 })).toBe("91.6%");
  });

  it("mixed item → 'Mixed purity', even with a stored purity", () => {
    expect(formatPurity({ metal: "MIXED", purity: 100 })).toBe("Mixed purity");
    expect(formatPurity({ metal: "MIXED", purity: null })).toBe("Mixed purity");
  });

  it("null: 'Mixed purity' for a pledge item (pieces differ), '—' when there is genuinely none", () => {
    expect(formatPurity({ metal: "GOLD", purity: null, sourceType: "PLEDGE_SALE" })).toBe("Mixed purity");
    expect(formatPurity({ metal: "OTHER", purity: null, sourceType: "DIRECT_PURCHASE" })).toBe("—");
    expect(formatPurity({ metal: "GOLD", purity: "" })).toBe("—");
  });
});

describe("weightText", () => {
  it("mixed: gross on top, both nets below", () => {
    expect(weightText({ grossWeight: "1112.000", netWeightOfGold: "10.000", netWeightOfSilver: "1000.000" }))
      .toEqual({ gross: "1,112 g", net: "Net: Au 10 g · Ag 1,000 g" });
  });

  it("only the metals held", () => {
    expect(weightText({ grossWeight: 10, netWeightOfGold: 9.16, netWeightOfSilver: 0 }))
      .toEqual({ gross: "10 g", net: "Net: Au 9.16 g" });
    expect(weightText({ grossWeight: "50.5", netWeightOfGold: "0", netWeightOfSilver: "46.25" }))
      .toEqual({ gross: "50.5 g", net: "Net: Ag 46.25 g" });
  });

  it("no net weights (OTHER direct purchase) → gross only", () => {
    expect(weightText({ grossWeight: "5.125", netWeightOfGold: "0", netWeightOfSilver: "0" }))
      .toEqual({ gross: "5.125 g", net: null });
  });

  it("missing gross → '—'", () => {
    expect(weightText({ grossWeight: null, netWeightOfGold: 0, netWeightOfSilver: 0 }).gross).toBe("—");
  });
});

describe("purchaseRateRows", () => {
  it("mixed pledge item → both rates from the sale audit, labelled", () => {
    expect(purchaseRateRows({ metal: "MIXED", metalType: "GOLD", acquiredMetalRate: "10000", saleRates: { gold: "10000", silver: "100" } }))
      .toEqual([
        { label: "Gold rate at purchase", ratePerGram: 10000 },
        { label: "Silver rate at purchase", ratePerGram: 100 },
      ]);
  });

  it("single-metal item → its one acquired rate, unchanged", () => {
    expect(purchaseRateRows({ metal: "GOLD", metalType: "GOLD", acquiredMetalRate: "10000", saleRates: { gold: "10000", silver: "100" } }))
      .toEqual([{ label: "Gold rate at purchase", ratePerGram: 10000 }]);
    expect(purchaseRateRows({ metal: "SILVER", metalType: "Silver", acquiredMetalRate: 95 }))
      .toEqual([{ label: "Silver rate at purchase", ratePerGram: 95 }]);
  });

  it("mixed with no audit rates falls back to the acquired rate; no rate → no rows", () => {
    expect(purchaseRateRows({ metal: "MIXED", metalType: "GOLD", acquiredMetalRate: 10000, saleRates: null }))
      .toEqual([{ label: "Gold rate at purchase", ratePerGram: 10000 }]);
    expect(purchaseRateRows({ metal: "OTHER", metalType: "Other", acquiredMetalRate: null })).toEqual([]);
  });
});
