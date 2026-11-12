// lib/import/featureFlag.ts
//
// Server-side switch for the whole import feature (docs/import-feature.md §13).
// Off by default: only the exact value "true" turns it on. The name has no
// NEXT_PUBLIC_ prefix on purpose, so it is never bundled into client code.

export function isImportFeatureEnabled(): boolean {
  return process.env.IMPORT_FEATURE_ENABLED === "true";
}
