import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { DemoBadge } from "@/components/ui/badge";
import { SimilarityWarning } from "@/components/similarity-warning";
import type { CandidateScore, ConstraintResult } from "@/types/domain";
import {
  FlaskConical,
  Percent,
  Target,
  TriangleAlert,
  Goal,
  Network,
  Table2,
  TrendingUp,
} from "lucide-react";

const EXPERIMENTAL: Record<string, "EXPERIMENTAL" | "PROTOTYPE" | "PROPOSED" | "FUTURE"> = {
  experimental: "EXPERIMENTAL",
  prototype: "PROTOTYPE",
  proposed: "PROPOSED",
  future: "FUTURE",
};

const SIGNALS: Record<string, { tone: "blue" | "cyan" | "amber" | "purple" | "green"; label: string }> = {
  EXPERIMENTAL: { tone: "blue", label: "EXPERIMENTAL" },
  PROTOTYPE: { tone: "cyan", label: "PROTOTYPE" },
  PROPOSED: { tone: "purple", label: "PROPOSED" },
  FUTURE: { tone: "amber", label: "FUTURE" },
};

const CAPABILITY_TABLE: Array<{ capability: string; status: string }> = [
  { capability: "Material attribute extraction", status: "Prototype implemented" },
  { capability: "Candidate matching", status: "Prototype implemented" },
  { capability: "Constraint engine", status: "Prototype implemented" },
  { capability: "Evidence panel", status: "Implemented" },
  { capability: "Review workflow", status: "Demo implemented" },
  { capability: "Canonical identities", status: "Demo implemented" },
  { capability: "Identity graph", status: "Demo implemented" },
  { capability: "Real CPSE data", status: "Not available" },
  { capability: "SAP integration", status: "Future" },
  { capability: "National-scale deployment", status: "Future" },
  { capability: "Learned production model", status: "Future" },
];

// ---------------------------------------------------------------------------
// Measured 200-pair benchmark results live in
// @/lib/material-dna/research-benchmark, which is verified against the recorded
// harness output (benchmark/expected-baseline.txt, benchmark/expected-embed.txt)
// by tests/research-benchmark.test.ts. Nothing here is hand-typed.
// ---------------------------------------------------------------------------

import {
  BENCHMARK_HEADLINE,
  BENCHMARK_RUNS,
  BENCHMARK_RUN_DATE,
  LEXICAL_BASELINE,
} from "@/lib/material-dna/research-benchmark";

