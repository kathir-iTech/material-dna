"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  FileSpreadsheet,
  Loader2,
  Play,
  Undo2,
  Upload,
} from "lucide-react";
import {
  countDecisions,
  migrationStore,
  useMigrationBatches,
} from "@/hooks/use-migration";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { DecisionBadge, RiskBadge } from "@/components/ui/status";
import { AuditTimeline } from "@/components/audit-timeline";
import { CONSTRAINTS_VERSION, ENGINE_VERSION_NUMBER, PARSER_VERSION } from "@/lib/material-dna/config";
import type { MigrationBatch, MigrationRow } from "@/types/domain";
import { cn } from "@/lib/utils";

const FILTERS = ["All", "MATCH", "REVIEW", "DO_NOT_MERGE", "Pending"] as const;
type Filter = (typeof FILTERS)[number];

const ROW_TONES: Record<MigrationRow["status"], "neutral" | "amber" | "green" | "red"> = {
  UNRESOLVED: "neutral",
  PENDING: "amber",
  APPROVED: "green",
  REJECTED: "red",
};

const AUDIT_VERSIONS = {
  engine: ENGINE_VERSION_NUMBER,
  parser: PARSER_VERSION,
  constraints: CONSTRAINTS_VERSION,
};

function bufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

export function MigrationClient() {
  const batches = useMigrationBatches();
  const [busy, setBusy] = useState<"parse" | "resolve" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selection, setSelection] = useState<string[]>([]);
  const [filter, setFilter] = useState<Filter>("All");
  const [note, setNote] = useState("");
  const [openAudit, setOpenAudit] = useState<string | null>(null);

  const active: MigrationBatch | null =
    batches.find((b) => b.id === activeId) ?? batches[0] ?? null;

  const filtered = useMemo(() => {
    const rows = active?.rows ?? [];
    return rows.filter((r) => {
      if (filter === "All") return true;
      if (filter === "Pending") return r.status === "PENDING";
      return r.decision === filter;
    });
  }, [active, filter]);

  const selectedSet = useMemo(() => new Set(selection), [selection]);
  const pendingVisible = filtered.filter((r) => r.status === "PENDING");
  const selectedPending = pendingVisible.filter((r) => selectedSet.has(r.id));

  async function handleFile(file: File): Promise<void> {
    setError(null);
    setBusy("parse");
    try {
      const base64 = bufferToBase64(await file.arrayBuffer());
      const res = await fetch("/api/migrate/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, contentBase64: base64 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Unable to parse file.");
      const id = migrationStore.importBatch(
        data.fileName,
        data.rows,
        data.errors,
        data.truncated
      );
      setActiveId(id);
      setSelection([]);
      setFilter("All");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to parse file.");
    } finally {
      setBusy(null);
    }
  }

  async function runResolve(batch: MigrationBatch): Promise<void> {
    setError(null);
    setBusy("resolve");
    try {
      const res = await fetch("/api/resolve-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: batch.rows.map((r) => ({
            rowId: r.id,
            description: r.description,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Unable to resolve batch.");
      migrationStore.applyResults(batch.id, data.results, data.versions);
      setSelection([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to resolve batch.");
    } finally {
      setBusy(null);
    }
  }

  function bulkDecide(action: "APPROVED" | "REJECTED"): void {
    if (!active || selectedPending.length === 0) return;
    migrationStore.bulkDecide(
      active.id,
      selectedPending.map((r) => r.id),
      action,
      note || undefined
    );
    setSelection([]);
    setNote("");
  }

  function toggleRow(id: string): void {
    setSelection((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toggleAll(): void {
    const allSelected =
      pendingVisible.length > 0 &&
      pendingVisible.every((r) => selectedSet.has(r.id));
    setSelection(allSelected ? [] : pendingVisible.map((r) => r.id));
  }

  const allVisibleSelected =
    pendingVisible.length > 0 &&
    pendingVisible.every((r) => selectedSet.has(r.id));
  const someVisibleSelected = pendingVisible.some((r) => selectedSet.has(r.id));

  const counts = active ? countDecisions(active.rows) : null;
  const decided = active
    ? active.rows.filter((r) => r.status === "APPROVED" || r.status === "REJECTED").length
    : 0;
  const pending = active
    ? active.rows.filter((r) => r.status === "PENDING").length
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-dna-text">Bulk Migration</h1>
        <p className="mt-1 max-w-3xl text-sm text-dna-muted">
          Import legacy records from CSV/XLSX, run every row through the
          resolution pipeline, then approve at scale — each bulk action is
          recorded in an audit trail and can be rolled back.
        </p>
      </div>

      <Card>
        <CardHeader
          title="1 · Upload source file"
          subtitle="CSV or XLSX. First row must be a header with a 'description' column; an optional 'source' column is honoured."
          right={<FileSpreadsheet size={15} className="text-dna-cyan" />}
        />
        <CardBody>
          <label
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-2 rounded border border-dashed border-dna-border2 px-4 py-8 text-center transition-colors hover:border-dna-cyan/60 hover:bg-dna-panel2",
              busy === "parse" && "pointer-events-none opacity-60"
            )}
          >
            {busy === "parse" ? (
              <Loader2 size={18} className="animate-spin text-dna-cyan" />
            ) : (
              <Upload size={18} className="text-dna-faint" />
            )}
            <span className="text-xs text-dna-muted">
              {busy === "parse" ? "Parsing file…" : "Choose a .csv or .xlsx file (max 5 MB, 1000 rows)"}
            </span>
            <input
              type="file"
              accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              aria-label="Upload migration file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
                e.target.value = "";
              }}
            />
          </label>
          {error && (
            <div className="mt-3 flex items-start gap-2 rounded border border-dna-red/40 bg-dna-red/10 px-3 py-2 text-xs text-dna-red">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </CardBody>
      </Card>

      {active && (
        <Card>
          <CardHeader
            title={`2 · Batch ${active.id} — ${active.fileName}`}
            subtitle={`${active.rows.length} rows · imported ${new Date(active.createdAt).toLocaleString()} · ${active.status === "IMPORTED" ? "awaiting resolve" : "resolved"}`}
            right={
              active.status === "IMPORTED" ? (
                <button
                  onClick={() => void runResolve(active)}
                  disabled={busy === "resolve"}
                  className="flex items-center gap-1.5 rounded border border-dna-cyan/50 bg-dna-cyan/10 px-3 py-1.5 text-xs font-medium text-dna-cyan transition-colors hover:bg-dna-cyan/20 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {busy === "resolve" ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Play size={13} />
                  )}
                  Run batch resolve ({active.rows.length} rows)
                </button>
              ) : (
                <Badge tone="cyan">RESOLVED</Badge>
              )
            }
          />
          <CardBody>
            {active.status === "IMPORTED" && (
              <p className="mb-3 text-xs text-dna-muted">
                Rows are validated but not yet resolved. Run the batch resolve
                to generate a system decision per row.
              </p>
            )}

            {active.errors.length > 0 && (
              <div className="mb-3 rounded border border-dna-amber/40 bg-dna-amber/10 px-3 py-2 text-xs text-dna-amber">
                <span className="font-semibold">
                  {active.errors.length} rows rejected during validation:
                </span>
                <ul className="mt-1 list-inside list-disc">
                  {active.errors.slice(0, 6).map((e) => (
                    <li key={e.row}>
                      Row {e.row}: {e.error}
                    </li>
                  ))}
                  {active.errors.length > 6 && (
                    <li>…and {active.errors.length - 6} more.</li>
                  )}
                </ul>
              </div>
            )}

            {counts && (
              <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                {[
                  { label: "Rows", value: active.rows.length, tone: "text-dna-text" },
                  { label: "Match", value: counts.MATCH, tone: "text-dna-green" },
                  { label: "Review", value: counts.REVIEW, tone: "text-dna-amber" },
                  { label: "Do not merge", value: counts.DO_NOT_MERGE, tone: "text-dna-red" },
                  { label: "Pending", value: pending, tone: "text-dna-cyan" },
                  { label: "Decided", value: decided, tone: "text-dna-text" },
                ].map((t) => (
                  <div
                    key={t.label}
                    className="rounded border border-dna-border bg-dna-panel2 px-3 py-2"
                  >
                    <div className="text-[10px] uppercase tracking-wider text-dna-faint">
                      {t.label}
                    </div>
                    <div className={cn("font-mono text-lg font-semibold", t.tone)}>
                      {t.value}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mb-3 flex flex-wrap items-center gap-2">
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
                  {f === "DO_NOT_MERGE" ? "DO NOT MERGE" : f}
                </button>
              ))}
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Optional audit note for this bulk action…"
                  aria-label="Audit note for bulk action"
                  className="w-56 rounded border border-dna-border bg-dna-panel2 px-2.5 py-1.5 text-xs text-dna-text placeholder:text-dna-faint focus:outline-none"
                />
                <button
                  onClick={() => bulkDecide("APPROVED")}
                  disabled={selectedPending.length === 0}
                  className="flex items-center gap-1.5 rounded border border-dna-green/50 bg-dna-green/10 px-3 py-1.5 text-xs font-medium text-dna-green transition-colors hover:bg-dna-green/20 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  Approve selected ({selectedPending.length})
                </button>
                <button
                  onClick={() => bulkDecide("REJECTED")}
                  disabled={selectedPending.length === 0}
                  className="flex items-center gap-1.5 rounded border border-dna-red/50 bg-dna-red/10 px-3 py-1.5 text-xs font-medium text-dna-red transition-colors hover:bg-dna-red/20 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  Reject selected ({selectedPending.length})
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded border border-dna-border">
              <table className="w-full min-w-[900px] text-left text-xs">
                <thead>
                  <tr className="border-b border-dna-border bg-dna-panel2 text-[11px] uppercase tracking-wider text-dna-faint">
                    <th className="w-8 px-3 py-2">
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={toggleAll}
                        disabled={pendingVisible.length === 0}
                        aria-label="Select all pending rows"
                        ref={(el) => {
                          if (el)
                            el.indeterminate =
                              !allVisibleSelected && someVisibleSelected;
                        }}
                      />
                    </th>
                    <th className="px-3 py-2 font-medium">Row</th>
                    <th className="px-3 py-2 font-medium">Source</th>
                    <th className="px-3 py-2 font-medium">Description</th>
                    <th className="px-3 py-2 font-medium">Decision</th>
                    <th className="px-3 py-2 font-medium">Risk</th>
                    <th className="px-3 py-2 font-medium">Conf</th>
                    <th className="px-3 py-2 font-medium">Matched</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-4 py-6 text-center text-dna-faint">
                        No rows match this filter.
                      </td>
                    </tr>
                  )}
                  {filtered.map((r) => {
                    const selectable = r.status === "PENDING";
                    return (
                      <tr
                        key={r.id}
                        className={cn(
                          "border-b border-dna-border/50",
                          selectedSet.has(r.id) && "bg-dna-cyan/5"
                        )}
                      >
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={selectedSet.has(r.id)}
                            disabled={!selectable}
                            onChange={() => toggleRow(r.id)}
                            aria-label={`Select row ${r.row}`}
                          />
                        </td>
                        <td className="px-3 py-2 font-mono text-dna-faint">{r.row}</td>
                        <td className="px-3 py-2">{r.source || "—"}</td>
                        <td className="max-w-72 truncate px-3 py-2 font-mono text-dna-text">
                          {r.description}
                        </td>
                        <td className="px-3 py-2">
                          {r.decision ? (
                            <DecisionBadge decision={r.decision} size="sm" />
                          ) : (
                            <span className="text-dna-faint">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {r.risk ? <RiskBadge risk={r.risk} /> : <span className="text-dna-faint">—</span>}
                        </td>
                        <td className="px-3 py-2 font-mono text-dna-muted">
                          {r.confidence !== undefined ? `${r.confidence}%` : "—"}
                        </td>
                        <td className="px-3 py-2 font-mono text-dna-cyan">
                          {r.candidateCode ?? "—"}
                        </td>
                        <td className="px-3 py-2">
                          <Badge tone={ROW_TONES[r.status]}>{r.status}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader
          title="3 · Batch history & audit trail"
          subtitle="Every import, resolve, bulk action and rollback is recorded. Rollback undoes the most recent bulk action (LIFO)."
        />
        <CardBody className="px-0">
          {batches.length === 0 ? (
            <p className="px-4 py-3 text-xs text-dna-faint">
              No batches imported yet.
            </p>
          ) : (
            <ul className="divide-y divide-dna-border/50">
              {batches.map((b) => {
                const undoable = b.ops.some((o) => !o.rolledBack);
                const bCounts = countDecisions(b.rows);
                return (
                  <li key={b.id} className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="font-mono text-xs text-dna-cyan">{b.id}</span>
                      <span className="text-xs text-dna-text">{b.fileName}</span>
                      <span className="font-mono text-[11px] text-dna-faint">
                        {b.rows.length} rows · {bCounts.MATCH}/{bCounts.REVIEW}/{bCounts.DO_NOT_MERGE} m/r/d ·{" "}
                        {b.ops.length} bulk actions
                      </span>
                      <Badge tone={b.status === "RESOLVED" ? "cyan" : "neutral"}>
                        {b.status}
                      </Badge>
                      <div className="ml-auto flex items-center gap-2">
                        <button
                          onClick={() =>
                            setOpenAudit(openAudit === b.id ? null : b.id)
                          }
                          className="rounded border border-dna-border2 px-2 py-1 text-[11px] text-dna-muted transition-colors hover:text-dna-text"
                          aria-expanded={openAudit === b.id}
                        >
                          {openAudit === b.id ? "Hide audit trail" : "Audit trail"}
                        </button>
                        <button
                          onClick={() => migrationStore.rollbackBatch(b.id)}
                          disabled={!undoable}
                          className="flex items-center gap-1.5 rounded border border-dna-amber/50 bg-dna-amber/10 px-2.5 py-1 text-[11px] font-medium text-dna-amber transition-colors hover:bg-dna-amber/20 disabled:cursor-not-allowed disabled:opacity-30"
                          aria-label={`Rollback last bulk action on ${b.id}`}
                        >
                          <Undo2 size={12} />
                          Rollback last action
                        </button>
                      </div>
                    </div>
                    {openAudit === b.id && (
                      <div className="mt-3">
                        <AuditTimeline events={b.auditEvents} versions={AUDIT_VERSIONS} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
