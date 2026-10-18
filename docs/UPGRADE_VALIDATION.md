# Material DNA workspace upgrade — verification

Validated locally on 18 October 2026 against the checkout based on `198ef6d3d3b9a5df20c53a90097288de1ef93e4d`. The submitted PDF was not edited.

## Delivered

- Redesigned six-page engineering workspace with responsive navigation, readable comparison cards, semantic decision states and a four-step jury walkthrough.
- Direct pair comparisons, explicit submitted-versus-additional-checks selection, actual computation timing, and transparent scenario-specific candidate filters.
- Separately versioned `review-first-v1` checks for explicit pressure, angle, mesh, hardness, actuation, process, polymer, end connection, flow passage and material-condition specifications.
- Counterfactuals retain the same reference record and update the hypothetical text/attributes. They cannot conceal an incompatibility by switching to another candidate.
- Browser-local restoration of the latest 100 review cases and 5 migration batches; versioned decision provenance, local history, storage-failure messages and explicit unsigned/local scope.
- Printable decision reports, evidence JSON, review registers, filtered canonical-master exports, sample CSVs and batch decisions/audit exports. HTML source text is escaped and formula-leading CSV values are neutralized.
- Registry-distributed ExcelJS workbook support, a 3 MB upload limit compatible with base64 serverless requests, 1,000-row files and 25-row resolution chunks with completed-row progress and atomic application of results.
- Interactive graph node inspection including computed blocked relationships; modal keyboard focus containment, Escape dismissal, focus return, skip navigation and improved contrast.
- Reproducible CI workflow, frozen-lockfile Vercel install, documented independent-pilot protocol and an empty expert-annotation template.

## Measured matching change

Both columns below use lexical scoring on the same known 200-pair synthetic regression set. The additional checks were developed after inspecting errors on this set. This is not independent or held-out validation.

| Measure | Submitted lexical engine | Additional checks |
|---|---:|---:|
| False MATCH recommendations | 13 | 0 |
| Correct MATCH recommendations | 52 | 47 |
| REVIEW abstentions | 70 | 74 |
| Automatic true-match coverage | 52% | 47% |
| Precision among MATCH recommendations | 80.0% | 100.0% |
| F1 over decided pairs | 0.813 | 0.895 |

Run `npm run evaluate:policy`. The complete results, per-pair decisions and dataset SHA-256 are committed in `benchmark/review-first-results.json`; tests recompute each published policy decision. The fixed PPT's fused F1 0.815 is preserved as the historical submitted result, with its original denominator and abstention figures shown separately.

The optional embedding can affect the composite ranking score and compatible-pair threshold outcomes; it cannot override a detected critical conflict. It is not a certified equivalence decision. Parser omissions, incomplete specifications and unseen material families remain possible sources of error.

## Actual checks

| Check | Outcome |
|---|---|
| `npm ci` | Passed with the committed lockfile; no external SheetJS tarball required. |
| `npm run lint` | Passed. |
| Type checking | Passed directly and during the production build. |
| Unit/API/regression tests | 188 passed across 14 files; 1 real-model test skipped because model access was unavailable. |
| Submitted lexical golden benchmark | Reproduced exactly, 257 lines after timing normalisation. |
| Production build | Passed; all six application pages and seven API routes generated successfully. |
| Existing desktop/mobile browser checks | 176 passed against a production build. |
| Final keyboard/presentation follow-up | 4 passed against the corrected production build: modal focus/Space/Escape/return and Present demo on the existing Resolve route, on desktop and mobile. |
| Accessibility | Automated WCAG A/AA-tagged scans found 0 violations on all six initial pages. These scans are not a complete accessibility certification. |
| Functional APIs | Materials: 98 records; canonical master: 18 identities; seeded reviews: 6. Direct wafer/lug comparison returned HTTP 200 and DO_NOT_MERGE under additional checks. |
| Root page JS | Approximately 148 kB first load in the production build. |
| Native-model validation | Not freshly reproduced; lexical fallback remains usable. |

The expanded full browser run exposed the two modal keyboard failures; those were diagnosed and corrected, and both device variants passed in the final targeted follow-up. The full expanded suite was not repeated after that final focused correction. CI contains the complete suite for the pushed version; a remote CI result has not been claimed.

## Deployment and remaining gates

Git HTTPS proxy access and push permission were verified. The running proxy denies GitHub API requests despite the saved network additions. Vercel CLI has no authenticated account/project binding; an attempted secure login failed to fetch. No verified production deployment has been completed.

The reusable cloud `install_script`, `start_skill` and required network domains were saved to the environment draft. Saving is distinct from applying runtime settings or publishing an environment. Review/save the environment settings and publish through the product when ready; Vercel application deployment is a separate operation.

A defensible 95+ jury assessment remains unsupported by the current evidence. Independent engineering labels, an unseen source/family-disjoint evaluation, shared durable governance, authenticated approvals, an ERP integration and a verified deployment remain material gaps. See `benchmark/PILOT_PROTOCOL.md` for a concrete validation gate. No result in this upgrade establishes a selection probability or guarantees a competition score.
