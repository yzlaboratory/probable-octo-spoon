import { describe, it, expect, vi, afterEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Footer from "./Footer";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const serverSponsor = (i: number, weight = i) => ({
  id: i,
  name: `S${i}`,
  tagline: null,
  linkUrl: `https://s${i}.test`,
  cardPalette: "purple" as const,
  logoHasOwnBackground: i % 2 === 0,
  weight,
  // Embed an inline svg variant so bestSponsorLogo returns a non-fallback URL.
  logo: {
    id: 100 + i,
    variants: { svg: `/sponsor-${i}.svg` },
    mimeType: "image/svg+xml",
  },
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Footer", () => {
  it("renders the partner heading, nav links, address block, and copyright row even before sponsors load", () => {
    let _resolve!: (r: Response) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise<Response>((r) => {
            _resolve = r;
          }),
      ),
    );
    const { container } = render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    );
    expect(container.textContent).toContain("Partner & Förderer");
    expect(container.textContent).toContain("Adresse");
    expect(container.textContent).toContain("SV Alemannia Thalexweiler");
    expect(container.textContent).toContain("svthalexweiler.de");
    // No sponsor tiles yet — the loaded list is empty during the pending fetch.
    expect(container.querySelectorAll(".allsponsors > div").length).toBe(0);
    // Footer-Navigation has the six expected links.
    const footerNavAnchors = container.querySelectorAll(
      "nav[aria-label='Footer-Navigation'] a",
    );
    expect(footerNavAnchors.length).toBe(6);
  });

  it("renders one tile per non-fallback sponsor logo once the API resolves", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse([serverSponsor(1), serverSponsor(2), serverSponsor(3)]),
      ),
    );
    const { container } = render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    );
    await waitFor(() => {
      const tiles = container.querySelectorAll(".allsponsors > div");
      expect(tiles.length).toBe(3);
    });
    // Mixed grayscale/invert classes per `hasBackground` — both branches should fire across the three tiles.
    const imgs = Array.from(container.querySelectorAll(".allsponsors img"));
    const someGrayscale = imgs.some((img) =>
      img.className.includes("grayscale"),
    );
    const someInvert = imgs.some((img) => img.className.includes("invert"));
    expect(someGrayscale).toBe(true);
    expect(someInvert).toBe(true);
  });

  it("renders no sponsor tiles when every sponsor falls back to the placeholder logo", async () => {
    // Sponsor with no logo → bestSponsorLogo returns the local logo asset, which
    // the Footer skips via `if (sponsor.ImageUrl !== logo)`.
    // We explicitly wait until the resolved sponsor list has been mapped (i.e.
    // the array prop has flushed through React) by mixing one real-logo sponsor
    // into the response and waiting for that tile to mount, then asserting that
    // the placeholder-logo entry produced zero additional tiles. This guarantees
    // the `else` branch of the `ImageUrl !== logo` guard is exercised.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse([
          serverSponsor(7),
          {
            id: 99,
            name: "Placeholder",
            tagline: null,
            linkUrl: "https://placeholder.test",
            cardPalette: "transparent",
            logoHasOwnBackground: false,
            weight: 1,
            logo: null,
          },
        ]),
      ),
    );
    const { container } = render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    );
    // Wait for the fetch to resolve: real-logo sponsor produces 1 tile.
    await waitFor(() => {
      expect(container.querySelectorAll(".allsponsors > div").length).toBe(1);
    });
    // The placeholder entry hit the `else` branch and produced no tile.
  });

  it("falls back to no sponsors when the API rejects", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("offline");
      }),
    );
    const { container } = render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(container.textContent).toContain("svthalexweiler.de"),
    );
    expect(container.querySelectorAll(".allsponsors > div").length).toBe(0);
  });
});
