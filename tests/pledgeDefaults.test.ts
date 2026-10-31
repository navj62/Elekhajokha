// Shop pledge defaults + the tightened interest-rate rule + allowCompounding
// on pledge create. Runs the real route handlers against an in-memory Prisma
// fake (and faked Clerk / Cloudinary); interest maths is untouched here.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

const db = vi.hoisted(() => ({
  pledgeCreates: [] as Record<string, unknown>[],
  userUpserts: [] as { create: Record<string, unknown>; update: Record<string, unknown> }[],
  metadataWrites: [] as unknown[],
  user: {
    id: "owner",
    defaultInterestRate: null as unknown,
    defaultAllowCompounding: null as boolean | null,
    defaultCompoundingDuration: null as string | null,
  },
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: async () => ({ userId: "clerk_owner" }),
  clerkClient: async () => ({
    users: {
      getUser: async () => ({
        username: "owner", firstName: "A", lastName: "B",
        emailAddresses: [{ emailAddress: "owner@example.com" }],
      }),
      updateUserMetadata: async (_id: string, meta: unknown) => { db.metadataWrites.push(meta); },
    },
  }),
}));

vi.mock("@/lib/upload", () => ({ uploadImage: async () => "https://example.invalid/x.jpg" }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: async ({ where, select }: { where: { clerkUserId: string }; select?: Record<string, boolean> }) => {
        if (where.clerkUserId !== "clerk_owner") return null;
        if (!select) return db.user;
        return Object.fromEntries(Object.keys(select).map((k) => [k, (db.user as Record<string, unknown>)[k]]));
      },
      upsert: async (args: { create: Record<string, unknown>; update: Record<string, unknown> }) => {
        db.userUpserts.push(args);
        return { id: "owner", ...args.create };
      },
    },
    customer: { findFirst: async () => ({ id: "c1", userId: "owner" }) },
    pledgeItemType: { findMany: async () => [{ label: "Ring" }] },
    pledge: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        db.pledgeCreates.push(data);
        return { id: "p1", ...data };
      },
    },
  },
}));

import { POST as createPledge } from "@/app/api/customers/[customerId]/pledges/route";
import { POST as onboard } from "@/app/api/onboarding/route";
import { GET as getDefaults } from "@/app/api/pledge-defaults/route";
import { checkInterestRate } from "@/lib/interestRate";
import { parsePledgeDefaults } from "@/lib/pledgeDefaults";

beforeEach(() => {
  db.pledgeCreates = [];
  db.userUpserts = [];
  db.metadataWrites = [];
  db.user = { id: "owner", defaultInterestRate: null, defaultAllowCompounding: null, defaultCompoundingDuration: null };
  vi.spyOn(console, "error").mockImplementation(() => {});
});

function pledgeForm(over: Record<string, string | null> = {}) {
  const base: Record<string, string> = {
    loanAmount: "50000",
    interestRate: "12",
    compoundingDuration: "MONTHLY",
    pledgeDate: "2026-10-31",
    items: JSON.stringify([{ itemType: "Ring", metalType: "GOLD", grossWeight: "10", netWeight: "9.5", purity: "91.6" }]),
  };
  const fd = new FormData();
  for (const [k, v] of Object.entries({ ...base, ...over })) if (v !== null) fd.append(k, v);
  return fd;
}

const postPledge = (fd: FormData) =>
  createPledge(
    new NextRequest("http://localhost/api/customers/c1/pledges", { method: "POST", body: fd }),
    { params: Promise.resolve({ customerId: "c1" }) }
  );

const fdOf = (entries: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.append(k, v);
  return fd;
};

// ── Interest-rate rule ──────────────────────────────────────────────────────

describe("interest rate rule (> 0, ≤ 100, ≤ 2 decimals)", () => {
  it.each([
    ["0", false],
    ["0.01", true],
    ["100", true],
    ["100.01", false],
    ["12.345", false],
  ])("pledge POST with interestRate=%s → accepted: %s", async (rate, accepted) => {
    const res = await postPledge(pledgeForm({ interestRate: rate }));
    expect(res.status).toBe(accepted ? 201 : 400);
    expect(db.pledgeCreates).toHaveLength(accepted ? 1 : 0);
    if (accepted) expect(String(db.pledgeCreates[0].interestRate)).toBe(String(Number(rate)));
  });

  it("explains which part of the rule failed", () => {
    expect(checkInterestRate("0")).toEqual({ ok: false, message: "Interest rate must be greater than 0." });
    expect(checkInterestRate("100.01")).toEqual({ ok: false, message: "Interest rate must be at most 100." });
    expect(checkInterestRate("12.345")).toEqual({ ok: false, message: "Interest rate can have at most 2 decimal places." });
    expect(checkInterestRate("1e2")).toEqual({ ok: false, message: "Interest rate must be a number." });
    expect(checkInterestRate("-5")).toMatchObject({ ok: false });
    expect(checkInterestRate("")).toMatchObject({ ok: false });
    expect(checkInterestRate(" 12.50 ")).toEqual({ ok: true, value: "12.5" });
    expect(checkInterestRate(".5")).toEqual({ ok: true, value: "0.5" });
  });
});

// ── allowCompounding on pledge create ───────────────────────────────────────

