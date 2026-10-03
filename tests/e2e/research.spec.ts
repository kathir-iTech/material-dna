import { test, expect } from "@playwright/test";
import { trackPageErrors, gotoClean } from "./helpers";

/**
 * These are the published, measured figures. They must not drift silently:
 * if the engine changes, the README and this spec must change together.
 */
const BENCHMARK = {
  f1: "0.813",
  precision: "0.800",
  recall: "0.825",
  abstain: "35.0%",
  match: 65,
  doNotMerge: 64,
  noMatch: 1,
  review: 70,
  vetoPrecision: "84.4%",
  falseVetoes: 10,
  total: 200,
  positives: 100,
  categories: 28,
  decided: 130,
  accuracy: "81.5%",
  falseMatches: 13,
  runDate: "30 Sep 2026",
};

test.describe("Research — headline benchmark values", () => {
  test("publishes the exact F1 / precision / recall / abstain figures", async ({ page }) => {
    const errors = trackPageErrors(page);
    await gotoClean(page, "/research");
    await expect(page.getByText(BENCHMARK.f1)).toBeVisible();
    await expect(page.getByText(BENCHMARK.precision)).toBeVisible();
    await expect(page.getByText(BENCHMARK.recall)).toBeVisible();
    await expect(page.getByText(BENCHMARK.abstain)).toBeVisible();
    await expect(page.getByText("F1")).toBeVisible();
    expect(errors).toHaveLength(0);
  });

  test("decision distribution sums to the 200-pair set", async ({ page }) => {
    await gotoClean(page, "/research");
    const { match, doNotMerge, noMatch, review, total } = BENCHMARK;
    expect(match + doNotMerge + noMatch + review).toBe(total);
    await expect(
      page.getByText(
        `MATCH ${match} · DO_NOT_MERGE ${doNotMerge} · NO_MATCH ${noMatch} · REVIEW ${review}`
      )
    ).toBeVisible();
  });

  test("confusion matrix and decided-set accuracy are published", async ({ page }) => {
    await gotoClean(page, "/research");
    await expect(page.getByText(/TP=52\s+FP=13\s+FN=11\s+TN=54/)).toBeVisible();
    await expect(page.getByText(`decided = ${BENCHMARK.decided}`)).toBeVisible();
    await expect(page.getByText(`Accuracy on decided pairs: ${BENCHMARK.accuracy}`)).toBeVisible();
  });

  test("constraint-veto quality matches the published figures", async ({ page }) => {
    await gotoClean(page, "/research");
    await expect(page.getByText(`veto precision ${BENCHMARK.vetoPrecision}`)).toBeVisible();
    await expect(
      page.getByText(`false vetoes (true matches blocked): ${BENCHMARK.falseVetoes}`)
    ).toBeVisible();
    // 54 correct of 64 vetoes is exactly 84.4%.
    expect(Math.round((54 / BENCHMARK.doNotMerge) * 1000) / 10).toBe(84.4);
  });

  test("per-category table totals reconcile cell-by-cell", async ({ page }) => {
    await gotoClean(page, "/research");
    const totalRow = page.getByRole("row").filter({ hasText: /^total/ });
    await expect(totalRow).toHaveCount(1);
    const cells = (await totalRow.getByRole("cell").allInnerTexts()).map((s) => s.trim());
    expect(cells).toEqual([
      "total",
      String(BENCHMARK.total),
      String(BENCHMARK.positives),
      String(BENCHMARK.match),
      String(BENCHMARK.doNotMerge),
      String(BENCHMARK.review),
      String(BENCHMARK.noMatch),
    ]);
  });

  test("per-category table has one row per documented category plus the total", async ({
    page,
  }) => {
    await gotoClean(page, "/research");
    await expect(page.getByText(`${BENCHMARK.categories} categories`).first()).toBeVisible();
    // Scope to the per-category table via the unique total row; the page also has a
// capability-status table, so counting every tbody row would be wrong.
    const categoryTable = page
      .locator("table")
      .filter({ has: page.getByRole("row").filter({ hasText: /^total/ }) });
    await expect(categoryTable).toHaveCount(1);
    expect(await categoryTable.locator("tbody tr").count()).toBe(BENCHMARK.categories + 1);
  });

  test("the vetoed benchmark pairs are dominated by size and word order", async ({ page }) => {
    await gotoClean(page, "/research");
    const row = page.getByRole("row").filter({ hasText: /^word_reorder/ });
    const cells = (await row.getByRole("cell").allInnerTexts()).map((s) => s.trim());
    expect(cells).toEqual(["word_reorder", "61", "61", "38", "1", "22", "0"]);
  });

  test("engine error modes are disclosed rather than hidden", async ({ page }) => {
    await gotoClean(page, "/research");
    await expect(page.getByText(`${BENCHMARK.falseMatches} false MATCHes total`)).toBeVisible();
    await expect(page.getByText("Reported as measured")).toBeVisible();
    // The weakest category must be shown, not omitted.
    await expect(page.getByText(/standard_mapping is 0 correct decisions out of 2/)).toBeVisible();
  });

  test("worked example shows a vetoed high-similarity pair", async ({ page }) => {
    await gotoClean(page, "/research");
    await expect(page.getByText(/SS304 vs SS316L/)).toBeVisible();
    await expect(page.getByText(/SEMANTICALLY SIMILAR/)).toBeVisible();
    await expect(page.getByText(/CONSTRAINT FAILED/).first()).toBeVisible();
    await expect(
      page.getByText(/High textual similarity was detected, but the candidate was rejected/)
    ).toBeVisible();
    await expect(
      page.getByText(/across the whole benchmark the veto fired 64 times, 54 of them correct/)
    ).toBeVisible();
  });

  test("the benchmark is labelled as 100 match / 100 non-match", async ({ page }) => {
    await gotoClean(page, "/research");
    await expect(
      page.getByText(/200 team-created labelled demonstration pairs/)
    ).toBeVisible();
    await expect(page.getByText(/100 match \/ 100 non-match/)).toBeVisible();
  });

  test("the per-category table reconciles the abstentions, not just the matrix", async ({ page }) => {
    await gotoClean(page, "/research");
    // TP + FN counts only decided positives, so it cannot reach 100 on its own.
    // The table has to say where the remaining pairs went, or the totals look
    // like a bug rather than the abstention policy they are.
    await expect(page.getByText(/pos does not equal TP \+ FN/)).toBeVisible();
    await expect(page.getByText(/52 became TP and 11 FN while 37 were abstained/)).toBeVisible();
    await expect(page.getByText(/54 became TN and 13 FP while 33 were abstained/)).toBeVisible();
    await expect(page.getByText(/37 \+ 33 = 70/)).toBeVisible();
  });
});

