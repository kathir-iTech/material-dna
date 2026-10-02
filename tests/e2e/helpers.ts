import { test, expect, type Locator, type Page } from "@playwright/test";

/** Routes that must all render, with the nav label that should be marked current. */
export const ROUTES = [
  { path: "/", label: "Resolve" },
  { path: "/review", label: "Review Queue" },
  { path: "/migrate", label: "Bulk Migration" },
  { path: "/materials", label: "Materials" },
  { path: "/graph", label: "Identity Graph" },
  { path: "/research", label: "Research" },
] as const;

/** Fails the test if the page logs a hydration mismatch or any runtime exception. */
export function trackPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  return errors;
}

export async function gotoClean(page: Page, path: string): Promise<void> {
  const response = await page.goto(path, { waitUntil: "domcontentloaded" });
  expect(response, `no response for ${path}`).not.toBeNull();
  expect(response!.status(), `${path} should return 200`).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await waitForHydration(page);
}

/**
 * Waits until the client bundle has executed and React has attached its handlers.
 *
 * `domcontentloaded` only proves the HTML parsed, so anything issued afterwards
 * can still be discarded by hydration: React reclaims the DOM node, reverts a
 * controlled input or drops a file selection outright. These pages fetch no
 * further data once loaded, so an idle network is the signal that the bundle ran.
 */
export async function waitForHydration(page: Page): Promise<void> {
  await page.waitForLoadState("networkidle", { timeout: 60_000 });
}

/**
 * Fills a controlled React input and waits until the value actually sticks.
 *
 * Filling before hydration completes is silently lost: React reclaims the DOM
 * node, reverts the value and never sees the keystroke, so the component never
 * filters. Retrying until `toHaveValue` passes makes the interaction
 * deterministic instead of depending on how fast the bundle executes.
 */
export async function typeInto(locator: Locator, text: string): Promise<void> {
  await expect(async () => {
    await locator.fill(text);
    await expect(locator).toHaveValue(text);
  }).toPass({ timeout: 20_000, intervals: [250, 500, 1000] });
}