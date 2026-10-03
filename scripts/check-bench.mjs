// Verifies that the benchmark harness still reproduces its recorded output.
//
// The golden files are the reference, so this compares the harness against them
// line for line rather than eyeballing the headline numbers. Only genuinely
// volatile values are masked: wall-clock timings. Everything else must match
// exactly, because that is the whole point of keeping a golden file.
//
//   node scripts/check-bench.mjs           # lexical-only run
//   node scripts/check-bench.mjs --embed   # dense-retrieval-signal run

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const embed = process.argv.includes("--embed");

const goldenFile = path.join(root, "benchmark", embed ? "expected-embed.txt" : "expected-baseline.txt");

/** Volatile values we cannot hold stable, replaced by a fixed token. */
const MASKS = [
  // Wall-clock timings reported by the harness itself.
  [/^(\s*runtime:\s*)[\d.]+\s*(ms|s|sec)$/i, "$1<t>"],
  // Model load time on the embedding run.
  [/^(\[embedding\][^\n]*?),\s*[\d.]+s\)$/, "$1, <t>)"],
];

function normalize(text) {
  return text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => {
      let out = line.replace(/\s+$/, "");
      for (const [re, rep] of MASKS) out = out.replace(re, rep);
      return out;
    })
    .join("\n")
    .replace(/\n+$/, "\n");
}

function run() {
  const args = [path.join(here, "build-bench.mjs")];
  execFileSync(process.execPath, args, { cwd: root, stdio: "ignore" });
  return execFileSync(process.execPath, [path.join(root, "benchmark", "bench.mjs"), ...(embed ? ["--embed"] : [])], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
}

const actual = normalize(run());
const expected = normalize(readFileSync(goldenFile, "utf8"));
const label = embed ? "bench:embed" : "bench";

if (actual === expected) {
  const n = expected.split("\n").length - 1;
  console.log(`PASS  ${label} reproduces ${path.relative(root, goldenFile)} exactly (${n} lines)`);
  process.exit(0);
}

const a = actual.split("\n");
const e = expected.split("\n");
const diffs = [];
for (let i = 0; i < Math.max(a.length, e.length) && diffs.length < 20; i++) {
  if (a[i] !== e[i]) diffs.push({ line: i + 1, actual: a[i], expected: e[i] });
}

console.error(`FAIL  ${label} does not reproduce ${path.relative(root, goldenFile)}`);
console.error(`      ${diffs.length === 0 ? "files differ only in trailing content" : `${diffs.length} differing line(s) shown`}\n`);
for (const d of diffs) {
  console.error(`  line ${d.line}`);
  console.error(`    harness: ${d.actual === undefined ? "<missing>" : JSON.stringify(d.actual)}`);
  console.error(`    golden : ${d.expected === undefined ? "<missing>" : JSON.stringify(d.expected)}`);
}
console.error("\nIf this is an intended engine change, re-run the harness and replace the golden file deliberately.");
process.exit(1);