// Prune node_modules after every install (postinstall + Vercel installCommand).
//
// Why: `sharp` is ~67 MB across two instances and NOTHING in this app uses
// image processing:
//   1. node_modules/sharp + node_modules/@img
//      (next's optional image optimizer — we never use next/image)
//   2. node_modules/@xenova/transformers/node_modules/sharp (+ its @img)
//      (transformers.js image preprocessing — we only run feature-extraction;
//       47.7 MB with vendored libvips binaries)
//
// How: directories are REPLACED with a 1 KB stub instead of deleted, because
// both packages statically `import sharp from 'sharp'` at module load
// (next/dist/server/image-optimizer.js and @xenova/transformers
// src/utils/image.js). The stub keeps every import graph valid; calling it
// throws a descriptive error. If image processing is ever needed, run with
// PRUNE_SKIP=1 to keep the real packages.
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

if (process.env.PRUNE_SKIP === "1") {
  console.log("[prune] PRUNE_SKIP=1 — leaving sharp intact.");
  process.exit(0);
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const STUB_FILES = {
  "package.json": JSON.stringify(
    {
      name: "sharp",
      version: "0.0.0-stubbed",
      description: "Stubbed by scripts/prune-node-modules.mjs — image processing is unused in this app.",
      main: "index.js",
      exports: { ".": "./index.js" },
    },
    null,
    2
  ),
  "index.js": `"use strict";
// Stubbed by scripts/prune-node-modules.mjs (image processing is unused).
module.exports = function sharpStub() {
  throw new Error(
    "sharp was pruned from node_modules (this app never processes images). " +
      "Reinstall with PRUNE_SKIP=1 to restore it."
  );
};
module.exports.stubbed = true;
`,
};

const removeDirs = [
  join(root, "node_modules", "@img"),
  join(root, "node_modules", "@xenova", "transformers", "node_modules", "@img"),
];

const stubDirs = [
  join(root, "node_modules", "sharp"),
  join(root, "node_modules", "@xenova", "transformers", "node_modules", "sharp"),
];

let removed = 0;
let stubbed = 0;

for (const dir of removeDirs) {
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true });
    removed++;
  }
}

for (const dir of stubDirs) {
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true });
  }
  mkdirSync(dir, { recursive: true });
  for (const [name, content] of Object.entries(STUB_FILES)) {
    writeFileSync(join(dir, name), content);
  }
  stubbed++;
}

console.log(
  `[prune] stubbed ${stubbed} sharp instance(s), removed ${removed} @img dir(s). ` +
    `Set PRUNE_SKIP=1 to keep real sharp.`
);
