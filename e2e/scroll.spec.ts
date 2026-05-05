// Playwright port of cypress/e2e/scroll.cy.ts.
//
// Triage (ADR 0014 §6): legacy spec navigates five routes (/, /Impressum,
// /Datenschutzerklaerung, /news/dreikampf2026-02-14, plus the home
// scroll-container variant) and asserts each is scrollable down to the
// .allsponsors footer block. Multi-route + full-app + needs the public
// API for the news gallery and sponsor list to render → Playwright.
//
// Like-for-like with the Cypress original. The Cypress copy stays in
// place until issue 08 deletes Cypress wholesale.

import { test, expect } from "./support/fixtures";
import { mockPublicData } from "./support/public-mocks";

test.describe("Page Scrolling", () => {
  test.beforeEach(async ({ page }) => {
    await mockPublicData(page);
  });

  test("homepage scroll container is scrollable with mouse wheel", async ({
    page,
  }) => {
    await page.goto("/");
    // The overflow-auto container must have a constrained height
    // and scrollHeight > clientHeight to be user-scrollable.
    const overflow = page.locator("[class*='overflow-auto']").first();
    const { scrollHeight, clientHeight } = await overflow.evaluate((el) => ({
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
    }));
    expect(scrollHeight).toBeGreaterThan(clientHeight);
  });

  test("homepage footer is reachable by scrolling", async ({ page }) => {
    await page.goto("/");
    const sponsors = page.locator(".allsponsors").first();
    await sponsors.scrollIntoViewIfNeeded();
    await expect(sponsors).toBeVisible();
  });

  test("Impressum page is scrollable to reach the footer", async ({ page }) => {
    await page.goto("/Impressum");
    const sponsors = page.locator(".allsponsors").first();
    await sponsors.scrollIntoViewIfNeeded();
    await expect(sponsors).toBeVisible();
  });

  test("Datenschutzerklaerung page is scrollable to reach the footer", async ({
    page,
  }) => {
    await page.goto("/Datenschutzerklaerung");
    const sponsors = page.locator(".allsponsors").first();
    await sponsors.scrollIntoViewIfNeeded();
    await expect(sponsors).toBeVisible();
  });

  test("news detail page is scrollable to reach the footer", async ({
    page,
  }) => {
    await page.goto("/news/dreikampf2026-02-14");
    const sponsors = page.locator(".allsponsors").first();
    await sponsors.scrollIntoViewIfNeeded();
    await expect(sponsors).toBeVisible();
  });
});
