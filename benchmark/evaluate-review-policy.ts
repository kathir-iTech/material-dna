import fs from "node:fs";
import crypto from "node:crypto";
import { parseCsv } from "@/lib/migration/parse";
import {
  buildInputRecord,
  resolveMaterialRecord,
} from "@/lib/material-dna/demo";
import {
  resolveWithReviewPolicy,
  REVIEW_POLICY_VERSION,
} from "@/lib/material-dna/matching/review-first";
const file = "benchmark/data/material-pairs-labeled.csv";
const content = fs.readFileSync(file, "utf8"),
  [header, ...rows] = parseCsv(content);
const index = (name: string) => header.indexOf(name);
const items = rows
  .filter((row) => row.length >= header.length)
  .map((row) => ({
    id: row[index("pair_id")],
    a: row[index("cpse_a_description")],
    b: row[index("cpse_b_description")],
    label: Number(row[index("match")]),
    category: row[index("category")],
  }));
function evaluate(conservative: boolean) {
  const counts = { MATCH: 0, DO_NOT_MERGE: 0, REVIEW: 0, NO_MATCH: 0 };
  let tp = 0,
    fp = 0,
    fn = 0,
    tn = 0;
  const errors: {
    id: string;
    category: string;
    a: string;
    b: string;
    decision: string;
    reason: string;
  }[] = [];
  const results = items.map((item) => {
    const input = buildInputRecord(item.a),
      reference = { ...buildInputRecord(item.b), id: `REF-${item.id}` };
    const res = conservative
      ? resolveWithReviewPolicy(input, [reference])
      : resolveMaterialRecord(input, [reference]);
    counts[res.decision]++;
    if (res.decision !== "REVIEW") {
      if (res.decision === "MATCH") {
        if (item.label) tp++;
        else fp++;
      } else {
        if (item.label) fn++;
        else tn++;
      }
    }
    if (res.decision === "MATCH" && !item.label)
      errors.push({ ...item, decision: res.decision, reason: res.reason });
    return {
      id: item.id,
      category: item.category,
      label: item.label,
      decision: res.decision,
    };
  });
  const precision = tp + fp ? tp / (tp + fp) : 0,
    recall = tp + fn ? tp / (tp + fn) : 0;
  return {
    total: items.length,
    counts,
    tp,
    fp,
    fn,
    tn,
    precision,
    recall,
    f1:
      precision + recall ? (2 * precision * recall) / (precision + recall) : 0,
    automaticTrueMatchCoverage: tp / items.filter((i) => i.label === 1).length,
    abstention: counts.REVIEW / items.length,
    errors,
    results,
  };
}
const report = {
  schemaVersion: 1,
  policy: REVIEW_POLICY_VERSION,
  dataset: file,
  datasetSha256: crypto.createHash("sha256").update(content).digest("hex"),
  scope:
    "Development comparison on the same synthetic regression set; not independent validation or a holdout. Lexical scoring only; no dense model.",
  submittedLexical: evaluate(false),
  reviewFirst: evaluate(true),
};
fs.writeFileSync(
  "benchmark/review-first-results.json",
  JSON.stringify(report, null, 2) + "\n",
);
for (const [name, result] of Object.entries({
  submittedLexical: report.submittedLexical,
  reviewFirst: report.reviewFirst,
}))
  console.log(
    name,
    JSON.stringify({
      counts: result.counts,
      precision: result.precision,
      f1: result.f1,
      falseMatches: result.fp,
      automaticTrueMatchCoverage: result.automaticTrueMatchCoverage,
    }),
  );
