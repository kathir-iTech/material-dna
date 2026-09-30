import { canonicalMaterials, materialRecords, seededReviewCases } from "@/data/demo";
import { computeCandidateEvaluation, decide } from "@/lib/material-dna/matching";
import { criticalConflicts } from "@/lib/material-dna/constraints";
import { CONFIG } from "@/lib/material-dna/config";

// ---------------------------------------------------------------------------
// Dataset statistics — every number derived from the actual corpus below.
//
//   candidateLinks    : unordered record pairs whose composite finalScore
//                       reaches CONFIG.REVIEW_THRESHOLD (the match/review
//                       threshold). Each pair is evaluated once with the
//                       lower-index record as the source.
//   criticalConflicts : pairs that LOOK like candidates and were correctly
//                       blocked: the PRE-penalty semantic score (the value
//                       the conflict penalty never touches) reaches
//                       CONFIG.REVIEW_THRESHOLD, and the engine decides
//                       DO_NOT_MERGE on an engineering-critical conflict.
//                       Scope notes: counting over all 4,753 corpus pairs
//                       gave a meaningless 4,287 (heterogeneity — a grease
//                       tube "conflicts" with a motor starter), while gating
//                       on the POST-penalty finalScore gives 0 (the penalty
//                       structurally pushes every vetoed pair below the
//                       threshold). The pre-penalty gate keeps the intent:
//                       "similar enough to consider, then correctly blocked."
//                       Because an unordered pair's critical conflict is
//                       symmetric but decide() abstains when a single source
//                       record is too shallow, a pair counts as blocked if
//                       either record presented as source triggers the veto
//                       (one VFD 10HP-vs-15HP pair would otherwise be lost
//                       to evidence-depth abstention).
//   reviewsPending / recordCount / canonicalCount read the real seed data.
//
// This lives in its own module (not data/demo.ts) because matching/tfidf.ts
// imports materialRecords at module init — importing the matcher from
// data/demo.ts would close a require cycle.
//
// The full corpus pass is O(n²); computed once per process and memoized.
// ---------------------------------------------------------------------------

export interface DatasetStats {
  recordCount: number;
  candidateLinks: number;
  reviewsPending: number;
  criticalConflicts: number;
  canonicalCount: number;
}

let statsCache: DatasetStats | null = null;

export function datasetStats(): DatasetStats {
  if (statsCache) return statsCache;

  let candidateLinks = 0;
  let criticalConflictPairs = 0;
  const n = materialRecords.length;

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const left = materialRecords[i];
      const right = materialRecords[j];
      const evaluation = computeCandidateEvaluation(
        left.dna,
        right.dna,
        left.rawDescription,
        right.rawDescription
      );
      if (evaluation.finalScore >= CONFIG.REVIEW_THRESHOLD) candidateLinks++;

      // Candidate gate = pre-penalty semantic score (see header). Count the
      // pair when a critical conflict vetoes it under either source record.
      if (evaluation.semanticSimilarity >= CONFIG.REVIEW_THRESHOLD) {
        const crit = criticalConflicts(evaluation.constraints).length > 0;
        const dnmLeft =
          decide(evaluation, evaluation.constraints, left.dna).decision ===
          "DO_NOT_MERGE";
        const dnmRight =
          decide(evaluation, evaluation.constraints, right.dna).decision ===
          "DO_NOT_MERGE";
        if (crit && (dnmLeft || dnmRight)) criticalConflictPairs++;
      }
    }
  }

  statsCache = {
    recordCount: materialRecords.length,
    candidateLinks,
    reviewsPending: seededReviewCases.filter((r) => r.status === "PENDING").length,
    criticalConflicts: criticalConflictPairs,
    canonicalCount: canonicalMaterials.length,
  };
  return statsCache;
}
