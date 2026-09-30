# 200-pair benchmark harness

Reconstructed methodology (final_audit.md §3): pairwise evaluation — A as
input, B as the sole candidate; confusion matrix over decided pairs.

- `bench.ts` — the harness (bundled with esbuild, run as ESM so `--embed`
  can await model download)
- `expected-baseline.txt` — lexical-only reference run (F1 **0.813**)
- `expected-embed.txt` — dense-retrieval signal fused (F1 **0.815**,
  identical 64 `DO_NOT_MERGE` set / 84.4% veto precision)

Input: `../material-dna-sih26099/05-our-synthetic-data/material-pairs-labeled.csv`
(200 labelled pairs; override with `BENCH_CSV=/path/to.csv`).

## Run (from the `app/` directory)

```bash
npx esbuild benchmark/bench.ts --bundle --platform=node --format=esm "--alias:@=./src" --external:@xenova/transformers --outfile=benchmark/bench.mjs

node benchmark/bench.mjs            # lexical-only  -> matches expected-baseline.txt
node benchmark/bench.mjs --embed    # signal fused  -> matches expected-embed.txt
```

Expected headline lines:

```text
precision(MATCH)=0.800  recall(MATCH)=0.825  F1=0.813     # baseline
DO_NOT_MERGE: 64 total, 54 on true non-matches (veto precision 84.4%), 64 with >=1 critical conflict
false vetoes (true matches blocked): 10
```

`--embed` warms the model on first run (~7 s download, cached afterwards) and
only changes candidate ranking: the vetoed set and false-veto count must be
identical to baseline.
