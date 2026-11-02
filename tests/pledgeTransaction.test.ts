import { describe, it, expect } from "vitest";
import { transactionDateError } from "@/lib/pledgeTransaction";

// "Now" is 2026-11-02 10:00 IST; the pledge was booked on 2026-10-01
// (stored at UTC midnight, as the pledge form does).
const now = new Date("2026-11-02T04:30:00.000Z");
const pledgeDate = new Date("2026-10-01T00:00:00.000Z");
const check = (v: unknown) => transactionDateError(v, pledgeDate, now);

describe("transactionDateError", () => {
  it("accepts any IST day from the pledge date through today", () => {
    expect(check("2026-10-01")).toBeNull();
    expect(check("2026-10-15")).toBeNull();
    expect(check("2026-11-02")).toBeNull();
  });

  it("rejects anything that isn't a strict YYYY-MM-DD calendar date", () => {
    for (const v of ["2026-11-2", "02/11/2026", "2026-11-02T00:00:00Z", "2026-02-30", "", " 2026-11-02", 20261102, null, undefined]) {
      expect(check(v)).toMatch(/YYYY-MM-DD/);
    }
  });

  it("rejects a future day, judged in IST", () => {
    expect(check("2026-11-03")).toMatch(/future/);
    // 23:59 IST on the 2nd is still the 2nd; 00:01 IST on the 3rd makes the 3rd today.
    expect(transactionDateError("2026-11-03", pledgeDate, new Date("2026-11-02T18:29:00.000Z"))).toMatch(/future/);
    expect(transactionDateError("2026-11-03", pledgeDate, new Date("2026-11-02T18:31:00.000Z"))).toBeNull();
  });

  it("rejects a day before the pledge date", () => {
    expect(check("2026-09-30")).toMatch(/before the pledge/);
  });
});
