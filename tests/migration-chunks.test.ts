import { expect, it } from "vitest";
import { resolveInChunks } from "@/lib/migration/client";
const rows = Array.from({ length: 53 }, (_, i) => ({
  rowId: `r${i}`,
  description: "Bolt",
}));
const versions = { engine: "review-first-v1", parser: "v1", constraints: "v1" };
it("resolves bounded chunks sequentially and reports actual completed rows", async () => {
  const sizes: number[] = [],
    progress: number[] = [];
  const result = await resolveInChunks(
    rows,
    async (chunk) => {
      sizes.push(chunk.length);
      return {
        results: chunk.map((c) => ({
          rowId: c.rowId,
          decision: "REVIEW",
          reason: "Unknown",
          risk: "HIGH",
          confidence: 0,
          candidateCode: null,
        })),
        versions,
      };
    },
    (n) => progress.push(n),
  );
  expect(sizes).toEqual([25, 25, 3]);
  expect(progress).toEqual([25, 50, 53]);
  expect(result.results).toHaveLength(53);
});
it("rejects missing rows instead of committing an incomplete resolution", async () => {
  await expect(
    resolveInChunks(
      rows,
      async () => ({ results: [], versions }),
      () => {},
    ),
  ).rejects.toThrow("incomplete chunk");
});
