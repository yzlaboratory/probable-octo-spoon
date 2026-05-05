import { describe, it, expect, afterEach, vi } from "vitest";
import {
  fetchJson,
  loadPublicNews,
  loadPublicNewsBySlug,
  loadPublicSponsors,
  loadPublicVorstand,
} from "../../src/utilities/publicData";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const newsRow = {
  id: 1,
  slug: "spieltag-1",
  title: "S",
  tag: "T",
  short: "kurz",
  longHtml: "<p>Hi</p>",
  publishAt: "2026-04-01T10:00:00Z",
  createdAt: "2026-03-30T10:00:00Z",
  hero: null,
};

const sponsorRow = {
  id: 1,
  name: "Acme",
  tagline: null,
  linkUrl: "https://acme.test",
  cardPalette: "purple",
  logoHasOwnBackground: false,
  weight: 50,
  logo: null,
};

const vorstandRow = {
  id: 1,
  name: "Anna",
  role: "Vorsitz",
  email: null,
  phone: null,
  portrait: null,
};

describe("fetchJson", () => {
  it("resolves to the JSON body on 2xx", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(jsonResponse({ ok: true }))),
    );
    expect(await fetchJson("/api/x")).toEqual({ ok: true });
  });

  it("throws on non-OK responses with the URL and status in the message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(jsonResponse({}, 503))),
    );
    await expect(fetchJson("/api/x")).rejects.toThrow(/\/api\/x.*503/);
  });

  it("passes credentials: same-origin in the request init", async () => {
    let observed: RequestInit | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init?: RequestInit) => {
        observed = init;
        return Promise.resolve(jsonResponse([]));
      }),
    );
    await fetchJson("/api/x");
    expect(observed?.credentials).toBe("same-origin");
  });
});

describe("loadPublicNews", () => {
  it("returns mapped rows on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(jsonResponse([newsRow]))),
    );
    const out = await loadPublicNews();
    expect(out).toHaveLength(1);
    expect(out[0].path).toBe("spieltag-1");
  });

  it("returns [] when the upstream errors with HTTP non-OK", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(jsonResponse({}, 500))),
    );
    expect(await loadPublicNews()).toEqual([]);
  });

  it("returns [] when fetch rejects", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("offline"))));
    expect(await loadPublicNews()).toEqual([]);
  });
});

describe("loadPublicNewsBySlug", () => {
  it("returns the mapped item on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(jsonResponse(newsRow))),
    );
    const out = await loadPublicNewsBySlug("spieltag-1");
    expect(out?.path).toBe("spieltag-1");
  });

  it("returns null when the upstream errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(jsonResponse({}, 404))),
    );
    expect(await loadPublicNewsBySlug("ghost")).toBeNull();
  });

  it("URL-encodes the slug", async () => {
    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        calls.push(url);
        return Promise.resolve(jsonResponse(newsRow));
      }),
    );
    await loadPublicNewsBySlug("a slug/with spaces");
    expect(calls[0]).toBe("/api/news/public/a%20slug%2Fwith%20spaces");
  });
});

describe("loadPublicSponsors", () => {
  it("returns mapped rows on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(jsonResponse([sponsorRow]))),
    );
    const out = await loadPublicSponsors();
    expect(out[0].Name).toBe("Acme");
  });

  it("returns [] on error", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("x"))));
    expect(await loadPublicSponsors()).toEqual([]);
  });
});

describe("loadPublicVorstand", () => {
  it("returns mapped rows on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(jsonResponse([vorstandRow]))),
    );
    const out = await loadPublicVorstand();
    expect(out[0].name).toBe("Anna");
  });

  it("returns [] on error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(jsonResponse({}, 500))),
    );
    expect(await loadPublicVorstand()).toEqual([]);
  });
});
