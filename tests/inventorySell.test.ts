// POST /api/inventory/[id]/sell — the sale-date and buyer-mobile rules,
// run against the real route handler with Clerk and Prisma mocked. The
// route's other behaviour (auth, scoping, atomic IN_STOCK→SOLD, 409) is
// untouched by these rules; the tests only assert whether the sale reaches
// the atomic update.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

const db = vi.hoisted(() => ({
  item: null as null | { id: string; ownerId: string; status: string; acquiredAt: Date },
  updateMany: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: async () => ({ userId: "clerk_1" }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: async () => ({ id: "user_1" }) },
    inventoryItem: {
      findFirst: async () => db.item,
      updateMany: db.updateMany,
    },
  },
}));

import { POST } from "@/app/api/inventory/[id]/sell/route";

// Acquired 10 Jul 2026, stored the way the app stores a YYYY-MM-DD form
// date (UTC midnight = 05:30 IST on 10 Jul).
const ACQUIRED = new Date("2026-07-10T00:00:00.000Z");
// "Now" is 30 Oct 2026, 15:00 IST.
const NOW = new Date("2026-10-30T09:30:00.000Z");

function sell(body: Record<string, unknown>) {
  const req = new NextRequest("http://localhost/api/inventory/item_1/sell", {
    method: "POST",
    body: JSON.stringify({ soldPrice: 25000, soldAt: "2026-10-01", ...body }),
  });
  return POST(req, { params: Promise.resolve({ id: "item_1" }) });
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  db.item = { id: "item_1", ownerId: "user_1", status: "IN_STOCK", acquiredAt: ACQUIRED };
  db.updateMany.mockReset();
  db.updateMany.mockResolvedValue({ count: 1 });
});

afterEach(() => {
  vi.useRealTimers();
});

async function expectValidation(res: Response, message: string) {
  expect(res.status).toBe(400);
  expect(await res.json()).toEqual({ error: "VALIDATION", message });
  expect(db.updateMany).not.toHaveBeenCalled();
}

describe("sale date", () => {
  it("before the acquired date → 400, no write", async () => {
    await expectValidation(await sell({ soldAt: "2026-07-09" }), "Sale date can't be before the item was acquired.");
  });

  it("in the future → 400, no write", async () => {
    await expectValidation(await sell({ soldAt: "2026-10-31" }), "Sale date can't be in the future.");
  });

  it("same IST day as acquisition is allowed", async () => {
    const res = await sell({ soldAt: "2026-07-10" });
    expect(res.status).toBe(200);
    expect(db.updateMany).toHaveBeenCalledTimes(1);
  });

  it("same day compares in IST, not UTC: acquired 23:30 IST, sold that same IST day", async () => {
    // 18:00 UTC on 10 Jul = 23:30 IST on 10 Jul; UTC midnight of 10 Jul is earlier in UTC terms.
    db.item!.acquiredAt = new Date("2026-07-10T18:00:00.000Z");
    const res = await sell({ soldAt: "2026-07-10" });
    expect(res.status).toBe(200);
  });

  it("today is allowed", async () => {
    const res = await sell({ soldAt: "2026-10-30" });
    expect(res.status).toBe(200);
    expect(db.updateMany).toHaveBeenCalledTimes(1);
  });
});

describe("buyer mobile", () => {
  it("exactly 10 digits is accepted and stored", async () => {
    const res = await sell({ buyerMobile: "9876543210" });
    expect(res.status).toBe(200);
    expect(db.updateMany.mock.calls[0][0].data.buyerMobile).toBe("9876543210");
  });

  it.each([
    ["a space", "98765 43210"],
    ["+91", "+919876543210"],
    ["9 digits", "987654321"],
    ["11 digits", "98765432101"],
    ["letters", "98765abcde"],
  ])("with %s → 400, no write", async (_label, buyerMobile) => {
    await expectValidation(await sell({ buyerMobile }), "Buyer mobile must be exactly 10 digits.");
  });

  it("omitted is allowed and stored as null", async () => {
    const res = await sell({});
    expect(res.status).toBe(200);
    expect(db.updateMany.mock.calls[0][0].data.buyerMobile).toBeNull();
  });

  it("null or blank counts as omitted", async () => {
    expect((await sell({ buyerMobile: null })).status).toBe(200);
    expect((await sell({ buyerMobile: "" })).status).toBe(200);
  });
});

describe("unchanged behaviour", () => {
  it("an already-sold item still returns 409 ALREADY_SOLD", async () => {
    db.item!.status = "SOLD";
    const res = await sell({});
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("ALREADY_SOLD");
  });
});
