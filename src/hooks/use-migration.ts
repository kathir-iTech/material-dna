"use client";

import { useSyncExternalStore } from "react";
import type {
  AuditEvent,
  MigrationBatch,
  MigrationOp,
  MigrationParseError,
  MigrationResolveResult,
  MigrationRow,
  MigrationRowStatus,
} from "@/types/domain";

// ---------------------------------------------------------------------------
// Single source of truth for bulk migration batches.
//
// Lifecycle: importBatch (rows UNRESOLVED) -> applyResults (rows PENDING,
// batch RESOLVED) -> bulkDecide (rows APPROVED/REJECTED, one MigrationOp per
// click) -> rollbackBatch (undoes the most recent non-rolled-back op, LIFO).
// Every mutation appends an AuditEvent so a batch can show a full, inspectable
// audit trail — the same pattern the single-record resolution uses.
// ---------------------------------------------------------------------------

const EMPTY_BATCHES: MigrationBatch[] = [];

let batches: MigrationBatch[] = EMPTY_BATCHES;
let batchSeq = 1;
let opSeq = 1;
const listeners = new Set<() => void>();

function emit(): void {
  for (const l of listeners) l();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function nowIso(): string {
  return new Date().toISOString();
}

function nowStamp(): string {
  return new Date().toTimeString().slice(0, 8);
}

function makeAudit(label: string, detail?: string): AuditEvent {
  return { at: nowStamp(), label, detail };
}

export interface ImportRowInput {
  row: number;
  source: string;
  description: string;
}

export const migrationStore = {
  subscribe,
  getSnapshot: (): MigrationBatch[] => batches,
  getServerSnapshot: (): MigrationBatch[] => EMPTY_BATCHES,

  /** Register a parsed file. Returns the new batch id. */
  importBatch(
    fileName: string,
    rows: ImportRowInput[],
    errors: MigrationParseError[],
    truncated = false
  ): string {
    const id = `MIG-${String(batchSeq++).padStart(3, "0")}`;
    const auditEvents: AuditEvent[] = [
      makeAudit("Batch imported", `${rows.length} rows from ${fileName}`),
    ];
    if (truncated) {
      auditEvents.push(
        makeAudit("Rows truncated at batch limit", `first ${rows.length} rows kept`)
      );
    }
    if (errors.length > 0) {
      auditEvents.push(
        makeAudit("Rows rejected by validation", `${errors.length} rows`)
      );
    }

    const batch: MigrationBatch = {
      id,
      fileName,
      createdAt: nowIso(),
      status: "IMPORTED",
      rows: rows.map(
        (r): MigrationRow => ({
          id: `${id}-R${r.row}`,
          row: r.row,
          source: r.source,
          description: r.description,
          status: "UNRESOLVED",
        })
      ),
      errors,
      ops: [],
      auditEvents,
    };

    batches = [batch, ...batches];
    emit();
    return id;
  },

  /** Write batch resolve outcomes onto the rows; batch becomes RESOLVED. */
  applyResults(
    batchId: string,
    results: MigrationResolveResult[],
    versions: { engine: string; parser: string; constraints: string }
  ): number {
    const byRowId = new Map(results.map((r) => [r.rowId, r]));
    let updated = 0;

    batches = batches.map((b) => {
      if (b.id !== batchId) return b;
      const rows = b.rows.map((row) => {
        const hit = byRowId.get(row.id);
        if (!hit) return row;
        updated++;
        return {
          ...row,
          status: "PENDING" as const,
          decision: hit.decision,
          reason: hit.reason,
          risk: hit.risk,
          confidence: hit.confidence,
          candidateCode: hit.candidateCode,
        };
      });
      const counts = countDecisions(rows);
      return {
        ...b,
        rows,
        status: "RESOLVED" as const,
        auditEvents: [
          ...b.auditEvents,
          makeAudit(
            "Batch resolved",
            `${updated} rows · ${counts.MATCH} match, ${counts.REVIEW} review, ${counts.DO_NOT_MERGE} do-not-merge · engine ${versions.engine}`
          ),
          makeAudit(
            "Versions recorded",
            `parser ${versions.parser} · constraints ${versions.constraints}`
          ),
        ],
      };
    });

    emit();
    return updated;
  },

  /**
   * Approve/reject the given rows in one action. Only PENDING rows change;
   * a MigrationOp records every affected row's previous status so the action
   * can be rolled back. Returns the number of rows changed.
   */
  bulkDecide(
    batchId: string,
    rowIds: string[],
    action: "APPROVED" | "REJECTED",
    note?: string
  ): number {
    const wanted = new Set(rowIds);
    const prev: Record<string, MigrationRowStatus> = {};
    let changed = 0;

    batches = batches.map((b) => {
      if (b.id !== batchId) return b;
      const rows = b.rows.map((row) => {
        if (!wanted.has(row.id) || row.status !== "PENDING") return row;
        prev[row.id] = row.status;
        changed++;
        return { ...row, status: action };
      });
      if (changed === 0) return b;

      const op: MigrationOp = {
        id: `OP-${opSeq++}`,
        at: nowStamp(),
        action,
        rowIds: Object.keys(prev),
        prev,
        note: note?.trim() || undefined,
        rolledBack: false,
      };
      return {
        ...b,
        rows,
        ops: [...b.ops, op],
        auditEvents: [
          ...b.auditEvents,
          makeAudit(
            `Bulk ${action}`,
            `${changed} rows${op.note ? ` — ${op.note}` : ""}`
          ),
        ],
      };
    });

    emit();
    return changed;
  },

  /**
   * Undo the most recent bulk action on this batch (LIFO op log). Rows are
   * restored to their pre-op status and an audit event records the rollback.
   * Returns the number of rows restored, 0 when there is nothing to undo.
   */
  rollbackBatch(batchId: string): number {
    let restored = 0;

    batches = batches.map((b) => {
      if (b.id !== batchId) return b;
      let opIdx = -1;
      for (let i = b.ops.length - 1; i >= 0; i--) {
        if (!b.ops[i].rolledBack) {
          opIdx = i;
          break;
        }
      }
      if (opIdx === -1) return b;

      const op = b.ops[opIdx];
      const rows = b.rows.map((row) => {
        const back = op.prev[row.id];
        if (back && row.status === op.action) {
          restored++;
          return { ...row, status: back };
        }
        return row;
      });
      if (restored === 0) return b;

      const ops = b.ops.map((o, i) =>
        i === opIdx ? { ...o, rolledBack: true } : o
      );
      return {
        ...b,
        rows,
        ops,
        auditEvents: [
          ...b.auditEvents,
          makeAudit(
            "Bulk action rolled back",
            `${restored} rows restored to ${Object.values(op.prev)[0] ?? "prior status"} (${op.action} undone)`
          ),
        ],
      };
    });

    emit();
    return restored;
  },

  /** Restore the empty state (used by tests). */
  reset(): void {
    batches = EMPTY_BATCHES;
    batchSeq = 1;
    opSeq = 1;
    emit();
  },
};

export function countDecisions(
  rows: MigrationRow[]
): Record<"MATCH" | "REVIEW" | "DO_NOT_MERGE" | "NO_MATCH", number> {
  const counts = { MATCH: 0, REVIEW: 0, DO_NOT_MERGE: 0, NO_MATCH: 0 };
  for (const row of rows) {
    if (row.decision) counts[row.decision]++;
  }
  return counts;
}

/** Shared migration state for any component (bulk review screen, tests). */
export function useMigrationBatches(): MigrationBatch[] {
  return useSyncExternalStore(
    migrationStore.subscribe,
    migrationStore.getSnapshot,
    migrationStore.getServerSnapshot
  );
}
