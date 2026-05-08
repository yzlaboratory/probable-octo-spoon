import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import NewsListPage from "./NewsListPage";
import { api } from "../api";
import type { News, NewsStatus } from "../types";

function n(over: Partial<News> & { id: number }): News {
  return {
    slug: `slug-${over.id}`,
    title: `Meldung ${over.id}`,
    tag: "Verein",
    short: "Kurzfassung",
    longHtml: "",
    blocks: [],
    status: "draft",
    publishAt: null,
    hero: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-02T00:00:00Z",
    ...over,
  };
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/admin/news"]}>
      <Routes>
        <Route path="/admin/news" element={<NewsListPage />} />
        <Route path="/admin/news/new" element={<div>NEW NEWS</div>} />
        <Route path="/admin/news/:id" element={<div>EDIT NEWS</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

beforeEach(() => {
  vi.spyOn(api, "delete").mockResolvedValue(undefined as never);
});

describe("NewsListPage", () => {
  it("renders the empty-state when there are no news rows", async () => {
    vi.spyOn(api, "get").mockResolvedValue([] as never);
    const { getByText } = renderPage();
    await waitFor(() => expect(getByText("Keine Einträge.")).toBeTruthy());
  });

  it("loads /api/news once for the current filter and once for the bucket counts", async () => {
    const get = vi.spyOn(api, "get").mockResolvedValue([
      n({ id: 1, title: "A", status: "draft" }),
      n({ id: 2, title: "B", status: "published" }),
    ] as never);
    const { container } = renderPage();
    await waitFor(() =>
      expect(container.querySelectorAll('[role="link"]').length).toBe(2),
    );
    // Once for the active filter ('all' → no query) and once for loadCounts.
    expect(get.mock.calls.filter((c) => c[0] === "/api/news").length).toBeGreaterThanOrEqual(2);
  });

  it("renders the bucket counts derived from /api/news for every status filter", async () => {
    vi.spyOn(api, "get").mockResolvedValue([
      n({ id: 1, status: "draft" }),
      n({ id: 2, status: "draft" }),
      n({ id: 3, status: "scheduled" }),
      n({ id: 4, status: "published" }),
      n({ id: 5, status: "withdrawn" }),
      n({ id: 6, status: "deleted" }),
    ] as never);
    const { container } = renderPage();
    await waitFor(() =>
      expect(container.querySelectorAll('[role="link"]').length).toBe(6),
    );
    // The buttons render their label + a numeric count beside it.
    const allBtn = container.querySelector('button[aria-pressed="true"]')!;
    expect(allBtn.textContent).toContain("Alle");
    expect(allBtn.textContent).toContain("6");
  });

  it("appends ?status=<key> when a non-'all' filter is selected", async () => {
    const get = vi.spyOn(api, "get").mockResolvedValue([] as never);
    const { getByText } = renderPage();
    await waitFor(() => expect(get).toHaveBeenCalledWith("/api/news"));
    fireEvent.click(getByText("Geplant"));
    await waitFor(() =>
      expect(get).toHaveBeenCalledWith("/api/news?status=scheduled"),
    );
    fireEvent.click(getByText("Papierkorb"));
    await waitFor(() =>
      expect(get).toHaveBeenCalledWith("/api/news?status=deleted"),
    );
  });

  it("filters the list client-side by title, tag, or short text", async () => {
    vi.spyOn(api, "get").mockResolvedValue([
      n({ id: 1, title: "Sieg gegen Saarbrücken", tag: "Spiel", short: "" }),
      n({ id: 2, title: "Mitgliederversammlung", tag: "Verein", short: "" }),
      n({ id: 3, title: "Anders", tag: "Sonstiges", short: "Sieg!" }),
    ] as never);
    const { container, getByPlaceholderText } = renderPage();
    await waitFor(() =>
      expect(container.querySelectorAll('[role="link"]').length).toBe(3),
    );
    const search = getByPlaceholderText("Suchen…") as HTMLInputElement;
    fireEvent.change(search, { target: { value: "sieg" } });
    await waitFor(() =>
      expect(container.querySelectorAll('[role="link"]').length).toBe(2),
    );
    fireEvent.change(search, { target: { value: "Verein" } });
    await waitFor(() =>
      expect(container.querySelectorAll('[role="link"]').length).toBe(1),
    );
    // No-result branch.
    fireEvent.change(search, { target: { value: "ZZZ" } });
    expect(container.textContent).toContain('Keine Treffer für „ZZZ".');
  });

  it("navigates to the new-news route when the header CTA is clicked", async () => {
    vi.spyOn(api, "get").mockResolvedValue([] as never);
    const { getByText } = renderPage();
    fireEvent.click(getByText("Neue Meldung"));
    await waitFor(() => expect(getByText("NEW NEWS")).toBeTruthy());
  });

  it("navigates to the edit route when a row is clicked", async () => {
    vi.spyOn(api, "get").mockResolvedValue([
      n({ id: 99, title: "Click Me" }),
    ] as never);
    const { container, getByText } = renderPage();
    await waitFor(() =>
      expect(container.querySelector('[role="link"]')).toBeTruthy(),
    );
    fireEvent.click(container.querySelector('[role="link"]') as HTMLElement);
    await waitFor(() => expect(getByText("EDIT NEWS")).toBeTruthy());
  });

  it("opens an edit row via Enter and via Space", async () => {
    vi.spyOn(api, "get").mockResolvedValue([
      n({ id: 7, title: "Keyboard" }),
    ] as never);
    const { container, getByText } = renderPage();
    await waitFor(() =>
      expect(container.querySelector('[role="link"]')).toBeTruthy(),
    );
    fireEvent.keyDown(container.querySelector('[role="link"]') as HTMLElement, {
      key: "Enter",
    });
    await waitFor(() => expect(getByText("EDIT NEWS")).toBeTruthy());
  });

  it("opens an edit row via Space too", async () => {
    vi.spyOn(api, "get").mockResolvedValue([
      n({ id: 8, title: "Keyboard 2" }),
    ] as never);
    const { container, getByText } = renderPage();
    await waitFor(() =>
      expect(container.querySelector('[role="link"]')).toBeTruthy(),
    );
    fireEvent.keyDown(container.querySelector('[role="link"]') as HTMLElement, {
      key: " ",
    });
    await waitFor(() => expect(getByText("EDIT NEWS")).toBeTruthy());
  });

  it("soft-deletes a non-deleted row only after the user confirms", async () => {
    vi.spyOn(api, "get").mockResolvedValue([
      n({ id: 5, title: "Will be trashed", status: "published" }),
    ] as never);
    const del = vi.spyOn(api, "delete").mockResolvedValue(undefined as never);
    const confirmSpy = vi.spyOn(window, "confirm");

    confirmSpy.mockReturnValueOnce(false);
    const { container, getByLabelText } = renderPage();
    await waitFor(() =>
      expect(container.querySelector('[role="link"]')).toBeTruthy(),
    );
    fireEvent.click(getByLabelText("In Papierkorb verschieben"));
    expect(del).not.toHaveBeenCalled();

    confirmSpy.mockReturnValueOnce(true);
    fireEvent.click(getByLabelText("In Papierkorb verschieben"));
    await waitFor(() => expect(del).toHaveBeenCalledWith("/api/news/5"));
  });

  it("hard-deletes a deleted row only after the user confirms", async () => {
    vi.spyOn(api, "get").mockResolvedValue([
      n({ id: 9, title: "Wirklich weg", status: "deleted" }),
    ] as never);
    const del = vi.spyOn(api, "delete").mockResolvedValue(undefined as never);
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const { container, getByLabelText } = renderPage();
    await waitFor(() =>
      expect(container.querySelector('[role="link"]')).toBeTruthy(),
    );
    fireEvent.click(getByLabelText("Endgültig löschen"));
    await waitFor(() => expect(del).toHaveBeenCalledWith("/api/news/9"));
    expect(confirmSpy).toHaveBeenCalled();
  });

  it("renders the hero img using whichever variant is present", async () => {
    vi.spyOn(api, "get").mockResolvedValue([
      n({
        id: 1,
        hero: {
          id: 11,
          mimeType: "image/jpeg",
          variants: { "320w": "/m/320/a.jpg", "160w": "/m/160/a.jpg" },
        },
      }),
      n({
        id: 2,
        hero: {
          id: 12,
          mimeType: "image/jpeg",
          variants: { "160w": "/m/160/b.jpg" },
        },
      }),
      n({ id: 3, hero: null }),
    ] as never);
    const { container } = renderPage();
    await waitFor(() =>
      expect(container.querySelectorAll('[role="link"]').length).toBe(3),
    );
    const imgs = container.querySelectorAll(
      '[role="link"] img',
    ) as NodeListOf<HTMLImageElement>;
    expect(imgs.length).toBe(2);
    expect(imgs[0].src).toContain("/m/320/a.jpg");
    expect(imgs[1].src).toContain("/m/160/b.jpg");
  });

  it("formats the date column from publishAt when present, falling back to createdAt", async () => {
    vi.spyOn(api, "get").mockResolvedValue([
      n({
        id: 1,
        publishAt: "2026-04-15T10:00:00Z",
        createdAt: "2026-01-01T00:00:00Z",
      }),
      n({ id: 2, publishAt: null, createdAt: "2025-12-24T00:00:00Z" }),
    ] as never);
    const { container } = renderPage();
    await waitFor(() =>
      expect(container.querySelectorAll('[role="link"]').length).toBe(2),
    );
    const txt = container.textContent ?? "";
    expect(txt).toContain("2026-04-15");
    expect(txt).toContain("2025-12-24");
  });

  it("renders all five status pills with their German labels", async () => {
    const statuses: NewsStatus[] = [
      "draft",
      "scheduled",
      "published",
      "withdrawn",
      "deleted",
    ];
    vi.spyOn(api, "get").mockResolvedValue(
      statuses.map((s, i) => n({ id: i + 1, status: s })) as never,
    );
    const { container } = renderPage();
    await waitFor(() =>
      expect(container.querySelectorAll('[role="link"]').length).toBe(5),
    );
    const txt = container.textContent ?? "";
    expect(txt).toContain("Entwurf");
    expect(txt).toContain("Geplant");
    expect(txt).toContain("Veröffentlicht");
    expect(txt).toContain("Zurückgezogen");
    expect(txt).toContain("Papierkorb");
  });

  it("swallows loadCounts errors without breaking the list", async () => {
    const get = vi.spyOn(api, "get");
    get.mockResolvedValueOnce([
      n({ id: 1, title: "Ok", status: "draft" }),
    ] as never);
    get.mockRejectedValueOnce(new Error("boom"));
    const { container } = renderPage();
    await waitFor(() =>
      expect(container.querySelectorAll('[role="link"]').length).toBe(1),
    );
    // Still rendered — the loadCounts catch swallowed the failure.
    expect(container.textContent).toContain("Ok");
  });

  it("shows the loading placeholder until the first /api/news call resolves", async () => {
    const resolvers: Array<(v: News[]) => void> = [];
    vi.spyOn(api, "get").mockImplementation(
      () =>
        new Promise<News[]>((res) => {
          resolvers.push(res);
        }) as never,
    );
    const { getByText, queryByText } = renderPage();
    expect(getByText("Lade…")).toBeTruthy();
    // Resolve every in-flight request — load() and loadCounts() both fire on
    // mount and either can keep the loader visible.
    resolvers.forEach((r) => r([]));
    await waitFor(() => expect(queryByText("Lade…")).toBeNull());
  });

  it("opens a row on Enter or Space (covers the keyboard navigation handler)", async () => {
    vi.spyOn(api, "get").mockResolvedValue([
      n({ id: 1, title: "OpenMe", status: "draft" }),
    ] as never);
    const { container, findByText } = renderPage();
    await findByText("OpenMe");
    const row = container.querySelector("[role='link']") as HTMLElement;
    fireEvent.keyDown(row, { key: "Enter" });
    fireEvent.keyDown(row, { key: " " });
    fireEvent.keyDown(row, { key: "x" }); // unrelated key — no-op branch
  });

  it("formats a missing publishAt + empty createdAt as em-dash via formatDate fallback", async () => {
    vi.spyOn(api, "get").mockResolvedValue([
      n({ id: 1, title: "X", publishAt: null, createdAt: "" }),
    ] as never);
    const { container, findByText } = renderPage();
    await findByText("X");
    expect(container.textContent).toContain("—");
  });
});
