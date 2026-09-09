import { NextResponse } from "next/server";
import { canonicalMaterials } from "@/data/demo";

export async function GET() {
  return NextResponse.json({
    canonical: canonicalMaterials.map((c) => ({
      canonicalId: c.canonicalId,
      materialType: c.materialType,
      normalizedIdentity: c.normalizedIdentity,
      normalizedDescription: c.normalizedDescription,
      legacyMappings: c.legacyMappings,
      sources: c.sources,
      status: c.status,
    })),
    count: canonicalMaterials.length,
  });
}