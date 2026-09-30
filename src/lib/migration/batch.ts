import type { MigrationResolveResult } from "@/types/domain";
import { CONSTRAINTS_VERSION, ENGINE_VERSION_NUMBER, PARSER_VERSION } from "@/lib/material-dna/config";
import { materialRecords } from "@/data/demo";
import { buildInputRecord, resolveMaterialRecord } from "@/lib/material-dna/demo";
import type { EmbeddingSignal } from "@/lib/material-dna/matching";

// ---------------------------------------------------------------------------
// Batch resolve: runs every uploaded row through the exact same pipeline the
// single-record Resolve flow uses (buildInputRecord -> resolveMaterialRecord),
// then returns a slim per-row summary. Full candidate payloads are dropped —
// a 1000-row batch would otherwise ship 1000 x 98 scored explanations.
// An optional dense-retrieval signal fuses exactly as in /api/resolve.
// ---------------------------------------------------------------------------

export interface BatchResolveInput {
  rowId: string;
  description: string;
}

export function resolveBatchRows(
  inputs: BatchResolveInput[],
  signal?: EmbeddingSignal | null
): {
  results: MigrationResolveResult[];
  versions: { engine: string; parser: string; constraints: string };
} {
  const results = inputs.map((input): MigrationResolveResult => {
    const record = buildInputRecord(input.description);
    const result = resolveMaterialRecord(record, materialRecords, signal);
    return {
      rowId: input.rowId,
      decision: result.decision,
      reason: result.reason,
      risk: result.risk,
      confidence: result.evidenceCoverage,
      candidateCode: result.selectedCandidate?.targetRecord.sourceCode ?? null,
    };
  });

  return {
    results,
    versions: {
      engine: ENGINE_VERSION_NUMBER,
      parser: PARSER_VERSION,
      constraints: CONSTRAINTS_VERSION,
    },
  };
}
