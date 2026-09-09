import type {
  CounterfactualChange,
  CounterfactualResult,
  ExtractionStep,
  ResolutionResult,
  ReviewCase,
} from "@/types/domain";

export interface UseResolverReturn {
  description: string;
  setDescription: (d: string) => void;
  phase: "idle" | "processing" | "complete";
  steps: ExtractionStep[];
  result: ResolutionResult | null;
  counterfactual: CounterfactualResult | null;
  reviewQueue: ReviewCase[];
  handleResolve: () => void;
  handleScenario: (input: string) => void;
  reset: () => void;
  sendToReview: () => void;
  dispatchReview: (id: string, action: "APPROVED" | "REJECTED" | "OVERRIDDEN", note?: string) => void;
  runCounterfactual: (change: CounterfactualChange) => void;
}