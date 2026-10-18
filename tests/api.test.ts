import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
vi.mock("@/lib/material-dna/matching/embeddings", () => ({
  createEmbeddingSignal: async () => null,
  corpusTexts: () => [],
}));
import { POST as resolve } from "@/app/api/resolve/route";
import { POST as batch } from "@/app/api/resolve-batch/route";
const request = (body: unknown) =>
  new NextRequest("http://localhost/api/resolve", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
describe("resolution API contract", () => {
  it("supports direct comparison, explicit policy selection and lexical provenance", async () => {
    const data = {
      description: "Butterfly valve 150mm wafer type EPDM seat",
      referenceDescription: "Butterfly valve 150mm lug type EPDM seat",
      embeddings: false,
    };
    const screened = await resolve(request(data));
    expect(screened.status).toBe(200);
    expect((await screened.json()).decision).toBe("DO_NOT_MERGE");
    const submitted = await resolve(request({ ...data, policy: "submitted" }));
    expect((await submitted.json()).decision).toBe("MATCH");
  });
  it("rejects malformed JSON and invalid references as client errors", async () => {
    for (const route of [resolve, batch])
      expect(
        (
          await route(
            new NextRequest("http://localhost", { method: "POST", body: "{" }),
          )
        ).status,
      ).toBe(400);
    expect(
      (
        await resolve(
          request({ description: "BOLT", referenceDescription: 123 }),
        )
      ).status,
    ).toBe(400);
  });
  it("bounds CPU work per request and reports the actual ranking mode", async () => {
    expect(
      (
        await batch(
          request({
            rows: Array.from({ length: 26 }, () => ({ description: "BOLT" })),
          }),
        )
      ).status,
    ).toBe(400);
    const res = await batch(
      request({
        rows: [
          { rowId: "r1", description: "HEX BOLT M12 X 60 8.8 ZP DIN 931" },
        ],
        embeddings: false,
      }),
    );
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.results[0].rowId).toBe("r1");
    expect(data.versions.engine).toContain("lexical-ranking");
  });
});
