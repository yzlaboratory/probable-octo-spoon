import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import NewsEditPage from "./NewsEditPage";
import { api } from "../api";
import type { News, NewsStatus } from "../types";

// Drives the small status-mapping helpers (modeFromStatus, statusPillTone,
// statusLabel) for the branches the original suite skipped, and exercises
// formatSavedAgo by advancing the editor's 5s "now" tick after a successful
// save so each branch ("gerade gespeichert" / "vor X Sek." / "vor X Min.")
// is rendered.

function n(over: Partial<News> & { id: number }): News {
  return {
    slug: `slug-${over.id}`,
    title: `Title ${over.id}`,
    tag: "Verein",
    short: "Kurz",
    longHtml: "",
    blocks: [{ kind: "paragraph", text: "x" }],
    status: "draft",
    publishAt: null,
    hero: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-02T00:00:00Z",
    ...over,
  };
}

function renderEdit() {
  return render(
    <MemoryRouter initialEntries={["/admin/news/1"]}>
      <Routes>
        <Route path="/admin/news/:id" element={<NewsEditPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.spyOn(api, "post").mockResolvedValue({} as never);
  vi.spyOn(api, "patch").mockResolvedValue({} as never);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("NewsEditPage — status mapping branches", () => {
  it.each<[NewsStatus, string]>([
    ["scheduled", "Geplant"],
    ["withdrawn", "Zurückgezogen"],
    ["draft", "Entwurf"],
  ])(
    "renders the %s status as the %s pill label",
    async (status, label) => {
      vi.spyOn(api, "get").mockResolvedValue([
        n({ id: 1, status }),
      ] as never);
      const { container, getByTestId } = renderEdit();
      await waitFor(() => expect(getByTestId("editor-title")).toBeTruthy());
      // Some labels (Geplant, Entwurf) also appear in the PublicationPanel
      // radio list — scope to the [data-pill] element rendered by the Pill UI
      // primitive in the editor toolbar.
      // The editor header renders its status as the first <Pill> in DOM order;
      // PublicationPanel labels also include some of these strings but aren't pills.
      const pill = container.querySelector("[data-tone]") as HTMLElement;
      expect(pill).toBeTruthy();
      expect(pill.textContent).toContain(label);
    },
  );

  it("preserves the 'withdrawn' status when saving as draft (statusFromMode)", async () => {
    vi.spyOn(api, "get").mockResolvedValue([
      n({ id: 1, status: "withdrawn" }),
    ] as never);
    const patch = vi
      .spyOn(api, "patch")
      .mockResolvedValue(n({ id: 1, status: "withdrawn" }) as never);
    const { getByTestId } = renderEdit();
    await waitFor(() => expect(getByTestId("editor-title")).toBeTruthy());
    // Click the "Veröffentlichen"/"Planen" button which uses statusFromMode
    // with the current scheduleMode ("draft" for non-published/scheduled).
    fireEvent.click(getByTestId("editor-publish"));
    await waitFor(() => {
      const withdrawnCall = patch.mock.calls.find((c) => {
        const body = c[1] as Record<string, unknown>;
        return body && body.status === "withdrawn";
      });
      expect(withdrawnCall).toBeTruthy();
    });
  });
});

describe("NewsEditPage — formatSavedAgo via the autosave UI", () => {
  it("renders 'gerade gespeichert' immediately after autosave + walks to '… Sek.' as time advances", async () => {
    vi.useFakeTimers();
    const ORIGIN = 1_700_000_000_000;
    vi.setSystemTime(ORIGIN);

    vi.spyOn(api, "get").mockResolvedValue([n({ id: 1 })] as never);
    vi.spyOn(api, "patch").mockResolvedValue({} as never);

    const { getByTestId } = renderEdit();
    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    // Type into the teaser → autosave will fire after 800ms.
    fireEvent.change(getByTestId("editor-teaser"), {
      target: { value: "neuer teaser" },
    });
    await act(async () => {
      vi.advanceTimersByTime(900);
      await vi.runOnlyPendingTimersAsync();
    });
    // Autosave landed: status line shows "gerade gespeichert" within the first 5s.
    expect(getByTestId("editor-status-line").textContent).toMatch(
      /gerade gespeichert/,
    );

    // Advance the editor's "now" tick (5s interval) past the 5s threshold so
    // formatSavedAgo crosses into the "vor N Sek." branch.
    await act(async () => {
      vi.advanceTimersByTime(11_000);
    });
    expect(getByTestId("editor-status-line").textContent).toMatch(
      /vor \d+ Sek\./,
    );

    // Advance past the 60s mark → "vor N Min." branch.
    await act(async () => {
      vi.advanceTimersByTime(70_000);
    });
    expect(getByTestId("editor-status-line").textContent).toMatch(
      /vor \d+ Min\./,
    );

    // And finally past the 60-minute mark → "vor N Std.".
    await act(async () => {
      vi.advanceTimersByTime(60 * 60 * 1000);
    });
    expect(getByTestId("editor-status-line").textContent).toMatch(
      /vor \d+ Std\./,
    );
  });
});
