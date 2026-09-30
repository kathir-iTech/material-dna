import { materialRecords } from "@/data/demo";
import { corpusClusters } from "@/lib/material-dna/clusters";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardBody } from "@/components/ui/card";

// ---------------------------------------------------------------------------
// N-source clustering panel — server component, rendered at build time.
// All numbers come from corpusClusters() (one O(n²) pass, memoized); nothing
// below is hand-transcribed.
// ---------------------------------------------------------------------------

function short(text: string, max = 64): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export function ClusteringPanel() {
  const { clusters, singletons, matchEdges, vetoedProposals, mergeRefusals, naiveClosure } =
    corpusClusters();
  const byId = new Map(materialRecords.map((r) => [r.id, r]));

  const stats: Array<{ label: string; value: string; tone?: string }> = [
    { label: "Records", value: String(materialRecords.length) },
    { label: "MATCH edges", value: String(matchEdges.length), tone: "text-dna-cyan" },
    { label: "Clusters", value: String(clusters.length), tone: "text-dna-green" },
    { label: "Singletons", value: String(singletons.length) },
    { label: "Held out by veto", value: String(vetoedProposals.length), tone: "text-dna-amber" },
    { label: "Merge refusals", value: String(mergeRefusals.length) },
  ];

  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            N-source clustering
            <Badge tone="cyan">CONSTRAINT-AWARE MVP</Badge>
          </span>
        }
        subtitle="Connected components over decide()=MATCH pairs, refusing to merge across any pair that carries an engineering-critical conflict — a veto splits the component instead of being merged through."
      />
      <CardBody className="space-y-5">
        <p className="rounded border border-dna-amber/40 bg-dna-amber/10 px-3 py-2 text-xs text-dna-amber">
          Claim: constraint-aware MVP on the existing {materialRecords.length}-record corpus —
          not production N-source resolution at 50+ CPSE scale (no blocking, no incremental
          re-clustering, no cross-organization governance).
        </p>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {stats.map((s) => (
            <div key={s.label} className="rounded border border-dna-border bg-dna-panel2 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-dna-faint">{s.label}</p>
              <p className={`font-mono text-lg ${s.tone ?? "text-dna-text"}`}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="rounded border border-dna-border2 px-3 py-2 text-xs text-dna-muted">
          <span className="text-dna-text">Similarity-only contrast:</span> transitive closure over
          the {naiveClosure.edges} pairs at similarity &ge; 85 (decisions ignored) yields{" "}
          <span className="font-mono text-dna-red">{naiveClosure.multiClusters} clusters</span>,
          of which{" "}
          <span className="font-mono text-dna-red">{naiveClosure.poisoned}</span> contain an
          engineering-critical conflict internally. The constraint-aware result above is{" "}
          <span className="font-mono text-dna-green">{clusters.length} clusters</span> with{" "}
          <span className="font-mono text-dna-green">0</span> internal conflicts.{" "}
          {mergeRefusals.length === 0
            ? "Merge refusals: 0 on this corpus — decide() already vetoes every breaker at the edge level; the cross-component guard (unit-tested) is the backstop that keeps that true if thresholds or tables change."
            : null}
        </div>

        <div>
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-dna-cyan">
            Clusters
          </h4>
          <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {clusters.map((c) => (
              <div key={c.id} className="rounded border border-dna-border bg-dna-panel p-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-dna-cyan">{c.id}</span>
                  <Badge tone="neutral">{c.members.length} records</Badge>
                </div>
                <ul className="mt-2 space-y-1.5">
                  {c.members.map((id) => {
                    const r = byId.get(id);
                    if (!r) return null;
                    return (
                      <li key={id} className="text-xs">
                        <span className="font-mono text-dna-text">{r.sourceCode}</span>{" "}
                        <span className="text-dna-faint">({r.source})</span>
                        <p className="text-[11px] text-dna-muted">{short(r.rawDescription)}</p>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-dna-faint">
            {singletons.length} records remain singletons (no decide()=MATCH edge).
          </p>
        </div>

        <div>
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-dna-amber">
            Held out by veto — high-similarity pairs the constraint engine refuses to chain
          </h4>
          <p className="mt-1 text-[11px] text-dna-muted">
            {vetoedProposals.length} pairs at similarity &ge; 85 carry an engineering-critical
            conflict. These are the transitivity-breaker legs: similarity would chain them into a
            cluster; the veto keeps the endpoints apart (six of them are pinned as named test
            fixtures in <code className="font-mono">tests/clustering.test.ts</code>).
          </p>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-dna-border2 text-left text-[10px] uppercase tracking-wider text-dna-faint">
                  <th className="py-1 pr-3 font-medium">Pair</th>
                  <th className="py-1 pr-3 font-medium">Sim</th>
                  <th className="py-1 pr-3 font-medium">Final</th>
                  <th className="py-1 font-medium">Veto rule</th>
                </tr>
              </thead>
              <tbody>
                {vetoedProposals.map((v) => {
                  const a = byId.get(v.left);
                  const b = byId.get(v.right);
                  return (
                    <tr key={`${v.left}|${v.right}`} className="border-b border-dna-border/50">
                      <td className="py-1 pr-3 font-mono text-dna-text">
                        {a?.sourceCode} <span className="text-dna-faint">~</span> {b?.sourceCode}
                      </td>
                      <td className="py-1 pr-3 font-mono text-dna-amber">{v.similarity}</td>
                      <td className="py-1 pr-3 font-mono text-dna-muted">{v.finalScore}</td>
                      <td className="py-1 font-mono text-dna-red">{v.rules.join(", ")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
