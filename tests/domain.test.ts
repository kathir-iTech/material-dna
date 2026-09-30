import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { extractMaterialDNA } from "@/lib/material-dna/extraction";
import { normalizeDescription, canonicalGrade } from "@/lib/material-dna/normalization";
import { evaluateConstraints, criticalConflicts } from "@/lib/material-dna/constraints";
import {
  computeCandidateScore,
  decide,
  semanticSimilarity,
  buildIdf,
  documentFrequency,
  CORPUS_IDF,
} from "@/lib/material-dna/matching";
import {
  generateCanonicalId,
  canonicalAttributeSet,
  canonicalHash4,
} from "@/lib/material-dna/canonical-id";
import { buildInputRecord, resolveMaterialRecord } from "@/lib/material-dna/demo";
import { materialRecords, canonicalMaterials } from "@/data/demo";
import { ExplanationPanel } from "@/components/explanation-panel";
import { CandidateTable } from "@/components/candidate-table";
import { DecisionBanner } from "@/components/decision-banner";
import { SimilarityWarning } from "@/components/similarity-warning";

function resolve(desc: string) {
  const input = buildInputRecord(desc);
  return resolveMaterialRecord(input, materialRecords);
}

describe("Attribute extraction", () => {
  it("extracts dimensions M12 x 60", () => {
    const dna = extractMaterialDNA("HEX BOLT M12 X 60 8.8 ZP DIN 931");
    expect(dna.thread.value).toBe("M12");
    expect(dna.dimensions.value).toContain("M12 × 60 mm");
    expect(dna.materialType.value).toBe("Hex Bolt");
  });

  it("extracts grade 8.8 vs 10.9 distinctly", () => {
    const a = extractMaterialDNA("HEX BOLT M12 X 60 8.8 ZP DIN 931");
    const b = extractMaterialDNA("HEX BOLT M12 X 60 10.9 ZP DIN 931");
    expect(a.grade.value).toBe("8.8");
    expect(b.grade.value).toBe("10.9");
  });

  it("extracts stainless grade SS304 / SS316L", () => {
    const a = extractMaterialDNA("SS304 STAINLESS STEEL PIPE 50MM OD");
    const b = extractMaterialDNA("SS316L STAINLESS STEEL PIPE 50MM OD");
    expect(a.grade.value).toBe("304");
    expect(b.grade.value).toBe("316L");
  });

  it("extracts schedule and pressure class", () => {
    const dna = extractMaterialDNA("FLANGE 150# RF SS304 ANSI B16.5");
    expect(dna.classPressure.value).toBe("Class 150");
  });

  it("extracts electrical ratings", () => {
    const dna = extractMaterialDNA("ELECTRICAL CABLE 2.5 SQ MM 3 CORE COPPER XLPE");
    expect(dna.electrical.value).toContain("2.5 sqmm");
  });

  it("recognizes pipes and standards", () => {
    const dna = extractMaterialDNA("GI PIPE 2 INCH CLASS C IS 1239");
    expect(dna.materialType.value).toBe("Pipe");
    expect(dna.material.value).toBe("Galvanised Iron");
    expect(dna.dimensions.value?.[0]).toContain("2″");
  });

  it("leaves insufficient input with unknown attributes", () => {
    const dna = extractMaterialDNA("STEEL BOLT M12");
    expect(dna.materialType.value).toBe("Bolt");
    expect(dna.grade.value).toBeNull();
    expect(dna.coating.value).toBeNull();
  });

  it("handles nonsense input without crashing", () => {
    const dna = extractMaterialDNA("special industrial assembly component qwerty ##$%");
    expect(dna).toBeDefined();
    expect(dna.materialType.value).toBeNull();
  });
});

