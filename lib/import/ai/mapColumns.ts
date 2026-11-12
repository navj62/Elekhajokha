// lib/import/ai/mapColumns.ts
//
// Orchestrates the mapping call: mask -> prompt -> provider -> JSON.parse ->
// Zod. Returns a mapping or a "manual mapping" result; it never throws and
// never triggers anything: the model's reply is data and nothing else.
//
// Failure handling:
//  - strict json_schema rejected by the model -> one call in json_object mode;
//  - invalid reply -> one retry carrying the validation errors, then manual;
//  - 429, timeout, network, provider error, missing config -> manual;
//  - a 45 s deadline covers every call (first, fallback, retry).
// Logs carry the failure reason only, never the key, the prompt or any cell.

import { FIELD_KEYS, FIELD_DESCRIPTIONS, type FieldKey } from "./fields";
import { maskSample, type MaskInput } from "./mask";
import {
  createMappingSchema,
  toColumnMapping,
  type ColumnMapping,
  type MappingQuestion,
} from "./mappingSchema";
import { buildMessages, buildRetryMessages, type ChatMessage } from "./prompt";
import {
  chatCompletion,
  readAiConfig,
  rememberMode,
  rememberedMode,
  type AiConfig,
  type ResponseMode,
} from "./provider";

export const CONFIDENCE_THRESHOLD = 0.8;
export const CALL_TIMEOUT_MS = 20_000;
export const DEADLINE_MS = 45_000;

export type ManualReason =
  | "NOT_CONFIGURED"
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "DEADLINE"
  | "NETWORK"
  | "PROVIDER_ERROR"
  | "INVALID_OUTPUT";

export type MappingResult =
  | { status: "ok"; mapping: ColumnMapping; mode: ResponseMode }
  | { status: "manual"; reason: ManualReason };

export type MapColumnsOptions = {
  config?: AiConfig | null;
  callTimeoutMs?: number;
  deadlineMs?: number;
};

const manual = (reason: ManualReason): MappingResult => {
  console.warn(`[import-ai] manual mapping: ${reason}`);
  return { status: "manual", reason };
};

type Validated = { ok: true; mapping: ColumnMapping } | { ok: false; errors: string[] };

function validate(content: string, headers: readonly string[]): Validated {
  let json: unknown;
  try {
    json = JSON.parse(content);
  } catch {
    return { ok: false, errors: ["The reply was not valid JSON."] };
  }
  const result = createMappingSchema(headers).safeParse(json);
  if (!result.success) {
    return {
      ok: false,
      errors: result.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`),
    };
  }
  return { ok: true, mapping: toColumnMapping(result.data) };
}

/**
 * Fields the model mapped with confidence below the threshold become
 * questions, unless the model already asked about that field. Built in code so
 * no model text or cell value is echoed.
 */
export function applyConfidenceThreshold(mapping: ColumnMapping, threshold = CONFIDENCE_THRESHOLD): ColumnMapping {
  const asked = new Set<FieldKey>(mapping.questions.map((q) => q.field));
  const extra: MappingQuestion[] = [];
  for (const key of FIELD_KEYS) {
    const { column, confidence } = mapping.fields[key];
    if (column === null || confidence >= threshold || asked.has(key)) continue;
    extra.push({
      field: key,
      message: `Is the column "${column}" right for: ${FIELD_DESCRIPTIONS[key]}`,
      options: [column, "Not in this file"],
    });
  }
  return { ...mapping, questions: [...mapping.questions, ...extra] };
}

export async function mapColumns(table: MaskInput, options: MapColumnsOptions = {}): Promise<MappingResult> {
  const config = options.config === undefined ? readAiConfig() : options.config;
  if (!config) return manual("NOT_CONFIGURED");

  const callTimeoutMs = options.callTimeoutMs ?? CALL_TIMEOUT_MS;
  const deadline = Date.now() + (options.deadlineMs ?? DEADLINE_MS);

  const original: ChatMessage[] = buildMessages(maskSample(table));
  let messages = original;
  let mode: ResponseMode = rememberedMode(config) ?? "json_schema";
  let retried = false;

  for (;;) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) return manual("DEADLINE");

    const reply = await chatCompletion(config, {
      messages,
      mode,
      timeoutMs: Math.min(callTimeoutMs, remaining),
    });

    if (!reply.ok) {
      if (reply.kind === "UNSUPPORTED_RESPONSE_FORMAT") {
        if (mode === "json_schema") {
          mode = "json_object";
          rememberMode(config, mode);
          continue;
        }
        return manual("PROVIDER_ERROR");
      }
      if (reply.kind === "TIMEOUT" && Date.now() >= deadline) return manual("DEADLINE");
      return manual(reply.kind);
    }

    rememberMode(config, mode);
    const checked = validate(reply.content, table.headers);
    if (checked.ok) {
      return { status: "ok", mapping: applyConfidenceThreshold(checked.mapping), mode };
    }
    if (retried) return manual("INVALID_OUTPUT");
    retried = true;
    messages = buildRetryMessages(original, checked.errors);
  }
}
