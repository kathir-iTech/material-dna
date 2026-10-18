import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
await build({
  entryPoints: [root + "benchmark/evaluate-review-policy.ts"],
  outfile: root + ".next/review-policy-evaluation.mjs",
  platform: "node",
  format: "esm",
  bundle: true,
  external: ["@xenova/transformers", "exceljs"],
  alias: { "@": root + "src" },
  logLevel: "warning",
});
execFileSync(process.execPath, [root + ".next/review-policy-evaluation.mjs"], {
  cwd: root,
  stdio: "inherit",
});
