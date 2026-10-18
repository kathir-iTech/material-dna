import { afterEach, beforeEach, expect, it, vi } from "vitest";
const { pipelineMock } = vi.hoisted(() => ({ pipelineMock: vi.fn() }));
vi.mock("@xenova/transformers", () => ({
  env: {},
  pipeline: pipelineMock,
}));
import {
  createEmbeddingSignal,
  __resetEmbeddingsForTests,
} from "@/lib/material-dna/matching/embeddings";
beforeEach(() => {
  pipelineMock.mockImplementation(() => new Promise(() => {}));
});
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
it("also returns lexical fallback when inference stalls after the model loads", async () => {
  pipelineMock.mockResolvedValue(() => new Promise(() => {}));
  vi.useFakeTimers();
  const pending = createEmbeddingSignal(["SS304 pipe"], { budgetMs: 25 });
  await vi.advanceTimersByTimeAsync(30);
  expect(await pending).toBeNull();
});
