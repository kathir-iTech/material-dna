import type {
  CandidateScore,
  DecisionStatus,
  MaterialDNA,
  MaterialRecord,
  ScoredCandidate,
} from "@/types/domain";
import { CONFIG, ATTRIBUTE_META } from "../config";
import { fuzzTokens, normalizeTerm } from "../normalization";
import {
  evaluateConstraints,
  criticalConflicts,
  conflictPenalty,
  coatingFinishEquivalent,
  vetoesMatch,
} from "../constraints";
import { dimensionMatchRatio } from "../units";
import { CORPUS_IDF, tfidfSimilarity } from "./tfidf";

// ---------------------------------------------------------------------------
// Candidate generation + weighted scoring (deterministic, inspectable).
// ---------------------------------------------------------------------------

/**
 * Dense-retrieval similarity signal (transformers.js cosine, scaled 0-100).
 * Returns null when unavailable (model absent, pair not embedded, offline).
 * PURE RANKING INPUT: it can move scores but never bypasses decide()'s
 * critical-conflict veto — that branch runs before any threshold check.
 */
export type EmbeddingSignal = (a: string, b: string) => number | null;

/** Order-independent token set similarity over normalized terms. */
function lexicalSimilarity(a: string, b: string): number {
  const ta = fuzzTokens(a);
  const tb = fuzzTokens(b);
  if (ta.length === 0 || tb.length === 0) return 0;
  const common = new Set(ta.filter((t) => tb.includes(t)));
  const union = new Set([...ta, ...tb]);
  // Weight by rarity: tokens appearing in both descriptions matter more.
  const weight = common.size * 1.5;
  const base = Math.round((common.size / Math.max(union.size, 1)) * 100);
  const bonus = Math.min(weight * 4, 20);
  // Bounded to 100: the raw score would otherwise exceed 100% for near-identical
  // text (identical descriptions hit 120), which reads as broken math in the UI.
  return Math.min(100, base + bonus);
}

/** Character-level similarity (Dice on bigrams). */
function characterSimilarity(a: string, b: string): number {
  const bigrams = (s: string): Set<string> => {
    const out = new Set<string>();
    const c = s.toLowerCase().replace(/\s+/g, "");
    for (let i = 0; i < c.length - 1; i++) out.add(c.slice(i, i + 2));
    return out;
  };
  const A = bigrams(a);
  const B = bigrams(b);
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return Math.round((2 * inter) / (A.size + B.size) * 100);
}

export interface SemanticScore {
  final: number;
  lexical: number;
  character: number;
  tfidf: number;
  /** Dense-retrieval cosine (0-100) when a signal is supplied, else null. */
  embedding: number | null;
}

export function semanticSimilarity(
  a: string,
  b: string,
  signal?: EmbeddingSignal | null
): SemanticScore {
  const lexical = Math.round(lexicalSimilarity(a, b));
  const char = characterSimilarity(a, b);
  const tfidf = tfidfSimilarity(CORPUS_IDF, a, b);
  const embedding = signal ? signal(a, b) : null;

  const final =
    embedding === null
      ? Math.round(
          lexical * CONFIG.SIMILARITY.TOKEN_WEIGHT +
            char * CONFIG.SIMILARITY.CHARACTER_WEIGHT +
            tfidf * CONFIG.SIMILARITY.TFIDF_WEIGHT
        )
      : // Fused blend: existing weights scaled down so the blend sums to 1.0.
        (() => {
          const w = CONFIG.SIMILARITY.EMBEDDING_WEIGHT;
          const k = 1 - w;
          return Math.round(
            lexical * CONFIG.SIMILARITY.TOKEN_WEIGHT * k +
              char * CONFIG.SIMILARITY.CHARACTER_WEIGHT * k +
              tfidf * CONFIG.SIMILARITY.TFIDF_WEIGHT * k +
              embedding * w
          );
        })();

  return { final, lexical, character: char, tfidf, embedding };
}

