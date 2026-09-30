"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type {
  CounterfactualChange,
  CounterfactualResult,
  ExtractionStep,
  ResolutionResult,
} from "@/types/domain";
import { buildInputRecord, resolveMaterialRecord } from "@/lib/material-dna/demo";
import { materialRecords, demoScenarios } from "@/data/demo";
import { buildReviewCase, reviewQueueStore, useReviewQueue } from "@/hooks/use-review-queue";
import { evaluateConstraints } from "@/lib/material-dna/constraints";

const STEPS: Omit<ExtractionStep, "status">[] = [
  { index: 1, label: "Parsing material description" },
  { index: 2, label: "Extracting engineering attributes" },
  { index: 3, label: "Normalizing units and terminology" },
  { index: 4, label: "Generating candidate materials" },
  { index: 5, label: "Comparing engineering attributes" },
  { index: 6, label: "Applying critical constraints" },
  { index: 7, label: "Producing decision" },
  { index: 8, label: "Building evidence trail" },
];

const DURATION_PER_STEP = 140;
const DURATION_FINAL = 400;

export function useResolver() {
  const [description, setDescription] = useState<string>(demoScenarios[0].input);
  const [phase, setPhase] = useState<"idle" | "processing" | "complete">("idle");
  const [steps, setSteps] = useState<ExtractionStep[]>(() =>
    STEPS.map((s) => ({ ...s, status: "pending" as const }))
  );
  const [result, setResult] = useState<ResolutionResult | null>(null);
  const [counterfactual, setCounterfactual] = useState<CounterfactualResult | null>(null);
  // Shared with the Review page via use-review-queue — not a private copy.
  const reviewQueue = useReviewQueue();
  const timersRef = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current = [];
  }, []);

  const runResolution = useCallback(
    (inputText: string, scenario?: (typeof demoScenarios)[number]) => {
      clearTimers();
      setCounterfactual(null);
      setPhase("processing");
      setSteps(STEPS.map((s) => ({ ...s, status: "pending" as const })));

      const input = buildInputRecord(inputText);
      let corpus = materialRecords;
      if (scenario?.corpusFilter) {
        const f = scenario.corpusFilter;
        corpus = materialRecords.filter((r) => {
          if (f.grade && !f.grade.includes(r.dna.grade.value ?? "")) return false;
          if (f.excludeSourceCodes && f.excludeSourceCodes.includes(r.sourceCode)) return false;
          return true;
        });
      }
      const computed = resolveMaterialRecord(input, corpus);
      const totalSteps = STEPS.length;

      STEPS.forEach((step, idx) => {
        const activateAt = (idx / totalSteps) * 1100;
        const id = window.setTimeout(() => {
          setSteps((prev) =>
            prev.map((p) => (p.index === step.index ? { ...p, status: "active" } : p))
          );
        }, activateAt);

        const completeAt = activateAt + 160;
        const id2 = window.setTimeout(() => {
          setSteps((prev) =>
            prev.map((p) =>
              p.index === step.index ? { ...p, status: "complete" } : p
            )
          );
        }, completeAt);

        timersRef.current.push(id, id2);
      });

      const doneAt = 1100 + DURATION_PER_STEP * 2 + DURATION_FINAL;
      const id = window.setTimeout(() => {
        setResult(computed);
        setPhase("complete");
      }, doneAt);

      timersRef.current.push(id);
    },
    [clearTimers]
  );

  const handleResolve = useCallback(() => {
    const trimmed = description.trim();
    if (!trimmed) return;
    runResolution(trimmed);
  }, [description, runResolution]);

  const handleScenario = useCallback(
    (scenarioId: string) => {
      const scenario = demoScenarios.find((s) => s.id === scenarioId) ?? demoScenarios[0];
      setDescription(scenario.input);
      runResolution(scenario.input, scenario);
    },
    [runResolution]
  );

  const reset = useCallback(() => {
    clearTimers();
    setPhase("idle");
    setResult(null);
    setCounterfactual(null);
    setSteps(STEPS.map((s) => ({ ...s, status: "pending" as const })));
  }, [clearTimers]);

  const sendToReview = useCallback(() => {
    if (!result) return;
    reviewQueueStore.enqueue(buildReviewCase(result));
  }, [result]);

  const dispatchReview = useCallback(
    (id: string, action: "APPROVED" | "REJECTED" | "OVERRIDDEN", note?: string) => {
      reviewQueueStore.dispatch(id, action, note);
    },
    []
  );

  const runCounterfactual = useCallback(
    (change: CounterfactualChange) => {
      if (!result) return;
      const candidate = result.selectedCandidate?.targetRecord;
      if (!candidate) return;

      const { left, right, constraintsActivated } = applyChange(
        result,
        change
      );
      const corpus = materialRecords.map((r) =>
        r.id === right.id ? right : r
      );
      const after = resolveMaterialRecord(left, corpus);
      setCounterfactual({
        before: result,
        after,
        changed: true,
        constraintsActivated,
        beforeDecision: result.decision,
        afterDecision: after.decision,
      });
    },
    [result]
  );

  return useMemo(
    () => ({
      description,
      setDescription,
      phase,
      steps,
      result,
      counterfactual,
      reviewQueue,
      handleResolve,
      handleScenario,
      reset,
      sendToReview,
      dispatchReview,
      runCounterfactual,
    }),
    [
      description,
      phase,
      steps,
      result,
      counterfactual,
      reviewQueue,
      handleResolve,
      handleScenario,
      reset,
      sendToReview,
      dispatchReview,
      runCounterfactual,
    ]
  );
}

function applyChange(
  result: ResolutionResult,
  change: CounterfactualChange
): { left: ReturnType<typeof buildInputRecord>; right: ReturnType<typeof buildInputRecord>; constraintsActivated: string[] } {
  // Rebuild DNA for each side with the mutation applied only to the candidate side.
  const candidate = result.selectedCandidate?.targetRecord;
  if (!candidate) {
    return { left: buildInputRecord(result.input.rawDescription), right: buildInputRecord(result.input.rawDescription), constraintsActivated: [] };
  }
  const input = buildInputRecord(result.input.rawDescription);
  const key = change.attribute as keyof ReturnType<typeof buildInputRecord>["dna"];
  const attrBase = candidate.dna[key] as { value: unknown };
  const right = {
    ...candidate,
    dna: {
      ...candidate.dna,
      [key]: {
        ...attrBase,
        value:
          key === "dimensions" || key === "standard" || key === "electrical"
            ? [change.modified]
            : change.modified,
      },
    } as ReturnType<typeof buildInputRecord>["dna"],
  };
  const constraints = evaluateConstraints(input.dna, right.dna);
  const activated = constraints
    .filter((c) => c.status === "CONFLICT" && c.severity === "CRITICAL")
    .map((c) => c.rule);
  return { left: input, right, constraintsActivated: activated };
}