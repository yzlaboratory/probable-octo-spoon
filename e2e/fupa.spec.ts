// Playwright port of cypress/e2e/fupa.cy.ts. Like-for-like assertion
// equivalence per ADR 0014 triage rule. The Cypress version stays in place
// until issue 08 deletes Cypress wholesale.
//
// Cross-route + API boundary (the FuPa proxy at /api/fupa/*) → Playwright
// per the triage rule. The FuPa upstream is mocked in-browser via
// page.route() so the suite is deterministic and offline-friendly.

import { test, expect } from "./support/fixtures";

const standingsFixture = {
  fetchedAt: "2026-04-16T10:00:00.000Z",
  competition: {
    slug: "bezirksliga-ill",
    name: "Bezirksliga Ill/Theel",
    season: "25/26",
  },
  standings: [
    {
      rank: 1,
      matches: 24,
      wins: 17,
      draws: 3,
      defeats: 4,
      goalsFor: 60,
      goalsAgainst: 20,
      goalDifference: 40,
      points: 54,
      penaltyPoints: 0,
      team: {
        slug: "sv-habach-m1-2025-26",
        clubSlug: "sv-habach",
        name: "SV Habach",
        shortName: "SVH",
        logo: null,
      },
      isOwnClub: false,
    },
    {
      rank: 11,
      matches: 24,
      wins: 8,
      draws: 6,
      defeats: 10,
      goalsFor: 44,
      goalsAgainst: 51,
      goalDifference: -7,
      points: 30,
      penaltyPoints: 0,
      team: {
        slug: "sg-thalexweiler-aschbach-m1-2025-26",
        clubSlug: "sv-thalexweiler",
        name: "SG Thalex./Aschbach",
        shortName: "SGT",
        logo: null,
      },
      isOwnClub: true,
    },
  ],
};

const fixturesFixture = {
  fetchedAt: "2026-04-16T10:00:00.000Z",
  fixtures: [
    {
      id: 1,
      slug: "sv-thalexweiler-m1-sc-heiligenwald-m1-260419",
      kickoff: "2026-04-19T15:00:00+02:00",
      home: {
        name: "SG Thalex./Aschbach",
        shortName: "SGT",
        clubSlug: "sv-thalexweiler",
        logo: null,
      },
      away: {
        name: "SC Heiligenwald",
        shortName: "SCH",
        clubSlug: "sc-heiligenwald",
        logo: null,
      },
      ourSide: "home",
      competition: "Bezirksliga Ill/Theel",
      competitionShort: "BL Ill/Theel",
      category: "Liga",
      live: false,
    },
    {
      id: 2,
      slug: "sv-bubach-calmesweiler-m1-sv-thalexweiler-m1-260426",
      kickoff: "2026-04-26T15:00:00+02:00",
      home: {
        name: "SV Bubach-Calmesweiler",
        shortName: "SBC",
        clubSlug: "sv-bubach-calmesweiler",
        logo: null,
      },
      away: {
        name: "SG Thalex./Aschbach",
        shortName: "SGT",
        clubSlug: "sv-thalexweiler",
        logo: null,
      },
      ourSide: "away",
      competition: "Bezirksliga Ill/Theel",
      competitionShort: "BL Ill/Theel",
      category: "Liga",
      live: false,
    },
  ],
};

async function mockFupa(
  page: import("@playwright/test").Page,
  overrides: {
    standings?: unknown;
    fixtures?: unknown;
  } = {},
) {
  await page.route("**/api/fupa/standings", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(overrides.standings ?? standingsFixture),
    });
  });
  await page.route("**/api/fupa/fixtures", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(overrides.fixtures ?? fixturesFixture),
    });
  });
}

