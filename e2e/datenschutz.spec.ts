// Playwright port of cypress/e2e/datenschutz.cy.ts. Like-for-like assertions
// per the ADR 0014 §6 triage rule — Datenschutzerklaerung crosses a route
// boundary (`/Datenschutzerklaerung`) and exercises the full mounted app +
// Footer, so it lands in Playwright. The Cypress version stays in place
// until issue 08 retires Cypress.

import { test, expect } from "./support/fixtures";

test.describe("Datenschutzerklaerung Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/Datenschutzerklaerung");
  });

  test("loads successfully", async ({ page }) => {
    await expect(page.locator("body")).toBeVisible();
  });

  test("displays a privacy policy heading", async ({ page }) => {
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });

  test("contains privacy-related content", async ({ page }) => {
    await expect(page.getByText("Datenschutz").first()).toBeAttached();
  });

  test("mentions data collection", async ({ page }) => {
    await expect(page.getByText("Daten").first()).toBeAttached();
  });

  test("includes the header", async ({ page }) => {
    await expect(page.getByText("SVALEMANNIA").first()).toBeVisible();
  });

  test("includes the footer", async ({ page }) => {
    await expect(
      page.getByText("SV Alemannia Thalexweiler").first(),
    ).toBeAttached();
  });
});
