import { NextResponse } from "next/server";
import os from "node:os";
import path from "node:path";

export const runtime = "nodejs";

export async function GET() {
  const out: Record<string, unknown> = {};
  try {
    const t0 = Date.now();
    const mod = await import("@xenova/transformers");
    out.import = `ok ${Date.now() - t0}ms`;
    try {
      const cacheDir =
        process.env.TRANSFORMERS_CACHE ??
        path.join(os.tmpdir(), "material-dna-model-cache");
      mod.env.cacheDir = cacheDir;
      out.cacheDir = cacheDir;
      const t1 = Date.now();
      const pipe = await mod.pipeline(
        "feature-extraction",
        "Xenova/all-MiniLM-L6-v2"
      );
      out.pipeline = `ok ${Date.now() - t1}ms`;
      try {
        const t2 = Date.now();
        const res = await pipe("hello world", {
          pooling: "mean",
          normalize: true,
        });
        out.embed = `ok ${Date.now() - t2}ms dims=${res.dims.join("x")}`;
      } catch (e) {
        out.embed = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
      }
    } catch (e) {
      out.pipeline = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    }
  } catch (e) {
    out.import = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
  }
  return NextResponse.json(out);
}
