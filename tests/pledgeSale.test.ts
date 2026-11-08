// buildPledgeSale — the pure core shared by single sell-to-inventory and bulk
// forfeit. Asserts the exact rows a sale writes, with no database.
import { describe, it, expect } from "vitest";
import { Prisma } from "@prisma/client";
import { buildPledgeSale, type SaleItem, type PledgeSaleInput } from "@/lib/pledgeSale";
import { calculateHybridInterest } from "@/lib/interest";
import { CALCULATION_VERSION } from "@/lib/pledgeConstants";

const D = (v: string | number) => new Prisma.Decimal(v);
const PLEDGE_DATE = new Date("2026-01-01T00:00:00.000Z");
const SALE_DATE   = new Date("2026-07-01T00:00:00.000Z");
const PRICES      = { goldPpg: 10000, silverPpg: 100 };

const item = (over: Partial<SaleItem> = {}): SaleItem => ({
  itemType: "Ring", metalType: "GOLD", itemName: "Ring", purity: D("91.6"), grossWeight: D("10.000"),
  ...over,
});

function input(over: Partial<PledgeSaleInput> = {}, pledgeOver: Partial<PledgeSaleInput["pledge"]> = {}): PledgeSaleInput {
  return {
    ownerId: "user_1",
    pledge: {
      id: "pledge_1", customerId: "cust_1", customerName: "रमेश कुमार",
      loanAmount: D("50000"), interestRate: D("24"), pledgeDate: PLEDGE_DATE,
      allowCompounding: true, compoundingDuration: "YEARLY",
      netWeightOfGold: D("9.160"), netWeightOfSilver: D("0"), itemPhoto: null,
      ...pledgeOver,
    },
    items: [item()],
    saleDate: SALE_DATE,
    buyPrice: 60000,
    prices: PRICES,
    ...over,
  };
}

const owedOf = (i: PledgeSaleInput) =>
  calculateHybridInterest(
    Number(i.pledge.loanAmount), Number(i.pledge.interestRate), i.pledge.pledgeDate,
    i.saleDate, i.pledge.allowCompounding, i.pledge.compoundingDuration,
  ).receivableAmount;

