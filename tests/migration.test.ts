import { beforeEach, describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import {
  parseCsv,
  parseMigrationFile,
  rowsFromMatrix,
  type MigrationFileResult,
} from "@/lib/migration/parse";
import { MAX_BATCH_ROWS, MAX_DESCRIPTION_LENGTH } from "@/lib/migration/limits";
import { resolveBatchRows } from "@/lib/migration/batch";
import { migrationStore } from "@/hooks/use-migration";
import { materialRecords } from "@/data/demo";
import { buildInputRecord, resolveMaterialRecord } from "@/lib/material-dna/demo";

function ok(result: MigrationFileResult): Extract<MigrationFileResult, { ok: true }> {
  if (!result.ok) throw new Error(`expected ok, got: ${result.error}`);
  return result;
}

// ---------------------------------------------------------------------------
// CSV state machine
// ---------------------------------------------------------------------------

describe("parseCsv", () => {
  it("parses simple rows", () => {
    expect(parseCsv("description,source\nPipe,CPSE-A\nBolt,CPSE-B")).toEqual([
      ["description", "source"],
      ["Pipe", "CPSE-A"],
      ["Bolt", "CPSE-B"],
    ]);
  });

  it("keeps commas and escaped quotes inside quoted fields", () => {
    const rows = parseCsv('"Pipe, carbon, seamless",CPSE-A\n"He said ""SS304""",');
    expect(rows[0]).toEqual(["Pipe, carbon, seamless", "CPSE-A"]);
    expect(rows[1]).toEqual(['He said "SS304"', ""]);
  });

  it("handles CRLF line endings and a UTF-8 BOM", () => {
    const rows = parseCsv("\uFEFFdescription\r\nMS plate\r\n");
    expect(rows).toEqual([["description"], ["MS plate"]]);
  });

  it("handles quoted fields containing newlines", () => {
    const rows = parseCsv('description\n"line one\nline two"');
    expect(rows[1]).toEqual(["line one\nline two"]);
  });
});

// ---------------------------------------------------------------------------
// Row extraction (shared by CSV + XLSX)
// ---------------------------------------------------------------------------

describe("rowsFromMatrix", () => {
  it("maps description and optional source columns", () => {
    const res = ok(
      rowsFromMatrix([
        ["Material Description", "Source"],
        ["MS plate 10mm", "CPSE-A"],
        ["Bolt M12", ""],
      ])
    );
    expect(res.rows).toEqual([
      { row: 2, source: "CPSE-A", description: "MS plate 10mm" },
      { row: 3, source: "", description: "Bolt M12" },
    ]);
    expect(res.errors).toEqual([]);
  });

  it("accepts header aliases with underscores/case variants", () => {
    const res = ok(
      rowsFromMatrix([["Raw_Description"], ["Cable 2.5sq mm 3C"]])
    );
    expect(res.rows[0].description).toBe("Cable 2.5sq mm 3C");
  });

  it("rejects files with no description column", () => {
    const res = rowsFromMatrix([["sku", "qty"], ["A1", "4"]]);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/description column/);
  });

  it("skips blank rows and flags rows with an empty description", () => {
    const res = ok(
      rowsFromMatrix([
        ["description"],
        [],
        ["   "],
        ["Steel bar"],
        ["", "CPSE-B"],
      ])
    );
    expect(res.rows).toEqual([{ row: 4, source: "", description: "Steel bar" }]);
    expect(res.errors).toEqual([
      { row: 5, error: "Empty description — row skipped." },
    ]);
  });

  it("flags descriptions longer than the limit", () => {
    const res = ok(
      rowsFromMatrix([
        ["description"],
        ["x".repeat(MAX_DESCRIPTION_LENGTH + 1)],
        ["ok"],
      ])
    );
    expect(res.rows).toHaveLength(1);
    expect(res.errors[0].row).toBe(2);
    expect(res.errors[0].error).toMatch(/longer than/);
  });

  it("truncates at the batch row limit and reports it", () => {
    const matrix: string[][] = [["description"]];
    for (let i = 0; i < MAX_BATCH_ROWS + 5; i++) matrix.push([`row ${i}`]);
    const res = ok(rowsFromMatrix(matrix));
    expect(res.rows).toHaveLength(MAX_BATCH_ROWS);
    expect(res.truncated).toBe(true);
  });

  it("errors when there are no data rows at all", () => {
    const res = rowsFromMatrix([["description"], []]);
    expect(res.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// File-level parsing (CSV + XLSX roundtrip)
// ---------------------------------------------------------------------------

describe("parseMigrationFile", () => {
  it("parses a CSV file end to end", () => {
    const csv = 'description,source\n"Seamless pipe, 4 inch, A106 GR B",CPSE-B\nBolt M12x80 8.8,Legacy ERP\n';
    const res = ok(parseMigrationFile("legacy.csv", Buffer.from(csv, "utf8")));
    expect(res.rows).toEqual([
      { row: 2, source: "CPSE-B", description: "Seamless pipe, 4 inch, A106 GR B" },
      { row: 3, source: "Legacy ERP", description: "Bolt M12x80 8.8" },
    ]);
  });

  it("round-trips an .xlsx workbook", () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["description", "source"],
      ["MS PIPE 4 INCH SEAMLESS, A106 GR B", "CPSE-B"],
      ["BOLT M12X80 8.8 ZP", "Supplier Catalog"],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Migration");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

    const res = ok(parseMigrationFile("legacy.xlsx", buf));
    expect(res.rows).toEqual([
      { row: 2, source: "CPSE-B", description: "MS PIPE 4 INCH SEAMLESS, A106 GR B" },
      { row: 3, source: "Supplier Catalog", description: "BOLT M12X80 8.8 ZP" },
    ]);
  });

  it("rejects a .xlsx extension whose content is not a workbook", () => {
    const res = parseMigrationFile("legacy.xlsx", Buffer.from("description\nx"));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/not a valid \.xlsx/);
  });

  it("rejects empty and oversized files", () => {
    expect(parseMigrationFile("a.csv", Buffer.alloc(0)).ok).toBe(false);
    expect(parseMigrationFile("a.csv", Buffer.alloc(6 * 1024 * 1024)).ok).toBe(false);
  });

  it("rejects binary content masquerading as CSV", () => {
    const res = parseMigrationFile("weird.csv", Buffer.from([0x64, 0x00, 0x01]));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/Unsupported file format/);
  });
});

// ---------------------------------------------------------------------------
// Batch resolve pipeline (must be identical to the single-record path)
// ---------------------------------------------------------------------------

describe("resolveBatchRows", () => {
  it("matches the single-record pipeline decision-for-decision", () => {
    const descriptions = [
      materialRecords[0].rawDescription,
      materialRecords[4].rawDescription,
      "TOTALLY UNKNOWN ITEM 99",
    ];
    const { results, versions } = resolveBatchRows(
      descriptions.map((description, i) => ({ rowId: `R${i}`, description }))
    );

    expect(results).toHaveLength(descriptions.length);
    expect(versions.engine).toBeTruthy();
    expect(versions.parser).toBeTruthy();
    expect(versions.constraints).toBeTruthy();

    descriptions.forEach((description, i) => {
      const direct = resolveMaterialRecord(
        buildInputRecord(description),
        materialRecords
      );
      expect(results[i].rowId).toBe(`R${i}`);
      expect(results[i].decision).toBe(direct.decision);
      expect(results[i].risk).toBe(direct.risk);
      expect(results[i].confidence).toBe(direct.evidenceCoverage);
      expect(results[i].candidateCode).toBe(
        direct.selectedCandidate?.targetRecord.sourceCode ?? null
      );
    });
  });
});

// ---------------------------------------------------------------------------
// Migration store: import -> resolve -> approve at scale -> rollback
// ---------------------------------------------------------------------------

describe("migrationStore", () => {
  beforeEach(() => {
    migrationStore.reset();
  });

  function importTwoRows(): string {
    return migrationStore.importBatch(
      "legacy.csv",
      [
        { row: 2, source: "CPSE-A", description: materialRecords[0].rawDescription },
        { row: 3, source: "CPSE-B", description: materialRecords[1].rawDescription },
      ],
      [{ row: 4, error: "Empty description — row skipped." }]
    );
  }

  function resolvedBatch(): { batchId: string } {
    const batchId = importTwoRows();
    const batch = migrationStore.getSnapshot().find((b) => b.id === batchId)!;
    const { results, versions } = resolveBatchRows(
      batch.rows.map((r) => ({ rowId: r.id, description: r.description }))
    );
    migrationStore.applyResults(batchId, results, versions);
    return { batchId };
  }

  it("importBatch creates an IMPORTED batch with UNRESOLVED rows and audit events", () => {
    const id = importTwoRows();
    const batch = migrationStore.getSnapshot()[0];
    expect(batch.id).toBe(id);
    expect(batch.status).toBe("IMPORTED");
    expect(batch.rows.map((r) => r.status)).toEqual(["UNRESOLVED", "UNRESOLVED"]);
    expect(batch.rows[0].id).toBe(`${id}-R2`);
    expect(batch.auditEvents.map((e) => e.label)).toContain("Batch imported");
    expect(batch.auditEvents.map((e) => e.label)).toContain(
      "Rows rejected by validation"
    );
  });

  it("applyResults writes decisions, flips rows to PENDING and the batch to RESOLVED", () => {
    const { batchId } = resolvedBatch();
    const batch = migrationStore.getSnapshot().find((b) => b.id === batchId)!;
    expect(batch.status).toBe("RESOLVED");
    for (const row of batch.rows) {
      expect(row.status).toBe("PENDING");
      expect(row.decision).toBeDefined();
      expect(row.confidence).toBeGreaterThanOrEqual(0);
    }
    expect(batch.auditEvents.map((e) => e.label)).toContain("Batch resolved");
    expect(batch.auditEvents.map((e) => e.label)).toContain("Versions recorded");
  });

  it("bulkDecide approves selected rows, records an op with prior status, and audits it", () => {
    const { batchId } = resolvedBatch();
    const batch = migrationStore.getSnapshot().find((b) => b.id === batchId)!;
    const first = batch.rows[0].id;

    const changed = migrationStore.bulkDecide(
      batchId,
      [first],
      "APPROVED",
      "checked against PO"
    );
    expect(changed).toBe(1);

    const after = migrationStore.getSnapshot().find((b) => b.id === batchId)!;
    expect(after.rows[0].status).toBe("APPROVED");
    expect(after.rows[1].status).toBe("PENDING");
    expect(after.ops).toHaveLength(1);
    expect(after.ops[0].prev).toEqual({ [first]: "PENDING" });
    expect(after.ops[0].note).toBe("checked against PO");
    expect(after.ops[0].rolledBack).toBe(false);
    expect(after.auditEvents.at(-1)?.label).toBe("Bulk APPROVED");
    expect(after.auditEvents.at(-1)?.detail).toContain("1 rows");
  });

  it("bulkDecide only touches PENDING rows and returns 0 when nothing qualifies", () => {
    const { batchId } = resolvedBatch();
    const batch = migrationStore.getSnapshot().find((b) => b.id === batchId)!;

    expect(migrationStore.bulkDecide(batchId, [], "APPROVED")).toBe(0);
    expect(
      migrationStore.bulkDecide(batchId, batch.rows.map((r) => r.id), "APPROVED")
    ).toBe(2);
    // Second attempt: everything already APPROVED -> no change, no new op.
    expect(
      migrationStore.bulkDecide(batchId, batch.rows.map((r) => r.id), "REJECTED")
    ).toBe(0);
    const after = migrationStore.getSnapshot().find((b) => b.id === batchId)!;
    expect(after.ops).toHaveLength(1);
    expect(after.rows.map((r) => r.status)).toEqual(["APPROVED", "APPROVED"]);
  });

  it("rollbackBatch undoes the most recent op (LIFO) and audits it", () => {
    const { batchId } = resolvedBatch();
    const ids = migrationStore.getSnapshot().find((b) => b.id === batchId)!.rows.map((r) => r.id);

    migrationStore.bulkDecide(batchId, [ids[0]], "APPROVED");
    migrationStore.bulkDecide(batchId, [ids[1]], "REJECTED", "wrong spec");

    expect(migrationStore.rollbackBatch(batchId)).toBe(1);
    let batch = migrationStore.getSnapshot().find((b) => b.id === batchId)!;
    expect(batch.rows[0].status).toBe("APPROVED");
    expect(batch.rows[1].status).toBe("PENDING");
    expect(batch.ops[1].rolledBack).toBe(true);
    expect(batch.auditEvents.at(-1)?.label).toBe("Bulk action rolled back");

    expect(migrationStore.rollbackBatch(batchId)).toBe(1);
    batch = migrationStore.getSnapshot().find((b) => b.id === batchId)!;
    expect(batch.rows.map((r) => r.status)).toEqual(["PENDING", "PENDING"]);
    expect(batch.ops[0].rolledBack).toBe(true);

    // Nothing left to undo.
    expect(migrationStore.rollbackBatch(batchId)).toBe(0);
    expect(migrationStore.rollbackBatch("MIG-999")).toBe(0);
  });

  it("batches prepend newest-first and ids are unique across imports", () => {
    const a = importTwoRows();
    const b = migrationStore.importBatch("other.csv", [{ row: 2, source: "", description: "x" }], []);
    const all = migrationStore.getSnapshot();
    expect(all.map((x) => x.id)).toEqual([b, a]);
    expect(new Set(all.map((x) => x.id)).size).toBe(all.length);
  });
});
