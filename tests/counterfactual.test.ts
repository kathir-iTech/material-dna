import { describe, it, expect } from "vitest";
import {
  applyCounterfactual,
  buildInputRecord,
  resolveMaterialRecord,
  runCounterfactual,
} from "@/lib/material-dna/demo";
import { materialRecords } from "@/data/demo";
import {
  resolveWithReviewPolicy,
  additionalConstraints,
} from "@/lib/material-dna/matching/review-first";
describe("counterfactuals retain the actual pair", () => {
  it("changes only the reference, updates its text, and removes the detected grade conflict", () => {
    const a = buildInputRecord("HEX BOLT M12 X 60 8.8 ZP DIN 931");
    const corpus = materialRecords.filter((r) => r.dna.grade.value === "10.9");
    const before = resolveMaterialRecord(a, corpus);
    const candidate = before.selectedCandidate!.targetRecord;
    const original = JSON.stringify(candidate);
    const change = {
      attribute: "grade" as const,
      label: "Grade",
      original: "10.9",
      modified: "8.8",
    };
    const pair = applyCounterfactual(a, candidate, change);
    expect(pair.left).toBe(a);
    expect(pair.right.id).toBe(candidate.id);
    expect(pair.right.dna.grade.value).toBe("8.8");
    expect(pair.right.rawDescription).toContain("8.8");
    expect(JSON.stringify(candidate)).toBe(original);
    const after = resolveWithReviewPolicy(pair.left, [pair.right]);
    expect(after.decision).toBe("MATCH");
    expect(after.candidates).toHaveLength(1);
    expect(after.selectedCandidate?.targetRecord.id).toBe(candidate.id);
  });
  it("cannot hide an incompatible standard by choosing another corpus record", () => {
    const before = resolveMaterialRecord(
      buildInputRecord("HEX BOLT M12 X 60 8.8 ZP DIN 931"),
      materialRecords,
    );
    const original = before.selectedCandidate!.targetRecord;
    const result = runCounterfactual(before, materialRecords, {
      attribute: "standard",
      label: "Standard",
      original: original.dna.standard.value![0],
      modified: "ASTM A193",
    });
    expect(result.afterDecision).toBe("DO_NOT_MERGE");
    expect(result.after.selectedCandidate?.targetRecord.id).toBe(original.id);
  });
  it("does not interpret a fastener property class as pipe pressure", () => {
    expect(
      additionalConstraints(
        "HEX BOLT M12 X 60 8.8 ZP DIN 931",
        "HEX BOLT M12 X 60 CLASS 8.8 ZP DIN 931",
      ),
    ).toEqual([]);
  });
});
