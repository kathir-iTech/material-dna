import { afterEach, expect, it, vi } from "vitest";
vi.mock("@xenova/transformers", () => ({
  env: {},
  pipeline: () => new Promise(() => {}),
}));
import {
  createEmbeddingSignal,
  __resetEmbeddingsForTests,
} from "@/lib/material-dna/matching/embeddings";
afterEach(() => {
  vi.useRealTimers();
  __resetEmbeddingsForTests();
});
it("returns lexical fallback when cold model loading exceeds the entire request budget", async () => {
  vi.useFakeTimers();
  const pending = createEmbeddingSignal(["SS304 pipe"], { budgetMs: 25 });
  await vi.advanceTimersByTimeAsync(30);
  expect(await pending).toBeNull();
});
