// Playwright port of cypress/e2e/impressum.cy.ts. Like-for-like assertions
// per the ADR 0014 §6 triage rule — Impressum crosses a route boundary
// (`/Impressum`) and exercises the full mounted app + Footer, so it lands in
// Playwright (not Vitest browser). The Cypress version stays in place; issue
// 08 retires Cypress wholesale.

import { test, expect } from "./support/fixtures";

test.describe("Impressum Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/Impressum");
  });

  test("loads successfully", async ({ page }) => {
    await expect(page.locator("body")).toBeVisible();
  });

  test("displays the IMPRESSUM heading", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("IMPRESSUM");
  });

  test("shows the responsible person", async ({ page }) => {
    await expect(page.getByText("Yannik Zeyer").first()).toBeVisible();
  });

  test("shows the address", async ({ page }) => {
    await expect(page.getByText("Zum Eisresch 36a")).toBeVisible();
    await expect(page.getByText("66822 Lebach").first()).toBeVisible();
  });

  test("displays the KONTAKT section", async ({ page }) => {
    await expect(page.getByText("KONTAKT")).toBeVisible();
    await expect(page.getByText("0151 2222 8048")).toBeVisible();
    await expect(
      page.getByText("throwaway.relock977@passinbox.com"),
    ).toBeVisible();
  });

  test("displays the REDAKTIONELL VERANTWORTLICH section", async ({ page }) => {
    await expect(page.getByText("REDAKTIONELL VERANTWORTLICH")).toBeVisible();
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
