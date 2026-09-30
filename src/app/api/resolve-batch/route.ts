import { NextRequest, NextResponse } from "next/server";
import { resolveBatchRows, type BatchResolveInput } from "@/lib/migration/batch";
import { MAX_BATCH_ROWS, MAX_DESCRIPTION_LENGTH } from "@/lib/migration/limits";
import { corpusTexts, createEmbeddingSignal } from "@/lib/material-dna/matching/embeddings";
import { materialRecords } from "@/data/demo";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawRows = Array.isArray(body?.rows) ? body.rows : null;

    if (!rawRows || rawRows.length === 0) {
      return NextResponse.json(
        { error: "rows is required and must be a non-empty array." },
        { status: 400 }
      );
    }
    if (rawRows.length > MAX_BATCH_ROWS) {
      return NextResponse.json(
        { error: `At most ${MAX_BATCH_ROWS} rows per batch.` },
        { status: 400 }
      );
    }

    const inputs: BatchResolveInput[] = [];
    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const rowId =
        typeof row?.rowId === "string" && row.rowId.length > 0
          ? row.rowId
          : `ROW-${i + 1}`;
      const description =
        typeof row?.description === "string" ? row.description.trim() : "";

      if (!description || description.length > MAX_DESCRIPTION_LENGTH) {
        return NextResponse.json(
          {
            error: `Row ${i + 1}: description must be 1-${MAX_DESCRIPTION_LENGTH} characters.`,
          },
          { status: 400 }
        );
      }
      inputs.push({ rowId, description });
    }

    // Dense-retrieval signal over every unique description + the corpus;
    // budgeted so a big batch degrades to lexical-only instead of timing out.
    const signal = await createEmbeddingSignal([
      ...inputs.map((i) => i.description),
      ...corpusTexts(materialRecords),
    ]);
    const { results, versions } = resolveBatchRows(inputs, signal);
    return NextResponse.json({ results, versions });
  } catch {
    return NextResponse.json(
      { error: "Unable to resolve batch." },
      { status: 500 }
    );
  }
}
