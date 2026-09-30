import { describe, expect, it } from "vitest";
import {
  generateCandidates,
  semanticSimilarity,
  type EmbeddingSignal,
} from "@/lib/material-dna/matching";
import { buildInputRecord, resolveMaterialRecord } from "@/lib/material-dna/demo";
import { createEmbeddingSignal } from "@/lib/material-dna/matching/embeddings";

// The exact pair from the PoC: raw transformers.js cosine ranks this pair at
// 0.93 (reproduced with Xenova/all-MiniLM-L6-v2 over the 200-pair benchmark —
// grade-conflicting pairs sit in the top decile of all cosines). The signal
// must never turn that into a match: the veto owns that decision.
const SS304 = "SS304 stainless steel pipe 50mm OD x 3mm wall";
const SS316L = "SS316L stainless steel pipe 50mm OD x 3mm wall";

const input = () => buildInputRecord(SS304);
const ss316lCandidate = () => buildInputRecord(SS316L);

describe("embedding signal — ranking only, veto owns the decision", () => {
  it("adversarial signal (cosine 100 on every pair) still yields DO_NOT_MERGE", () => {
    const bomb: EmbeddingSignal = () => 100;
    const res = resolveMaterialRecord(input(), [ss316lCandidate()], bomb);

    expect(res.decision).toBe("DO_NOT_MERGE");
    expect(res.selectedCandidate?.criticalConflicts.length ?? 0).toBeGreaterThanOrEqual(1);
    expect(res.reason).toMatch(/engineering-critical conflict/i);
    // The signal WAS consumed and fused — it is not silently ignored…
    expect(res.selectedCandidate?.scoreDetails.embeddingSimilarity).toBe(100);
    // …and it moved the ranking score upward versus the lexical-only blend.
    const without = semanticSimilarity(SS304, SS316L);
    const withBomb = semanticSimilarity(SS304, SS316L, bomb);
    expect(withBomb.embedding).toBe(100);
    expect(withBomb.final).toBeGreaterThanOrEqual(without.final);
    expect(res.auditEvents.map((e) => e.label)).toContain(
      "Dense retrieval signal fused"
    );
  });

  it("absent, null and never-applicable signals are all identical to legacy scoring", () => {
    const none = resolveMaterialRecord(input(), [ss316lCandidate()]);
    const nullish = resolveMaterialRecord(input(), [ss316lCandidate()], null);
    const neverFires: EmbeddingSignal = () => null;
    const inert = resolveMaterialRecord(input(), [ss316lCandidate()], neverFires);

    for (const variant of [nullish, inert]) {
      expect(variant.decision).toBe(none.decision);
      expect(variant.selectedCandidate?.scoreDetails.finalScore).toBe(
        none.selectedCandidate?.scoreDetails.finalScore
      );
      expect(variant.selectedCandidate?.scoreDetails.semanticSimilarity).toBe(
        none.selectedCandidate?.scoreDetails.semanticSimilarity
      );
      expect(variant.selectedCandidate?.scoreDetails.embeddingSimilarity).toBe(
        none.selectedCandidate?.scoreDetails.embeddingSimilarity
      );
    }
    expect(none.selectedCandidate?.scoreDetails.embeddingSimilarity).toBeNull();
    expect(none.decision).toBe("DO_NOT_MERGE");
  });

  it("generateCandidates never changes the candidate ORDER without a signal", () => {
    const corpus = [ss316lCandidate()];
    const a = generateCandidates(input(), corpus);
    const b = generateCandidates(input(), corpus, null);
    expect(b.map((c) => c.targetRecord.id)).toEqual(
      a.map((c) => c.targetRecord.id)
    );
    expect(b[0].scoreDetails.finalScore).toBe(a[0].scoreDetails.finalScore);
  });

  it(
    "real transformers signal: high cosine, veto still wins (PoC regression)",
    async (ctx) => {
      const signal = await createEmbeddingSignal([SS304, SS316L], {
        budgetMs: 60_000,
      });
      if (!signal) {
        // Offline / model unavailable — the engine falls back to lexical-only
        // by design; nothing to verify here.
        ctx.skip();
        return;
      }

      // The PoC's danger, reproduced: this pair scores ~0.93 cosine.
      const cosine = signal(SS304, SS316L);
      expect(cosine).not.toBeNull();
      expect(cosine!).toBeGreaterThanOrEqual(85);

      const res = resolveMaterialRecord(input(), [ss316lCandidate()], signal);
      expect(res.decision).toBe("DO_NOT_MERGE");
      expect(res.selectedCandidate?.criticalConflicts.length ?? 0).toBeGreaterThanOrEqual(1);
      expect(res.selectedCandidate?.scoreDetails.embeddingSimilarity).toBe(cosine);
    },
    120_000
  );
});
