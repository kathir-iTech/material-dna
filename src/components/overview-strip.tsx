import { datasetStats } from "@/lib/material-dna/dataset-stats";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export function OverviewStrip() {
  const stats = datasetStats();
  const items = [
    { label: "Material records in demo", value: stats.recordCount },
    { label: "Candidate matches", value: stats.candidateLinks },
    { label: "Reviews pending", value: stats.reviewsPending },
    { label: "Critical conflicts among candidates", value: stats.criticalConflicts },
    { label: "Canonical identities", value: stats.canonicalCount },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map((item) => (
        <Card key={item.label} className="flex flex-col px-3 py-2">
          <span className="font-mono text-lg font-semibold text-dna-text">{item.value}</span>
          <span className="text-[11px] text-dna-muted">{item.label}</span>
        </Card>
      ))}
      <Badge tone="purple" className="self-center">DEMONSTRATION DATA</Badge>
    </div>
  );
}