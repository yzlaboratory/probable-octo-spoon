import { describe, it, expect, vi, afterEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import NewsSection from "./NewsSection";

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

const serverSponsor = (
  i: number,
  weight = i,
  palette: "transparent" | "purple" | "warm-neutral" | "cool-neutral" = "purple",
  logo:
    | null
    | { id: number; variants: Record<string, string>; mimeType: string } = null,
) => ({
  id: i,
  name: `S${i}`,
  tagline: null,
  linkUrl: `https://s${i}.test`,
  cardPalette: palette,
  logoHasOwnBackground: false,
  weight,
  logo,
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("NewsSection", () => {
  it("renders one Newscard per item plus the gallery scroll buttons", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse([])),
    );
    const items = [newsItem(1), newsItem(2)];
    const { container } = render(
      <MemoryRouter>
        <NewsSection newsItems={items} />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(container.querySelectorAll(".newscardcontainer").length).toBe(2);
    });
    // Gallery's prev/next overlay buttons rendered.
    expect(container.querySelector(".newsNextButton")).not.toBeNull();
    expect(container.querySelector(".newsPrevButton")).not.toBeNull();
    expect(container.textContent).toContain("ALEMANNIA NEWS");
  });

  it("interleaves a Sponsorcard at index 0 (mobile) and at index 3 (desktop) when there are at least four items", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse([serverSponsor(1, 5), serverSponsor(2, 3)]),
      ),
    );
    const items = [newsItem(1), newsItem(2), newsItem(3), newsItem(4)];
    const { container } = render(
      <MemoryRouter>
        <NewsSection newsItems={items} />
      </MemoryRouter>,
    );
    await waitFor(() => {
      // Wait for sponsors to load so both Sponsorcards render.
      const tiles = container.querySelectorAll(".cs-tile");
      expect(tiles.length).toBeGreaterThanOrEqual(2);
    });
    // Both visibility wrappers render: lg:hidden (mobile-only) and hidden lg:block (desktop-only).
    expect(container.querySelector(".lg\\:hidden")).not.toBeNull();
    expect(container.querySelector(".hidden.lg\\:block")).not.toBeNull();
  });

  it("renders nothing news-card-side when newsItems is empty", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse([])),
    );
    const { container } = render(
      <MemoryRouter>
        <NewsSection newsItems={[]} />
      </MemoryRouter>,
    );
    expect(container.querySelectorAll(".newscardcontainer").length).toBe(0);
    expect(container.textContent).toContain("ALEMANNIA NEWS");
  });

  it("renders both interleaved Sponsorcards with one anchor per loaded sponsor (mixed palettes)", async () => {
    // Concrete logos so bestSponsorLogo returns deterministic URLs and the
    // Sponsorcard <a><img src> chain renders deterministically.
    const withLogo = (i: number) => ({
      id: 100 + i,
      variants: { svg: `/sponsor-${i}.svg` },
      mimeType: "image/svg+xml",
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse([
          serverSponsor(1, 5, "purple", withLogo(1)),
          // 'transparent' produces a Color === undefined, exercising the
          // Color != undefined ? Color : "" branch in NewsSection.
          serverSponsor(2, 4, "transparent", withLogo(2)),
          serverSponsor(3, 3, "warm-neutral", withLogo(3)),
        ]),
      ),
    );
    const items = [newsItem(1), newsItem(2), newsItem(3), newsItem(4)];
    const { container } = render(
      <MemoryRouter>
        <NewsSection newsItems={items} />
      </MemoryRouter>,
    );

    // Sponsorcard renders one <a> per imageUrl. Two Sponsorcards × 3 sponsors = 6 anchors.
    await waitFor(() => {
      const sponsorAnchors = Array.from(
        container.querySelectorAll<HTMLAnchorElement>("a[target='_blank']"),
      ).filter((a) => /^https:\/\/s\d/.test(a.getAttribute("href") ?? ""));
      expect(sponsorAnchors.length).toBe(6);
    });
    const allHrefs = Array.from(
      container.querySelectorAll<HTMLAnchorElement>("a"),
    )
      .map((a) => a.getAttribute("href") ?? "")
      .filter((h) => /^https:\/\/s\d/.test(h));
    expect(allHrefs.filter((h) => h === "https://s1.test").length).toBe(2);
    expect(allHrefs.filter((h) => h === "https://s2.test").length).toBe(2);
  });
});
