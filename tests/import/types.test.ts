import { describe, expect, it } from "vitest";
import {
  ImportIssueListSchema,
  ImportIssueSchema,
  type ImportIssue,
} from "../../lib/import/types";

const error: ImportIssue = {
  rowRef: "pledge:12",
  field: "loanAmount",
  kind: "error",
  message: "Loan amount is missing",
};

const question: ImportIssue = {
  rowRef: "item:12:1",
  field: "purity",
  kind: "question",
  message: "Is 22 karats or percent?",
  options: ["Karats", "Percent"],
  suggestion: "Karats",
};

describe("ImportIssueSchema", () => {
  it("accepts an error and a question", () => {
    expect(ImportIssueSchema.parse(error)).toEqual(error);
    expect(ImportIssueSchema.parse(question)).toEqual(question);
  });

  it("accepts a list, including an empty one", () => {
    expect(ImportIssueListSchema.parse([])).toEqual([]);
    expect(ImportIssueListSchema.parse([error, question])).toHaveLength(2);
  });

  it("rejects an unknown kind", () => {
    expect(ImportIssueSchema.safeParse({ ...error, kind: "warning" }).success).toBe(false);
  });

  it("rejects unknown keys", () => {
    expect(ImportIssueSchema.safeParse({ ...error, extra: "x" }).success).toBe(false);
  });

  it.each(["rowRef", "field", "message"] as const)("rejects an empty %s", (key) => {
    expect(ImportIssueSchema.safeParse({ ...error, [key]: "" }).success).toBe(false);
  });

  it("rejects options that are not strings", () => {
    expect(ImportIssueSchema.safeParse({ ...question, options: [1, 2] }).success).toBe(false);
  });
});
