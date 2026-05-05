// Playwright port of cypress/e2e/homepage.cy.ts. Like-for-like assertions
// per the ADR 0014 §6 triage rule — the homepage exercises the full mounted
// app, fetches /api/news/public, /api/sponsors/public, /api/vorstand/public
// at runtime, and asserts on cross-component layout (Header, NewsSection,
// VorstandSection, Footer). Crosses route + server boundaries → Playwright.
// The Cypress version stays in place until issue 08 retires Cypress.

import { test, expect } from "./support/fixtures";

test.describe("Homepage", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("loads successfully", async ({ page }) => {
    await expect(page.locator("body")).toBeVisible();
  });

  test("displays the header with club name", async ({ page }) => {
    await expect(page.getByText("SVALEMANNIA").first()).toBeVisible();
    await expect(page.getByText("THALEXWEILER").first()).toBeVisible();
  });

  test("displays the club logo in the header", async ({ page }) => {
    const logo = page.locator("header img, div img").first();
    await expect(logo).toBeVisible();
    await expect(logo).toHaveAttribute("alt", "Club Logo.");
  });

  test("displays the ALEMANNIA NEWS section", async ({ page }) => {
    await expect(page.getByText("ALEMANNIA NEWS").first()).toBeVisible();
  });

  test("displays news cards", async ({ page }) => {
    const cards = page.locator(".newscardcontainer");
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBeGreaterThanOrEqual(1);
  });

  test("displays the SOCIALS section", async ({ page }) => {
    const socials = page.getByText("SOCIALS").first();
    await socials.scrollIntoViewIfNeeded();
    await expect(socials).toBeVisible();
  });

  test("displays the VORSTAND section", async ({ page }) => {
    const vorstand = page.getByText("VORSTAND").first();
    await vorstand.scrollIntoViewIfNeeded();
    await expect(vorstand).toBeVisible();
  });

  test("displays board member cards", async ({ page }) => {
    const cards = page.locator(".vorstandcard");
    await cards.first().scrollIntoViewIfNeeded();
    expect(await cards.count()).toBeGreaterThanOrEqual(1);
  });

  test("displays the footer", async ({ page }) => {
    await expect(
      page.getByText("SV Alemannia Thalexweiler").first(),
    ).toBeAttached();
    await expect(page.getByText("Alemaniastraße 21").first()).toBeAttached();
    await expect(page.getByText("66822 Lebach").first()).toBeAttached();
  });

  test("footer contains navigation links", async ({ page }) => {
    await expect(page.locator("a[href='/']").first()).toBeAttached();
    await expect(page.locator("a[href='/Impressum']").first()).toBeAttached();
    await expect(
      page.locator("a[href='/Datenschutzerklaerung']").first(),
    ).toBeAttached();
  });

  test("footer displays sponsor logos", async ({ page }) => {
    const sponsorImgs = page.locator(".allsponsors img");
    await sponsorImgs.first().scrollIntoViewIfNeeded();
    expect(await sponsorImgs.count()).toBeGreaterThanOrEqual(5);
  });

  test("has Instagram link in header", async ({ page }) => {
    await expect(
      page
        .locator(
          "a[href='https://www.instagram.com/sgthalexweileraschbach/']",
        )
        .first(),
    ).toBeAttached();
  });
});
