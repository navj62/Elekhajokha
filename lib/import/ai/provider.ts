// lib/import/ai/provider.ts
//
// One OpenAI-compatible chat-completions call over plain fetch, configured by
// AI_BASE_URL, AI_API_KEY and AI_MODEL. Never logs the key, the prompt, the
// reply or any cell value; failures are reported as a coarse `kind` only.

import { WIRE_SCHEMA_NAME, wireJsonSchema } from "./mappingSchema";
import type { ChatMessage } from "./prompt";

export type AiConfig = { baseUrl: string; apiKey: string; model: string };

/** Reads the env at call time. Null when anything is missing or the URL is unsafe. */
export function readAiConfig(env: NodeJS.ProcessEnv = process.env): AiConfig | null {
  const baseUrl = env.AI_BASE_URL?.trim().replace(/\/+$/, "");
  const apiKey = env.AI_API_KEY?.trim();
  const model = env.AI_MODEL?.trim();
  if (!baseUrl || !apiKey || !model) return null;
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    return null;
  }
  // The key travels in a header: only https, or http to this machine.
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !(url.protocol === "http:" && local)) return null;
  return { baseUrl, apiKey, model };
}

export type ResponseMode = "json_schema" | "json_object";

export type ProviderFailure =
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "NETWORK"
  | "PROVIDER_ERROR"
  | "UNSUPPORTED_RESPONSE_FORMAT";

export type ProviderResult = { ok: true; content: string } | { ok: false; kind: ProviderFailure };

// Which response mode each provider/model accepted, so a model that rejects
// strict mode is not asked twice. In-process only.
const modeMemo = new Map<string, ResponseMode>();
const memoKey = (c: AiConfig) => `${c.baseUrl}|${c.model}`;
export const rememberedMode = (c: AiConfig): ResponseMode | undefined => modeMemo.get(memoKey(c));
export const rememberMode = (c: AiConfig, mode: ResponseMode): void => void modeMemo.set(memoKey(c), mode);
export const resetModeMemo = (): void => modeMemo.clear();

const UNSUPPORTED_FORMAT_HINT = /response_format|json_schema|structured output|strict/i;

function responseFormat(mode: ResponseMode) {
  return mode === "json_schema"
    ? { type: "json_schema", json_schema: { name: WIRE_SCHEMA_NAME, strict: true, schema: wireJsonSchema() } }
    : { type: "json_object" };
}

/** Pulls only the provider's error text, to classify a 400. Never stored or logged. */
async function errorText(response: Response): Promise<string> {
  try {
    const body: unknown = JSON.parse(await response.text());
    const error = (body as { error?: { message?: unknown; code?: unknown } } | null)?.error;
    return `${String(error?.message ?? "")} ${String(error?.code ?? "")}`;
  } catch {
    return "";
  }
}

export async function chatCompletion(
  config: AiConfig,
  request: { messages: ChatMessage[]; mode: ResponseMode; timeoutMs: number },
): Promise<ProviderResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), request.timeoutMs);
  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.apiKey}` },
      body: JSON.stringify({
        model: config.model,
        messages: request.messages,
        temperature: 0,
        response_format: responseFormat(request.mode),
      }),
      signal: controller.signal,
    });

    if (response.status === 429) return { ok: false, kind: "RATE_LIMITED" };
    if (response.status === 400 || response.status === 422) {
      const hint = await errorText(response);
      return {
        ok: false,
        kind: UNSUPPORTED_FORMAT_HINT.test(hint) ? "UNSUPPORTED_RESPONSE_FORMAT" : "PROVIDER_ERROR",
      };
    }
    if (!response.ok) return { ok: false, kind: "PROVIDER_ERROR" };

    const text = await response.text();
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      return { ok: false, kind: "PROVIDER_ERROR" };
    }
    const content = (body as { choices?: { message?: { content?: unknown } }[] } | null)?.choices?.[0]
      ?.message?.content;
    return { ok: true, content: typeof content === "string" ? content : "" };
  } catch {
    return { ok: false, kind: controller.signal.aborted ? "TIMEOUT" : "NETWORK" };
  } finally {
    clearTimeout(timer);
  }
}
