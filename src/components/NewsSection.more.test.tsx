import { describe, it, expect, vi, afterEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import NewsSection from "./NewsSection";

// The first NewsSection.test.tsx covers the gallery + presence of mobile/
// desktop sponsor wrappers. This one specifically waits for the sponsor
// fetch to resolve so the inline arrow-function props on the two interleaved
// Sponsorcards (imageUrls/urls/backgroundClasses) actually execute.

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const newsItem = (i: number) => ({
  path: `slug-${i}`,
  title: `News ${i}`,
  tag: "TAG",
  short: `short-${i}`,
  date: "2026-05-01",
  imageurl: `/img${i}.jpg`,
});

const serverSponsor = (i: number, weight = i, palette: string = "purple") => ({
  id: i,
  name: `S${i}`,
  tagline: null,
  linkUrl: `https://s${i}.test`,
  cardPalette: palette as "transparent" | "purple" | "warm-neutral" | "cool-neutral",
  logoHasOwnBackground: false,
  weight,
  // Provide a concrete logo so bestSponsorLogo returns a non-fallback URL —
  // the Sponsorcard <a><img src> chain then renders deterministically.
  logo: { id: 100 + i, variants: { svg: `/sponsor-${i}.svg` }, mimeType: "image/svg+xml" },
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("NewsSection (sponsor render path)", () => {
  it("renders both interleaved Sponsorcards with one anchor per loaded sponsor (mixed transparent/purple palettes)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse([
          serverSponsor(1, 5, "purple"),
          // 'transparent' produces a Color === undefined, exercising the
          // Color != undefined ? Color : "" branch in NewsSection.
          serverSponsor(2, 4, "transparent"),
          serverSponsor(3, 3, "warm-neutral"),
        ]),
      ),
    );
    const items = [newsItem(1), newsItem(2), newsItem(3), newsItem(4)];
    const { container } = render(
      <MemoryRouter>
        <NewsSection newsItems={items} />
      </MemoryRouter>,
    );

    // The Sponsorcard renders one <a> per imageUrl. Two Sponsorcards × 3 sponsors = 6 anchors.
    await waitFor(() => {
      const sponsorAnchors = Array.from(
        container.querySelectorAll<HTMLAnchorElement>("a[target='_blank']"),
      ).filter((a) => /^https:\/\/s\d/.test(a.getAttribute("href") ?? ""));
      expect(sponsorAnchors.length).toBe(6);
    });

    // Each sponsor URL should appear at least twice (once per Sponsorcard).
    const allHrefs = Array.from(
      container.querySelectorAll<HTMLAnchorElement>("a"),
    )
      .map((a) => a.getAttribute("href") ?? "")
      .filter((h) => /^https:\/\/s\d/.test(h));
    expect(allHrefs.filter((h) => h === "https://s1.test").length).toBe(2);
    expect(allHrefs.filter((h) => h === "https://s2.test").length).toBe(2);
  });
});
