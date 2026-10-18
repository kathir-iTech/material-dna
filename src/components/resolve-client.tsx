"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Search,
  Download,
  FileJson,
  FlaskConical,
  GitBranch,
  Play,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { demoScenarios } from "@/data/demo";
import { useResolver } from "@/hooks/use-resolver";
import { MaterialDNAProfile } from "@/components/material-dna-profile";
import { CandidateTable } from "./candidate-table";
import { ExplanationPanel } from "./explanation-panel";
import { SimilarityWarning } from "./similarity-warning";
import { CounterfactualPanel } from "./counterfactual-panel";
import { AuditTimeline } from "./audit-timeline";
import { OverviewStrip } from "./overview-strip";
import { DecisionBanner } from "./decision-banner";
import { DiscoveryDrawer } from "./discovery-drawer";
import { PageHeading } from "./page-heading";
import { IdentityProposal } from "./identity-proposal";
import { RecordComparison } from "./record-comparison";
import { isWorkspaceStorageHealthy } from "@/lib/browser-workspace";
import { decisionHtml, downloadFile, resolutionEvidence } from "@/lib/reports";
import type { ScoredCandidate } from "@/lib/material-dna/matching";

const GUIDE = [
  {
    title: "01 · Find a duplicate",
    text: "Two descriptions agree on the engineering attributes. Inspect the source and selected reference, then check the recommendation.",
  },
  {
    title: "02 · Challenge the match",
    text: "The same input is compared against a scenario-specific reference set containing a different grade. Similar text does not make 8.8 and 10.9 interchangeable. Try the counterfactual below.",
  },
  {
    title: "03 · Know when to abstain",
    text: "A vague description does not establish identity. The engine asks for human engineering review instead of filling in missing facts.",
  },
  {
    title: "04 · Keep the evidence",
    text: "Send the case to the review queue, record a human decision, and export its evidence. Reviews are saved on this browser; shared institutional governance remains future work.",
  },
];
export function ResolveClient() {
  const resolver = useResolver();
  const [selectedCandidate, setSelectedCandidate] =
    useState<ScoredCandidate | null>(null);
  const [drawerCandidate, setDrawerCandidate] =
    useState<ScoredCandidate | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [guideStep, setGuideStep] = useState(0);
  const [storageWarning, setStorageWarning] = useState(false);
  const [sentCase, setSentCase] = useState<string | null>(null);
  const result = resolver.result;
  const topCandidate = result?.selectedCandidate ?? null;
  useEffect(() => {
    setShowGuide(
      new URLSearchParams(window.location.search).get("demo") === "1",
    );
    const present = () => setShowGuide(true);
    window.addEventListener("material-dna:present", present);
    return () => window.removeEventListener("material-dna:present", present);
  }, []);
  useEffect(() => {
    if (result)
      document
        .getElementById("resolution-results")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [result]);
  function startStep(index: number) {
    setGuideStep(index);
    setShowGuide(true);
    setSelectedCandidate(null);
    if (index < 3) resolver.handleScenario(demoScenarios[index].id);
    document
      .getElementById("resolution-workbench")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  return (
    <div className="space-y-6">
      <p role="status" className="sr-only">
        {resolver.phase === "processing"
          ? "Evaluating material. Please wait."
          : resolver.phase === "complete"
            ? `Resolution complete: ${result?.decision.replaceAll("_", " ")}.`
            : "Ready to resolve a material."}
      </p>
      <PageHeading
        title="Resolve a material"
        description="Find equivalent records. Check critical differences. Keep the evidence."
        action={
          <span className="scope-label">
            <ShieldCheck size={15} aria-hidden="true" /> Human approval required
          </span>
        }
      />
      {showGuide && (
        <section className="demo-guide" aria-label="Guided demonstration">
          <div className="demo-guide-header">
            <strong>
              <Sparkles
                aria-hidden="true"
                size={15}
                className="mr-2 inline text-dna-cyan"
              />
              Your engineering proof, in four steps
            </strong>
            <button
              className="secondary-action"
              onClick={() => setShowGuide(false)}
              aria-label="Close guided demonstration"
            >
              <X aria-hidden="true" size={13} />
            </button>
          </div>
          <p>{GUIDE[guideStep].text}</p>
          <div className="demo-steps">
            {GUIDE.map((step, index) => (
              <button
                key={step.title}
                onClick={() => startStep(index)}
                aria-current={index === guideStep ? "step" : undefined}
              >
                {step.title}
              </button>
            ))}
          </div>
          {guideStep === 3 && (
            <Link href="/review" className="hero-action">
              Open review workspace <ArrowRight aria-hidden="true" size={13} />
            </Link>
          )}
        </section>
      )}
      <div id="resolution-workbench" className="scroll-mt-6">
        <div className="resolve-workbench">
          <section className="workbench-card">
            <div className="workbench-title">
              <div>
                <h2>Material description</h2>
                <p>Paste a description from your material catalogue.</p>
              </div>
              <span className="input-step">01 / Input</span>
            </div>
            <div className="workbench-form">
              <div className="input-modes" aria-label="Resolution mode">
                <button
                  type="button"
                  aria-pressed={!resolver.useReference}
                  onClick={() => resolver.setUseReference(false)}
                >
                  Search reference corpus
                </button>
                <button
                  type="button"
                  aria-pressed={resolver.useReference}
                  onClick={() => resolver.setUseReference(true)}
                >
                  Compare two descriptions
                </button>
              </div>
              <label className="field-label" htmlFor="material-input">
                Material description
                <span>{resolver.description.length} / 2,000</span>
              </label>
              <textarea
                id="material-input"
                aria-label="Material description input"
                className="material-input font-mono"
                rows={3}
                onKeyDown={(event) => {
                  if (
                    (event.ctrlKey || event.metaKey) &&
                    event.key === "Enter" &&
                    resolver.phase !== "processing"
                  ) {
                    event.preventDefault();
                    setSelectedCandidate(null);
                    resolver.handleResolve();
                  }
                }}
                maxLength={2000}
                value={resolver.description}
                onChange={(e) => resolver.setDescription(e.target.value)}
                placeholder="e.g. HEX BOLT M12 X 60 8.8 ZP DIN 931"
              />
              {resolver.useReference && (
                <div className="mt-4">
                  <label className="field-label" htmlFor="reference-input">
                    Reference description
                  </label>
                  <textarea
                    id="reference-input"
                    aria-label="Reference description input"
                    className="material-input font-mono"
                    rows={2}
                    maxLength={2000}
                    value={resolver.referenceDescription}
                    onChange={(e) =>
                      resolver.setReferenceDescription(e.target.value)
                    }
                  />
                </div>
              )}
              <details className="resolution-settings">
                <summary>Matching settings</summary>
                <label className="policy-toggle">
                  <input
                    type="checkbox"
                    checked={resolver.conservative}
                    onChange={(e) => resolver.setConservative(e.target.checked)}
                  />
                  Additional specification checks
                </label>
                <p>
                  Checks pressure, process and other explicit specifications.
                  Turn off to reproduce the submitted engine.
                </p>
                <label className="policy-toggle">
                  <input
                    type="checkbox"
                    checked={resolver.denseRanking}
                    onChange={(e) => resolver.setDenseRanking(e.target.checked)}
                  />
                  Use MiniLM ranking on the server
                </label>
                <p>
                  Optional dense ranking. Model unavailability uses lexical
                  fallback. Example test cases use lexical scoring for a
                  repeatable walkthrough.
                </p>
              </details>
              <div className="workbench-actions">
                <button
                  className="primary-action"
                  onClick={() => {
                    setSelectedCandidate(null);
                    resolver.handleResolve();
                  }}
                  disabled={
                    resolver.phase === "processing" ||
                    !resolver.description.trim()
                  }
                >
                  <Search aria-hidden="true" size={16} />
                  {resolver.phase === "processing"
                    ? "Evaluating engineering evidence…"
                    : "Resolve Material"}
                  <ArrowRight aria-hidden="true" size={13} />
                </button>
                <button
                  className="secondary-action"
                  onClick={() => {
                    resolver.reset();
                    setSelectedCandidate(null);
                  }}
                >
                  <RotateCcw aria-hidden="true" size={12} />
                  Reset
                </button>
                <span className="workbench-hint">
                  <ShieldCheck aria-hidden="true" size={12} />
                  Ctrl / ⌘ + Enter
                </span>
              </div>
              {resolver.error && (
                <p className="mt-3 text-xs text-dna-red" role="alert">
                  {resolver.error}
                </p>
              )}
            </div>
            <div className="input-note">
              <ShieldCheck size={14} aria-hidden="true" /> Resolution recommends
              a relationship. It never changes your material master.
            </div>
          </section>
          <aside className="example-panel" aria-label="Example test cases">
            <div className="example-heading">
              <span>Test the engine</span>
              <span className="scope-label">3 examples</span>
            </div>
            <h2>Start with a known case</h2>
            <p>
              Run an example and inspect why the engine agrees, blocks, or asks
              for review.
            </p>
            <div className="example-list">
              {demoScenarios.map((scenario, index) => (
                <button
                  key={scenario.id}
                  className="example-button"
                  disabled={resolver.phase === "processing"}
                  onClick={() => {
                    setSelectedCandidate(null);
                    resolver.handleScenario(scenario.id);
                  }}
                  aria-label={`Run scenario: ${scenario.title}`}
                >
                  <span className={`example-number example-${index}`}>
                    0{index + 1}
                  </span>
                  <span>
                    <strong>{scenario.title}</strong>
                    <small>
                      {
                        [
                          "Same specifications, different wording",
                          "Similar bolts, incompatible grades",
                          "Incomplete engineering information",
                        ][index]
                      }
                    </small>
                  </span>
                  <ArrowUpRight size={16} aria-hidden="true" />
                </button>
              ))}
            </div>
            <button
              className="walkthrough-button"
              onClick={() => {
                setShowGuide(!showGuide);
              }}
              aria-label="Open suggested demo script"
            >
              <Play size={14} aria-hidden="true" /> Four-step judge walkthrough{" "}
              <ArrowRight size={14} aria-hidden="true" />
            </button>
          </aside>
        </div>
      </div>
      <OverviewStrip />
      {result && (
        <section
          tabIndex={-1}
          id="resolution-results"
          className="result-section space-y-5"
          aria-label="Resolution results"
        >
          {(resolver.description.trim() !== result.input.rawDescription ||
            (resolver.useReference &&
              resolver.referenceDescription.trim() !==
                result.selectedCandidate?.targetRecord.rawDescription) ||
            resolver.conservative !==
              result.engineVersion.includes("review-first-v1")) && (
            <p className="result-notice" role="status">
              Input or matching settings changed. Resolve again to refresh this
              decision.
            </p>
          )}
          <div className="section-label !mb-0">
            <ShieldCheck
              aria-hidden="true"
              size={15}
              className="text-dna-cyan"
            />
            Decision & evidence
            <span>
              {resolver.durationMs} ms · {resolver.context}
            </span>
          </div>
          <p className="ranking-mode">
            Ranking used:{" "}
            {typeof result.selectedCandidate?.scoreDetails
              .embeddingSimilarity === "number"
              ? "MiniLM + lexical signals"
              : "Lexical signals"}
            . Critical engineering constraints govern the recommendation.
          </p>
          <DecisionBanner result={result} />
          <RecordComparison result={result} />
          <IdentityProposal result={result} />
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="primary-action"
              disabled={sentCase === result.caseId}
              onClick={() => {
                resolver.sendToReview();
                setSentCase(result.caseId);
                setStorageWarning(!isWorkspaceStorageHealthy());
              }}
            >
              <Send aria-hidden="true" size={13} />
              {sentCase === result.caseId
                ? "Sent to Review Queue"
                : "Send to Review Queue"}
            </button>
            <button
              className="secondary-action"
              onClick={() =>
                downloadFile(
                  `${result.caseId}-evidence.html`,
                  decisionHtml(result),
                  "text/html",
                )
              }
            >
              <Download aria-hidden="true" size={13} />
              Export decision report
            </button>
            <button
              className="secondary-action"
              onClick={() =>
                downloadFile(
                  `${result.caseId}-evidence.json`,
                  JSON.stringify(resolutionEvidence(result), null, 2),
                )
              }
            >
              <FileJson aria-hidden="true" size={13} />
              Evidence JSON
            </button>
            {sentCase === result.caseId && (
              <Link className="hero-action !mt-0" href="/review">
                Review this case <ArrowRight aria-hidden="true" size={12} />
              </Link>
            )}
          </div>
          {storageWarning && (
            <p
              role="alert"
              className="rounded-lg border border-dna-amber/30 bg-dna-amber/5 p-3 text-xs text-dna-amber"
            >
              The case is in the review queue, but browser storage is
              unavailable. Export your evidence before leaving or refreshing.
            </p>
          )}
          {result.decision === "DO_NOT_MERGE" && topCandidate && (
            <SimilarityWarning
              similarity={topCandidate.similarityScore}
              score={topCandidate.scoreDetails}
              constraint={topCandidate.criticalConflicts[0] ?? null}
            />
          )}
          <div className="grid gap-5 xl:grid-cols-2">
            <MaterialDNAProfile dna={result.dna} />
            <ExplanationPanel result={result} />
          </div>
          <CandidateTable
            candidates={result.candidates.slice(0, 5)}
            selectedId={topCandidate?.targetRecord.sourceCode ?? null}
            onSelect={setSelectedCandidate}
            onInspect={setDrawerCandidate}
          />
          {selectedCandidate && (
            <ExplanationPanel
              result={result}
              candidate={selectedCandidate}
              compact
            />
          )}
          <CounterfactualPanel resolver={resolver} />
          <AuditTimeline
            events={result.auditEvents}
            versions={{
              engine: result.engineVersion,
              parser: result.parserVersion,
              constraints: result.constraintVersion,
            }}
          />
        </section>
      )}
      <details className="pipeline-disclosure">
        <summary>
          How the decision is made{" "}
          <span>Five stages · inspectable evidence at every step</span>
        </summary>
        <ol>
          {[
            "Normalize descriptions",
            "Extract material DNA",
            "Retrieve candidates",
            "Apply critical constraints",
            "Propose a code & audit trail",
          ].map((stage, index) => (
            <li key={stage}>
              <span>0{index + 1}</span>
              {stage}
            </li>
          ))}
        </ol>
      </details>
      <div className="trust-row">
        <Link href="/graph">
          <GitBranch aria-hidden="true" size={19} />
          <div>
            <strong>Identity, with lineage</strong>
            <p>
              Follow source codes into proposed identities. Inspect links the
              constraints refuse.
            </p>
          </div>
        </Link>
        <Link href="/research">
          <FlaskConical aria-hidden="true" size={19} />
          <div>
            <strong>Evidence you can interrogate</strong>
            <p>
              See the submitted benchmark, its abstentions, and the errors still
              to solve.
            </p>
          </div>
        </Link>
        <Link href="/review">
          <ShieldCheck aria-hidden="true" size={19} />
          <div>
            <strong>A human stays in control</strong>
            <p>
              Approve, reject, or challenge a recommendation with a recorded
              engineering note.
            </p>
          </div>
        </Link>
      </div>
      <DiscoveryDrawer
        candidate={drawerCandidate}
        onClose={() => setDrawerCandidate(null)}
      />
    </div>
  );
}