function attrAgreement(left: MaterialDNA, right: MaterialDNA): { score: number; details: Record<string, boolean | "unknown"> } {
  let weighted = 0;
  let totalWeight = 0;
  const details: Record<string, boolean | "unknown"> = {};

  for (const [key, meta] of Object.entries(ATTRIBUTE_META)) {
    if (meta.weight === 0) continue;
    const la = (left as unknown as Record<string, { value?: unknown }>)[key];
    const ra = (right as unknown as Record<string, { value?: unknown }>)[key];
    const lv = la?.value;
    const rv = ra?.value;
    const lEmpty = lv === null || lv === undefined || (Array.isArray(lv) && lv.length === 0);
    const rEmpty = rv === null || rv === undefined || (Array.isArray(rv) && rv.length === 0);

    if (lEmpty && rEmpty) {
      details[key] = "unknown";
      continue;
    }
    if (lEmpty !== rEmpty) {
      details[key] = "unknown";
      continue;
    }
    const match = valuesEqual(lv, rv, key);
    details[key] = match;
    weighted += match ? meta.weight : 0;
    totalWeight += meta.weight;
  }

  const score = totalWeight === 0 ? 0 : Math.round((weighted / totalWeight) * 100);
  return { score, details };
}

function valuesEqual(a: unknown, b: unknown, key: string): boolean {
  const arr = (x: unknown): string[] =>
    Array.isArray(x) ? x.map((v) => normalizeTerm(String(v)).toLowerCase()) : [];
  const scalar = (x: unknown): string => normalizeTerm(String(x ?? "")).toLowerCase();

  if (key === "dimensions") {
    const la = arr(a);
    const ra = arr(b);
    if (la.length === 0 || ra.length === 0) return false;
    // Unit-aware (inch/mm/m, NPS/DN) equivalence, not string equality.
    return dimensionMatchRatio(la, ra) >= 0.5;
  }
  if (key === "standard" || key === "electrical") {
    const la = arr(a);
    const ra = arr(b);
    const inter = la.filter((x) => ra.includes(x)).length;
    if (la.length === 0 || ra.length === 0) return false;
    return inter / Math.max(la.length, ra.length) >= 0.5;
  }
  // Coating/finish synonyms agree for scoring as well as for the veto.
  if (key === "material" || key === "coating") {
    if (coatingFinishEquivalent(scalar(a), scalar(b))) return true;
  }
  return scalar(a) === scalar(b);
}

/**
 * Full evaluation for one candidate pair: the score PLUS the constraints it
 * was scored against. Callers that also need the constraint list (e.g. corpus
 * statistics) use this to avoid evaluating constraints twice.
 */
export interface CandidateEvaluation extends CandidateScore {
  constraints: ReturnType<typeof evaluateConstraints>;
}

export function computeCandidateEvaluation(
  left: MaterialDNA,
  right: MaterialDNA,
  leftDesc: string,
  rightDesc: string,
  signal?: EmbeddingSignal | null
): CandidateEvaluation {
  const sem = semanticSimilarity(leftDesc, rightDesc, signal);
  const attr = attrAgreement(left, right).score;
  const constraints = evaluateConstraints(left, right);
  const penalty = conflictPenalty(constraints);
  const ev = right.evidenceCoverage;

  const final = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        sem.final * CONFIG.WEIGHTS.SEMANTIC +
          attr * CONFIG.WEIGHTS.ATTRIBUTE +
          ev * CONFIG.WEIGHTS.EVIDENCE -
          penalty
      )
    )
  );

  return {
    semanticSimilarity: sem.final,
    tokenOverlap: sem.lexical,
    diceSimilarity: sem.character,
    tfidfSimilarity: sem.tfidf,
    embeddingSimilarity: sem.embedding,
    attributeAgreement: attr,
    conflictPenalty: penalty,
    evidenceCoverage: ev,
    finalScore: Math.round(final),
    constraints,
  };
}