describe("pledge POST allowCompounding", () => {
  it("absent → stored true (existing callers unchanged)", async () => {
    const res = await postPledge(pledgeForm());
    expect(res.status).toBe(201);
    expect(db.pledgeCreates[0].allowCompounding).toBe(true);
  });

  it("false → stored false, duration still stored", async () => {
    const res = await postPledge(pledgeForm({ allowCompounding: "false", compoundingDuration: "YEARLY" }));
    expect(res.status).toBe(201);
    expect(db.pledgeCreates[0].allowCompounding).toBe(false);
    expect(db.pledgeCreates[0].compoundingDuration).toBe("YEARLY");
  });

  it("true → stored true", async () => {
    await postPledge(pledgeForm({ allowCompounding: "true" }));
    expect(db.pledgeCreates[0].allowCompounding).toBe(true);
  });

  it.each(["yes", "1", "", "TRUE"])("non-boolean %j → 400, nothing stored", async (v) => {
    const res = await postPledge(pledgeForm({ allowCompounding: v }));
    expect(res.status).toBe(400);
    expect(db.pledgeCreates).toHaveLength(0);
  });
});

// ── Defaults parsing (shared by onboarding + settings) ──────────────────────

describe("parsePledgeDefaults", () => {
  it("absent → unchanged, empty → cleared, valid → value", () => {
    expect(parsePledgeDefaults(new FormData())).toEqual({ data: {}, errors: [] });
    expect(parsePledgeDefaults(fdOf({ defaultInterestRate: "", defaultAllowCompounding: "", defaultCompoundingDuration: "" })))
      .toEqual({ data: { defaultInterestRate: null, defaultAllowCompounding: null, defaultCompoundingDuration: null }, errors: [] });
    expect(parsePledgeDefaults(fdOf({ defaultInterestRate: "18.5", defaultAllowCompounding: "false", defaultCompoundingDuration: "YEARLY" })))
      .toEqual({ data: { defaultInterestRate: "18.5", defaultAllowCompounding: false, defaultCompoundingDuration: "YEARLY" }, errors: [] });
  });

  it("invalid values are left out and reported", () => {
    const { data, errors } = parsePledgeDefaults(
      fdOf({ defaultInterestRate: "150", defaultAllowCompounding: "maybe", defaultCompoundingDuration: "WEEKLY" })
    );
    expect(data).toEqual({});
    expect(errors).toHaveLength(3);
  });
});

// ── Onboarding ──────────────────────────────────────────────────────────────

const onboardingForm = (extra: Record<string, string> = {}) =>
  fdOf({ shopName: "Shop", address: "Indore", mobile: "9876543210", gender: "Male", ...extra });
const postOnboarding = (fd: FormData) => onboard(new Request("http://localhost/api/onboarding", { method: "POST", body: fd }));

describe("onboarding with pledge defaults", () => {
  it("invalid default values still return success, are dropped with a warning, and onboarding completes", async () => {
    const res = await postOnboarding(onboardingForm({
      defaultInterestRate: "12.345",
      defaultAllowCompounding: "maybe",
      defaultCompoundingDuration: "WEEKLY",
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.warnings.join(" ")).toMatch(/pledge defaults were not saved/i);
    // Clerk write happened → the user is not locked on /onboarding.
    expect(db.metadataWrites).toEqual([{ publicMetadata: { onboardingComplete: true } }]);
    const { create, update } = db.userUpserts[0];
    for (const k of ["defaultInterestRate", "defaultAllowCompounding", "defaultCompoundingDuration"]) {
      expect(create).not.toHaveProperty(k);
      expect(update).not.toHaveProperty(k);
    }
  });

  it("valid defaults are stored; a partly invalid set keeps the valid ones", async () => {
    await postOnboarding(onboardingForm({ defaultInterestRate: "24", defaultAllowCompounding: "false", defaultCompoundingDuration: "WEEKLY" }));
    expect(db.userUpserts[0].create).toMatchObject({ defaultInterestRate: "24", defaultAllowCompounding: false });
    expect(db.userUpserts[0].create).not.toHaveProperty("defaultCompoundingDuration");
    expect(db.metadataWrites).toHaveLength(1);
  });

  it("no defaults sent → onboarding exactly as before, no warnings", async () => {
    const res = await postOnboarding(onboardingForm());
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.warnings).toBeUndefined();
    expect(db.userUpserts[0].create).not.toHaveProperty("defaultInterestRate");
  });
});

// ── Defaults endpoint ───────────────────────────────────────────────────────

describe("GET /api/pledge-defaults", () => {
  it("returns only the three fields, null when unset", async () => {
    const body = await (await getDefaults()).json();
    expect(body).toEqual({ defaultInterestRate: null, defaultAllowCompounding: null, defaultCompoundingDuration: null });
  });

  it("serialises the Decimal rate as a string", async () => {
    db.user.defaultInterestRate = new Prisma.Decimal("18.50");
    db.user.defaultAllowCompounding = false;
    db.user.defaultCompoundingDuration = "HALFYEARLY";
    const body = await (await getDefaults()).json();
    expect(body).toEqual({ defaultInterestRate: "18.5", defaultAllowCompounding: false, defaultCompoundingDuration: "HALFYEARLY" });
    expect(Object.keys(body)).toHaveLength(3);
  });
});
