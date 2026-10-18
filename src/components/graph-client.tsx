"use client";
import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  GitBranch,
  MousePointer2,
  ShieldCheck,
} from "lucide-react";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { canonicalMaterials, materialRecords } from "@/data/demo";
import { generateCandidates } from "@/lib/material-dna/matching";

export function GraphClient() {
  const [selectedId, setSelectedId] = useState(
    canonicalMaterials[0].canonicalId,
  );
  const [selectedNode, setSelectedNode] = useState("canonical");
  const canonical =
    canonicalMaterials.find((c) => c.canonicalId === selectedId) ??
    canonicalMaterials[0];
  const blocked = useMemo(
    () =>
      generateCandidates(
        {
          id: "GRAPH-INPUT",
          source: "CPSE-A",
          sourceCode: "GRAPH",
          rawDescription: canonical.normalizedDescription,
          normalizedDescription: canonical.normalizedDescription,
          dna: canonical.dna,
        },
        materialRecords,
      )
        .filter(
          (c) => c.criticalConflicts.length > 0 && c.similarityScore >= 65,
        )
        .sort((a, b) => b.similarityScore - a.similarityScore)[0] ?? null,
    [canonical],
  );
  const mappings = canonical.legacyMappings;
  const mapping = selectedNode.startsWith("source-")
    ? mappings[Number(selectedNode.replace("source-", ""))]
    : null;
  function activate(event: React.KeyboardEvent<SVGGElement>, id: string) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setSelectedNode(id);
    }
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="page-eyebrow">Connections / Source lineage</div>
          <h1 className="text-3xl font-semibold tracking-tight text-dna-text">
            Constraint-Aware Material Identity Graph
          </h1>
          <p className="mt-2 max-w-3xl text-xs leading-7 text-dna-muted">
            Explore how source records connect to a proposed identity, and why
            similar materials must sometimes stay apart.
          </p>
        </div>
        <DemoBadge />
      </div>
      <div className="flex flex-wrap gap-2">
        <span className="py-2 text-[10px] uppercase tracking-wider text-dna-faint">
          Canonical identity:
        </span>
        {canonicalMaterials.map((c) => (
          <button
            key={c.canonicalId}
            onClick={() => {
              setSelectedId(c.canonicalId);
              setSelectedNode("canonical");
            }}
            aria-label={`Show graph for ${c.canonicalId}`}
            className={`rounded-lg border px-3 py-2 font-mono text-[10px] ${selectedId === c.canonicalId ? "border-dna-cyan/50 bg-dna-cyan/5 text-dna-cyan" : "border-dna-border bg-white text-dna-muted"}`}
          >
            {c.materialType} ·{" "}
            {String(
              c.dna.grade.value ??
                c.dna.dimensions.value?.[0] ??
                c.canonicalId.slice(-4),
            )}
          </button>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_290px]">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-dna-border px-5 py-4">
            <h2 className="flex items-center gap-2 text-xs font-semibold">
              <GitBranch
                aria-hidden="true"
                size={15}
                className="text-dna-cyan"
              />
              Source-to-identity map
            </h2>
            <span className="flex items-center gap-1 text-[10px] text-dna-faint">
              <MousePointer2 aria-hidden="true" size={12} />
              Select a node
            </span>
          </div>
          <svg
            className="h-auto w-full"
            viewBox="0 0 620 360"
            role="group"
            aria-label={`Identity graph for ${canonical.canonicalId}`}
          >
            <defs>
              <pattern
                id="identity-grid"
                width="22"
                height="22"
                patternUnits="userSpaceOnUse"
              >
                <circle cx="1" cy="1" r=".7" fill="#dce6e9" />
              </pattern>
            </defs>
            <rect width="620" height="360" fill="url(#identity-grid)" />
            {mappings.map((m, i) => {
              const angle =
                (i / Math.max(mappings.length, 1)) * 2 * Math.PI - Math.PI / 2;
              const x = 250 + Math.cos(angle) * 133,
                y = 175 + Math.sin(angle) * 120;
              return (
                <g key={m.legacyCode}>
                  <line
                    x1="250"
                    y1="175"
                    x2={x}
                    y2={y}
                    stroke="#8abca8"
                    strokeWidth="1.5"
                  />
                  <g
                    className="graph-node-button"
                    role="button"
                    tabIndex={0}
                    aria-label={`Inspect source ${m.legacyCode}`}
                    onClick={() => setSelectedNode(`source-${i}`)}
                    onKeyDown={(e) => activate(e, `source-${i}`)}
                  >
                    <circle
                      cx={x}
                      cy={y}
                      r="29"
                      fill={selectedNode === `source-${i}` ? "#d6eee2" : "#fff"}
                      stroke="#9abdaa"
                      strokeWidth="1.5"
                    />
                    <text
                      x={x}
                      y={y + 3}
                      textAnchor="middle"
                      fontSize="9"
                      fill="#365f50"
                    >
                      {m.source}
                    </text>
                    <text
                      x={x}
                      y={y + 45}
                      textAnchor="middle"
                      fontSize="8"
                      fill="#506672"
                    >
                      {m.legacyCode.length > 21
                        ? m.legacyCode.slice(0, 19) + "…"
                        : m.legacyCode}
                    </text>
                  </g>
                </g>
              );
            })}
            {blocked && (
              <g>
                <line
                  x1="293"
                  y1="175"
                  x2="515"
                  y2="175"
                  stroke="#cf8c96"
                  strokeWidth="1.5"
                  strokeDasharray="5 5"
                />
                <rect
                  x="411"
                  y="161"
                  width="50"
                  height="27"
                  rx="13"
                  fill="#fff3f4"
                  stroke="#e6b8c0"
                />
                <text
                  x="436"
                  y="179"
                  textAnchor="middle"
                  fontSize="9"
                  fill="#b34a59"
                >
                  VETO
                </text>
                <g
                  className="graph-node-button"
                  role="button"
                  tabIndex={0}
                  aria-label="Inspect blocked candidate"
                  onClick={() => setSelectedNode("blocked")}
                  onKeyDown={(e) => activate(e, "blocked")}
                >
                  <circle
                    cx="545"
                    cy="175"
                    r="29"
                    fill={selectedNode === "blocked" ? "#f7dce1" : "#fff5f6"}
                    stroke="#d38d99"
                  />
                  <text
                    x="545"
                    y="178"
                    textAnchor="middle"
                    fontSize="8"
                    fill="#ad5263"
                  >
                    Blocked
                  </text>
                  <text
                    x="545"
                    y="219"
                    textAnchor="middle"
                    fontSize="8"
                    fill="#ad5263"
                  >
                    {blocked.similarityScore}% similarity
                  </text>
                </g>
              </g>
            )}
            <g
              className="graph-node-button"
              role="button"
              tabIndex={0}
              aria-label="Inspect canonical identity"
              onClick={() => setSelectedNode("canonical")}
              onKeyDown={(e) => activate(e, "canonical")}
            >
              <circle
                cx="250"
                cy="175"
                r="44"
                fill="#173c35"
                stroke="#2d8e70"
                strokeWidth="2"
              />
              <circle cx="250" cy="160" r="5" fill="#8cddbd" />
              <text
                x="250"
                y="180"
                textAnchor="middle"
                fontSize="9"
                fill="#d9f3e7"
              >
                {canonical.materialType}
              </text>
              <text
                x="250"
                y="194"
                textAnchor="middle"
                fontSize="7"
                fill="#95c5ae"
              >
                PROPOSED IDENTITY
              </text>
            </g>
          </svg>
          <div className="flex flex-wrap gap-5 border-t border-dna-border px-5 py-3 text-[10px] text-dna-muted">
            <span>
              <span className="mr-2 inline-block h-0.5 w-5 bg-[#8abca8]" />
              Demonstration legacy mapping
            </span>
            <span>
              <span className="mr-2 inline-block w-5 border-t border-dashed border-dna-red" />
              Computed critical conflict
            </span>
          </div>
        </Card>
        <Card className="p-5">
          <div className="page-eyebrow">Node inspector</div>
          {selectedNode === "blocked" && blocked ? (
            <>
              <Badge tone="red">DO NOT MERGE</Badge>
              <h2 className="mt-4 font-mono text-sm font-semibold">
                {blocked.targetRecord.sourceCode}
              </h2>
              <p className="mt-3 text-xs leading-6 text-dna-muted">
                {blocked.targetRecord.rawDescription}
              </p>
              <div className="mt-5 space-y-3">
                {blocked.criticalConflicts.map((c) => (
                  <div
                    key={c.rule}
                    className="rounded-lg border border-dna-red/20 bg-dna-red/5 p-3"
                  >
                    <strong className="text-xs text-dna-red">
                      {c.attributeLabel}
                    </strong>
                    <p className="mt-1 text-xs leading-6 text-dna-muted">
                      {c.explanation}
                    </p>
                  </div>
                ))}
              </div>
            </>
          ) : mapping ? (
            <>
              <Badge tone="blue">SOURCE RECORD</Badge>
              <h2 className="mt-4 break-all font-mono text-sm font-semibold">
                {mapping.legacyCode}
              </h2>
              <p className="mt-2 text-xs text-dna-cyan">{mapping.source}</p>
              <p className="mt-4 text-xs leading-7 text-dna-muted">
                {mapping.sourceDescription}
              </p>
              <p className="mt-5 text-[10px] leading-6 text-dna-faint">
                Mapped to the selected proposed identity in the synthetic
                corpus.
              </p>
            </>
          ) : (
            <>
              <Badge tone="green">{canonical.status}</Badge>
              <h2 className="mt-4 text-lg font-semibold">
                {canonical.materialType}
              </h2>
              <p className="mt-3 text-xs leading-7 text-dna-muted">
                {canonical.normalizedDescription}
              </p>
              <code className="mt-4 block break-all rounded-lg border border-dna-border bg-dna-panel2 p-3 text-[10px] leading-6 text-dna-cyan">
                {canonical.canonicalId}
              </code>
              <p className="mt-4 flex items-center gap-2 text-xs text-dna-muted">
                <ArrowUpRight aria-hidden="true" size={14} />
                {mappings.length} linked source records
              </p>
              <p className="mt-4 text-[10px] leading-6 text-dna-faint">
                Proposed canonical representation · Not an official national
                code.
              </p>
            </>
          )}
        </Card>
      </div>
      <Card className="flex items-start gap-3 p-5">
        <ShieldCheck
          aria-hidden="true"
          size={20}
          className="shrink-0 text-dna-cyan"
        />
        <div>
          <h3 className="text-xs font-semibold">
            A link is a relationship, not a licence to merge
          </h3>
          <p className="mt-2 text-xs leading-7 text-dna-muted">
            Candidate links are probabilistic; engineering constraints and
            evidence govern a recommendation. Solid edges show synthetic legacy
            mappings. Dashed red edges show a computed incompatible candidate.
            National governance and shared approvals remain future work.
          </p>
        </div>
      </Card>
    </div>
  );
}
