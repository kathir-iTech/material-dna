# Development and deployment

Material DNA uses Next.js 15 / React 19 with Node.js 20+ (validated with Node 24). There is no required database or application secret. The fixed submission's matching configuration remains available; the application additionally enables `review-first-v1` specification screening.

```bash
npm ci
npm run dev
```

The Resolve workspace offers a guided presentation at `/?demo=1`, reference-corpus resolution, direct pair comparison, and an explicit switch for additional specification checks. No external AI service is required for the browser demo.

## Validation

```bash
npm test -- --maxWorkers=2
npm run lint
npm run typecheck
npm run bench:check
npm run evaluate:policy
npm run build
```

`bench:check` reproduces the submitted lexical configuration. `evaluate:policy` writes the separately versioned development comparison to `benchmark/review-first-results.json`; a test checks its dataset fingerprint and every published decision. It uses the same known synthetic set, not an independent holdout. The submitted fused F1 0.815 is a historical recorded result. Run `npm run bench:check:embed` only when the real model is available; never describe lexical fallback as a reproduced fused result.

End-to-end tests default to the local app and auto-start it if needed:

```bash
npm exec -- playwright install chromium
npm run test:e2e
# Use a preinstalled Chromium in a Linux container:
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e
# Explicitly test a deployed preview:
BASE_URL=https://your-preview.vercel.app npm run test:e2e
```

Stop the development server before a production build; both commands use `.next`. A production smoke test uses `npm start` after a successful build.

## Vercel

Import `kathir-iTech/material-dna` into an authenticated Vercel account, or use the Vercel CLI after secure sign-in. The repository's `vercel.json` selects Next.js and `npm run build`. Test a preview before updating the production alias.

```bash
vercel login
vercel link
vercel deploy
# After preview validation:
vercel deploy --prod
```

Account authentication, project access, network access, a successful build and functional preview checks are separate prerequisites. A local build or existing public URL does not establish account access. Never add tokens or credential values to this repository.

The install step runs `scripts/prune-node-modules.mjs`, which preserves import compatibility while replacing unused image-processing packages with stubs. `PRUNE_SKIP=1` retains real sharp packages if image processing is later needed.

## Spreadsheet imports

CSV parsing is an RFC 4180 state machine. XLSX is read server-side by ExcelJS, distributed through the standard npm registry. The first worksheet is used. Maximum input size is 3 MB and 1,000 accepted rows per batch. Imports report invalid rows and truncation. Resolution runs in 25-row HTTP chunks with actual completed-row progress and applies decisions only after every chunk succeeds. The browser requests lexical ranking for a consistent batch configuration; API callers can request optional dense ranking. The 3 MB file limit keeps the base64 JSON payload below Vercel’s serverless request-size limit. This is a bounded prototype workflow, not a resumable national-scale ingestion system.

## Dense retrieval and fallback

`/api/resolve` and `/api/resolve-batch` optionally load `Xenova/all-MiniLM-L6-v2` via transformers.js. The model is not bundled. It needs supported HTTPS connectivity to Hugging Face and its artifact hosts. `TRANSFORMERS_CACHE` optionally overrides `/tmp/material-dna-model-cache`; its directory must be writable.

The request budget includes cold model loading and inference. Unavailable or slow models return lexical fallback; the browser Resolve flow always uses lexical scoring. API callers can select the original matching configuration with `"policy":"submitted"`; the default applies additional specification checks. A successful response does not prove embeddings were active: inspect `embeddingSimilarity` and audit events.

## Storage and exported evidence

The latest 100 review cases and 5 migration batches are saved in versioned browser-local storage. Snapshots are validated before restoration, and storage failures are surfaced. Exports provide decision reports, JSON evidence, review registers, canonical mappings and batch decisions. CSV exports neutralize formula-leading text, and printable HTML escapes source data.

This is not shared institutional persistence: storage can be cleared, unavailable or modified by the browser user. There is no authenticated reviewer identity, signed audit log, SAP connector or official national coding authority. Production governance and real CPSE validation remain separate work.
