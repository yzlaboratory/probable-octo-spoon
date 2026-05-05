import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import SponsorListPage from "./SponsorListPage";
import { api } from "../api";
import type { Sponsor } from "../types";

function s(over: Partial<Sponsor> & { id: number }): Sponsor {
  return {
    name: `Sponsor ${over.id}`,
    tagline: null,
    linkUrl: "https://example.com",
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

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/admin/sponsors"]}>
      <Routes>
        <Route path="/admin/sponsors" element={<SponsorListPage />} />
        <Route path="/admin/sponsors/new" element={<div>NEW SPONSOR</div>} />
        <Route
          path="/admin/sponsors/:id"
          element={<div>EDIT SPONSOR</div>}
        />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

beforeEach(() => {
  vi.spyOn(api, "patch").mockResolvedValue(undefined as never);
  vi.spyOn(api, "delete").mockResolvedValue(undefined as never);
});

describe("SponsorListPage", () => {
  it("renders empty bar text + zero counts when there are no sponsors", async () => {
    vi.spyOn(api, "get").mockResolvedValue([] as never);
    const { getByText } = renderPage();
    await waitFor(() =>
      expect(getByText("Keine Sponsoren.")).toBeTruthy(),
    );
    expect(
      getByText("Keine aktiven Sponsoren — die Gewichtsverteilung ist leer."),
    ).toBeTruthy();
  });

  it("loads /api/sponsors twice — once for the list, once for the bar — and renders rows", async () => {
    const sponsors = [
      s({ id: 1, name: "Bäckerei Müller", weight: 4, status: "active" }),
      s({ id: 2, name: "Autohaus Lang", weight: 2, status: "paused" }),
      s({ id: 3, name: "Inactive Inc.", status: "archived" }),
    ];
    const get = vi.spyOn(api, "get").mockResolvedValue(sponsors as never);
    const { container } = renderPage();
    await waitFor(() =>
      expect(container.querySelectorAll('[role="link"]').length).toBe(3),
    );
    const rowText = container.textContent ?? "";
    expect(rowText).toContain("Bäckerei Müller");
    expect(rowText).toContain("Autohaus Lang");
    expect(rowText).toContain("Inactive Inc.");
    // Once for the list ('all' filter, no query) and once for loadAll().
    expect(
      get.mock.calls.filter((c) => c[0] === "/api/sponsors").length,
    ).toBeGreaterThanOrEqual(2);
    // 'X aktiv' counter shows 1 active sponsor.
    expect(rowText).toContain("1 aktiv");
  });

  it("uses the status query parameter when a non-'all' filter is selected", async () => {
    const get = vi.spyOn(api, "get").mockResolvedValue([] as never);
    const { getByText } = renderPage();
    await waitFor(() =>
      expect(get).toHaveBeenCalledWith("/api/sponsors"),
    );
    fireEvent.click(getByText("Pausiert"));
    await waitFor(() =>
      expect(get).toHaveBeenCalledWith("/api/sponsors?status=paused"),
    );
  });

  it("filters the list client-side by name and tagline", async () => {
    vi.spyOn(api, "get").mockResolvedValue([
      s({ id: 1, name: "Alpha GmbH", tagline: "Software" }),
      s({ id: 2, name: "Beta AG", tagline: "Hardware" }),
    ] as never);
    const { container, getByPlaceholderText } = renderPage();
    await waitFor(() =>
      expect(container.querySelectorAll('[role="link"]').length).toBe(2),
    );
    const search = getByPlaceholderText("Suchen…") as HTMLInputElement;
    fireEvent.change(search, { target: { value: "hard" } });
    await waitFor(() =>
      expect(container.querySelectorAll('[role="link"]').length).toBe(1),
    );
    const remaining = container.querySelector('[role="link"]')!;
    expect(remaining.textContent).toContain("Beta AG");
    // No-result fallback when search has no matches.
    fireEvent.change(search, { target: { value: "ZZZ" } });
    expect(container.textContent).toContain('Keine Treffer für „ZZZ".');
  });

  it("navigates to the new-sponsor route when the header CTA is clicked", async () => {
    vi.spyOn(api, "get").mockResolvedValue([] as never);
    const { getByText } = renderPage();
    fireEvent.click(getByText("Neuer Sponsor"));
    await waitFor(() => expect(getByText("NEW SPONSOR")).toBeTruthy());
  });

  it("navigates to the edit route when a sponsor row is clicked", async () => {
    vi.spyOn(api, "get").mockResolvedValue([
      s({ id: 42, name: "Click Me" }),
    ] as never);
    const { container, getByText } = renderPage();
    await waitFor(() =>
      expect(container.querySelector('[role="link"]')).toBeTruthy(),
    );
    fireEvent.click(container.querySelector('[role="link"]') as HTMLElement);
    await waitFor(() => expect(getByText("EDIT SPONSOR")).toBeTruthy());
  });

  it("navigates to the edit route when a sponsor row is opened with Enter or Space", async () => {
    vi.spyOn(api, "get").mockResolvedValue([
      s({ id: 7, name: "Keyboard Sponsor" }),
    ] as never);
    const { container, getByText } = renderPage();
    await waitFor(() =>
      expect(container.querySelector('[role="link"]')).toBeTruthy(),
    );
    fireEvent.keyDown(container.querySelector('[role="link"]') as HTMLElement, {
      key: "Enter",
    });
    await waitFor(() => expect(getByText("EDIT SPONSOR")).toBeTruthy());
  });

  it("pauses an active sponsor via PATCH without navigating", async () => {
    vi.spyOn(api, "get").mockResolvedValue([
      s({ id: 9, name: "Active Co", status: "active" }),
    ] as never);
    const patch = vi
      .spyOn(api, "patch")
      .mockResolvedValue(undefined as never);
    const { container, getByLabelText, getByText } = renderPage();
    await waitFor(() =>
      expect(container.querySelector('[role="link"]')).toBeTruthy(),
    );
    fireEvent.click(getByLabelText("Pausieren"));
    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith("/api/sponsors/9", {
        status: "paused",
      }),
    );
    // Stayed on the list page.
    expect(getByText("Sponsoren")).toBeTruthy();
  });

  it("activates a paused sponsor via PATCH", async () => {
    vi.spyOn(api, "get").mockResolvedValue([
      s({ id: 11, name: "Paused Co", status: "paused" }),
    ] as never);
    const patch = vi
      .spyOn(api, "patch")
      .mockResolvedValue(undefined as never);
    const { container, getByLabelText } = renderPage();
    await waitFor(() =>
      expect(container.querySelector('[role="link"]')).toBeTruthy(),
    );
    fireEvent.click(getByLabelText("Aktivieren"));
    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith("/api/sponsors/11", {
        status: "active",
      }),
    );
  });

  it("archives a non-archived sponsor via PATCH", async () => {
    vi.spyOn(api, "get").mockResolvedValue([
      s({ id: 4, name: "Archive Me", status: "active" }),
    ] as never);
    const patch = vi
      .spyOn(api, "patch")
      .mockResolvedValue(undefined as never);
    const { container, getByLabelText } = renderPage();
    await waitFor(() =>
      expect(container.querySelector('[role="link"]')).toBeTruthy(),
    );
    fireEvent.click(getByLabelText("Archivieren"));
    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith("/api/sponsors/4", {
        status: "archived",
      }),
    );
  });

  it("hard-deletes an archived sponsor only when the user types the matching name", async () => {
    vi.spyOn(api, "get").mockResolvedValue([
      s({ id: 5, name: "Old Co", status: "archived" }),
    ] as never);
    const del = vi
      .spyOn(api, "delete")
      .mockResolvedValue(undefined as never);
    const promptSpy = vi.spyOn(window, "prompt");

    // First click: user types something different — must NOT delete.
    promptSpy.mockReturnValueOnce("wrong");
    const { container, getByLabelText } = renderPage();
    await waitFor(() =>
      expect(container.querySelector('[role="link"]')).toBeTruthy(),
    );
    fireEvent.click(getByLabelText("Endgültig löschen"));
    expect(del).not.toHaveBeenCalled();

    // Second click: user types the exact name — must delete.
    promptSpy.mockReturnValueOnce("Old Co");
    fireEvent.click(getByLabelText("Endgültig löschen"));
    await waitFor(() =>
      expect(del).toHaveBeenCalledWith("/api/sponsors/5"),
    );
  });

  it("renders a logo img when a sponsor has logo variants", async () => {
    vi.spyOn(api, "get").mockResolvedValue([
      s({
        id: 1,
        name: "Logoed",
        logo: {
          id: 1,
          mimeType: "image/png",
          variants: { "200w": "/m/200/x.png" },
        } as never,
      }),
    ] as never);
    const { container } = renderPage();
    await waitFor(() =>
      expect(container.querySelector('[role="link"] img')).toBeTruthy(),
    );
    const img = container.querySelector('[role="link"] img') as HTMLImageElement;
    expect(img.src).toContain("/m/200/x.png");
  });
});
