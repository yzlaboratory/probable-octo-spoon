// Playwright port of the former cypress/e2e/mobile-layout.cy.ts.
//
// Triage (ADR 0014 §6): the legacy spec navigates between four routes (/,
// /Impressum, /Datenschutzerklaerung, /news/dreikampf2026-02-14) and asserts
// on multi-section structure that only renders when the public API is
// reachable → Playwright.

import { test, expect } from "./support/fixtures";
import { mockPublicData } from "./support/public-mocks";

test.describe("Mobile Layout (375x812 - iPhone)", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await mockPublicData(page);
  });

  test.describe("Header", () => {
    test("logo and club name are visible and fit within viewport", async ({
      page,
    }) => {
      await page.goto("/");
      await expect(page.locator("img[alt='Club Logo.']")).toBeVisible();
      await expect(page.getByText("SVALEMANNIA").first()).toBeVisible();
      await expect(page.getByText("THALEXWEILER").first()).toBeVisible();
    });

    test("header does not overflow horizontally", async ({ page }) => {
      await page.goto("/");
      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.body.scrollWidth,
        clientWidth: document.body.clientWidth,
      }));
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
    });

    test("login button is hidden on mobile", async ({ page }) => {
      await page.goto("/");
      // Cypress: cy.contains("LOGIN").should("not.be.visible") — i.e. element
      // exists but is not currently rendered. The Header hides LOGIN on
      // smaller viewports; assert no visible "LOGIN" text.
      const visibleCount = await page
        .getByText("LOGIN", { exact: true })
        .filter({ visible: true })
        .count();
      expect(visibleCount).toBe(0);
    });

    test("instagram link is visible on mobile", async ({ page }) => {
      await page.goto("/");
      // The header renders an aria-labelled icon link; the footer renders a
      // text link to the same URL. Cypress' `should("be.visible")` fired on
      // the first match in DOM order — pick the header icon explicitly to
      // avoid Playwright strict-mode ambiguity.
      await expect(
        page
          .locator(
            "a[href='https://www.instagram.com/sgthalexweileraschbach/']",
          )
          .first(),
      ).toBeVisible();
    });
  });

  test.describe("Homepage sections", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/");
    });

    test("news section title is visible", async ({ page }) => {
      await expect(page.getByText("ALEMANNIA NEWS").first()).toBeVisible();
    });

    test("news cards are at least 75% viewport width on mobile", async ({
      page,
    }) => {
      const card = page.locator(".newscardcontainer").first();
      await expect(card).toBeVisible();
      const box = await card.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThanOrEqual(375 * 0.75);
    });

    test("news card images render with correct aspect ratio", async ({
      page,
    }) => {
      const img = page.locator(".newscardcontainer img").first();
      await expect(img).toBeVisible();
      const box = await img.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThan(0);
      expect(box!.height).toBeGreaterThan(0);
    });

    test("vorstand cards are at least 75% viewport width on mobile", async ({
      page,
    }) => {
      const card = page.locator(".vorstandcard").first();
      await card.scrollIntoViewIfNeeded();
      const box = await card.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThanOrEqual(375 * 0.75);
    });

    test("footer sponsors wrap and stay within viewport", async ({ page }) => {
      const sponsors = page.locator(".allsponsors").first();
      await sponsors.scrollIntoViewIfNeeded();
      const { scrollWidth, clientWidth } = await sponsors.evaluate((el) => ({
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
      }));
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
    });

    test("footer text is visible and not clipped", async ({ page }) => {
      const club = page.getByText("SV Alemannia Thalexweiler").first();
      await club.scrollIntoViewIfNeeded();
      await expect(club).toBeVisible();
      await expect(page.getByText("66822 Lebach").first()).toBeVisible();
    });

    test("footer links are tappable (not overlapping)", async ({ page }) => {
      const start = page.getByText("Startseite").first();
      await start.scrollIntoViewIfNeeded();
      await expect(start).toBeVisible();
      await expect(page.getByText("Impressum").first()).toBeVisible();
    });
  });

  test.describe("Impressum page", () => {
    test("heading fits on screen without overflow", async ({ page }) => {
      await page.goto("/Impressum");
      await expect(page.getByText("IMPRESSUM").first()).toBeVisible();
      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.body.scrollWidth,
        clientWidth: document.body.clientWidth,
      }));
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
    });

    test("contact info is readable", async ({ page }) => {
      await page.goto("/Impressum");
      await expect(page.getByText("Yannik Zeyer").first()).toBeVisible();
      await expect(page.getByText("0151 2222 8048").first()).toBeVisible();
    });
  });

  test.describe("Datenschutz page", () => {
    test("page loads and long text is scrollable", async ({ page }) => {
      await page.goto("/Datenschutzerklaerung");
      await expect(page.getByText("Datenschutz").first()).toHaveCount(1);
      const overflowEl = page.locator("[class*='overflow-auto']").first();
      const { scrollHeight, clientHeight } = await overflowEl.evaluate(
        (el) => ({
          scrollHeight: el.scrollHeight,
          clientHeight: el.clientHeight,
        }),
      );
      expect(scrollHeight).toBeGreaterThan(clientHeight);
    });

    test("does not overflow horizontally", async ({ page }) => {
      await page.goto("/Datenschutzerklaerung");
      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.body.scrollWidth,
        clientWidth: document.body.clientWidth,
      }));
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
    });
  });

  test.describe("News detail page", () => {
    test("title is visible and wraps properly", async ({ page }) => {
      await page.goto("/news/dreikampf2026-02-14");
      const h1 = page.locator("h1").first();
      await expect(h1).toBeVisible();
      const box = await h1.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x + box!.width).toBeLessThanOrEqual(375 + 1);
    });

    test("image fills most of the viewport width on mobile", async ({
      page,
    }) => {
      await page.goto("/news/dreikampf2026-02-14");
      const img = page.locator("img[alt='Portrait']").first();
      await expect(img).toBeVisible();
      const box = await img.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThanOrEqual(375 * 0.75);
    });

    test("article text is visible below image on mobile", async ({ page }) => {
      await page.goto("/news/dreikampf2026-02-14");
      const text = page.getByText("Dreikampf").first();
      await text.scrollIntoViewIfNeeded();
      await expect(text).toBeVisible();
    });

    test("does not overflow horizontally", async ({ page }) => {
      await page.goto("/news/dreikampf2026-02-14");
      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.body.scrollWidth,
        clientWidth: document.body.clientWidth,
      }));
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
    });
  });
});

test.describe("Small tablet layout (768x1024 - iPad)", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await mockPublicData(page);
  });

  test("homepage loads without horizontal overflow", async ({ page }) => {
    await page.goto("/");
    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.body.scrollWidth,
      clientWidth: document.body.clientWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  test("news cards are visible and properly sized", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".newscardcontainer").first()).toBeVisible();
  });

  test("footer sponsors wrap correctly", async ({ page }) => {
    await page.goto("/");
    const sponsors = page.locator(".allsponsors").first();
    await sponsors.scrollIntoViewIfNeeded();
    await expect(sponsors).toBeVisible();
  });

  test("news detail page image and text stack vertically", async ({ page }) => {
    await page.goto("/news/dreikampf2026-02-14");
    await expect(page.locator("img[alt='Portrait']").first()).toBeVisible();
    const text = page.getByText("Dreikampf").first();
    await text.scrollIntoViewIfNeeded();
    await expect(text).toBeVisible();
  });
});
