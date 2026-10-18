import { test, expect } from "@playwright/test";
import ExcelJS from "exceljs";
import { gotoClean, trackPageErrors } from "./helpers";

test("direct comparison exposes the new connection veto and preserves the submitted option", async ({
  page,
}) => {
  await gotoClean(page, "/");
  await page
    .getByRole("button", { name: "Compare two descriptions", exact: true })
    .click();
  await page
    .getByLabel("Material description input")
    .fill("Butterfly valve 150mm wafer type EPDM seat");
  await page
    .getByLabel("Reference description input")
    .fill("Butterfly valve 150mm lug type EPDM seat");
  const policy = page.getByRole("checkbox", {
    name: /Additional specification checks/,
  });
  await policy.uncheck();
  await page
    .getByRole("button", { name: "Resolve Material", exact: true })
    .click();
  await expect(page.getByText("MATCH", { exact: true }).first()).toBeVisible();
  await policy.check();
  await page
    .getByRole("button", { name: "Resolve Material", exact: true })
    .click();
  await expect(
    page.getByText("DO NOT MERGE", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByText(/End connection differs: wafer vs lug/).first(),
  ).toBeVisible();
});

test("review decision and its note survive a complete reload", async ({
  page,
}) => {
  await gotoClean(page, "/");
  await page
    .getByRole("button", { name: "Run scenario: Dangerous Near-Match" })
    .click();
  await page
    .getByRole("button", { name: "Send to Review Queue", exact: true })
    .click();
  await page
    .getByRole("navigation", { name: "Primary" })
    .getByRole("link", { name: "Review Queue", exact: true })
    .click();
  const row = page.locator('tbody tr[aria-label^="Open review case"]').first();
  await row.click();
  await page
    .getByLabel(/Reviewer reason/)
    .fill("Reviewed grade conflict; preserve separate specifications.");
  await page
    .getByRole("button", { name: "Keep Separate", exact: true })
    .click();
  await expect(row).toContainText("REJECTED");
  await page.reload();
  await expect(row).toContainText("REJECTED");
  await row.click();
  await expect(
    page
      .getByText("Reviewed grade conflict; preserve separate specifications.", {
        exact: false,
      })
      .first(),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Local decision trail" }),
  ).toBeVisible();
});

test("a real XLSX workbook imports and its batch survives reload", async ({
  page,
}) => {
  const wb = new ExcelJS.Workbook();
  wb.addWorksheet("Materials").addRows([
    ["description", "source"],
    ["HEX BOLT M12 X 60 8.8 ZP DIN 931", "CPSE-A"],
  ]);
  const buffer = Buffer.from(await wb.xlsx.writeBuffer());
  await gotoClean(page, "/migrate");
  await page.getByLabel("Upload migration file").setInputFiles({
    name: "pilot-workbook.xlsx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer,
  });
  await expect(
    page.getByRole("heading", { name: /pilot-workbook.xlsx/ }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: /pilot-workbook.xlsx/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Run batch resolve \(1 rows\)/ }),
  ).toBeVisible();
});

test("the printable report contains the actual source and explicit unsigned provenance", async ({
  page,
}) => {
  await gotoClean(page, "/");
  await page
    .getByRole("button", { name: "Run scenario: Dangerous Near-Match" })
    .click();
  const downloaded = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export decision report", exact: true })
    .click();
  const download = await downloaded;
  const stream = await download.createReadStream();
  let html = "";
  for await (const chunk of stream!) html += chunk.toString();
  expect(html).toContain("8.8");
  expect(html).toContain("10.9");
  expect(html).toContain("DO NOT MERGE");
  expect(html).toContain("unsigned export");
});

test("invalid local state cannot break review hydration", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "material-dna.workspace.v1.reviews",
      JSON.stringify({ version: 1, data: [{ id: "broken" }] }),
    ),
  );
  const errors = trackPageErrors(page);
  await gotoClean(page, "/review");
  await expect(
    page.locator('tbody tr[aria-label^="Open review case"]'),
  ).toHaveCount(6);
  expect(errors).toHaveLength(0);
});

test("identity graph exposes a computed blocked relationship", async ({
  page,
}) => {
  await gotoClean(page, "/graph");
  await page
    .getByRole("button", { name: "Inspect blocked candidate", exact: true })
    .click();
  await expect(
    page.getByText("DO NOT MERGE", { exact: true }).first(),
  ).toBeVisible();
});

test("the policy comparison discloses coverage and known-set development", async ({
  page,
}) => {
  await gotoClean(page, "/research");
  const card = page.locator(".surface-card").filter({
    has: page.getByRole("heading", {
      name: "Additional specification screening",
    }),
  });
  await expect(card.getByText("47%", { exact: true })).toBeVisible();
  await expect(card.getByText("37%", { exact: true })).toBeVisible();
  await expect(
    card.getByText(/Checks were developed after inspecting errors/),
  ).toBeVisible();
});

test("source evidence supports keyboard opening, modal focus and Escape dismissal", async ({
  page,
}) => {
  await gotoClean(page, "/");
  await page
    .getByRole("button", { name: "Run scenario: True Duplicate" })
    .click();
  const candidate = page
    .getByRole("button", { name: /^Inspect candidate / })
    .first();
  await candidate.focus();
  await page.keyboard.press("Space");
  const drawer = page.getByRole("dialog", { name: /^Source evidence for / });
  await expect(drawer).toBeVisible();
  await expect
    .poll(() =>
      drawer.evaluate((element) => element.contains(document.activeElement)),
    )
    .toBe(true);
  await page.keyboard.press("Tab");
  await expect
    .poll(() =>
      drawer.evaluate((element) => element.contains(document.activeElement)),
    )
    .toBe(true);
  await page.keyboard.press("Shift+Tab");
  await expect
    .poll(() =>
      drawer.evaluate((element) => element.contains(document.activeElement)),
    )
    .toBe(true);
  await page.keyboard.press("Escape");
  await expect(drawer).toHaveCount(0);
  await expect(candidate).toBeFocused();
});

test("Present demo opens the walkthrough from the current Resolve route", async ({
  page,
}) => {
  await gotoClean(page, "/");
  await page.getByRole("link", { name: "Present demo", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Guided demonstration" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "01 · Find a duplicate", exact: true })
    .click();
  await expect(page.getByText("MATCH", { exact: true }).first()).toBeVisible();
});
