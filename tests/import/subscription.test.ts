import { describe, expect, it } from "vitest";
import { evaluateImportAccess } from "../../lib/import/subscription";
import { ACCESS_CASES, NOW } from "./accessStates";

describe("evaluateImportAccess", () => {
  it.each(ACCESS_CASES)("$name → $status", ({ user, hasAccess, status }) => {
    expect(evaluateImportAccess(user, NOW)).toEqual({ hasAccess, status });
  });

  it("does not change the user it is given", () => {
    const user = { ...ACCESS_CASES[7].user };
    const before = JSON.stringify(user);
    evaluateImportAccess(user, NOW);
    expect(JSON.stringify(user)).toBe(before);
  });
});
