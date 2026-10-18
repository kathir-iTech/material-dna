"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  Check,
  ClipboardList,
  Download,
  FileJson,
  Fingerprint,
  FlaskConical,
  GitBranch,
  Layers3,
  Play,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { demoScenarios } from "@/data/demo";
import { useResolver } from "@/hooks/use-resolver";
import { Badge } from "@/components/ui/badge";
import { MaterialDNAProfile } from "@/components/material-dna-profile";
import { CandidateTable } from "./candidate-table";
import { ExplanationPanel } from "./explanation-panel";
import { SimilarityWarning } from "./similarity-warning";
import { CounterfactualPanel } from "./counterfactual-panel";
import { AuditTimeline } from "./audit-timeline";
import { OverviewStrip } from "./overview-strip";
import { DecisionBanner } from "./decision-banner";
import { DiscoveryDrawer } from "./discovery-drawer";
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
      <div className="resolve-heading">
        <div>
          <div className="page-eyebrow">Engineering identity / Resolve</div>
          <h1>
            Material intelligence<span className="text-dna-cyan">.</span>
          </h1>
          <p>Different descriptions. One identity. Every decision explained.</p>
        </div>
        <span className="version-chip">
          <span className="status-dot" />
          Prototype workspace
        </span>
      </div>
      <section
        className="resolve-hero"
        aria-label="Engineering-aware matching introduction"
      >
        <div className="hero-copy">
          <div className="hero-kicker">
            <Fingerprint aria-hidden="true" size={13} />
            Engineering before similarity
          </div>
          <h2>
            Find the same material.
            <br />
            <em>Stop the wrong merge.</em>
          </h2>
          <p>
            Turn fragmented descriptions into structured material DNA. Surface
            the evidence. Keep critical differences apart.
          </p>
          <button className="hero-action" onClick={() => startStep(0)}>
            Explore the 90-second walkthrough{" "}
            <ArrowRight aria-hidden="true" size={14} />
          </button>
        </div>
        <div
          className="hero-visual"
          aria-label="Example: grade 8.8 and 10.9 bolts must remain separate"
        >
          <div className="material-mini">
            <span className="mini-label">SOURCE A / EXAMPLE</span>
            <strong>HEX BOLT</strong>
            <code>M12 × 60 · DIN 931</code>
            <div className="mini-grade">8.8</div>
            <span className="mini-tag">Property class</span>
          </div>
          <div className="veto-link">
            <span>
              <ShieldCheck aria-hidden="true" size={21} />
            </span>
            <small>MERGE BLOCKED</small>
          </div>
          <div className="material-mini">
            <span className="mini-label">SOURCE B / EXAMPLE</span>
            <strong>HEX BOLT</strong>
            <code>M12 × 60 · DIN 931</code>
            <div className="mini-grade">10.9</div>
            <span className="mini-tag">Different property class</span>
          </div>
        </div>
      </section>
      <OverviewStrip />
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
        <div className="section-label">
          <Layers3 aria-hidden="true" size={15} className="text-dna-cyan" />
          Resolution workbench
          <span>From description to defensible decision</span>
        </div>
        <div className="resolve-workbench">
          <section className="workbench-card">
            <div className="workbench-title">
              <div>
                <h2>What material are you looking at?</h2>
                <p>
                  Resolve against the reference corpus, or compare two
                  descriptions directly.
                </p>
              </div>
              <Badge tone="cyan">CPU · deterministic</Badge>
            </div>
            <div className="workbench-form">
              <label className="field-label" htmlFor="material-input">
                Material description
                <span>{resolver.description.length} / 2,000</span>
              </label>
              <textarea
                id="material-input"
                aria-label="Material description input"
                className="material-input font-mono"
                rows={3}
                maxLength={2000}
                value={resolver.description}
                onChange={(e) => resolver.setDescription(e.target.value)}
                placeholder="e.g. HEX BOLT M12 X 60 8.8 ZP DIN 931"
              />
              <button
                className="hero-action !mt-2 !text-[10px]"
                onClick={() => resolver.setUseReference(!resolver.useReference)}
                aria-pressed={resolver.useReference}
              >
                {resolver.useReference
                  ? "Use the reference corpus instead"
                  : "Compare two descriptions"}
                <ArrowDown aria-hidden="true" size={12} />
              </button>
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
              <label className="policy-toggle">
                <input
                  type="checkbox"
                  checked={resolver.conservative}
                  onChange={(e) => resolver.setConservative(e.target.checked)}
                />
                Additional specification checks{" "}
                <span className="text-dna-faint">· review-first-v1</span>
              </label>
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
                  <Sparkles aria-hidden="true" size={14} />
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
                  Human approval required
                </span>
              </div>
              {resolver.error && (
                <p className="mt-3 text-xs text-dna-red" role="alert">
                  {resolver.error}
                </p>
              )}
            </div>
            <div className="scenario-strip">
              {demoScenarios.map((scenario) => (
                <button
                  key={scenario.id}
                  className="scenario-button"
                  disabled={resolver.phase === "processing"}
                  onClick={() => {
                    setSelectedCandidate(null);
                    resolver.handleScenario(scenario.id);
                  }}
                  aria-label={`Run scenario: ${scenario.title}`}
                >
                  <span className="scenario-dot" />
                  {scenario.title}
                  <Play aria-hidden="true" size={9} />
                </button>
              ))}
              <button
                className="scenario-button ml-auto"
                onClick={() => setShowGuide(!showGuide)}
                aria-label="Open suggested demo script"
              >
                <ClipboardList aria-hidden="true" size={11} />
                Demo guide
              </button>
            </div>
          </section>
          <aside className="evidence-aside">
            <h3>
              <GitBranch
                aria-hidden="true"
                size={14}
                className="text-dna-cyan"
              />
              Inside the decision
            </h3>
            {[
              ["Normalize", "Units, terms & abbreviations"],
              ["Extract DNA", "Engineering attributes"],
              ["Retrieve", "Find candidate records"],
              ["Apply constraints", "Critical conflicts veto a merge"],
              ["Explain & review", "Evidence for a human decision"],
            ].map(([title, detail], i) => (
              <div className="pipeline-step" key={title}>
                <span className="pipeline-number">0{i + 1}</span>
                <div>
                  <strong>{title}</strong>
                  <small>{detail}</small>
                </div>
              </div>
            ))}
            <p className="pipeline-footnote">
              <Check aria-hidden="true" size={12} />
              Similarity ranks. Constraints govern.
            </p>
          </aside>
        </div>
      </div>
      {result && (
        <section
          id="resolution-results"
          className="result-section space-y-5"
          aria-label="Resolution results"
        >
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
          <DecisionBanner result={result} />
          <RecordComparison result={result} />
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
