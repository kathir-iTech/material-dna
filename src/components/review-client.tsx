"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { seededReviewCases } from "@/data/demo";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { RiskBadge } from "@/components/ui/status";
import { DecisionBadge } from "@/components/ui/status";
import type { ReviewCase } from "@/types/domain";
import { cn } from "@/lib/utils";

const STATUS_TONES: Record<ReviewCase["status"], "amber" | "green" | "red" | "blue"> = {
  PENDING: "amber",
  APPROVED: "green",
  REJECTED: "red",
  OVERRIDDEN: "blue",
};

const FILTERS = ["All", "High Risk", "Ambiguous", "Critical Conflict", "Pending"] as const;

export function ReviewClient() {
  const [queue, setQueue] = useState<ReviewCase[]>(seededReviewCases);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [selectedId, setSelectedId] = useState<string | null>(seededReviewCases[0]?.id ?? null);
  const [note, setNote] = useState("");
  const [actions, setActions] = useState<Record<string, string>>({});

  const filtered = queue.filter((c) => {
    if (filter === "All") return true;
    if (filter === "Pending") return c.status === "PENDING";
    if (filter === "High Risk") return c.risk === "HIGH" || c.risk === "CRITICAL";
    if (filter === "Ambiguous") return c.systemRecommendation === "REVIEW";
    if (filter === "Critical Conflict") return c.systemRecommendation === "DO_NOT_MERGE";
    return true;
  });

  const selected = queue.find((c) => c.id === selectedId) ?? null;

  const decide = (id: string, action: "APPROVED" | "REJECTED" | "OVERRIDDEN") => {
    setActions((prev) => ({ ...prev, [id]: action }));
    setQueue((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              status: action,
              reviewerNote: action === "OVERRIDDEN" ? note || c.reviewerNote : c.reviewerNote,
              reviewerDecisionAt: new Date().toISOString(),
            }
          : c
      )
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-dna-text">Human Review Queue</h1>
        <p className="mt-1 max-w-3xl text-sm text-dna-muted">
          Ambiguous and high-risk material identity decisions requiring human validation.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "rounded border px-2.5 py-1.5 text-xs transition-colors",
              filter === f
                ? "border-dna-cyan/60 bg-dna-cyan/10 text-dna-cyan"
                : "border-dna-border2 text-dna-muted hover:text-dna-text"
            )}
            aria-label={`Filter: ${f}`}
          >
            {f}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 rounded border border-dna-border bg-dna-panel px-2 py-1.5">
          <Search size={13} className="text-dna-faint" />
          <input
            className="w-40 bg-transparent text-xs text-dna-text placeholder:text-dna-faint focus:outline-none"
            placeholder="Search case ID…"
            aria-label="Search review cases"
          />
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead>
              <tr className="border-b border-dna-border text-[11px] uppercase tracking-wider text-dna-faint">
                <th className="px-4 py-2 font-medium">Case</th>
                <th className="px-2 py-2 font-medium">Source</th>
                <th className="px-2 py-2 font-medium">Candidate</th>
                <th className="px-2 py-2 font-medium">Risk</th>
                <th className="px-2 py-2 font-medium">Confidence</th>
                <th className="px-2 py-2 font-medium">Reason</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-dna-faint">
                    No pending review cases.
                  </td>
                </tr>
              )}
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  tabIndex={0}
                  role="button"
                  onClick={() => setSelectedId(c.id)}
                  onKeyDown={(e) => e.key === "Enter" && setSelectedId(c.id)}
                  className={cn(
                    "cursor-pointer border-b border-dna-border/50 hover:bg-dna-panel2",
                    selectedId === c.id && "bg-dna-cyan/5"
                  )}
                  aria-label={`Open review case ${c.id}`}
                >
                  <td className="px-4 py-2 font-mono text-dna-cyan">{c.id}</td>
                  <td className="px-2 py-2">{c.materialA.source}</td>
                  <td className="px-2 py-2 font-mono text-dna-text">{c.materialB.sourceCode}</td>
                  <td className="px-2 py-2"><RiskBadge risk={c.risk} /></td>
                  <td className="px-2 py-2 font-mono text-dna-muted">{c.confidence}%</td>
                  <td className="max-w-56 truncate px-2 py-2 text-dna-muted">{c.reason}</td>
                  <td className="px-4 py-2">
                    <Badge tone={STATUS_TONES[c.status]}>{c.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {selected && (
        <Card>
          <div className="border-b border-dna-border px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold text-dna-text">{selected.id}</h2>
              <Badge tone={STATUS_TONES[selected.status]}>{selected.status}</Badge>
              <RiskBadge risk={selected.risk} />
            </div>
            <p className="mt-1 text-xs text-dna-muted">Created {new Date(selected.createdAt).toLocaleString()}</p>
          </div>

          <div className="grid gap-4 p-4 lg:grid-cols-2">
            <div className="rounded border border-dna-border bg-dna-panel2 p-3">
              <div className="text-[11px] uppercase tracking-wider text-dna-faint">
                Material A — {selected.materialA.source}
              </div>
              <p className="mt-1 font-mono text-xs text-dna-text">&quot;{selected.materialA.rawDescription}&quot;</p>
            </div>
            <div className="rounded border border-dna-border bg-dna-panel2 p-3">
              <div className="text-[11px] uppercase tracking-wider text-dna-faint">
                Material B — {selected.materialB.source} ({selected.materialB.sourceCode})
              </div>
              <p className="mt-1 font-mono text-xs text-dna-text">&quot;{selected.materialB.rawDescription}&quot;</p>
            </div>
          </div>

          <div className="border-t border-dna-border px-4 py-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs text-dna-muted">System recommendation</span>
              <DecisionBadge decision={selected.systemRecommendation} size="sm" />
              <span className="text-xs text-dna-muted">— {selected.reason}</span>
            </div>

            {selected.reviewerNote && (
              <div className="mt-3 rounded border border-dna-blue/40 bg-dna-blue/10 p-3 text-xs text-dna-blue">
                <span className="font-semibold">Reviewer note:</span> {selected.reviewerNote}
              </div>
            )}

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label htmlFor="reviewer-note" className="text-[11px] text-dna-muted">
                  Reviewer reason {selected.status === "OVERRIDDEN" && <span className="text-dna-amber">(required for override)</span>}
                </label>
                <textarea
                  id="reviewer-note"
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Engineering team confirmed both descriptions refer to the same approved material under internal specification X."
                  className="mt-1 w-full rounded border border-dna-border bg-dna-panel2 px-3 py-2 text-xs text-dna-text placeholder:text-dna-faint"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => decide(selected.id, "APPROVED")}
                  disabled={selected.status !== "PENDING"}
                  className="rounded border border-dna-green/50 bg-dna-green/10 px-3 py-2 text-xs font-medium text-dna-green transition-colors hover:bg-dna-green/20 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  Approve Recommendation
                </button>
                <button
                  onClick={() => decide(selected.id, "REJECTED")}
                  disabled={selected.status !== "PENDING"}
                  className="rounded border border-dna-red/50 bg-dna-red/10 px-3 py-2 text-xs font-medium text-dna-red transition-colors hover:bg-dna-red/20 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  Keep Separate
                </button>
                <button
                  onClick={() => decide(selected.id, "OVERRIDDEN")}
                  disabled={selected.status !== "PENDING" || note.trim().length === 0}
                  className="rounded border border-dna-amber/50 bg-dna-amber/10 px-3 py-2 text-xs font-medium text-dna-amber transition-colors hover:bg-dna-amber/20 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  Override
                </button>
              </div>
            </div>

            {actions[selected.id] && (
              <p className="mt-3 text-xs text-dna-muted">
                Decision recorded:{" "}
                <span className="font-mono text-dna-text">{actions[selected.id]}</span> — stored in local
                demo state.
              </p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}