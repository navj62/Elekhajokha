import { afterEach, describe, expect, it, vi } from "vitest";
import { isImportFeatureEnabled } from "../../lib/import/featureFlag";

describe("isImportFeatureEnabled", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is on only for the exact value \"true\"", () => {
    vi.stubEnv("IMPORT_FEATURE_ENABLED", "true");
    expect(isImportFeatureEnabled()).toBe(true);
  });

  it("is off when the variable is not set", () => {
    vi.stubEnv("IMPORT_FEATURE_ENABLED", undefined);
    expect(isImportFeatureEnabled()).toBe(false);
  });

  it.each(["", "1", "TRUE", "True", "false", "yes", " true"])("is off for %j", (value) => {
    vi.stubEnv("IMPORT_FEATURE_ENABLED", value);
    expect(isImportFeatureEnabled()).toBe(false);
  });
});
