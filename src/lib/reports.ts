import type {
  ResolutionResult,
  ReviewCase,
  MigrationBatch,
} from "@/types/domain";
import { identityProposal } from "./material-dna/identity-proposal";

export function downloadFile(
  name: string,
  body: string,
  mime = "application/json",
) {
  const url = URL.createObjectURL(
    new Blob([body], { type: mime + ";charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function csvCell(value: unknown): string {
  let text = String(value ?? "");
  // Prevent formula execution when exported descriptions are opened in spreadsheets.
  if (/^[\s\uFEFF]*[=+@-]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
export function toCsv(rows: unknown[][]) {
  return "\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}
export function resolutionEvidence(result: ResolutionResult) {
  return {
    schemaVersion: 1,
    kind: "material-dna-decision-evidence",
    exportedAt: new Date().toISOString(),
    scope:
      "Prototype recommendation; not engineering certification or an authorised merge",
    storage: "Local browser workspace; not a signed institutional audit",
    identityProposal: identityProposal(result),
    result: { ...result, candidates: result.candidates.slice(0, 5) },
  };
}
const escapeHtml = (text: unknown) =>
  String(text ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export function decisionHtml(result: ResolutionResult): string {
  const candidate = result.selectedCandidate;
  const identity = identityProposal(result);
  return `<!doctype html><html lang="en"><meta charset="utf-8"><title>Material DNA — ${escapeHtml(result.caseId)}</title><style>body{font:15px/1.7 system-ui;max-width:850px;margin:50px auto;padding:20px;color:#183247}h1{font-size:32px}h2{margin-top:32px}small{color:#607382}table{width:100%;border-collapse:collapse}td,th{text-align:left;padding:10px;border-bottom:1px solid #ddd}code{overflow-wrap:anywhere}.verdict{background:#edf6f1;padding:20px;border-radius:10px}@media print{body{margin:0}}</style><small>MATERIAL DNA / DECISION EVIDENCE</small><h1>${escapeHtml(result.decision.replaceAll("_", " "))}</h1><div class="verdict">${escapeHtml(result.reason)}</div><h2>Source and reference</h2><p><b>Input:</b> ${escapeHtml(result.input.rawDescription)}</p><p><b>Reference:</b> ${escapeHtml(candidate?.targetRecord.rawDescription ?? "No candidate")}</p><p>Source code: <code>${escapeHtml(candidate?.targetRecord.sourceCode)}</code></p><h2>Identity proposal</h2><p><b>Relationship:</b> ${escapeHtml(identity.relationship)} — ${escapeHtml(identity.explanation)}</p><p><b>Input proposal:</b> <code>${escapeHtml(identity.inputCode)}</code><br><b>Reference proposal:</b> <code>${escapeHtml(identity.referenceCode ?? "No reference")}</code></p><p>${escapeHtml(identity.scope)}</p><h2>Extracted engineering attributes</h2><table><tr><th>Attribute</th><th>Value</th><th>Evidence</th></tr>${Object.entries(
    result.dna,
  )
    .filter(
      ([, attr]) =>
        typeof attr === "object" && attr !== null && "value" in attr,
    )
    .map(([key, attr]) => {
      const value = attr as {
        value: unknown;
        evidence?: { span?: string } | null;
      };
      return `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(Array.isArray(value.value) ? value.value.join(", ") : (value.value ?? "Not stated"))}</td><td>${escapeHtml(value.evidence?.span ?? "—")}</td></tr>`;
    })
    .join(
      "",
    )}</table><h2>Ranking signals</h2><p>Semantic similarity: ${escapeHtml(candidate?.scoreDetails.semanticSimilarity ?? "n/a")}% · Attribute agreement: ${escapeHtml(candidate?.scoreDetails.attributeAgreement ?? "n/a")}% · Composite score: ${escapeHtml(candidate?.scoreDetails.finalScore ?? "n/a")}. MiniLM cosine: ${escapeHtml(candidate?.scoreDetails.embeddingSimilarity ?? "unavailable / lexical ranking")} · These scores are ranking signals, not calibrated probabilities of equivalence.</p><h2>Constraint findings</h2><table><tr><th>Attribute</th><th>Input</th><th>Reference</th><th>Finding</th></tr>${(candidate?.constraints ?? []).map((c) => `<tr><td>${escapeHtml(c.attributeLabel)}</td><td>${escapeHtml(c.leftValue)}</td><td>${escapeHtml(c.rightValue)}</td><td>${escapeHtml(c.explanation)}</td></tr>`).join("")}</table><h2>Evidence trail</h2>${result.auditEvents.map((e) => `<p><small>${escapeHtml(e.at)}</small> <b>${escapeHtml(e.label)}</b> ${escapeHtml(e.detail)}</p>`).join("")}<h2>Provenance</h2><p>Case: ${escapeHtml(result.caseId)}<br>Created: ${escapeHtml(result.createdAt)}<br>Engine: ${escapeHtml(result.engineVersion)}<br>Parser: ${escapeHtml(result.parserVersion)} · Constraints: ${escapeHtml(result.constraintVersion)}</p><hr><small>Prototype recommendation. Synthetic reference corpus. Human engineering approval required. This document is an unsigned export, not a certified audit record.</small></html>`;
}
export function reviewCsv(cases: ReviewCase[]) {
  return toCsv([
    [
      "case",
      "input",
      "reference",
      "recommendation",
      "review_status",
      "note",
      "reviewed_at",
      "engine_version",
      "parser_version",
      "constraint_version",
    ],
    ...cases.map((c) => [
      c.id,
      c.materialA.rawDescription,
      c.materialB.rawDescription,
      c.systemRecommendation,
      c.status,
      c.reviewerNote,
      c.reviewerDecisionAt,
      c.engineVersion,
      c.parserVersion,
      c.constraintVersion,
    ]),
  ]);
}
export function migrationCsv(batch: MigrationBatch) {
  return toCsv([
    [
      "row",
      "source",
      "description",
      "recommendation",
      "review_status",
      "candidate_code",
      "reason",
    ],
    ...batch.rows.map((r) => [
      r.row,
      r.source,
      r.description,
      r.decision,
      r.status,
      r.candidateCode,
      r.reason,
    ]),
  ]);
}