export function computeCandidateScore(
  left: MaterialDNA,
  right: MaterialDNA,
  leftDesc: string,
  rightDesc: string,
  signal?: EmbeddingSignal | null
): CandidateScore {
  const e = computeCandidateEvaluation(left, right, leftDesc, rightDesc, signal);
  return {
    semanticSimilarity: e.semanticSimilarity,
    tokenOverlap: e.tokenOverlap,
    diceSimilarity: e.diceSimilarity,
    tfidfSimilarity: e.tfidfSimilarity,
    embeddingSimilarity: e.embeddingSimilarity,
    attributeAgreement: e.attributeAgreement,
    conflictPenalty: e.conflictPenalty,
    evidenceCoverage: e.evidenceCoverage,
    finalScore: e.finalScore,
  };
}

export interface DecisionReason {
  decision: DecisionStatus;
  reason: string;
  ruleTrace: string[];
}

export function decide(
  score: CandidateScore,
  constraints: ReturnType<typeof evaluateConstraints>,
  leftDNA: MaterialDNA
): DecisionReason {
  const criticals = criticalConflicts(constraints);
  const hasCritical = criticals.length > 0;
  const trace: string[] = [];

  // 0) Insufficient identity evidence -> abstain before comparing candidates.
  // A single token like "BOLT" cannot support a match OR a conflict.
  const definedAttrs = countDefinedAttributes(leftDNA);
  if (definedAttrs < 3) {
    return {
      decision: "REVIEW",
      reason: "Insufficient engineering evidence to establish identity.",
      ruleTrace: ["insufficient-evidence-depth"],
    };
  }

  // 1) Critical conflict vetoes any match.
  if (hasCritical) {
    for (const c of criticals) trace.push(c.rule);
    return {
      decision: "DO_NOT_MERGE",
      reason: `Engineering-critical conflict: ${criticals.map((c) => c.explanation).join("; ")}`,
      ruleTrace: trace,
    };
  }

  // 2) Insufficient evidence -> abstain.
  if (leftDNA.evidenceCoverage < CONFIG.MIN_EVIDENCE_COVERAGE) {
    return {
      decision: "REVIEW",
      reason: "Insufficient engineering evidence to establish identity.",
      ruleTrace: ["insufficient-evidence"],
    };
  }

  // 3) High score + no critical conflict + adequate evidence -> match.
  if (
    score.finalScore >= CONFIG.MATCH_THRESHOLD &&
    score.attributeAgreement >= 80 &&
    score.evidenceCoverage >= CONFIG.MIN_EVIDENCE_COVERAGE
  ) {
    return {
      decision: "MATCH",
      reason: "Textual and structured attributes agree; no engineering-critical conflict.",
      ruleTrace: ["positive-match"],
    };
  }

  // 4) Moderate but uncertain -> review.
  if (score.finalScore >= CONFIG.REVIEW_THRESHOLD) {
    return {
      decision: "REVIEW",
      reason: "Moderate agreement but unresolved engineering attributes require review.",
      ruleTrace: ["uncertain-review"],
    };
  }

  // 5) Low -> no match.
  return {
    decision: "NO_MATCH",
    reason: "Candidate does not resemble the source record closely enough.",
    ruleTrace: ["below-threshold"],
  };
}

function countDefinedAttributes(dna: MaterialDNA): number {
  let count = 0;
  for (const [key, value] of Object.entries(dna)) {
    if (key === "confidence" || key === "evidenceCoverage") continue;
    const attr = value as { value?: unknown };
    const v = attr?.value;
    const defined =
      v !== undefined &&
      v !== null &&
      (Array.isArray(v) ? v.length > 0 : String(v).trim().length > 0);
    if (defined) count++;
  }
  return count;
}

// ---------------------------------------------------------------------------
// Candidate generator
// ---------------------------------------------------------------------------

export type { ScoredCandidate } from "@/types/domain";

