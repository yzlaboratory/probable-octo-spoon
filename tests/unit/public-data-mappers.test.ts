import { describe, it, expect } from "vitest";
import {
  paletteToClass,
  bestNewsImage,
  bestSponsorLogo,
  bestPortrait,
  toPublicNews,
  toPublicSponsor,
  toPublicVorstand,
} from "../../src/utilities/publicData";

describe("paletteToClass", () => {
  it("maps purple → bg-primary/70", () => {
    expect(paletteToClass("purple")).toBe("bg-primary/70");
  });
  it("maps warm-neutral → bg-rose-200", () => {
    expect(paletteToClass("warm-neutral")).toBe("bg-rose-200");
  });
  it("maps cool-neutral → bg-zinc-100", () => {
    expect(paletteToClass("cool-neutral")).toBe("bg-zinc-100");
  });
  it("returns undefined for transparent", () => {
    expect(paletteToClass("transparent")).toBeUndefined();
  });
  it("returns undefined for an unknown palette (default branch)", () => {
    // The runtime mapper has a default branch we want to exercise.
    expect(paletteToClass("bogus" as unknown as "purple")).toBeUndefined();
  });
});

describe("bestNewsImage", () => {
  it("returns the bundled logo when hero is null", () => {
    expect(bestNewsImage(null)).toMatch(/\.svg/);
  });
  it("prefers svg over jpeg fallback over wide variants", () => {
    expect(
      bestNewsImage({
        id: 1,
        mimeType: "image/svg+xml",
        variants: { svg: "/h.svg", fallbackJpg: "/h.jpg", "1600w": "/h-1600.webp" },
      }),
    ).toBe("/h.svg");
  });
  it("falls through to fallbackJpg when no svg", () => {
    expect(
      bestNewsImage({
        id: 1,
        mimeType: "image/jpeg",
        variants: { fallbackJpg: "/h.jpg", "800w": "/h-800.webp" },
      }),
    ).toBe("/h.jpg");
  });
  it("falls through to 1600w → 800w → 400w in order", () => {
    expect(
      bestNewsImage({
        id: 1,
        mimeType: "image/webp",
        variants: { "1600w": "/a", "800w": "/b", "400w": "/c" },
      }),
    ).toBe("/a");
    expect(
      bestNewsImage({
        id: 1,
        mimeType: "image/webp",
        variants: { "800w": "/b", "400w": "/c" },
      }),
    ).toBe("/b");
    expect(
      bestNewsImage({
        id: 1,
        mimeType: "image/webp",
        variants: { "400w": "/c" },
      }),
    ).toBe("/c");
  });
  it("falls back to logo when variants are empty", () => {
    expect(
      bestNewsImage({ id: 1, mimeType: "image/webp", variants: {} }),
    ).toMatch(/\.svg/);
  });
});

describe("bestSponsorLogo", () => {
  it("returns logo when media is null", () => {
    expect(bestSponsorLogo(null)).toMatch(/\.svg/);
  });
  it("prefers svg → 400w → 200w", () => {
    expect(
      bestSponsorLogo({
        id: 1,
        mimeType: "image/svg+xml",
        variants: { svg: "/s.svg", "400w": "/s-400.webp" },
      }),
    ).toBe("/s.svg");
    expect(
      bestSponsorLogo({
        id: 1,
        mimeType: "image/webp",
        variants: { "400w": "/s-400.webp", "200w": "/s-200.webp" },
      }),
    ).toBe("/s-400.webp");
    expect(
      bestSponsorLogo({
        id: 1,
        mimeType: "image/webp",
        variants: { "200w": "/s-200.webp" },
      }),
    ).toBe("/s-200.webp");
  });
});

describe("bestPortrait", () => {
  it("returns logo when media is null", () => {
    expect(bestPortrait(null)).toMatch(/\.svg/);
  });
  it("prefers 320w → 640w → 160w", () => {
    expect(
      bestPortrait({
        id: 1,
        mimeType: "image/webp",
        variants: { "320w": "/p-320.webp", "640w": "/p-640.webp" },
      }),
    ).toBe("/p-320.webp");
    expect(
      bestPortrait({
        id: 1,
        mimeType: "image/webp",
        variants: { "640w": "/p-640.webp", "160w": "/p-160.webp" },
      }),
    ).toBe("/p-640.webp");
    expect(
      bestPortrait({
        id: 1,
        mimeType: "image/webp",
        variants: { "160w": "/p-160.webp" },
      }),
    ).toBe("/p-160.webp");
  });
});

