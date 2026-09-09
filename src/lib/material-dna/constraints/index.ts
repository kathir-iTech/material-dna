import type {
  ConstraintResult,
  ConstraintSeverity,
  ConstraintStatus,
  MaterialDNA,
} from "@/types/domain";
import { CONFIG } from "../config";

// ---------------------------------------------------------------------------
// Constraint engine.
// Each constraint is explicit and inspectable. A CONFLICT on a CRITICAL
// attribute vetoes a match. Rules are context-sensitive for the prototype.
// ---------------------------------------------------------------------------

function makeResult(
  attribute: string,
  attributeLabel: string,
  severity: ConstraintSeverity,
  status: ConstraintStatus,
  leftValue: string,
  rightValue: string,
  rule: string,
  explanation: string
): ConstraintResult {
  return {
    attributes: [attribute],
    severity,
    status,
    leftValue,
    rightValue,
    rule,
    explanation,
    attributeLabel,
  };
}

function diffAttr(a: string | null | undefined, b: string | null | undefined): boolean {
  if (a === null || a === undefined || b === null || b === undefined) return false;
  return String(a).toLowerCase() !== String(b).toLowerCase();
}

function hasAttr(a: string | null | undefined): boolean {
  return a !== null && a !== undefined && String(a).trim().length > 0;
}

function arrDiff(a: string[] | null | undefined, b: string[] | null | undefined): boolean {
  if (!a || !b) return false;
  if (a.length === 0 || b.length === 0) return false;
  const na = a.map((x) => x.toLowerCase()).sort();
  const nb = b.map((x) => x.toLowerCase()).sort();
  return JSON.stringify(na) !== JSON.stringify(nb);
}

const COMPATIBLE_GRADE_GROUPS: Record<string, Set<string>> = {
  // structural plate grades regarded as reference-related in the prototype
  "E250": new Set(["E250", "E250A", "A36"]),
  "E250A": new Set(["E250", "E250A", "A36"]),
  "A36": new Set(["E250", "E250A", "A36"]),
};

function gradeCompatible(a: string, b: string): boolean {
  const ka = a.toUpperCase();
  const kb = b.toUpperCase();
  if (ka === kb) return true;
  const groupA = COMPATIBLE_GRADE_GROUPS[ka];
  if (groupA && groupA.has(kb)) return true;
  const groupB = COMPATIBLE_GRADE_GROUPS[kb];
  if (groupB && groupB.has(ka)) return true;
  return false;
}

export function evaluateConstraints(
  left: MaterialDNA,
  right: MaterialDNA
): ConstraintResult[] {
  const results: ConstraintResult[] = [];

  // --- Grade constraint ---------------------------------------------------
  if (hasAttr(left.grade.value) && hasAttr(right.grade.value)) {
    if (diffAttr(left.grade.value, right.grade.value)) {
      if (gradeCompatible(String(left.grade.value), String(right.grade.value))) {
        results.push(
          makeResult(
            "grade",
            "Grade",
            "WARNING",
            "WARNING",
            String(left.grade.value),
            String(right.grade.value),
            "reference-grade-compatible",
            "Reference grades are related; equivalence should be confirmed by engineering review."
          )
        );
      } else {
        results.push(
          makeResult(
            "grade",
            "Grade",
            "CRITICAL",
            "CONFLICT",
            String(left.grade.value),
            String(right.grade.value),
            "critical-grade-mismatch",
            `Material property class differs: ${left.grade.value} vs ${right.grade.value}.`
          )
        );
      }
    }
  }

  // --- Material composition constraint ------------------------------------
  if (hasAttr(left.material.value) && hasAttr(right.material.value)) {
    const lm = String(left.material.value).toLowerCase();
    const rm = String(right.material.value).toLowerCase();
    // stainless grades captured in `grade`; treat material family literal compare.
    if (lm !== rm) {
      results.push(
        makeResult(
          "material",
          "Material",
          "CRITICAL",
          "CONFLICT",
          String(left.material.value),
          String(right.material.value),
          "critical-material-mismatch",
          `Material composition differs: ${left.material.value} vs ${right.material.value}.`
        )
      );
    }
  }

  // --- Dimensions constraint ----------------------------------------------
  if ((left.dimensions.value?.length ?? 0) > 0 && (right.dimensions.value?.length ?? 0) > 0) {
    if (arrDiff(left.dimensions.value, right.dimensions.value)) {
      results.push(
        makeResult(
          "dimensions",
          "Dimensions",
          "CRITICAL",
          "CONFLICT",
          left.dimensions.value!.join("; "),
          right.dimensions.value!.join("; "),
          "critical-dimension-mismatch",
          "Stated dimensions differ between the records."
        )
      );
    }
  } else if ((left.dimensions.value?.length ?? 0) > 0 !== (right.dimensions.value?.length ?? 0) > 0) {
    results.push(
      makeResult(
        "dimensions",
        "Dimensions",
        "WARNING",
        "UNKNOWN",
        left.dimensions.value?.join("; ") ?? "not stated",
        right.dimensions.value?.join("; ") ?? "not stated",
        "dimension-unknown",
        "Dimensions are stated on one side only."
      )
    );
  }

  // --- Standard constraint ------------------------------------------------
  if ((left.standard.value?.length ?? 0) > 0 && (right.standard.value?.length ?? 0) > 0) {
    const miss1 = right.standard.value!.filter(
      (s) => !left.standard.value!.some((x) => equivalentStandard(x, s))
    );
    const miss2 = left.standard.value!.filter(
      (s) => !right.standard.value!.some((x) => equivalentStandard(x, s))
    );
    if (miss1.length > 0 || miss2.length > 0) {
      // Reference relationships, not certified equivalence.
      results.push(
        makeResult(
          "standard",
          "Standard",
          "CRITICAL",
          "CONFLICT",
          left.standard.value!.join("; "),
          right.standard.value!.join("; "),
          "critical-standard-mismatch",
          "Standards differ; engineering review needed to confirm a reference relationship."
        )
      );
    }
  }

  // --- Pressure class constraint ------------------------------------------
  if (hasAttr(left.classPressure.value) && hasAttr(right.classPressure.value)) {
    if (diffAttr(left.classPressure.value, right.classPressure.value)) {
      results.push(
        makeResult(
          "classPressure",
          "Pressure Class",
          "CRITICAL",
          "CONFLICT",
          String(left.classPressure.value),
          String(right.classPressure.value),
          "critical-pressure-class-mismatch",
          "Pressure class differs."
        )
      );
    }
  }

  // --- Schedule constraint -------------------------------------------------
  if (hasAttr(left.schedule.value) && hasAttr(right.schedule.value)) {
    if (diffAttr(left.schedule.value, right.schedule.value)) {
      results.push(
        makeResult(
          "schedule",
          "Schedule",
          "CRITICAL",
          "CONFLICT",
          String(left.schedule.value),
          String(right.schedule.value),
          "critical-schedule-mismatch",
          "Pipe schedule differs."
        )
      );
    }
  }

  // --- Thread constraint ---------------------------------------------------
  if (hasAttr(left.thread.value) && hasAttr(right.thread.value)) {
    if (diffAttr(left.thread.value, right.thread.value)) {
      results.push(
        makeResult(
          "thread",
          "Thread",
          "CRITICAL",
          "CONFLICT",
          String(left.thread.value),
          String(right.thread.value),
          "critical-thread-mismatch",
          "Thread specification differs."
        )
      );
    }
  }

  // --- Electrical rating constraint ---------------------------------------
  const le = (left.electrical.value ?? []).map((x) => x.toLowerCase()).sort();
  const re = (right.electrical.value ?? []).map((x) => x.toLowerCase()).sort();
  if (le.length > 0 && re.length > 0) {
    if (JSON.stringify(le) !== JSON.stringify(re)) {
      const conflict = le.some((x) => !re.includes(x)) || re.some((x) => !le.includes(x));
      if (conflict) {
        results.push(
          makeResult(
            "electrical",
            "Electrical Rating",
            "CRITICAL",
            "CONFLICT",
            left.electrical.value!.join("; "),
            right.electrical.value!.join("; "),
            "critical-electrical-rating-mismatch",
            "Electrical rating values differ."
          )
        );
      }
    }
  }

  // --- Material type constraint -------------------------------------------
  if (hasAttr(left.materialType.value) && hasAttr(right.materialType.value)) {
    if (diffAttr(left.materialType.value, right.materialType.value)) {
      results.push(
        makeResult(
          "materialType",
          "Material Type",
          "CRITICAL",
          "CONFLICT",
          String(left.materialType.value),
          String(right.materialType.value),
          "critical-type-mismatch",
          "Material type differs."
        )
      );
    }
  }

  return results;
}

