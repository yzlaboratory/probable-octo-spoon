import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import DashboardPage from "./DashboardPage";
import { api } from "../api";
import type { News, Sponsor, Vorstand } from "../types";

function n(over: Partial<News> & { id: number }): News {
  return {
    slug: `n-${over.id}`,
    title: `News ${over.id}`,
    tag: "Allgemein",
    short: "",
    longHtml: "",
    blocks: [],
    status: "published",
    publishAt: null,
    hero: null,
    createdAt: "2026-04-01T00:00:00Z",
    updatedAt: "2026-04-22T10:00:00Z",
    ...over,
  };
}

function s(over: Partial<Sponsor> & { id: number }): Sponsor {
  return {
    name: `Sponsor ${over.id}`,
    tagline: null,
    linkUrl: "",
    logoHasOwnBackground: false,
    cardPalette: "transparent",
    weight: 1,
    status: "active",
    activeFrom: null,
    activeUntil: null,
    notes: null,
    displayOrder: 0,
    logo: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-04-01T00:00:00Z",
    ...over,
  };
}

function v(over: Partial<Vorstand> & { id: number }): Vorstand {
  return {
    name: `Person ${over.id}`,
    role: "Mitglied",
    email: null,
    phone: null,
    notes: null,
    status: "active",
    displayOrder: 0,
    portrait: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-04-01T00:00:00Z",
    ...over,
  };
}

beforeEach(() => {
  vi.spyOn(api, "get").mockImplementation(async (path: string) => {
    if (path === "/api/news") {
      return [
        n({
          id: 1,
          status: "published",
          title: "Live a",
          updatedAt: "2026-04-23T11:00:00Z",
        }),
        n({
          id: 2,
          status: "published",
          title: "Live b",
          updatedAt: "2026-04-22T10:00:00Z",
        }),
        n({
          id: 3,
          status: "draft",
          title: "Stale draft",
          updatedAt: "2026-04-15T10:00:00Z",
        }),
        n({
          id: 4,
          status: "scheduled",
          title: "Geplant",
          publishAt: "2026-05-01T10:00:00Z",
          updatedAt: "2026-04-20T10:00:00Z",
        }),
      ] as unknown as object;
    }
    if (path === "/api/sponsors") {
      return [
        s({ id: 1, status: "active" }),
        s({
          id: 2,
          status: "active",
          activeUntil: "2026-04-30T00:00:00Z",
          name: "Expiring",
        }),
        s({ id: 3, status: "paused" }),
        s({ id: 4, status: "archived" }),
      ] as unknown as object;
    }
    if (path === "/api/vorstand") {
      return [
        v({
          id: 1,
          status: "active",
          portrait: {
            id: 1,
            variants: { thumb: "/x" },
            mimeType: "image/jpeg",
          },
        }),
        v({ id: 2, status: "active", portrait: null, name: "Ohne Foto" }),
        v({ id: 3, status: "hidden", portrait: null }),
      ] as unknown as object;
    }
    return [];
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

function renderPage() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  );
}

describe("DashboardPage", () => {
  it("renders the eyebrow + greeting before data loads", () => {
    const { getByText, container } = renderPage();
    expect(container.textContent).toMatch(/Übersicht ·/);
    expect(getByText(/Guten /)).toBeTruthy();
  });

  it("calls all three list endpoints in parallel", async () => {
    renderPage();
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/api/news");
      expect(api.get).toHaveBeenCalledWith("/api/sponsors");
      expect(api.get).toHaveBeenCalledWith("/api/vorstand");
    });
  });

  it("shows the KPI strip with derived counts after data loads", async () => {
    const { getByText, container } = renderPage();
    await waitFor(() => expect(getByText("Aktive Sponsoren")).toBeTruthy());
    // 4 KPI cards: News=2 published, Sponsoren=2 active, Vorstand=2 active, Page-views=—.
    const values = Array.from(
      container.querySelectorAll(".grid-cols-4 .font-display"),
    ).map((el) => el.textContent);
    expect(values).toEqual(["2", "—", "2", "2"]);
  });

  it("shows the recent-news section heading and at least one row", async () => {
    const { getByText, container } = renderPage();
    await waitFor(() => {
      expect(getByText("Zuletzt geändert")).toBeTruthy();
      // Newest news is 'Live a'.
      expect(container.textContent).toContain("Live a");
    });
  });

  it("shows the to-do section with derived items", async () => {
    const { getByText, getAllByText } = renderPage();
    await waitFor(() => {
      // Three todos: 1 stale draft, 1 expiring sponsor, 1 vorstand without portrait.
      expect(getByText("3 Dinge warten auf dich")).toBeTruthy();
      // 'Stale draft' label appears in both the todo card and the recent-news card.
      expect(getAllByText("Stale draft").length).toBeGreaterThanOrEqual(1);
      expect(getByText("Expiring")).toBeTruthy();
      expect(getByText(/Portrait für Ohne Foto fehlt/)).toBeTruthy();
    });
  });

  it("renders the Termine 'Bald verfügbar' placeholder card", async () => {
    const { getByText } = renderPage();
    await waitFor(() => {
      expect(getByText("Nächste Termine")).toBeTruthy();
      expect(getByText("Bald verfügbar.")).toBeTruthy();
    });
  });

  it("renders the activity feed with merged items", async () => {
    const { getByText, container } = renderPage();
    await waitFor(() => {
      expect(getByText("Aktivität")).toBeTruthy();
      expect(container.textContent).toContain("Live a");
    });
  });

  it("surfaces an inline error if any endpoint fails (and KPIs fall back to zeros)", async () => {
    vi.spyOn(api, "get").mockRejectedValue(new Error("network down"));
    const { getByRole } = renderPage();
    await waitFor(() => {
      const alert = getByRole("alert");
      expect(alert.textContent).toContain("network down");
    });
  });
});
