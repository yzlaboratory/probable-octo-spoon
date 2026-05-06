import { describe, it, expect, vi, afterEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SchedulePage from "./SchedulePage";
import type { Fixture } from "../components/NextFixturesSection";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const fixture = (over: Partial<Fixture> = {}): Fixture => ({
  id: 1,
  slug: "f1",
  kickoff: "2026-05-09T15:30:00.000Z",
  home: { name: "SV Alemannia", shortName: "ALE", logo: null },
  away: { name: "FC Other", shortName: "OTH", logo: null },
  ourSide: "home",
  competition: "Kreisliga A",
  competitionShort: "KLA",
  category: "Herren",
  live: false,
  ...over,
});

function renderPage() {
  return render(
    <MemoryRouter>
      <SchedulePage />
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("SchedulePage", () => {
  it("shows the loading message while the fetch is in flight", () => {
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
    const { container } = renderPage();
    expect(container.textContent).toContain("Lade Spielplan");
  });

  it("shows the empty-state message when no fixtures come back", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ fetchedAt: null, fixtures: [] })),
    );
    const { container } = renderPage();
    await waitFor(() =>
      expect(container.textContent).toContain("Derzeit keine anstehenden"),
    );
  });

  it("groups fixtures into German month sections in payload order", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          fetchedAt: null,
          fixtures: [
            fixture({ id: 1, kickoff: "2026-05-02T13:00:00Z" }),
            fixture({ id: 2, kickoff: "2026-05-16T13:00:00Z" }),
            fixture({ id: 3, kickoff: "2026-06-01T13:00:00Z" }),
          ],
        }),
      ),
    );
    const { container } = renderPage();
    await waitFor(() => {
      expect(container.querySelectorAll(".fixturecard").length).toBe(3);
    });
    const headings = Array.from(
      container.querySelectorAll<HTMLHeadingElement>("h2.caps"),
    ).map((h) => h.textContent);
    expect(headings).toContain("Mai 2026");
    expect(headings).toContain("Juni 2026");
  });

  it("buckets fixtures with unparseable kickoffs under the 'Unbekannt' month", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          fetchedAt: null,
          fixtures: [fixture({ id: 1, kickoff: "totally invalid" })],
        }),
      ),
    );
    const { container } = renderPage();
    await waitFor(() => {
      expect(container.querySelectorAll(".fixturecard").length).toBe(1);
    });
    const headings = Array.from(
      container.querySelectorAll<HTMLHeadingElement>("h2.caps"),
    ).map((h) => h.textContent);
    expect(headings).toContain("Unbekannt");
  });

  it("survives a fetch failure by showing the empty state, not crashing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("offline");
      }),
    );
    const { container } = renderPage();
    await waitFor(() =>
      expect(container.textContent).toContain("Derzeit keine"),
    );
  });
});
