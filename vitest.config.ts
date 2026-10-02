import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  // Next.js compiles JSX with the automatic runtime, so component files do not
  // import React. Match that here so components can be rendered in tests.
  esbuild: {
    jsx: "automatic",
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // The corpus-level clustering tests run a full O(n^2) pass over 98 records
    // and legitimately take 2-9s. Vitest's 5s default made them fail
    // intermittently under parallel load, so give them real headroom.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
