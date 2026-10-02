import { cn } from "@/lib/utils";
import type { ExtractionStep } from "@/types/domain";
import { Check, Loader2 } from "lucide-react";

export function ProcessingSteps({ steps }: { steps: ExtractionStep[] }) {
  return (
    <ol className="space-y-1.5">
      {steps.map((step) => {
        const isActive = step.status === "active";
        const isComplete = step.status === "complete";
        return (
          <li
            key={step.index}
            className={cn(
              "flex items-center gap-2.5 font-mono text-xs",
              isComplete
                ? "text-dna-text"
                : isActive
                  ? "text-dna-cyan"
                  : "text-dna-faint"
            )}
            aria-live="polite"
          >
            <span className="w-6 text-right text-dna-faint">
              {String(step.index).padStart(2, "0")}
            </span>
            {isComplete ? (
              <Check size={14} className="text-dna-green" aria-hidden="true" />
            ) : isActive ? (
              <Loader2 size={14} className="animate-spin text-dna-cyan" aria-hidden="true" />
            ) : (
              <span className="block h-3.5 w-3.5 rounded-full border border-dna-border2" />
            )}
            <span>{step.label}</span>
            {step.detail && (
              <span className="text-dna-faint">— {step.detail}</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}