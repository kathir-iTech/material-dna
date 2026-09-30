import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// onnxruntime-node dlopens libonnxruntime.so at runtime; @vercel/nft traces
// the .node binding but not the .so, so remote Linux functions fail with
// "libonnxruntime.so.1.14.0: cannot open shared object file". Add identity
// filePathMap entries so the packer ships the shared library too.
const RELATIVE = [
  "node_modules/onnxruntime-node/bin/napi-v3/linux/x64/libonnxruntime.so.1.14.0",
];

const appRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(appRoot, ".vercel", "output");

for (const rel of RELATIVE) {
  if (!fs.existsSync(path.join(appRoot, rel))) {
    throw new Error(`missing project file: ${rel}`);
  }
}

const configs = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name === ".vc-config.json") configs.push(full);
  }
})(outputDir);

let patched = 0;
for (const file of configs) {
  const cfg = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!cfg.filePathMap) continue;
  let changed = false;
  for (const rel of RELATIVE) {
    if (!(rel in cfg.filePathMap)) {
      cfg.filePathMap[rel] = rel;
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(file, JSON.stringify(cfg, null, 2));
    patched++;
  }
}
console.log(`vc-config: patched ${patched}/${configs.length} configs`);
