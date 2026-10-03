import { test, expect, type Page } from "@playwright/test";
import { trackPageErrors, gotoClean, typeInto } from "./helpers";

/** Review filters offered by the queue. */
const FILTERS = ["All", "High Risk", "Ambiguous", "Critical Conflict", "Pending"] as const;

const SEEDED = 6;

/** Rows that carry an actual case id (excludes the empty-state placeholder row). */
function caseRows(page: Page) {
  return page.locator('tbody tr[aria-label^="Open review case"]');
}

function rowFor(page: Page, id: string) {
  return page.getByRole("button", { name: `Open review case ${id}` });
}

test.describe("Review queue", () => {
  test("seeded cases render with risk, reason and in-memory warning", async ({ page }) => {
    const errors = trackPageErrors(page);
    await gotoClean(page, "/review");

    await expect(caseRows(page)).toHaveCount(SEEDED);
    await expect(rowFor(page, "REVIEW-1042")).toContainText("Grade differs: 10.9 vs 8.8.");
    await expect(rowFor(page, "REVIEW-1047")).toContainText(
      "Material composition differs: 316L vs 304."
    );
    await expect(page.getByText(/held in memory only/i)).toBeVisible();
    expect(errors).toHaveLength(0);
  });

  test("every filter chip exists and each narrows or holds the list", async ({ page }) => {
    await gotoClean(page, "/review");
    const baseline = await caseRows(page).count();
    expect(baseline).toBe(SEEDED);

    const seen: number[] = [];
    for (const f of FILTERS) {
      await page.getByRole("button", { name: `Filter: ${f}` }).click();
      const count = await caseRows(page).count();
      expect(count, `filter "${f}" returned ${count} rows`).toBeGreaterThan(0);
      expect(count, `filter "${f}" exceeded the unfiltered total`).toBeLessThanOrEqual(baseline);
      seen.push(count);
    }
    // The risk filters must actually be discriminative, not all pass-throughs.
    expect(Math.min(...seen), "no filter narrowed the queue").toBeLessThan(baseline);
  });

  test("Ambiguous filter isolates the abstained (REVIEW) recommendations", async ({ page }) => {
    await gotoClean(page, "/review");
    await page.getByRole("button", { name: "Filter: Ambiguous" }).click();
    const rows = caseRows(page);
    expect(await rows.count()).toBeGreaterThan(0);
    await expect(rows.first()).toContainText("REVIEW-1068");
  });

  test("Critical Conflict filter keeps only high-severity rows", async ({ page }) => {
    await gotoClean(page, "/review");
    await page.getByRole("button", { name: "Filter: Critical Conflict" }).click();
    const rows = caseRows(page);
    expect(await rows.count()).toBeGreaterThan(0);
    // REVIEW-1068 abstained, so it must not appear under a conflict filter.
    await expect(rowFor(page, "REVIEW-1068")).toHaveCount(0);
    await expect(rowFor(page, "REVIEW-1042")).toBeVisible();
  });

  test("High Risk filter keeps CRITICAL and HIGH, excludes MEDIUM", async ({ page }) => {
    await gotoClean(page, "/review");
    await page.getByRole("button", { name: "Filter: High Risk" }).click();
    await expect(rowFor(page, "REVIEW-1051")).toHaveCount(0);
    await expect(rowFor(page, "REVIEW-1042")).toBeVisible();
  });

  test("Pending filter keeps only undecided cases", async ({ page }) => {
    await gotoClean(page, "/review");
    await page.getByRole("button", { name: "Filter: Pending" }).click();
    const rows = caseRows(page);
    expect(await rows.count()).toBeGreaterThan(0);
    await expect(rowFor(page, "REVIEW-1051")).toHaveCount(0);
    for (const row of await rows.all()) {
      await expect(row).toContainText("PENDING");
    }
  });

  test("the Recommendation column explains what the risk filters select on", async ({ page }) => {
    await gotoClean(page, "/review");
    // The filters key off systemRecommendation, which used to be invisible, so a
    // reviewer saw rows vanish with no stated reason. The column must be present
    // and must agree with what each filter keeps.
    await expect(
      page.getByRole("columnheader", { name: "Recommendation" })
    ).toBeVisible();

    const rowsFor = async (filter: string) => {
      await page.getByRole("button", { name: `Filter: ${filter}` }).click();
      const rows = await caseRows(page).all();
      expect(rows.length, `filter "${filter}" returned nothing`).toBeGreaterThan(0);
      return rows;
    };

    for (const row of await rowsFor("Critical Conflict")) {
      await expect(row.getByText("DO NOT MERGE", { exact: true })).toBeVisible();
    }
    for (const row of await rowsFor("Ambiguous")) {
      // Exact match, so the "REVIEW-" case id cannot satisfy this on its own.
      await expect(row.getByText("REVIEW", { exact: true })).toBeVisible();
    }
  });

  test("search narrows by material description", async ({ page }) => {
    await gotoClean(page, "/review");
    await expect(caseRows(page)).toHaveCount(SEEDED);
    await typeInto(page.getByLabel("Search review cases"), "316L");
    await expect(caseRows(page)).toHaveCount(1);
    await expect(rowFor(page, "REVIEW-1047")).toBeVisible();
  });

  test("search narrows by case id", async ({ page }) => {
    await gotoClean(page, "/review");
    await typeInto(page.getByLabel("Search review cases"), "REVIEW-1047");
    await expect(caseRows(page)).toHaveCount(1);
    await expect(rowFor(page, "REVIEW-1047")).toBeVisible();
  });

  test("search is case-insensitive", async ({ page }) => {
    await gotoClean(page, "/review");
    await typeInto(page.getByLabel("Search review cases"), "316l");
    await expect(rowFor(page, "REVIEW-1047")).toBeVisible();
  });

  test("search combines with an active filter", async ({ page }) => {
    await gotoClean(page, "/review");
    await typeInto(page.getByLabel("Search review cases"), "REVIEW-1051");
    await expect(caseRows(page)).toHaveCount(1);
    // REVIEW-1051 is decided, so the Pending filter must exclude it.
    await page.getByRole("button", { name: "Filter: Pending" }).click();
    await expect(caseRows(page)).toHaveCount(0);
  });

  test("search with no match shows an empty state", async ({ page }) => {
    await gotoClean(page, "/review");
    await typeInto(page.getByLabel("Search review cases"), "zzzzz-no-such-material-zzzzz");
    await expect(caseRows(page)).toHaveCount(0);
    await expect(
      page.getByText("No review cases match the current filter or search.")
    ).toBeVisible();
  });

  test("opening a case shows the three decision controls", async ({ page }) => {
    await gotoClean(page, "/review");
    await rowFor(page, "REVIEW-1042").click();
    await expect(page.getByRole("button", { name: "Approve Recommendation" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Keep Separate" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Override" })).toBeVisible();
  });

  test("Approve Recommendation mutates the row status", async ({ page }) => {
    await gotoClean(page, "/review");
    const row = rowFor(page, "REVIEW-1042");
    await expect(row).toContainText("PENDING");
    await row.click();
    await page.getByRole("button", { name: "Approve Recommendation" }).click();
    await expect(row).toContainText("APPROVED");
  });

  test("Keep Separate rejects the recommendation", async ({ page }) => {
    await gotoClean(page, "/review");
    const row = rowFor(page, "REVIEW-1042");
    await row.click();
    await page.getByRole("button", { name: "Keep Separate" }).click();
    await expect(row).toContainText("REJECTED");
  });

  test("Override accepts the reviewer note", async ({ page }) => {
    await gotoClean(page, "/review");
    const row = rowFor(page, "REVIEW-1042");
    await row.click();
    await page
      .getByPlaceholder(/Engineering team confirmed/)
      .fill("E2E override note for both descriptions.");
    await page.getByRole("button", { name: "Override", exact: true }).click();
    await expect(row).toContainText("OVERRIDDEN");
  });

  test("a decided case leaves the Pending filter", async ({ page }) => {
    await gotoClean(page, "/review");
    const row = rowFor(page, "REVIEW-1042");
    await row.click();
    await page.getByRole("button", { name: "Approve Recommendation" }).click();
    await expect(row).toContainText("APPROVED");

    await page.getByRole("button", { name: "Filter: Pending" }).click();
    await expect(row).toHaveCount(0);
  });
});