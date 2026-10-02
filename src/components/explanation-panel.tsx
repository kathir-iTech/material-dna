import { Check, X, HelpCircle, ArrowRight, Activity } from "lucide-react";
import type { ResolutionResult } from "@/types/domain";
import type { ScoredCandidate } from "@/lib/material-dna/matching";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { DecisionBadge } from "@/components/ui/status";
import { SubScoreList, SubScoreHelp } from "@/components/score-breakdown";

export function ExplanationPanel({
  result,
  candidate,
  compact,
}: {
  result: ResolutionResult;
  candidate?: ScoredCandidate | null;
  compact?: boolean;
}) {
  const target = candidate ?? result.selectedCandidate ?? null;
  if (!target) {
    return (
      <Card>
        <CardHeader title="Why this decision?" />
        <CardBody className="text-sm text-dna-muted">
          No candidate available to explain.
        </CardBody>
      </Card>
    );
  }

  const isAlternateCandidate = candidate !== undefined && candidate !== result.selectedCandidate;
  const explain: { evidence: string[]; conflicts: string[]; unknowns: string[]; summary: string } = target.explanation ?? {
    evidence: [],
    conflicts: [],
    unknowns: [],
    summary: "Scored candidate produced no explanation text.",
  };

  return (
    <Card>
      <CardHeader
        title={isAlternateCandidate ? `Why not this candidate?  ${target.targetRecord.sourceCode}` : "Why this decision?"}
        subtitle={
          isAlternateCandidate
            ? undefined
            : `Generated dynamically from the actual attribute comparison for ${target.targetRecord.sourceCode}`
        }
        right={<DecisionBadge decision={target.decision} size="sm" />}
      />
      <CardBody className="space-y-4">
        <div>
          <h4 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-dna-green">
            <Check size={12} aria-hidden="true" /> Matching Evidence
          </h4>
          <ul className="space-y-1">
            {explain.evidence.length === 0 && (
              <li className="text-xs text-dna-faint">No matching attributes confirmed.</li>
            )}
            {explain.evidence.map((e) => (
              <li key={e} className="flex items-start gap-2 text-xs text-dna-text">
                <Check size={13} className="mt-0.5 shrink-0 text-dna-green" aria-hidden="true" />
                {e}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-dna-red">
            <X size={12} aria-hidden="true" /> Conflicts
          </h4>
          <ul className="space-y-1">
            {explain.conflicts.length === 0 && (
              <li className="text-xs text-dna-faint">No conflicts detected.</li>
            )}
            {explain.conflicts.map((c) => (
              <li key={c} className="flex items-start gap-2 text-xs text-dna-red">
                <X size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
                {c}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-dna-amber">
            <HelpCircle size={12} aria-hidden="true" /> Unknowns
          </h4>
          <ul className="space-y-1">
            {explain.unknowns.length === 0 && (
              <li className="text-xs text-dna-faint">No unresolved attributes.</li>
            )}
            {explain.unknowns.map((u) => (
              <li key={u} className="flex items-start gap-2 text-xs text-dna-amber/80">
                <HelpCircle size={13} className="mt-0.5 shrink-0 text-dna-amber" aria-hidden="true" />
                {u}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded border border-dna-border2 bg-dna-panel2 p-3">
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-dna-cyan">
            <Activity size={12} aria-hidden="true" /> Score breakdown
          </div>
          <SubScoreList score={target.scoreDetails} outcome />
          <SubScoreHelp className="text-dna-faint/80" />
        </div>

        <div className="rounded border border-dna-border2 bg-dna-panel2 p-3">
          <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-dna-cyan">
            Decision <ArrowRight size={11} aria-hidden="true" />
          </div>
          <p className="text-sm leading-relaxed text-dna-text">{explain.summary}</p>
        </div>

        {!compact && (
          <p className="text-[11px] text-dna-faint">
            Constraint trace:{" "}
            <code className="font-mono">
              {(target.ruleTrace.length > 0 ? target.ruleTrace : ["positive-match"]).join(", ")}
            </code>
          </p>
        )}
      </CardBody>
    </Card>
  );
}