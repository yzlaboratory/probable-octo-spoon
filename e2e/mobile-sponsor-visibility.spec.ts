// Playwright port of cypress/e2e/mobile-sponsor-visibility.cy.ts.
//
// Triage (ADR 0014 §6): asserts on the news gallery's mobile-vs-desktop
// sponsor-slot composition. The render path needs the full mounted app
// (NewsSection composes Newscards + a Sponsorcard whose visibility flips
// on Tailwind's `lg:` breakpoint) plus the public sponsor / news APIs.
// Crosses the server boundary → Playwright.
//
// In principle the NewsSection alone could run in Vitest browser if its
// data fetching were stubbable in-process — but stubbing useEffect-driven
// fetch + relying on real `lg:` viewport behaviour brings most of the
// Playwright surface anyway. Default (per the rule's last bullet) ⇒
// Playwright.
//
// Like-for-like with the Cypress original. The Cypress copy stays in
// place until issue 08 deletes Cypress wholesale.

import { test, expect } from "./support/fixtures";
import { mockPublicData } from "./support/public-mocks";

test.describe("Mobile sponsor visibility", () => {
  test.describe("phone (375x812)", () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await mockPublicData(page);
      await page.goto("/");
    });

    test("renders a sponsor rotator within the first two cards of the news gallery", async ({
      page,
    }) => {
      const gallery = page.locator(".galleryContainer").first();
      await expect(gallery).toBeVisible();
      const sponsorIndex = await gallery.evaluate((el) => {
        const visibleChildren = Array.from(el.children).filter(
          (child) => getComputedStyle(child as HTMLElement).display !== "none",
        ) as HTMLElement[];
        return visibleChildren.findIndex((c) =>
          c.querySelector("img[alt='Sponsor']"),
        );
      });
      expect(sponsorIndex).toBeLessThan(2);
    });

    test("does not render the desktop news sponsor slot on mobile", async ({
      page,
    }) => {
      const gallery = page.locator(".galleryContainer").first();
      await expect(gallery).toBeVisible();
      // For each <img alt="Sponsor"> inside the first gallery: if its
      // .shrink-0 ancestor is the desktop-only one (carries `hidden`), it
      // must compute to display:none.
      const violations = await gallery.evaluate((el) => {
        const imgs = Array.from(
          el.querySelectorAll("img[alt='Sponsor']"),
        ) as HTMLImageElement[];
        const bad: string[] = [];
        for (const img of imgs) {
          const root = img.closest(".shrink-0") as HTMLElement | null;
          if (!root) continue;
          const isDesktopOnly = root.classList.contains("hidden");
          if (isDesktopOnly && getComputedStyle(root).display !== "none") {
            bad.push("desktop-only sponsor visible at mobile width");
          }
        }
        return bad;
      });
      expect(violations).toEqual([]);
    });
  });

  test.describe("desktop (1440x900)", () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await mockPublicData(page);
      await page.goto("/");
    });

    test("keeps the desktop news sponsor slot at visible position 3 (fourth item)", async ({
      page,
    }) => {
      const gallery = page.locator(".galleryContainer").first();
      await expect(gallery).toBeVisible();
      const sponsorIndex = await gallery.evaluate((el) => {
        const visibleChildren = Array.from(el.children).filter(
          (child) => getComputedStyle(child as HTMLElement).display !== "none",
        ) as HTMLElement[];
        return visibleChildren.findIndex((c) =>
          c.querySelector("img[alt='Sponsor']"),
        );
      });
      expect(sponsorIndex).toBe(3);
    });

    test("hides the mobile-only news sponsor slot on desktop", async ({
      page,
    }) => {
      const gallery = page.locator(".galleryContainer").first();
      await expect(gallery).toBeVisible();
      const violations = await gallery.evaluate((el) => {
        const imgs = Array.from(
          el.querySelectorAll("img[alt='Sponsor']"),
        ) as HTMLImageElement[];
        const bad: string[] = [];
        for (const img of imgs) {
          const root = img.closest(".shrink-0") as HTMLElement | null;
          if (!root) continue;
          // Mobile-only slot uses `lg:hidden`; at lg+ it must compute display:none.
          if (
            root.classList.contains("lg:hidden") &&
            getComputedStyle(root).display !== "none"
          ) {
            bad.push("mobile-only sponsor visible at desktop width");
          }
        }
        return bad;
      });
      expect(violations).toEqual([]);
    });
  });
});
