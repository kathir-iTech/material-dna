import { describe, expect, it } from "vitest";
import { extractMaterialDNA } from "@/lib/material-dna/extraction";
import {
  evaluateConstraints,
  criticalConflicts,
  coatingFinishEquivalent,
} from "@/lib/material-dna/constraints";
import { dimensionListsEquivalent } from "@/lib/material-dna/units";

describe("Fix 1: inch/mm/NPS dimension equivalence", () => {
  it("treats 2 inch as 50 mm (exact 50.8 and NPS->DN per ISO 6708)", () => {
    expect(dimensionListsEquivalent(["2″ (50.8 mm)"], ["50 mm"])).toBe(true);
  });

  it("treats 1/2 inch as DN15 and accepts catalogue rounding to 12.5 mm", () => {
    expect(dimensionListsEquivalent(["1/2″ (12.7 mm)"], ["15 mm"])).toBe(true);
    expect(dimensionListsEquivalent(["1/2″ (12.7 mm)"], ["12.5 mm"])).toBe(true);
  });

  it("accepts 1 inch as 25 mm (DN25) and metre vs millimetre lists", () => {
    expect(dimensionListsEquivalent(["1″ (25.4 mm)"], ["25 mm"])).toBe(true);
    expect(dimensionListsEquivalent(["1000 × 2000 mm"], ["1 m", "2 m"])).toBe(true);
  });

  it("still vetoes genuinely different sizes", () => {
    expect(dimensionListsEquivalent(["M12 × 60 mm"], ["M12 × 50 mm"])).toBe(false);
    expect(dimensionListsEquivalent(["2″ (50.8 mm)"], ["3″ (76.2 mm)"])).toBe(false);
    expect(dimensionListsEquivalent(["50 mm"], ["40 mm"])).toBe(false);
  });

  it("respects multiplicity and does not clear a superset as equal", () => {
    expect(dimensionListsEquivalent(["50 × 50 × 3 mm"], ["50 × 3 × 3 mm"])).toBe(false);
    expect(dimensionListsEquivalent(["100 × 50 × 5 mm"], ["100 mm"])).toBe(false);
  });

  it("no critical dimension conflict on a 2 inch vs 50mm valve pair (benchmark #7)", () => {
    const a = extractMaterialDNA("Globe valve 2 inch SS316 flanged");
    const b = extractMaterialDNA("SS316 Flanged Globe Valve 50mm");
    const critical = criticalConflicts(evaluateConstraints(a, b));
    expect(critical.some((c) => c.rule === "critical-dimension-mismatch")).toBe(false);
  });

  it("does not record the same size twice for 'M10 x 50mm'", () => {
    const dna = extractMaterialDNA("Hex bolt M10 x 50mm grade 8.8 galvanised");
    expect(dna.dimensions.value).toEqual(["M10 × 50 mm"]);
  });
});

describe("Fix 2: IS 2062 sub-grade dictionary", () => {
  it("extracts IS 2062 sub-grades E350C and E250A (benchmark #6)", () => {
    const a = extractMaterialDNA("IS 2062 E250A structural steel plate 10mm");
    const b = extractMaterialDNA("IS 2062 E350C structural steel plate 10mm");
    expect(a.grade.value).toBe("E250A");
    expect(b.grade.value).toBe("E350C");
  });

  it("maps compact market forms E250B / E250B0 / E250BO to sub-quality B0", () => {
    expect(extractMaterialDNA("IS 2062 E250B plate").grade.value).toBe("E250B0");
    expect(extractMaterialDNA("IS 2062 E250B0 plate").grade.value).toBe("E250B0");
  });

  it("E250A vs E350C is a critical grade conflict, not a false MATCH", () => {
    const a = extractMaterialDNA("IS 2062 E250A structural steel plate 10mm");
    const b = extractMaterialDNA("IS 2062 E350C structural steel plate 10mm");
    const critical = criticalConflicts(evaluateConstraints(a, b));
    expect(critical.some((c) => c.rule === "critical-grade-mismatch")).toBe(true);
  });

  it("still allows the documented reference-grade pair E250A vs A36", () => {
    const a = extractMaterialDNA("IS 2062 E250A STRUCTURAL STEEL PLATE 10MM");
    const b = extractMaterialDNA("ASTM A36 CARBON STEEL PLATE 10MM");
    const critical = criticalConflicts(evaluateConstraints(a, b));
    expect(critical.some((c) => c.rule === "critical-grade-mismatch")).toBe(false);
  });

  it("extracts IS 1239 pipe wall classes so class A vs class B conflicts", () => {
    const a = extractMaterialDNA("GI pipe class C 2 inch BIS 1239");
    const b = extractMaterialDNA("GI pipe class B 2 inch BIS 1239");
    expect(a.classPressure.value).toBe("Class C");
    expect(b.classPressure.value).toBe("Class B");
    const critical = criticalConflicts(evaluateConstraints(a, b));
    expect(critical.some((c) => c.rule === "critical-pressure-class-mismatch")).toBe(true);
  });
});

describe("Fix 3: coating/finish equivalence group", () => {
  it("zinc plated and galvanised are the same finish family", () => {
    expect(coatingFinishEquivalent("Zinc", "Galvanised")).toBe(true);
    expect(coatingFinishEquivalent("Zinc Plated", "galvanized")).toBe(true);
    expect(coatingFinishEquivalent("Zinc", "Mild Steel")).toBe(false);
  });

  it("never fires the critical material veto for zinc plated vs galvanised (benchmark #3)", () => {
    const a = extractMaterialDNA("Hex bolt M10x50 grade 8.8 zinc plated");
    const b = extractMaterialDNA("Hexagon Head Bolt M10 x 50mm Grade 8.8 Galvanised");
    const results = evaluateConstraints(a, b);
    expect(results.some((r) => r.rule === "coating-finish-equivalent")).toBe(true);
    expect(criticalConflicts(results).some((c) => c.rule === "critical-material-mismatch")).toBe(false);
  });
});
