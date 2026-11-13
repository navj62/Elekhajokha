// lib/import/ai/runMappingEval.ts
//
// Mapping eval: runs mapColumns on every file in samples/ that has an
// owner-written answer key in samples/expected/, and reports per-file and
// overall accuracy (per field and layout).
//
//   npx tsx lib/import/ai/runMappingEval.ts            real run: calls the model
//   npx tsx lib/import/ai/runMappingEval.ts --rescore  re-scores the saved results
//                                                      against the keys; no model
//                                                      call, no env, no network
//
// Env (real run only): AI_BASE_URL, AI_API_KEY, AI_MODEL, loaded from
// .env.local with Node's built-in process.loadEnvFile (no dotenv).
//
// Each real run saves the model's mapping to docs/import-eval-results.json and
// writes docs/import-eval.md. Both contain headers, field keys and scores only:
// never cell values, never the key, never the model's free text (transform
// labels, question messages).
//
// Calls run one after another, PAUSE_MS apart, to stay inside free-tier rate
// limits; a 429 is retried after RATE_LIMIT_WAIT_MS (eval only: the app itself
// falls back to manual mapping at once). A file that still ends in manual
// mapping is reported but NOT scored, so it cannot inflate accuracy.

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { extractTable, findHeaderRow, listSheets, readSheet } from "../parse";
import { FIELD_KEYS, LAYOUTS, type FieldKey, type Layout } from "./fields";
import { mapColumns, type ManualReason, type MappingResult } from "./mapColumns";
import { readAiConfig, type ResponseMode } from "./provider";

const ROOT = process.cwd();
const SAMPLES = path.join(ROOT, "samples");
const EXPECTED = path.join(SAMPLES, "expected");
const REPORT = path.join(ROOT, "docs", "import-eval.md");
const RESULTS = path.join(ROOT, "docs", "import-eval-results.json");
const PAUSE_MS = 20_000;
const RATE_LIMIT_WAIT_MS = 65_000;
const RATE_LIMIT_RETRIES = 3;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type Expected = { _headers: string[]; layout: Layout | null; fields: Record<FieldKey, string | null> };

/** What is saved per file: the model's mapping, with no free text and no cell values. */
type SavedRun = {
  file: string;
  outcome: { status: "ok"; mode: ResponseMode } | { status: "manual"; reason: ManualReason };
  layout: Layout | null;
  fields: Record<FieldKey, { column: string | null; confidence: number }> | null;
  /** Field keys the answer asked the owner about (the model's questions plus low-confidence ones). */
  questionFields: FieldKey[];
  attempts: number;
  ms: number;
};

type SavedResults = { model: string; host: string; ranAt: string; runs: SavedRun[] };

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
  questionFields: FieldKey[];
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

const keyFiles = () => readdirSync(EXPECTED).filter((f) => f.endsWith(".json")).sort();
const baseName = (file: string) => file.replace(/\.[^.]+$/, "");

async function loadTable(sampleFile: string) {
  const buffer = readFileSync(path.join(SAMPLES, sampleFile));
  const listed = await listSheets(buffer, sampleFile);
  const sheet = await readSheet(buffer, sampleFile, listed.sheets[0]?.name);
  const headerIndex = findHeaderRow(sheet.rows);
  if (headerIndex === null) throw new Error(`${sampleFile}: no header row`);
  return extractTable(sheet.rows, headerIndex);
}

function toSaved(file: string, result: MappingResult, attempts: number, ms: number): SavedRun {
  if (result.status !== "ok") {
    return { file, outcome: { status: "manual", reason: result.reason }, layout: null, fields: null, questionFields: [], attempts, ms };
  }
  const fields = {} as Record<FieldKey, { column: string | null; confidence: number }>;
  for (const key of FIELD_KEYS) {
    const { column, confidence } = result.mapping.fields[key];
    fields[key] = { column, confidence };
  }
  return {
    file,
    outcome: { status: "ok", mode: result.mode },
    layout: result.mapping.layout,
    fields,
    questionFields: [...new Set(result.mapping.questions.map((q) => q.field))],
    attempts,
    ms,
  };
}

function score(run: SavedRun, expected: Expected): FileScore {
  const got = (key: FieldKey) => run.fields?.[key].column ?? null;
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
  const ok = run.outcome.status === "ok";
  return {
    file: run.file,
    outcome: run.outcome.status === "ok" ? `ok (${run.outcome.mode})` : `manual: ${run.outcome.reason}`,
    layoutExpected: expected.layout,
    layoutGot: run.layout,
    correct,
    total: FIELD_KEYS.length,
    mappedExpected,
    mappedCorrect,
    falseMappings,
    questionFields: run.questionFields,
    mismatches,
    ms: run.ms,
    scored: ok,
    attempts: run.attempts,
  };
}

const pct = (n: number, d: number) => (d === 0 ? "n/a" : `${((100 * n) / d).toFixed(1)}%`);
const cell = (v: string | null) => (v === null ? "null" : `\`${v.replace(/\|/g, "\\|")}\``);

