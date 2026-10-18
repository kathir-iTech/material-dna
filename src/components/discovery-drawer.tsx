"use client";

import { useEffect, useRef } from "react";
import { X, FileSearch } from "lucide-react";
import type { ScoredCandidate } from "@/lib/material-dna/matching";
import { DecisionBadge } from "@/components/ui/status";
import { Badge } from "@/components/ui/badge";
import { ATTRIBUTE_META } from "@/lib/material-dna/config";
import { SCORE_DEFINITIONS, SubScoreHelp } from "@/components/score-breakdown";

export function DiscoveryDrawer({
  candidate,
  onClose,
}: {
  candidate: ScoredCandidate | null;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const element = dialog.current;
    if (!candidate || !element) return;
    returnFocus.current = document.activeElement as HTMLElement | null;
    if (!element.open) element.showModal();
    element.querySelector<HTMLButtonElement>("button")?.focus();
    return () => {
      if (element.open) element.close();
    };
  }, [candidate]);
  const close = () => {
    dialog.current?.close();
    onClose();
    if (returnFocus.current?.isConnected)
      returnFocus.current.focus({ preventScroll: true });
  };
  if (!candidate) return null;

  const target = candidate.targetRecord;
  const dna = target.dna;

  return (
    <dialog
      ref={dialog}
      className="fixed inset-0 z-50 m-0 h-dvh w-screen max-w-none justify-end border-0 bg-black/60 p-0 open:flex"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const nodes = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(
            'button, a[href], input, select, textarea, [tabindex="0"]',
          ),
        ).filter(
          (node) =>
            !node.hasAttribute("disabled") && node.getClientRects().length > 0,
        );
        const first = nodes[0],
          last = nodes[nodes.length - 1],
          active = document.activeElement;
        if (
          event.shiftKey &&
          (active === first || !nodes.includes(active as HTMLElement))
        ) {
          event.preventDefault();
          (last ?? event.currentTarget).focus();
        } else if (
          !event.shiftKey &&
          (active === last || !nodes.includes(active as HTMLElement))
        ) {
          event.preventDefault();
          (first ?? event.currentTarget).focus();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-label={`Source evidence for ${target.sourceCode}`}
      onClick={close}
    >
      <div
        className="h-full w-full max-w-md overflow-y-auto border-l border-dna-border bg-dna-panel p-5"
        tabIndex={0}
        role="region"
        aria-label="Source evidence details"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSearch
              size={15}
              className="text-dna-cyan"
              aria-hidden="true"
            />
            <h2 className="text-sm font-semibold text-dna-text">
              Source Evidence
            </h2>
          </div>
          <button
            onClick={close}
            className="flex h-11 w-11 items-center justify-center rounded text-dna-muted hover:text-dna-text"
            aria-label="Close evidence drawer"
          >
            <X size={16} aria-hidden="true" />
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
            <div className="text-xs tracking-normal text-dna-faint">
              Source text
            </div>
            <p className="mt-1 font-mono text-xs text-dna-text">
              &quot;{target.rawDescription}&quot;
            </p>
          </div>

          <div className="rounded border border-dna-border2 bg-dna-panel2 p-3">
            <div className="text-xs tracking-normal text-dna-faint">
              Normalized description
            </div>
            <p className="mt-1 font-mono text-xs text-dna-cyan">
              {target.normalizedDescription}
            </p>
          </div>

          <div>
            <h3 className="mb-2 text-xs font-semibold tracking-normal text-dna-muted">
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
                const has =
                  v !== null &&
                  v !== undefined &&
                  (Array.isArray(v) ? v.length > 0 : String(v).length > 0);
                if (!has) return null;
                return (
                  <div
                    key={key}
                    className="rounded border border-dna-border bg-dna-panel p-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-dna-muted">
                        {meta.label}
                      </span>
                      <span className="font-mono text-xs text-dna-green">
                        {Math.round((attr.confidence ?? 0) * 100)}%
                      </span>
                    </div>
                    <div className="mt-1 font-mono text-xs text-dna-text">
                      {Array.isArray(v) ? v.join(", ") : String(v)}
                    </div>
                    {attr.evidence?.span && (
                      <div className="mt-1 text-xs text-dna-cyan">
                        Evidence span:{" "}
                        <code className="font-mono">
                          &quot;{attr.evidence.span}&quot;
                        </code>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded border border-dna-border2 bg-dna-panel2 p-3 text-xs text-dna-muted">
            <div className="tracking-normal text-dna-faint">
              Scoring breakdown
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 font-mono">
              <span>Similarity (best variant)</span>
              <span className="text-right text-dna-text">
                {candidate.similarityScore.toFixed(1)}%
              </span>
              <span title={SCORE_DEFINITIONS.tokenOverlap}>Token overlap</span>
              <span className="text-right text-dna-text">
                {candidate.scoreDetails.tokenOverlap}%
              </span>
              <span title={SCORE_DEFINITIONS.diceSimilarity}>
                Dice similarity
              </span>
              <span className="text-right text-dna-text">
                {candidate.scoreDetails.diceSimilarity}%
              </span>
              <span title={SCORE_DEFINITIONS.tfidfSimilarity}>TF-IDF</span>
              <span className="text-right text-dna-text">
                {candidate.scoreDetails.tfidfSimilarity}%
              </span>
              <span title={SCORE_DEFINITIONS.attributeAgreement}>
                Attribute agreement
              </span>
              <span className="text-right text-dna-text">
                {candidate.attributeScore}%
              </span>
              <span>Semantic blend</span>
              <span className="text-right text-dna-text">
                {candidate.scoreDetails.semanticSimilarity}%
              </span>
              <span>Conflict penalty</span>
              <span className="text-right text-dna-red">
                -{candidate.scoreDetails.conflictPenalty}
              </span>
              <span>Evidence coverage</span>
              <span className="text-right text-dna-text">
                {candidate.evidenceCoverage}%
              </span>
            </div>
            <SubScoreHelp className="text-dna-faint" />
          </div>

          <p className="text-xs text-dna-faint">
            Extractor: Schema-aware prototype parser · v0.1 · Demonstration data
          </p>
        </div>
      </div>
    </dialog>
  );
}
