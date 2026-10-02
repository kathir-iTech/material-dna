import { test, expect } from "@playwright/test";
import { trackPageErrors, gotoClean } from "./helpers";

/** Similarity column index in the held-out table (PAIR | SIM | FINAL | VETO RULE). */
const SIM_COLUMN = 1;

test.describe("Identity graph", () => {
  test("offers all 18 canonical identities", async ({ page }) => {
    const errors = trackPageErrors(page);
    await gotoClean(page, "/graph");
    await expect(page.getByRole("button", { name: /^Show graph for / })).toHaveCount(18);
    expect(errors).toHaveLength(0);
  });

  test("renders a labelled graph for the selected identity", async ({ page }) => {
    await gotoClean(page, "/graph");
    await expect(page.getByRole("img", { name: /^Identity graph for / })).toBeVisible();
  });

  test("cluster list spans CL-01 through CL-18", async ({ page }) => {
    await gotoClean(page, "/graph");
    const body = await page.locator("body").innerText();
    expect(body).toContain("CL-01");
    expect(body).toContain("CL-18");
  });

  test("reports the verified singleton count", async ({ page }) => {
    await gotoClean(page, "/graph");
    await expect(page.getByText("58", { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/records remain singletons/i).first()).toBeVisible();
  });

  test("held-out table has exactly 24 vetoed high-similarity pairs", async ({ page }) => {
    await gotoClean(page, "/graph");
    await expect(page.getByText(/Held out by veto/i).first()).toBeVisible();
    await expect(page.getByText(/24 pairs at similarity/).first()).toBeVisible();
    await expect(page.locator("tbody tr")).toHaveCount(24);
  });

  test("every held-out row is vetoed by a critical engineering rule", async ({ page }) => {
    await gotoClean(page, "/graph");
    const rows = page.locator("tbody tr");
    expect(await rows.count()).toBe(24);
    for (const row of await rows.all()) {
      await expect(row).toContainText(/critical-[a-z-]+-mismatch/);
    }
  });

  test("held-out similarities all sit at or above the stated threshold", async ({ page }) => {
    await gotoClean(page, "/graph");
    const sims = await page
      .locator("tbody tr")
      .evaluateAll((rows) =>
        rows.map((r) => Number((r.querySelectorAll("td")[1]?.textContent ?? "").trim()))
      );
    expect(sims).toHaveLength(24);
    expect(sims.every((s) => Number.isFinite(s)), "similarity column is not numeric").toBe(true);
    expect(Math.min(...sims)).toBeGreaterThanOrEqual(85);
    expect(Math.max(...sims)).toBeLessThanOrEqual(100);
    // Sorted descending for review.
    expect([...sims].sort((a, b) => b - a)).toEqual(sims);
  });

  test("selecting another identity switches the rendered graph", async ({ page }) => {
    await gotoClean(page, "/graph");
    const graph = page.getByRole("img", { name: /^Identity graph for / });
    const before = await graph.getAttribute("aria-label");

    const target = "MDNA-STAINLESSSTEEL-PIPE-50MM-UNK-BA3E";
    await page.getByRole("button", { name: `Show graph for ${target}` }).click();

    await expect(graph).toHaveAttribute("aria-label", `Identity graph for ${target}`);
    expect(await graph.getAttribute("aria-label")).not.toBe(before);
  });

  test("explains the veto as a transitivity breaker", async ({ page }) => {
    await gotoClean(page, "/graph");
    await expect(page.getByText(/transitivity-breaker/i).first()).toBeVisible();
    await expect(page.getByText(/refusing to merge across any pair/i).first()).toBeVisible();
  });

  test("states the governed-link semantics honestly", async ({ page }) => {
    await gotoClean(page, "/graph");
    await expect(page.getByText(/Candidate links are probabilistic/i).first()).toBeVisible();
  });

  test("cluster summary reports the verified corpus counts", async ({ page }) => {
    await gotoClean(page, "/graph");
    // RECORDS 98 · MATCH EDGES 26 · CLUSTERS 18 · SINGLETONS 58 · HELD OUT 24 · INTERNAL CONFLICTS 0
    for (const n of ["98", "26", "18", "58", "24", "0"]) {
      await expect(page.getByText(n, { exact: true }).first()).toBeVisible();
    }
    await expect(page.getByText(/^records$/i).first()).toBeVisible();
    await expect(page.getByText(/match edges/i).first()).toBeVisible();
    await expect(page.getByText(/^clusters$/i).first()).toBeVisible();
    // The constraint-aware result must be internally conflict-free.
    await expect(page.getByText(/0 internal conflicts/).first()).toBeVisible();
  });
});