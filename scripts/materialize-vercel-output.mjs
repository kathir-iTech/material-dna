import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const outputDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  ".vercel",
  "output"
);

function walk(dir, onEntry) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    onEntry(full, entry);
    if (entry.isDirectory() && !entry.isSymbolicLink()) {
      walk(full, onEntry);
    }
  }
}

const links = [];
walk(outputDir, (full, entry) => {
  if (entry.isSymbolicLink()) links.push(full);
});

if (links.length === 0) {
  console.log("materialize: no symlinks/junctions found");
} else {
  for (const link of links) {
    const target = fs.realpathSync(link);
    if (target.toLowerCase() === link.toLowerCase()) {
      throw new Error(`self-referencing link: ${link}`);
    }
    fs.rmdirSync(link);
    fs.cpSync(target, link, { recursive: true });
    console.log(`materialize: ${path.relative(outputDir, link)} <= ${path.relative(outputDir, target)}`);
  }

  const left = [];
  walk(outputDir, (_full, entry) => {
    if (entry.isSymbolicLink()) left.push(_full);
  });
  if (left.length > 0) {
    throw new Error(`still symlinks: ${left.join(", ")}`);
  }
  console.log(`materialize: done (${links.length} links materialized)`);
}

// Anonymous deployments are limited to 20 functions; we emit 21.
// Prerendered pages have "expiration": false, so their .rsc bypass funcs are
// never invoked by the demo (fallback files serve all traffic). Drop one to
// fit the cap: node scripts/materialize-vercel-output.mjs --drop <name>.func
const dropIndex = process.argv.indexOf("--drop");
if (dropIndex !== -1) {
  const name = process.argv[dropIndex + 1];
  if (!name || !name.endsWith(".func")) {
    throw new Error("usage: --drop <name>.func");
  }
  const target = path.join(outputDir, "functions", ...name.split("/"));
  if (!fs.existsSync(target)) {
    throw new Error(`not found: ${name}`);
  }
  if (fs.lstatSync(target).isSymbolicLink()) {
    throw new Error(`refusing to drop symlink: ${name}`);
  }
  fs.rmSync(target, { recursive: true, force: true });
  console.log(`drop: ${name} removed for anonymous 20-function cap`);
}

const funcs = [];
walk(path.join(outputDir, "functions"), (full, entry) => {
  if (entry.isDirectory() && full.endsWith(".func")) funcs.push(full);
});
console.log(`functions remaining: ${funcs.length}`);
if (funcs.length > 20) {
  throw new Error(`still ${funcs.length} functions (> 20 anonymous cap)`);
}
