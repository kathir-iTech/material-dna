import { datasetStats } from "@/lib/material-dna/dataset-stats";
import { corpusClusters } from "@/lib/material-dna/clusters";
import { materialRecords } from "@/data/demo";
export function OverviewStrip() {
  const stats = datasetStats();
  const clusters = corpusClusters();
  const items = [
    {
      label: "Reference records",
      value: stats.recordCount,
      note: "Synthetic descriptions",
    },
    {
      label: "Source systems",
      value: new Set(materialRecords.map((r) => r.source)).size,
      note: "Demonstration labels",
    },
    {
      label: "Identity clusters",
      value: clusters.clusters.length,
      note: "Submitted engine",
    },
    {
      label: "Unsafe links blocked",
      value: clusters.vetoedProposals.length,
      note: "Critical conflicts detected",
    },
  ];
  return (
    <section
      className="corpus-summary"
      aria-label="Reference corpus statistics"
    >
      {items.map(({ label, value, note }) => (
        <div key={label}>
          <strong>{value}</strong>
          <span>
            {label}
            <small>{note}</small>
          </span>
        </div>
      ))}
    </section>
  );
}
