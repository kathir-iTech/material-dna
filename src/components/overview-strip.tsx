import { Boxes, GitBranch, Network, ShieldCheck } from "lucide-react";
import { datasetStats } from "@/lib/material-dna/dataset-stats";
import { corpusClusters } from "@/lib/material-dna/clusters";
import { materialRecords } from "@/data/demo";
export function OverviewStrip() {
  const stats = datasetStats();
  const clusters = corpusClusters();
  const items = [
    {
      label: "Material records",
      value: stats.recordCount,
      note: "Synthetic reference corpus",
      icon: Boxes,
      color: "mint",
    },
    {
      label: "Source systems",
      value: new Set(materialRecords.map((r) => r.source)).size,
      note: "Demonstration source labels",
      icon: Network,
      color: "blue",
    },
    {
      label: "Identity clusters",
      value: clusters.clusters.length,
      note: "Submitted engine clustering",
      icon: GitBranch,
      color: "violet",
    },
    {
      label: "Unsafe links held out",
      value: clusters.vetoedProposals.length,
      note: "High similarity, critical conflict",
      icon: ShieldCheck,
      color: "rose",
    },
  ];
  return (
    <section className="metric-grid" aria-label="Reference corpus statistics">
      {items.map(({ label, value, note, icon: Icon, color }) => (
        <div className="metric-card" key={label}>
          <div className="metric-label">
            {label}
            <span className={`metric-icon ${color}`}>
              <Icon aria-hidden="true" size={18} strokeWidth={1.7} />
            </span>
          </div>
          <div className="metric-value">
            {value}
            <span className="metric-rule" />
          </div>
          <p>{note}</p>
        </div>
      ))}
    </section>
  );
}
