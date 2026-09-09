export type DecisionStatus = "MATCH" | "DO_NOT_MERGE" | "REVIEW" | "NO_MATCH";

export type ConstraintStatus = "PASS" | "WARNING" | "CONFLICT" | "UNKNOWN";

export type ConstraintSeverity = "INFO" | "WARNING" | "CRITICAL";

export type SourceName =
  | "CPSE-A"
  | "CPSE-B"
  | "CPSE-C"
  | "Legacy ERP"
  | "Supplier Catalog"
  | "Shop";

export interface AttributeEvidence {
  sourceText: string;
  span: string;
  normalizedValue: string;
  confidence: number;
  extractor: string;
}

export interface Attribute<T = string> {
  key: string;
  label: string;
  value: T | null;
  confidence: number;
  evidence: AttributeEvidence | null;
}

export interface MaterialDNA {
  materialType: Attribute<string>;
  material: Attribute<string>;
  grade: Attribute<string>;
  dimensions: Attribute<string[]>;
  standard: Attribute<string[]>;
  coating: Attribute<string>;
  classPressure: Attribute<string>;
  schedule: Attribute<string>;
  thread: Attribute<string>;
  electrical: Attribute<string[]>;
  quantity: Attribute<string[]>;
  confidence: number;
  evidenceCoverage: number;
}

export interface MaterialRecord {
  id: string;
  source: SourceName;
  sourceCode: string;
  rawDescription: string;
  normalizedDescription: string;
  dna: MaterialDNA;
}

export interface ConstraintResult {
  attributes: string[];
  severity: ConstraintSeverity;
  status: ConstraintStatus;
  leftValue: string;
  rightValue: string;
  rule: string;
  explanation: string;
  attributeLabel: string;
}

export interface CandidateScore {
  semanticSimilarity: number;
  attributeAgreement: number;
  conflictPenalty: number;
  evidenceCoverage: number;
  finalScore: number;
}

export interface CandidateMatch {
  sourceRecord: MaterialRecord;
  targetRecord: MaterialRecord;
  similarityScore: number;
  attributeScore: number;
  constraints: ConstraintResult[];
  criticalConflicts: ConstraintResult[];
  evidenceCoverage: number;
  decision: DecisionStatus;
  reason: string;
  ruleTrace: string[];
  scoreDetails?: CandidateScore;
  explanation?: MatchExplanation;
}

export interface CanonicalMaterial {
  canonicalId: string;
  materialType: string;
  normalizedIdentity: string;
  normalizedDescription: string;
  dna: MaterialDNA;
  legacyMappings: LegacyMapping[];
  sources: SourceName[];
  governedAt: string;
  status: "GOVERNED" | "PROPOSED" | "PENDING";
}

export interface LegacyMapping {
  source: SourceName;
  legacyCode: string;
  sourceDescription: string;
}

export interface AuditEvent {
  at: string;
  label: string;
  detail?: string;
}

export interface ReviewCase {
  id: string;
  materialA: MaterialRecord;
  materialB: MaterialRecord;
  risk: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  systemRecommendation: DecisionStatus;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "OVERRIDDEN";
  confidence: number;
  createdAt: string;
  reviewerNote?: string;
  reviewerDecisionAt?: string;
}

export interface ResolutionInput {
  description: string;
}

export interface ScoredCandidateComparison {
  candidate: CandidateMatch;
  explanation: MatchExplanation;
}

export interface MatchExplanation {
  evidence: string[];
  conflicts: string[];
  unknowns: string[];
  summary: string;
}

export interface ScoredCandidate extends CandidateMatch {
  scoreDetails: CandidateScore;
  explanation: MatchExplanation;
}

export interface ExtractionStep {
  index: number;
  label: string;
  detail?: string;
  status: "pending" | "active" | "complete";
}

export interface ResolutionResult {
  caseId: string;
  input: MaterialRecord;
  dna: MaterialDNA;
  candidates: ScoredCandidate[];
  selectedCandidate: ScoredCandidate | null;
  decision: DecisionStatus;
  reason: string;
  evidenceCoverage: number;
  risk: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  auditEvents: AuditEvent[];
  engineVersion: string;
  parserVersion: string;
  constraintVersion: string;
  unknownAttributes: string[];
  createdAt: string;
}

export interface CounterfactualChange {
  attribute: keyof MaterialDNA;
  label: string;
  original: string;
  modified: string;
}

export interface CounterfactualResult {
  before: ResolutionResult;
  after: ResolutionResult;
  changed: boolean;
  constraintsActivated: string[];
  beforeDecision: DecisionStatus;
  afterDecision: DecisionStatus;
}

export interface BenchmarkResult {
  name: string;
  datasetType: string;
  purpose: string;
  result: string;
  limitation: string;
  label: "EXPERIMENTAL" | "PROTOTYPE" | "PROPOSED" | "FUTURE";
}

export interface DemoScenario {
  id: string;
  title: string;
  description: string;
  input: string;
  expectedDecision: DecisionStatus;
  expectedReason: string;
  corpusFilter?: {
    grade?: string[];
    excludeSourceCodes?: string[];
  };
}