"use client";

import { useSyncExternalStore } from "react";
import type { ResolutionResult, ReviewCase } from "@/types/domain";
import { seededReviewCases } from "@/data/demo";
import { buildInputRecord } from "@/lib/material-dna/demo";

// ---------------------------------------------------------------------------
// Single source of truth for the human review queue.
//
// Resolve (use-resolver) and the Review page (review-client) both read/write
// THIS store instead of each keeping a private copy of the seeded demo cases.
// Seeded cases are placeholders: the first case actually sent from Resolve
// replaces them, so after sending N cases the queue shows exactly those N.
// ---------------------------------------------------------------------------

let cases: ReviewCase[] = seededReviewCases;
let seededReplaced = false;
let nextReviewSeq = 2000;
const listeners = new Set<() => void>();

function emit(): void {
  for (const l of listeners) l();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): ReviewCase[] {
  return cases;
}

function getServerSnapshot(): ReviewCase[] {
  return seededReviewCases;
}

export const reviewQueueStore = {
  subscribe,
  getSnapshot,
  getServerSnapshot,

  /** First real case drops the seeded placeholders; later cases prepend. */
  enqueue(reviewCase: ReviewCase): void {
    cases = seededReplaced ? [reviewCase, ...cases] : [reviewCase];
    seededReplaced = true;
    emit();
  },

  dispatch(id: string, action: "APPROVED" | "REJECTED" | "OVERRIDDEN", note?: string): void {
    cases = cases.map((c) =>
      c.id === id
        ? {
            ...c,
            status: action,
            reviewerNote: note && note.trim().length > 0 ? note : c.reviewerNote,
            reviewerDecisionAt: new Date().toISOString(),
          }
        : c
    );
    emit();
  },

  /** Restore the seeded demo state (used by tests). */
  reset(): void {
    cases = seededReviewCases;
    seededReplaced = false;
    nextReviewSeq = 2000;
    emit();
  },
};

/** Build the review case a "Send to Review Queue" click produces. */
export function buildReviewCase(result: ResolutionResult): ReviewCase {
  const input = buildInputRecord(result.input.rawDescription);
  const candidate = result.selectedCandidate?.targetRecord ?? null;
  return {
    id: `REVIEW-${nextReviewSeq++}`,
    materialA: input,
    materialB: candidate ?? input,
    risk: result.risk,
    systemRecommendation: result.decision,
    reason: result.reason,
    status: "PENDING",
    confidence: result.evidenceCoverage,
    createdAt: new Date().toISOString(),
  };
}

/** Shared queue state for any component (Resolve, Review, future consumers). */
export function useReviewQueue(): ReviewCase[] {
  return useSyncExternalStore(
    reviewQueueStore.subscribe,
    reviewQueueStore.getSnapshot,
    reviewQueueStore.getServerSnapshot
  );
}
