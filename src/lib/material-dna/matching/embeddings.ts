import os from "node:os";
import path from "node:path";
import type { MaterialRecord } from "@/types/domain";
import type { EmbeddingSignal } from "./index";

// ---------------------------------------------------------------------------
// Dense-retrieval signal (server-only).
//
// Wraps @xenova/transformers (all-MiniLM-L6-v2) into an injectable
// EmbeddingSignal: a sync cosine lookup the scoring pipeline can consume
// without ever being async itself. Importing this module from browser code
// is a no-op — the guard below refuses to load the model, and dynamic import
// keeps transformers.js out of any client bundle.
//
// Failure policy: ANY error (offline, model download blocked, ORT crash)
// disables the signal for the life of the process. Callers then get `null`
// and the engine behaves exactly as it did before this module existed.
// The signal is a ranking input only; decide()'s critical-conflict veto
// never sees it.
// ---------------------------------------------------------------------------

const MODEL_ID = "Xenova/all-MiniLM-L6-v2";
const BATCH = 16;

type Extractor = (
  texts: string[],
  opts: { pooling: "mean"; normalize: boolean }
) => Promise<{ data: Float32Array; dims: number[] }>;

let extractor: Extractor | null = null;
let loading: Promise<Extractor | null> | null = null;
let disabled = false;
const vectors = new Map<string, Float32Array>();

async function getExtractor(): Promise<Extractor | null> {
  if (disabled) return null;
  if (extractor) return extractor;
  if (loading) return loading;

  loading = (async () => {
    try {
      if (typeof window !== "undefined") throw new Error("browser runtime");
      const { pipeline, env } = await import("@xenova/transformers");
      // transformers.js defaults to a cache INSIDE the package dir
      // (node_modules/@xenova/transformers/.cache) which is read-only on
      // serverless hosts (Vercel). Default to the OS temp dir — writable
      // everywhere, persisted per instance; TRANSFORMERS_CACHE overrides.
      env.cacheDir =
        process.env.TRANSFORMERS_CACHE ??
        path.join(os.tmpdir(), "material-dna-model-cache");
      extractor = (await pipeline("feature-extraction", MODEL_ID)) as unknown as Extractor;
      return extractor;
    } catch (e) {
      disabled = true;
      console.warn(
        "[embeddings] dense-retrieval signal disabled (falling back to lexical-only scoring):",
        e instanceof Error ? e.message : e
      );
      return null;
    }
  })();
  return loading;
}

function dot(a: Float32Array, b: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

/**
 * Build a cosine-lookup signal over `texts`. Returns null when the model is
 * unavailable, when embedding fails, or when `budgetMs` is exceeded (keeps
 * bulk requests from timing out — callers degrade to legacy scoring).
 */
export async function createEmbeddingSignal(
  texts: string[],
  opts: { budgetMs?: number } = {}
): Promise<EmbeddingSignal | null> {
  const started = Date.now();
  const budgetMs = opts.budgetMs ?? 8000;
  const ex = await getExtractor();
  if (!ex) return null;

  const unique = [...new Set(texts.filter((t) => t.length > 0))];
  try {
    for (let i = 0; i < unique.length; i += BATCH) {
      if (Date.now() - started > budgetMs) {
        console.warn("[embeddings] budget exceeded; using lexical-only scoring.");
        return null;
      }
      const chunk = unique.slice(i, i + BATCH).filter((t) => !vectors.has(t));
      if (chunk.length === 0) continue;
      const out = await ex(chunk, { pooling: "mean", normalize: true });
      const dim = out.dims[out.dims.length - 1];
      for (let j = 0; j < chunk.length; j++) {
        vectors.set(chunk[j], out.data.slice(j * dim, (j + 1) * dim));
      }
    }
  } catch (e) {
    disabled = true;
    console.warn(
      "[embeddings] embedding failed; disabling dense-retrieval signal:",
      e instanceof Error ? e.message : e
    );
    return null;
  }

  return (a: string, b: string): number | null => {
    const va = vectors.get(a);
    const vb = vectors.get(b);
    if (!va || !vb) return null;
    const c = Math.max(0, Math.min(1, dot(va, vb)));
    return Math.round(c * 100);
  };
}

/** Raw + normalized description strings for a corpus (what scoring compares). */
export function corpusTexts(records: MaterialRecord[]): string[] {
  const out: string[] = [];
  for (const r of records) {
    out.push(r.rawDescription, r.normalizedDescription);
  }
  return out;
}

/** Test hook: clear cache and re-arm the model (does not clear model files). */
export function __resetEmbeddingsForTests(): void {
  extractor = null;
  loading = null;
  disabled = false;
  vectors.clear();
}
