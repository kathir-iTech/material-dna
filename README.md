# Material DNA — SIH 2026 (PS N°26099)

Interactive proof-of-concept that harmonizes **industrial material master data** before an
enterprise does a legacy ERP/CPSE migration. It extracts a structured *"material DNA"* from free-text
descriptions (material family, grade/property class, dimensions, standard, finish, electrical
values…), then decides — per-pair, candidate by candidate — whether two records describe the same
physical material and may be safely merged.

Built against SIH problem statement **PS26099**, *"AI-Driven Standardization and Harmonization of
Material Codes Across CPSEs"* (Ministry of Petroleum & Natural Gas).

> Status: **Hackathon prototype.** All catalog records, review cases and canonical identities are
> **synthetic** and exist solely to demonstrate the decision engine. UI uses **color semantics only**
> (green/amber/red/cyan + icons); labels such as "Proposed canonical identity" are **prototype labels,
> not official national codes**. Nothing here should be treated as production authority.

---

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000
```

Verification commands:

```bash
npm test              # vitest: 150 tests across 7 files (decision engine, clustering, migration, review queue)
npm run lint          # ESLint (Next.js recommended config)
npm run typecheck     # tsc --noEmit (strict)
npm run build         # production build (7 prerendered routes + 7 API routes)
```

## Pages

| Route       | Purpose                                                              |
| ----------- | -------------------------------------------------------------------- |
| `/`         | Resolver: type a description or run one of the three demo scenarios |
| `/review`   | Human-in-the-loop review queue ("material-governance" triage)        |
| `/migrate`  | Bulk CSV migration: parse, resolve, flag conflicts, rollback         |
| `/materials`| Browse the 98-record synthetic corpus + extracted material DNA      |
| `/graph`    | Record linkage graph across the six synthetic sources                |
| `/research` | Related work, benchmark baselines and honest limitations             |

Demo APIs: `GET /api/materials`, `GET /api/materials/[id]`, `GET /api/reviews`, `GET /api/canonical`,
`POST /api/resolve` (`{ description, sourceCode? }`), `POST /api/resolve-batch` (`{ inputs[] }`),
`POST /api/migrate/parse`.

## Demo scenarios (buttons on `/`)

1. **True Duplicate** — `HEX BOLT M12 X 60 8.8 ZP DIN 931` → `MATCH`. The engine extracts the same
   material DNA as the catalog's richer CPSE record despite different naming conventions
   (`ZP` vs `Zinc Plated`, `X` vs `×`, missing `DIN 931`).
2. **Dangerous Near-Match** — the *same phrase* run against an isolated 10.9 property-class family
   → `DO_NOT_MERGE`. Exact wording, but grade **8.8 vs 10.9** is an engineering-critical conflict;
   merged, it would mis-specify a fastener (torque/strength).
3. **Ambiguous Material** — `STEEL BOLT M12` → `REVIEW`. Not enough engineering attributes
   (no grade, no dimension beyond thread, no standard) to establish identity.

## Decision model (the demo's core idea)

Four verdicts: `MATCH | DO_NOT_MERGE | REVIEW | NO_MATCH`, produced by three composable pipelines
under `src/lib/material-dna`:

- **extraction** — normalization + attribute parsers (thread/dimensions/grade/include/electrical/coating),
  plus a precedence-aware material-type classifier (scoped patterns first, then token rules).
- **matching** — per-candidate scoring (semantic `0.45` / attribute `0.35` / evidence `0.20`),
  **constraint evaluation** (critical dims/grade/type conflicts yield `DO_NOT_MERGE`), and an
  **assignment rank** that surfaces true duplicates (attribute agreement first, then evidence
  coverage, then lexical similarity) so look-alike grades never outrank the real match.
- **decision** — thresholds: `MATCH ≥ 85`, `REVIEW ≥ 65`, `NO_MATCH` below; insufficient evidence
  (`< 3` defined attributes) always routes to `REVIEW` with trace
  `insufficient-evidence-depth`.

Reviewed verdicts and canonical mappings live in a client-side store, not a real governance workflow.

## Status vs. the master spec

| Capability | In this demo | Notes |
| ---------- | ------------ | ----- |
| Normalization (units, abbreviations, casing) | **Implemented** | `mm/inch`, `ZP→Zinc Plated`, `×`, `SQ MM`, electrical units |
| Material-family & type classification | **Implemented** | scoped-pattern first, token fallback |
| Attribute extraction (grade, dims, standard, finish) | **Implemented** | covers threaded fasteners, pipes, sheets, electrical parts |
| Critical-constraint enforcement (grade/dims/type) | **Implemented** | any critical conflict ⇒ `DO_NOT_MERGE` |
| Insufficient-evidence gating | **Implemented** | `< 3` defined attrs ⇒ `REVIEW` |
| Candidate ranking (duplicates before near-matches) | **Implemented** | attr → evidence-coverage → lexical |
| Human-in-the-loop review queue | **Implemented** | triage matches/false-positives |
| Seeded corpus + record-linkage graph | **Implemented** | 6 synthetic sources, 98 records |
| Governance / approval workflow | **Proposed for production** | needs RBAC, audit trail, sign-off |
| Weight/calibration tuning | **Proposed** | thresholds hard-coded in `config.ts` |
| Validation against real CPSE data | **Proposed** | requires sanctioned legacy exports |
| LLM-assisted parse fallbacks | **Future work** | only explicit mention; not needed for demo |
| Official ID/classification authority | **Future work** | needs NIC/CPSE gazette mapping, not a demo |
| Real "national code" issuance | **Out of scope** | the product is a decision support tool, not a registry |

## Validation honesty

- **150 tests** across 7 files (`npm test`), covering the three demo scenarios, constraint vetoes
  (SS316L vs SS316, M12×50 dimension conflict, pipe/valve/extraction regressions), constraint-aware
  clustering, bulk migration and the shared review queue. Green: `npm test`, `npm run lint`,
  `npm run typecheck`, `npm run build`.
- The 200-pair labelled benchmark is reproducible *here* — harness [`benchmark/bench.ts`](./benchmark/bench.ts),
  recorded reference outputs ([baseline](./benchmark/expected-baseline.txt) F1 **0.813**,
  [fused](./benchmark/expected-embed.txt) F1 **0.815**) and the methodology note
  ([baseline-2026-09-29.md](./benchmark/baseline-2026-09-29.md)). **Caveat:** the labelled CSV those
  200 pairs come from is not committed (synthetic research data, not cleared for the public repo).
  A fresh clone reproduces the recorded outputs only if you supply the CSV via `BENCH_CSV=`;
  without it `bench.ts` exits with instructions rather than guessing.
- Research page external baselines (TF-IDF P@10 = 1.000, R@200 = 0.170 on Abt-Buy) are cited as
  literature values, not as measurements of this system.
- We report no fabricated accuracy/precision claims for this prototype.

## Repository layout

```
app/                                   <- this Next.js app
  src/
    components/                        (resolve-client, review-client, migration-client, graph, materials, panels…)
    data/demo.ts                       synthetic corpus + scenarios
    hooks/use-resolver.ts              orchestration + review/counterfactual
    lib/material-dna/
      config.ts grade-equivalence.ts canonical-id.ts units.ts dataset-stats.ts clusters.ts
      extraction/ normalization/ matching/ constraints/ demo/
    types/domain.ts                    shared domain model
    app/api/..., app/<routes>           7 API routes, 6 pages
  tests/                               7 test files, 150 tests
  benchmark/                           harness + recorded reference outputs
  scripts/                             postinstall prune + Vercel output helpers
```
