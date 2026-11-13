// lib/import/ai/runMappingEval.ts
//
// Mapping eval: runs mapColumns on every file in samples/ that has an
// owner-written answer key in samples/expected/, and reports per-file and
// overall accuracy (per field and layout).
//
//   npx tsx lib/import/ai/runMappingEval.ts
//
// Env: AI_BASE_URL, AI_API_KEY, AI_MODEL, loaded from .env.local with Node's
// built-in process.loadEnvFile (no dotenv). Writes docs/import-eval.md with
// headers, field keys and scores only: never cell values, never the key.
// Calls run one after another, PAUSE_MS apart, to stay inside free-tier rate
// limits; a 429 is retried after RATE_LIMIT_WAIT_MS (eval only: the app itself
// falls back to manual mapping at once). A file that still ends in manual
// mapping is reported but NOT scored, so it cannot inflate accuracy.

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { extractTable, findHeaderRow, listSheets, readSheet } from "../parse";
import { FIELD_KEYS, LAYOUTS, type FieldKey, type Layout } from "./fields";
import { mapColumns, type MappingResult } from "./mapColumns";
import { readAiConfig } from "./provider";

const ROOT = process.cwd();
const SAMPLES = path.join(ROOT, "samples");
const EXPECTED = path.join(SAMPLES, "expected");
const REPORT = path.join(ROOT, "docs", "import-eval.md");
const PAUSE_MS = 20_000;
const RATE_LIMIT_WAIT_MS = 65_000;
const RATE_LIMIT_RETRIES = 3;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type Expected = { _headers: string[]; layout: Layout | null; fields: Record<FieldKey, string | null> };

type Mismatch = { field: FieldKey; expected: string | null; got: string | null };

type FileScore = {
  file: string;
  outcome: string; // "ok (json_schema)", "manual: RATE_LIMITED", ...
  layoutExpected: Layout | null;
  layoutGot: Layout | null;
  correct: number;
  total: number;
  mappedExpected: number;
  mappedCorrect: number;
  falseMappings: number;
  questions: number;
  mismatches: Mismatch[];
  ms: number;
  scored: boolean;
  attempts: number;
};

function loadExpected(file: string): Expected {
  const json = JSON.parse(readFileSync(path.join(EXPECTED, file), "utf8")) as Expected;
  if (json.layout !== null && !LAYOUTS.includes(json.layout)) throw new Error(`${file}: bad layout`);
  for (const key of FIELD_KEYS) {
    if (!(key in json.fields)) throw new Error(`${file}: missing field ${key}`);
    const v = json.fields[key];
    if (v !== null && !json._headers.includes(v)) throw new Error(`${file}: ${key} is not a header`);
  }
  return json;
}

async function loadTable(sampleFile: string) {
  const buffer = readFileSync(path.join(SAMPLES, sampleFile));
  const listed = await listSheets(buffer, sampleFile);
  const sheet = await readSheet(buffer, sampleFile, listed.sheets[0]?.name);
  const headerIndex = findHeaderRow(sheet.rows);
  if (headerIndex === null) throw new Error(`${sampleFile}: no header row`);
  return extractTable(sheet.rows, headerIndex);
}

function score(file: string, expected: Expected, result: MappingResult, ms: number, attempts: number): FileScore {
  const got = (key: FieldKey) => (result.status === "ok" ? result.mapping.fields[key].column : null);
  const mismatches: Mismatch[] = [];
  let correct = 0;
  let mappedExpected = 0;
  let mappedCorrect = 0;
  let falseMappings = 0;
  for (const key of FIELD_KEYS) {
    const e = expected.fields[key];
    const g = got(key);
    if (e === g) correct++;
    else mismatches.push({ field: key, expected: e, got: g });
    if (e !== null) {
      mappedExpected++;
      if (e === g) mappedCorrect++;
    } else if (g !== null) {
      falseMappings++;
    }
  }
  return {
    file,
    outcome: result.status === "ok" ? `ok (${result.mode})` : `manual: ${result.reason}`,
    layoutExpected: expected.layout,
    layoutGot: result.status === "ok" ? result.mapping.layout : null,
    correct,
    total: FIELD_KEYS.length,
    mappedExpected,
    mappedCorrect,
    falseMappings,
    questions: result.status === "ok" ? result.mapping.questions.length : 0,
    mismatches,
    ms,
    scored: result.status === "ok",
    attempts,
  };
}

const pct = (n: number, d: number) => (d === 0 ? "n/a" : `${((100 * n) / d).toFixed(1)}%`);
const cell = (v: string | null) => (v === null ? "null" : `\`${v.replace(/\|/g, "\\|")}\``);