export function criticalConflicts(results: ConstraintResult[]): ConstraintResult[] {
  return results.filter(
    (r) => r.severity === "CRITICAL" && r.status === "CONFLICT"
  );
}

export function warnings(results: ConstraintResult[]): ConstraintResult[] {
  return results.filter((r) => r.severity === "WARNING" || r.status === "WARNING");
}

function equivalentStandard(a: string, b: string): boolean {
  const na = a.toLowerCase().replace(/\s+/g, " ");
  const nb = b.toLowerCase().replace(/\s+/g, " ");
  if (na === nb) return true;
  // Reference relationship: DIN 931 <-> ISO 4014, IS 2062 <-> ASTM A36 (grouped)
  const refGroups: Record<string, string> = {
    "din 931": "iso 4014",
    "iso 4014": "din 931",
    "din 933": "iso 4017",
    "iso 4017": "din 933",
    "is 2062": "astm a36",
    "astm a36": "is 2062",
    "ansi b16.5": "asme b16.5",
    "asme b16.5": "ansi b16.5",
  };
  return refGroups[na] === nb || refGroups[nb] === na;
}

// Re-export for scoring: penalty derived from conflicts.
export function conflictPenalty(results: ConstraintResult[]): number {
  const criticals = criticalConflicts(results);
  if (criticals.length === 0) return 0;
  return Math.min(100, criticals.length * 55);
}

// Evidence coverage proxy shared with decisioning.
export function evidenceAttainment(dna: MaterialDNA): number {
  return dna.evidenceCoverage ?? 0;
}

export function requiresHumanReview(dnaA: MaterialDNA, dnaB: MaterialDNA): boolean {
  const aFields = (Object.keys(dnaA) as (keyof MaterialDNA)[]).filter(
    (k) => k !== "confidence" && k !== "evidenceCoverage"
  );
  let missing = 0;
  for (const k of aFields) {
    const attr = dnaA[k] as { value?: unknown };
    const v = attr?.value;
    const emptyA = v === null || v === undefined || (Array.isArray(v) && v.length === 0);
    const attrB = dnaB[k] as { value?: unknown };
    const b = attrB?.value;
    const emptyB = b === null || b === undefined || (Array.isArray(b) && b.length === 0);
    if (emptyA && !emptyB) missing++;
    if (!emptyA && emptyB) missing++;
  }
  return missing >= 2;
}

// Central guard: similarity can never override a critical conflict.
export function vetoesMatch(results: ConstraintResult[]): boolean {
  return criticalConflicts(results).length > 0;
}

// Re-export for decision configuration.
export const minEvidenceThreshold = CONFIG.MIN_EVIDENCE_COVERAGE;

// Prevent unused-import lint for CONFIG if threshold refactored later.
void minEvidenceThreshold;