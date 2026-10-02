import { test, expect } from "@playwright/test";
import { trackPageErrors, gotoClean, typeInto } from "./helpers";

test.describe("Resolve — demo scenarios", () => {
  test("scenario 1 True Duplicate resolves to MATCH", async ({ page }) => {
    const errors = trackPageErrors(page);
    await gotoClean(page, "/");
    await page.getByRole("button", { name: "Run scenario: True Duplicate" }).click();

    await expect(page.getByText("MATCH", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Risk: LOW")).toBeVisible();
    await expect(
      page.getByText(/Textual and structured attributes agree; no engineering-critical conflict/)
    ).toBeVisible();
    expect(errors).toHaveLength(0);
  });

  test("scenario 2 Dangerous Near-Match is vetoed to DO NOT MERGE on grade conflict", async ({
    page,
  }) => {
    const errors = trackPageErrors(page);
    await gotoClean(page, "/");
    await page.getByRole("button", { name: "Run scenario: Dangerous Near-Match" }).click();

    await expect(page.getByText("DO NOT MERGE", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Risk: CRITICAL")).toBeVisible();
    await expect(
      page.getByText(/Material property class differs: 8\.8 vs 10\.9/).first()
    ).toBeVisible();
    // The veto, not low similarity, must be the stated cause.
    await expect(page.getByText(/CONSTRAINT FAILED/).first()).toBeVisible();
    await expect(
      page.getByText(/an engineering-critical attribute cannot be treated as interchangeable/)
    ).toBeVisible();
    expect(errors).toHaveLength(0);
  });

  test("scenario 3 Ambiguous Material abstains to REVIEW", async ({ page }) => {
    const errors = trackPageErrors(page);
    await gotoClean(page, "/");
    await page.getByRole("button", { name: "Run scenario: Ambiguous Material" }).click();
    await expect(page.getByText("REVIEW", { exact: true }).first()).toBeVisible();
    await expect(
      page.getByText(/Insufficient engineering evidence to establish identity/)
    ).toBeVisible();
    expect(errors).toHaveLength(0);
  });

  test("free-text input resolves a description directly", async ({ page }) => {
    await gotoClean(page, "/");
    await typeInto(page.getByLabel("Material description input"), "HEX BOLT M12 X 60 8.8 ZP DIN 931");
    await page.getByRole("button", { name: "Resolve Material" }).click();
    await expect(page.getByText("MATCH", { exact: true }).first()).toBeVisible();
  });

  test("Reset clears a completed resolution", async ({ page }) => {
    await gotoClean(page, "/");
    await page.getByRole("button", { name: "Run scenario: True Duplicate" }).click();
    await expect(page.getByText("MATCH", { exact: true }).first()).toBeVisible();
    await page.getByRole("button", { name: "Reset", exact: true }).click();
    await expect(page.getByText("MATCH", { exact: true })).toHaveCount(0);
  });
});

test.describe("Resolve — counterfactual", () => {
  test("relieving the grade conflict flips DO NOT MERGE to MATCH", async ({ page }) => {
    await gotoClean(page, "/");
    await page.getByRole("button", { name: "Run scenario: Dangerous Near-Match" }).click();
    await expect(page.getByText("DO NOT MERGE", { exact: true }).first()).toBeVisible();

    const gradeChange = page.getByRole("button", { name: /^Change Grade from / });
    await expect(gradeChange).toHaveAttribute("aria-label", "Change Grade from 10.9 to 8.8");
    await gradeChange.click();

    // Same input, same candidate; only the grade changed. The verdict must flip,
    // which is the proof that the constraint layer is causal rather than cosmetic.
    await expect(page.getByText("MATCH", { exact: true }).first()).toBeVisible();
  });

  test("the counterfactual panel offers grade, dimension and standard levers", async ({ page }) => {
    await gotoClean(page, "/");
    await page.getByRole("button", { name: "Run scenario: True Duplicate" }).click();
    await expect(page.getByRole("button", { name: /^Change Grade from / })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Change Dimension from / })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Change Standard from / })).toBeVisible();
  });

  test("changing only the standard leaves the match intact (standard is not critical)", async ({
    page,
  }) => {
    await gotoClean(page, "/");
    await page.getByRole("button", { name: "Run scenario: True Duplicate" }).click();
    await expect(page.getByText("MATCH", { exact: true }).first()).toBeVisible();
    await page.getByRole("button", { name: /^Change Standard from / }).click();
    await expect(page.getByText("MATCH", { exact: true }).first()).toBeVisible();
  });
});

test.describe("Resolve — review queue hand-off", () => {
  test("a resolved case is propagated into the shared review queue", async ({ page }) => {
    await gotoClean(page, "/");
    await page.getByRole("button", { name: "Run scenario: Dangerous Near-Match" }).click();
    await expect(page.getByText("DO NOT MERGE", { exact: true }).first()).toBeVisible();
    await page.getByRole("button", { name: "Send to Review Queue" }).click();

    await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "Review Queue", exact: true })
      .click();
    await expect(page).toHaveURL(/\/review$/);

    // The freshly sent case must be findable in the queue it was handed off to.
    await typeInto(
      page.getByLabel("Search review cases"),
      "HEX BOLT M12 X 60 8.8 ZP DIN 931"
    );
    await expect(
      page.getByText("HEX BOLT M12 X 60 8.8 ZP DIN 931").first()
    ).toBeVisible();
  });
});