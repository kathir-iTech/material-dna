import type {
  AuditEvent,
  CounterfactualChange,
  CounterfactualResult,
  DecisionStatus,
  MaterialDNA,
  MaterialRecord,
  ResolutionResult,
  ReviewCase,
} from "@/types/domain";
import {
  CONSTRAINTS_VERSION,
  ENGINE_VERSION,
  ENGINE_VERSION_NUMBER,
  PARSER_VERSION,
} from "../config";
import { extractMaterialDNA, listUnknownAttributes } from "../extraction";
import { normalizeDescription } from "../normalization";
import {
  generateCandidates,
  type ScoredCandidate,
  type EmbeddingSignal,
} from "../matching";
import { evaluateConstraints, criticalConflicts } from "../constraints";

function nowStamp(): string {
  return new Date().toISOString();
}

function makeAudit(label: string, detail?: string): AuditEvent {
  return { at: nowStamp(), label, detail };
}

export function buildInputRecord(description: string): MaterialRecord {
  const trimmed = description.trim();
  const dna = extractMaterialDNA(trimmed);
  return {
    id: `INPUT-${snapshotId(trimmed)}`,
    source: "User Input",
    sourceCode: "INPUT-001",
    rawDescription: trimmed,
    normalizedDescription: normalizeDescription(trimmed),
    dna,
  };
}

function snapshotId(desc: string): string {
  let h = 0;
  for (let i = 0; i < desc.length; i++) {
    h = (h << 5) - h + desc.charCodeAt(i);
    h |= 0;
  }
  // Trailing digits, not leading: leading digits of |h| collide far more
  // often (small hashes pad with zeros up front, so 122/400 benchmark
  // descriptions shared an id and 2/200 pairs lost their candidate because
  // both sides hashed to the same snapshot).
  return String(Math.abs(h)).padStart(12, "0").slice(-6);
}

export function resolveMaterialRecord(
  input: MaterialRecord,
  corpus: MaterialRecord[],
  signal?: EmbeddingSignal | null,
): ResolutionResult {
  const audit: AuditEvent[] = [];
  audit.push(makeAudit("Resolution started", input.sourceCode));

  const dna = input.dna;
  const definedFields = Object.keys(dna).filter((k) => {
    const attr = dna[k as keyof MaterialDNA];
    return (
      typeof attr === "object" &&
      attr !== null &&
      "value" in attr &&
      attr.value !== undefined &&
      attr.value !== null &&
      (Array.isArray(attr.value)
        ? attr.value.length > 0
        : String(attr.value).trim().length > 0)
    );
  }).length;
  audit.push(
    makeAudit("Attributes extracted", `${definedFields} fields scored`),
  );

  const activeSignal = signal ?? undefined;
  const scored = generateCandidates(input, corpus, activeSignal);
  audit.push(
    makeAudit("Candidates generated", `${scored.length} candidates scored`),
  );
  if (activeSignal) {
    audit.push(
      makeAudit(
        "Dense retrieval signal fused",
        "transformers.js cosine - ranking only; critical-conflict veto unaffected",
      ),
    );
  }

  const selected = scored[0] ?? null;

  // Candidate chosen as the recommended relationship for display.
  const decision: DecisionStatus = selected?.decision ?? "REVIEW";
  const reason = selected?.reason ?? "No candidate record available.";
  const risk = riskFrom(input.dna, selected, decision);

  const criticals = criticalConflicts(selected?.constraints ?? []);
  if (criticals.length > 0) {
    audit.push(makeAudit("Critical constraint triggered", criticals[0].rule));
  }
  if (decision === "DO_NOT_MERGE") {
    audit.push(makeAudit("Candidate rejected", reason));
  } else if (decision === "REVIEW") {
    audit.push(
      makeAudit(
        "Case sent to human review",
        "Abstained on insufficient evidence",
      ),
    );
  } else if (decision === "MATCH") {
    audit.push(
      makeAudit("Match recommended", selected?.targetRecord.sourceCode),
    );
  }

  audit.push(makeAudit("Evidence trail built", `${input.id}`));

  return {
    caseId: `RES-${stamp()}`,
    input: input,
    dna,
    candidates: scored,
    selectedCandidate: selected ?? null,
    decision,
    reason,
    evidenceCoverage: dna.evidenceCoverage,
    risk,
    auditEvents: audit,
    engineVersion: `${ENGINE_VERSION} ${ENGINE_VERSION_NUMBER}`,
    parserVersion: PARSER_VERSION,
    constraintVersion: CONSTRAINTS_VERSION,
    unknownAttributes: listUnknownAttributes(dna),
    createdAt: new Date().toISOString(),
  };
}

