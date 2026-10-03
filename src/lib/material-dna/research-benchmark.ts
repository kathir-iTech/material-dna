// ---------------------------------------------------------------------------
// Measured 200-pair benchmark results, for both engine configurations.
//
// Source of truth is the recorded harness output, not this file:
//   LEXICAL_BASELINE  <- benchmark/expected-baseline.txt  (npm run bench)
//   FUSED_SIGNAL      <- benchmark/expected-embed.txt     (npm run bench:embed)
// methodology in benchmark/baseline-2026-09-29.md
//
// Every number below is transcribed verbatim from those runs. A unit test
// (tests/research-benchmark.test.ts) re-parses both golden files and fails if
// anything here drifts, so these cannot be edited by hand without re-running
// the harness.
//
// The two runs are reported separately because they are different
// configurations, not alternative measurements of the same thing: fusing the
// dense-retrieval signal reorders candidates, which moves one pair out of
// REVIEW and into MATCH. Quoting a headline figure without its matching
// distribution and confusion matrix would be internally inconsistent.
// ---------------------------------------------------------------------------

export const BENCHMARK_RUN_DATE = "30 Sep 2026";

export interface BenchmarkRun {
  /** Stable id used in tests and as a React key. */
  id: "lexical" | "fused";
  /** Human label shown next to the figures. */
  label: string;
  /** Golden file these figures were transcribed from. */
  source: string;
  /** What the configuration is, in one line. */
  note: string;
  f1: number;
  precision: number;
  recall: number;
  abstainPct: number;
  abstainCount: number;
  total: number;
  decided: number;
  tp: number;
  fp: number;
  fn: number;
  tn: number;
  accuracyDecided: number;
  vetoPrecisionPct: number;
  vetoCorrect: number;
  vetoTotal: number;
  falseVetoes: number;
  decisions: { MATCH: number; DO_NOT_MERGE: number; NO_MATCH: number; REVIEW: number };
}

/** Pre-fusion baseline: lexical similarity only, no dense retrieval. */
export const LEXICAL_BASELINE: BenchmarkRun = {
  id: "lexical",
  label: "Lexical-only baseline",
  source: "benchmark/expected-baseline.txt",
  note: "pre-fusion baseline, no dense retrieval",
  f1: 0.813,
  precision: 0.8,
  recall: 0.825,
  abstainPct: 35.0,
  abstainCount: 70,
  total: 200,
  decided: 130,
  tp: 52,
  fp: 13,
  fn: 11,
  tn: 54,
  accuracyDecided: 81.5,
  vetoPrecisionPct: 84.4,
  vetoCorrect: 54,
  vetoTotal: 64,
  falseVetoes: 10,
  decisions: { MATCH: 65, DO_NOT_MERGE: 64, NO_MATCH: 1, REVIEW: 70 },
};

/**
 * The shipped configuration: lexical scoring fused with the dense-retrieval
 * signal. This is the headline figure, matching the submitted deck.
 */
export const FUSED_SIGNAL: BenchmarkRun = {
  id: "fused",
  label: "Fused dense-retrieval signal",
  source: "benchmark/expected-embed.txt",
  note: "shipped configuration",
  f1: 0.815,
  precision: 0.803,
  recall: 0.828,
  abstainPct: 34.5,
  abstainCount: 69,
  total: 200,
  decided: 131,
  tp: 53,
  fp: 13,
  fn: 11,
  tn: 54,
  accuracyDecided: 81.7,
  vetoPrecisionPct: 84.4,
  vetoCorrect: 54,
  vetoTotal: 64,
  falseVetoes: 10,
  decisions: { MATCH: 66, DO_NOT_MERGE: 64, NO_MATCH: 1, REVIEW: 69 },
};

/** The configuration the headline metrics describe. */
export const BENCHMARK_HEADLINE = FUSED_SIGNAL;

/** Ordered so the headline reads first, the baseline alongside. */
export const BENCHMARK_RUNS: BenchmarkRun[] = [FUSED_SIGNAL, LEXICAL_BASELINE];