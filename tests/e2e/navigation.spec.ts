import { test, expect } from "@playwright/test";
import { ROUTES, trackPageErrors, gotoClean } from "./helpers";

test.describe("Navigation", () => {
  test("every route renders 200 with no runtime or hydration errors", async ({ page }) => {
    for (const route of ROUTES) {
      const errors = trackPageErrors(page);
      await gotoClean(page, route.path);
      await page.waitForTimeout(1200);
      expect(errors, `${route.path} logged errors: ${errors.join(" | ")}`).toHaveLength(0);
    }
  });

  test("nav marks exactly the current page for each route", async ({ page }) => {
    for (const route of ROUTES) {
      await gotoClean(page, route.path);
      const current = page.locator('[aria-current="page"]');
      await expect(current, `${route.path} should mark one current nav item`).toHaveCount(1);
      await expect(current).toHaveText(route.label);
    }
  });

  test("clicking through the primary nav reaches every page", async ({ page }) => {
    await gotoClean(page, "/");
    const nav = page.getByRole("navigation", { name: "Primary" });
    await expect(nav.getByRole("link")).toHaveCount(ROUTES.length);
    for (const route of ROUTES) {
      await nav.getByRole("link", { name: route.label, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`${route.path === "/" ? "/" : route.path}$`));
      await expect(page.locator('[aria-current="page"]')).toHaveText(route.label);
    }
  });

  test("every route is reachable by direct URL and shows a page heading", async ({ page }) => {
    for (const route of ROUTES) {
      const response = await page.goto(route.path, { waitUntil: "domcontentloaded" });
      expect(response?.status(), `${route.path} status`).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    }
  });

  test("no horizontal overflow at mobile width", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const route of ROUTES) {
      await gotoClean(page, route.path);
      await page.waitForTimeout(400);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth
      );
      expect(overflow, `${route.path} overflows by ${overflow}px`).toBeLessThanOrEqual(1);
    }
  });

  test("every SVG is either labelled or explicitly hidden from a11y tree", async ({ page }) => {
    for (const route of ROUTES) {
      await gotoClean(page, route.path);
      const unlabelled = await page.evaluate(() =>
        Array.from(document.querySelectorAll("svg")).filter(
          (s) =>
            !s.getAttribute("aria-label") &&
            !s.getAttribute("aria-hidden") &&
            !s.querySelector("title")
        ).length
      );
      expect(unlabelled, `${route.path} has ${unlabelled} unlabelled SVGs`).toBe(0);
    }
  });

  test("footer identifies the demonstrator on every route", async ({ page }) => {
    for (const route of ROUTES) {
      await gotoClean(page, route.path);
      await expect(page.getByText("SIH26099")).toBeVisible();
    }
  });
});