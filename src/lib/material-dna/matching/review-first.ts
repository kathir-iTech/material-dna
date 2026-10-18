import type {
  ConstraintResult,
  MaterialRecord,
  ResolutionResult,
  ScoredCandidate,
} from "@/types/domain";
import { resolveMaterialRecord } from "../demo";
import type { EmbeddingSignal } from ".";

export const REVIEW_POLICY_VERSION = "review-first-v1";

interface Facet {
  key: string;
  label: string;
  values: string[];
}
/** Additional explicit specifications, separate from the submitted parser/benchmark. */
export function engineeringFacets(description: string): Facet[] {
  const text = description.toLowerCase();
  const capture = (
    regex: RegExp,
    map: (m: RegExpMatchArray) => string = (m) => m[1],
  ) => [...new Set([...text.matchAll(regex)].map(map))].sort();
  return [
    {
      key: "pressure",
      label: "Operating pressure",
      values: capture(
        /(\d+(?:\.\d+)?)\s*(bar|psi|mpa)\b/g,
        (m) =>
          (
            Number(m[1]) * ({ bar: 1, psi: 0.0689476, mpa: 10 }[m[2]] ?? 1)
          ).toFixed(3) + " bar",
      ),
    },
    {
      key: "angle",
      label: "Angle",
      values: capture(
        /(\d+(?:\.\d+)?)\s*(?:°|deg(?:rees?)?\b)/g,
        (m) => Number(m[1]) + " degrees",
      ),
    },
    {
      key: "mesh",
      label: "Mesh rating",
      values: capture(/(?:mesh\s*(\d+)|(\d+)\s*mesh\b)/g, (m) => m[1] || m[2]),
    },
    {
      key: "hardness",
      label: "Hardness",
      values: capture(/(?:hrc\s*(\d+)|(\d+)\s*hrc\b)/g, (m) => m[1] || m[2]),
    },
    {
      key: "actuation",
      label: "Actuation",
      values: capture(
        /\b(manual|pneumatic|hydraulic|electric(?:al)?(?:ly)?)\b/g,
        (m) => (m[1].startsWith("electric") ? "electric" : m[1]),
      ),
    },
    {
      key: "manufacture",
      label: "Manufacturing process",
      values: capture(/\b(seamless|smls|erw|welded)\b/g, (m) =>
        m[1] === "smls" ? "seamless" : m[1] === "erw" ? "welded" : m[1],
      ),
    },
    {
      key: "pressureClass",
      label: "Numeric pressure class",
      values:
        /\b(valve|pipe|flange|fitting|elbow|reducer|strainer|vessel|hose)\b/.test(
          text,
        )
          ? capture(/\bclass\s*(\d+(?:\.\d+)?)\b/g, (m) => String(Number(m[1])))
          : [],
    },
    {
      key: "connection",
      label: "End connection",
      values: capture(
        /\b(wafer|lug|flanged|threaded|socket[ -]?weld|butt[ -]?weld)\b/g,
        (m) => m[1].replace(/[ -]/g, ""),
      ),
    },
    {
      key: "bore",
      label: "Flow passage",
      values: capture(/\b(full|reduced|standard)\s+(?:bore|port)\b/g),
    },
    {
      key: "actuatorGeometry",
      label: "Actuator geometry",
      values: capture(/\b(roller\s+lever|plunger)\b/g, (m) =>
        m[1].replace(/\s+/g, " "),
      ),
    },
    {
      key: "compound",
      label: "Material condition",
      values: capture(/\b(virgin|filled)\b/g),
    },
    {
      key: "shore",
      label: "Shore hardness",
      values: capture(
        /(?:(\d+(?:\.\d+)?)\s*shore\s*([ad])|shore\s*([ad])\s*(\d+(?:\.\d+)?))\b/g,
        (m) => `${Number(m[1] || m[4])} Shore ${(m[2] || m[3]).toUpperCase()}`,
      ),
    },
    {
      key: "polymer",
      label: "Polymer composition",
      values: capture(
        /\b(ptfe|nylon|nitrile|viton|neoprene|silicone|epdm|pvc|upvc)\b/g,
      ),
    },
  ];
}

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
