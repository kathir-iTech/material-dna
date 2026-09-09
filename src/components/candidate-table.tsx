import { Eye } from "lucide-react";
import type { ScoredCandidate } from "@/lib/material-dna/matching";
import { Card } from "@/components/ui/card";
import { DecisionBadge } from "@/components/ui/status";
import { cn } from "@/lib/utils";

export function CandidateTable({
  candidates,
  selectedId,
  onSelect,
  onInspect,
}: {
  candidates: ScoredCandidate[];
  selectedId: string | null;
  onSelect: (c: ScoredCandidate) => void;
  onInspect: (c: ScoredCandidate) => void;
}) {
  return (
    <Card>
      <div className="flex items-center justify-between border-b border-dna-border px-4 py-3">
        <h3 className="text-sm font-semibold text-dna-text">Candidate Materials</h3>
        <span className="text-[11px] text-dna-faint">
          Prototype similarity score — click a row to inspect
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead>
            <tr className="border-b border-dna-border text-[11px] uppercase tracking-wider text-dna-faint">
              <th className="px-4 py-2 font-medium">Material ID</th>
              <th className="px-2 py-2 font-medium">Description</th>
              <th className="px-2 py-2 font-medium">Similarity</th>
              <th className="px-2 py-2 font-medium">Attr Match</th>
              <th className="px-2 py-2 font-medium">Conflicts</th>
              <th className="px-2 py-2 font-medium">Decision</th>
              <th className="px-4 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {candidates.map((c) => {
              const isSelected = c.targetRecord.sourceCode === selectedId;
              return (
                <tr
                  key={c.targetRecord.id}
                  tabIndex={0}
                  role="button"
                  aria-label={`Inspect candidate ${c.targetRecord.sourceCode}`}
                  onClick={() => {
                    onSelect(c);
                    onInspect(c);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      onSelect(c);
                      onInspect(c);
                    }
                  }}
                  className={cn(
                    "cursor-pointer border-b border-dna-border/50 transition-colors hover:bg-dna-panel2",
                    isSelected && "bg-dna-cyan/5"
                  )}
                >
                  <td className="px-4 py-2 font-mono text-dna-cyan">{c.targetRecord.sourceCode}</td>
                  <td className="max-w-72 truncate px-2 py-2 text-dna-text">
                    {c.targetRecord.rawDescription}
                  </td>
                  <td className="px-2 py-2 font-mono text-dna-text">
                    {c.similarityScore.toFixed(1)}%
                  </td>
                  <td className="px-2 py-2 font-mono text-dna-muted">{c.attributeScore}%</td>
                  <td className="px-2 py-2 font-mono">
                    {c.criticalConflicts.length > 0 ? (
                      <span className="text-dna-red">{c.criticalConflicts.length}</span>
                    ) : (
                      <span className="text-dna-green">0</span>
                    )}
                  </td>
                  <td className="px-2 py-2">
                    <DecisionBadge decision={c.decision} size="sm" />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Eye size={14} className="inline text-dna-faint" aria-hidden />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}