function stamp(): string {
  return (
    globalThis.crypto?.randomUUID?.().slice(0, 12).toUpperCase() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase()
  );
}

function riskFrom(
  dna: MaterialDNA,
  candidate: ScoredCandidate | null,
  decision: DecisionStatus,
): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
  if (
    decision === "DO_NOT_MERGE" ||
    (candidate && candidate.criticalConflicts.length > 0)
  ) {
    return "CRITICAL";
  }
  if (decision === "REVIEW") {
    if (dna.evidenceCoverage < 35) return "HIGH";
    return "MEDIUM";
  }
  if (candidate && candidate.attributeScore < 90) return "MEDIUM";
  return "LOW";
}

// ---------------------------------------------------------------------------
// Review queue mutation (demo-level, in-memory)
// ---------------------------------------------------------------------------

export function createReviewCase(
  input: MaterialRecord,
  corpus: MaterialRecord[],
): ReviewCase {
  const result = resolveMaterialRecord(input, corpus);
  const candidate = result.selectedCandidate;
  return {
    id: `REVIEW-${1040 + Math.floor(Math.random() * 9000)}`,
    materialA: input,
    materialB: candidate?.targetRecord ?? input,
    risk: result.risk,
    systemRecommendation: result.decision,
    reason: result.reason,
    status: "PENDING",
    confidence: result.evidenceCoverage,
    createdAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Counterfactual testing: mutate one attribute, recompute using real logic.
// ---------------------------------------------------------------------------

export function applyCounterfactual(
  input: MaterialRecord,
  candidate: MaterialRecord,
  change: CounterfactualChange,
): {
  left: MaterialRecord;
  right: MaterialRecord;
  constraintsActivated: string[];
} {
  const rightDNA = mutateDNA(candidate.dna, change, true);
  const attr = candidate.dna[change.attribute] as {
    evidence?: { span: string } | null;
  };
  const original = candidate.rawDescription
    .toLowerCase()
    .includes(change.original.toLowerCase())
    ? change.original
    : attr.evidence?.span;
  let raw = candidate.rawDescription;
  if (original) {
    const at = raw.toLowerCase().indexOf(original.toLowerCase());
    if (at >= 0)
      raw =
        raw.slice(0, at) + change.modified + raw.slice(at + original.length);
  }
  const modified = rightDNA[change.attribute] as {
    evidence?: {
      sourceText: string;
      span: string;
      normalizedValue: string;
      confidence: number;
      extractor: string;
    } | null;
  };
  modified.evidence = {
    sourceText: raw,
    span: change.modified,
    normalizedValue: change.modified,
    confidence: 0.97,
    extractor: "counterfactual:attribute-override",
  };
  const rightRec: MaterialRecord = {
    ...candidate,
    dna: rightDNA,
    rawDescription: raw,
    normalizedDescription: normalizeDescription(raw),
  };
  const constraints = evaluateConstraints(input.dna, rightDNA);
  return {
    left: input,
    right: rightRec,
    constraintsActivated: criticalConflicts(constraints).map((c) => c.rule),
  };
}

function mutateDNA(
  dna: MaterialDNA,
  change: CounterfactualChange,
  apply: boolean,
): MaterialDNA {
  if (!apply) {
    return { ...dna };
  }
  const key = change.attribute as keyof MaterialDNA;
  const copy = structuredClone(dna);
  if (key === "dimensions" || key === "standard" || key === "electrical") {
    (copy[key] as { value: string[] }).value = [change.modified];
  } else {
    (copy[key] as { value: string | null }).value = change.modified;
  }
  (copy[key] as { confidence: number }).confidence = 0.97;
  return copy;
}

export function runCounterfactual(
  result: ResolutionResult,
  corpus: MaterialRecord[],
  change: CounterfactualChange,
): CounterfactualResult {
  const candidate = result.selectedCandidate?.targetRecord;
  if (!candidate)
    return {
      before: result,
      after: null as unknown as ResolutionResult,
      changed: false,
      constraintsActivated: [],
      beforeDecision: "REVIEW",
      afterDecision: "REVIEW",
    };

  const { left, right, constraintsActivated } = applyCounterfactual(
    result.input,
    corpus.find((r) => r.id === candidate.id) ?? candidate,
    change,
  );

  // Re-score with mutated DNA using existing matching pipeline.
  const after = resolveMaterialRecord(left, [right]);

  return {
    before: result,
    after,
    changed: true,
    constraintsActivated,
    beforeDecision: result.decision,
    afterDecision: after.decision,
  };
}

export function riskLabel(risk: ResolutionResult["risk"]): string {
  return risk;
}
