// ---------------------------------------------------------------------------
// Grade-equivalence table — cross-standard reference relationships.
//
// Used by the constraint engine (constraints/index.ts) in place of ad-hoc
// grade comparisons: when two records state grades from DIFFERENT
// designation systems that published comparison charts list as the same
// material (or the same grade family), the engine emits a WARNING-level
// "reference-grade-compatible" result instead of a CRITICAL conflict. The
// WARNING carries both grade values and still requires engineering review —
// these are reference relationships, not certified substitution.
//
// Sources per group (national/designation standards):
// - Structural 250 class: IS 2062:2011 (BIS) E250 sub-qualities;
//   ASTM A36/A36M; JIS G3101 SS400; EN 10025-2 S235JR (S235);
//   DIN 17100 St37-2 (legacy, superseded by EN 10025); GB/T 700 Q235;
//   pre-2004 EN 10025 Fe360. Approximate min-yield/tensile class
//   cross-references from published comparison charts.
// - Structural 275 class: IS 2062:2011 E275 sub-qualities; EN 10025-2
//   S275JR (S275). Same rationale as above.
// - Structural 350 class: IS 2062:2011 E350 sub-qualities; EN 10025-2
//   S355JR (S355); DIN 17100 St52-3 (legacy); JIS G3101 SM490;
//   GB/T 1591 Q345; pre-2004 EN 10025 Fe510.
// - Stainless 304/304L/316/316L: ASTM A240/A666 (AISI 304/316 family);
//   JIS G4304 SUS304/SUS304L/SUS316/SUS316L; EN 10088-2 werkstoff numbers
//   1.4301/1.4307/1.4401/1.4404 (with EN chemical designations
//   X5CrNi18-10 / X5CrNiMo17-12-2); UNS S30400/S30403/S31600/S31603
//   (SAE/ASTM). Same specified chemistry across designation systems.
// - Tool steel D2/D3: ASTM A681; DIN EN ISO 4957 / DIN 17350 1.2379
//   (X155CrVMo12-1) and 1.2080 (X210Cr12); JIS G4404 SKD11 (D2
//   equivalent per published cross-references).
//
// Deliberately NOT listed as equivalent (differences are material):
// - Fastener property classes 4.6 / 5.8 / 8.8 / 9.8 / 10.9 / 12.9 —
//   ISO 898-1 / ASTM A307 / A193 proof loads and tensile classes differ
//   across classes; cross-equating them would mask real bolt changes.
// - NLGI consistency grades (ASTM D217 penetration numbers).
// - 304 vs 304L and 316 vs 316L — max carbon differs (ASTM A240):
//   welding-grade selection is an engineering decision, so these stay
//   separate groups (cross-carbon pairing remains a CRITICAL conflict).
// - D2 vs D3 — different wear/impact balance (ASTM A681).
// - IS 2062 E250 vs E350 yield classes (and other cross-class pairs) —
//   different minimum yield strengths.
//
// Within one structural class, IS 2062 sub-qualities (A / BR / B0 / C) sit
// in the same group: they share the yield class and differ in impact-test
// requirements, which the WARNING surfaces for engineering review rather
// than silently merging or hard-vetoing.
// ---------------------------------------------------------------------------

type GradeGroup = Record<string, string>;

const GROUPS: GradeGroup[] = [
  // 250 MPa-class structural steels (IS/ASTM/JIS/EN/DIN/GB).
  {
    E250: "250 class",
    E250A: "250 class",
    E250B0: "250 class",
    E250BR: "250 class",
    E250C: "250 class",
    A36: "250 class",
    SS400: "250 class",
    S235: "250 class",
    S235JR: "250 class",
    "ST37-2": "250 class",
    Q235: "250 class",
    FE360: "250 class",
  },
  // 275 MPa-class structural steels.
  {
    E275: "275 class",
    E275A: "275 class",
    E275B0: "275 class",
    E275BR: "275 class",
    E275C: "275 class",
    S275: "275 class",
    S275JR: "275 class",
  },
  // 350 MPa-class structural steels.
  {
    E350: "350 class",
    E350A: "350 class",
    E350B0: "350 class",
    E350BR: "350 class",
    E350C: "350 class",
    S355: "350 class",
    S355JR: "350 class",
    "ST52-3": "350 class",
    Q345: "350 class",
    SM490: "350 class",
    FE510: "350 class",
  },
  // Austenitic stainless 304 family.
  {
    "304": "SS304 family",
    SUS304: "SS304 family",
    "1.4301": "SS304 family",
    "X5CrNi18-10": "SS304 family",
    S30400: "SS304 family",
  },
  // Austenitic stainless 304L family.
  {
    "304L": "SS304L family",
    SUS304L: "SS304L family",
    "1.4307": "SS304L family",
    S30403: "SS304L family",
  },
  // Austenitic stainless 316 family.
  {
    "316": "SS316 family",
    SUS316: "SS316 family",
    "1.4401": "SS316 family",
    "X5CrNiMo17-12-2": "SS316 family",
    S31600: "SS316 family",
  },
  // Austenitic stainless 316L family.
  {
    "316L": "SS316L family",
    SUS316L: "SS316L family",
    "1.4404": "SS316L family",
    S31603: "SS316L family",
  },
  // Tool steel D2 family.
  {
    D2: "D2 family",
    SKD11: "D2 family",
    "1.2379": "D2 family",
    "X155CrVMo12-1": "D2 family",
  },
  // Tool steel D3 family.
  {
    D3: "D3 family",
    "1.2080": "D3 family",
    "X210Cr12": "D3 family",
  },
];

/** key (uppercased grade label) -> every member of its equivalence group. */
export const GRADE_EQUIVALENT_GROUPS: Record<string, Set<string>> = (() => {
  const table: Record<string, Set<string>> = {};
  for (const group of GROUPS) {
    const labels = Object.keys(group);
    for (const label of labels) {
      const peers = new Set(labels.map((l) => l.toUpperCase()));
      peers.delete(label.toUpperCase());
      const existing = table[label.toUpperCase()];
      if (existing) for (const p of peers) existing.add(p);
      else table[label.toUpperCase()] = peers;
    }
  }
  return table;
})();

/** Total number of grade labels covered by the table (55 labels across 9 groups). */
export const GRADE_TABLE_ENTRY_COUNT = Object.keys(GRADE_EQUIVALENT_GROUPS).length;

/**
 * True when both grade labels are members of the same equivalence group
 * (case-insensitive, exact label otherwise). Non-grouped grades are never
 * compatible: the constraint engine then reports a CRITICAL mismatch.
 */
export function gradesEquivalent(a: string, b: string): boolean {
  const ka = a.trim().toUpperCase();
  const kb = b.trim().toUpperCase();
  if (ka === kb) return true;
  return GRADE_EQUIVALENT_GROUPS[ka]?.has(kb) ?? false;
}
