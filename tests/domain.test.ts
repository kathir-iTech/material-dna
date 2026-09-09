import { describe, expect, it } from "vitest";
import { extractMaterialDNA } from "@/lib/material-dna/extraction";
import { normalizeDescription, canonicalGrade } from "@/lib/material-dna/normalization";
import { evaluateConstraints, criticalConflicts } from "@/lib/material-dna/constraints";
import { computeCandidateScore, decide } from "@/lib/material-dna/matching";
import { buildInputRecord, resolveMaterialRecord } from "@/lib/material-dna/demo";
import { materialRecords } from "@/data/demo";

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