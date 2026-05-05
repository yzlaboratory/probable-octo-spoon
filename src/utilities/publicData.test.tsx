import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import {
  usePublicNews,
  usePublicNewsBySlug,
  usePublicSponsors,
  usePublicVorstand,
} from "./publicData";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
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
  cardPalette: "purple" as const,
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

describe("usePublicNews", () => {
  it("starts as null and resolves to mapped news items", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(jsonResponse([newsRow]))),
    );
    const { result } = renderHook(() => usePublicNews());
    expect(result.current).toBeNull();
    await waitFor(() => expect(result.current).not.toBeNull());
    expect(result.current).toHaveLength(1);
    expect(result.current?.[0].path).toBe("spieltag-1");
  });

  it("falls back to an empty array on fetch failure (HTTP non-OK)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(jsonResponse({}, 500))),
    );
    const { result } = renderHook(() => usePublicNews());
    await waitFor(() => expect(Array.isArray(result.current)).toBe(true));
    expect(result.current).toEqual([]);
  });

  it("falls back to an empty array on network error (fetch rejects)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("offline"))),
    );
    const { result } = renderHook(() => usePublicNews());
    await waitFor(() => expect(Array.isArray(result.current)).toBe(true));
    expect(result.current).toEqual([]);
  });
});

describe("usePublicNewsBySlug", () => {
  it("returns null synchronously when slug is undefined and never fetches", async () => {
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    const { result } = renderHook(() => usePublicNewsBySlug(undefined));
    await waitFor(() => expect(result.current).toBeNull());
    expect(f).not.toHaveBeenCalled();
  });

  it("fetches the matching article and maps it", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(jsonResponse(newsRow))),
    );
    const { result } = renderHook(() => usePublicNewsBySlug("spieltag-1"));
    expect(result.current).toBeUndefined();
    await waitFor(() => expect(result.current).toBeTruthy());
    expect(result.current?.path).toBe("spieltag-1");
  });

  it("settles to null when the fetch errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(jsonResponse({}, 404))),
    );
    const { result } = renderHook(() => usePublicNewsBySlug("ghost"));
    await waitFor(() => expect(result.current).toBeNull());
  });

  it("URL-encodes the slug parameter (special chars are escaped)", async () => {
    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        calls.push(url);
        return Promise.resolve(jsonResponse(newsRow));
      }),
    );
    renderHook(() => usePublicNewsBySlug("a slug/with spaces"));
    await waitFor(() => expect(calls.length).toBeGreaterThan(0));
    expect(calls[0]).toBe("/api/news/public/a%20slug%2Fwith%20spaces");
  });
});

describe("usePublicSponsors", () => {
  it("starts as null and resolves to mapped sponsor items", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(jsonResponse([sponsorRow]))),
    );
    const { result } = renderHook(() => usePublicSponsors());
    expect(result.current).toBeNull();
    await waitFor(() => expect(result.current).not.toBeNull());
    expect(result.current).toHaveLength(1);
    expect(result.current?.[0].Name).toBe("Acme");
    expect(result.current?.[0].money).toBe(50);
  });

  it("falls back to empty array on fetch error", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("offline"))));
    const { result } = renderHook(() => usePublicSponsors());
    await waitFor(() => expect(Array.isArray(result.current)).toBe(true));
    expect(result.current).toEqual([]);
  });
});

describe("usePublicVorstand", () => {
  it("resolves to mapped vorstand members", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(jsonResponse([vorstandRow]))),
    );
    const { result } = renderHook(() => usePublicVorstand());
    await waitFor(() => expect(result.current).not.toBeNull());
    expect(result.current).toHaveLength(1);
    expect(result.current?.[0].name).toBe("Anna");
  });

  it("falls back to empty array on fetch error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(jsonResponse({}, 500))),
    );
    const { result } = renderHook(() => usePublicVorstand());
    await waitFor(() => expect(Array.isArray(result.current)).toBe(true));
    expect(result.current).toEqual([]);
  });
});
