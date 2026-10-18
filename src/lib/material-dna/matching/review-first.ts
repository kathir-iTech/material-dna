import type {
  ConstraintResult,
  MaterialRecord,
  ResolutionResult,
  ScoredCandidate,
} from "@/types/domain";
import { resolveMaterialRecord } from "../demo";
import type { EmbeddingSignal } from ".";

export const REVIEW_POLICY_VERSION = "review-first-v1";

import { engineeringFacets } from "../specifications";
export { engineeringFacets } from "../specifications";

export function additionalConstraints(
  a: string,
  b: string,
): ConstraintResult[] {
  const left = engineeringFacets(a),
    right = engineeringFacets(b);
  return left.flatMap((facet, i): ConstraintResult[] => {
    const other = right[i];
    if (!facet.values.length && !other.values.length) return [];
    if (facet.values.join("|") === other.values.join("|")) return [];
    const both = facet.values.length > 0 && other.values.length > 0;
    return [
      {
        attributes: [facet.key],
        attributeLabel: facet.label,
        severity: both ? "CRITICAL" : "WARNING",
        status: both ? "CONFLICT" : "UNKNOWN",
        leftValue: facet.values.join(", ") || "not stated",
        rightValue: other.values.join(", ") || "not stated",
        rule: `${both ? "critical" : "unknown"}-${facet.key}-specification`,
        explanation: both
          ? `${facet.label} differs: ${facet.values.join(", ")} vs ${other.values.join(", ")}.`
          : `${facet.label} is stated on one record only; engineering confirmation is required.`,
      },
    ];
  });
}

function screen(candidate: ScoredCandidate): ScoredCandidate {
  const extra = additionalConstraints(
    candidate.sourceRecord.rawDescription,
    candidate.targetRecord.rawDescription,
  );
  if (!extra.length) return candidate;
  const conflicts = extra.filter((c) => c.status === "CONFLICT");
  const decision = conflicts.length
    ? "DO_NOT_MERGE"
    : candidate.decision === "MATCH"
      ? "REVIEW"
      : candidate.decision;
  const reason = conflicts.length
    ? `Engineering-critical conflict: ${conflicts.map((c) => c.explanation).join("; ")}`
    : decision === "REVIEW" && candidate.decision === "MATCH"
      ? extra.map((c) => c.explanation).join(" ")
      : candidate.reason;
  return {
    ...candidate,
    decision,
    reason,
    constraints: [...candidate.constraints, ...extra],
    criticalConflicts: [...candidate.criticalConflicts, ...conflicts],
    ruleTrace: [...candidate.ruleTrace, ...extra.map((c) => c.rule)],
    explanation: {
      ...candidate.explanation,
      summary:
        decision !== candidate.decision
          ? reason
          : candidate.explanation.summary,
      conflicts: [
        ...candidate.explanation.conflicts,
        ...conflicts.map((c) => c.explanation),
      ],
      unknowns: [
        ...candidate.explanation.unknowns,
        ...extra
          .filter((c) => c.status === "UNKNOWN")
          .map((c) => c.explanation),
      ],
    },
  };
}

/** Preserve the submitted engine; apply a separately versioned, inspectable policy. */
export function resolveWithReviewPolicy(
  input: MaterialRecord,
  corpus: MaterialRecord[],
  signal?: EmbeddingSignal | null,
  conservative = true,
): ResolutionResult {
  const base = resolveMaterialRecord(input, corpus, signal);
  if (!conservative) return base;
  const candidates = base.candidates.map(screen);
  let selected = candidates[0] ?? null;
  if (base.decision === "MATCH" && selected?.decision !== "MATCH")
    selected = candidates.find((c) => c.decision === "MATCH") ?? selected;
  const changed =
    selected &&
    (selected.decision !== base.decision || selected !== candidates[0]);
  return {
    ...base,
    candidates: selected
      ? [selected, ...candidates.filter((c) => c !== selected)]
      : candidates,
    selectedCandidate: selected,
    decision: selected?.decision ?? base.decision,
    reason: selected?.reason ?? base.reason,
    risk:
      selected?.decision === "DO_NOT_MERGE"
        ? "CRITICAL"
        : selected?.decision === "REVIEW"
          ? "HIGH"
          : base.risk,
    engineVersion: `${base.engineVersion} / ${REVIEW_POLICY_VERSION}`,
    auditEvents: [
      ...base.auditEvents,
      {
        at: new Date().toISOString(),
        label: "Additional specification screening",
        detail: `${REVIEW_POLICY_VERSION}: explicit pressure, geometry, process, composition and connection checks.${changed ? " Recommendation changed; inspect constraint evidence." : " Recommendation retained."}`,
      },
    ],
  };
}
