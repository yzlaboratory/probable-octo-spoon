// Playwright port of the former cypress/e2e/responsive.cy.ts.
//
// Triage: full app mounted (header + news + footer) at three viewport sizes
// without crossing route boundaries — but the legacy spec asserts on
// elements (.allsponsors, ALEMANNIA NEWS gallery) that only render when the
// public API is reachable. That couples the spec to the e2e server, so per
// ADR 0014 §6 it belongs in **Playwright**, not Vitest browser. Public
// payloads are mocked via mockPublicData() so the spec stays deterministic
// regardless of the e2e DB seeder.

import { test, expect } from "./support/fixtures";
import { mockPublicData } from "./support/public-mocks";

const viewports: Array<[string, number, number]> = [
  ["mobile", 375, 667],
  ["tablet", 768, 1024],
  ["desktop", 1280, 720],
];

for (const [name, width, height] of viewports) {
  test.describe(`Responsive Design — ${name} (${width}x${height})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width, height });
      await mockPublicData(page);
      await page.goto("/");
    });

    test("loads without horizontal overflow", async ({ page }) => {
      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
    });

    test("header is visible", async ({ page }) => {
      await expect(page.getByText("SVALEMANNIA").first()).toBeVisible();
    });

    test("news section is visible", async ({ page }) => {
      await expect(page.getByText("ALEMANNIA NEWS").first()).toBeVisible();
    });

    test("footer is present", async ({ page }) => {
      await expect(
        page.locator("text=SV Alemannia Thalexweiler").first(),
      ).toHaveCount(1);
    });
  });
}
