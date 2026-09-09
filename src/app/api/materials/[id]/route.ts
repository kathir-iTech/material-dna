import { NextRequest, NextResponse } from "next/server";
import { materialRecords } from "@/data/demo";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const record = materialRecords.find((r) => r.id === id || r.sourceCode === id);
  if (!record) {
    return NextResponse.json({ error: "Material not found" }, { status: 404 });
  }
  return NextResponse.json(record);
}