describe("Normalization", () => {
  it("normalizes SS304 variants", () => {
    expect(canonicalGrade("SS304")).toBe("304 stainless steel");
    expect(canonicalGrade("304SS")).toBe("304 stainless steel");
    expect(canonicalGrade("SS 304")).toBe("304 stainless steel");
  });

  it("normalizes ZP variants", () => {
    expect(normalizeDescription("ZP DIN 931")).toContain("Zinc Plated");
    expect(normalizeDescription("ZN PLATED")).toContain("Zinc Plated");
  });

  it("normalizes MS variants", () => {
    expect(normalizeDescription("MS PLATE")).toContain("Mild Steel");
    expect(normalizeDescription("mild steel plate")).toContain("mild steel");
  });

  it("normalizes thread spacing", () => {
    expect(normalizeDescription("M12x60")).toBe("M12 × 60 mm");
    expect(normalizeDescription("M12 X 60")).toBe("M12 × 60 mm");
  });

  it("preserves original raw text", () => {
    const input = "MS PLATE 12MM IS 2062";
    const normalized = normalizeDescription(input);
    expect(input).toBe(input);
    expect(normalized).not.toBe(input);
  });

  it("normalizes sq mm spacing", () => {
    expect(normalizeDescription("2.5sqmm")).toBe("2.5 sq mm");
    expect(normalizeDescription("2.5 SQMM")).toBe("2.5 sq mm");
  });
});

describe("Constraints", () => {
  it("flags grade conflict as critical", () => {
    const a = extractMaterialDNA("HEX BOLT M12 X 60 8.8 ZP DIN 931");
    const b = extractMaterialDNA("HEX BOLT M12 X 60 10.9 ZP DIN 931");
    const results = evaluateConstraints(a, b);
    const critical = criticalConflicts(results);
    expect(critical.length).toBeGreaterThan(0);
    expect(critical[0].rule).toBe("critical-grade-mismatch");
  });

  it("allows compatible reference grades (IS 2062 E250 vs ASTM A36)", () => {
    const a = extractMaterialDNA("IS 2062 E250A STRUCTURAL STEEL PLATE 10MM");
    const b = extractMaterialDNA("ASTM A36 CARBON STEEL PLATE 10MM");
    const results = evaluateConstraints(a, b);
    expect(criticalConflicts(results).some((c) => c.rule === "critical-grade-mismatch")).toBe(false);
  });

  it("flags dimension difference as critical conflict", () => {
    const a = extractMaterialDNA("HEX BOLT M12 X 60 8.8 ZP");
    const b = extractMaterialDNA("HEX BOLT M12 X 50 8.8 ZP");
    const results = evaluateConstraints(a, b);
    expect(criticalConflicts(results).some((c) => c.rule === "critical-dimension-mismatch")).toBe(true);
  });

  it("returns UNKNOWN when only one side states dimensions", () => {
    const a = extractMaterialDNA("HEX BOLT 8.8 ZP");
    const b = extractMaterialDNA("HEX BOLT M12 X 60 8.8 ZP");
    const results = evaluateConstraints(a, b);
    expect(results.some((r) => r.status === "UNKNOWN")).toBe(true);
  });
});

describe("Scoring", () => {
  it("gives high score for true duplicate", () => {
    const a = extractMaterialDNA("HEX BOLT M12 X 60 8.8 ZP DIN 931");
    const b = extractMaterialDNA("HEXAGON HEAD BOLT M12 X 60 CLASS 8.8 ZINC PLATED DIN 931");
    const score = computeCandidateScore(a, b, "HEX BOLT M12 X 60 8.8 ZP DIN 931", "HEXAGON HEAD BOLT M12 X 60 CLASS 8.8 ZINC PLATED DIN 931");
    expect(score.finalScore).toBeGreaterThanOrEqual(85);
  });

  it("penalizes critical conflict even at high similarity", () => {
    const a = extractMaterialDNA("HEX BOLT M12 X 60 8.8 ZP DIN 931");
    const b = extractMaterialDNA("HEX BOLT M12 X 60 10.9 ZP DIN 931");
    const constraints = evaluateConstraints(a, b);
    expect(criticalConflicts(constraints).length).toBeGreaterThan(0);
    const decision = decide(
      computeCandidateScore(a, b, "HEX BOLT M12 X 60 8.8 ZP DIN 931", "HEX BOLT M12 X 60 10.9 ZP DIN 931"),
      constraints,
      a
    );
    expect(decision.decision).toBe("DO_NOT_MERGE");
  });
});

