import { test, expect, type Locator, type Page } from "@playwright/test";
import { trackPageErrors, gotoClean, typeInto } from "./helpers";

const VALID_CSV = `description,source
HEX BOLT M12 X 60 8.8 ZP DIN 931,CPSE-A
HEX BOLT M12 X 60 CLASS 10.9 ZP DIN 931,CPSE-A
SS304 STAINLESS STEEL PIPE 50MM OD X 3MM WALL,CPSE-B
BALL VALVE 1/2 INCH SS304 FULL PORT BLOWOUT PROOF,CPSE-B
`;

/** No recognised description column in the header row. */
const MALFORMED_CSV = `foo,bar
HEX BOLT M12 X 60 8.8 ZP DIN 931,111
SS304 STAINLESS STEEL PIPE 50MM OD X 3MM WALL,222
`;

const NO_DESCRIPTION_ERROR = /No description column found in the header row/i;
const ROWS = 4;

/** The batch heading the migration page renders for an accepted file. */
function batchHeading(page: Page, name: string): Locator {
  return page.getByRole("heading", { name: new RegExp(name.replace(".", "\\.")) });
}

/**
 * Attaches a file to the upload input and waits until the page actually reacts.
 *
 * `setInputFiles` is one-shot: fired before hydration it is discarded, and no
 * amount of waiting brings the selection back, so on a slow first paint the
 * upload simply vanishes. Retrying until the expected reaction appears makes the
 * interaction deterministic. The reaction differs per file, so callers declare
 * which one they expect — an accepted batch heading, or the parse error.
 */
async function upload(page: Page, name: string, body: string, settled: Locator) {
  await expect(async () => {
    await page.getByLabel("Upload migration file").setInputFiles({
      name,
      mimeType: "text/csv",
      buffer: Buffer.from(body, "utf-8"),
    });
    await expect(settled).toBeVisible();
  }).toPass({ timeout: 30_000, intervals: [250, 500, 1000] });
}

/** Uploads VALID_CSV and runs the pipeline; resolve hits the embedding API, so cold start is slow. */
async function importAndResolve(page: Page, name: string) {
  await upload(page, name, VALID_CSV, batchHeading(page, name));
  await page.getByRole("button", { name: `Run batch resolve (${ROWS} rows)` }).click();
  await expect(page.locator("tbody tr").first()).toBeVisible({ timeout: 150_000 });
}

test.describe("Bulk migration — file contract", () => {
  test("empty state documents the CSV requirements", async ({ page }) => {
    const errors = trackPageErrors(page);
    await gotoClean(page, "/migrate");
    await expect(
      page.getByText(/First row must be a header with a 'description' column/i)
    ).toBeVisible();
    await expect(page.getByText("No batches imported yet.")).toBeVisible();
    await expect(page.getByText(/max 5 MB, 1000 rows/i)).toBeVisible();
    await expect(page.getByText(/held in memory only/i)).toBeVisible();
    expect(errors).toHaveLength(0);
  });

  test("malformed CSV is rejected with an actionable error, not a crash", async ({ page }) => {
    await gotoClean(page, "/migrate");
    await upload(page, "malformed.csv", MALFORMED_CSV, page.getByText(NO_DESCRIPTION_ERROR));

    await expect(page.getByText(NO_DESCRIPTION_ERROR)).toBeVisible();
    // No batch may be created from an unusable file.
    await expect(page.getByText("No batches imported yet.")).toBeVisible();
  });

  test("the parse error clears once a valid file is supplied", async ({ page }) => {
    await gotoClean(page, "/migrate");
    await upload(page, "malformed.csv", MALFORMED_CSV, page.getByText(NO_DESCRIPTION_ERROR));
    await expect(page.getByText(NO_DESCRIPTION_ERROR)).toBeVisible();

    await upload(page, "recovered.csv", VALID_CSV, batchHeading(page, "recovered.csv"));
    await expect(page.getByText(NO_DESCRIPTION_ERROR)).toHaveCount(0);
    await expect(batchHeading(page, "recovered.csv")).toBeVisible();
  });
});

