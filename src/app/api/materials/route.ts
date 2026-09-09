import { NextResponse } from "next/server";
import { materialRecords } from "@/data/demo";

export async function GET() {
  return NextResponse.json({
    records: materialRecords.map((r) => ({
      id: r.id,
      source: r.source,
      sourceCode: r.sourceCode,
      rawDescription: r.rawDescription,
      normalizedDescription: r.normalizedDescription,
      dna: r.dna,
    })),
    count: materialRecords.length,
  });
}