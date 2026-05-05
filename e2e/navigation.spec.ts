// Playwright port of the former cypress/e2e/navigation.cy.ts. Like-for-like
// assertions per the ADR 0014 §6 triage rule — the entire spec is about
// crossing route boundaries (/, /Impressum, /Datenschutzerklaerung,
// /news/:path) and asserting the URL after each navigation. Textbook
// Playwright case.

import { test, expect } from "./support/fixtures";

test.describe("Navigation", () => {
  test("navigates from homepage to Impressum via footer link", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator("a[href='/Impressum']").first().click();
    await expect(page).toHaveURL(/\/Impressum/);
    await expect(page.getByText("IMPRESSUM").first()).toBeVisible();
  });

  test("navigates from homepage to Datenschutzerklaerung via footer link", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator("a[href='/Datenschutzerklaerung']").first().click();
    await expect(page).toHaveURL(/\/Datenschutzerklaerung/);
  });

  test("navigates back to homepage from Impressum via Startseite link", async ({
    page,
  }) => {
    await page.goto("/Impressum");
    await page.locator("a[href='/']").first().click();
    await expect(page).toHaveURL(/\/$/);
  });

  test("navigates to a news detail page by clicking a news card", async ({
    page,
  }) => {
    await page.goto("/");
    const firstCard = page.locator(".newscardcontainer a").first();
    await expect(firstCard).toBeVisible();
    await firstCard.click();
    await expect(page).toHaveURL(/\/news\//);
  });
});
