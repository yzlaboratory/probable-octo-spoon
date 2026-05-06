import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// Capture the DndContext's onDragEnd prop into a hoisted slot so tests can
// invoke it directly. This bypasses the keyboard / pointer activation dance
// without changing the production code.
const dnd = vi.hoisted(() => ({
  onDragEnd: undefined as
    | ((e: { active: { id: number }; over: { id: number } | null }) => void)
    | undefined,
}));

vi.mock("@dnd-kit/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@dnd-kit/core")>();
  return {
    ...actual,
    DndContext: (props: {
      children: React.ReactNode;
      onDragEnd?: (e: unknown) => void;
    }) => {
      dnd.onDragEnd = props.onDragEnd as typeof dnd.onDragEnd;
      return <div data-testid="dnd-context-stub">{props.children}</div>;
    },
  };
});

import VorstandPage from "./VorstandPage";
import { api } from "../api";
import type { Vorstand } from "../types";

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
  dnd.onDragEnd = undefined;
  vi.spyOn(api, "post").mockResolvedValue({} as never);
  vi.spyOn(api, "patch").mockResolvedValue({} as never);
  vi.spyOn(api, "delete").mockResolvedValue(undefined as never);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function renderPage() {
  return render(
    <MemoryRouter>
      <VorstandPage />
    </MemoryRouter>,
  );
}

describe("VorstandPage — drag-end reorder", () => {
  it("POSTs the new ordered ids when an item is dragged onto another", async () => {
    vi.spyOn(api, "get").mockResolvedValue([
      v({ id: 1, name: "Eins" }),
      v({ id: 2, name: "Zwei" }),
      v({ id: 3, name: "Drei" }),
      // Different status → must NOT appear in the reorder payload.
      v({ id: 99, name: "Hidden", status: "hidden" }),
    ] as never);
    const post = vi.spyOn(api, "post").mockResolvedValue({} as never);
    const { findByText } = renderPage();
    await findByText("Eins");
    expect(dnd.onDragEnd).toBeTruthy();

    // Drag id=1 onto id=3 → reordered visible: [2, 3, 1], hidden lives outside.
    await dnd.onDragEnd!({ active: { id: 1 }, over: { id: 3 } });

    expect(post).toHaveBeenCalledWith("/api/vorstand/reorder", {
      orderedIds: [2, 3, 1, 99],
    });
  });

  it("does nothing when over is null (drop missed)", async () => {
    vi.spyOn(api, "get").mockResolvedValue([
      v({ id: 1, name: "Eins" }),
      v({ id: 2, name: "Zwei" }),
    ] as never);
    const post = vi.spyOn(api, "post").mockResolvedValue({} as never);
    const { findByText } = renderPage();
    await findByText("Eins");
    await dnd.onDragEnd!({ active: { id: 1 }, over: null });
    expect(post).not.toHaveBeenCalled();
  });

  it("does nothing when the drag lands on the same id", async () => {
    vi.spyOn(api, "get").mockResolvedValue([
      v({ id: 1, name: "Eins" }),
      v({ id: 2, name: "Zwei" }),
    ] as never);
    const post = vi.spyOn(api, "post").mockResolvedValue({} as never);
    const { findByText } = renderPage();
    await findByText("Eins");
    await dnd.onDragEnd!({ active: { id: 1 }, over: { id: 1 } });
    expect(post).not.toHaveBeenCalled();
  });

  it("reloads the list when the reorder request fails", async () => {
    const get = vi.spyOn(api, "get").mockResolvedValue([
      v({ id: 1, name: "Eins" }),
      v({ id: 2, name: "Zwei" }),
    ] as never);
    vi.spyOn(api, "post").mockRejectedValue(new Error("offline"));
    const { findByText } = renderPage();
    await findByText("Eins");
    expect(get).toHaveBeenCalledTimes(1);
    await dnd.onDragEnd!({ active: { id: 1 }, over: { id: 2 } });
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
  });
});

describe("VorstandPage — per-card status branches", () => {
  it("archives an active member via the per-card 'Archivieren' button", async () => {
    vi.spyOn(api, "get").mockResolvedValue([
      v({ id: 7, name: "Aktiv Person", status: "active" }),
    ] as never);
    const patch = vi.spyOn(api, "patch").mockResolvedValue({} as never);
    const { getByText } = renderPage();
    await waitFor(() => expect(getByText("Aktiv Person")).toBeTruthy());
    fireEvent.click(getByText("Archivieren"));
    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith("/api/vorstand/7", {
        status: "archived",
      }),
    );
  });

  it("renders the 'Anzeigen' affordance for archived members and reactivates them", async () => {
    vi.spyOn(api, "get").mockResolvedValue([
      v({ id: 9, name: "Alt", status: "archived" }),
    ] as never);
    const patch = vi.spyOn(api, "patch").mockResolvedValue({} as never);
    const { getByText } = renderPage();
    fireEvent.click(getByText("Ehemalig"));
    await waitFor(() => expect(getByText("Alt")).toBeTruthy());
    fireEvent.click(getByText("Anzeigen"));
    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith("/api/vorstand/9", {
        status: "active",
      }),
    );
  });
});

describe("VorstandPage — portrait variant fallbacks", () => {
  it("falls back to the 160w variant when 320w is missing", async () => {
    vi.spyOn(api, "get").mockResolvedValue([
      v({
        id: 1,
        name: "Klein Bild",
        portrait: { id: 1, variants: { "160w": "/m/160/k.jpg" } } as never,
      }),
    ] as never);
    const { container, getByText } = renderPage();
    await waitFor(() => expect(getByText("Klein Bild")).toBeTruthy());
    expect(
      container.querySelector("img[src='/m/160/k.jpg']"),
    ).not.toBeNull();
  });

  it("falls back to the 640w variant when 320w and 160w are both missing", async () => {
    vi.spyOn(api, "get").mockResolvedValue([
      v({
        id: 1,
        name: "Gross Bild",
        portrait: { id: 1, variants: { "640w": "/m/640/g.jpg" } } as never,
      }),
    ] as never);
    const { container, getByText } = renderPage();
    await waitFor(() => expect(getByText("Gross Bild")).toBeTruthy());
    expect(
      container.querySelector("img[src='/m/640/g.jpg']"),
    ).not.toBeNull();
  });
});

describe("VorstandPage — initials helper edge cases", () => {
  it("renders a single-word name as its first two letters uppercased", async () => {
    vi.spyOn(api, "get").mockResolvedValue([
      v({ id: 1, name: "cher", portrait: null }),
    ] as never);
    const { container, getByText } = renderPage();
    await waitFor(() => expect(getByText("cher")).toBeTruthy());
    expect(container.textContent).toContain("CH");
  });

  it("renders the '··' fallback for whitespace-only names", async () => {
    vi.spyOn(api, "get").mockResolvedValue([
      v({ id: 1, name: "   ", portrait: null }),
    ] as never);
    const { container } = renderPage();
    await waitFor(() => expect(container.textContent).toContain("··"));
  });
});
