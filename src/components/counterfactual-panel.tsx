"use client";

import { FlaskConical, ArrowDown } from "lucide-react";
import type { CounterfactualResult } from "@/types/domain";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { DecisionBadge } from "@/components/ui/status";
import { SubScoreList } from "@/components/score-breakdown";
import type { UseResolverReturn } from "@/hooks/use-resolver-types";
import type { CounterfactualChange } from "@/types/domain";

export function CounterfactualPanel({ resolver }: { resolver: UseResolverReturn }) {
  const result = resolver.result;
  const { counterfactual } = resolver;

  if (!result?.selectedCandidate) return null;

  const candidateDna = result.selectedCandidate.targetRecord.dna;

  const changes: CounterfactualChange[] = [
    {
      attribute: "grade",
      label: "Grade",
      original: String(candidateDna.grade.value ?? "8.8"),
      modified: String(candidateDna.grade.value) === "10.9" ? "8.8" : "10.9",
    },
    {
      attribute: "dimensions",
      label: "Dimension",
      original: candidateDna.dimensions.value?.[0] ?? "M12 × 60 mm",
      modified:
        candidateDna.dimensions.value?.[0]?.includes("50")
          ? "M12 × 60 mm"
          : "M12 × 50 mm",
    },
    {
      attribute: "standard",
      label: "Standard",
      original: candidateDna.standard.value?.[0] ?? "DIN 931",
      modified: "ASTM A193",
    },
  ];

  const output: CounterfactualResult | null = counterfactual ?? null;

  return (
    <Card>
      <CardHeader
        title="Counterfactual Test — Test the Decision"
        subtitle="Mutate one engineering-critical attribute and recompute the decision with the real constraint engine."
        right={<FlaskConical size={15} className="text-dna-cyan" />}
      />
      <CardBody className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {changes.map((change) => (
            <button
              key={change.attribute}
              onClick={() => {
                resolver.runCounterfactual(change);
              }}
              className="inline-flex items-center gap-2 rounded border border-dna-border2 px-3 py-1.5 text-xs text-dna-muted transition-colors hover:border-dna-cyan/50 hover:text-dna-text"
              aria-label={`Change ${change.label} from ${change.original} to ${change.modified}`}
            >
              <FlaskConical size={12} className="text-dna-cyan" />
              Change {change.label}: {change.original} → {change.modified}
            </button>
          ))}
        </div>

        {output && output.changed && (
          <div className="grid gap-3 rounded border border-dna-border2 bg-dna-panel2 p-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
            <div className="text-center">
              <div className="text-[11px] uppercase tracking-wider text-dna-faint">Before</div>
              <div className="mt-1">
                <DecisionBadge decision={output.beforeDecision} size="md" />
              </div>
              <div className="mt-1 font-mono text-xs text-dna-muted">
                {(output.before.selectedCandidate?.similarityScore ?? 0).toFixed(1)}% similarity
              </div>
              {output.before.selectedCandidate && (
                <SubScoreList
                  score={output.before.selectedCandidate.scoreDetails}
                  className="mt-1"
                />
              )}
            </div>
            <div className="flex items-center justify-center text-dna-faint">
              <ArrowDown size={16} aria-hidden />
            </div>
            <div className="text-center">
              <div className="text-[11px] uppercase tracking-wider text-dna-faint">After</div>
              <div className="mt-1">
                <DecisionBadge decision={output.afterDecision} size="md" />
              </div>
              <div className="mt-1 font-mono text-xs text-dna-muted">
                {(output.after.selectedCandidate?.similarityScore ?? 0).toFixed(1)}% similarity
              </div>
              {output.after.selectedCandidate && (
                <SubScoreList
                  score={output.after.selectedCandidate.scoreDetails}
                  className="mt-1"
                />
              )}
            </div>
            {output.constraintsActivated.length > 0 && (
              <div className="sm:col-span-3 mt-1 text-center">
                <span className="text-[11px] text-dna-muted">Constraint activated: </span>
                <code className="font-mono text-xs text-dna-red">
                  {output.constraintsActivated.join(", ")}
                </code>
              </div>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
}