// Playwright port of the former cypress/e2e/gallery.cy.ts. Triage per ADR
// 0014 §6:
//
//   The spec visits /, then asserts on the rendered NewsSection's
//   .newscardcontainer cards (driven by /api/news/public) and the
//   VorstandSection's .vorstandcard cards (driven by /api/vorstand/public).
//   Both depend on a live server returning seeded data. That's not the
//   "single component, no route or server boundary" Vitest browser bucket —
//   so this lands in Playwright. Ambiguous-default also points here.
//
// Like-for-like assertion port.

import { test, expect } from "./support/fixtures";

test.describe("Gallery Components", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test.describe("News Gallery", () => {
    test("has navigation arrows on desktop", async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await expect(
        page
          .locator("[class*='news']")
          .locator("span.material-symbols-rounded")
          .first(),
      ).toBeAttached();
    });

    test("news cards link to detail pages", async ({ page }) => {
      const firstLink = page.locator(".newscardcontainer a").first();
      await expect(firstLink).toHaveAttribute("href", /\/news\//);
    });

    test("news cards show title, tag, date, and description", async ({
      page,
    }) => {
      const firstCard = page.locator(".newscardcontainer").first();
      await expect(firstCard.locator("h1").first()).not.toHaveText("");
      await expect(firstCard.locator("h3").first()).not.toHaveText("");
      await expect(firstCard.locator("p").first()).not.toHaveText("");
    });

    test("news cards display images", async ({ page }) => {
      await expect(
        page.locator(".newscardcontainer img").first(),
      ).toBeVisible();
    });
  });

  test.describe("Vorstand Gallery", () => {
    test("displays board member cards", async ({ page }) => {
      const cards = page.locator(".vorstandcard");
      await cards.first().scrollIntoViewIfNeeded();
      expect(await cards.count()).toBeGreaterThanOrEqual(6);
    });

    test("board member cards show images", async ({ page }) => {
      const imgs = page.locator(".vorstandcard img");
      await imgs.first().scrollIntoViewIfNeeded();
      expect(await imgs.count()).toBeGreaterThanOrEqual(1);
    });
  });
});