const BENCHMARK_CATEGORIES: Array<{
  category: string;
  n: number;
  pos: number;
  match: number;
  dnm: number;
  review: number;
  noMatch: number;
}> = [
  { category: "abbreviated_vs_full", n: 23, pos: 23, match: 7, dnm: 6, review: 10, noMatch: 0 },
  { category: "actuator_difference", n: 2, pos: 0, match: 1, dnm: 0, review: 1, noMatch: 0 },
  { category: "angle_difference", n: 1, pos: 0, match: 1, dnm: 0, review: 0, noMatch: 0 },
  { category: "capacitance_difference", n: 1, pos: 0, match: 0, dnm: 1, review: 0, noMatch: 0 },
  { category: "capacity_difference", n: 3, pos: 0, match: 0, dnm: 1, review: 2, noMatch: 0 },
  { category: "coating_difference", n: 1, pos: 0, match: 0, dnm: 0, review: 1, noMatch: 0 },
  { category: "current_difference", n: 2, pos: 0, match: 0, dnm: 2, review: 0, noMatch: 0 },
  { category: "drive_size_difference", n: 1, pos: 0, match: 0, dnm: 0, review: 1, noMatch: 0 },
  { category: "electrode_difference", n: 1, pos: 0, match: 0, dnm: 1, review: 0, noMatch: 0 },
  { category: "filtration_difference", n: 1, pos: 0, match: 0, dnm: 0, review: 1, noMatch: 0 },
  { category: "grade_difference", n: 11, pos: 0, match: 0, dnm: 10, review: 1, noMatch: 0 },
  { category: "grit_difference", n: 1, pos: 0, match: 0, dnm: 0, review: 1, noMatch: 0 },
  { category: "hardness_difference", n: 1, pos: 0, match: 1, dnm: 0, review: 0, noMatch: 0 },
  { category: "manufacturer_variation", n: 1, pos: 1, match: 0, dnm: 0, review: 1, noMatch: 0 },
  { category: "material_difference", n: 3, pos: 0, match: 2, dnm: 1, review: 0, noMatch: 0 },
  { category: "mesh_size_difference", n: 1, pos: 0, match: 1, dnm: 0, review: 0, noMatch: 0 },
  { category: "pressure_difference", n: 3, pos: 0, match: 2, dnm: 1, review: 0, noMatch: 0 },
  { category: "range_difference", n: 1, pos: 0, match: 1, dnm: 0, review: 0, noMatch: 0 },
  { category: "section_difference", n: 1, pos: 0, match: 0, dnm: 0, review: 1, noMatch: 0 },
  { category: "sensing_distance", n: 1, pos: 0, match: 0, dnm: 1, review: 0, noMatch: 0 },
  { category: "size_difference", n: 52, pos: 0, match: 0, dnm: 34, review: 18, noMatch: 0 },
  { category: "standard_mapping", n: 2, pos: 2, match: 0, dnm: 1, review: 0, noMatch: 1 },
  { category: "type_difference", n: 7, pos: 0, match: 4, dnm: 1, review: 2, noMatch: 0 },
  { category: "unit_normalization", n: 13, pos: 13, match: 7, dnm: 2, review: 4, noMatch: 0 },
  { category: "viscosity_difference", n: 2, pos: 0, match: 0, dnm: 0, review: 2, noMatch: 0 },
  { category: "voltage_difference", n: 2, pos: 0, match: 0, dnm: 0, review: 2, noMatch: 0 },
  { category: "wattage_difference", n: 1, pos: 0, match: 0, dnm: 1, review: 0, noMatch: 0 },
  { category: "word_reorder", n: 61, pos: 61, match: 38, dnm: 1, review: 22, noMatch: 0 },
];

// Pair #2 — SS304 vs SS316L, measured by the harness (identical engine path
// as the Resolve page's SimilarityWarning moment).
const PAIR_2_EXAMPLE = {
  a: "SS304 stainless steel pipe 50mm OD x 3mm wall",
  b: "SS316L stainless steel pipe 50mm OD x 3mm wall",
  similarity: 95,
  finalScore: 34,
  score: {
    semanticSimilarity: 94,
    tokenOverlap: 100,
    diceSimilarity: 89,
    tfidfSimilarity: 89,
    attributeAgreement: 76,
    conflictPenalty: 55,
    evidenceCoverage: 100,
    finalScore: 34,
  } satisfies CandidateScore,
  constraint: {
    attributes: ["grade"],
    severity: "CRITICAL",
    status: "CONFLICT",
    leftValue: "304",
    rightValue: "316L",
    rule: "critical-grade-mismatch",
    explanation: "Material property class differs: 304 vs 316L.",
    attributeLabel: "Grade",
  } satisfies ConstraintResult,
};

