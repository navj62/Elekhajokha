// Shared fixtures for the AI mapping tests. No network: fetch is always mocked.

import { vi } from "vitest";
import { FIELD_KEYS, type FieldKey } from "../../../lib/import/ai/fields";
import type { AiConfig } from "../../../lib/import/ai/provider";
import type { CellValue } from "../../../lib/import/parse";

export const CONFIG: AiConfig = { baseUrl: "https://ai.test/v1", apiKey: "sk-test-secret-key", model: "test-model" };

export const HEADERS = ["Customer Name", "Pledge Date", "Amount", "Item"];

export const table = (rows: CellValue[][] = [["Ramesh Kumar", "2026-01-05", "5000", "Ring"]], headers = HEADERS) => ({
  headers,
  rows: rows.map((cells) => ({ cells })),
});

type FieldReply = { column: string | null; transform: string | null; confidence: number };

/** A schema-valid reply: every field present, mapped ones as given. */
export function validReply(
  mapped: Partial<Record<FieldKey, Partial<FieldReply>>> = {},
  extra: Record<string, unknown> = {},
) {
  const fields = Object.fromEntries(
    FIELD_KEYS.map((key) => [key, { column: null, transform: null, confidence: 0.9, ...mapped[key] }]),
  );
  return { layout: "ROW_PER_PLEDGE", fields, questions: [], ...extra };
}

export const completion = (content: unknown) =>
  new Response(JSON.stringify({ choices: [{ message: { content: typeof content === "string" ? content : JSON.stringify(content) } }] }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

export const errorResponse = (status: number, message = "error") =>
  new Response(JSON.stringify({ error: { message } }), { status, headers: { "Content-Type": "application/json" } });

export type FetchCall = { url: string; init: RequestInit; body: Record<string, unknown> & { messages: { role: string; content: string }[]; response_format: { type: string; json_schema: { strict: boolean; name: string } }; model: string } };

/** Installs a mock fetch that answers with the given responders in order. */
export function mockFetch(...responders: (Response | ((signal: AbortSignal | undefined) => Promise<Response>))[]) {
  const calls: FetchCall[] = [];
  const queue = [...responders];
  const fn = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {}, body: JSON.parse(String(init?.body ?? "{}")) });
    const next = queue.shift();
    if (next === undefined) throw new Error("unexpected extra fetch call");
    return typeof next === "function" ? next(init?.signal ?? undefined) : next;
  });
  vi.stubGlobal("fetch", fn);
  return { fn, calls };
}

/** A response that resolves after `ms` of (fake) time, or rejects when aborted. */
export const afterDelay =
  (ms: number, make: () => Response) =>
  (signal: AbortSignal | undefined) =>
    new Promise<Response>((resolve, reject) => {
      const timer = setTimeout(() => resolve(make()), ms);
      signal?.addEventListener("abort", () => {
        clearTimeout(timer);
        reject(new DOMException("aborted", "AbortError"));
      });
    });
