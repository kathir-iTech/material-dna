"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  CounterfactualChange,
  CounterfactualResult,
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

export function useResolver() {
  const [description, setDescription] = useState<string>(
    demoScenarios[0].input,
  );
  const [phase, setPhase] = useState<"idle" | "processing" | "complete">(
    "idle",
  );
  const [result, setResult] = useState<ResolutionResult | null>(null);
  const [counterfactual, setCounterfactual] =
    useState<CounterfactualResult | null>(null);
  // Shared with the Review page via use-review-queue — not a private copy.
  const reviewQueue = useReviewQueue();
  const generation = useRef(0);
  const requestController = useRef<AbortController | null>(null);
  const [referenceDescription, setReferenceDescription] = useState(
    "HEX BOLT M12 X 60 CLASS 10.9 ZP DIN 931",
  );
  const [useReference, setUseReference] = useState(false);
  const [conservative, setConservative] = useState(true);
  const [denseRanking, setDenseRanking] = useState(false);
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [context, setContext] = useState("");
  useEffect(
    () => () => {
      generation.current++;
      requestController.current?.abort();
    },
    [],
  );

  const runResolution = useCallback(
    async (inputText: string, scenario?: (typeof demoScenarios)[number]) => {
      const run = ++generation.current;
      requestController.current?.abort();
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
        let computed: ResolutionResult;
        if (denseRanking && !scenario) {
          const controller = new AbortController();
          requestController.current = controller;
          const timeout = window.setTimeout(() => controller.abort(), 25000);
          try {
            const response = await fetch("/api/resolve", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              signal: controller.signal,
              body: JSON.stringify({
                description: inputText,
                ...(useReference ? { referenceDescription } : {}),
                policy: conservative ? "review-first" : "submitted",
                embeddings: true,
              }),
            });
            if (!response.ok)
              throw new Error("The server could not resolve this description.");
            computed = await response.json();
          } finally {
            window.clearTimeout(timeout);
            if (requestController.current === controller)
              requestController.current = null;
          }
        } else {
          computed = resolveWithReviewPolicy(input, corpus, null, conservative);
        }
        if (generation.current !== run) return;
        setContext(
          scenario
            ? `${scenario.title} · ${corpus.length} reference records${scenario.corpusFilter ? " · scenario-specific candidate filter" : ""}`
            : useReference
              ? "Direct comparison · your reference description"
              : `Full reference corpus · ${corpus.length} records`,
        );
        setDurationMs(Math.max(1, Math.round(performance.now() - started)));
        setResult(computed);
        setPhase("complete");
      } catch {
        if (generation.current !== run) return;
        setError(
          "Unable to complete resolution. Check the connection or turn off MiniLM ranking and try again.",
        );
        setPhase("idle");
      }
    },
    [referenceDescription, useReference, conservative, denseRanking],
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
    requestController.current?.abort();
    setPhase("idle");
    setResult(null);
    setCounterfactual(null);
    setError(null);
    setDurationMs(null);
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
      denseRanking,
      setDenseRanking,
      durationMs,
      error,
      context,
      description,
      setDescription,
      phase,
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
      denseRanking,
      durationMs,
      error,
      context,
      description,
      phase,
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