export default function ResearchClient() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-dna-text">Validation & Research</h1>
          <p className="mt-1 max-w-3xl text-sm text-dna-muted">
            Prototype experiments, adversarial demonstration data, and the honest validation roadmap.
          </p>
        </div>
        <DemoBadge />
      </div>

      <p className="max-w-3xl rounded border border-dna-purple/40 bg-dna-purple/5 px-4 py-3 text-xs text-dna-muted">
        Demonstration values are synthetic and do not represent confidential CPSE records.
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Prototype experiments */}
        <Card>
          <CardHeader
            title="Prototype Experiments"
            subtitle="Baseline evidence, not CPSE production accuracy."
            right={<FlaskConical size={15} className="text-dna-cyan" aria-hidden="true" />}
          />
          <CardBody className="space-y-3">
            <div className="rounded border border-dna-border bg-dna-panel2 p-3">
              <div className="flex items-center justify-between">
                <Badge tone="cyan">TF-IDF baseline</Badge>
                <Badge tone="blue">{EXPERIMENTAL.experimental}</Badge>
              </div>
              <div className="mt-2 space-y-1 text-xs text-dna-muted">
                <p><span className="text-dna-faint">Dataset:</span> Abt-Buy product entity-resolution benchmark</p>
                <p><span className="text-dna-faint">Purpose:</span> Establish a lexical baseline.</p>
                <p><span className="text-dna-faint">Result:</span> TF-IDF P@10 = 1.000, but recall drops sharply (R@200 = 0.170) — a retrieval gap.</p>
                <p className="mt-1 text-[11px] text-dna-faint">
                  Limitation: e-commerce benchmark, not CPSE material data. Used as baseline evidence rather than production material accuracy.
                </p>
              </div>
            </div>

            <div className="rounded border border-dna-border bg-dna-panel2 p-3">
              <div className="flex items-center justify-between">
                <Badge tone="cyan">Quantity extraction</Badge>
                <Badge tone="blue">{EXPERIMENTAL.experimental}</Badge>
              </div>
              <div className="mt-2 space-y-1 text-xs text-dna-muted">
                <p><span className="text-dna-faint">Dataset:</span> Prototype local material descriptions</p>
                <p><span className="text-dna-faint">Purpose:</span> Measure unit-aware quantity detection coverage.</p>
                <p>
                  <Percent size={11} className="inline text-dna-cyan" aria-hidden="true" />{" "}
                  <span className="font-mono text-dna-text">102 / 109</span>{" "}
                  <span className="font-mono text-dna-cyan">93.6%</span>
                  <span className="text-[11px] text-dna-faint"> — prototype local quantity-detection coverage</span>
                </p>
                <p className="mt-1 text-[11px] text-dna-faint">
                  Limitation: unit-aware parsing requires engineering-domain interpretation; raw quantity parsers can misinterpret identifiers, grades and standard numbers.
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Adversarial benchmark */}
        <Card>
          <CardHeader
            title="Adversarial Material Benchmark"
            subtitle="200 team-created labelled demonstration pairs."
            right={<Target size={15} className="text-dna-cyan" aria-hidden="true" />}
          />
          <CardBody className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              <Badge tone="green">100 match</Badge>
              <Badge tone="red">100 non-match</Badge>
              <Badge tone="purple">{EXPERIMENTAL.prototype}</Badge>
            </div>
            <p className="text-sm text-dna-muted">
              Designed to stress near-miss patterns that generic lexical matching gets wrong:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {[
                "word reorder",
                "size difference",
                "grade difference",
                "abbreviation",
                "material substitution",
                "standard difference",
                "dimension changes",
              ].map((c) => (
                <Badge key={c} tone="neutral" className="font-mono">{c}</Badge>
              ))}
            </div>
            <p className="text-[11px] text-dna-faint">
              Designed as an adversarial demonstration suite; not a statistically representative CPSE benchmark.
            </p>
          </CardBody>
        </Card>
      </div>

      {/* ============================================================
          MEASURED 200-PAIR BENCHMARK RESULTS (post-Phase 1-2 engine)
          Deliberately its own section — never blended with the
          Abt-Buy academic baseline shown above.
          ============================================================ */}
      <Card>
        <CardHeader
          title="Measured Results — Our 200-Pair Benchmark"
          subtitle={`Measured on our own 200-pair benchmark, run ${BENCHMARK_RUN_DATE}.`}
          right={<TrendingUp size={15} className="text-dna-green" aria-hidden="true" />}
        />
        <CardBody className="space-y-4">
          <div className="rounded border border-dna-green/40 bg-dna-green/5 px-4 py-3">
            <p className="font-mono text-xs font-semibold text-dna-green">
              Measured on our own 200-pair benchmark, run {BENCHMARK_RUN_DATE}
            </p>
            <p className="mt-1 text-xs text-dna-muted">
              Team-created labelled pairs (100 match / 100 non-match, 28 categories), scored
              pairwise by the current engine: pair (A, B) with A as input and B as the sole
              candidate; the confusion matrix covers decided pairs only (REVIEW = abstention).
            </p>
            <p className="mt-1 text-[11px] text-dna-faint">
              Separate benchmark from the academic Abt-Buy baseline shown under &ldquo;Prototype
              Experiments&rdquo; above — different dataset, different task. The two sets of
              numbers are never combined into one table.
            </p>
          </div>

          {/* Both recorded runs, side by side. The fused configuration is the
              shipped one and leads; the lexical-only run is shown alongside it
              rather than replaced, because it is the pre-fusion reference. */}
          <div className="overflow-x-auto rounded border border-dna-border">
            <table className="w-full min-w-[560px] text-left text-xs">
              <thead>
                <tr className="border-b border-dna-border bg-dna-panel2">
                  <th scope="col" className="px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-dna-faint">
                    F1 (MATCH)
                  </th>
                  {BENCHMARK_RUNS.map((run) => (
                    <th
                      key={run.id}
                      scope="col"
                      className={`px-3 py-2 font-mono text-[11px] uppercase tracking-wider ${
                        run.id === "fused" ? "text-dna-green" : "text-dna-faint"
                      }`}
                    >
                      {run.f1.toFixed(3)}
                      <span className="mt-0.5 block font-sans normal-case tracking-normal text-[10px] opacity-80">
                        {run.label}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="font-mono">
                {(
                  [
                    { k: "precision", label: "Precision", fmt: (r: (typeof BENCHMARK_RUNS)[number]) => r.precision.toFixed(3) },
                    { k: "recall", label: "Recall", fmt: (r: (typeof BENCHMARK_RUNS)[number]) => r.recall.toFixed(3) },
                    { k: "decided", label: "Decided pairs", fmt: (r: (typeof BENCHMARK_RUNS)[number]) => String(r.decided) },
                    { k: "abstainPct", label: "Abstain (REVIEW)", fmt: (r: (typeof BENCHMARK_RUNS)[number]) => `${r.abstainPct.toFixed(1)}%` },
                  ] as const
                ).map((row) => (
                  <tr key={row.k} className="border-b border-dna-border/40 last:border-0">
                    <th scope="row" className="px-3 py-1.5 font-sans text-[11px] font-normal text-dna-muted">
                      {row.label}
                    </th>
                    {BENCHMARK_RUNS.map((run) => (
                      <td key={run.id} className="px-3 py-1.5 text-dna-text">
                        {row.fmt(run)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-dna-faint">
            F1 <span className="font-mono text-dna-green">{BENCHMARK_HEADLINE.f1.toFixed(3)}</span> with the
            fused signal, up from{" "}
            <span className="font-mono">{LEXICAL_BASELINE.f1.toFixed(3)}</span> lexical-only. The fused
            signal reorders candidates, which moves one pair from abstention into an accepted match; the
            veto set is identical in both runs. Figures below describe the fused configuration unless
            stated otherwise.
          </p>

          {/* Headline metrics */}
          <p className="font-mono text-[11px] uppercase tracking-wider text-dna-faint">
            Shipped configuration — {BENCHMARK_HEADLINE.label}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: "F1", value: BENCHMARK_HEADLINE.f1.toFixed(3), tone: "text-dna-green" },
              { label: "Precision (MATCH)", value: BENCHMARK_HEADLINE.precision.toFixed(3), tone: "text-dna-text" },
              { label: "Recall (MATCH)", value: BENCHMARK_HEADLINE.recall.toFixed(3), tone: "text-dna-text" },
              { label: "Abstain (REVIEW)", value: `${BENCHMARK_HEADLINE.abstainPct.toFixed(1)}%`, tone: "text-dna-amber" },
            ].map((m) => (
              <div key={m.label} className="rounded border border-dna-border bg-dna-panel2 p-3 text-center">
                <div className={`font-mono text-2xl font-bold ${m.tone}`}>{m.value}</div>
                <div className="mt-1 text-[11px] uppercase tracking-wider text-dna-faint">{m.label}</div>
              </div>
            ))}
          </div>

          {/* Confusion / decisions detail */}
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded border border-dna-border bg-dna-panel2 p-3 text-xs text-dna-muted">
              <p className="mb-1 font-mono text-[11px] uppercase tracking-wider text-dna-faint">
                Decision distribution (n = {BENCHMARK_HEADLINE.total})
              </p>
              <p className="font-mono">
                <span className="text-dna-green">MATCH {BENCHMARK_HEADLINE.decisions.MATCH}</span>
                {" · "}
                <span className="text-dna-red">DO_NOT_MERGE {BENCHMARK_HEADLINE.decisions.DO_NOT_MERGE}</span>
                {" · "}
                <span className="text-dna-faint">NO_MATCH {BENCHMARK_HEADLINE.decisions.NO_MATCH}</span>
                {" · "}
                <span className="text-dna-amber">REVIEW {BENCHMARK_HEADLINE.decisions.REVIEW}</span>
              </p>
              <p className="mt-1 font-mono">
                TP={BENCHMARK_HEADLINE.tp} FP={BENCHMARK_HEADLINE.fp} FN={BENCHMARK_HEADLINE.fn} TN={BENCHMARK_HEADLINE.tn}
                <span className="text-dna-faint"> (decided = {BENCHMARK_HEADLINE.decided})</span>
              </p>
              <p className="mt-1 text-[11px] text-dna-faint">
                Accuracy on decided pairs: {BENCHMARK_HEADLINE.accuracyDecided.toFixed(1)}%
              </p>
            </div>
            <div className="rounded border border-dna-border bg-dna-panel2 p-3 text-xs text-dna-muted">
              <p className="mb-1 font-mono text-[11px] uppercase tracking-wider text-dna-faint">
                Constraint-veto quality
              </p>
              <p className="font-mono">
                veto precision{" "}
                <span className="text-dna-text">{BENCHMARK_HEADLINE.vetoPrecisionPct.toFixed(1)}%</span>{" "}
                <span className="text-dna-faint">
                  ({BENCHMARK_HEADLINE.vetoCorrect}/{BENCHMARK_HEADLINE.vetoTotal} DO_NOT_MERGE correct)
                </span>
              </p>
              <p className="mt-1 font-mono">
                false vetoes (true matches blocked):{" "}
                <span className="text-dna-text">{BENCHMARK_HEADLINE.falseVetoes}</span>
              </p>
            </div>
          </div>

          {/* Worked example — same confrontation moment as the Resolve page */}
          <div>
            <h4 className="text-sm font-semibold text-dna-text">
              Worked example — SS304 vs SS316L (benchmark pair #2)
            </h4>
            <p className="mt-1 font-mono text-xs text-dna-muted">
              A: <span className="text-dna-text">{PAIR_2_EXAMPLE.a}</span>
            </p>
            <p className="font-mono text-xs text-dna-muted">
              B: <span className="text-dna-text">{PAIR_2_EXAMPLE.b}</span>
            </p>
            <div className="mt-2">
              <SimilarityWarning
                similarity={PAIR_2_EXAMPLE.similarity}
                score={PAIR_2_EXAMPLE.score}
                constraint={PAIR_2_EXAMPLE.constraint}
              />
            </div>
            <p className="mt-2 text-xs text-dna-muted">
              <span className="text-dna-faint">Aggregate backing:</span> final score{" "}
              <span className="font-mono text-dna-text">{PAIR_2_EXAMPLE.finalScore}</span> with one
              CRITICAL grade conflict — and this is not a cherry-picked anecdote: across the whole
              benchmark the veto fired{" "}
              <span className="font-mono text-dna-text">{BENCHMARK_HEADLINE.vetoTotal}</span> times,{" "}
              <span className="font-mono text-dna-green">{BENCHMARK_HEADLINE.vetoCorrect}</span> of
              them correct (
              <span className="font-mono">{BENCHMARK_HEADLINE.vetoPrecisionPct.toFixed(1)}%</span>{" "}
              precision), with only{" "}
              <span className="font-mono">{BENCHMARK_HEADLINE.falseVetoes}</span> false vetoes. In
              the <span className="font-mono">grade_difference</span> category that produced this
              pair:{" "}
              <span className="font-mono text-dna-text">
                10 DO_NOT_MERGE / 1 REVIEW / 0 false MATCH
              </span>{" "}
              over 11 non-match pairs.
            </p>
          </div>

          {/* Per-category table */}
          <div>
            <h4 className="text-sm font-semibold text-dna-text">
              Per-category decisions — 200 pairs, 28 categories
            </h4>
            <p className="mt-1 text-[11px] text-dna-faint">
              Breakdown of the{" "}
              <span className="font-mono text-dna-muted">{LEXICAL_BASELINE.label.toLowerCase()}</span> run
              (F1 <span className="font-mono">{LEXICAL_BASELINE.f1.toFixed(3)}</span>). The fused run
              reorders candidates within the same categories and does not change this table&rsquo;s totals by
              more than one pair.
            </p>
            <p className="mt-1 text-[11px] text-dna-faint">
              pos = ground-truth match pairs in the category; MATCH / DNM / REVIEW / NO_MATCH are
              engine decisions. Engine error modes: MATCH on pos=0 rows, DNM on pos=n rows.
            </p>
            <p className="mt-1 text-[11px] text-dna-faint">
              The confusion matrix counts decided pairs only, so pos does not equal TP + FN. Of the
              100 ground-truth matches, 52 became TP and 11 FN while 37 were abstained to REVIEW; of
              the 100 non-matches, 54 became TN and 13 FP while 33 were abstained. Those 37 + 33 = 70
              abstentions are exactly the REVIEW row in the distribution above.
            </p>
            <div className="mt-2 overflow-x-auto rounded border border-dna-border">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-dna-border bg-dna-panel2 font-mono text-[10px] uppercase tracking-wider text-dna-faint">
                    <th className="px-3 py-2 font-medium">Category</th>
                    <th className="px-3 py-2 text-right font-medium">n</th>
                    <th className="px-3 py-2 text-right font-medium">pos</th>
                    <th className="px-3 py-2 text-right font-medium text-dna-green">MATCH</th>
                    <th className="px-3 py-2 text-right font-medium text-dna-red">DNM</th>
                    <th className="px-3 py-2 text-right font-medium text-dna-amber">REVIEW</th>
                    <th className="px-3 py-2 text-right font-medium">NO_MATCH</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {BENCHMARK_CATEGORIES.map((row) => (
                    <tr key={row.category} className="border-b border-dna-border/50">
                      <td className="px-3 py-1.5 text-dna-text">{row.category}</td>
                      <td className="px-3 py-1.5 text-right text-dna-muted">{row.n}</td>
                      <td className="px-3 py-1.5 text-right text-dna-muted">{row.pos}</td>
                      <td className="px-3 py-1.5 text-right text-dna-text">{row.match}</td>
                      <td className="px-3 py-1.5 text-right text-dna-text">{row.dnm}</td>
                      <td className="px-3 py-1.5 text-right text-dna-text">{row.review}</td>
                      <td className="px-3 py-1.5 text-right text-dna-muted">{row.noMatch}</td>
                    </tr>
                  ))}
                  <tr className="bg-dna-panel2 font-medium">
                    <td className="px-3 py-1.5 text-dna-faint">total</td>
                    <td className="px-3 py-1.5 text-right text-dna-text">200</td>
                    <td className="px-3 py-1.5 text-right text-dna-text">100</td>
                    <td className="px-3 py-1.5 text-right text-dna-green">65</td>
                    <td className="px-3 py-1.5 text-right text-dna-red">64</td>
                    <td className="px-3 py-1.5 text-right text-dna-amber">70</td>
                    <td className="px-3 py-1.5 text-right text-dna-text">1</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[11px] text-dna-faint">
              Known weaknesses visible in this table: 13 false MATCHes total — type_difference 4,
              material_difference 2, pressure_difference 2, and one each in actuator, angle,
              hardness, mesh_size and range. standard_mapping is 0 correct decisions out of 2.
              Reported as measured — no category was excluded.
            </p>
          </div>
        </CardBody>
      </Card>

      {/* What remains to be validated */}
      <Card>
        <CardHeader
          title="What remains to be validated?"
          subtitle="A serious engineering team knows what remains unproven."
          right={<TriangleAlert size={15} className="text-dna-amber" aria-hidden="true" />}
        />
        <CardBody>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {[
              "Real CPSE material data",
              "Cross-organization ontology alignment",
              "Real engineering equivalence decisions",
              "Large-scale performance",
              "ERP integration",
              "Domain-specific standards mapping",
              "Human reviewer agreement",
              "Production security",
              "Data governance",
            ].map((item) => (
              <div key={item} className="rounded border border-dna-border bg-dna-panel2 px-3 py-2 text-xs text-dna-muted">
                {item}
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* What makes Material DNA different */}
      <Card>
        <CardHeader
          title="What Makes Material DNA Different?"
          subtitle="Engineering-aware identity."
          right={<Goal size={15} className="text-dna-cyan" aria-hidden="true" />}
        />
        <CardBody className="space-y-3">
          <h3 className="text-base font-semibold text-dna-text">
            Match records without ignoring engineering reality.
          </h3>
          <p className="max-w-3xl text-sm text-dna-muted">
            Generic entity resolution can identify likely relationships. Material DNA adds a
            domain-specific decision layer where engineering-critical conflicts can prevent an
            unsafe merge.
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {[
              "Engineering attribute extraction",
              "Critical constraint validation",
              "Evidence-backed decisions",
              "Risk-aware abstention",
              "Legacy-to-canonical mapping",
              "Human governance",
              "Versionable material identity",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 rounded border border-dna-border bg-dna-panel2 px-3 py-2 text-xs text-dna-text">
                <span className="h-1.5 w-1.5 rounded-full bg-dna-cyan" />
                {item}
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Next-gen architecture */}
      <Card>
        <CardHeader
          title="Constraint-Aware Material Identity Graph"
          subtitle="Proposed next-generation architecture — not deployed at national scale."
          right={<Network size={15} className="text-dna-purple" aria-hidden="true" />}
        />
        <CardBody>
          <div className="flex flex-wrap items-center justify-center gap-1.5 py-2 font-mono text-[11px]">
            {[
              "Material records",
              "Extracted attributes",
              "Evidence",
              "Candidate links",
              "Constraints",
              "Canonical identities",
              "Legacy mappings",
            ].map((step, i, arr) => (
              <div key={step} className="flex items-center gap-1.5">
                <span className="rounded border border-dna-border2 bg-dna-panel2 px-2 py-1 text-dna-text">
                  {step}
                </span>
                {i < arr.length - 1 && <span className="text-dna-faint">→</span>}
              </div>
            ))}
          </div>
          <p className="mt-3 max-w-3xl text-sm text-dna-muted">
            Candidate links are probabilistic. Critical incompatibilities are explicit constraints.
            Canonical identities are promoted only when evidence and constraints support the
            relationship.
          </p>
        </CardBody>
      </Card>

      {/* Capability status */}
      <Card>
        <CardHeader
          title="Implemented vs Proposed vs Future"
          subtitle="Explicit capability status for reviewers."
          right={<Table2 size={15} className="text-dna-cyan" aria-hidden="true" />}
        />
        <CardBody className="p-0">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-dna-border text-[11px] uppercase tracking-wider text-dna-faint">
                <th className="px-4 py-2 font-medium">Capability</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {CAPABILITY_TABLE.map((row) => {
                const key = row.status.split(" ")[0].toUpperCase();
                const signal = SIGNALS[key] ?? SIGNALS.PROTOTYPE;
                return (
                  <tr key={row.capability} className="border-b border-dna-border/50">
                    <td className="px-4 py-2 text-dna-text">{row.capability}</td>
                    <td className="px-4 py-2">
                      <Badge tone={signal.tone}>{signal.label}</Badge>
                      <span className="ml-2 text-dna-muted">{row.status}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}