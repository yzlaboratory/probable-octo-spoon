import { describe, it, expect } from "vitest";
import type { Media } from "../../types";
import {
  bestUrl,
  displayName,
  filterMedia,
  kpis,
  mimeLabel,
  previewUrl,
  thumbUrl,
} from "./helpers";

function media(id: number, overrides: Partial<Media> = {}): Media {
  return {
    id,
    variants: { "400w": `/media/x/${id}/400w.webp` },
    mimeType: "image/webp",
    kind: "news",
    filename: `photo-${id}.webp`,
    uploadedAt: "2025-01-01T00:00:00.000Z",
    uploadedBy: "admin@example.org",
    ...overrides,
  };
}

describe("thumbUrl", () => {
  it("picks the smallest vorstand variant for a thumbnail", () => {
    const m = media(1, {
      kind: "vorstand",
      variants: {
        "160w": "/a/160.webp",
        "320w": "/a/320.webp",
        "640w": "/a/640.webp",
      },
    });
    expect(thumbUrl(m)).toBe("/a/160.webp");
  });

  it("falls back to svg when no raster variants exist", () => {
    const m = media(2, {
      kind: "sponsor",
      variants: { svg: "/a/logo.svg" },
      mimeType: "image/svg+xml",
    });
    expect(thumbUrl(m)).toBe("/a/logo.svg");
  });

  it("returns null when variants is empty", () => {
    expect(thumbUrl(media(3, { variants: {} }))).toBeNull();
  });

  it("falls back to any variant when none of the priority keys match", () => {
    const m = media(4, { variants: { weird: "/a/weird.webp" } });
    expect(thumbUrl(m)).toBe("/a/weird.webp");
  });
});

describe("previewUrl vs bestUrl", () => {
  it("preview prefers ~800w", () => {
    const m = media(1, {
      variants: {
        "400w": "/a/400.webp",
        "800w": "/a/800.webp",
        "1600w": "/a/1600.webp",
      },
    });
    expect(previewUrl(m)).toBe("/a/800.webp");
  });

  it("best copies the largest variant (for Link kopieren)", () => {
    const m = media(2, {
      variants: {
        "400w": "/a/400.webp",
        "800w": "/a/800.webp",
        "1600w": "/a/1600.webp",
      },
    });
    expect(bestUrl(m)).toBe("/a/1600.webp");
  });
});

describe("mimeLabel", () => {
  it("normalises the common image types", () => {
    expect(mimeLabel("image/webp")).toBe("WebP");
    expect(mimeLabel("image/jpeg")).toBe("JPEG");
    expect(mimeLabel("image/png")).toBe("PNG");
    expect(mimeLabel("image/svg+xml")).toBe("SVG");
  });

  it("strips image/ prefix and upper-cases unknown types", () => {
    expect(mimeLabel("image/gif")).toBe("GIF");
  });
});

describe("displayName", () => {
  it("returns the filename", () => {
    expect(displayName(media(1, { filename: "photo.webp" }))).toBe(
      "photo.webp",
    );
  });

  it("falls back to Medium #<id> when filename is null", () => {
    expect(displayName(media(7, { filename: null }))).toBe("Medium #7");
  });

  it("treats whitespace-only filenames as missing", () => {
    expect(displayName(media(9, { filename: "  " }))).toBe("Medium #9");
  });
});

describe("kpis", () => {
  it("counts per kind and total", () => {
    const list = [
      media(1, { kind: "news" }),
      media(2, { kind: "news" }),
      media(3, { kind: "sponsor" }),
      media(4, { kind: "vorstand" }),
    ];
    expect(kpis(list)).toEqual({ total: 4, news: 2, sponsor: 1, vorstand: 1 });
  });

  it("handles an empty list", () => {
    expect(kpis([])).toEqual({ total: 0, news: 0, sponsor: 0, vorstand: 0 });
  });

  it("ignores media with an unknown kind (e.g. legacy row)", () => {
    const list = [
      media(1, { kind: "news" }),
      { ...media(2), kind: undefined } as Media,
    ];
    expect(kpis(list).total).toBe(2);
    expect(kpis(list).news).toBe(1);
  });
});

describe("filterMedia", () => {
  const all: Media[] = [
    media(1, { kind: "news", filename: "training.webp" }),
    media(2, {
      kind: "sponsor",
      filename: "acme-logo.svg",
      mimeType: "image/svg+xml",
    }),
    media(3, { kind: "vorstand", filename: "marta.webp" }),
    media(4, { kind: "news", filename: null }),
  ];

  it("returns everything when kind=all and query is empty", () => {
    expect(filterMedia(all, "all", "")).toEqual(all);
  });

  it("filters by kind", () => {
    const only = filterMedia(all, "sponsor", "");
    expect(only).toHaveLength(1);
    expect(only[0].id).toBe(2);
  });

  it("searches by filename, case-insensitive", () => {
    expect(filterMedia(all, "all", "MARTA")).toHaveLength(1);
    expect(filterMedia(all, "all", "marta")).toHaveLength(1);
  });

  it("searches by mime label so users can type 'svg'", () => {
    expect(filterMedia(all, "all", "svg")).toHaveLength(1);
  });

  it("ignores leading/trailing whitespace in the query", () => {
    expect(filterMedia(all, "all", "  training  ")).toHaveLength(1);
  });

  it("skips rows whose filename is null when a search term is set", () => {
    expect(filterMedia(all, "all", "training")).toHaveLength(1);
    expect(filterMedia(all, "all", "training")[0].id).toBe(1);
  });

  it("combines kind + query", () => {
    expect(filterMedia(all, "news", "training")).toHaveLength(1);
    expect(filterMedia(all, "news", "marta")).toHaveLength(0);
  });
});
