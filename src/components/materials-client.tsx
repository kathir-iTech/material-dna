"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { canonicalMaterials } from "@/data/demo";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { CanonicalMaterial } from "@/types/domain";
import { cn } from "@/lib/utils";

export function MaterialsClient() {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(canonicalMaterials[0]?.canonicalId ?? null);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? canonicalMaterials.filter((c) =>
        [c.canonicalId, c.materialType, c.normalizedIdentity, ...c.legacyMappings.map((m) => m.legacyCode)]
          .join(" ")
          .toLowerCase()
          .includes(q)
      )
    : canonicalMaterials;

  const selected = canonicalMaterials.find((c) => c.canonicalId === selectedId) ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-dna-text">Canonical Materials</h1>
          <p className="mt-1 max-w-3xl text-sm text-dna-muted">
            Proposed canonical identities linking equivalent source records across CPSEs.
          </p>
        </div>
        <DemoBadge />
      </div>

      <div className="flex items-center gap-2 rounded border border-dna-border bg-dna-panel px-2.5 py-2">
        <Search size={14} className="shrink-0 text-dna-faint" aria-hidden="true" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by canonical ID, source code, description, standard or grade…"
          className="h-8 w-full bg-transparent text-xs text-dna-text placeholder:text-dna-faint focus:outline-none"
          aria-label="Search canonical materials"
        />
      </div>

      {filtered.length === 0 && (
        <Card className="p-8 text-center text-sm text-dna-faint">No matching materials.</Card>
      )}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[840px] text-left text-xs">
            <thead>
              <tr className="border-b border-dna-border text-[11px] uppercase tracking-wider text-dna-faint">
                <th className="px-4 py-2 font-medium">Canonical ID</th>
                <th className="px-2 py-2 font-medium">Material Type</th>
                <th className="px-2 py-2 font-medium">Normalized Description</th>
                <th className="px-2 py-2 font-medium">Attributes</th>
                <th className="px-2 py-2 font-medium">Linked Legacy Codes</th>
                <th className="px-2 py-2 font-medium">Sources</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.canonicalId}
                  tabIndex={0}
                  role="button"
                  onClick={() => setSelectedId(c.canonicalId)}
                  onKeyDown={(e) => e.key === "Enter" && setSelectedId(c.canonicalId)}
                  className={cn(
                    "cursor-pointer border-b border-dna-border/50 hover:bg-dna-panel2",
                    selectedId === c.canonicalId && "bg-dna-cyan/5"
                  )}
                  aria-label={`Open canonical material ${c.canonicalId}`}
                >
                  <td className="px-4 py-2 font-mono text-dna-cyan">{c.canonicalId}</td>
                  <td className="px-2 py-2 text-dna-text">{c.materialType}</td>
                  <td className="max-w-64 truncate px-2 py-2 font-mono text-dna-muted">{c.normalizedIdentity}</td>
                  <td className="px-2 py-2 font-mono text-dna-muted">
                    {compactAttributes(c)}
                  </td>
                  <td className="px-2 py-2 font-mono text-dna-muted">
                    {c.legacyMappings.length} mappings
                  </td>
                  <td className="px-2 py-2 text-dna-muted">{c.sources.join(", ")}</td>
                  <td className="px-4 py-2">
                    <Badge tone="green">{c.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {selected && (
        <CanonicalDetail canonical={selected} />
      )}
    </div>
  );
}

function compactAttributes(c: CanonicalMaterial): string {
  const parts: string[] = [];
  const dna = c.dna;
  if (dna.grade.value) parts.push("grade " + String(dna.grade.value));
  const dims = dna.dimensions.value ?? [];
  if (dims.length) parts.push(dims.join(" "));
  if (dna.coating.value) parts.push(String(dna.coating.value));
  const stds = dna.standard.value ?? [];
  if (stds.length) parts.push(stds.join(" "));
  return parts.join(" · ");
}

function CanonicalDetail({ canonical }: { canonical: CanonicalMaterial }) {
  const [openSection, setOpenSection] = useState<string | null>("provenance");
  const dna = canonical.dna;

  const toggles: Array<{ id: string; label: string }> = [
    { id: "provenance", label: "Evidence Sources" },
    { id: "attributes", label: "Material DNA" },
  ];

  return (
    <Card>
      <div className="border-b border-dna-border px-4 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold text-dna-cyan">{canonical.canonicalId}</h2>
          <Badge tone="green">{canonical.status}</Badge>
          <span className="font-mono text-[11px] text-dna-faint">Governed {canonical.governedAt}</span>
        </div>
        <p className="mt-2 max-w-2xl font-mono text-sm text-dna-text">
          {canonical.normalizedDescription}
        </p>
        <p className="mt-1 max-w-2xl text-[11px] text-dna-faint">
          Proposed canonical representation · Not an official national code.
        </p>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-2">
        {/* Legacy mappings */}
        <div>
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-dna-muted">
            Legacy Code Mappings
          </h3>
          <div className="space-y-2">
            {canonical.legacyMappings.map((m) => (
              <div key={m.legacyCode} className="rounded border border-dna-border bg-dna-panel2 px-3 py-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-dna-muted">{m.source}</span>
                  <code className="font-mono text-dna-cyan">{m.legacyCode}</code>
                </div>
                <p className="mt-1 font-mono text-[11px] text-dna-faint">&quot;{m.sourceDescription}&quot;</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-dna-faint">
            These mappings are synthetic / demonstration data.
          </p>
        </div>

        {/* Evidence sources */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-dna-muted">
              Evidence Sources
            </h3>
            <div className="flex gap-1">
              {toggles.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setOpenSection(t.id)}
                  className={cn(
                    "rounded border px-2 py-1 text-[11px] transition-colors",
                    openSection === t.id
                      ? "border-dna-cyan/60 bg-dna-cyan/10 text-dna-cyan"
                      : "border-dna-border2 text-dna-muted"
                  )}
                  aria-label={`Show ${t.label}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {openSection === "provenance" ? (
            <div className="space-y-2">
              {canonical.legacyMappings.map((m, i) => (
                <div key={i} className="rounded border border-dna-border bg-dna-panel2 px-3 py-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-dna-muted">Source: {m.source}</span>
                    <span className="font-mono text-dna-faint">Material DNA Parser v0.1</span>
                  </div>
                  <p className="mt-1 font-mono text-[11px] text-dna-faint">
                    &quot;{m.sourceDescription}&quot;
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {Object.entries(dna)
                .filter(([k]) => k !== "confidence" && k !== "evidenceCoverage")
                .map(([k, attr]) => {
                  const a = attr as { value?: string | string[] | null; confidence?: number; evidence?: { span?: string } | null };
                  const v = a.value;
                  const has = v !== null && v !== undefined && (Array.isArray(v) ? v.length > 0 : String(v).length > 0);
                  if (!has) return null;
                  return (
                    <div key={k} className="rounded border border-dna-border bg-dna-panel2 px-3 py-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-dna-muted">{k}</span>
                        <span className="font-mono text-[11px] text-dna-cyan">
                          {Array.isArray(v) ? v.join(", ") : String(v)}
                        </span>
                      </div>
                      {a.evidence?.span && (
                        <p className="mt-1 font-mono text-[10px] text-dna-faint">
                          Evidence: &quot;{a.evidence.span}&quot;
                        </p>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}