import { NextRequest, NextResponse } from "next/server";
import { buildInputRecord } from "@/lib/material-dna/demo";
import { resolveWithReviewPolicy } from "@/lib/material-dna/matching/review-first";
import { materialRecords } from "@/data/demo";
import { identityProposal } from "@/lib/material-dna/identity-proposal";
import {
  corpusTexts,
  createEmbeddingSignal,
} from "@/lib/material-dna/matching/embeddings";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const description =
      typeof body?.description === "string" ? body.description.trim() : "";

    if (!description) {
      return NextResponse.json(
        { error: "description is required" },
        { status: 400 },
      );
    }
    if (description.length > 2000) {
      return NextResponse.json(
        { error: "description must be 2000 characters or fewer" },
        { status: 400 },
      );
    }

    const input = buildInputRecord(description);
    let corpus = materialRecords;
    if (body?.referenceDescription !== undefined) {
      const ref = body.referenceDescription;
      if (typeof ref !== "string" || !ref.trim() || ref.length > 2000)
        return NextResponse.json(
          { error: "referenceDescription must be 1–2,000 characters." },
          { status: 400 },
        );
      const record = buildInputRecord(ref);
      corpus = [
        {
          ...record,
          id: `REFERENCE-${record.id}`,
          sourceCode: "REFERENCE-001",
          source: "Reference",
        },
      ];
    }
    // Dense-retrieval signal: fused ranking input under the existing scoring.
    // If the model is unavailable this is null and the pipeline is unchanged.
    const signal =
      body?.embeddings === false
        ? null
        : await createEmbeddingSignal([
            description,
            input.normalizedDescription,
            ...corpusTexts(corpus),
          ]);
    const result = resolveWithReviewPolicy(
      input,
      corpus,
      signal,
      body?.policy !== "submitted",
    );

    return NextResponse.json({
      ...result,
      identityProposal: identityProposal(result),
    });
  } catch (error) {
    if (error instanceof SyntaxError)
      return NextResponse.json(
        { error: "Request body must be valid JSON." },
        { status: 400 },
      );
    return NextResponse.json(
      { error: "Unable to resolve material description." },
      { status: 500 },
    );
  }
}
