import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import NewsEditPage from "./NewsEditPage";
import { api } from "../api";
import type { News } from "../types";

// Supplementary tests covering the editor's interaction paths the original
// suite skipped: keyboard shortcut for inserting blocks, block reordering via
// the move-up/down handles, image media-pick handler, autosave body, the
// BlockInsert toggle, and the savedAt formatter via autosave UI.

function n(over: Partial<News> & { id: number }): News {
  return {
    slug: `slug-${over.id}`,
    title: `Title ${over.id}`,
    tag: "Verein",
    short: "Kurz",
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
  vi.spyOn(api, "post").mockResolvedValue({} as never);
  vi.spyOn(api, "patch").mockResolvedValue({} as never);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("NewsEditPage — block reordering", () => {
  it("moves a block up via the move-up button on the active block", async () => {
    vi.spyOn(api, "get").mockResolvedValue([
      n({
        id: 1,
        blocks: [
          { kind: "paragraph", text: "first" },
          { kind: "paragraph", text: "second" },
        ],
      }),
    ] as never);
    const { container, getByTestId } = renderEdit("/admin/news/1");
    await waitFor(() => expect(getByTestId("editor-title")).toBeTruthy());
    const upButtons = container.querySelectorAll(
      "[data-testid='block-move-up']",
    );
    // Click move-up on the second block — it should now be first.
    fireEvent.click(upButtons[1]);
    await waitFor(() => {
      const textareas = container.querySelectorAll<HTMLTextAreaElement>(
        "textarea[data-testid=block-paragraph]",
      );
      expect(textareas[0].value).toBe("second");
      expect(textareas[1].value).toBe("first");
    });
  });

  it("moves a block down via the move-down button", async () => {
    vi.spyOn(api, "get").mockResolvedValue([
      n({
        id: 1,
        blocks: [
          { kind: "paragraph", text: "first" },
          { kind: "paragraph", text: "second" },
        ],
      }),
    ] as never);
    const { container, getByTestId } = renderEdit("/admin/news/1");
    await waitFor(() => expect(getByTestId("editor-title")).toBeTruthy());
    const downButtons = container.querySelectorAll(
      "[data-testid='block-move-down']",
    );
    fireEvent.click(downButtons[0]);
    await waitFor(() => {
      const textareas = container.querySelectorAll<HTMLTextAreaElement>(
        "textarea[data-testid=block-paragraph]",
      );
      expect(textareas[0].value).toBe("second");
      expect(textareas[1].value).toBe("first");
    });
  });
});

describe("NewsEditPage — keyboard shortcut", () => {
  it("Cmd/Ctrl+Shift+Enter inserts a new paragraph block after the active one", async () => {
    vi.spyOn(api, "get").mockResolvedValue([
      n({ id: 1, blocks: [{ kind: "paragraph", text: "alpha" }] }),
    ] as never);
    const { container, getByTestId } = renderEdit("/admin/news/1");
    await waitFor(() => expect(getByTestId("editor-title")).toBeTruthy());
    // Click the row so the activeKey closure in the keydown effect is fresh.
    const row = container.querySelector(
      "[data-testid='block-row']",
    ) as HTMLElement;
    fireEvent.click(row);
    const ta = container.querySelector(
      "textarea[data-testid=block-paragraph]",
    ) as HTMLTextAreaElement;
    // Some browsers swallow synthesized Cmd modifiers; ctrl-shift-Enter is
    // the documented alternative and the handler accepts either modifier.
    fireEvent.keyDown(ta, { key: "Enter", ctrlKey: true, shiftKey: true });
    await waitFor(() => {
      const textareas = container.querySelectorAll(
        "textarea[data-testid=block-paragraph]",
      );
      expect(textareas.length).toBe(2);
    });
  });

  it("does nothing on Backspace when the focused element is not a text input/textarea", async () => {
    vi.spyOn(api, "get").mockResolvedValue([
      n({
        id: 1,
        blocks: [
          { kind: "paragraph", text: "" },
          { kind: "paragraph", text: "" },
        ],
      }),
    ] as never);
    const { container, getByTestId } = renderEdit("/admin/news/1");
    await waitFor(() => expect(getByTestId("editor-title")).toBeTruthy());
    // Dispatch keydown from a generic <div> inside the editor — the handler's
    // input-only guard should skip the remove path.
    const row = container.querySelector(
      "[data-testid='block-row']",
    ) as HTMLElement;
    fireEvent.keyDown(row, { key: "Backspace" });
    await act(async () => {
      await Promise.resolve();
    });
    expect(
      container.querySelectorAll("textarea[data-testid=block-paragraph]").length,
    ).toBe(2);
  });

  it("does nothing on keystrokes that originate outside the editor root", async () => {
    vi.spyOn(api, "get").mockResolvedValue([
      n({ id: 1, blocks: [{ kind: "paragraph", text: "" }] }),
    ] as never);
    const { container, getByTestId } = renderEdit("/admin/news/1");
    await waitFor(() => expect(getByTestId("editor-title")).toBeTruthy());
    // Synthesize a keydown on document.body — the editor's contains() check
    // returns false and the handler is a no-op.
    fireEvent.keyDown(document.body, {
      key: "Enter",
      metaKey: true,
      shiftKey: true,
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(
      container.querySelectorAll("textarea[data-testid=block-paragraph]").length,
    ).toBe(1);
  });
});

describe("NewsEditPage — autosave body", () => {
  it("autosaves form changes via PATCH after the debounce delay", async () => {
    vi.useFakeTimers();
    vi.spyOn(api, "get").mockResolvedValue([
      n({ id: 1, blocks: [{ kind: "paragraph", text: "x" }] }),
    ] as never);
    const patch = vi.spyOn(api, "patch").mockResolvedValue({} as never);
    const { getByTestId } = renderEdit("/admin/news/1");
    // Allow the load promise to settle and React effects to flush.
    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });
    expect(getByTestId("editor-title")).toBeTruthy();
    fireEvent.change(getByTestId("editor-teaser"), {
      target: { value: "neuer teaser" },
    });
    // The autosave debounce is 800ms.
    await act(async () => {
      vi.advanceTimersByTime(900);
    });
    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });
    expect(
      patch.mock.calls.some(
        (c) =>
          c[0] === "/api/news/1" &&
          (c[1] as Record<string, unknown>).short === "neuer teaser",
      ),
    ).toBe(true);
    vi.useRealTimers();
  });
});

