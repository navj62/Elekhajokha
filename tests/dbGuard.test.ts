// lib/dbGuard — the fail-closed host check for the Prisma CLI and scripts.
// Hosts here are illustrative; only the dev endpoint name is real, and it is
// already committed in DEV_DB_HOSTS.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { assertDbTarget, DbGuardError, DEV_DB_HOSTS } from "@/lib/dbGuard";

const neon = (endpoint: string, pooled = true) =>
  `postgresql://user:secret@${endpoint}${pooled ? "-pooler" : ""}.c-9.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`;
const OTHER = "ep-some-other-branch-123456";

describe("assertDbTarget", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    delete process.env.ALLOW_PROD_DB;
  });
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.ALLOW_PROD_DB;
  });

  it("allows the dev Neon endpoint, pooled and direct, and prints the host", () => {
    const dev = DEV_DB_HOSTS[0];
    expect(() => assertDbTarget(neon(dev), "test")).not.toThrow();
    expect(() => assertDbTarget(neon(dev, false), "test")).not.toThrow();
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining(`${dev}-pooler.c-9`));
  });

  it("allows CI's dummy localhost URL", () => {
    expect(() => assertDbTarget("postgresql://ci:ci@localhost:5432/ci", "test")).not.toThrow();
  });

  it("refuses any other host without ALLOW_PROD_DB=1", () => {
    expect(() => assertDbTarget(neon(OTHER), "test")).toThrow(DbGuardError);
    expect(() => assertDbTarget(neon(OTHER), "test")).toThrow(/REFUSED — ep-some-other-branch-123456-pooler/);
  });

  it("only exactly ALLOW_PROD_DB=1 unlocks a non-dev host", () => {
    process.env.ALLOW_PROD_DB = "true";
    expect(() => assertDbTarget(neon(OTHER), "test")).toThrow(DbGuardError);
    process.env.ALLOW_PROD_DB = "1";
    expect(() => assertDbTarget(neon(OTHER), "test")).not.toThrow();
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("NON-DEV"));
  });

  it("does not treat a lookalike as the dev endpoint", () => {
    expect(() => assertDbTarget(neon(`${DEV_DB_HOSTS[0]}x`), "test")).toThrow(DbGuardError);
    expect(() => assertDbTarget(`postgresql://u:p@${DEV_DB_HOSTS[0]}.evil.example/db`, "test")).toThrow(DbGuardError);
  });

  it("refuses an unparseable URL; leaves a missing one to the caller", () => {
    expect(() => assertDbTarget("not a url", "test")).toThrow(DbGuardError);
    expect(() => assertDbTarget(undefined, "test")).not.toThrow();
  });

  it("never echoes the password", () => {
    try {
      assertDbTarget(neon(OTHER), "test");
    } catch (e) {
      expect(String((e as Error).message)).not.toContain("secret");
    }
  });
});
