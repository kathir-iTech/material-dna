// Bundles benchmark/bench.ts into benchmark/bench.mjs so the harness can run as
// plain ESM. It needs bundling because the harness is TypeScript, imports
// through the "@/" alias, and uses top-level await (required by --embed).
//
// Done through the esbuild JS API rather than a shell one-liner so the alias
// flag needs no quoting and the command behaves identically on every platform.
import * as esbuild from "esbuild";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);

await esbuild.build({
  entryPoints: [fileURLToPath(new URL("benchmark/bench.ts", root))],
  outfile: fileURLToPath(new URL("benchmark/bench.mjs", root)),
  bundle: true,
  platform: "node",
  format: "esm",
  // The embedding model must stay external so it is required at runtime from
  // node_modules rather than being inlined into the bundle.
  external: ["@xenova/transformers"],
  alias: { "@": fileURLToPath(new URL("src", root)) },
  logLevel: "warning",
});

console.log("built benchmark/bench.mjs");