test.describe("FuPa standings + fixtures", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test.describe("homepage order", () => {
    test("renders sections in the canonical order (news → fixtures → standings → training → socials → vorstand)", async ({
      page,
    }) => {
      await mockFupa(page);
      await page.goto("/");

      // Wait for both FuPa-driven sections to have settled so the headings
      // they render are present.
      await expect(page.locator(".fixturecard").first()).toBeVisible();
      await expect(page.locator(".leaguetable")).toBeVisible();

      const titles = await page
        .locator("h1")
        .evaluateAll((nodes) => nodes.map((n) => (n.textContent ?? "").trim()));
      const order = [
        "ALEMANNIA NEWS",
        "NÄCHSTE SPIELE",
        "TABELLE",
        "TRAINING",
        "SOCIALS",
        "VORSTAND",
      ];
      const indices = order.map((t) => titles.indexOf(t));
      for (let i = 0; i < indices.length; i++) {
        expect(indices[i]).toBeGreaterThan(-1);
      }
      for (let i = 1; i < indices.length; i++) {
        expect(indices[i]).toBeGreaterThan(indices[i - 1]);
      }
    });
  });

  test.describe("TABELLE section", () => {
    test.beforeEach(async ({ page }) => {
      await mockFupa(page);
      await page.goto("/");
      await expect(page.locator(".leaguetable")).toBeVisible();
    });

    test("renders 16-column header and the right row count", async ({
      page,
    }) => {
      await expect(
        page.locator(".leaguetable thead", { hasText: "#" }),
      ).toBeVisible();
      await expect(page.locator(".leaguetable tbody tr")).toHaveCount(2);
    });

    test("highlights the own club's row", async ({ page }) => {
      const own = page.locator("[data-own-club='true']");
      await expect(own).toHaveCount(1);
      await expect(own).toContainText("SG Thalex./Aschbach");
    });

    test("shows the last-updated timestamp", async ({ page }) => {
      await expect(
        page.getByText("zuletzt aktualisiert", { exact: false }),
      ).toBeVisible();
    });
  });

  test.describe("NÄCHSTE SPIELE section", () => {
    test.beforeEach(async ({ page }) => {
      await mockFupa(page);
      await page.goto("/");
      await expect(page.locator(".fixturecard").first()).toBeVisible();
    });

    test("renders fixture cards with kickoff, teams, H/A tag and competition", async ({
      page,
    }) => {
      await expect(page.locator(".fixturecard")).toHaveCount(2);
      const firstCard = page.locator(".fixturecard").first();
      await expect(firstCard).toContainText("So. 19.04.26");
      await expect(firstCard).toContainText("15:00");
      await expect(firstCard).toContainText("SG Thalex./Aschbach");
      await expect(firstCard).toContainText("SC Heiligenwald");
      await expect(firstCard).toContainText("H");
      await expect(firstCard).toContainText("Liga");
    });

    test("links to /spiele via 'Alle Spiele'", async ({ page }) => {
      await expect(page.getByText("Alle Spiele")).toHaveAttribute(
        "href",
        "/spiele",
      );
    });
  });

  test.describe("/spiele page", () => {
    test.beforeEach(async ({ page }) => {
      await mockFupa(page);
      await page.goto("/spiele");
      await expect(page.locator(".fixturecard").first()).toBeVisible();
    });

    test("has a SPIELE heading and lists fixtures grouped by month", async ({
      page,
    }) => {
      await expect(page.locator("h1", { hasText: "SPIELE" })).toBeVisible();
      await expect(page.getByText("April 2026")).toBeVisible();
      await expect(page.locator(".fixturecard")).toHaveCount(2);
    });
  });

  test.describe("empty/error states", () => {
    test("shows placeholder when standings API returns empty", async ({
      page,
    }) => {
      await mockFupa(page, {
        standings: {
          fetchedAt: null,
          competition: null,
          standings: [],
        },
      });
      await page.goto("/");
      await expect(
        page.getByText("Tabelle derzeit nicht verfügbar"),
      ).toBeVisible();
    });

    test("shows placeholder when fixtures API returns empty", async ({
      page,
    }) => {
      await mockFupa(page, {
        fixtures: {
          fetchedAt: null,
          fixtures: [],
        },
      });
      await page.goto("/");
      await expect(
        page.getByText("Derzeit keine anstehenden Spiele"),
      ).toBeVisible();
    });
  });
});