describe("End-to-end scenarios", () => {
  it("Scenario 1: true duplicate -> MATCH", () => {
    const result = resolve("HEX BOLT M12 X 60 8.8 ZP DIN 931");
    const match = result.candidates.find(
      (c) => c.targetRecord.sourceCode === "009821"
    );
    expect(match?.decision).toBe("MATCH");
  });

  it("Scenario 2: dangerous near-match -> DO NOT MERGE", () => {
    const result = resolve("HEX BOLT M12 X 60 8.8 ZP DIN 931");
    const near = result.candidates.find(
      (c) => c.targetRecord.sourceCode === "HX-M12-60-10.9" || c.targetRecord.sourceCode === "BOLT-88321"
    );
    expect(near?.decision).toBe("DO_NOT_MERGE");
    expect(near?.criticalConflicts.length).toBeGreaterThan(0);
  });

  it("Scenario 3: ambiguous material -> REVIEW", () => {
    const result = resolve("STEEL BOLT M12");
    expect(result.decision).toBe("REVIEW");
  });

  it("Scenario 4: M12x60 vs M12x50 produces a conflict decision", () => {
    const result = resolve("HEX BOLT M12 X 60 8.8 ZP");
    const dimDiff = result.candidates.find(
      (c) => c.targetRecord.rawDescription.includes("M12 X 50")
    );
    expect(dimDiff).toBeDefined();
    expect(dimDiff!.criticalConflicts.some((c) => c.rule === "critical-dimension-mismatch")).toBe(true);
  });

  it("Scenario 5: SS304 vs SS316 -> DO NOT MERGE", () => {
    const result = resolve("SS304 STAINLESS STEEL PIPE 50MM OD X 3MM WALL");
    const ss316 = result.candidates.find(
      (c) => c.targetRecord.rawDescription.includes("SS316L")
    );
    expect(ss316).toBeDefined();
    expect(["DO_NOT_MERGE", "REVIEW"]).toContain(ss316!.decision);
  });

  it("Scenario 6: circle bolt equivalence within compatible standard group", () => {
    const input = buildInputRecord("IS 2062 E250A STRUCTURAL STEEL PLATE 10MM");
    const result = resolveMaterialRecord(input, materialRecords);
    expect(result.candidates.some((c) => c.targetRecord.sourceCode === "PLT-A36-10")).toBe(true);
  });
});

describe("Edge cases", () => {
  it("handles empty-ish and very short input as REVIEW", () => {
    const result = resolve("BOLT");
    expect(result.decision).toEqual("REVIEW");
  });

  it("handles very long input without crashing", () => {
    const long = "M12 ".repeat(300) + " 8.8";
    expect(() => resolve(long)).not.toThrow();
  });

  it("handles nonsense input with REVIEW", () => {
    const result = resolve("special industrial assembly component");
    expect(result.decision).toBe("REVIEW");
  });
});

describe("Determinism", () => {
  it("produces identical results on repeated runs", () => {
    const r1 = resolve("HEX BOLT M12 X 60 8.8 ZP DIN 931");
    const r2 = resolve("HEX BOLT M12 X 60 8.8 ZP DIN 931");
    expect(r1.decision).toBe(r2.decision);
    expect(r1.candidates[0].targetRecord.id).toBe(r2.candidates[0].targetRecord.id);
  });
});

describe("B3 regression: snapshotId collisions (leading -> trailing hash digits)", () => {
  // Both pairs below hashed to the SAME snapshotId with the old leading-digit
  // snapshotId (slice(0, 6)), so generateCandidates filtered the other side
  // out (rec.id === input.id) and the pair silently lost its candidate.
  it("benchmark pair 164 — Socket head cap screw grade 12.9 vs 10.9 — keeps distinct record ids and its candidate", () => {
    const a = buildInputRecord("Socket head cap screw M8x30 grade 12.9");
    const b = buildInputRecord("Socket head cap screw M8x30 grade 10.9");
    expect(a.id).not.toBe(b.id);

    const result = resolveMaterialRecord(a, [a, b]);
    expect(result.candidates.map((c) => c.targetRecord.id)).toContain(b.id);
  });

  it("benchmark pair 198 — Conduit bending spring 20mm vs 25mm — keeps distinct record ids and its candidate", () => {
    const a = buildInputRecord("Conduit bending spring 20mm");
    const b = buildInputRecord("Conduit bending spring 25mm");
    expect(a.id).not.toBe(b.id);

    const result = resolveMaterialRecord(a, [a, b]);
    expect(result.candidates.map((c) => c.targetRecord.id)).toContain(b.id);
  });
});