describe("toPublicNews", () => {
  it("maps the server payload, prefers publishAt over createdAt for date", () => {
    const out = toPublicNews({
      id: 1,
      slug: "spieltag-1",
      title: "S",
      tag: "T",
      short: "kurz",
      longHtml: "<p>hi</p>",
      publishAt: "2026-04-01T10:00:00Z",
      createdAt: "2026-03-30T10:00:00Z",
      hero: null,
    });
    expect(out.id).toBe(1);
    expect(out.path).toBe("spieltag-1");
    expect(out.title).toBe("S");
    expect(out.tag).toBe("T");
    expect(out.short).toBe("kurz");
    expect(out.date).toBe("2026-04-01T10:00:00Z");
    expect(out.imageurl).toMatch(/\.svg/);
    expect(out.longHtml).toBe("<p>hi</p>");
  });

  it("falls back to createdAt when publishAt is null", () => {
    const out = toPublicNews({
      id: 1,
      slug: "x",
      title: "x",
      tag: "x",
      short: "",
      longHtml: "",
      publishAt: null,
      createdAt: "2026-03-30T10:00:00Z",
      hero: null,
    });
    expect(out.date).toBe("2026-03-30T10:00:00Z");
  });

  it("strips block-level tags into newlines and decodes entities for the legacy plain `long` field", () => {
    const out = toPublicNews({
      id: 1,
      slug: "x",
      title: "x",
      tag: "x",
      short: "",
      longHtml:
        "<h2>Headline</h2><p>Hello &amp; <em>world</em></p><blockquote>Cite</blockquote><ul><li>One</li></ul>",
      publishAt: null,
      createdAt: "2026-03-30T10:00:00Z",
      hero: null,
    });
    expect(out.long).toContain("Headline");
    expect(out.long).toContain("Hello & world");
    expect(out.long).toContain("Cite");
    expect(out.long).toContain("One");
    expect(out.long).not.toContain("<");
    expect(out.long).not.toContain("&amp;");
  });

  it("decodes &lt; &gt; and &nbsp; in the plain long fallback", () => {
    const out = toPublicNews({
      id: 1,
      slug: "x",
      title: "x",
      tag: "x",
      short: "",
      longHtml: "<p>1 &lt; 2 &gt; 0 &nbsp;ok</p>",
      publishAt: null,
      createdAt: "2026-03-30T10:00:00Z",
      hero: null,
    });
    expect(out.long).toContain("1 < 2 > 0  ok");
  });
});

describe("toPublicSponsor", () => {
  it("maps null tagline to empty string and weight to money", () => {
    const out = toPublicSponsor({
      id: 1,
      name: "Foo",
      tagline: null,
      linkUrl: "https://x",
      cardPalette: "purple",
      logoHasOwnBackground: true,
      weight: 5,
      logo: { id: 1, mimeType: "image/webp", variants: { "400w": "/l.webp" } },
    });
    expect(out).toEqual({
      Name: "Foo",
      Title: "",
      Link: "https://x",
      ImageUrl: "/l.webp",
      Color: "bg-primary/70",
      hasBackground: true,
      money: 5,
    });
  });

  it("preserves the tagline when present", () => {
    const out = toPublicSponsor({
      id: 1,
      name: "Foo",
      tagline: "official partner",
      linkUrl: "https://x",
      cardPalette: "transparent",
      logoHasOwnBackground: false,
      weight: 1,
      logo: null,
    });
    expect(out.Title).toBe("official partner");
    expect(out.Color).toBeUndefined();
    expect(out.hasBackground).toBe(false);
    expect(out.ImageUrl).toMatch(/\.svg/);
  });
});

describe("toPublicVorstand", () => {
  it("maps null email/phone to empty strings", () => {
    const out = toPublicVorstand({
      id: 1,
      name: "Anna",
      role: "1. Vorsitzende",
      email: null,
      phone: null,
      portrait: null,
    });
    expect(out).toEqual({
      name: "Anna",
      title: "1. Vorsitzende",
      mail: "",
      phone: "",
      imageSrc: expect.stringMatching(/\.svg/),
    });
  });

  it("preserves email and phone when present", () => {
    const out = toPublicVorstand({
      id: 2,
      name: "Ben",
      role: "Kassier",
      email: "b@x",
      phone: "01234",
      portrait: { id: 1, mimeType: "image/webp", variants: { "320w": "/p.webp" } },
    });
    expect(out.mail).toBe("b@x");
    expect(out.phone).toBe("01234");
    expect(out.imageSrc).toBe("/p.webp");
  });
});
