import { NextRequest, NextResponse } from "next/server";
import { buildInputRecord, resolveMaterialRecord } from "@/lib/material-dna/demo";
import { materialRecords } from "@/data/demo";

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
    const result = resolveMaterialRecord(input, materialRecords);

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Unable to resolve material description." },
      { status: 500 }
    );
  }
}