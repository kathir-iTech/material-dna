import { Check, X, AlertTriangle } from "lucide-react";
import type { ResolutionResult } from "@/types/domain";
import { DecisionBadge, RiskBadge } from "@/components/ui/status";
import { Card } from "@/components/ui/card";
import { SCORE_DEFINITIONS } from "@/components/score-breakdown";

export function DecisionBanner({ result }: { result: ResolutionResult }) {
  const score = result.selectedCandidate?.scoreDetails ?? null;
  const criticals = result.selectedCandidate?.criticalConflicts ?? [];

  return (
    <Card
      className={`border-l-2 p-4 ${
        result.decision === "MATCH"
          ? "border-l-dna-green"
          : result.decision === "DO_NOT_MERGE"
            ? "border-l-dna-red"
            : "border-l-dna-amber"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={`flex h-9 w-9 items-center justify-center rounded-full border ${
              result.decision === "MATCH"
                ? "border-dna-green/50 bg-dna-green/10 text-dna-green"
                : result.decision === "DO_NOT_MERGE"
                  ? "border-dna-red/50 bg-dna-red/10 text-dna-red"
                  : "border-dna-amber/50 bg-dna-amber/10 text-dna-amber"
            }`}
          >
            {result.decision === "MATCH" ? (
              <Check size={17} />
            ) : result.decision === "DO_NOT_MERGE" ? (
              <X size={17} />
            ) : (
              <AlertTriangle size={17} />
            )}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <DecisionBadge decision={result.decision} size="lg" />
              <RiskBadge risk={result.risk} label="Risk" />
            </div>
            <p className="mt-1 max-w-xl text-sm text-dna-muted">{result.reason}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 font-mono text-xs text-dna-muted">
          <span>
            Case <span className="text-dna-text">{result.caseId}</span>
          </span>
          <span>
            Evidence coverage <span className="text-dna-cyan">{result.evidenceCoverage}%</span>
          </span>
          {criticals.length > 0 && (
            <span className="text-dna-red">{criticals.length} critical conflict(s)</span>
          )}
          {score && (
            <span className="flex flex-col items-end gap-0.5">
              <span title={SCORE_DEFINITIONS.tokenOverlap}>
                Token overlap <span className="text-dna-text">{score.tokenOverlap}%</span>
              </span>
              <span title={SCORE_DEFINITIONS.diceSimilarity}>
                Dice similarity <span className="text-dna-text">{score.diceSimilarity}%</span>
              </span>
              <span title={SCORE_DEFINITIONS.tfidfSimilarity}>
                TF-IDF <span className="text-dna-text">{score.tfidfSimilarity}%</span>
              </span>
              <span title={SCORE_DEFINITIONS.attributeAgreement}>
                Attribute agreement{" "}
                <span className="text-dna-text">{score.attributeAgreement}%</span>
              </span>
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}