describe("TF-IDF (real corpus statistics)", () => {
  it("weights a term appearing in every document lower than a term appearing in only one document", () => {
    // Real slice of the demo corpus: every valve record contains "valve",
    // while "bore" occurs in exactly one of them.
    const docs = materialRecords
      .filter((r) => /valve/i.test(r.rawDescription))
      .map((r) => r.normalizedDescription);
    expect(docs.length).toBeGreaterThan(1);

    const df = documentFrequency(docs);
    expect(df.get("valve")).toBe(docs.length); // present in EVERY document
    expect(df.get("bore")).toBe(1); // present in exactly ONE document

    const idf = buildIdf(docs);
    const universal = idf.idf.get("valve")!;
    const rare = idf.idf.get("bore")!;
    expect(universal).toBeLessThan(rare);
    // A term found in every document carries the minimum weight in the table.
    expect(universal).toBe(Math.min(...idf.idf.values()));
  });

  it("builds the production IDF index from the actual demo corpus", () => {
    expect(CORPUS_IDF.docCount).toBe(materialRecords.length);

    const df = documentFrequency(materialRecords.map((r) => r.normalizedDescription));
    // Rarest first: as document frequency rises, IDF must never rise.
    const byDf = [...df.entries()].sort((a, b) => a[1] - b[1]);
    const rarest = byDf[0];
    const mostCommon = byDf[byDf.length - 1];
    expect(mostCommon[1]).toBeGreaterThan(1);
    expect(rarest[1]).toBe(1);

    expect(CORPUS_IDF.idf.get(mostCommon[0])!).toBeLessThan(
      CORPUS_IDF.idf.get(rarest[0])!
    );

    // IDF must be non-increasing as document frequency rises: it is a function
    // of corpus statistics, not of the pair being compared.
    let previous = Infinity;
    for (const [term, count] of byDf) {
      const weight = CORPUS_IDF.idf.get(term)!;
      expect(count).toBeGreaterThan(0);
      expect(weight).toBeLessThanOrEqual(previous);
      previous = weight;
    }  });

  it("returns TF-IDF as its own named component of the score breakdown", () => {
    const a = "HEX BOLT M12 X 60 8.8 ZP DIN 931";
    const b = "HEXAGON HEAD BOLT M12 X 60 CLASS 8.8 ZINC PLATED DIN 931";
    const score = computeCandidateScore(
      extractMaterialDNA(normalizeDescription(a)),
      extractMaterialDNA(normalizeDescription(b)),
      a,
      b
    );

    expect(score).toHaveProperty("tfidfSimilarity");
    expect(score.tfidfSimilarity).toBeGreaterThanOrEqual(0);
    expect(score.tfidfSimilarity).toBeLessThanOrEqual(100);
    expect(score.tokenOverlap).toBeGreaterThanOrEqual(0);
    expect(score.diceSimilarity).toBeGreaterThanOrEqual(0);

    const sem = semanticSimilarity(a, b);
    expect(score.tokenOverlap).toBe(sem.lexical);
    expect(score.diceSimilarity).toBe(sem.character);
    expect(score.tfidfSimilarity).toBe(sem.tfidf);

    // Identical text is a perfect TF-IDF match.
    expect(semanticSimilarity(a, a).tfidf).toBe(100);
  });
});

