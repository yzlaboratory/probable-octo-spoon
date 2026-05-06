import { describe, it, expect, vi, afterEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import NewsDetailPage from "./NewsDetailPage";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const serverNews = {
  id: 1,
  slug: "first",
  title: "Erster Artikel",
  tag: "VEREIN",
  short: "kurzer text",
  longHtml: "<p>Hallo <strong>Welt</strong></p>",
  publishAt: "2026-04-01T12:00:00Z",
  createdAt: "2026-03-30T12:00:00Z",
  hero: null,
};

function renderAt(slug: string) {
  return render(
    <MemoryRouter initialEntries={[`/news/${slug}`]}>
      <Routes>
        <Route path="/news/:path" element={<NewsDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("NewsDetailPage", () => {
  it("shows 'Lade…' while the article fetch is in flight", () => {
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
    const { container } = renderAt("first");
    expect(container.textContent).toContain("Lade");
  });

  it("renders the article when the slug resolves", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: RequestInfo | URL) => {
        const u = typeof url === "string" ? url : url.toString();
        if (u.includes("/api/news/public/first")) return jsonResponse(serverNews);
        if (u.includes("/api/sponsors/public")) return jsonResponse([]);
        return jsonResponse({});
      }),
    );
    const { container } = renderAt("first");
    await waitFor(() =>
      expect(container.textContent).toContain("Erster Artikel"),
    );
    // longHtml is rendered via dangerouslySetInnerHTML — the <strong> survives.
    expect(container.querySelector("strong")?.textContent).toBe("Welt");
    expect(container.textContent).toContain("VEREIN");
  });

  it("renders the 'Artikel nicht gefunden' fallback when the slug 404s", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: RequestInfo | URL) => {
        const u = typeof url === "string" ? url : url.toString();
        if (u.includes("/api/news/public/")) return jsonResponse({}, 404);
        if (u.includes("/api/sponsors/public")) return jsonResponse([]);
        return jsonResponse({});
      }),
    );
    const { container } = renderAt("missing");
    await waitFor(() =>
      expect(container.textContent).toContain("Artikel nicht gefunden"),
    );
  });
});
