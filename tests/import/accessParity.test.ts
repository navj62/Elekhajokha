// Parity: the import subscription check must give the same hasAccess answer
// as the real app/api/access/route.ts. This test runs the real route handler
// (Clerk and Prisma mocked, Razorpay keys unset so its self-heal is inert)
// and the import helper on the same user states. If the route's rules
// change and lib/import/subscription.ts does not follow, this fails.

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { ImportAccessUser } from "../../lib/import/subscription";
import { evaluateImportAccess } from "../../lib/import/subscription";
import { ACCESS_CASES, NOW } from "./accessStates";

type Row = ImportAccessUser & {
  subscriptionPlan: null;
  razorpaySubscriptionId: string | null;
  hadTrial: boolean;
};

const db = vi.hoisted(() => ({ user: null as unknown }));

vi.mock("@clerk/nextjs/server", () => ({
  auth: async () => ({ userId: "clerk_parity" }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: async () => db.user,
      // The route creates a missing user as `expired`.
      create: async ({ data }: { data: Record<string, unknown> }) => ({
        subscriptionPlan: null,
        subscriptionEndDate: null,
        subscriptionCreatedAt: null,
        razorpaySubscriptionId: null,
        lastGraceExpiredAt: null,
        deletedAt: null,
        ...data,
      }),
      update: async () => ({}),
    },
  },
}));

import { GET } from "@/app/api/access/route";

const row = (user: ImportAccessUser): Row => ({
  ...user,
  subscriptionPlan: null,
  razorpaySubscriptionId: "sub_parity",
  hadTrial: false,
});

describe("import subscription check vs /api/access", () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    vi.stubEnv("NEXT_PUBLIC_RAZORPAY_KEY_ID", "");
    vi.stubEnv("RAZORPAY_KEY_SECRET", "");
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterAll(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    db.user = null;
  });

  it.each(ACCESS_CASES)("$name", async ({ user }) => {
    db.user = row(user);
    const body = (await (await GET()).json()) as { hasAccess: boolean };
    expect(evaluateImportAccess(user, NOW).hasAccess).toBe(body.hasAccess);
  });

  it("a signed-in user with no DB row has no access in the route either", async () => {
    db.user = null;
    const body = (await (await GET()).json()) as { hasAccess: boolean };
    expect(body.hasAccess).toBe(false);
  });
});