describe("buildPledgeSale", () => {
  it("single item: description, type, metal, purity, weights and rate from the item", () => {
    const i = input({}, { itemPhoto: "https://x/p.jpg" });
    const s = buildPledgeSale(i);
    const owed = owedOf(i);

    expect(s.inventory).toMatchObject({
      ownerId: "user_1", sourceType: "PLEDGE_SALE", sourcePledgeId: "pledge_1",
      description: "Ring", itemType: "Ring", metalType: "GOLD", photoUrl: "https://x/p.jpg",
      acquiredAt: SALE_DATE, status: "IN_STOCK", notes: null,
    });
    expect(s.inventory.purity!.toFixed(2)).toBe("91.60");
    expect(s.inventory.grossWeight.toFixed(3)).toBe("10.000");
    expect(s.inventory.netWeightOfGold.toFixed(3)).toBe("9.160");
    expect(s.inventory.netWeightOfSilver.toFixed(3)).toBe("0.000");
    expect(s.inventory.acquiredMetalRate!.toNumber()).toBe(10000);
    expect(s.inventory.amountOwedAt.toNumber()).toBe(owed);

    expect(s.pledgeUpdate).toMatchObject({ status: "SOLD", releaseDate: SALE_DATE, calculationVersion: CALCULATION_VERSION });
    expect(s.pledgeUpdate.receivableAmount.toNumber()).toBe(owed);
    expect(s.pledgeUpdate.salePrice.toNumber()).toBe(60000);

    expect(s.audit).toMatchObject({ pledgeId: "pledge_1", action: "SOLD", releaseDate: SALE_DATE, calculationVersion: CALCULATION_VERSION });
    expect(s.audit.receivableAmount.toNumber()).toBe(owed);
    expect(s.audit.marketValueAtRelease!.toNumber()).toBeCloseTo(91600, 6);
    expect(s.audit.ltvAtRelease!.toNumber()).toBe(Math.round((owed / 91600) * 10000) / 100);
  });

  it("a single item with no name is described by its type", () => {
    expect(buildPledgeSale(input({ items: [item({ itemName: null })] })).inventory.description).toBe("Ring");
    expect(buildPledgeSale(input({ items: [item({ itemName: "  " })] })).inventory.description).toBe("Ring");
  });

  it("'Pledged item' only when there is no name and no type", () => {
    expect(buildPledgeSale(input({ items: [item({ itemName: null, itemType: "" })] })).inventory.description).toBe("Pledged item");
    expect(buildPledgeSale(input({ items: [] })).inventory.description).toBe("Pledged item");
  });

  it("two items, same purity: names joined, purity kept, gross summed", () => {
    const s = buildPledgeSale(input({
      items: [item(), item({ itemType: "Chain", itemName: "Chain", grossWeight: D("5.250") })],
    }));
    expect(s.inventory.description).toBe("Ring + Chain (2 items)");
    expect(s.inventory.itemType).toBe("Ring");
    expect(s.inventory.purity!.toFixed(2)).toBe("91.60");
    expect(s.inventory.grossWeight.toFixed(3)).toBe("15.250");
  });

  it("two items, different purity: purity null; unnamed item falls back to its type", () => {
    const s = buildPledgeSale(input({
      items: [item(), item({ itemType: "Chain", itemName: null, purity: D("75") })],
    }));
    expect(s.inventory.description).toBe("Ring + Chain (2 items)");
    expect(s.inventory.purity).toBeNull();
  });

  it("purity compares by value, not by string form (91.6 = 91.60)", () => {
    const s = buildPledgeSale(input({ items: [item({ purity: D("91.6") }), item({ purity: D("91.60") })] }));
    expect(s.inventory.purity!.toFixed(2)).toBe("91.60");
  });

  it("mixed gold + silver: both net weights copied, metal and rate from the first item", () => {
    const i = input(
      { items: [item(), item({ itemType: "Anklet", itemName: "Anklet", metalType: "SILVER", purity: D("80"), grossWeight: D("50") })] },
      { netWeightOfGold: D("9.160"), netWeightOfSilver: D("40.000") },
    );
    const s = buildPledgeSale(i);
    expect(s.inventory.metalType).toBe("GOLD");
    expect(s.inventory.acquiredMetalRate!.toNumber()).toBe(10000);
    expect(s.inventory.netWeightOfGold.toFixed(3)).toBe("9.160");
    expect(s.inventory.netWeightOfSilver.toFixed(3)).toBe("40.000");
    expect(s.inventory.grossWeight.toFixed(3)).toBe("60.000");
    expect(s.inventory.purity).toBeNull();
    expect(s.marketValue).toBeCloseTo(9.16 * 10000 + 40 * 100, 6);
    expect(s.audit.netWeightOfSilver.toFixed(3)).toBe("40.000");
  });

  it("10 g gold + 1,000 g silver: net weights come from the pledge totals, not items[0] or gross", () => {
    const i = input(
      {
        items: [
          item({ itemName: "Ring", grossWeight: D("12.000"), purity: D("100") }),
          item({ itemType: "Anklet", itemName: "Anklet", metalType: "SILVER", grossWeight: D("1100.000"), purity: D("100") }),
        ],
      },
      { netWeightOfGold: D("10.000"), netWeightOfSilver: D("1000.000") },
    );
    const s = buildPledgeSale(i);
    expect(s.inventory.netWeightOfGold.toFixed(3)).toBe("10.000");
    expect(s.inventory.netWeightOfSilver.toFixed(3)).toBe("1000.000");
    expect(s.inventory.grossWeight.toFixed(3)).toBe("1112.000");
    expect(s.marketValue).toBeCloseTo(PRICES.goldPpg * 10 + PRICES.silverPpg * 1000, 6);
    expect(s.audit.marketValueAtRelease!.toNumber()).toBeCloseTo(PRICES.goldPpg * 10 + PRICES.silverPpg * 1000, 6);
  });

  it("no price: market value, LTV, audit prices and metal rate are null", () => {
    const s = buildPledgeSale(input({ prices: { goldPpg: null, silverPpg: null } }));
    expect(s.marketValue).toBeNull();
    expect(s.ltv).toBeNull();
    expect(s.audit.goldPricePerGram).toBeNull();
    expect(s.audit.silverPricePerGram).toBeNull();
    expect(s.audit.marketValueAtRelease).toBeNull();
    expect(s.audit.ltvAtRelease).toBeNull();
    expect(s.inventory.acquiredMetalRate).toBeNull();
  });

  it("price only for a metal the pledge doesn't hold counts as no price", () => {
    const s = buildPledgeSale(input({ prices: { goldPpg: null, silverPpg: 100 } }));
    expect(s.marketValue).toBeNull();
    expect(s.ltv).toBeNull();
  });

  it("LTV is clamped to the Decimal(5,2) ceiling", () => {
    const s = buildPledgeSale(input({ prices: { goldPpg: 1, silverPpg: null } }));
    expect(s.ltv).toBe(999.99);
  });

  it("buyPrice = owed → cost = owed, ₹0 cash entry", () => {
    const base = input();
    const owed = owedOf(base);
    const s = buildPledgeSale({ ...base, buyPrice: owed });
    expect(s.inventory.acquiredCost.toNumber()).toBe(owed);
    expect(s.cashEntry).toMatchObject({
      kind: "PLEDGE_SOLD", direction: "OUT", partyName: "रमेश कुमार",
      customerId: "cust_1", pledgeId: "pledge_1", eventAt: SALE_DATE,
    });
    expect(s.cashEntry.amount.toFixed(2)).toBe("0.00");
  });

  it("buyPrice < owed → cost = buyPrice, still a ₹0 cash entry", () => {
    const s = buildPledgeSale(input({ buyPrice: 1234.5 }));
    expect(s.inventory.acquiredCost.toNumber()).toBe(1234.5);
    expect(s.inventory.amountOwedAt.toNumber()).toBe(owedOf(input()));
    expect(s.cashEntry.amount.toFixed(2)).toBe("0.00");
  });

  it("buyPrice > owed (single sell only) → cash = cost − owed", () => {
    const base = input();
    const s = buildPledgeSale(base);
    expect(s.cashEntry.amount.toFixed(2)).toBe(D(60000).minus(owedOf(base)).toFixed(2));
  });

  it("notes are trimmed; blank becomes null", () => {
    expect(buildPledgeSale(input({ notes: "  kept  " })).inventory.notes).toBe("kept");
    expect(buildPledgeSale(input({ notes: "   " })).inventory.notes).toBeNull();
  });
});
