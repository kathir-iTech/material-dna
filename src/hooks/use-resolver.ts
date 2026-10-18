"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  CounterfactualChange,
  CounterfactualResult,
  ExtractionStep,
  ResolutionResult,
} from "@/types/domain";
import { applyCounterfactual, buildInputRecord } from "@/lib/material-dna/demo";
import { materialRecords, demoScenarios } from "@/data/demo";
import {
  buildReviewCase,
  reviewQueueStore,
  useReviewQueue,
} from "@/hooks/use-review-queue";
import { resolveWithReviewPolicy } from "@/lib/material-dna/matching/review-first";

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

export function useResolver() {
  const [description, setDescription] = useState<string>(
    demoScenarios[0].input,
  );
  const [phase, setPhase] = useState<"idle" | "processing" | "complete">(
    "idle",
  );
  const [steps, setSteps] = useState<ExtractionStep[]>(() =>
    STEPS.map((s) => ({ ...s, status: "pending" as const })),
  );
  const [result, setResult] = useState<ResolutionResult | null>(null);
  const [counterfactual, setCounterfactual] =
    useState<CounterfactualResult | null>(null);
  // Shared with the Review page via use-review-queue — not a private copy.
  const reviewQueue = useReviewQueue();
  const generation = useRef(0);
  const [referenceDescription, setReferenceDescription] = useState(
    "HEX BOLT M12 X 60 CLASS 10.9 ZP DIN 931",
  );
  const [useReference, setUseReference] = useState(false);
  const [conservative, setConservative] = useState(true);
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [context, setContext] = useState("");
  useEffect(
    () => () => {
      generation.current++;
    },
    [],
  );

  const runResolution = useCallback(
    async (inputText: string, scenario?: (typeof demoScenarios)[number]) => {
      const run = ++generation.current;
      setError(null);
      if (!inputText.trim() || inputText.length > 2000) {
        setError("Enter a material description of 1–2,000 characters.");
        return;
      }
      if (
        !scenario &&
        useReference &&
        (!referenceDescription.trim() || referenceDescription.length > 2000)
      ) {
        setError("Enter a reference description of 1–2,000 characters.");
        return;
      }
      setCounterfactual(null);
      setPhase("processing");
      setResult(null);
      setDurationMs(null);
      setSteps(
        STEPS.map((step, i) => ({
          ...step,
          status: i === 0 ? "active" : "pending",
        })),
      );
      await new Promise<void>((done) =>
        window.requestAnimationFrame(() => done()),
      );
      await new Promise<void>((done) =>
        window.requestAnimationFrame(() => done()),
      );
      if (generation.current !== run) return;
      const started = performance.now();
      try {
        const input = buildInputRecord(inputText);
        let corpus = materialRecords;
        if (!scenario && useReference) {
          const ref = buildInputRecord(referenceDescription);
          corpus = [
            {
              ...ref,
              id: `REFERENCE-${ref.id}`,
              sourceCode: "REFERENCE-001",
              source: "Reference",
            },
          ];
        } else if (scenario?.corpusFilter) {
          const f = scenario.corpusFilter;
          corpus = materialRecords.filter(
            (r) =>
              (!f.grade || f.grade.includes(r.dna.grade.value ?? "")) &&
              (!f.excludeSourceCodes ||
                !f.excludeSourceCodes.includes(r.sourceCode)),
          );
        }
        const computed = resolveWithReviewPolicy(
          input,
          corpus,
          null,
          conservative,
        );
        if (generation.current !== run) return;
        setContext(
          scenario
            ? `${scenario.title} · ${corpus.length} reference records${scenario.corpusFilter ? " · scenario-specific candidate filter" : ""}`
            : useReference
              ? "Direct comparison · your reference description"
              : `Full reference corpus · ${corpus.length} records`,
        );
        setDurationMs(Math.max(1, Math.round(performance.now() - started)));
        setSteps(STEPS.map((step) => ({ ...step, status: "complete" })));
        setResult(computed);
        setPhase("complete");
      } catch {
        setError(
          "Unable to resolve this description. Check the input and try again.",
        );
        setPhase("idle");
      }
    },
    [referenceDescription, useReference, conservative],
  );

  const handleResolve = useCallback(() => {
    void runResolution(description.trim());
  }, [description, runResolution]);
  const handleScenario = useCallback(
    (scenarioId: string) => {
      const scenario =
        demoScenarios.find((item) => item.id === scenarioId) ??
        demoScenarios[0];
      setDescription(scenario.input);
      setUseReference(false);
      void runResolution(scenario.input, scenario);
    },
    [runResolution],
  );
  const reset = useCallback(() => {
    generation.current++;
    setPhase("idle");
    setResult(null);
    setCounterfactual(null);
    setError(null);
    setDurationMs(null);
    setSteps(STEPS.map((step) => ({ ...step, status: "pending" })));
  }, []);

  const sendToReview = useCallback(() => {
    if (!result) return;
    reviewQueueStore.enqueue(buildReviewCase(result));
  }, [result]);

  const dispatchReview = useCallback(
    (
      id: string,
      action: "APPROVED" | "REJECTED" | "OVERRIDDEN",
      note?: string,
    ) => {
      reviewQueueStore.dispatch(id, action, note);
    },
    [],
  );

  const runCounterfactual = useCallback(
    (change: CounterfactualChange) => {
      if (!result) return;
      const candidate = result.selectedCandidate?.targetRecord;
      if (!candidate) return;

      const { left, right, constraintsActivated } = applyCounterfactual(
        result.input,
        candidate,
        change,
      );
      const after = resolveWithReviewPolicy(left, [right], null, conservative);
      setCounterfactual({
        before: result,
        after,
        changed: true,
        constraintsActivated,
        beforeDecision: result.decision,
        afterDecision: after.decision,
      });
    },
    [result, conservative],
  );

  return useMemo(
    () => ({
      referenceDescription,
      setReferenceDescription,
      useReference,
      setUseReference,
      conservative,
      setConservative,
      durationMs,
      error,
      context,
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
      referenceDescription,
      useReference,
      conservative,
      durationMs,
      error,
      context,
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
    ],
  );
}
