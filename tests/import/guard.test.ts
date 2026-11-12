import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ImportUser } from "../../lib/import/auth";

const state = vi.hoisted(() => ({
  clerkUserId: null as string | null,
  users: [] as Array<Record<string, unknown>>,
  authCalls: 0,
  dbCalls: 0,
  dbThrows: false,
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: async () => {
    state.authCalls += 1;
    return { userId: state.clerkUserId };
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: async ({ where }: { where: { clerkUserId: string } }) => {
        state.dbCalls += 1;
        if (state.dbThrows) throw new Error("connection lost: host=secret-host");
        return state.users.find((u) => u.clerkUserId === where.clerkUserId) ?? null;
      },
    },
  },
}));

import { requireImportAccess } from "../../lib/import/guard";

const FAR = new Date("2099-01-01T00:00:00.000Z");

const shop = (clerkUserId: string, id: string, over: Partial<ImportUser> = {}) => ({
  clerkUserId,
  id,
  subscriptionStatus: "active",
  subscriptionEndDate: FAR,
  subscriptionCreatedAt: null,
  lastGraceExpiredAt: null,
  isActive: true,
  deletedAt: null,
  ...over,
});

async function denied(expectedStatus: number) {
  const result = await requireImportAccess();
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error("expected a denial");
  expect(result.response.status).toBe(expectedStatus);
  return (await result.response.json()) as Record<string, unknown>;
}

describe("requireImportAccess", () => {
  beforeEach(() => {
    state.clerkUserId = null;
    state.users = [];
    state.authCalls = 0;
    state.dbCalls = 0;
    state.dbThrows = false;
    vi.stubEnv("IMPORT_FEATURE_ENABLED", "true");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("flag off → 404, without touching auth or the database", async () => {
    vi.stubEnv("IMPORT_FEATURE_ENABLED", "");
    state.clerkUserId = "clerk_a";
    state.users = [shop("clerk_a", "user_a")];

    expect(await denied(404)).toEqual({ error: "Not Found", code: "NOT_FOUND" });
    expect(state.authCalls).toBe(0);
    expect(state.dbCalls).toBe(0);
  });

  it("no session → 401, without a database read", async () => {
    expect(await denied(401)).toEqual({ error: "Unauthorized", code: "UNAUTHORIZED" });
    expect(state.dbCalls).toBe(0);
  });

  it("signed in but no DB user → 403", async () => {
    state.clerkUserId = "clerk_ghost";
    expect(await denied(403)).toEqual({ error: "Forbidden", code: "NO_ACCOUNT" });
  });

  it("suspended account → 403 even with a paid subscription", async () => {
    state.clerkUserId = "clerk_a";
    state.users = [shop("clerk_a", "user_a", { isActive: false })];
    expect(await denied(403)).toEqual({ error: "Forbidden", code: "ACCOUNT_SUSPENDED" });
  });

  it("lapsed subscription → 402", async () => {
    state.clerkUserId = "clerk_a";
    state.users = [shop("clerk_a", "user_a", { subscriptionStatus: "expired" })];
    expect(await denied(402)).toEqual({
      error: "Subscription required",
      code: "SUBSCRIPTION_REQUIRED",
    });
  });

  it("active subscription → ok with the internal user id", async () => {
    state.clerkUserId = "clerk_a";
    state.users = [shop("clerk_a", "user_a")];
    expect(await requireImportAccess()).toEqual({ ok: true, userId: "user_a" });
  });

  it("trial → ok", async () => {
    state.clerkUserId = "clerk_a";
    state.users = [shop("clerk_a", "user_a", { subscriptionStatus: "trial" })];
    expect(await requireImportAccess()).toEqual({ ok: true, userId: "user_a" });
  });

  it("returns the caller's own id, never another shop's", async () => {
    state.users = [shop("clerk_a", "user_a"), shop("clerk_b", "user_b")];

    state.clerkUserId = "clerk_b";
    expect(await requireImportAccess()).toEqual({ ok: true, userId: "user_b" });

    state.clerkUserId = "clerk_a";
    expect(await requireImportAccess()).toEqual({ ok: true, userId: "user_a" });
  });

  it("a database failure → generic 500, nothing from the error in the body or log", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    state.clerkUserId = "clerk_a";
    state.dbThrows = true;

    expect(await denied(500)).toEqual({ error: "Server Error", code: "SERVER_ERROR" });
    expect(JSON.stringify(log.mock.calls)).not.toContain("secret-host");
  });
});
