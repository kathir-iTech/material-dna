import type { CandidateScore } from "@/types/domain";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// One place for the named scoring techniques, so every surface shows the same
// labels with the same one-line definition.
// ---------------------------------------------------------------------------

export const SCORE_DEFINITIONS = {
  tokenOverlap: "Shared words between the two descriptions",
  diceSimilarity: "Shared character patterns",
  tfidfSimilarity:
    "Weighted by how distinctive each word is across the whole material catalogue",
  attributeAgreement: "Structured engineering attributes that agree",
} as const;

type NamedScoreKey = keyof typeof SCORE_DEFINITIONS;

const NAMED_SUBSCORES: Array<{ key: NamedScoreKey; label: string }> = [
  { key: "tokenOverlap", label: "Token overlap" },
  { key: "diceSimilarity", label: "Dice similarity" },
  { key: "tfidfSimilarity", label: "TF-IDF" },
  { key: "attributeAgreement", label: "Attribute agreement" },
];

/**
 * Vertical labelled rows — "Token overlap: 85%" — each carrying its one-line
 * definition as a native tooltip (hover only, no click, no modal).
 */
export function SubScoreList({
  score,
  outcome = false,
  className,
}: {
  score: CandidateScore;
  outcome?: boolean;
  className?: string;
}) {
  return (
    <ul className={cn("space-y-1 font-mono text-xs", className)}>
      {NAMED_SUBSCORES.map(({ key, label }) => (
        <li
          key={key}
          title={SCORE_DEFINITIONS[key]}
          className="flex items-center justify-between gap-3"
        >
          <span className="text-dna-muted">{label}:</span>
          <span className="text-dna-text">{score[key]}%</span>
        </li>
      ))}
      {outcome && (
        <>
          <li className="flex items-center justify-between gap-3 border-t border-dna-border pt-1">
            <span className="text-dna-muted">Conflict penalty:</span>
            <span className="text-dna-red">-{score.conflictPenalty}</span>
          </li>
          <li className="flex items-center justify-between gap-3">
            <span className="text-dna-muted">Final score:</span>
            <span className="text-dna-cyan">{score.finalScore}%</span>
          </li>
        </>
      )}
    </ul>
  );
}

/**
 * Visible one-line definitions for each named sub-score. Used where there is
 * room to explain the technique on screen (no hover required).
 */
export function SubScoreHelp({ className }: { className?: string }) {
  return (
    <ul className={cn("mt-2 space-y-0.5 text-[10px] leading-3", className)}>
      {NAMED_SUBSCORES.map(({ key, label }) => (
        <li key={key} className="text-dna-faint">
          <span className="text-dna-muted">{label}:</span> {SCORE_DEFINITIONS[key]}
        </li>
      ))}
    </ul>
  );
}
