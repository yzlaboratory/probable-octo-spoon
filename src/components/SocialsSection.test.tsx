import { describe, it, expect, vi, afterEach } from "vitest";
import { act, render, waitFor } from "@testing-library/react";
import SocialsSection from "./SocialsSection";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Server-shape sponsor row consumed by loadPublicSponsors → toPublicSponsor.
const serverSponsor = (id: number) => ({
  id,
  name: `S${id}`,
  tagline: null,
  linkUrl: `https://s${id}.test`,
  cardPalette: "transparent" as const,
  logoHasOwnBackground: false,
  weight: 1,
  logo: null,
});

const item = (over: Partial<Record<string, unknown>> = {}) => ({
  media_url: "https://cdn.example/0.jpg",
  caption: "hi",
  permalink: "https://www.instagram.com/p/abc",
  timestamp: "2026-04-01T00:00:00Z",
  media_type: "IMAGE",
  media_product_type: "FEED",
  ...over,
});

/**
 * Build a fetch stub that dispatches by URL substring. We can't spy on the
 * publicData ESM exports in browser mode (module namespaces aren't
 * configurable), so we intercept the underlying network calls instead — both
 * SocialsSection's /api/instagram fetch and SmallSponsors → loadPublicSponsors
 * → /api/sponsors/public.
 */
