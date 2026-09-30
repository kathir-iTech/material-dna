import { describe, expect, it } from "vitest";
import { extractMaterialDNA } from "@/lib/material-dna/extraction";
import {
  dimensionListsEquivalent,
  NPS_DN_ENTRY_COUNT,
} from "@/lib/material-dna/units";
import {
  gradesEquivalent,
  GRADE_TABLE_ENTRY_COUNT,
} from "@/lib/material-dna/grade-equivalence";
import {
  evaluateConstraints,
  criticalConflicts,
} from "@/lib/material-dna/constraints";

describe("Feature 2: NPS/DN table (ISO 6708-1 / ASME B36.10M)", () => {
  it("covers the full NPS 1/8..96 series (46 entries)", () => {
    expect(NPS_DN_ENTRY_COUNT).toBe(46);
  });

  it("maps the large-bore sizes that were missing", () => {
    const d = extractMaterialDNA("Globe valve 14 inch flanged");
    expect(d.dimensions.value).toEqual(["14″ (355.6 mm)"]);
    // 14 inch -> DN350 must equal a DN 350 nominal statement.
    expect(dimensionListsEquivalent(d.dimensions.value!, ["DN 350"])).toBe(true);
    expect(dimensionListsEquivalent(["24″ (609.6 mm)"], ["DN 600"])).toBe(true);
    expect(dimensionListsEquivalent(["48″ (1219.2 mm)"], ["DN 1200"])).toBe(true);
    expect(dimensionListsEquivalent(["3.5″ (88.9 mm)"], ["DN 90"])).toBe(true);
  });

  it("parses DN and NPS designations from text", () => {
    const dn = extractMaterialDNA("Flanged globe valve DN 100 body");
    expect(dn.dimensions.value).toEqual(["DN 100"]);
    const nps = extractMaterialDNA("Carbon steel pipe NPS 4 SCH 40");
    expect(nps.dimensions.value).toEqual(["NPS 4"]);
    const frac = extractMaterialDNA("Reducer NPS 1/2 to DN 15");
    // DN captures are emitted before NPS captures (loop order), list order
    // otherwise follows document order.
    expect(frac.dimensions.value).toEqual(["DN 15", "NPS 1/2"]);
  });

  it("does not double-capture 'DN 100 mm'", () => {
    const d = extractMaterialDNA("Pipe DN 100 mm wall 4mm"); // "4mm" also a length
    expect(d.dimensions.value).toContain("DN 100");
    expect(d.dimensions.value!.filter((x) => x.startsWith("DN"))).toHaveLength(1);
  });

  it("cross-checks DN against inch/mm forms", () => {
    expect(dimensionListsEquivalent(["DN 50"], ["2″ (50.8 mm)"])).toBe(true);
    expect(dimensionListsEquivalent(["NPS 4"], ["4″ (101.6 mm)"])).toBe(true);
    expect(dimensionListsEquivalent(["NPS 1/2"], ["DN 15"])).toBe(true);
    expect(dimensionListsEquivalent(["NPS 6"], ["150 mm"])).toBe(true);
    // Still vetoes genuinely different nominal sizes.
    expect(dimensionListsEquivalent(["DN 150"], ["DN 100"])).toBe(false);
    expect(dimensionListsEquivalent(["NPS 4"], ["NPS 6"])).toBe(false);
  });

  it("wires DN size differences into the critical dimension veto", () => {
    const a = extractMaterialDNA("Flanged ball valve DN 150 SS304");
    const b = extractMaterialDNA("Flanged ball valve DN 100 SS304");
    const rules = criticalConflicts(evaluateConstraints(a, b)).map((c) => c.rule);
    expect(rules).toContain("critical-dimension-mismatch");
  });
});

