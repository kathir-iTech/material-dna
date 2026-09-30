import { beforeEach, describe, expect, it } from "vitest";
import { buildReviewCase, reviewQueueStore } from "@/hooks/use-review-queue";
import { materialRecords, seededReviewCases } from "@/data/demo";
import { buildInputRecord, resolveMaterialRecord } from "@/lib/material-dna/demo";

// B1 regression: Resolve and the Review page must share ONE store.
// Before the fix, Resolve wrote to a private useState and the Review page
// independently rendered seededReviewCases, so sent cases were invisible.

const SEND_INPUTS = [
  "HEX BOLT M12 X 60 8.8 ZP DIN 931",
  "SS304 STAINLESS STEEL PIPE 50MM OD X 3MM WALL",
  "BALL VALVE 1/2 INCH SS304 FULL PORT BLOWOUT PROOF",
];

function sendFromResolve(input: string) {
  const result = resolveMaterialRecord(buildInputRecord(input), materialRecords);
  reviewQueueStore.enqueue(buildReviewCase(result));
}

describe("B1: shared review queue store", () => {
  beforeEach(() => {
    reviewQueueStore.reset();
  });

  it("starts with the seeded demo cases (before anything is sent)", () => {
    expect(reviewQueueStore.getSnapshot()).toEqual(seededReviewCases);
    expect(reviewQueueStore.getSnapshot()).toHaveLength(5);
  });

  it("sending 3 cases from Resolve shows exactly those 3 (seeded placeholders replaced)", () => {
    SEND_INPUTS.forEach(sendFromResolve);

    const queue = reviewQueueStore.getSnapshot();
    const seededIds = seededReviewCases.map((c) => c.id);

    expect(queue).toHaveLength(3);
    // Newest first (prepended), but exactly the 3 sent inputs.
    expect(queue.map((c) => c.materialA.rawDescription)).toEqual([...SEND_INPUTS].reverse());
    expect(queue.every((c) => !seededIds.includes(c.id))).toBe(true);
    expect(queue.every((c) => c.status === "PENDING")).toBe(true);
    expect(new Set(queue.map((c) => c.id)).size).toBe(3);
  });

  it("a later send prepends without dropping earlier sent cases", () => {
    SEND_INPUTS.forEach(sendFromResolve);
    sendFromResolve("MS PLATE 12MM HOT ROLLED IS 2062");

    const queue = reviewQueueStore.getSnapshot();
    expect(queue).toHaveLength(4);
    expect(queue[0].materialA.rawDescription).toBe("MS PLATE 12MM HOT ROLLED IS 2062");
  });

  it("dispatch from the Review page mutates the same shared store", () => {
    SEND_INPUTS.forEach(sendFromResolve);
    const target = reviewQueueStore.getSnapshot()[0].id;

    reviewQueueStore.dispatch(target, "APPROVED");
    expect(reviewQueueStore.getSnapshot()[0].status).toBe("APPROVED");
    expect(reviewQueueStore.getSnapshot()[0].reviewerDecisionAt).toBeTruthy();

    reviewQueueStore.reset();
    reviewQueueStore.enqueue(
      buildReviewCase(resolveMaterialRecord(buildInputRecord(SEND_INPUTS[0]), materialRecords))
    );
    const id = reviewQueueStore.getSnapshot()[0].id;
    reviewQueueStore.dispatch(id, "OVERRIDDEN", "Confirmed by engineering.");
    expect(reviewQueueStore.getSnapshot()[0].status).toBe("OVERRIDDEN");
    expect(reviewQueueStore.getSnapshot()[0].reviewerNote).toBe("Confirmed by engineering.");
  });

  it("server snapshot stays the seeded array for hydration parity", () => {
    expect(reviewQueueStore.getServerSnapshot()).toBe(seededReviewCases);
    expect(reviewQueueStore.getSnapshot()).toBe(seededReviewCases);
  });
});
