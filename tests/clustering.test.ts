import { describe, expect, it } from "vitest";
import { materialRecords } from "@/data/demo";
import {
  buildComponents,
  clusterRecords,
  evaluatePair,
  type ClusteringResult,
  type PairEvaluation,
} from "@/lib/material-dna/matching/clustering";
import { corpusClusters } from "@/lib/material-dna/clusters";
import type { MaterialRecord } from "@/types/domain";

// ---------------------------------------------------------------------------
// N-source clustering — constraint-aware MVP tests.
//
// The six named fixtures below are the real transitivity-breaker triples in
// the shipped corpus: all three pairwise similarities sit in the MATCH band
// (>= 85) so similarity-only closure chains all three records together, while
// an engineering-critical conflict on the A-C and B-C legs must keep C out of
// A/B's cluster. Fixture 1 is the triple documented in final_audit.md
// ("TRIPLE 2": A~B=97, B~C=93, A~C=95, critical-grade-mismatch). The other
// five were re-discovered by the same probe on the current engine and pin the
// other veto rules (grade, dimension, electrical rating).
//
// Every number is transcribed from the measured run — do not edit by hand
// without re-running the probe.
// ---------------------------------------------------------------------------

const byCode = new Map(materialRecords.map((r) => [r.sourceCode, r]));
const byId = new Map(materialRecords.map((r) => [r.id, r]));

function rec(code: string): MaterialRecord {
  const r = byCode.get(code);
  if (!r) throw new Error(`no record with sourceCode ${code}`);
  return r;
}

const result: ClusteringResult = clusterRecords(materialRecords);

function clusterOf(id: string): string | null {
  const c = result.clusters.find((cl) => cl.members.includes(id));
  return c ? c.id : null;
}

function pair(aCode: string, bCode: string): PairEvaluation {
  return evaluatePair(rec(aCode), rec(bCode));
}

function key(aCode: string, bCode: string): string {
  const a = rec(aCode).id;
  const b = rec(bCode).id;
  return a <= b ? `${a}|${b}` : `${b}|${a}`;
}