describe("Feature 2: grade-equivalence table (cited cross-standard groups)", () => {
  it("has real breadth (55 labels across 9 groups)", () => {
    expect(GRADE_TABLE_ENTRY_COUNT).toBe(55);
  });

  const compatible: Array<[string, string]> = [
    // IS 2062 <-> ASTM <-> JIS <-> EN <-> DIN <-> GB (250 class)
    ["E250A", "A36"],
    ["E250A", "SS400"],
    ["E250C", "S235JR"],
    ["E250BR", "St37-2"],
    ["Q235", "Fe360"],
    // 275 class
    ["E275A", "S275"],
    // 350 class
    ["E350C", "S355JR"],
    ["E350C", "SM490"],
    ["E350A", "St52-3"],
    ["Q345", "Fe510"],
    // stainless across AISI/ASTM, JIS, EN and UNS designation systems
    ["304", "SUS304"],
    ["304", "1.4301"],
    ["304", "X5CrNi18-10"],
    ["304", "S30400"],
    ["316L", "SUS316L"],
    ["316L", "1.4404"],
    ["316", "X5CrNiMo17-12-2"],
    ["316L", "S31603"],
    // tool steel across ASTM/DIN/JIS
    ["D2", "SKD11"],
    ["D2", "1.2379"],
    ["D2", "X155CrVMo12-1"],
    ["D3", "1.2080"],
    ["D3", "X210Cr12"],
  ];

  it("accepts the published cross-system relationships (case-insensitive)", () => {
    for (const [a, b] of compatible) {
      expect(gradesEquivalent(a, b), `${a} ~ ${b}`).toBe(true);
      expect(gradesEquivalent(a.toLowerCase(), b.toLowerCase()), `${a} ~ ${b}`).toBe(true);
    }
  });

  const notEquivalent: Array<[string, string]> = [
    ["304", "316"],
    ["304", "316L"],
    ["304", "304L"],
    ["316", "316L"],
    ["SUS304", "SUS316"],
    ["E250A", "E350C"],
    ["SS400", "SM490"],
    ["S235JR", "S355JR"],
    ["8.8", "9.8"],
    ["8.8", "10.9"],
    ["10.9", "12.9"],
    ["4.6", "8.8"],
    ["D2", "D3"],
    ["NLGI 2", "NLGI 3"],
    ["E250A", "E275A"],
  ];

  it("keeps the documented non-equivalences separate (fasteners, NLGI, classes)", () => {
    for (const [a, b] of notEquivalent) {
      expect(gradesEquivalent(a, b), `${a} vs ${b}`).toBe(false);
    }
  });

  it("fires reference-grade-compatible as WARNING, not CRITICAL", () => {
    const a = extractMaterialDNA("Structural steel plate grade E250A 10mm");
    const b = extractMaterialDNA("Mild steel plate SS400 10mm");
    expect(a.grade.value).toBe("E250A");
    expect(b.grade.value).toBe("SS400");
    const grade = evaluateConstraints(a, b).find((c) => c.rule === "reference-grade-compatible");
    expect(grade).toBeDefined();
    expect(grade?.severity).toBe("WARNING");
    expect(criticalConflicts(evaluateConstraints(a, b)).map((c) => c.rule)).not.toContain(
      "critical-grade-mismatch"
    );
  });

  it("still fires CRITICAL on 8.8 vs 9.8 and 304 vs 316L (fixture safety)", () => {
    const boltA = extractMaterialDNA("Hex bolt M12 x 60 grade 8.8");
    const boltB = extractMaterialDNA("Hex bolt M12 x 60 grade 9.8");
    expect(criticalConflicts(evaluateConstraints(boltA, boltB)).map((c) => c.rule)).toContain(
      "critical-grade-mismatch"
    );
    const ssA = extractMaterialDNA("Stainless pipe SS304 50mm");
    const ssB = extractMaterialDNA("Stainless pipe SS316L 50mm");
    expect(criticalConflicts(evaluateConstraints(ssA, ssB)).map((c) => c.rule)).toContain(
      "critical-grade-mismatch"
    );
  });

  it("extracts JIS SUS grades so the table is reachable end-to-end", () => {
    const sus = extractMaterialDNA("SUS304 stainless sheet 2mm");
    expect(sus.grade.value).toBe("SUS304");
    expect(sus.material.value).toBe("Stainless Steel");
    const aisi = extractMaterialDNA("SS304 stainless sheet 2mm");
    expect(criticalConflicts(evaluateConstraints(sus, aisi)).map((c) => c.rule)).not.toContain(
      "critical-grade-mismatch"
    );
    const grade = evaluateConstraints(sus, aisi).find((c) => c.rule === "reference-grade-compatible");
    expect(grade).toBeDefined();
  });
});
