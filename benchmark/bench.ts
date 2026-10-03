// Reconstructed 200-pair benchmark harness (methodology recorded in
// benchmark/baseline-2026-09-29.md):
// pairwise, A as input, B as sole candidate; confusion matrix over decided pairs.
// `--embed` fuses the transformers.js dense-retrieval signal (ranking only).
import * as fs from "fs";
import { fileURLToPath } from "node:url";
import { buildInputRecord, resolveMaterialRecord } from "@/lib/material-dna/demo";
import { normalizeDescription } from "@/lib/material-dna/normalization";
import { createEmbeddingSignal } from "@/lib/material-dna/matching/embeddings";
import type { EmbeddingSignal } from "@/lib/material-dna/matching";
import type { DecisionStatus } from "@/types/domain";

// Labelled 200-pair CSV, committed at benchmark/data/ so the benchmark is
// reproducible from a fresh clone. BENCH_CSV overrides it so you can score a
// different labelled set without editing the harness.
const DEFAULT_CSV = fileURLToPath(new URL("./data/material-pairs-labeled.csv", import.meta.url));
const CSV_PATH = process.env.BENCH_CSV ?? DEFAULT_CSV;
if (!fs.existsSync(CSV_PATH)) {
  console.error(
    `bench: labelled CSV not found at ${CSV_PATH}\n` +
      "       It ships with the repo at benchmark/data/material-pairs-labeled.csv;\n" +
      "       set BENCH_CSV to score a different labelled set."
  );
  process.exit(1);
}

interface Row {
  pair_id: string;
  a: string;
  b: string;
  label: number;
  category: string;
}

function parseCsv(text: string): Row[] {
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  const head = splitLine(lines[0]);
  const ia = head.indexOf("cpse_a_description");
  const ib = head.indexOf("cpse_b_description");
  const im = head.indexOf("match");
  const ic = head.indexOf("category");
  const ip = head.indexOf("pair_id");
  const rows: Row[] = [];
  for (let l = 1; l < lines.length; l++) {
    const f = splitLine(lines[l]);
    if (f.length < head.length) continue;
    rows.push({
      pair_id: f[ip],
      a: f[ia],
      b: f[ib],
      label: Number(f[im]),
      category: f[ic],
    });
  }
  return rows;
}

function splitLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') inQ = false;
      else cur += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out;
}

const t0 = Date.now();
const rows = parseCsv(fs.readFileSync(CSV_PATH, "utf8"));

const USE_EMB = process.argv.includes("--embed");
let signal: EmbeddingSignal | null = null;
if (USE_EMB) {
  const texts: string[] = [];
  for (const row of rows) {
    texts.push(row.a, row.b, normalizeDescription(row.a), normalizeDescription(row.b));
  }
  const te = Date.now();
  signal = await createEmbeddingSignal(texts, { budgetMs: 300000 });
  console.log(
    signal
      ? `[embedding] dense-retrieval signal ACTIVE (model Xenova/all-MiniLM-L6-v2, ${((Date.now() - te) / 1000).toFixed(1)}s)`
      : `[embedding] dense-retrieval signal ABSENT (lexical-only fallback)`
  );
}

const DETAIL_CATS = new Set(["unit_normalization", "grade_difference", "abbreviated_vs_full"]);
const details: string[] = [];

const decisions: Record<string, number> = {};
const cat: Record<string, { n: number; pos: number; MATCH: number; DNM: number; REVIEW: number; NO_MATCH: number }> = {};
interface R {
  row: Row;
  decision: DecisionStatus;
  finalScore: number;
  sim: number;
  criticals: number;
}
const results: R[] = [];

let idCollisions = 0;
const ids = new Set<string>();

for (const row of rows) {
  const input = buildInputRecord(row.a);
  const cand = buildInputRecord(row.b);
  if (input.id === cand.id) idCollisions++;
  ids.add(input.id);
  ids.add(cand.id);
  const res = resolveMaterialRecord(input, [cand], signal);
  const d = res.decision;
  decisions[d] = (decisions[d] ?? 0) + 1;
  results.push({
    row,
    decision: d,
    finalScore: res.selectedCandidate?.scoreDetails.finalScore ?? 0,
    sim: res.selectedCandidate?.similarityScore ?? 0,
    criticals: res.selectedCandidate?.criticalConflicts.length ?? 0,
  });
  if (DETAIL_CATS.has(row.category)) {
    const sc = res.selectedCandidate;
    const rules = sc ? sc.constraints.filter((c) => c.status !== "PASS").map((c) => `${c.rule}[${c.severity}/${c.status}]`).join(", ") : "(no candidate)";
    const sd = sc?.scoreDetails;
    details.push(
      `#${row.pair_id} ${row.category} label=${row.label} -> ${d} final=${sd?.finalScore ?? "-"} attr=${sd?.attributeAgreement ?? "-"} sem=${sd?.semanticSimilarity ?? "-"} crit=${res.selectedCandidate?.criticalConflicts.length ?? "-"}`
    );
    details.push(`   A: ${row.a}`);
    details.push(`   B: ${row.b}`);
    details.push(`   constraints: ${rules || "(none)"}`);
  }
  const c = (cat[row.category] ??= { n: 0, pos: 0, MATCH: 0, DNM: 0, REVIEW: 0, NO_MATCH: 0 });
  c.n++;
  if (row.label === 1) c.pos++;
  if (d === "MATCH") c.MATCH++;
  else if (d === "DO_NOT_MERGE") c.DNM++;
  else if (d === "REVIEW") c.REVIEW++;
  else c.NO_MATCH++;
}

const pos = rows.filter((r) => r.label === 1).length;
const neg = rows.length - pos;
const anchors = new Set(rows.map((r) => r.a)).size;
const cats = Object.keys(cat).length;

