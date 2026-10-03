# Deployment

Production deploy target: **Vercel** (Next.js 15 app router, `runtime: nodejs` API routes).
All commands are pinned by [`vercel.json`](./vercel.json).

## Quick start

**Dashboard:** import the repo → framework auto-detected → Deploy.
**CLI:**

```bash
npm install          # postinstall prunes unused sharp packages (see below)
npm run build
vercel --prod
```

Requires Node 20+. No environment variables are required to boot.

| Variable | Default | Purpose |
| --- | --- | --- |
| `TRANSFORMERS_CACHE` | `os.tmpdir()/material-dna-model-cache` (Vercel: `/tmp/...`) | Where the embedding model is downloaded/cached. Set it only if you want a specific location; it must be writable at runtime. |

## What runs where

- **Static pages:** `/`, `/graph`, `/materials`, `/migrate`, `/research`, `/review`
- **Node.js API routes:** `/api/resolve`, `/api/resolve-batch`, `/api/migrate/parse`,
  `/api/materials`, `/api/materials/[id]`, `/api/canonical`, `/api/reviews`
- **Server-only dense-retrieval model:** loaded lazily by `/api/resolve` and
  `/api/resolve-batch` via `src/lib/material-dna/matching/embeddings.ts`.
  The model file is **not** part of the build output — it downloads on the first
  request (cold start ≈ a few seconds) and is then cached per warm instance.
  The embedding budget is 8 s (text batches only; model loading is excluded) —
  on timeout or any failure the signal is dropped and scoring falls back to the
  legacy lexical pipeline (`F1 = 0.813`, the pre-transformers behavior).

## The dense-retrieval signal is ranking-only — by construction

- Model: `Xenova/all-MiniLM-L6-v2` (quantized ONNX, 21.9 MB), cosine 0–100.
- Weight: `SIMILARITY.EMBEDDING_WEIGHT = 0.15`; existing weights scale by `0.85`
  when the signal is active, and are untouched when it is absent — byte-identical
  legacy scoring.
- `decide()` / the critical-conflict veto **never receives the embedding**.
  The client-side Resolve UI intentionally runs without the signal (no browser
  model download); fusion happens server-side only.

Evidence (all reproducible):

| Check | Result |
| --- | --- |
| `npm test` | **150/150**, incl. `tests/embedding-signal.test.ts` (adversarial `cosine=100` bomb still `DO_NOT_MERGE`; real-model regression asserts cosine ≥ 85 **and** veto wins) |
| PoC pair SS304 vs SS316L | cosine **0.9161** (exact reproduction), decision `DO_NOT_MERGE` |
| 200-pair benchmark, baseline | F1 **0.813**, `DNM 64`, veto precision **84.4%**, false vetoes 10 |
| 200-pair benchmark, signal active | F1 **0.815**, `DNM 64` (**identical set**), veto precision **84.4%**, false vetoes 10 |
| 200-pair benchmark, fresh clone | `npm run bench` on a clean `git clone` reproduces `expected-baseline.txt` on all 249 lines. The labelled CSV is committed, so nothing external is required |
| Embeddings mis-rank true non-matches? | Yes — global cosine max is pair #4 (M10 vs M12 bolt, 0.9892), which is exactly why the signal only re-ranks candidates and never decides |
| Live `/api/resolve` | top candidate `embeddingSimilarity: 99` **and** `DO_NOT_MERGE` (`critical-dimension-mismatch`) in the same response |

## node_modules size & pruning

`sharp` was never used (no `next/image`, no image preprocessing), yet it shipped
**two full instances (~67 MB)**. `scripts/prune-node-modules.mjs` replaces both
with a 1 KB stub that throws if actually called, so static `import sharp` graphs
stay valid, and deletes `@img`:

```text
node_modules: 712.7 MB → 668.1 MB   (-44.6 MB)
  node_modules/sharp                              → stub
  node_modules/@img                               → removed
  node_modules/@xenova/transformers/node_modules/sharp → stub (47.7 MB class)
  node_modules/@xenova/transformers/node_modules/@img  → removed
```

It runs automatically via `postinstall` and again from `vercel.json`'s
`installCommand` (deterministic on every deploy). Escape hatch: `PRUNE_SKIP=1`.

Kept on purpose (they are load-bearing, not dead weight):

- `onnxruntime-node` — the active ONNX backend in Node (static import in
  `@xenova/transformers/src/backends/onnx.js`)
- `onnxruntime-web` — WASM EP + browser fallback
- `@huggingface/jinja`, `protobufjs`, tokenizer assets

Other measurements: `.next` build output **157.3 MB** (local Windows, includes
platform binaries such as `@next/swc-win32-x64-msvc`; Vercel's Linux build
differs). Vercel applies its limit per traced serverless function — the model
itself is fetched at runtime and never bundled.

## Post-deploy verification checklist

```bash
# 1. pages
curl -fsS https://<app>.vercel.app/            | head -c 100
curl -fsS -o /dev/null -w "%{http_code}\n" https://<app>.vercel.app/migrate   # 200
curl -fsS https://<app>.vercel.app/research | grep -o "0.813"                # F1 tile

# 2. resolve with fusion (first call warms the model)
curl -fsS -X POST https://<app>.vercel.app/api/resolve \
  -H "content-type: application/json" \
  -d '{"description":"SS304 stainless steel pipe 50mm OD x 3mm wall"}' \
  | grep -o "Dense retrieval signal fused"        # present when model warm

# 3. batch parity + parse
curl -fsS -X POST https://<app>.vercel.app/api/resolve-batch \
  -H "content-type: application/json" \
  -d '{"inputs":[{"description":"M10 hex bolt grade 8.8"}]}' | head -c 200
```

Locally: `npm test` (150/150), `npm run lint`, `npm run typecheck`,
`npm run build`, then repeat the two resolve calls against `npm start`.

## Benchmark provenance

200 labelled CPSE material pairs, committed at
[`benchmark/data/material-pairs-labeled.csv`](./benchmark/data/material-pairs-labeled.csv)
so `npm run bench` reproduces the figures from a fresh clone; set
`BENCH_CSV=/path/to.csv` to score a different set. Run 30 Sep 2026. Harness:
[`benchmark/bench.ts`](./benchmark/bench.ts) with recorded reference outputs
([baseline](./benchmark/expected-baseline.txt), [fused](./benchmark/expected-embed.txt))
— see [`benchmark/README.md`](./benchmark/README.md) and the methodology note
[`benchmark/baseline-2026-09-29.md`](./benchmark/baseline-2026-09-29.md).
The research page displays the baseline figure **0.813** (client-side scoring).
