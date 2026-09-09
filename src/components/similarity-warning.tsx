import type { ConstraintResult } from "@/types/domain";
import { Card } from "@/components/ui/card";
import { DecisionBadge } from "@/components/ui/status";

export function SimilarityWarning({
  similarity,
  constraint,
}: {
  similarity: number;
  constraint: ConstraintResult | null;
}) {
  return (
    <Card className="border-2 border-dna-red/60 bg-dna-panel/80">
      <div className="flex flex-col items-center justify-center gap-2 p-5 text-center">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="font-mono text-2xl text-dna-red">
            SEMANTICALLY SIMILAR <span className="text-dna-text">{similarity}%</span>
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-dna-muted">
          <span>But</span>
          <span className="h-px w-16 bg-dna-border2" />
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-2xl text-dna-red">ENGINEERING CONSTRAINT FAILED</span>
        </div>
        {constraint && (
          <div className="mt-1 flex items-center gap-3 font-mono">
            <span className="text-dna-text">{constraint.leftValue}</span>
            <span className="text-dna-red">≠</span>
            <span className="text-dna-red">{constraint.rightValue}</span>
          </div>
        )}
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs uppercase tracking-widest text-dna-muted">Final decision</span>
          <DecisionBadge decision="DO_NOT_MERGE" size="lg" />
        </div>
        <p className="max-w-xl text-xs text-dna-muted">
          High textual similarity was detected, but the candidate was rejected because an
          engineering-critical attribute cannot be treated as interchangeable.
        </p>
      </div>
    </Card>
  );
}