// confusion over decided
let TP = 0,
  FP = 0,
  FN = 0,
  TN = 0;
for (const r of results) {
  if (r.decision === "REVIEW") continue;
  if (r.decision === "MATCH") {
    if (r.row.label === 1) TP++;
    else FP++;
  } else {
    if (r.row.label === 1) FN++;
    else TN++;
  }
}
const abstain = results.filter((r) => r.decision === "REVIEW").length;
const decided = TP + FP + FN + TN;
const precision = TP / (TP + FP);
const recall = TP / (TP + FN);
const f1 = (2 * precision * recall) / (precision + recall);

// veto stats
const dnm = results.filter((r) => r.decision === "DO_NOT_MERGE");
const dnmTotal = dnm.length;
const dnmNeg = dnm.filter((r) => r.row.label === 0).length;
const dnmPos = dnm.filter((r) => r.row.label === 1).length;
const dnmCrit = dnm.filter((r) => r.criticals >= 1).length;

// P@k
function patk(key: "finalScore" | "sim"): string {
  const sorted = [...results].sort((a, b) => b[key] - a[key]);
  const at = (k: number) =>
    (sorted.slice(0, k).filter((r) => r.row.label === 1).length / k).toFixed(3);
  return `P@10=${at(10)} P@50=${at(50)} P@100=${at(100)} P@200=${at(Math.min(200, sorted.length))}`;
}

// per-anchor P@1
function anchorP1(key: "finalScore" | "sim"): string {
  const byA = new Map<string, R[]>();
  for (const r of results) {
    const arr = byA.get(r.row.a) ?? [];
    arr.push(r);
    byA.set(r.row.a, arr);
  }
  let hit = 0;
  let tot = 0;
  for (const arr of byA.values()) {
    tot++;
    const top = [...arr].sort((a, b) => b[key] - a[key])[0];
    if (top.row.label === 1) hit++;
  }
  return (hit / tot).toFixed(3);
}

function stats(key: "finalScore" | "sim"): string[] {
  const v1 = results.filter((r) => r.row.label === 1).map((r) => r[key]).sort((a, b) => a - b);
  const v0 = results.filter((r) => r.row.label === 0).map((r) => r[key]).sort((a, b) => a - b);
  const med = (v: number[]) => v[Math.floor(v.length / 2)];
  return [
    `${key} match=1: min=${v1[0]} median=${med(v1)} max=${v1[v1.length - 1]}`,
    `${key} match=0: min=${v0[0]} median=${med(v0)} max=${v0[v0.length - 1]}`,
    `positives below max(negatives)=${v1.filter((x) => x < v0[v0.length - 1]).length}/100`,
  ];
}

const lines: string[] = [];
lines.push(`rows=${rows.length}  match=1: ${pos}  match=0: ${neg}`);
lines.push(`unique CPSE-A anchors=${anchors} categories=${cats}`);
lines.push(`[engine bug probe] snapshotId collisions: ${idCollisions}/${rows.length} pairs have id(A)==id(B)`);
lines.push(`[engine bug probe] distinct ids among 400 descriptions: ${ids.size}/400`);
lines.push(`decision distribution: ${JSON.stringify(decisions)}`);
lines.push(`abstain (REVIEW): ${abstain}/${rows.length} (${((abstain / rows.length) * 100).toFixed(1)}%)`);
lines.push(`decided: ${decided}  TP=${TP} FP=${FP} FN=${FN} TN=${TN}`);
lines.push(`precision(MATCH)=${precision.toFixed(3)}  recall(MATCH)=${recall.toFixed(3)}  F1=${f1.toFixed(3)}`);
lines.push(`accuracy on decided pairs=${(((TP + TN) / decided) * 100).toFixed(1)}%`);
lines.push(`accuracy counting REVIEW as wrong=${(((TP + TN) / rows.length) * 100).toFixed(1)}%`);
lines.push(`DO_NOT_MERGE: ${dnmTotal} total, ${dnmNeg} on true non-matches (veto precision ${((dnmNeg / dnmTotal) * 100).toFixed(1)}%), ${dnmCrit} with >=1 critical conflict`);
lines.push(`false vetoes (true matches blocked): ${dnmPos}`);
lines.push(`finalScore:      ${patk("finalScore")}`);
lines.push(`similarityScore: ${patk("sim")}`);
lines.push(`per-anchor P@1 (finalScore): ${anchorP1("finalScore")} over ${byAnchor()} anchors (chance=0.500)`);
lines.push(`per-anchor P@1 (similarityScore): ${anchorP1("sim")} over ${byAnchor()} anchors (chance=0.500)`);
for (const l of stats("finalScore")) lines.push(l);
lines.push("");
lines.push("PER-CATEGORY");
for (const k of Object.keys(cat).sort()) {
  const c = cat[k];
  lines.push(`${k.padEnd(26)} n=${String(c.n).padStart(2)} pos=${String(c.pos).padStart(2)} MATCH=${c.MATCH} DNM=${c.DNM} REVIEW=${c.REVIEW} NO_MATCH=${c.NO_MATCH}`);
}

// worked examples from the audit
for (const id of ["2", "6", "3", "7"]) {
  const r = results.find((x) => x.row.pair_id === id);
  if (!r) continue;
  lines.push(`\n#${id} -> ${r.decision} final=${r.finalScore} sim=${r.sim} criticals=${r.criticals} label=${r.row.label}`);
  lines.push(`  A: ${r.row.a}`);
  lines.push(`  B: ${r.row.b}`);
}

function byAnchor(): number {
  return new Set(rows.map((r) => r.a)).size;
}

lines.push(`\nDETAIL (3 target categories)`);
lines.push(...details);
lines.push(`\nruntime: ${Date.now() - t0} ms`);
console.log(lines.join("\n"));