// Naive similarity-only closure (>= 85, decisions ignored) for the contrast
// assertions. Pair evaluations are cached — the corpus pass above already
// proves the engine values; this only recomputes what it needs.
const pairCache = new Map<string, PairEvaluation>();
function cachedPair(a: MaterialRecord, b: MaterialRecord): PairEvaluation {
  const k = a.id <= b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`;
  let p = pairCache.get(k);
  if (!p) {
    p = evaluatePair(a, b);
    pairCache.set(k, p);
  }
  return p;
}

const naiveOwner = (() => {
  const parent = materialRecords.map((_, i) => i);
  const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x] as number)));
  for (let i = 0; i < materialRecords.length; i++) {
    for (let j = i + 1; j < materialRecords.length; j++) {
      if (cachedPair(materialRecords[i] as MaterialRecord, materialRecords[j] as MaterialRecord).similarity >= 85) {
        const a = find(i);
        const b = find(j);
        if (a !== b) parent[a] = b;
      }
    }
  }
  const owner = new Map<string, string>();
  for (let i = 0; i < materialRecords.length; i++) {
    owner.set((materialRecords[i] as MaterialRecord).id, (materialRecords[find(i)] as MaterialRecord).id);
  }
  return owner;
})();

interface FixtureLeg {
  a: string;
  b: string;
  similarity: number;
  finalScore: number;
  decision: PairEvaluation["decision"];
  rules: string[];
}

interface Fixture {
  name: string;
  ab: FixtureLeg;
  bc: FixtureLeg;
  ac: FixtureLeg;
  cluster: string;
}

const FIXTURES: Fixture[] = [
  {
    name: "F1 audit TRIPLE 2 — grade 8.8 vs 9.8 hex bolt (A~B=97, B~C=93, A~C=95)",
    ab: { a: "MAT-18273", b: "HX-M12-60-8.8", similarity: 97, finalScore: 99, decision: "MATCH", rules: [] },
    bc: { a: "HX-M12-60-8.8", b: "BOLT-88990", similarity: 93, finalScore: 36, decision: "DO_NOT_MERGE", rules: ["critical-grade-mismatch"] },
    ac: { a: "MAT-18273", b: "BOLT-88990", similarity: 95, finalScore: 37, decision: "DO_NOT_MERGE", rules: ["critical-grade-mismatch"] },
    cluster: "CL-01",
  },
  {
    name: "F2 grade 12.9 vs 10.9 socket head cap screws",
    ab: { a: "039410", b: "MAT-29100", similarity: 99, finalScore: 100, decision: "MATCH", rules: [] },
    bc: { a: "MAT-29100", b: "MAT-080101", similarity: 96, finalScore: 33, decision: "DO_NOT_MERGE", rules: ["critical-grade-mismatch"] },
    ac: { a: "039410", b: "MAT-080101", similarity: 95, finalScore: 33, decision: "DO_NOT_MERGE", rules: ["critical-grade-mismatch"] },
    cluster: "CL-14",
  },
  {
    name: "F3 dimension — cable gland 20 vs 25 mm",
    ab: { a: "CG-20-B", b: "MAT-33100", similarity: 97, finalScore: 99, decision: "MATCH", rules: [] },
    bc: { a: "MAT-33100", b: "MAT-100010", similarity: 88, finalScore: 27, decision: "DO_NOT_MERGE", rules: ["critical-dimension-mismatch"] },
    ac: { a: "CG-20-B", b: "MAT-100010", similarity: 85, finalScore: 26, decision: "DO_NOT_MERGE", rules: ["critical-dimension-mismatch"] },
    cluster: "CL-17",
  },
  {
    name: "F4 electrical — 3-core cable rating mismatch",
    ab: { a: "024120", b: "MAT-23110", similarity: 93, finalScore: 97, decision: "MATCH", rules: [] },
    bc: { a: "MAT-23110", b: "CAB-2.5-3C", similarity: 89, finalScore: 40, decision: "DO_NOT_MERGE", rules: ["critical-electrical-rating-mismatch"] },
    ac: { a: "024120", b: "CAB-2.5-3C", similarity: 94, finalScore: 42, decision: "DO_NOT_MERGE", rules: ["critical-electrical-rating-mismatch"] },
    cluster: "CL-08",
  },
  {
    name: "F5 grade — 8.8 zinc vs 8.8 blue-zinc vs 9.8",
    ab: { a: "MAT-18273", b: "012044", similarity: 91, finalScore: 96, decision: "MATCH", rules: [] },
    bc: { a: "012044", b: "BOLT-88990", similarity: 87, finalScore: 33, decision: "DO_NOT_MERGE", rules: ["critical-grade-mismatch"] },
    ac: { a: "MAT-18273", b: "BOLT-88990", similarity: 95, finalScore: 37, decision: "DO_NOT_MERGE", rules: ["critical-grade-mismatch"] },
    cluster: "CL-01",
  },
  {
    name: "F6 grade — HX 8.8 vs 012044 8.8 blue-zinc vs BOLT 9.8",
    ab: { a: "HX-M12-60-8.8", b: "012044", similarity: 91, finalScore: 96, decision: "MATCH", rules: [] },
    bc: { a: "012044", b: "BOLT-88990", similarity: 87, finalScore: 33, decision: "DO_NOT_MERGE", rules: ["critical-grade-mismatch"] },
    ac: { a: "HX-M12-60-8.8", b: "BOLT-88990", similarity: 93, finalScore: 36, decision: "DO_NOT_MERGE", rules: ["critical-grade-mismatch"] },
    cluster: "CL-01",
  },
];

describe("Transitivity-breaker fixtures — real corpus triples", () => {
  for (const f of FIXTURES) {
    describe(f.name, () => {
      const legs: Array<[string, FixtureLeg]> = [
        ["A~B", f.ab],
        ["B~C", f.bc],
        ["A~C", f.ac],
      ];

      it("all three legs sit in the similarity MATCH band (>= 85)", () => {
        for (const [, leg] of legs) {
          const p = pair(leg.a, leg.b);
          expect(p.similarity, `${leg.a}~${leg.b}`).toBeGreaterThanOrEqual(85);
        }
      });

      it("pairwise scores and decisions are as measured", () => {
        for (const [label, leg] of legs) {
          const p = pair(leg.a, leg.b);
          expect(p.similarity, `${label} similarity`).toBe(leg.similarity);
          expect(p.finalScore, `${label} finalScore`).toBe(leg.finalScore);
          expect(p.decision, `${label} decision`).toBe(leg.decision);
          expect(p.criticalRules, `${label} rules`).toEqual(leg.rules);
        }
      });

      it("A and B land in the same cluster; the vetoed record C stays out", () => {
        const aId = rec(f.ab.a).id;
        const bId = rec(f.ab.b).id;
        const cId = rec(f.ac.b).id;
        expect(clusterOf(aId)).toBe(f.cluster);
        expect(clusterOf(bId)).toBe(f.cluster);
        expect(clusterOf(cId)).toBeNull();
      });

      it("similarity-only closure would have chained all three together", () => {
        const aId = rec(f.ab.a).id;
        const bId = rec(f.ab.b).id;
        const cId = rec(f.ac.b).id;
        expect(naiveOwner.get(aId)).toBe(naiveOwner.get(cId));
        expect(naiveOwner.get(bId)).toBe(naiveOwner.get(cId));
      });

      it("both vetoed legs are surfaced as held-out proposals", () => {
        const keys = new Set(result.vetoedProposals.map((v) => `${v.left}|${v.right}`));
        expect(keys.has(key(f.bc.a, f.bc.b))).toBe(true);
        expect(keys.has(key(f.ac.a, f.ac.b))).toBe(true);
      });
    });
  }
});

describe("Corpus regression — 98-record demo corpus", () => {
  it("measured counts are stable", () => {
    expect(materialRecords.length).toBe(98);
    expect(result.matchEdges.length).toBe(26);
    expect(result.clusters.length).toBe(18);
    expect(result.singletons.length).toBe(58);
    expect(result.vetoedProposals.length).toBe(24);
    expect(result.mergeRefusals.length).toBe(0);
    expect(result.naiveClosure).toEqual({ edges: 43, multiClusters: 25, poisoned: 17 });
  });

  it("cluster sizes and ids are deterministic (size desc, then first member)", () => {
    expect(result.clusters.map((c) => c.members.length)).toEqual([4, 3, 3, ...Array(15).fill(2)]);
    expect(result.clusters.map((c) => c.id)).toEqual(
      Array.from({ length: 18 }, (_, i) => `CL-${String(i + 1).padStart(2, "0")}`)
    );
    expect(result.clusters[0]?.members).toEqual(["REC-001", "REC-002", "REC-005", "REC-012"]);
    for (const c of result.clusters) {
      expect(c.members.length).toBeGreaterThanOrEqual(2);
      for (let i = 1; i < c.members.length; i++) {
        expect((c.members[i - 1] as string) < (c.members[i] as string)).toBe(true);
      }
    }
  });

  it("every MATCH edge is a real decide()=MATCH pair with no critical conflict", () => {
    for (const e of result.matchEdges) {
      const p = evaluatePair(byId.get(e.left) as MaterialRecord, byId.get(e.right) as MaterialRecord);
      expect(p.decision).toBe("MATCH");
      expect(p.criticalRules).toEqual([]);
      expect(p.finalScore).toBe(e.finalScore);
    }
  });

  it("constraint-aware result never contains an internal critical conflict (naive closure: 17 poisoned)", () => {
    for (const c of result.clusters) {
      for (let i = 0; i < c.members.length; i++) {
        for (let j = i + 1; j < c.members.length; j++) {
          const p = cachedPair(byId.get(c.members[i] as string) as MaterialRecord, byId.get(c.members[j] as string) as MaterialRecord);
          expect(p.criticalRules, `${c.members[i]}~${c.members[j]}`).toEqual([]);
        }
      }
    }
    expect(result.naiveClosure.poisoned).toBe(17);
  });

  it("held-out proposals are high-similarity veto pairs whose endpoints never share a cluster", () => {
    for (const v of result.vetoedProposals) {
      expect(v.similarity).toBeGreaterThanOrEqual(85);
      expect(v.rules.length).toBeGreaterThan(0);
      const ca = clusterOf(v.left);
      const cb = clusterOf(v.right);
      // Singletons share nothing; two records in the same cluster would.
      expect(ca !== null && ca === cb).toBe(false);
    }
  });

  it("memoized corpusClusters() returns the same result the direct pass produces", () => {
    expect(corpusClusters()).toEqual(result);
  });
});

describe("evaluatePair — canonical, order-independent evaluation", () => {
  it("is symmetric in both argument orders", () => {
    const sample: Array<[string, string]> = [
      ["MAT-18273", "BOLT-88990"],
      ["039410", "MAT-080101"],
      ["CG-20-B", "MAT-100010"],
      ["024120", "CAB-2.5-3C"],
    ];
    for (const [a, b] of sample) {
      expect(evaluatePair(rec(a), rec(b))).toEqual(evaluatePair(rec(b), rec(a)));
    }
  });

  it("a full re-run over reversed input produces identical clusters", () => {
    const reversed = clusterRecords([...materialRecords].reverse());
    expect(reversed.clusters).toEqual(result.clusters);
    expect(reversed.singletons).toEqual(result.singletons);
    expect(reversed.mergeRefusals).toEqual(result.mergeRefusals);
  });
});

describe("buildComponents — veto refuses the merge instead of merging through it", () => {
  const nodes = ["X1", "X2", "X3"];
  const edges = [
    { left: "X1", right: "X2", finalScore: 99 },
    { left: "X2", right: "X3", finalScore: 96 },
  ];

  it("control: without a veto the MATCH chain merges transitively", () => {
    const out = buildComponents(nodes, edges, new Map());
    expect(out.clusters).toEqual([{ id: "CL-01", members: ["X1", "X2", "X3"] }]);
    expect(out.refusals).toEqual([]);
    expect(out.singletons).toEqual([]);
  });

  it("an A-C critical conflict refuses the B-C merge (the breaker shape)", () => {
    const vetoes = new Map([["X1|X3", ["critical-grade-mismatch"]]]);
    const out = buildComponents(nodes, edges, vetoes);
    expect(out.clusters).toEqual([{ id: "CL-01", members: ["X1", "X2"] }]);
    expect(out.singletons).toEqual(["X3"]);
    expect(out.refusals).toEqual([
      {
        edge: { left: "X2", right: "X3", finalScore: 96 },
        blockedBy: { left: "X1", right: "X3", rules: ["critical-grade-mismatch"] },
      },
    ]);
  });

  it("edge input order does not change the outcome", () => {
    const vetoes = new Map([["X1|X3", ["critical-grade-mismatch"]]]);
    const out = buildComponents(nodes, [...edges].reverse(), vetoes);
    expect(out.clusters).toEqual([{ id: "CL-01", members: ["X1", "X2"] }]);
    expect(out.refusals.length).toBe(1);
  });
});
