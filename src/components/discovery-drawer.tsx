"use client";

import { X, FileSearch } from "lucide-react";
import type { ScoredCandidate } from "@/lib/material-dna/matching";
import { DecisionBadge } from "@/components/ui/status";
import { Badge } from "@/components/ui/badge";
import { ATTRIBUTE_META } from "@/lib/material-dna/config";

export function DiscoveryDrawer({
  candidate,
  onClose,
}: {
  candidate: ScoredCandidate | null;
  onClose: () => void;
}) {
  if (!candidate) return null;

  const target = candidate.targetRecord;
  const dna = target.dna;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-label={`Source evidence for ${target.sourceCode}`}
      onClick={onClose}
    >
      <div
        className="h-full w-full max-w-md overflow-y-auto border-l border-dna-border bg-dna-panel p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSearch size={15} className="text-dna-cyan" />
            <h2 className="text-sm font-semibold text-dna-text">Source Evidence</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-dna-muted hover:text-dna-text"
            aria-label="Close evidence drawer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-4 space-y-4 text-sm">
          <div>
            <div className="inline-flex items-center gap-2 font-mono text-xs">
              <span className="text-dna-cyan">{target.sourceCode}</span>
              <Badge tone="neutral">{target.source}</Badge>
            </div>
            <DecisionBadge decision={candidate.decision} size="sm" />
          </div>

          <div className="rounded border border-dna-border2 bg-dna-panel2 p-3">
            <div className="text-[11px] uppercase tracking-wider text-dna-faint">Source text</div>
            <p className="mt-1 font-mono text-xs text-dna-text">&quot;{target.rawDescription}&quot;</p>
          </div>

          <div className="rounded border border-dna-border2 bg-dna-panel2 p-3">
            <div className="text-[11px] uppercase tracking-wider text-dna-faint">Normalized description</div>
            <p className="mt-1 font-mono text-xs text-dna-cyan">{target.normalizedDescription}</p>
          </div>

          <div>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-dna-muted">
              Attribute evidence (prototype parser)
            </h3>
            <div className="space-y-2">
              {Object.entries(ATTRIBUTE_META).map(([key, meta]) => {
                const attr = dna[key as keyof typeof dna] as {
                  value?: string | string[] | null;
                  confidence?: number;
                  evidence?: { span?: string } | null;
                };
                const v = attr?.value;
                const has = v !== null && v !== undefined && (Array.isArray(v) ? v.length > 0 : String(v).length > 0);
                if (!has) return null;
                return (
                  <div key={key} className="rounded border border-dna-border bg-dna-panel p-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-dna-muted">{meta.label}</span>
                      <span className="font-mono text-[11px] text-dna-green">
                        {Math.round((attr.confidence ?? 0) * 100)}%
                      </span>
                    </div>
                    <div className="mt-1 font-mono text-xs text-dna-text">
                      {Array.isArray(v) ? v.join(", ") : String(v)}
                    </div>
                    {attr.evidence?.span && (
                      <div className="mt-1 text-[11px] text-dna-cyan">
                        Evidence span: <code className="font-mono">&quot;{attr.evidence.span}&quot;</code>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded border border-dna-border2 bg-dna-panel2 p-3 text-[11px] text-dna-muted">
            <div className="uppercase tracking-wider text-dna-faint">Scoring breakdown</div>
            <div className="mt-2 grid grid-cols-2 gap-2 font-mono">
              <span>Similarity</span>
              <span className="text-right text-dna-text">{candidate.similarityScore.toFixed(1)}%</span>
              <span>Attribute agreement</span>
              <span className="text-right text-dna-text">{candidate.attributeScore}%</span>
              <span>Conflict penalty</span>
              <span className="text-right text-dna-red">-{candidate.scoreDetails.conflictPenalty}</span>
              <span>Evidence coverage</span>
              <span className="text-right text-dna-text">{candidate.evidenceCoverage}%</span>
            </div>
          </div>

          <p className="text-[11px] text-dna-faint">
            Extractor: Schema-aware prototype parser · v0.1 · Demonstration data
          </p>
        </div>
      </div>
    </div>
  );
}