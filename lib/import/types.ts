// lib/import/types.ts
//
// Shared types for the Excel/CSV import feature (docs/import-feature.md §5).
// Client-safe: no server imports here.

import { z } from "zod";

/**
 * One problem found on a staged row. `error` blocks the import until the
 * value is fixed or the row is excluded; `question` needs an answer from the
 * shop owner. Stored as a JSON array in ImportRow.issues.
 */
export type ImportIssue = {
  rowRef: string;
  field: string;
  kind: "error" | "question";
  message: string;
  options?: string[];
  suggestion?: string;
};

/** Strict: unknown keys are rejected, so nothing extra rides along into the DB. */
export const ImportIssueSchema = z.strictObject({
  rowRef: z.string().min(1),
  field: z.string().min(1),
  kind: z.enum(["error", "question"]),
  message: z.string().min(1),
  options: z.array(z.string()).optional(),
  suggestion: z.string().optional(),
});

export const ImportIssueListSchema = z.array(ImportIssueSchema);
