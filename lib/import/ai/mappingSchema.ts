// lib/import/ai/mappingSchema.ts
//
// The shape the model must return, as a Zod schema. The same schema produces
// the JSON Schema sent to the provider for strict structured output, so the
// wire contract and the validation can never drift apart.
//
// Strict mode needs fixed keys: `fields` has one explicit property per target
// field (FIELD_KEYS), each required, with `column` and `transform` nullable.

import { z } from "zod";
import { FIELD_KEYS, LAYOUTS, type FieldKey } from "./fields";

export const MAX_TRANSFORM_CHARS = 200;
export const MAX_QUESTION_CHARS = 300;

const FieldMappingSchema = z.strictObject({
  /** Exact header text of the chosen column, or null when the file has none. */
  column: z.string().min(1).nullable(),
  /** Free-text label for a needed conversion. Opaque: never executed. */
  transform: z.string().max(MAX_TRANSFORM_CHARS).nullable(),
  confidence: z.number().min(0).max(1),
});

const fieldShape = {} as Record<FieldKey, typeof FieldMappingSchema>;
for (const key of FIELD_KEYS) fieldShape[key] = FieldMappingSchema;

const QuestionSchema = z.strictObject({
  field: z.enum(FIELD_KEYS as [FieldKey, ...FieldKey[]]),
  message: z.string().min(1).max(MAX_QUESTION_CHARS),
  options: z.array(z.string().max(200)).max(10),
});

export const MappingBaseSchema = z.strictObject({
  layout: z.enum(LAYOUTS),
  fields: z.strictObject(fieldShape),
  questions: z.array(QuestionSchema).max(50),
});

export type FieldMapping = { column: string | null; transform?: string; confidence: number };
export type MappingQuestion = { field: FieldKey; message: string; options: string[] };
export type ColumnMapping = {
  layout: (typeof LAYOUTS)[number];
  fields: Record<FieldKey, FieldMapping>;
  questions: MappingQuestion[];
};

/**
 * Base schema plus the rule that a mapped column must be exactly one of the
 * sheet's headers, so a hallucinated column triggers the retry instead of
 * reaching mapping review.
 */
export function createMappingSchema(headers: readonly string[]) {
  const known = new Set(headers);
  return MappingBaseSchema.superRefine((mapping, ctx) => {
    for (const key of FIELD_KEYS) {
      const column = mapping.fields[key].column;
      if (column !== null && !known.has(column)) {
        ctx.addIssue({
          code: "custom",
          path: ["fields", key, "column"],
          message: "column must be exactly one of the sheet's headers, or null",
        });
      }
    }
  });
}

/** Normalizes a validated model reply into the public mapping type. */
export function toColumnMapping(parsed: z.infer<typeof MappingBaseSchema>): ColumnMapping {
  const fields = {} as Record<FieldKey, FieldMapping>;
  for (const key of FIELD_KEYS) {
    const { column, transform, confidence } = parsed.fields[key];
    fields[key] = transform ? { column, transform, confidence } : { column, confidence };
  }
  return {
    layout: parsed.layout,
    fields,
    questions: parsed.questions.map((q) => ({ field: q.field, message: q.message, options: q.options })),
  };
}

// Keywords stripped from the schema sent to the provider. Strict structured
// output supports a subset of JSON Schema; range and length rules stay enforced
// by Zod on our side.
const UNSUPPORTED_KEYWORDS = new Set([
  "$schema",
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "exclusiveMaximum",
  "minLength",
  "maxLength",
  "minItems",
  "maxItems",
  "pattern",
  "format",
]);

function strip(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(strip);
  if (node !== null && typeof node === "object") {
    return Object.fromEntries(
      Object.entries(node as Record<string, unknown>)
        .filter(([key]) => !UNSUPPORTED_KEYWORDS.has(key))
        .map(([key, value]) => [key, strip(value)]),
    );
  }
  return node;
}

export const WIRE_SCHEMA_NAME = "column_mapping";

/** JSON Schema for response_format { type: "json_schema", strict: true }. */
export function wireJsonSchema(): Record<string, unknown> {
  return strip(z.toJSONSchema(MappingBaseSchema)) as Record<string, unknown>;
}