describe("NewsEditPage — BlockInsert", () => {
  it("toggles the BlockInsert affordance and inserts a new heading via its tray", async () => {
    vi.spyOn(api, "get").mockResolvedValue([
      n({ id: 1, blocks: [{ kind: "paragraph", text: "hello" }] }),
    ] as never);
    const { container, getByTestId } = renderEdit("/admin/news/1");
    await waitFor(() => expect(getByTestId("editor-title")).toBeTruthy());

    // Open the inserter beneath the only block.
    const insertToggle = container.querySelector(
      "[data-testid='block-insert-toggle']",
    ) as HTMLElement;
    expect(insertToggle).toBeTruthy();
    fireEvent.click(insertToggle);

    // The tray exposes one button per block kind; pick "Überschrift".
    const headingBtn = container.querySelector(
      "[data-testid='block-insert-heading']",
    ) as HTMLElement;
    expect(headingBtn).toBeTruthy();
    fireEvent.click(headingBtn);

    await waitFor(() => {
      // After inserting we have 2 blocks total: the original paragraph and the new heading.
      const rows = container.querySelectorAll("[data-testid='block-row']");
      expect(rows.length).toBe(2);
    });
  });
});

describe("NewsEditPage — onPickMedia happy path", () => {
  it("hands the uploaded Media back to the image block and renders its preview", async () => {
    vi.spyOn(api, "get").mockImplementation(((path: string) => {
      if (path === "/api/news") {
        return Promise.resolve([
          n({
            id: 1,
            blocks: [
              { kind: "image", mediaId: null, caption: "", credit: "" },
            ],
          }),
        ]);
      }
      return Promise.resolve(null);
    }) as never);
    vi.spyOn(api, "upload").mockResolvedValue({
      id: 42,
      mimeType: "image/jpeg",
      variants: { "800w": "/m/800/x.jpg", "400w": "/m/400/x.jpg" },
    } as never);

    const { container, getByTestId } = renderEdit("/admin/news/1");
    await waitFor(() => expect(getByTestId("editor-title")).toBeTruthy());

    const fileInput = container.querySelector(
      "[data-testid='media-uploader-file-news']",
    ) as HTMLInputElement;
    expect(fileInput).toBeTruthy();

    const file = new File(["x"], "p.jpg", { type: "image/jpeg" });
    Object.defineProperty(fileInput, "files", {
      configurable: true,
      value: [file],
    });
    fireEvent.change(fileInput);

    // After upload resolves, MediaUploader's onChange triggers onPickMedia,
    // which seeds mediaById and re-renders the BlockBody img.
    await waitFor(() => {
      const img = container.querySelector(
        'img[src*="/m/400/x.jpg"], img[src*="/m/800/x.jpg"]',
      ) as HTMLImageElement | null;
      expect(img).toBeTruthy();
    });
  });
});
