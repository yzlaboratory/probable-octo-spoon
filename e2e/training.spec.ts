// Playwright port of the former cypress/e2e/training.cy.ts. Like-for-like
// assertion equivalence per ADR 0014 triage rule.
//
// /training crosses route + API boundaries (the public training endpoint
// /api/training/public on the e2e server) → Playwright per the triage rule.
// The spec relies on the seeded training_slots from server/schema/004_training.sql,
// which the e2e server boot wrapper provisions in a fresh per-run SQLite DB.

import { test, expect } from "./support/fixtures";

test.describe("Training times", () => {
  test.describe("homepage", () => {
    test("renders the TRAINING section between NEWS and SOCIALS", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto("/");

      await expect(page.getByText("ALEMANNIA NEWS").first()).toBeVisible();
      await expect(page.getByText("TRAINING").first()).toBeVisible();
      await expect(page.getByText("SOCIALS").first()).toBeVisible();

      const headings = await page
        .locator("h1")
        .evaluateAll((nodes) => nodes.map((n) => (n.textContent ?? "").trim()));
      const news = headings.indexOf("ALEMANNIA NEWS");
      const training = headings.indexOf("TRAINING");
      const socials = headings.indexOf("SOCIALS");
      expect(news).toBeGreaterThan(-1);
      expect(training).toBeGreaterThan(news);
      expect(socials).toBeGreaterThan(training);
    });

    test("shows weekday headers for all seven days", async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto("/");
      const section = page.locator(".trainingsection");
      for (const day of [
        "Montag",
        "Dienstag",
        "Mittwoch",
        "Donnerstag",
        "Freitag",
        "Samstag",
        "Sonntag",
      ]) {
        await expect(section.getByText(day, { exact: true })).toBeVisible();
      }
    });
  });

  test.describe("/training page", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/training");
    });

    test("has a TRAINING page heading", async ({ page }) => {
      await expect(page.locator("h1", { hasText: "TRAINING" })).toBeVisible();
    });

    test("renders slot cards with time, trainer and visibility chip", async ({
      page,
    }) => {
      const slots = page.locator(".trainingslot");
      // Wait for the first slot to render (data fetch is async).
      await expect(slots.first()).toBeVisible();
      const count = await slots.count();
      expect(count).toBeGreaterThan(0);

      const first = slots.first();
      await expect(first).toContainText(/^\d{2}:\d{2}/);
      await expect(first).toContainText("Trainer:");
      await expect(first.locator("a[href^='tel:']")).toHaveCount(1);
      await expect(first).toContainText(
        /offen für Gäste|Anmeldung erforderlich|nur Mitglieder/,
      );
    });

    test("phone numbers are tappable via tel:", async ({ page }) => {
      const tel = page.locator(".trainingslot a[href^='tel:']").first();
      await expect(tel).toBeVisible();
      const href = await tel.getAttribute("href");
      expect(href).toMatch(/^tel:\+?\d+$/);
    });

    test("marks an 'Alte Herren' slot as 'offen für Gäste'", async ({
      page,
    }) => {
      const alteHerren = page
        .locator(".trainingslot", { hasText: "Alte Herren" })
        .first();
      await expect(alteHerren).toBeVisible();
      await expect(alteHerren).toContainText("offen für Gäste");
    });
  });

  // Cover the branches the seeded data can't reach on its own:
  //   - .catch handler when /api/training/public errors out
  //   - cleanup function when the component unmounts before the fetch
  //     resolves (the `cancelled` flag)
  //   - banner.message render branch
  //   - daySlots.length === 0 placeholder branch
  test.describe("/training failure & edge-case branches", () => {
    test("renders the empty section when the public API errors", async ({
      page,
    }) => {
      await page.route("**/api/training/public", (route) =>
        route.fulfill({ status: 500, body: "boom" }),
      );
      await page.goto("/training");
      // No slots render, but the section and weekday headers stay visible —
      // i.e. the .catch handler swallowed the error without crashing.
      await expect(
        page.locator("h1", { hasText: "TRAINING" }),
      ).toBeVisible();
      await expect(page.locator(".trainingslot")).toHaveCount(0);
    });

    test("renders the seasonal banner when the API returns one", async ({
      page,
    }) => {
      await page.route("**/api/training/public", (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            slots: [],
            banner: { message: "Hallenrunde-Pause bis 1. März" },
          }),
        }),
      );
      await page.goto("/training");
      await expect(page.locator(".trainingbanner")).toContainText(
        "Hallenrunde-Pause bis 1. März",
      );
    });

    test("renders the empty-day placeholder when a weekday has no slots", async ({
      page,
    }) => {
      await page.route("**/api/training/public", (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ slots: [], banner: { message: null } }),
        }),
      );
      await page.goto("/training");
      // Each weekday column falls back to the dashed placeholder ("—").
      const placeholders = page.locator(
        ".trainingsection .trainingday .border-dashed",
      );
      await expect(placeholders).toHaveCount(7);
    });

    test("aborts the in-flight fetch when the user navigates away", async ({
      page,
    }) => {
      // Hold the response open until after we SPA-navigate away — guarantees
      // the React unmount cleanup runs while the promise is still pending,
      // so both the cleanup arrow (`cancelled = true`) and the
      // `if (cancelled) return;` early-out execute.
      //
      // Must use an in-app Link click, not page.goto(), or React's unmount
      // never runs because the JS realm is torn down with the page.
      let release: (() => void) | undefined;
      await page.route("**/api/training/public", async (route) => {
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ slots: [], banner: { message: null } }),
        });
      });
      await page.goto("/training");
      // Footer renders even with the fetch held (only the slot grid is empty),
      // so the Impressum link is reachable.
      await page
        .locator("footer a", { hasText: "Impressum" })
        .first()
        .click();
      await expect(page).toHaveURL(/\/Impressum$/);
      // Now resolve the held request — the now-unmounted component must
      // hit the cancelled-guard and skip setState.
      release?.();
      await expect(page.locator("h1", { hasText: "IMPRESSUM" })).toBeVisible();
    });
  });

  test.describe("mobile /training page (375x812)", () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto("/training");
    });

    test("page renders and does not overflow horizontally at the document level", async ({
      page,
    }) => {
      // Wait for slots to render so the layout has settled.
      await expect(page.locator(".trainingslot").first()).toBeVisible();
      const dims = await page.evaluate(() => ({
        scrollWidth: document.body.scrollWidth,
        clientWidth: document.body.clientWidth,
      }));
      expect(dims.scrollWidth).toBeLessThanOrEqual(dims.clientWidth);
    });

    test("training grid is horizontally scrollable on mobile", async ({
      page,
    }) => {
      await expect(page.locator(".trainingslot").first()).toBeVisible();
      const dims = await page
        .locator(".trainingsection .hidescrollbar")
        .first()
        .evaluate((el) => ({
          scrollWidth: el.scrollWidth,
          clientWidth: el.clientWidth,
        }));
      expect(dims.scrollWidth).toBeGreaterThan(dims.clientWidth);
    });
  });
});
