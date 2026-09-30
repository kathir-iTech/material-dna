// Centralized configuration for the Material DNA prototype.
// Prototype thresholds; must be calibrated on real CPSE data.
export const ENGINE_VERSION = "Material DNA Engine";
export const ENGINE_VERSION_NUMBER = "v0.1-demo";
export const PARSER_VERSION = "v0.1";
export const CONSTRAINTS_VERSION = "v0.1";

export const CONFIG = {
  // Composite candidate score weights
  WEIGHTS: {
    SEMANTIC: 0.45,
    ATTRIBUTE: 0.35,
    EVIDENCE: 0.2,
  },

  // Decision thresholds (0-100)
  MATCH_THRESHOLD: 85,
  REVIEW_THRESHOLD: 65,
  MIN_EVIDENCE_COVERAGE: 40,
  MIN_SCORE_TO_RENDER: 10,

  // Similarity blend: lexical token overlap + character (Dice) + corpus TF-IDF
  SIMILARITY: {
    TOKEN_WEIGHT: 0.45,
    CHARACTER_WEIGHT: 0.3,
    TFIDF_WEIGHT: 0.25,
    // Dense-retrieval signal (transformers.js cosine), FUSED into the blend
    // only when a caller supplies one — never a decision input. When active,
    // the three weights above are scaled by (1 - EMBEDDING_WEIGHT) so the
    // blend still sums to 1.0. The veto (decide() critical-conflict branch)
    // runs after scoring and is unaffected by any weight.
    EMBEDDING_WEIGHT: 0.15,
  },

  DEPLOYMENT_BADGE: "PROTOTYPE",
  MODE_BADGE: "DEMO MODE",
} as const;

// Attribute metadata used across engine + UI. Order matters for display.
export const ATTRIBUTE_META: Record<
  string,
  { label: string; weight: number; critical: boolean }
> = {
  materialType: { label: "Material Type", weight: 0.15, critical: true },
  material: { label: "Material", weight: 0.15, critical: true },
  grade: { label: "Grade", weight: 0.15, critical: true },
  dimensions: { label: "Dimensions", weight: 0.17, critical: true },
  standard: { label: "Standard", weight: 0.15, critical: true },
  coating: { label: "Coating", weight: 0.07, critical: false },
  classPressure: { label: "Pressure Class", weight: 0.1, critical: true },
  schedule: { label: "Schedule", weight: 0.06, critical: true },
  thread: { label: "Thread", weight: 0.05, critical: true },
  electrical: { label: "Electrical Rating", weight: 0.1, critical: true },
  quantity: { label: "Quantity", weight: 0.0, critical: false },
} as const;

export const ATTRIBUTE_META_LIST = Object.entries(ATTRIBUTE_META).map(
  ([key, meta]) => ({ key, ...meta })
);