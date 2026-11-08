// Client-side bulk-forfeit rules: chips, select-all cap, price checks, totals.
import { describe, it, expect } from "vitest";
import {
  MAX_FORFEIT_BATCH,
  tierKey,
  selectAllShown,
  checkForfeitPrice,
  isEdited,
  owedInput,
  reviewTotals,
  forfeitRequestItems,
} from "@/lib/forfeitReview";

describe("tierKey", () => {
  it("maps the four tiers and null → UNKNOWN", () => {
    expect(tierKey("UNDERWATER")).toBe("UNDERWATER");
    expect(tierKey("AT_RISK")).toBe("AT_RISK");
    expect(tierKey(null)).toBe("UNKNOWN");
    expect(tierKey("CRITICAL")).toBe("UNKNOWN");
  });
});

describe("selectAllShown", () => {
  const rows = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ pledgeId: `p${String(i).padStart(3, "0")}`, ltv: i % 7 === 0 ? null : i }));

  it("≤ max: every shown row, not capped", () => {
    const r = rows(5);
    expect(selectAllShown(r)).toEqual({ ids: r.map((x) => x.pledgeId), capped: false });
  });

  it("> max: the first 100 by highest LTV, nulls last", () => {
    const r = rows(150);
    const { ids, capped } = selectAllShown(r);
    expect(capped).toBe(true);
    expect(ids).toHaveLength(MAX_FORFEIT_BATCH);
    const picked = new Set(ids);
    const minPicked = Math.min(...r.filter((x) => picked.has(x.pledgeId)).map((x) => x.ltv ?? -1));
    // No unpicked priced row is riskier than the least risky picked row.
    expect(r.filter((x) => !picked.has(x.pledgeId) && x.ltv !== null).every((x) => x.ltv! <= minPicked)).toBe(true);
    expect(r.filter((x) => picked.has(x.pledgeId)).some((x) => x.ltv === null)).toBe(false);
  });

  it("> max: same pick whatever the input order", () => {
    const r = rows(150);
    expect(selectAllShown([...r].reverse()).ids.sort()).toEqual(selectAllShown(r).ids.sort());
  });
});

describe("checkForfeitPrice", () => {
  const owed = 49620.5;

  it("accepts 0, the exact owed, and values in between (commas ok)", () => {
    expect(checkForfeitPrice("0", owed)).toEqual({ ok: true, value: 0 });
    expect(checkForfeitPrice("49620.50", owed)).toEqual({ ok: true, value: 49620.5 });
    expect(checkForfeitPrice("49,000", owed)).toEqual({ ok: true, value: 49000 });
  });

  it("rejects above owed with the owed amount in the message", () => {
    const c = checkForfeitPrice("49620.51", owed);
    expect(c.ok).toBe(false);
    if (!c.ok) expect(c.message).toContain("49,620.50");
  });

  it("rejects negative, empty, 3 dp and junk", () => {
    expect(checkForfeitPrice("-1", owed)).toMatchObject({ ok: false, message: "Price can't be negative." });
    expect(checkForfeitPrice("", owed).ok).toBe(false);
    expect(checkForfeitPrice("10.123", owed).ok).toBe(false);
    expect(checkForfeitPrice("abc", owed).ok).toBe(false);
  });
});

describe("isEdited / owedInput", () => {
  it("the default is not edited; 1,12,480 = 112480.00", () => {
    expect(isEdited(owedInput(112480), 112480)).toBe(false);
    expect(isEdited("1,12,480", 112480)).toBe(false);
    expect(isEdited("100000", 112480)).toBe(true);
    expect(isEdited("", 112480)).toBe(true);
  });
});

describe("reviewTotals", () => {
  it("all valid: cost and written off", () => {
    const t = reviewTotals([
      { owed: 112480, input: "112480.00" },
      { owed: 210450, input: "200000" },
    ]);
    expect(t).toEqual({ count: 2, totalOwed: 322930, totalCost: 312480, writtenOff: 10450, invalid: 0 });
  });

  it("any invalid row: cost is null, written off sums the valid rows", () => {
    const t = reviewTotals([
      { owed: 210450, input: "200000" },
      { owed: 49620, input: "52000" },
    ]);
    expect(t.totalCost).toBeNull();
    expect(t.writtenOff).toBe(10450);
    expect(t.invalid).toBe(1);
    expect(t.totalOwed).toBe(260070);
  });

  it("sums in paise (0.1 + 0.2 style drift)", () => {
    const t = reviewTotals([{ owed: 0.1, input: "0" }, { owed: 0.2, input: "0" }]);
    expect(t.totalOwed).toBe(0.3);
    expect(t.writtenOff).toBe(0.3);
  });
});

describe("forfeitRequestItems", () => {
  it("unedited rows send no buyPrice; edited rows send the number", () => {
    expect(forfeitRequestItems([
      { pledgeId: "a", owed: 100, input: "100.00" },
      { pledgeId: "b", owed: 100, input: "75.5" },
    ])).toEqual([{ pledgeId: "a" }, { pledgeId: "b", buyPrice: 75.5 }]);
  });

  it("throws on an invalid row", () => {
    expect(() => forfeitRequestItems([{ pledgeId: "a", owed: 100, input: "101" }])).toThrow("INVALID_PRICE");
  });
});
