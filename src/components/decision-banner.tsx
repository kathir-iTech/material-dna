import { Check, X, AlertTriangle } from "lucide-react";
import type { ResolutionResult } from "@/types/domain";
import { DecisionBadge, RiskBadge } from "@/components/ui/status";
import { Card } from "@/components/ui/card";
import { SubScoreList } from "@/components/score-breakdown";

export function DecisionBanner({ result }: { result: ResolutionResult }) {
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
              <Check size={17} aria-hidden="true" />
            ) : result.decision === "DO_NOT_MERGE" ? (
              <X size={17} aria-hidden="true" />
            ) : (
              <AlertTriangle size={17} aria-hidden="true" />
            )}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <DecisionBadge decision={result.decision} size="lg" />
              <RiskBadge risk={result.risk} label="Risk" />
            </div>
            <p className="mt-1 max-w-xl text-sm text-dna-muted">
              {result.reason}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 text-xs text-dna-muted">
          <span>
            Case{" "}
            <span className="font-mono text-dna-text">{result.caseId}</span>
          </span>
          <span>
            Evidence coverage{" "}
            <span className="text-dna-cyan">{result.evidenceCoverage}%</span>
          </span>
          {criticals.length > 0 && (
            <span className="text-dna-red">
              {criticals.length} critical conflict(s)
            </span>
          )}
        </div>
      </div>
      {result.selectedCandidate?.scoreDetails && (
        <details className="mt-4 border-t border-dna-border pt-3 text-xs text-dna-muted">
          <summary>Ranking signals</summary>
          <SubScoreList
            score={result.selectedCandidate.scoreDetails}
            className="mt-3 max-w-sm"
          />
        </details>
      )}
    </Card>
  );
}
