"use client";

import { useState } from "react";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { canonicalMaterials } from "@/data/demo";

interface GraphNode {
  id: string;
  label: string;
  sublabel: string;
  kind: "canonical" | "source" | "description";
}

export function GraphClient() {
  const [selectedId, setSelectedId] = useState<string>(canonicalMaterials[0].canonicalId);
  const [hovered, setHovered] = useState<string | null>(null);

  const canonical = canonicalMaterials.find((c) => c.canonicalId === selectedId) ?? canonicalMaterials[0];
  const toggles = canonicalMaterials.map((c) => c.canonicalId);

  const sourceNodes: GraphNode[] = canonical.legacyMappings.map((m, i) => ({
    id: `src-${i}`,
    label: m.source,
    sublabel: m.legacyCode,
    kind: "source" as const,
  }));

  // Give stable positions around a central canonical node.
  const radius = 190;
  const center = 170;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-dna-text">Constraint-Aware Material Identity Graph</h1>
          <p className="mt-1 max-w-3xl text-sm text-dna-muted">
            Semantic similarity proposes candidate links; engineering constraints govern them;
            evidence explains them; canonical identities connect legacy source records.
          </p>
        </div>
        <DemoBadge />
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="py-1 text-[11px] uppercase tracking-wider text-dna-faint">Canonical identity:</span>
        {toggles.map((id) => (
          <button
            key={id}
            onClick={() => setSelectedId(id)}
            className={`rounded border px-2.5 py-1 font-mono text-[11px] transition-colors ${
              selectedId === id
                ? "border-dna-cyan/60 bg-dna-cyan/10 text-dna-cyan"
                : "border-dna-border2 text-dna-muted hover:text-dna-text"
            }`}
            aria-label={`Show graph for ${id}`}
          >
            {id}
          </button>
        ))}
      </div>

      <Card className="p-4">
        <div className="relative mx-auto h-[420px] max-w-2xl">
          <svg className="h-full w-full" viewBox="0 0 340 340" role="img" aria-label={`Identity graph for ${canonical.canonicalId}`}>
            {/* edges */}
            <line
              x1={center}
              y1={center}
              x2={center}
              y2={40}
              stroke="#2a3a4d"
              strokeWidth="1.5"
              className={hovered && hovered !== "canonical" && !sourceNodes.some((n) => n.id === hovered) ? "opacity-30" : ""}
            />
            <line
              x1={center}
              y1={center}
              x2={center + radius}
              y2={center - radius * 0.35}
              stroke="#2a3a4d"
              strokeWidth="1.5"
            />
            <line
              x1={center}
              y1={center}
              x2={center + radius}
              y2={center + radius * 0.35}
              stroke="#2a3a4d"
              strokeWidth="1.5"
            />
            <line
              x1={center}
              y1={center}
              x2={center - radius * 0.75}
              y2={center + radius * 0.7}
              stroke="#2a3a4d"
              strokeWidth="1.5"
            />
            <line
              x1={center}
              y1={center}
              x2={center + radius * 0.7}
              y2={center - radius * 0.8}
              stroke="#2a3a4d"
              strokeWidth="1.5"
            />

            {/* central canonical node */}
            <g
              transform={`translate(${center} ${center})`}
              className={hovered === "canonical" ? "opacity-60" : ""}
              onMouseEnter={() => setHovered("canonical")}
              onMouseLeave={() => setHovered(null)}
              onClick={() => {}}
            >
              <circle r="34" fill="#10161f" stroke="#22d3ee" strokeWidth="1.5" className="cursor-pointer" />
              <circle r="3" fill="#22d3ee" />
              <text textAnchor="middle" dy="16" fill="#dbe4ee" fontSize="7" fontFamily="monospace">
                {canonical.canonicalId}
              </text>
            </g>

            {/* source nodes */}
            {sourceNodes.slice(0, 5).map((node, i) => {
              const angle = (i / Math.max(sourceNodes.length, 5)) * 2 * Math.PI - Math.PI / 2;
              const x = center + Math.cos(angle) * radius;
              const y = center + Math.sin(angle) * radius;
              return (
                <g
                  key={node.id}
                  transform={`translate(${x} ${y})`}
                  onMouseEnter={() => setHovered(node.id)}
                  onMouseLeave={() => setHovered(null)}
                  className="cursor-pointer"
                >
                  <circle r="24" fill="#151d29" stroke="#60a5fa" strokeWidth="1" className={hovered && hovered !== node.id ? "opacity-40" : ""} />
                  <text textAnchor="middle" dy="2" fill="#8b9cb0" fontSize="6.5" fontFamily="monospace">
                    {node.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-4">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-dna-cyan">Canonical identity</h3>
          <p className="mt-1 font-mono text-lg text-dna-text">{canonical.canonicalId}</p>
          <p className="mt-1 text-xs text-dna-muted">{canonical.normalizedIdentity}</p>
          <Badge tone="green" className="mt-2">{canonical.status}</Badge>
        </Card>

        <Card className="p-4">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-dna-blue">Linked source records</h3>
          <div className="mt-2 space-y-1.5">
            {canonical.legacyMappings.map((m) => (
              <div key={m.legacyCode} className="flex items-center justify-between text-xs">
                <span className="text-dna-muted">{m.source}</span>
                <code className="font-mono text-dna-blue">{m.legacyCode}</code>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-dna-purple">Edge semantics</h3>
          <p className="mt-2 text-xs text-dna-muted">
            <span className="font-mono text-dna-cyan">&quot;mapped to&quot;</span> — legacy code maps to the
            canonical identity. Candidate links are probabilistic; canonical identities are promoted
            only when evidence and constraints support the relationship.
          </p>
        </Card>
      </div>
    </div>
  );
}