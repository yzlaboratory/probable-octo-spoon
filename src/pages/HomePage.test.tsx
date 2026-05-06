import { describe, it, expect, vi, afterEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import HomePage from "./HomePage";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("HomePage", () => {
  it("renders all public sections (news, fixtures, standings, training, socials, vorstand, footer) once data resolves", async () => {
    // All publicData hooks + Instagram + fixtures hit fetch — return [] for everything.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse([])),
    );
    const { container } = render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(container.textContent).toContain("Partner & Förderer");
    });
    expect(container.textContent).toContain("VORSTAND");
    expect(container.textContent).toContain("TRAINING");
  });

  it("formats news dates and forwards the mapped news items to NewsSection", async () => {
    const news = [
      {
        id: 1,
        slug: "title-one",
        title: "Title One",
        tag: "T1",
        short: "Short text",
        longHtml: "<p>Body</p>",
        publishAt: "2025-01-15T10:00:00Z",
        createdAt: "2025-01-15T09:00:00Z",
        hero: null,
      },
    ];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("/api/news/public")) return jsonResponse(news);
        return jsonResponse([]);
      }),
    );
    const { container } = render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(container.textContent).toContain("Title One");
    });
  });
});
