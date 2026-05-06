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

const serverSponsor = (i: number, weight = i) => ({
  id: i,
  name: `S${i}`,
  tagline: null,
  linkUrl: `https://s${i}.test`,
  cardPalette: "purple" as const,
  logoHasOwnBackground: false,
  weight,
  logo: null,
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
});
