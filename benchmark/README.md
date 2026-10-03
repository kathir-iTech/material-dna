# 200-pair benchmark harness

Methodology and the measured baseline are recorded in
[`baseline-2026-09-29.md`](./baseline-2026-09-29.md): pairwise evaluation — A as
input, B as the sole candidate; confusion matrix over decided pairs.

Everything needed to reproduce the published numbers is in this directory. A
fresh clone can run the benchmark with no external files and no environment
variables.

## Contents

| File | What it is |
|---|---|
| `data/material-pairs-labeled.csv` | The labelled 200-pair set (100 true matches, 100 true non-matches, 28 categories) |
| `bench.ts` | The harness |
| `expected-baseline.txt` | Recorded lexical-only reference run (F1 **0.813**) |
| `expected-embed.txt` | Recorded dense-retrieval-signal run (F1 **0.815**) |
| `baseline-2026-09-29.md` | Methodology, threshold sweep and interpretation |

The labelled data is **synthetic**, team-authored for this demonstrator. It is
committed deliberately so the reported metrics are checkable rather than
merely asserted.

## Run

From the `app/` directory, after `npm install`:

```bash
npm run bench          # lexical-only  -> reproduces expected-baseline.txt
npm run bench:embed    # signal fused  -> reproduces expected-embed.txt
```

Both bundle `bench.ts` to `benchmark/bench.mjs` first, so there is no separate
build step to remember. Set `BENCH_CSV=/path/to/other.csv` to score a different
labelled set without editing the harness.

### Verifying against the golden files

To check rather than eyeball:

```bash
npm run bench:check        # lexical-only run vs expected-baseline.txt
npm run bench:check:embed  # fused run vs expected-embed.txt
```

Each compares the harness output to its recorded run **line for line** and exits
non-zero on any difference, printing the offending lines. Only wall-clock
timings are masked (`runtime:`, and the model load time on the embedding run);
every other line must match exactly. If it fails after an intended engine
change, re-run the harness and replace the golden file deliberately rather than
editing the expected numbers by hand.

The golden files are UTF-8 with LF line endings, pinned by `.gitattributes`, so
the comparison is byte-identical on Windows, macOS and Linux.

## Expected headline lines

Lexical-only run (`expected-baseline.txt`):

```text
rows=200  match=1: 100  match=0: 100
decision distribution: {"MATCH":65,"DO_NOT_MERGE":64,"NO_MATCH":1,"REVIEW":70}
abstain (REVIEW): 70/200 (35.0%)
decided: 130  TP=52 FP=13 FN=11 TN=54
precision(MATCH)=0.800  recall(MATCH)=0.825  F1=0.813
accuracy on decided pairs=81.5%
DO_NOT_MERGE: 64 total, 54 on true non-matches (veto precision 84.4%), 64 with >=1 critical conflict
false vetoes (true matches blocked): 10
```

Dense-retrieval-signal run (`expected-embed.txt`), which is the shipped
configuration and the figure quoted on `/research`:

```text
decision distribution: {"MATCH":66,"DO_NOT_MERGE":64,"NO_MATCH":1,"REVIEW":69}
abstain (REVIEW): 69/200 (34.5%)
decided: 131  TP=53 FP=13 FN=11 TN=54
precision(MATCH)=0.803  recall(MATCH)=0.828  F1=0.815
accuracy on decided pairs=81.7%
DO_NOT_MERGE: 64 total, 54 on true non-matches (veto precision 84.4%), 64 with >=1 critical conflict
false vetoes (true matches blocked): 10
```

Only the trailing `runtime:` line varies between runs. The two runs differ by
exactly one pair moving from `REVIEW` to `MATCH`: the fused signal reorders
candidates, so it resolves one abstention into an accepted match. The veto set
is identical, because the embedding only reorders and never relaxes a hard
attribute constraint.

### Reading the confusion matrix

`TP`/`FP`/`FN`/`TN` cover **decided** pairs only, so they do not sum to the 100
positives. The engine deliberately abstains on a third of the set, and those
`REVIEW` pairs are excluded from the matrix rather than scored as errors:

```text
positives (100) = TP 52 + FN 11 + 37 sent to REVIEW
negatives (100) = TN 54 + FP 13 + 33 sent to REVIEW
abstentions     = 37 + 33 = 70  -> the 70 REVIEW decisions
```

`accuracy counting REVIEW as wrong` in the harness output (53.0%) is the
pessimistic view that charges every abstention as a miss; the 81.5% headline
scores only pairs the engine actually decided.

## Embeddings

`npm run bench:embed` warms the model on first run (~7 s download, cached
afterwards) and only changes candidate ranking. The vetoed set and the
false-veto count must be identical to the lexical-only baseline — the
embedding signal never reaches the veto or the decision.