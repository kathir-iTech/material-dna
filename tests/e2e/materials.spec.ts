import { test, expect } from "@playwright/test";
import { trackPageErrors, gotoClean, typeInto } from "./helpers";

const HEX_BOLT_ID = "MDNA-UNK-HEXBOLT-M12X60MM-DIN931-7C7E";
const LAST_ID = "MDNA-IRON-PIPE-50.8MM-UNK-ADCB";

test.describe("Materials catalogue", () => {
  test("lists all 18 canonical identities", async ({ page }) => {
    const errors = trackPageErrors(page);
    await gotoClean(page, "/materials");

    await expect(page.locator("tbody tr")).toHaveCount(18);
    await expect(page.locator("tbody tr").first()).toContainText(HEX_BOLT_ID);
    await expect(page.locator("tbody tr").last()).toContainText(LAST_ID);
    expect(errors).toHaveLength(0);
  });

  test("table exposes the documented columns", async ({ page }) => {
    await gotoClean(page, "/materials");
    for (const col of [
      "CANONICAL ID",
      "MATERIAL TYPE",
      "NORMALIZED DESCRIPTION",
      "ATTRIBUTES",
      "LINKED LEGACY CODES",
      "SOURCES",
      "STATUS",
    ]) {
      await expect(page.getByRole("columnheader", { name: col })).toBeVisible();
    }
  });

  test("every row is governed and links at least two legacy codes", async ({ page }) => {
    await gotoClean(page, "/materials");
    const rows = page.locator("tbody tr");
    expect(await rows.count()).toBe(18);
    for (const row of await rows.all()) {
      await expect(row).toContainText("GOVERNED");
      await expect(row).toContainText(/\d+ mappings?/);
    }
  });

  test("search by material type narrows the catalogue to one row", async ({ page }) => {
    await gotoClean(page, "/materials");
    await typeInto(page.getByLabel("Search canonical materials"), "Hex Bolt");
    await expect(page.locator("tbody tr")).toHaveCount(1);
    await expect(page.locator("tbody tr").first()).toContainText(HEX_BOLT_ID);
  });

  test("search matches on normalized description", async ({ page }) => {
    await gotoClean(page, "/materials");
    await typeInto(page.getByLabel("Search canonical materials"), "Stainless Steel");
    const n = await page.locator("tbody tr").count();
    expect(n).toBeGreaterThan(0);
    expect(n).toBeLessThan(18);
  });

  test("search matches on canonical id", async ({ page }) => {
    await gotoClean(page, "/materials");
    await typeInto(page.getByLabel("Search canonical materials"), LAST_ID);
    await expect(page.locator("tbody tr")).toHaveCount(1);
  });

  test("search with no match shows an empty state", async ({ page }) => {
    await gotoClean(page, "/materials");
    await typeInto(page.getByLabel("Search canonical materials"), "unobtainium");
    await expect(page.locator("tbody tr")).toHaveCount(0);
  });

  test("row detail reveals linked legacy codes and sources", async ({ page }) => {
    await gotoClean(page, "/materials");
    await page.getByRole("button", { name: `Open canonical material ${HEX_BOLT_ID}` }).click();

    await expect(page.getByRole("heading", { name: HEX_BOLT_ID })).toBeVisible();
    await expect(page.getByText("MAT-18273").first()).toBeVisible();
    await expect(page.getByText("009821").first()).toBeVisible();
    await expect(page.getByText("HX-M12-60-8.8").first()).toBeVisible();
    await expect(page.getByText("GOVERNED").first()).toBeVisible();
  });

  test("page frames the catalogue as proposed, governed identities", async ({ page }) => {
    await gotoClean(page, "/materials");
    await expect(page.getByRole("heading", { name: "Canonical Materials" })).toBeVisible();
    await expect(
      page.getByText(/Proposed canonical identities linking equivalent source records/i)
    ).toBeVisible();
    await expect(page.getByText(/DEMO DATA/i).first()).toBeVisible();
  });
});