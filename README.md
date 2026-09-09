# Material DNA — SIH 2026 (PS N°26099)

Interactive proof-of-concept that harmonizes **industrial material master data** before an
enterprise does a legacy ERP/CPSE migration. It extracts a structured *"material DNA"* from free-text
descriptions (material family, grade/property class, dimensions, standard, finish, electrical
values…), then decides — per-pair, candidate by candidate — whether two records describe the same
physical material and may be safely merged.

Aligned with the SIH problem statement *"Material Identification and Harmonization"* and the master
specification (SIH 1.0) that accompanied it.

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
npm test              # vitest: 30 unit tests on the decision engine (tests/domain.test.ts)
npm run lint          # ESLint (Next.js recommended config)
npm run typecheck     # tsc --noEmit (strict)
npm run build         # production build (12 static pages)
```

## Pages

| Route       | Purpose                                                              |
| ----------- | -------------------------------------------------------------------- |
| `/`         | Resolver: type a description or run one of the three demo scenarios |
| `/review`   | Human-in-the-loop review queue ("material-governance" triage)        |
| `/materials`| Browse the 98-record synthetic corpus + extracted material DNA      |
| `/graph`    | Record linkage graph across the three synthetic sources              |
| `/research` | Related work, benchmark baselines and honest limitations             |

Public demo APIs: `GET /api/materials`, `GET /api/reviews`, `GET /api/canonical`,
`POST /api/resolve` (`{ description, sourceCode? }`).

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
| Seeded corpus + record-linkage graph | **Implemented** | 3 synthetic sources, 98 records |
| Governance / approval workflow | **Proposed for production** | needs RBAC, audit trail, sign-off |
| Weight/calibration tuning | **Proposed** | thresholds hard-coded in `config.ts` |
| Validation against real CPSE data | **Proposed** | requires sanctioned legacy exports |
| LLM-assisted parse fallbacks | **Future work** | only explicit mention; not needed for demo |
| Official ID/classification authority | **Future work** | needs NIC/CPSE gazette mapping, not a demo |
| Real "national code" issuance | **Out of scope** | the product is a decision support tool, not a registry |

## Validation honesty

- The 30 tests pin behavior on the three demo scenarios plus edge cases (SS316L vs SS316, M12×50
  dimension conflict, pipe/valve/extraction regressions). Green: `npm test`, `npm run lint`,
  `npm run typecheck`, `npm run build`.
- Research page benchmarks cite only real baselines from
  `../material-dna-sih26099/02-benchmark-datasets/baseline-results.md` (e.g. TF-IDF P@10 = 1.000 and
  R@200 = 0.170 on Abt-Buy). The synthetic-material dataset (200 pairs) is our intended evaluation
  target — Leipzig product benchmarks are too simple for industrial-material jargon.
- We report no fabricated accuracy/precision claims for this prototype.

## Repository layout

```
app/                                   <- this Next.js app
  src/
    components/                        (resolve-client, review-client, graph, materials, panels…)
    data/demo.ts                       synthetic corpus + scenarios
    hooks/use-resolver.ts              orchestration + review/counterfactual
    lib/material-dna/{extraction,normalization,matching,decision*,demo,config,graph}
    types/domain.ts                    shared domain model
    app/api/..., app/(pages)           routes
  tests/domain.test.ts                 engine tests
../material-dna-sih26099/              research/benchmarks (standards, papers, baselines, UG/CPSE style)
```