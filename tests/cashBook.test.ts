// Cash book — pure rules (lib/cashBookShared.ts): input parsing and the
// opening / expected-drawer arithmetic. Offline; runs in CI.
// The SQL, locking and per-action writes are covered end to end by
// tests/cashBook.db.test.ts (dev DB, `npm run test:db`).
import { describe, it, expect } from "vitest";
import {
  parseCashAmount,
  parseCashDirection,
  parseCashMode,
  parseCashNote,
  isIsoDay,
  resolveDay,
  cashEntryTitle,
  num,
  fmtSigned,
} from "@/lib/cashBookShared";
import { fmtINR } from "@/components/ui/DetailParts";

describe("parseCashAmount", () => {
  it("accepts up to 2 decimals and returns the canonical string", () => {
    expect(parseCashAmount("250")).toEqual({ ok: true, value: "250.00" });
    expect(parseCashAmount("250.5")).toEqual({ ok: true, value: "250.50" });
    expect(parseCashAmount(1200.75)).toEqual({ ok: true, value: "1200.75" });
    expect(parseCashAmount(" 99.99 ")).toEqual({ ok: true, value: "99.99" });
  });
  it("rejects more decimals, signs, exponents, junk", () => {
    for (const v of ["1.234", "-5", "1e3", "abc", "", "1,000", NaN, Infinity, null, undefined, {}])
      expect(parseCashAmount(v).ok).toBe(false);
    expect(parseCashAmount(0.1 + 0.2).ok).toBe(false); // 0.30000000000000004
  });
  it("caps at ₹10,00,00,000", () => {
    expect(parseCashAmount("100000000").ok).toBe(true);
    expect(parseCashAmount("100000000.01").ok).toBe(false);
  });
  it("zero only when allowed", () => {
    expect(parseCashAmount("0").ok).toBe(false);
    expect(parseCashAmount("0", { allowZero: true })).toEqual({ ok: true, value: "0.00" });
  });
});

describe("direction / mode / note / date", () => {
  it("fixed lists only", () => {
    expect(parseCashDirection("IN").ok).toBe(true);
    expect(parseCashDirection("in").ok).toBe(false);
    expect(parseCashMode("UPI").ok).toBe(true);
    expect(parseCashMode("CARD").ok).toBe(false);
  });
  it("note trims, blanks to null, caps at 500", () => {
    expect(parseCashNote(undefined)).toEqual({ ok: true, value: null });
    expect(parseCashNote("   ")).toEqual({ ok: true, value: null });
    expect(parseCashNote(" chai ")).toEqual({ ok: true, value: "chai" });
    expect(parseCashNote("x".repeat(500)).ok).toBe(true);
    expect(parseCashNote("x".repeat(501)).ok).toBe(false);
    expect(parseCashNote(5).ok).toBe(false);
  });
  it("strict calendar dates", () => {
    expect(isIsoDay("2026-11-01")).toBe(true);
    expect(isIsoDay("2026-02-31")).toBe(false);
    expect(isIsoDay("2026-11-1")).toBe(false);
    expect(isIsoDay(null)).toBe(false);
  });
});

describe("resolveDay", () => {
  const base = { carriedOpening: null, openingOverride: null, cashIn: "0.00", cashOut: "0.00", countedCash: null };

  it("first day ever: no opening, no expected", () => {
    expect(resolveDay(base)).toMatchObject({ opening: null, expected: null, countDifference: null, negativeDrawer: false });
  });
  it("first day once the owner sets an opening: not 'edited'", () => {
    const r = resolveDay({ ...base, openingOverride: "1000.00", cashIn: "500.00", cashOut: "200.00" });
    expect(r).toMatchObject({ opening: "1000.00", openingEdited: false, expected: "1300.00" });
  });
  it("carried opening drives expected; exact in paise", () => {
    const r = resolveDay({ ...base, carriedOpening: "0.10", cashIn: "0.20", cashOut: "0.00" });
    expect(r.expected).toBe("0.30");
  });
  it("an edit differing from the carried value is flagged with the difference", () => {
    expect(resolveDay({ ...base, carriedOpening: "1300.00", openingOverride: "1400.00" }))
      .toMatchObject({ opening: "1400.00", openingEdited: true, openingDifference: "100.00" });
    expect(resolveDay({ ...base, carriedOpening: "1300.00", openingOverride: "1300.00" }).openingEdited).toBe(false);
  });
  it("count vs expected, and the negative drawer flag", () => {
    expect(resolveDay({ ...base, carriedOpening: "1000.00", cashIn: "250.00", countedCash: "1240.00" }))
      .toMatchObject({ expected: "1250.00", countDifference: "-10.00", negativeDrawer: false });
    expect(resolveDay({ ...base, carriedOpening: "100.00", cashOut: "500.00" }))
      .toMatchObject({ expected: "-400.00", negativeDrawer: true });
  });
});

describe("cashEntryTitle", () => {
  it("a ₹0 pledge sale reads as a settlement", () => {
    expect(cashEntryTitle("PLEDGE_SOLD", "0.00")).toBe("Debt settled, no cash");
    expect(cashEntryTitle("PLEDGE_SOLD", "10.00")).toBe("Pledge sold to shop");
    expect(cashEntryTitle("MANUAL", "0.00")).toBe("Manual entry");
  });
});

describe("display helpers", () => {
  it("num keeps null, parses money strings", () => {
    expect(num(null)).toBeNull();
    expect(num("1250.50")).toBe(1250.5);
  });
  it("fmtSigned: + for positive, − for negative, none for zero", () => {
    expect(fmtSigned("100.00")).toBe(`+${fmtINR(100)}`);
    expect(fmtSigned("-10.00")).toBe(`−${fmtINR(10)}`);
    expect(fmtSigned("0.00")).toBe(fmtINR(0));
  });
});
