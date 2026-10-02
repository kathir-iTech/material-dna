"use client";

import { useState } from "react";
import { Play, RotateCcw, Send, ClipboardList } from "lucide-react";
import { demoScenarios } from "@/data/demo";
import { useResolver } from "@/hooks/use-resolver";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { ProcessingSteps } from "@/components/processing-steps";
import { MaterialDNAProfile } from "@/components/material-dna-profile";
import { CandidateTable } from "./candidate-table";
import { ExplanationPanel } from "./explanation-panel";
import { SimilarityWarning } from "./similarity-warning";
import { CounterfactualPanel } from "./counterfactual-panel";
import { AuditTimeline } from "./audit-timeline";
import { OverviewStrip } from "./overview-strip";
import { DecisionBanner } from "./decision-banner";
import { DiscoveryDrawer } from "./discovery-drawer";
import type { ScoredCandidate } from "@/lib/material-dna/matching";

export function ResolveClient() {
  const resolver = useResolver();
  const [selectedCandidate, setSelectedCandidate] = useState<ScoredCandidate | null>(null);
  const [drawerCandidate, setDrawerCandidate] = useState<ScoredCandidate | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const result = resolver.result;
  const topCandidate = result?.selectedCandidate ?? null;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight text-dna-text">
            Material DNA Control Room
          </h1>
          <Badge tone="blue">Prototype</Badge>
          <Badge tone="purple">Demo Mode</Badge>
        </div>
        <p className="max-w-3xl text-sm text-dna-muted">
          Resolve heterogeneous material descriptions using semantic similarity
          <span className="text-dna-text"> + </span>
          <span className="text-dna-cyan">engineering constraints</span>.
          Similarity is proposed; constraints govern; evidence explains; humans resolve ambiguity.
        </p>
      </div>

      <OverviewStrip />

      {/* Input */}
      <Card>
        <CardHeader
          title="Resolve a material description"
          subtitle="Enter any description below or run one of the demo scenarios."
          right={<DemoBadge />}
        />
        <CardBody className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row">
            <textarea
              value={resolver.description}
              onChange={(e) => resolver.setDescription(e.target.value)}
              placeholder="e.g. HEX BOLT M12 X 60 8.8 ZP DIN 931"
              rows={3}
              className="flex-1 resize-none rounded border border-dna-border bg-dna-panel2 px-3 py-2 font-mono text-sm text-dna-text placeholder:text-dna-faint"
              aria-label="Material description input"
            />
            <div className="flex flex-col gap-2 lg:w-64">
              <button
                onClick={resolver.handleResolve}
                disabled={resolver.phase === "processing" || resolver.description.trim().length === 0}
                className="inline-flex items-center justify-center gap-2 rounded border border-dna-cyan/50 bg-dna-cyan/10 px-4 py-2.5 text-sm font-semibold text-dna-cyan transition-colors hover:bg-dna-cyan/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Play size={15} aria-hidden="true" />
                Resolve Material
              </button>
              {resolver.result && (
                <button
                  onClick={resolver.sendToReview}
                  className="inline-flex items-center justify-center gap-2 rounded border border-dna-amber/40 bg-dna-amber/10 px-4 py-2 text-xs font-medium text-dna-amber transition-colors hover:bg-dna-amber/20"
                >
                  <Send size={13} aria-hidden="true" />
                  Send to Review Queue
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {demoScenarios.map((scenario) => (
              <button
                key={scenario.id}
                onClick={() => resolver.handleScenario(scenario.id)}
                className="rounded border border-dna-border2 px-2.5 py-1.5 text-xs text-dna-muted transition-colors hover:border-dna-cyan/50 hover:text-dna-text"
                aria-label={`Run scenario: ${scenario.title}`}
              >
                {scenario.title}
              </button>
            ))}
            <button
              onClick={resolver.reset}
              className="ml-auto inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs text-dna-faint transition-colors hover:text-dna-text"
            >
              <RotateCcw size={12} aria-hidden="true" /> Reset
            </button>
            <button
              onClick={() => setShowHelp(true)}
              className="inline-flex items-center gap-1.5 rounded border border-dna-border2 px-2.5 py-1.5 text-xs text-dna-muted hover:text-dna-text"
              aria-label="Open suggested demo script"
            >
              <ClipboardList size={12} aria-hidden="true" /> Suggested Demo
            </button>
          </div>

          {resolver.phase === "processing" && (
            <div className="rounded border border-dna-cyan/30 bg-dna-panel p-4">
              <ProcessingSteps steps={resolver.steps} />
            </div>
          )}
        </CardBody>
      </Card>

      {result && (
        <>
          <DecisionBanner result={result} />

          {/* Similarity != Equivalence highlight */}
          {result.decision === "DO_NOT_MERGE" && result.selectedCandidate && (
            <SimilarityWarning
              similarity={result.selectedCandidate.similarityScore}
              score={result.selectedCandidate.scoreDetails}
              constraint={
                result.selectedCandidate.criticalConflicts[0] ?? null
              }
            />
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <MaterialDNAProfile dna={result.dna} />
            <ExplanationPanel result={result} />
          </div>

          <CandidateTable
            candidates={result.candidates.slice(0, 5)}
            selectedId={topCandidate?.targetRecord.sourceCode ?? null}
            onSelect={(c) => setSelectedCandidate(c)}
            onInspect={(c) => setDrawerCandidate(c)}
          />

          {selectedCandidate && topCandidate && (
            <ExplanationPanel result={result} candidate={selectedCandidate} compact />
          )}

          <CounterfactualPanel resolver={resolver} />

          <AuditTimeline events={result.auditEvents} versions={{ engine: result.engineVersion, parser: result.parserVersion, constraints: result.constraintVersion }} />
        </>
      )}

      <DiscoveryDrawer
        candidate={drawerCandidate}
        onClose={() => setDrawerCandidate(null)}
      />

      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label="Suggested demo script">
          <div className="w-full max-w-lg rounded-md border border-dna-border bg-dna-panel p-5 shadow-xl">
            <h2 className="text-sm font-semibold text-dna-text">Suggested 60-second Demo</h2>
            <div className="mt-3 space-y-3 text-sm text-dna-muted">
              <p><span className="font-mono text-dna-green">1 — Match</span> We first show that semantic and structured agreement can establish a likely duplicate.</p>
              <p><span className="font-mono text-dna-red">2 — Near Match</span> Now we change only one engineering-critical attribute. Grade: 8.8 → 10.9. The descriptions remain highly similar, but the constraint engine blocks the merge.</p>
              <p><span className="font-mono text-dna-amber">3 — Abstain</span> Finally, remove enough information that the system cannot safely decide. Instead of hallucinating identity, it abstains and routes the case to human review.</p>
            </div>
            <button
              onClick={() => setShowHelp(false)}
              className="mt-5 w-full rounded border border-dna-border2 py-2 text-sm text-dna-muted hover:text-dna-text"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}