import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end suite runs against the deployed production build by default.
 *
 *   npm run test:e2e                 -> https://material-dna.vercel.app
 *   BASE_URL=http://localhost:3000 npm run test:e2e   -> local verification
 *
 * retries is 0 so the reporter output reflects a single honest pass/fail run
 * against real network + cold-start conditions rather than a smoothed one.
 */
const BASE_URL = process.env.BASE_URL ?? "https://material-dna.vercel.app";

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "./test-results",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  timeout: 180_000,
  expect: { timeout: 30_000 },
  reporter: [["list"], ["json", { outputFile: "test-results/results.json" }]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    timezoneId: "Asia/Kolkata",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 5"] },
    },
  ],
});