export function generateCandidates(
  input: MaterialRecord,
  corpus: MaterialRecord[],
  signal?: EmbeddingSignal | null
): ScoredCandidate[] {
  const explosion = (r: MaterialRecord): string[] => [
    r.rawDescription,
    r.normalizedDescription,
  ];
  const inputExploded = explosion(input);

  const results: ScoredCandidate[] = corpus
    .filter((rec) => rec.id !== input.id)
    .map((rec) => {
      const candExploded = explosion(rec);
      // Best-of-both similarity for raw/normalized variants.
      let best = 0;
      for (const a of inputExploded) {
        for (const b of candExploded) {
          const s = semanticSimilarity(a, b, signal).final;
          if (s > best) best = s;
        }
      }

      const constraints = evaluateConstraints(input.dna, rec.dna);
      const score = computeCandidateScore(
        input.dna,
        rec.dna,
        input.rawDescription,
        rec.rawDescription,
        signal
      );
      const decisionInfo = decide(score, constraints, input.dna);

      const criticals = criticalConflicts(constraints);
      const explanation = buildExplanation(input.dna, rec.dna, constraints, decisionInfo.decision);

      return {
        sourceRecord: input,
        targetRecord: rec,
        similarityScore: best,
        attributeScore: score.attributeAgreement,
        constraints,
        criticalConflicts: criticals,
        evidenceCoverage: rec.dna.evidenceCoverage,
        decision: decisionInfo.decision,
        reason: decisionInfo.reason,
        ruleTrace: decisionInfo.ruleTrace,
        scoreDetails: score,
        explanation,
      };
    });

  return results.sort(
    (a, b) =>
      b.attributeScore - a.attributeScore ||
      b.scoreDetails.evidenceCoverage - a.scoreDetails.evidenceCoverage ||
      b.similarityScore - a.similarityScore
  );
}

function buildExplanation(
  a: MaterialDNA,
  b: MaterialDNA,
  constraints: ReturnType<typeof evaluateConstraints>,
  decision: DecisionStatus
): ScoredCandidate["explanation"] {
  const evidence: string[] = [];
  const conflicts: string[] = [];
  const unknowns: string[] = [];

  const check = (label: string, av: unknown, bv: unknown) => {
    const empty = (v: unknown) =>
      v === null || v === undefined || (Array.isArray(v) && v.length === 0);
    if (empty(av) && empty(bv)) {
      unknowns.push(`${label} not stated on either record`);
    } else if (empty(av) || empty(bv)) {
      unknowns.push(`${label} stated on one record only`);
    } else if (valuesEqual(av, bv, label.toLowerCase())) {
      evidence.push(`${label} matches`);
    } else {
      conflicts.push(`${label} differs`);
    }
  };

  check("Material type", a.materialType.value, b.materialType.value);
  check("Material", a.material.value, b.material.value);
  check("Grade", a.grade.value, b.grade.value);
  check("Dimensions", a.dimensions.value, b.dimensions.value);
  check("Standard", a.standard.value, b.standard.value);
  check("Coating", a.coating.value, b.coating.value);
  check("Pressure class", a.classPressure.value, b.classPressure.value);
  check("Schedule", a.schedule.value, b.schedule.value);
  check("Electrical", a.electrical.value, b.electrical.value);

  for (const c of constraints) {
    if (c.status === "CONFLICT") {
      conflicts.push(`${c.attributeLabel}: ${c.explanation}`);
    }
  }

  let summary: string;
  if (decision === "MATCH") {
    summary = "Textual and structured attributes agree with no engineering-critical conflict.";
  } else if (decision === "DO_NOT_MERGE") {
    summary = `High textual similarity was detected, but the candidate was rejected because ${conflicts[0] ?? "an engineering-critical attribute differs"}.`;
  } else if (decision === "REVIEW") {
    summary = "Agreement is partial or evidence is insufficient; human engineering review is required.";
  } else {
    summary = "Candidate does not match the source record.";
  }

  return { evidence, conflicts, unknowns, summary };
}

// Future ML interface (isolated behind an interface, not faked at runtime).
export interface CandidateScorer {
  score(a: MaterialRecord, b: MaterialRecord): CandidateScore;
}

export const PrototypeCandidateScorer: CandidateScorer = {
  score(a, b) {
    return computeCandidateScore(a.dna, b.dna, a.rawDescription, b.rawDescription);
  },
};

// TF-IDF is a separate, named scoring signal; re-exported here so the UI and
// tests can reach it through the matching entry point.
export { buildIdf, documentFrequency, tfidfSimilarity, CORPUS_IDF } from "./tfidf";
export type { IdfIndex } from "./tfidf";

// Prevent unused import lint for vetoesMatch export contract.
void vetoesMatch;