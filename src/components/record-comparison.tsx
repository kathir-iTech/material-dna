import { ArrowUpRight } from "lucide-react";
import type { MaterialDNA, ResolutionResult } from "@/types/domain";
const FIELDS = [
  { key: "materialType", label: "Type" },
  { key: "grade", label: "Grade" },
  { key: "dimensions", label: "Size" },
  { key: "standard", label: "Standard" },
  { key: "classPressure", label: "Pressure" },
] as const;
export function RecordComparison({ result }: { result: ResolutionResult }) {
  const target = result.selectedCandidate?.targetRecord;
  const conflicts = new Set(
    result.selectedCandidate?.criticalConflicts.flatMap((c) => c.attributes) ??
      [],
  );
  const record = (
    label: string,
    description: string,
    dna: MaterialDNA,
    source: string,
  ) => (
    <article className="comparison-record">
      <h3>
        {label}
        <span>
          {source}{" "}
          <ArrowUpRight aria-hidden="true" className="inline" size={11} />
        </span>
      </h3>
      <p>{description}</p>
      <div className="attribute-comparison">
        {FIELDS.map(({ key, label }) => {
          const value = dna[key].value;
          if (!value || (Array.isArray(value) && !value.length)) return null;
          return (
            <span
              key={key}
              className={`attribute-token ${conflicts.has(key) ? "is-conflict" : ""}`}
            >
              <small>{label}</small>
              {Array.isArray(value) ? value.join(", ") : value}
            </span>
          );
        })}
      </div>
    </article>
  );
  return (
    <div className="comparison-grid">
      {record(
        "Your material",
        result.input.rawDescription,
        result.dna,
        "INPUT",
      )}
      {target &&
        record(
          "Selected reference",
          target.rawDescription,
          target.dna,
          target.sourceCode,
        )}
    </div>
  );
}