test.describe("Research — prototype experiments", () => {
  test("quantity extraction coverage is reported with its denominator", async ({ page }) => {
    await gotoClean(page, "/research");
    await expect(page.getByText("102 / 109")).toBeVisible();
    await expect(page.getByText(/93\.6%/)).toBeVisible();
  });

  test("TF-IDF baseline is labelled experimental with its limitation", async ({ page }) => {
    await gotoClean(page, "/research");
    await expect(page.getByText(/TF-IDF P@10 = 1\.000/)).toBeVisible();
    await expect(page.getByText(/R@200 = 0\.170/)).toBeVisible();
    await expect(page.getByText(/e-commerce benchmark, not CPSE material data/i)).toBeVisible();
  });
});

test.describe("Research — honesty and roadmap", () => {
  test("keeps the two benchmarks strictly separate", async ({ page }) => {
    await gotoClean(page, "/research");
    await expect(page.getByText(/never combined into one table/i)).toBeVisible();
    await expect(
      page.getByText(/not a statistically representative CPSE benchmark/i)
    ).toBeVisible();
  });

  test("labels the benchmark run date", async ({ page }) => {
    await gotoClean(page, "/research");
    await expect(page.getByText(new RegExp(BENCHMARK.runDate)).first()).toBeVisible();
  });

  test("capability status does not overclaim", async ({ page }) => {
    await gotoClean(page, "/research");
    await expect(page.getByText("Real CPSE data").first()).toBeVisible();
    await expect(page.getByText("Not available").first()).toBeVisible();
    await expect(page.getByText("SAP integration").first()).toBeVisible();
    await expect(page.getByText("Future").first()).toBeVisible();
  });

  test("lists the unvalidated items honestly", async ({ page }) => {
    await gotoClean(page, "/research");
    for (const item of [
      "Real CPSE material data",
      "Real engineering equivalence decisions",
      "ERP integration",
      "Production security",
    ]) {
      await expect(page.getByText(item, { exact: true }).first()).toBeVisible();
    }
  });

  test("page header marks the whole study as prototype demo data", async ({ page }) => {
    await gotoClean(page, "/research");
    await expect(page.getByRole("heading", { name: "Research" })).toBeVisible();
    await expect(page.getByText(/Demonstration values are synthetic/i)).toBeVisible();
    await expect(page.getByText(/not CPSE production accuracy/i)).toBeVisible();
  });
});