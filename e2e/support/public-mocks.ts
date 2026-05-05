// Route-mock helpers for the Playwright public-page ports of the former
// Cypress responsive / layout specs.
//
// The e2e Express server is booted with an empty SQLite DB (only admin is
// optionally seeded by scripts/run-e2e.mjs). The legacy Cypress public-site
// specs assumed a static src/data/news.json plus a hardcoded sponsor list, so
// without seeding the public API endpoints the home / news-detail /
// Impressum / Datenschutz views render skeletons and the legacy assertions
// (e.g. ".newscardcontainer", ".allsponsors", ".vorstandcard") fail.
//
// These helpers intercept the public read endpoints and return fixture data
// shaped like the production server payloads, keeping the ported specs
// like-for-like with the Cypress originals while not coupling them to the
// e2e DB seeder. Hook with `await mockPublicData(page)` before page.goto().
//
// All mock payloads are intentionally minimal: just enough for the public
// components (NewsSection, VorstandSection, Footer.allsponsors, Sponsorcard
// in the news gallery) to render the structural elements the ported specs
// assert on.

import type { Page } from "@playwright/test";

interface MediaPayload {
  id: number;
  variants: Record<string, string>;
  mimeType: string;
}

interface ServerNews {
  id: number;
  slug: string;
  title: string;
  tag: string;
  short: string;
  longHtml: string;
  publishAt: string | null;
  createdAt: string;
  hero: MediaPayload | null;
}

interface ServerSponsor {
  id: number;
  name: string;
  tagline: string | null;
  linkUrl: string;
  cardPalette: "transparent" | "purple" | "warm-neutral" | "cool-neutral";
  logoHasOwnBackground: boolean;
  weight: number;
  logo: MediaPayload | null;
}

interface ServerVorstand {
  id: number;
  name: string;
  role: string;
  email: string | null;
  phone: string | null;
  portrait: MediaPayload | null;
}

// 1x1 transparent PNG so <img> tags resolve a real network response under the
// e2e server (and aren't flagged as "broken" by the browser).
const PNG_1x1 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

function pngMedia(id: number): MediaPayload {
  const url = `data:image/png;base64,${PNG_1x1}`;
  return {
    id,
    variants: {
      svg: url,
      "1600w": url,
      "800w": url,
      "400w": url,
      "320w": url,
      "200w": url,
      "160w": url,
      "640w": url,
      fallbackJpg: url,
    },
    mimeType: "image/png",
  };
}

function makeNews(): ServerNews[] {
  // Six items so the news gallery exercises both the mobile (post-index-0)
  // and desktop (pre-index-3) sponsor slots, matching the legacy
  // src/data/news.json fixture used by the Cypress specs.
  const baseDate = "2026-02-14T10:00:00.000Z";
  const slugs = [
    { slug: "dreikampf2026-02-14", title: "Dreikampf 2026" },
    { slug: "saisonstart-2026", title: "Saisonstart 2026" },
    { slug: "spielbericht-1", title: "Spielbericht 1" },
    { slug: "spielbericht-2", title: "Spielbericht 2" },
    { slug: "jugendcup", title: "Jugendcup" },
    { slug: "vereinsfeier", title: "Vereinsfeier" },
  ];
  return slugs.map((s, i) => ({
    id: i + 1,
    slug: s.slug,
    title: s.title,
    tag: "MANNSCHAFT",
    short: "Kurzbeschreibung — Demo-Inhalt für e2e.",
    longHtml:
      `<p>${s.title} — Long-form Demo-Inhalt für die ${s.slug} Detailseite. Mindestens etwas Text, damit der Body scrollbar wird.</p>`.repeat(
        8,
      ),
    publishAt: baseDate,
    createdAt: baseDate,
    hero: pngMedia(100 + i),
  }));
}

function makeSponsors(): ServerSponsor[] {
  // Eight sponsors so shuffleTopSponsors(8) yields a non-empty Sponsorcard.
  return Array.from({ length: 8 }).map((_, i) => ({
    id: i + 1,
    name: `Sponsor ${i + 1}`,
    tagline: null,
    linkUrl: "https://example.com",
    cardPalette: "transparent",
    logoHasOwnBackground: false,
    weight: 50 - i,
    logo: pngMedia(200 + i),
  }));
}

function makeVorstand(): ServerVorstand[] {
  return Array.from({ length: 6 }).map((_, i) => ({
    id: i + 1,
    name: `Vorstand ${i + 1}`,
    role: "Demo-Rolle",
    email: `vorstand${i + 1}@example.com`,
    phone: "0151 0000 0000",
    portrait: pngMedia(300 + i),
  }));
}

interface PublicMocksOpts {
  /** Override the news payload (e.g. to omit a slug for the 404 case). */
  news?: ServerNews[];
  /** Override the sponsor payload. */
  sponsors?: ServerSponsor[];
  /** Override the vorstand payload. */
  vorstand?: ServerVorstand[];
}

/**
 * Stub the public-data endpoints used by the home / news-detail pages so
 * the ported specs see deterministic content regardless of the e2e DB state.
 */
export async function mockPublicData(
  page: Page,
  opts: PublicMocksOpts = {},
): Promise<void> {
  const news = opts.news ?? makeNews();
  const sponsors = opts.sponsors ?? makeSponsors();
  const vorstand = opts.vorstand ?? makeVorstand();

  await page.route("**/api/news/public", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(news),
    });
  });

  await page.route("**/api/news/public/*", async (route) => {
    const url = new URL(route.request().url());
    const slug = decodeURIComponent(url.pathname.split("/").pop() ?? "");
    const item = news.find((n) => n.slug === slug);
    if (!item) {
      await route.fulfill({ status: 404, body: "" });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(item),
    });
  });

  await page.route("**/api/sponsors/public", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(sponsors),
    });
  });

  await page.route("**/api/vorstand/public", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(vorstand),
    });
  });

  // Ancillary endpoints the home page also fetches. Empty payloads keep the
  // skeleton states in their "no data" branch without 404 noise.
  await page.route("**/api/training/public", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ blocks: [], note: null }),
    });
  });
  await page.route("**/api/instagram", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: "[]",
    });
  });
  await page.route("**/api/fupa/standings", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: "[]",
    });
  });
  await page.route("**/api/fupa/fixtures", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: "[]",
    });
  });
}