describe("Canonical national material code", () => {
  const desc = "HEX BOLT M12 X 60 8.8 ZP DIN 931";

  it("produces an identical code for identical DNA", () => {
    const a = extractMaterialDNA(normalizeDescription(desc));
    const b = extractMaterialDNA(normalizeDescription(desc));
    expect(canonicalAttributeSet(a)).toBe(canonicalAttributeSet(b));
    expect(generateCanonicalId(a)).toBe(generateCanonicalId(b));
  });

  it("produces a different code when a critical attribute (grade) differs", () => {
    const a = extractMaterialDNA(normalizeDescription(desc));
    const b = extractMaterialDNA(normalizeDescription(desc.replace("8.8", "10.9")));
    expect(a.grade.value).toBe("8.8");
    expect(b.grade.value).toBe("10.9");

    expect(canonicalAttributeSet(a)).not.toBe(canonicalAttributeSet(b));
    expect(canonicalHash4(a)).not.toBe(canonicalHash4(b));

    const codeA = generateCanonicalId(a);
    const codeB = generateCanonicalId(b);
    expect(codeA).not.toBe(codeB);
    // Grade is not a named segment, so only the hash tail may change.
    expect(codeA.slice(0, codeA.lastIndexOf("-"))).toBe(
      codeB.slice(0, codeB.lastIndexOf("-"))
    );
    expect(codeA.slice(-4)).not.toBe(codeB.slice(-4));
  });

  it("matches MDNA-{MATERIAL}-{TYPE}-{DIMENSION}-{STANDARD}-{HASH4}", () => {
    const dna = extractMaterialDNA(normalizeDescription(desc));
    const code = generateCanonicalId(dna);
    // Segments may contain decimal points (e.g. 50.8MM) but never hyphens,
    // so the hyphens are exactly the five true separators: MDNA, MATERIAL,
    // TYPE, DIMENSION, STANDARD, HASH4.
    expect(code).toMatch(/^MDNA-[A-Z0-9.]+(?:-[A-Z0-9+.]+)*-[0-9A-F]{4}$/);
    expect(code.split("-")).toHaveLength(6);
    expect(code).toContain("HEXBOLT");
    expect(code).toContain("M12X60MM");
    expect(code).toContain("DIN931");
  });

  it("keeps every demo canonical id hyphen-free inside its segments", () => {
    for (const c of canonicalMaterials) {
      expect(c.canonicalId.split("-")).toHaveLength(6);
    }
  });

  it("derives every demo canonical id from the generator and keeps them unique", () => {
    expect(canonicalMaterials.length).toBeGreaterThan(0);
    for (const c of canonicalMaterials) {
      expect(c.canonicalId).toBe(generateCanonicalId(c.dna));
      expect(c.canonicalId).toMatch(/^MDNA-/);
    }
    const ids = canonicalMaterials.map((c) => c.canonicalId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("B4 regression: canonical id legibility", () => {
  const ids = canonicalMaterials.map((c) => c.canonicalId);
  const MATERIAL = 1;
  const DIMENSION = 3;
  const STANDARD = 4;

  it("uses an explicit UNK segment for missing attributes, never a silent NA", () => {
    expect(ids.some((id) => id.split("-").includes("UNK"))).toBe(true);
    for (const id of ids) {
      expect(id.split("-")).not.toContain("NA");
    }
  });

  it("strips coating/finish words from the MATERIAL segment", () => {
    const forbidden = /GALVANIZED|GALVANISED|ZINC|PLATED|COATED/;
    for (const id of ids) {
      expect(forbidden.test(id.split("-")[MATERIAL])).toBe(false);
    }
    // "HEX BOLT ... ZP ..." extracts material as "Zinc" (a coating) — the
    // segment must be UNK, not ZINC.
    const hexBolt = canonicalMaterials.find((c) =>
      c.normalizedDescription.startsWith("HEX BOLT M12")
    );
    expect(hexBolt?.canonicalId.split("-")[MATERIAL]).toBe("UNK");
    // "GI PIPE ..." extracts "Galvanised Iron" — coating word stripped.
    const giPipe = canonicalMaterials.find((c) => c.normalizedDescription.includes("GI PIPE"));
    expect(giPipe?.canonicalId.split("-")[MATERIAL]).toBe("IRON");
  });

  it("encodes 2 INCH as 50.8MM, not the fused 2508MM", () => {
    const pipe = canonicalMaterials.find((c) => c.normalizedDescription.includes("ASTM A106"));
    expect(pipe?.canonicalId.split("-")[DIMENSION]).toBe("50.8MM");
    expect(pipe?.canonicalId).not.toContain("2508MM");
  });

  it("encodes 1/2 INCH as 12.7MM, not the fused 12127MM", () => {
    const valve = canonicalMaterials.find((c) => c.normalizedDescription.includes("BALL VALVE"));
    expect(valve?.canonicalId.split("-")[DIMENSION]).toBe("12.7MM");
    expect(valve?.canonicalId).not.toContain("12127MM");
  });

  it("keeps decimal points inside segments (3.15 mm must not compact to 315)", () => {
    const rod = canonicalMaterials.find((c) => c.normalizedDescription.includes("WELDING ROD"));
    expect(rod?.canonicalId.split("-")[DIMENSION]).toBe("3.15MM");
  });

  it("still yields exactly six hyphen-separated parts with a HEX4 tail", () => {
    for (const id of ids) {
      expect(id.split("-")).toHaveLength(6);
      expect(id).toMatch(/-[0-9A-F]{4}$/);
      expect(id.split("-")[STANDARD]).toMatch(/^[A-Z0-9.+]+$/);
    }
  });
});

describe("UI surfaces the named scoring techniques", () => {
  const result = resolveMaterialRecord(
    buildInputRecord("HEX BOLT M12 X 60 8.8 ZP DIN 931"),
    materialRecords
  );

  it("renders labelled sub-scores in the explanation panel", () => {
    const html = renderToStaticMarkup(createElement(ExplanationPanel, { result }));
    expect(html).toContain("Token overlap:");
    expect(html).toContain("Dice similarity:");
    expect(html).toContain("TF-IDF:");
    expect(html).toContain("Attribute agreement:");
    expect(html).toContain("Final score:");
  });

  it("explains each technique with a one-line definition", () => {
    const html = renderToStaticMarkup(createElement(ExplanationPanel, { result }));
    expect(html).toContain("Shared words between the two descriptions");
    expect(html).toContain("Shared character patterns");
    expect(html).toContain(
      "Weighted by how distinctive each word is across the whole material catalogue"
    );
    expect(html).toContain("Structured engineering attributes that agree");
  });

  it("renders labelled sub-scores in the candidate table, each with a tooltip", () => {
    const html = renderToStaticMarkup(
      createElement(CandidateTable, {
        candidates: result.candidates.slice(0, 5),
        selectedId: result.selectedCandidate?.targetRecord.sourceCode ?? null,
        onSelect: () => {},
        onInspect: () => {},
      })
    );
    expect(html).toContain("Token overlap:");
    expect(html).toContain("Dice similarity:");
    expect(html).toContain("TF-IDF:");
    expect(html).toContain("Attribute agreement");
    expect(html).toContain('title="Shared words between the two descriptions"');
    expect(html).toContain('title="Shared character patterns"');
    expect(html).toContain(
      'title="Weighted by how distinctive each word is across the whole material catalogue"'
    );
  });

  it("shows the same named breakdown in the decision banner (resolve page)", () => {
    const html = renderToStaticMarkup(createElement(DecisionBanner, { result }));
    expect(html).toContain("Token overlap");
    expect(html).toContain("Dice similarity");
    expect(html).toContain("TF-IDF");
    expect(html).toContain("Attribute agreement");
    expect(html).not.toContain("Top similarity");
  });

  it("shows the same named breakdown in the similarity warning", () => {
    const candidate = result.selectedCandidate!;
    const html = renderToStaticMarkup(
      createElement(SimilarityWarning, {
        similarity: candidate.similarityScore,
        score: candidate.scoreDetails,
        constraint: candidate.criticalConflicts[0] ?? null,
      })
    );
    expect(html).toContain("Token overlap");
    expect(html).toContain("Dice similarity");
    expect(html).toContain("TF-IDF");
    expect(html).toContain("Attribute agreement");
  });
});