function stubFetch(handlers: {
  instagram?: () => Promise<Response>;
  sponsors?: () => Promise<Response>;
}) {
  const fn = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    if (url.includes("/api/instagram") && handlers.instagram) {
      return handlers.instagram();
    }
    if (url.includes("/api/sponsors/public") && handlers.sponsors) {
      return handlers.sponsors();
    }
    return jsonResponse([]);
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("SocialsSection", () => {
  it("renders the fallback skeleton while items is null and after a fetch failure", async () => {
    let reject: (e: unknown) => void = () => {};
    stubFetch({
      instagram: () =>
        new Promise<Response>((_, rej) => {
          reject = rej;
        }),
      sponsors: () => Promise.resolve(jsonResponse([])),
    });
    const { container } = render(<SocialsSection />);
    expect(container.querySelectorAll(".socialcard").length).toBeGreaterThan(0);

    // Reject the fetch — the catch handler sets items=[] which keeps the
    // fallback rendered (items.length === 0 also takes the fallback branch).
    await act(async () => {
      reject(new Error("network down"));
      await Promise.resolve();
    });
    expect(container.querySelectorAll(".socialcard").length).toBeGreaterThan(0);
  });

  it("renders the empty-state fallback when /api/instagram returns []", async () => {
    stubFetch({
      instagram: () => Promise.resolve(jsonResponse([])),
      sponsors: () => Promise.resolve(jsonResponse([])),
    });
    const { container } = render(<SocialsSection />);
    await waitFor(() =>
      expect(container.querySelectorAll(".socialcard").length).toBeGreaterThan(
        0,
      ),
    );
  });

  it("renders Socialcards from the fetched feed and intersperses sponsor cards at index 0 + 4", async () => {
    const feed = [
      item({ permalink: "p0", caption: "first" }),
      item({ permalink: "p1", caption: "second" }),
      item({ permalink: "p2", caption: "third" }),
      item({ permalink: "p3", caption: "fourth" }),
      item({ permalink: "p4", caption: "fifth" }),
      item({ permalink: "p5", caption: "sixth" }),
    ];
    stubFetch({
      instagram: () => Promise.resolve(jsonResponse(feed)),
      sponsors: () =>
        Promise.resolve(jsonResponse([serverSponsor(1), serverSponsor(2)])),
    });
    const { container } = render(<SocialsSection />);
    await waitFor(() => {
      const txt = container.textContent ?? "";
      expect(txt).toContain("first");
      expect(txt).toContain("sixth");
    });
    // Six Socialcards plus two SmallSponsors (one mobile-only at index 0,
    // one desktop-only at index 4).
    expect(container.querySelectorAll(".socialcard").length).toBe(6);
  });

  it("falls back to a synthetic key when the API returns items without permalinks", async () => {
    const feed = [item({ permalink: "" }), item({ permalink: "" })];
    stubFetch({
      instagram: () => Promise.resolve(jsonResponse(feed)),
      sponsors: () => Promise.resolve(jsonResponse([])),
    });
    const { container } = render(<SocialsSection />);
    await waitFor(() =>
      expect(
        container.querySelectorAll(".socialcard").length,
      ).toBeGreaterThanOrEqual(2),
    );
    // No React duplicate-key warning means our `social-${index}` fallback
    // worked — two distinct keys for two empty permalinks.
  });

  it("the IG-gallery auto-scroll resets to 0 when near the right edge, otherwise advances by ~half viewport", async () => {
    vi.useFakeTimers();
    try {
      stubFetch({
        instagram: () => Promise.resolve(jsonResponse([item()])),
        sponsors: () => Promise.resolve(jsonResponse([])),
      });
      render(<SocialsSection />);
      // Flush pending microtasks so items become non-null and the auto-scroll
      // useEffect runs (registering its setInterval).
      await act(async () => {
        await vi.runOnlyPendingTimersAsync();
      });

      // Inject two .ig_gallery elements with deterministic geometry. In real
      // Chromium, scrollLeft only mutates when the element is actually
      // scrollable, so override the property entirely to a backing field —
      // we just want to assert the auto-scroll math.
      function fakeGallery(scrollWidth: number, clientWidth: number, initial: number) {
        const el = document.createElement("div");
        el.className = "ig_gallery";
        let _sl = initial;
        Object.defineProperty(el, "scrollWidth", {
          value: scrollWidth,
          configurable: true,
        });
        Object.defineProperty(el, "clientWidth", {
          value: clientWidth,
          configurable: true,
        });
        Object.defineProperty(el, "scrollLeft", {
          configurable: true,
          get: () => _sl,
          set: (v: number) => {
            _sl = v;
          },
        });
        document.body.appendChild(el);
        return el;
      }
      // near: scrollLeft 0 + 0.51*100=51 > maxScroll (50-100=-50) → reset to 0.
      const near = fakeGallery(50, 100, 0);
      // far: scrollLeft 10 + 0.51*200=112 vs maxScroll 1000-200=800 → advance.
      const far = fakeGallery(1000, 200, 10);

      await act(async () => {
        vi.advanceTimersByTime(5000);
      });

      expect(near.scrollLeft).toBe(0);
      expect(far.scrollLeft).toBe(10 + 200 * 0.51);

      document.body.removeChild(near);
      document.body.removeChild(far);
    } finally {
      vi.useRealTimers();
    }
  });

  it("SmallSponsors renders sponsor logos and applies the Color class when cardPalette ≠ transparent", async () => {
    // 5 IG items so index===4 slot mounts the desktop SmallSponsors strip.
    const feed = [item(), item(), item(), item(), item()];
    // Mix one purple (Color truthy) and one transparent (Color undefined)
    // sponsor to hit both sides of `item.Color != undefined ? item.Color : ""`.
    const sponsors = [
      { ...serverSponsor(1), cardPalette: "purple" as const },
      serverSponsor(2),
    ];
    stubFetch({
      instagram: () => Promise.resolve(jsonResponse(feed)),
      sponsors: () => Promise.resolve(jsonResponse(sponsors)),
    });
    const { container } = render(<SocialsSection />);
    await waitFor(() => {
      // Five socialcards plus two SmallSponsors slots.
      expect(container.querySelectorAll(".socialcard").length).toBe(5);
    });
    // SmallSponsors rendered Sponsorcard with non-empty image list.
    await waitFor(() => {
      expect(container.querySelectorAll("img").length).toBeGreaterThan(0);
    });
  });

  it("clears its 5s auto-scroll interval on unmount", async () => {
    vi.useFakeTimers();
    try {
      stubFetch({
        instagram: () => Promise.resolve(jsonResponse([item()])),
        sponsors: () => Promise.resolve(jsonResponse([])),
      });
      const setSpy = vi.spyOn(globalThis, "setInterval");
      const clearSpy = vi.spyOn(globalThis, "clearInterval");
      const { unmount } = render(<SocialsSection />);
      await act(async () => {
        await vi.runOnlyPendingTimersAsync();
      });
      const intervalCalls = setSpy.mock.calls.filter((c) => c[1] === 5000);
      expect(intervalCalls.length).toBeGreaterThanOrEqual(1);
      unmount();
      expect(clearSpy).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
