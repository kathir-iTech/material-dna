import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import {
  BENCHMARK_HEADLINE,
  BENCHMARK_RUNS,
  FUSED_SIGNAL,
  LEXICAL_BASELINE,
} from "@/lib/material-dna/research-benchmark";

// The research page publishes these figures. Nothing stops a well-meaning edit
// from quietly changing a published number, so re-parse the recorded harness
// output and fail if the page and the golden file disagree. That is the only
// thing that makes "do not edit by hand" enforceable rather than aspirational.

interface Recorded {
  f1: number;
  precision: number;
  recall: number;
  abstainPct: number;
  abstainCount: number;
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

function readGolden(file: string): string {
  return fs.readFileSync(path.join(process.cwd(), "benchmark", file), "utf8");
}

/** Pulls the fields we publish straight out of the harness's own output format. */
function parseGolden(text: string): Recorded {
  const num = (re: RegExp, what: string): number => {
    const m = text.match(re);
    if (!m) throw new Error(`could not parse ${what} from golden file`);
    return Number(m[1]);
  };

  const dist = text.match(/decision distribution: (\{.*\})/);
  if (!dist) throw new Error("could not parse decision distribution");
  const decisions = JSON.parse(dist[1]) as Recorded["decisions"];

  const veto = text.match(
    /DO_NOT_MERGE: (\d+) total, (\d+) on true non-matches \(veto precision ([\d.]+)%\)/
  );
  if (!veto) throw new Error("could not parse veto stats");
  const falseVetoes = text.match(/false vetoes \(true matches blocked\): (\d+)/);
  if (!falseVetoes) throw new Error("could not parse false vetoes");

  return {
    f1: num(/F1=([\d.]+)/, "F1"),
    precision: num(/precision\(MATCH\)=([\d.]+)/, "precision"),
    recall: num(/recall\(MATCH\)=([\d.]+)/, "recall"),
    abstainPct: num(/abstain \(REVIEW\): \d+\/\d+ \(([\d.]+)%\)/, "abstain pct"),
    abstainCount: num(/abstain \(REVIEW\): (\d+)\//, "abstain count"),
    decided: num(/decided: (\d+)/, "decided"),
    tp: num(/decided: \d+\s+TP=(\d+)/, "TP"),
    fp: num(/TP=\d+\s+FP=(\d+)/, "FP"),
    fn: num(/FP=\d+\s+FN=(\d+)/, "FN"),
    tn: num(/FN=\d+\s+TN=(\d+)/, "TN"),
    accuracyDecided: num(/accuracy on decided pairs=([\d.]+)%/, "accuracy"),
    vetoTotal: Number(veto[1]),
    vetoCorrect: Number(veto[2]),
    vetoPrecisionPct: Number(veto[3]),
    falseVetoes: Number(falseVetoes[1]),
    decisions,
  };
}

describe("research page figures match the recorded harness output", () => {
  const cases = [
    { run: LEXICAL_BASELINE, file: "expected-baseline.txt" },
    { run: FUSED_SIGNAL, file: "expected-embed.txt" },
  ] as const;

  for (const { run, file } of cases) {
    it(`${run.label} matches benchmark/${file}`, () => {
      const recorded = parseGolden(readGolden(file));
      expect(run.f1).toBe(recorded.f1);
      expect(run.precision).toBe(recorded.precision);
      expect(run.recall).toBe(recorded.recall);
      expect(run.abstainPct).toBe(recorded.abstainPct);
      expect(run.abstainCount).toBe(recorded.abstainCount);
      expect(run.decided).toBe(recorded.decided);
      expect(run.tp).toBe(recorded.tp);
      expect(run.fp).toBe(recorded.fp);
      expect(run.fn).toBe(recorded.fn);
      expect(run.tn).toBe(recorded.tn);
      expect(run.accuracyDecided).toBe(recorded.accuracyDecided);
      expect(run.vetoTotal).toBe(recorded.vetoTotal);
      expect(run.vetoCorrect).toBe(recorded.vetoCorrect);
      expect(run.vetoPrecisionPct).toBe(recorded.vetoPrecisionPct);
      expect(run.falseVetoes).toBe(recorded.falseVetoes);
      expect(run.decisions).toEqual(recorded.decisions);
    });
  }

  it("the headline is the fused run, quoted with the baseline alongside", () => {
    expect(BENCHMARK_HEADLINE.id).toBe("fused");
    expect(BENCHMARK_RUNS.map((r) => r.id)).toEqual(["fused", "lexical"]);
    // The deck claims the fused figure, so the page must lead with it and must
    // still show the pre-fusion baseline rather than replacing it.
    expect(BENCHMARK_HEADLINE.f1).toBe(0.815);
    expect(LEXICAL_BASELINE.f1).toBe(0.813);
  });

  it("each run is internally consistent with its own confusion matrix", () => {
    for (const run of BENCHMARK_RUNS) {
      const d = run.decisions;
      // Distribution covers the whole set.
      expect(d.MATCH + d.DO_NOT_MERGE + d.NO_MATCH + d.REVIEW).toBe(run.total);
      // Abstentions are exactly the REVIEW decisions.
      expect(d.REVIEW).toBe(run.abstainCount);
      // The confusion matrix covers decided pairs only.
      expect(run.tp + run.fp + run.fn + run.tn).toBe(run.decided);
      expect(run.decided).toBe(run.total - d.REVIEW);
      // And the headline metrics are derivable, not transcribed independently.
      const precision = run.tp / (run.tp + run.fp);
      const recall = run.tp / (run.tp + run.fn);
      expect(run.precision).toBeCloseTo(precision, 3);
      expect(run.recall).toBeCloseTo(recall, 3);
      expect(run.f1).toBeCloseTo((2 * precision * recall) / (precision + recall), 3);
      expect(run.accuracyDecided).toBeCloseTo(
        ((run.tp + run.tn) / run.decided) * 100,
        1
      );
    }
  });

  it("fusing the signal moves exactly one pair from REVIEW to MATCH", () => {
    // The embedding only reorders candidates, so the vetoed set must be
    // untouched. The only permitted movement is REVIEW -> MATCH.
    expect(FUSED_SIGNAL.vetoTotal).toBe(LEXICAL_BASELINE.vetoTotal);
    expect(FUSED_SIGNAL.vetoCorrect).toBe(LEXICAL_BASELINE.vetoCorrect);
    expect(FUSED_SIGNAL.falseVetoes).toBe(LEXICAL_BASELINE.falseVetoes);
    expect(FUSED_SIGNAL.decisions.MATCH - LEXICAL_BASELINE.decisions.MATCH).toBe(1);
    expect(FUSED_SIGNAL.decisions.REVIEW).toBe(LEXICAL_BASELINE.decisions.REVIEW - 1);
  });
});