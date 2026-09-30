import { NextRequest, NextResponse } from "next/server";
import { buildInputRecord, resolveMaterialRecord } from "@/lib/material-dna/demo";
import { materialRecords } from "@/data/demo";
import { corpusTexts, createEmbeddingSignal } from "@/lib/material-dna/matching/embeddings";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const description =
      typeof body?.description === "string" ? body.description.trim() : "";

    if (!description) {
      return NextResponse.json(
        { error: "description is required" },
        { status: 400 }
      );
    }
    if (description.length > 2000) {
      return NextResponse.json(
        { error: "description must be 2000 characters or fewer" },
        { status: 400 }
      );
    }

    const input = buildInputRecord(description);
    // Dense-retrieval signal: fused ranking input under the existing scoring.
    // If the model is unavailable this is null and the pipeline is unchanged.
    const signal = await createEmbeddingSignal([
      description,
      input.normalizedDescription,
      ...corpusTexts(materialRecords),
    ]);
    const result = resolveMaterialRecord(input, materialRecords, signal);

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Unable to resolve material description." },
      { status: 500 }
    );
  }
}
