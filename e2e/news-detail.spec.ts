// Playwright port of the former cypress/e2e/news-detail.cy.ts. Like-for-like
// assertions per the ADR 0014 §6 triage rule — visits the dynamic
// /news/:path route, asserts on rendered article content (title, tag, image,
// body) plus the Layout's Header and Footer. Crosses route + server
// boundaries (/api/news/public/:slug fetch). Default Playwright.
//
// Slugs come from scripts/seed-local-demo.mjs — the per-run e2e DB is
// repopulated by run-e2e.mjs before each Playwright invocation, so these
// fixtures are deterministic.

import { test, expect } from "./support/fixtures";

// `sommerfest-rueckblick` is the entry whose tag is FESTLICHKEIT in the
// public-data seed — keeping the tag-assertion equivalence with the
// original Cypress spec (which used `dreikampf2026-02-14`, also FESTLICHKEIT).
const testPath = "sommerfest-rueckblick";

const allSeededPaths = [
  "saisonstart-2026",
  "auswaertssieg-bezirksliga",
  "jugendcup-erfolg",
  "neuer-trainer",
  "spendenaktion",
  "sommerfest-rueckblick",
];

test.describe("News Detail Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/news/${testPath}`);
  });

  test("loads successfully", async ({ page }) => {
    await expect(page.locator("body")).toBeVisible();
  });

  test("displays the news title", async ({ page }) => {
    const title = page.locator("h1").first();
    await expect(title).toBeVisible();
    await expect(title).not.toHaveText("");
  });

  test("displays the article tag", async ({ page }) => {
    await expect(page.getByText("FESTLICHKEIT").first()).toBeVisible();
  });

  test("displays the article image", async ({ page }) => {
    await expect(page.locator("img[alt='Portrait']").first()).toBeVisible();
  });

  test("displays the long-form article text", async ({ page }) => {
    // The seed inserts a fixed long_html that includes "Demo-Artikel".
    const body = page.getByText("Demo-Artikel").first();
    await body.scrollIntoViewIfNeeded();
    await expect(body).toBeVisible();
  });

  test("includes the header", async ({ page }) => {
    await expect(page.getByText("SVALEMANNIA").first()).toBeVisible();
  });

  test("includes the footer", async ({ page }) => {
    await expect(
      page.getByText("SV Alemannia Thalexweiler").first(),
    ).toBeAttached();
  });

  test("all news paths are accessible", async ({ request }) => {
    for (const slug of allSeededPaths) {
      const res = await request.get(`/news/${slug}`);
      expect(res.status()).toBe(200);
    }
  });
});