function report(model: string, baseHost: string, all: FileScore[], when: string): string {
  const scores = all.filter((s) => s.scored);
  const sum = (f: (s: FileScore) => number) => scores.reduce((n, s) => n + f(s), 0);
  const layoutScored = scores.filter((s) => s.layoutExpected !== null);
  const layoutRight = layoutScored.filter((s) => s.layoutExpected === s.layoutGot).length;
  const modes = (m: string) => scores.filter((s) => s.outcome === `ok (${m})`).length;
  const manual = all.filter((s) => !s.scored);

  const lines: string[] = [
    "# Import — AI mapping eval",
    "",
    `Run: ${when} · Model: \`${model}\` · Provider host: \`${baseHost}\``,
    "",
    "Answer keys: `samples/expected/*.json`, written and confirmed by the owner. Run with `npx tsx lib/import/ai/runMappingEval.ts`.",
    "This report contains headers, field keys and scores only; no cell values.",
    `Files scored: ${scores.length} of ${all.length}. A file that ended in manual mapping (provider error) is listed but not scored.`,
    "",
    "## Overall",
    "",
    "| Measure | Result |",
    "|---|---|",
    `| Field accuracy (all ${FIELD_KEYS.length} fields × ${scores.length} files, null = null counts) | ${sum((s) => s.correct)}/${sum((s) => s.total)} = ${pct(sum((s) => s.correct), sum((s) => s.total))} |`,
    `| Mapped-field recall (fields the key maps to a column) | ${sum((s) => s.mappedCorrect)}/${sum((s) => s.mappedExpected)} = ${pct(sum((s) => s.mappedCorrect), sum((s) => s.mappedExpected))} |`,
    `| False mappings (key says null, model chose a column) | ${sum((s) => s.falseMappings)} |`,
    `| Layout | ${layoutRight}/${layoutScored.length} = ${pct(layoutRight, layoutScored.length)} |`,
    `| Response mode | strict json_schema: ${modes("json_schema")} · json_object fallback: ${modes("json_object")} · manual: ${manual.length} |`,
    `| Questions raised (model + confidence < 0.8) | ${sum((s) => s.questions)} |`,
    "",
    "## Per file",
    "",
    "| File | Outcome | Attempts | Fields | Mapped recall | False mappings | Layout (expected → got) | Questions | Time |",
    "|---|---|---|---|---|---|---|---|---|",
    ...all.map((s) =>
      s.scored
        ? `| \`${s.file}\` | ${s.outcome} | ${s.attempts} | ${s.correct}/${s.total} (${pct(s.correct, s.total)}) | ${s.mappedCorrect}/${s.mappedExpected} | ${s.falseMappings} | ${s.layoutExpected ?? "not scored"} → ${s.layoutGot ?? "—"} ${s.layoutExpected === s.layoutGot ? "✓" : "✗"} | ${s.questions} | ${(s.ms / 1000).toFixed(1)} s |`
        : `| \`${s.file}\` | ${s.outcome} | ${s.attempts} | not scored | — | — | — | — | — |`,
    ),
    "",
    "## Mismatches",
    "",
  ];
  for (const s of scores) {
    lines.push(`### \`${s.file}\``, "");
    if (s.mismatches.length === 0) {
      lines.push("None.", "");
      continue;
    }
    lines.push("| Field | Expected | Model |", "|---|---|---|");
    for (const m of s.mismatches) lines.push(`| \`${m.field}\` | ${cell(m.expected)} | ${cell(m.got)} |`);
    lines.push("");
  }
  return lines.join("\n");
}

async function main() {
  if (existsSync(path.join(ROOT, ".env.local"))) process.loadEnvFile(path.join(ROOT, ".env.local"));
  const config = readAiConfig();
  if (!config) {
    console.error("AI_BASE_URL, AI_API_KEY and AI_MODEL must be set (https base URL).");
    process.exitCode = 1;
    return;
  }

  const keys = readdirSync(EXPECTED).filter((f) => f.endsWith(".json")).sort();
  const samples = readdirSync(SAMPLES);
  const scores: FileScore[] = [];

  for (const key of keys) {
    const base = key.replace(/\.json$/, "");
    const sampleFile = samples.find((f) => f.replace(/\.[^.]+$/, "") === base);
    if (!sampleFile) throw new Error(`no sample for ${key}`);
    const expected = loadExpected(key);
    const table = await loadTable(sampleFile);
    if (JSON.stringify(table.headers) !== JSON.stringify(expected._headers)) {
      throw new Error(`${sampleFile}: parsed headers differ from the answer key's _headers`);
    }
    if (scores.length > 0) await sleep(PAUSE_MS);
    let attempts = 0;
    let result: MappingResult;
    let started: number;
    for (;;) {
      attempts++;
      started = Date.now();
      result = await mapColumns(table, { config });
      if (result.status === "ok" || result.reason !== "RATE_LIMITED" || attempts > RATE_LIMIT_RETRIES) break;
      console.log(`${sampleFile}: rate limited, waiting ${RATE_LIMIT_WAIT_MS / 1000} s`);
      await sleep(RATE_LIMIT_WAIT_MS);
    }
    const s = score(sampleFile, expected, result, Date.now() - started, attempts);
    scores.push(s);
    console.log(
      s.scored
        ? `${sampleFile}: ${s.outcome} · fields ${s.correct}/${s.total} · layout ${s.layoutGot ?? "—"}`
        : `${sampleFile}: ${s.outcome} · not scored`,
    );
  }

  const markdown = report(config.model, new URL(config.baseUrl).host, scores, new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC");
  writeFileSync(REPORT, markdown + "\n");
  console.log(`\nModel ${config.model}. Report written to docs/import-eval.md`);
}

void main();
