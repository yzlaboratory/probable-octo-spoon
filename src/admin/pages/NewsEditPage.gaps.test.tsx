import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import NewsEditPage from "./NewsEditPage";
import { api, ApiError } from "../api";
import type { News } from "../types";

// Targeted at the still-uncovered branches and inline arrows after the main
// status/more/test suites.

function n(over: Partial<News> & { id: number }): News {
  return {
    slug: `slug-${over.id}`,
    title: `Title ${over.id}`,
    tag: "Verein",
    short: "Kurz",
    longHtml: "",
    blocks: [{ kind: "paragraph", text: "Hello" }],
    status: "draft",
    publishAt: null,
    hero: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-02T00:00:00Z",
    ...over,
  };
}

function renderEdit(initialPath = "/admin/news/1") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/admin/news" element={<div>NEWS LIST</div>} />
        <Route path="/admin/news/new" element={<NewsEditPage />} />
        <Route path="/admin/news/:id" element={<NewsEditPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.spyOn(api, "post").mockResolvedValue({ id: 99 } as never);
  vi.spyOn(api, "patch").mockResolvedValue({} as never);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("NewsEditPage — gap coverage", () => {
  it("opens /news/<slug> in a new tab when 'Vorschau' is clicked on a published item", async () => {
    vi.spyOn(api, "get").mockResolvedValue([
      n({ id: 1, status: "published", slug: "hero-piece" }),
    ] as never);
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    const { getByTestId } = renderEdit("/admin/news/1");
    await waitFor(() => expect(getByTestId("editor-title")).toBeTruthy());
    fireEvent.click(getByTestId("editor-preview"));
    expect(open).toHaveBeenCalledWith("/news/hero-piece", "_blank", "noopener");
    open.mockRestore();
  });

  it("preview button is disabled while the article is still a draft and does NOT open a window", async () => {
    vi.spyOn(api, "get").mockResolvedValue([
      n({ id: 1, status: "draft" }),
    ] as never);
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    const { getByTestId } = renderEdit("/admin/news/1");
    await waitFor(() => expect(getByTestId("editor-title")).toBeTruthy());
    const btn = getByTestId("editor-preview") as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    fireEvent.click(btn);
    expect(open).not.toHaveBeenCalled();
    open.mockRestore();
  });

  it("falls back to 'Speichern fehlgeschlagen.' on a non-ApiError save (covers saveAs catch fallback)", async () => {
    vi.spyOn(api, "get").mockResolvedValue([n({ id: 1 })] as never);
    vi.spyOn(api, "patch").mockRejectedValue(new Error("network"));
    const { getByTestId, findByText } = renderEdit("/admin/news/1");
    await waitFor(() => expect(getByTestId("editor-title")).toBeTruthy());
    fireEvent.click(getByTestId("editor-save-draft"));
    await findByText("Speichern fehlgeschlagen.");
  });

  it("shows 'Beitrag nicht gefunden.' when /api/news returns a list missing :id", async () => {
    vi.spyOn(api, "get").mockResolvedValue([] as never);
    const { findByText } = renderEdit("/admin/news/999");
    await findByText("Beitrag nicht gefunden.");
  });

  it("guards a blank title — surfaces 'Titel darf nicht leer sein.' and skips the save call", async () => {
    vi.spyOn(api, "get").mockResolvedValue([
      n({ id: 1, title: "" }),
    ] as never);
    const patch = vi.spyOn(api, "patch").mockResolvedValue({} as never);
    const { getByTestId, findByText } = renderEdit("/admin/news/1");
    await waitFor(() => expect(getByTestId("editor-title")).toBeTruthy());
    fireEvent.click(getByTestId("editor-save-draft"));
    await findByText("Titel darf nicht leer sein.");
    expect(patch).not.toHaveBeenCalled();
  });

  it("ignores a media fetch that resolves to null (covers `if (m)` filter inside setMediaById)", async () => {
    // Fetch returns the article with one image block whose mediaId is missing on the server.
    vi.spyOn(api, "get").mockImplementation(async (path: string) => {
      if (path === "/api/news") {
        return [
          n({
            id: 1,
            blocks: [
              {
                kind: "image",
                mediaId: 7,
                caption: "",
                credit: "",
              } as News["blocks"][number],
            ],
          }),
        ] as unknown as never;
      }
      if (path === "/api/media/7") {
        // The component does .catch(() => null); throw to drive that path.
        throw new Error("not found");
      }
      throw new Error(`unexpected fetch: ${path}`);
    });
    const { getByTestId } = renderEdit("/admin/news/1");
    // Editor still mounts — the missing media is silently ignored.
    await waitFor(() => expect(getByTestId("editor-title")).toBeTruthy());
  });

  it("Cmd/Ctrl+Shift+Enter inside a paragraph block inserts a fresh paragraph after it (covers the activeKey shortcut path)", async () => {
    vi.spyOn(api, "get").mockResolvedValue([
      n({
        id: 1,
        blocks: [{ kind: "paragraph", text: "Hello" }],
      }),
    ] as never);
    const { container, getByTestId } = renderEdit("/admin/news/1");
    await waitFor(() => expect(getByTestId("editor-title")).toBeTruthy());
    const ta = container.querySelector(
      "textarea[data-testid=block-paragraph]",
    ) as HTMLTextAreaElement;
    // Activate the row so activeKey is set before triggering the shortcut.
    fireEvent.click(
      container.querySelector("[data-testid='block-row']") as HTMLDivElement,
    );
    fireEvent.keyDown(ta, {
      key: "Enter",
      shiftKey: true,
      ctrlKey: true,
    });
    await waitFor(() => {
      expect(
        container.querySelectorAll("textarea[data-testid=block-paragraph]").length,
      ).toBe(2);
    });
  });

  it("Delete key (rather than Backspace) on an empty active block also removes it", async () => {
    vi.spyOn(api, "get").mockResolvedValue([
      n({
        id: 1,
        blocks: [
          { kind: "paragraph", text: "" },
          { kind: "paragraph", text: "second" },
        ],
      }),
    ] as never);
    const { container, getByTestId } = renderEdit("/admin/news/1");
    await waitFor(() => expect(getByTestId("editor-title")).toBeTruthy());
    const ta = container.querySelectorAll(
      "textarea[data-testid=block-paragraph]",
    )[0] as HTMLTextAreaElement;
    fireEvent.click(
      container.querySelector("[data-testid='block-row']") as HTMLDivElement,
    );
    fireEvent.keyDown(ta, { key: "Delete" });
    await waitFor(() =>
      expect(
        container.querySelectorAll("textarea[data-testid=block-paragraph]")
          .length,
      ).toBe(1),
    );
  });

  it("Backspace with a non-empty target value is a no-op (covers `if (target.value !== '') return`)", async () => {
    vi.spyOn(api, "get").mockResolvedValue([
      n({
        id: 1,
        blocks: [
          { kind: "paragraph", text: "still typing here" },
          { kind: "paragraph", text: "x" },
        ],
      }),
    ] as never);
    const { container, getByTestId } = renderEdit("/admin/news/1");
    await waitFor(() => expect(getByTestId("editor-title")).toBeTruthy());
    const ta = container.querySelectorAll(
      "textarea[data-testid=block-paragraph]",
    )[0] as HTMLTextAreaElement;
    fireEvent.click(
      container.querySelector("[data-testid='block-row']") as HTMLDivElement,
    );
    fireEvent.keyDown(ta, { key: "Backspace" });
    await act(async () => {
      await Promise.resolve();
    });
    expect(
      container.querySelectorAll("textarea[data-testid=block-paragraph]")
        .length,
    ).toBe(2);
  });

  it("clicking the block-remove handle on a row removes that block (covers the inline `() => onRemove(b.__key)` arrow)", async () => {
    vi.spyOn(api, "get").mockResolvedValue([
      n({
        id: 1,
        blocks: [
          { kind: "paragraph", text: "Keep me" },
          { kind: "paragraph", text: "Remove me" },
        ],
      }),
    ] as never);
    const { container, getByTestId } = renderEdit("/admin/news/1");
    await waitFor(() => expect(getByTestId("editor-title")).toBeTruthy());
    const removeButtons = container.querySelectorAll(
      "[data-testid='block-remove']",
    ) as NodeListOf<HTMLButtonElement>;
    fireEvent.click(removeButtons[1]);
    await waitFor(() => {
      expect(
        container.querySelectorAll("textarea[data-testid=block-paragraph]")
          .length,
      ).toBe(1);
    });
  });

  it("typing into a block textarea updates the block (covers the inline `(patch) => onUpdate(b.__key, patch)` arrow)", async () => {
    vi.spyOn(api, "get").mockResolvedValue([
      n({
        id: 1,
        blocks: [{ kind: "paragraph", text: "before" }],
      }),
    ] as never);
    const { container, getByTestId } = renderEdit("/admin/news/1");
    await waitFor(() => expect(getByTestId("editor-title")).toBeTruthy());
    const ta = container.querySelector(
      "textarea[data-testid=block-paragraph]",
    ) as HTMLTextAreaElement;
    fireEvent.change(ta, { target: { value: "after" } });
    await waitFor(() => expect(ta.value).toBe("after"));
  });

});
