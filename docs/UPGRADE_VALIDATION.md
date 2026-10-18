# Final Material DNA workspace — verification

Validated on 18 October 2026. This refinement follows commit `5257144`; the uploaded six-slide SIH PDF was reviewed and has not been edited. See [submission alignment](SUBMISSION_ALIGNMENT.md) for the claim-by-claim ledger.

## Final interface and behavior

- Task-first layout: the description, resolve action and three test cases are visible together on desktop. Oversized decorative banners and metric tiles were removed. All six pages share consistent headings, spacing, readable type and navigation.
- Licensed Inter variable font is bundled in `public/fonts`, avoiding third-party runtime font requests. Material descriptions and code values use a separate monospace stack.
- Full-corpus and direct-pair modes are explicit controls. Keyboard resolution works with Ctrl/Command + Enter; input changes mark an older decision as stale. Actual computation/request time and ranking mode are disclosed.
- Relationship labels and structured code proposals are visible in Resolve and included in API/evidence exports. `identity-proposal-v2` incorporates extra explicit specifications and an eight-character hash; the submitted four-character generator and existing master identities remain unchanged. Conflicting pairs have separate previews and no proposed common code. All previews still require registry checks and human approval.
- Repeated spaces, tabs and newlines no longer change multiword material types or hide standards. Parser `v0.2-whitespace` retains exact matched source spans; the frozen lexical benchmark and published policy outputs are unchanged.
- Optional MiniLM ranking is available through an actual server request. Results and reports identify dense or lexical scoring. Loading and inference awaits are bounded by the total model budget; the UI can cancel or time out an outstanding request. The optional model remains unavailable in this workspace, so dense numerical performance was not freshly validated.
- Human review supports approve, keep separate, override with a reason, and reopening a decided case with a required reason. Reopening retains the previous history and persists across reloads. Batch approvals/rejections retain LIFO rollback.
- Browser-local storage retains the latest 100 cases and five migration batches. Version validation, corrupt-state rejection, cross-tab notifications and storage-failure messages remain in place. This is unsigned local demonstration state, not shared authenticated governance.
- CSV and actual ExcelJS XLSX imports support 3 MB / 1,000-row files and 25-row HTTP chunks. Results apply atomically after successful completion, and progress reflects completed rows.
- Exported HTML escapes source text; CSV neutralizes formula-leading cells. Evidence JSON and printable reports include provenance, constraints and identity proposals.
- Missing routes provide a workspace recovery link; route errors provide retry. Responses disable the powered-by header and include nosniff, frame-denial, referrer and device-permission headers. These do not establish production security certification.
- Removed obsolete Tailwind 3 theme configuration and the unused animated progress component. Updated documentation and production screenshots; generated caches, model artifacts and browser traces remain ignored.

## Actual checks

| Check                                 | Result                                                                                                                                                                                            |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frozen dependency installation        | Previously passed with the same committed package/lockfile; this refinement adds no runtime dependency.                                                                                           |
| Lint and TypeScript                   | Passed; also checked during the final production build.                                                                                                                                           |
| Unit/API/regression tests             | **200 passed**, 1 optional real-model test skipped, across 15 files.                                                                                                                              |
| Frozen lexical benchmark              | Exact reproduction of 257 lines after timing normalization.                                                                                                                                       |
| Published review policy               | Recomputed; committed JSON unchanged.                                                                                                                                                             |
| Production build                      | Passed; six pages, seven API routes and missing-route recovery generated.                                                                                                                         |
| Complete desktop/mobile browser suite | **186 passed** in one complete run against the final production build (5.1 minutes), including persisted reopening, keyboard controls, real XLSX, reports and optional server-ranking provenance. |
| Automated accessibility               | 0 WCAG A/AA/2.1AA-tagged violations on all six initial page views in the final production build. This is not complete accessibility certification.                                                |
| Primary desktop task                  | Resolve action ends at approximately 593 px in a 1440 × 960 viewport, with the bundled font loaded.                                                                                               |
| Missing-route/header smoke check      | Unknown route returns 404 with Return to Resolve; ordinary route returns 200; nosniff and DENY present; powered-by absent.                                                                        |
| Root page JavaScript                  | Approximately 148 kB first load; font file approximately 48 kB.                                                                                                                                   |
| Native model benchmark                | Not freshly reproduced; real-model test skipped, not passed.                                                                                                                                      |

## Matching evidence retained

Both columns use lexical scoring on the same known 200-pair synthetic regression set. The additional checks were developed after inspecting errors on that set. This is not independent or held-out validation.

| Measure                               | Submitted lexical engine | Additional checks |
| ------------------------------------- | -----------------------: | ----------------: |
| False MATCH recommendations           |                       13 |                 0 |
| Correct MATCH recommendations         |                       52 |                47 |
| REVIEW abstentions                    |                       70 |                74 |
| Automatic true-match coverage         |                      52% |               47% |
| Precision among MATCH recommendations |                    80.0% |            100.0% |
| F1 over decided pairs                 |                    0.813 |             0.895 |

Run `npm run evaluate:policy`. Its fingerprinted per-pair output is in `benchmark/review-first-results.json`. The submitted fused F1 **0.815** remains separately labeled as historical; lexical fallback is not a reproduction of fused inference. Parser omissions, incomplete specifications and unseen families remain potential sources of error.

## Publication and external validation

Production delivery uses a normal fast-forward push to `main`, which can trigger the owner's existing Vercel Git integration. A GitHub push or successful CI run does not by itself verify a Vercel build or live deployment. Direct Vercel access has been denied by this workspace's network proxy, and no authenticated CLI project binding has been established. Deployment status must be verified separately.

The development environment's reusable install/start instructions and required network domains are saved. Saving settings, applying them to a running machine, publishing an environment and deploying the application are distinct operations.

A 97+ external jury score or winning probability cannot be established by these tests. Independent engineering annotation, unseen-source evaluation, operational validation, authenticated shared persistence and deployment evidence remain relevant gaps. The [pilot protocol](../benchmark/PILOT_PROTOCOL.md) and empty expert-review template provide the next validation gate; no external labels or pilot results have been invented.