test.describe("Bulk migration — import and resolve", () => {
  test.slow();

  test("valid CSV stages every row and exposes the result filters", async ({ page }) => {
    await gotoClean(page, "/migrate");
    await upload(page, "staged.csv", VALID_CSV, batchHeading(page, "staged.csv"));

    await expect(page.getByText("No batches imported yet.")).toHaveCount(0);
    await expect(page.getByText(new RegExp(`${ROWS} rows · imported`))).toBeVisible();

    for (const f of ["All", "MATCH", "REVIEW", "DO_NOT_MERGE", "Pending"]) {
      await expect(page.getByRole("button", { name: `Filter: ${f}` })).toBeVisible();
    }
    await expect(
      page.getByRole("button", { name: `Run batch resolve (${ROWS} rows)` })
    ).toBeVisible();
  });

  test("resolve vetoes the 8.8 / 10.9 bolt pair instead of merging it", async ({ page }) => {
    await gotoClean(page, "/migrate");
    await importAndResolve(page, "veto.csv");

    const rows = page.locator("tbody tr");
    await expect(rows).toHaveCount(ROWS);

    // The near-identical bolt rows must be separated by the constraint engine.
    await page.getByRole("button", { name: "Filter: DO_NOT_MERGE" }).click();
    expect(await rows.count()).toBeGreaterThan(0);
    await page.getByRole("button", { name: "Filter: All" }).click();
    await expect(rows).toHaveCount(ROWS);
  });

  test("bulk approve moves every pending row and is written to the audit trail", async ({
    page,
  }) => {
    await gotoClean(page, "/migrate");
    await importAndResolve(page, "bulk-approve.csv");

    await typeInto(page.getByLabel("Audit note for bulk action"), "E2E bulk approval");
    await page.getByLabel("Select all pending rows").click();
    await page.getByRole("button", { name: `Approve selected (${ROWS})` }).click();

    // Nothing left pending, everything approved.
    await page.getByRole("button", { name: "Filter: Pending" }).click();
    await expect(page.getByText("No rows match this filter.")).toBeVisible();
    await page.getByRole("button", { name: "Filter: All" }).click();
    await expect(page.locator("tbody tr")).toHaveCount(ROWS);
    await expect(page.getByText("APPROVED", { exact: true }).first()).toBeVisible();

    // The bulk action is auditable.
    await page.getByRole("button", { name: "Audit trail" }).first().click();
    await expect(page.getByText(/bulk/i).first()).toBeVisible();
  });

  test("rollback (LIFO) restores the most recent bulk action", async ({ page }) => {
    await gotoClean(page, "/migrate");
    await importAndResolve(page, "rollback.csv");

    const rollback = page.getByRole("button", { name: /Rollback last bulk action on/i }).first();
    await expect(rollback).toBeDisabled();

    await typeInto(page.getByLabel("Audit note for bulk action"), "E2E rollback subject");
    await page.getByLabel("Select all pending rows").click();
    await page.getByRole("button", { name: `Approve selected (${ROWS})` }).click();
    await expect(rollback).toBeEnabled();

    await rollback.click();

    // Undo returns every row to pending and disables rollback again.
    await page.getByRole("button", { name: "Filter: Pending" }).click();
    await expect(page.locator("tbody tr")).toHaveCount(ROWS);
    await expect(rollback).toBeDisabled();
  });

  test("bulk reject marks rows rejected", async ({ page }) => {
    await gotoClean(page, "/migrate");
    await importAndResolve(page, "bulk-reject.csv");

    await page.getByLabel("Select all pending rows").click();
    await page.getByRole("button", { name: `Reject selected (${ROWS})` }).click();
    await expect(page.getByText("REJECTED", { exact: true }).first()).toBeVisible();
  });

  test("bulk buttons stay disabled until rows are selected", async ({ page }) => {
    await gotoClean(page, "/migrate");
    await importAndResolve(page, "selection.csv");

    await expect(page.getByRole("button", { name: /^Approve selected \(0\)$/ })).toBeDisabled();
    await expect(page.getByRole("button", { name: /^Reject selected \(0\)$/ })).toBeDisabled();

    // `row` is the 1-based CSV line number, so data starts at line 2 (line 1 is the header).
    await page.getByLabel(/^Select row \d+$/).first().click();
    await expect(page.getByRole("button", { name: "Approve selected (1)" })).toBeEnabled();
  });
});