function report(saved: SavedResults, all: FileScore[], rescored: boolean): string {
  const scores = all.filter((s) => s.scored);
  const sum = (f: (s: FileScore) => number) => scores.reduce((n, s) => n + f(s), 0);
  const layoutScored = scores.filter((s) => s.layoutExpected !== null);
  const layoutRight = layoutScored.filter((s) => s.layoutExpected === s.layoutGot).length;
  const modes = (m: string) => scores.filter((s) => s.outcome === `ok (${m})`).length;
  const manual = all.filter((s) => !s.scored);
  const questions = sum((s) => s.questionFields.length);
  const when = `${saved.ranAt.slice(0, 16).replace("T", " ")} UTC`;

  const lines: string[] = [
    "# Import — AI mapping eval",
    "",
    `Model run: ${when} · Model: \`${saved.model}\` · Provider host: \`${saved.host}\``,
    ...(rescored
      ? [`Scored again from the saved results (\`docs/import-eval-results.json\`) against the current answer keys; the model was not called.`]
      : []),
    "",
    "Answer keys: `samples/expected/*.json`, written and confirmed by the owner.",
    "Real run: `npx tsx lib/import/ai/runMappingEval.ts` · Re-score without the model: `npx tsx lib/import/ai/runMappingEval.ts --rescore`.",
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
    `| Questions for the owner (model's own + confidence < 0.8) | ${questions} over ${scores.length} files = ${scores.length ? (questions / scores.length).toFixed(1) : "n/a"} per file |`,
    "",
    "## Per file",
    "",
    "| File | Outcome | Attempts | Fields | Mapped recall | False mappings | Layout (expected → got) | Questions | Time |",
    "|---|---|---|---|---|---|---|---|---|",
    ...all.map((s) =>
      s.scored
        ? `| \`${s.file}\` | ${s.outcome} | ${s.attempts} | ${s.correct}/${s.total} (${pct(s.correct, s.total)}) | ${s.mappedCorrect}/${s.mappedExpected} | ${s.falseMappings} | ${s.layoutExpected ?? "not scored"} → ${s.layoutGot ?? "—"} ${s.layoutExpected === s.layoutGot ? "✓" : "✗"} | ${s.questionFields.length} | ${(s.ms / 1000).toFixed(1)} s |`
        : `| \`${s.file}\` | ${s.outcome} | ${s.attempts} | not scored | — | — | — | — | — |`,
    ),
    "",
    "## Questions per file",
    "",
    "Fields the owner would be asked about (field keys only).",
    "",
  ];
  for (const s of all) {
    lines.push(`- \`${s.file}\` (${s.questionFields.length}): ${s.questionFields.length ? s.questionFields.map((f) => `\`${f}\``).join(", ") : "none"}`);
  }
  lines.push("", "## Mismatches", "");
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

function scoreAll(saved: SavedResults): FileScore[] {
  return keyFiles().map((key) => {
    const run = saved.runs.find((r) => baseName(r.file) === baseName(key));
    if (!run) throw new Error(`no saved result for ${key}; run the real eval first`);
    return score(run, loadExpected(key));
  });
}

async function realRun(): Promise<void> {
  if (existsSync(path.join(ROOT, ".env.local"))) process.loadEnvFile(path.join(ROOT, ".env.local"));
  const config = readAiConfig();
  if (!config) {
    console.error("AI_BASE_URL, AI_API_KEY and AI_MODEL must be set (https base URL).");
    process.exitCode = 1;
    return;
  }

  const samples = readdirSync(SAMPLES);
  const runs: SavedRun[] = [];

  for (const key of keyFiles()) {
    const sampleFile = samples.find((f) => baseName(f) === baseName(key));
    if (!sampleFile) throw new Error(`no sample for ${key}`);
    const expected = loadExpected(key);
    const table = await loadTable(sampleFile);
    if (JSON.stringify(table.headers) !== JSON.stringify(expected._headers)) {
      throw new Error(`${sampleFile}: parsed headers differ from the answer key's _headers`);
    }
    if (runs.length > 0) await sleep(PAUSE_MS);
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
    const run = toSaved(sampleFile, result, attempts, Date.now() - started);
    runs.push(run);
    const s = score(run, expected);
    console.log(
      s.scored
        ? `${sampleFile}: ${s.outcome} · fields ${s.correct}/${s.total} · layout ${s.layoutGot ?? "—"}`
        : `${sampleFile}: ${s.outcome} · not scored`,
    );
  }

  const saved: SavedResults = { model: config.model, host: new URL(config.baseUrl).host, ranAt: new Date().toISOString(), runs };
  writeFileSync(RESULTS, JSON.stringify(saved, null, 2) + "\n");
  writeFileSync(REPORT, report(saved, scoreAll(saved), false) + "\n");
  console.log(`\nModel ${config.model}. Wrote docs/import-eval-results.json and docs/import-eval.md`);
}

function rescore(): void {
  if (!existsSync(RESULTS)) {
    console.error("docs/import-eval-results.json not found; run the real eval first.");
    process.exitCode = 1;
    return;
  }
  const saved = JSON.parse(readFileSync(RESULTS, "utf8")) as SavedResults;
  const scores = scoreAll(saved);
  writeFileSync(REPORT, report(saved, scores, true) + "\n");
  for (const s of scores) console.log(`${s.file}: ${s.outcome} · fields ${s.correct}/${s.total}`);
  console.log(`\nRe-scored saved results from ${saved.model}. Wrote docs/import-eval.md`);
}

if (process.argv.includes("--rescore")) rescore();
else void realRun();
