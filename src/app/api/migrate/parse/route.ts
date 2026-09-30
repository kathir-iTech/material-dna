import { NextRequest, NextResponse } from "next/server";
import { parseMigrationFile } from "@/lib/migration/parse";
import { MAX_FILE_BYTES } from "@/lib/migration/limits";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const fileName =
      typeof body?.fileName === "string" ? body.fileName.trim() : "";
    const contentBase64 =
      typeof body?.contentBase64 === "string" ? body.contentBase64 : "";

    if (!fileName || fileName.length > 255) {
      return NextResponse.json(
        { error: "fileName is required (max 255 characters)." },
        { status: 400 }
      );
    }
    if (!contentBase64) {
      return NextResponse.json(
        { error: "contentBase64 is required." },
        { status: 400 }
      );
    }
    if (contentBase64.length > Math.ceil((MAX_FILE_BYTES * 4) / 3) + 1024) {
      return NextResponse.json(
        { error: "File larger than 5 MB." },
        { status: 400 }
      );
    }

    const content = Buffer.from(contentBase64, "base64");
    const parsed = parseMigrationFile(fileName, content);

    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    return NextResponse.json({
      fileName,
      rows: parsed.rows,
      errors: parsed.errors,
      truncated: parsed.truncated,
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to parse file. Upload a .csv or .xlsx file." },
      { status: 400 }
    );
  }
}
