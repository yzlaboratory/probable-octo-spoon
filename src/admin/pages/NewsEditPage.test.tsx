import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import NewsEditPage from "./NewsEditPage";
import { api, ApiError } from "../api";
import type { News } from "../types";

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

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

beforeEach(() => {
  // Default: every state-changing call resolves benignly. Individual tests
  // override get/post/patch as needed.
  vi.spyOn(api, "post").mockResolvedValue({} as never);
  vi.spyOn(api, "patch").mockResolvedValue({} as never);
});

describe("NewsEditPage — new mode", () => {
  it("renders the 'Neu' status pill, an empty title field, and a seeded paragraph block", async () => {
    const { getByPlaceholderText, getByText, getByTestId } = renderEdit(
      "/admin/news/new",
    );
    // Paragraph placeholder is the seed block from the empty-state effect.
    await waitFor(() => expect(getByPlaceholderText("Absatz…")).toBeTruthy());
    expect(getByText("Neu")).toBeTruthy();
    expect((getByTestId("editor-title") as HTMLInputElement).value).toBe("");
  });

  it("auto-derives the slug from the title until the user manually edits it", async () => {
    const { getByPlaceholderText, getByTestId } = renderEdit("/admin/news/new");
    await waitFor(() => expect(getByPlaceholderText("Absatz…")).toBeTruthy());
    const title = getByTestId("editor-title") as HTMLInputElement;
    fireEvent.change(title, { target: { value: "Sieg gegen Saarbruecken" } });
    await waitFor(() => {
      const slugInput = getByTestId(
        "metadata-slug-input",
      ) as HTMLInputElement;
      expect(slugInput.value).toBe("sieg-gegen-saarbruecken");
    });
    // Now edit the slug — and the title — and prove the slug doesn't get
    // re-derived on the next title change.
    const slugInput = getByTestId("metadata-slug-input") as HTMLInputElement;
    fireEvent.change(slugInput, { target: { value: "manual-slug" } });
    fireEvent.change(title, { target: { value: "Anderer Titel" } });
    expect((getByTestId("metadata-slug-input") as HTMLInputElement).value).toBe(
      "manual-slug",
    );
  });

  it("blocks publishing if the title is empty and surfaces the validation error", async () => {
    const { getByText, getByTestId, queryByRole } = renderEdit(
      "/admin/news/new",
    );
    await waitFor(() => expect(queryByRole("alert")).toBeNull());
    fireEvent.click(getByTestId("editor-publish"));
    await waitFor(() =>
      expect(getByText("Titel darf nicht leer sein.")).toBeTruthy(),
    );
  });

  it("POSTs a draft payload + navigates to the saved id when 'Entwurf speichern' succeeds", async () => {
    const post = vi
      .spyOn(api, "post")
      .mockResolvedValue(n({ id: 42, status: "draft" }) as never);
    const { getByTestId, findByText } = renderEdit("/admin/news/new");
    await waitFor(() => expect(getByTestId("editor-title")).toBeTruthy());
    fireEvent.change(getByTestId("editor-title"), {
      target: { value: "Titel" },
    });
    fireEvent.click(getByTestId("editor-save-draft"));
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith(
        "/api/news",
        expect.objectContaining({ title: "Titel", status: "draft" }),
      ),
    );
    // Confirm we land on the edit route via redirect — replace mode.
    expect(await findByText("Block-Editor")).toBeTruthy();
  });

  it("surfaces ApiError messages on save", async () => {
    vi.spyOn(api, "post").mockRejectedValue(
      new ApiError(400, { code: "bad", message: "Slug bereits vergeben." }),
    );
    const { getByTestId, getByText } = renderEdit("/admin/news/new");
    await waitFor(() => expect(getByTestId("editor-title")).toBeTruthy());
    fireEvent.change(getByTestId("editor-title"), { target: { value: "T" } });
    fireEvent.click(getByTestId("editor-save-draft"));
    await waitFor(() =>
      expect(getByText("Slug bereits vergeben.")).toBeTruthy(),
    );
  });

  it("surfaces a generic message when save fails with a non-ApiError", async () => {
    vi.spyOn(api, "post").mockRejectedValue(new Error("boom"));
    const { getByTestId, getByText } = renderEdit("/admin/news/new");
    await waitFor(() => expect(getByTestId("editor-title")).toBeTruthy());
    fireEvent.change(getByTestId("editor-title"), { target: { value: "T" } });
    fireEvent.click(getByTestId("editor-save-draft"));
    await waitFor(() =>
      expect(getByText("Speichern fehlgeschlagen.")).toBeTruthy(),
    );
  });

  it("uses the schedule mode + datetime when 'Planen' is selected", async () => {
    const post = vi
      .spyOn(api, "post")
      .mockResolvedValue(n({ id: 7, status: "scheduled" }) as never);
    const { getByTestId } = renderEdit("/admin/news/new");
    await waitFor(() => expect(getByTestId("editor-title")).toBeTruthy());
    fireEvent.change(getByTestId("editor-title"), {
      target: { value: "Geplant" },
    });
    fireEvent.click(getByTestId("publication-option-schedule"));
    fireEvent.change(getByTestId("publication-datetime"), {
      target: { value: "2026-12-31T18:00" },
    });
    fireEvent.click(getByTestId("editor-publish"));
    await waitFor(() => expect(post).toHaveBeenCalled());
    const payload = post.mock.calls[0][1] as Record<string, unknown>;
    expect(payload.status).toBe("scheduled");
    expect(typeof payload.publishAt).toBe("string");
    expect(payload.publishAt).toMatch(/^2026/);
  });

  it("publishes immediately when the 'Jetzt live' radio is selected", async () => {
    const post = vi
      .spyOn(api, "post")
      .mockResolvedValue(n({ id: 8, status: "published" }) as never);
    const { getByTestId } = renderEdit("/admin/news/new");
    await waitFor(() => expect(getByTestId("editor-title")).toBeTruthy());
    fireEvent.change(getByTestId("editor-title"), {
      target: { value: "Live" },
    });
    fireEvent.click(getByTestId("publication-option-publish-now"));
    fireEvent.click(getByTestId("editor-publish"));
    await waitFor(() => expect(post).toHaveBeenCalled());
    const payload = post.mock.calls[0][1] as Record<string, unknown>;
    expect(payload.status).toBe("published");
    expect(typeof payload.publishAt).toBe("string");
  });
});

describe("NewsEditPage — edit mode", () => {
  function listResp() {
    return [
      n({
        id: 1,
        title: "Bestehender Titel",
        slug: "bestehender-titel",
        short: "Teaser",
        tag: "Verein",
        status: "published",
        publishAt: "2026-04-15T10:00:00Z",
        blocks: [
          { kind: "heading", level: 2, text: "Abschnitt" },
          { kind: "paragraph", text: "Hallo Welt" },
        ],
      }),
    ];
  }

  it("shows the loading placeholder until /api/news resolves", async () => {
    let resolve: (v: News[]) => void = () => {};
    vi.spyOn(api, "get").mockImplementation(
      () =>
        new Promise<News[]>((res) => {
          resolve = res;
        }) as never,
    );
    const { getByText, queryByText } = renderEdit("/admin/news/1");
    expect(getByText("Lade…")).toBeTruthy();
    resolve(listResp());
    await waitFor(() => expect(queryByText("Lade…")).toBeNull());
  });

  it("hydrates fields from /api/news and labels the status pill", async () => {
    vi.spyOn(api, "get").mockResolvedValue(listResp() as never);
    const { getByTestId, getByText } = renderEdit("/admin/news/1");
    await waitFor(() => expect(getByTestId("editor-title")).toBeTruthy());
    expect((getByTestId("editor-title") as HTMLInputElement).value).toBe(
      "Bestehender Titel",
    );
    expect((getByTestId("editor-teaser") as HTMLInputElement).value).toBe(
      "Teaser",
    );
    expect(getByText("Veröffentlicht")).toBeTruthy();
    // Block status line: "2 Blöcke" (plural form).
    expect(getByTestId("editor-status-line").textContent).toContain("2 Blöcke");
  });

  it("renders 'Beitrag nicht gefunden.' when the id is missing from the list", async () => {
    vi.spyOn(api, "get").mockResolvedValue([] as never);
    const { findByText } = renderEdit("/admin/news/999");
    expect(await findByText("Beitrag nicht gefunden.")).toBeTruthy();
  });

  it("renders the load error when /api/news rejects", async () => {
    vi.spyOn(api, "get").mockRejectedValue(new Error("offline"));
    const { findByRole } = renderEdit("/admin/news/1");
    const alert = await findByRole("alert");
    expect(alert.textContent).toContain("offline");
  });

  it("PATCHes on save and respects the explicit 'Entwurf speichern' status", async () => {
    vi.spyOn(api, "get").mockResolvedValue(listResp() as never);
    const patch = vi
      .spyOn(api, "patch")
      .mockResolvedValue(
        n({ id: 1, status: "draft", slug: "bestehender-titel" }) as never,
      );
    const { getByTestId } = renderEdit("/admin/news/1");
    await waitFor(() => expect(getByTestId("editor-title")).toBeTruthy());
    fireEvent.click(getByTestId("editor-save-draft"));
    await waitFor(() => {
      const explicitDraftCall = patch.mock.calls.find((c) => {
        const body = c[1] as Record<string, unknown>;
        return body && body.status === "draft" && body.title !== undefined;
      });
      expect(explicitDraftCall).toBeTruthy();
    });
  });

  it("opens a public preview when the published 'Vorschau' button is clicked", async () => {
    vi.spyOn(api, "get").mockResolvedValue(listResp() as never);
    const open = vi.fn();
    vi.stubGlobal("open", open);
    const { getByTestId } = renderEdit("/admin/news/1");
    await waitFor(() => expect(getByTestId("editor-preview")).toBeTruthy());
    fireEvent.click(getByTestId("editor-preview"));
    expect(open).toHaveBeenCalledWith(
      "/news/bestehender-titel",
      "_blank",
      "noopener",
    );
  });

  it("disables the 'Vorschau' button when the post is not published", async () => {
    vi.spyOn(api, "get").mockResolvedValue([
      n({ id: 1, status: "draft" }),
    ] as never);
    const { getByTestId } = renderEdit("/admin/news/1");
    await waitFor(() => expect(getByTestId("editor-preview")).toBeTruthy());
    expect((getByTestId("editor-preview") as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it("seeds a paragraph block when the loaded news has no blocks", async () => {
    vi.spyOn(api, "get").mockResolvedValue([
      n({ id: 1, status: "draft", blocks: [] }),
    ] as never);
    const { getByPlaceholderText } = renderEdit("/admin/news/1");
    await waitFor(() =>
      expect(getByPlaceholderText("Absatz…")).toBeTruthy(),
    );
  });

  it("resolves Media for image blocks from /api/media/:id", async () => {
    const get = vi.spyOn(api, "get");
    get.mockImplementation(
      // First call is /api/news returning the article; subsequent calls are
      // /api/media/:id for each unresolved imageId.
      ((path: string) => {
        if (path === "/api/news") {
          return Promise.resolve([
            n({
              id: 1,
              status: "draft",
              blocks: [
                {
                  kind: "image",
                  mediaId: 7,
                  caption: "cap",
                  credit: "",
                },
              ],
            }),
          ]);
        }
        if (path === "/api/media/7") {
          return Promise.resolve({
            id: 7,
            mimeType: "image/jpeg",
            variants: { "800w": "/m/800/x.jpg" },
          });
        }
        return Promise.resolve(null);
      }) as never,
    );
    const { container } = renderEdit("/admin/news/1");
    await waitFor(() => {
      const img = container.querySelector(
        'img[src*="/m/800/x.jpg"]',
      ) as HTMLImageElement | null;
      expect(img).toBeTruthy();
    });
  });

  it("swallows 404s from /api/media/:id without crashing the editor", async () => {
    const get = vi.spyOn(api, "get");
    get.mockImplementation(((path: string) => {
      if (path === "/api/news") {
        return Promise.resolve([
          n({
            id: 1,
            blocks: [
              { kind: "image", mediaId: 99, caption: "", credit: "" },
            ],
          }),
        ]);
      }
      return Promise.reject(new ApiError(404, { code: "not_found" }));
    }) as never);
    const { getByText } = renderEdit("/admin/news/1");
    // Editor still renders despite the media fetch failure.
    await waitFor(() => expect(getByText("Block-Editor")).toBeTruthy());
  });

  it("navigates back to the list when the breadcrumb 'Meldungen' is clicked", async () => {
    vi.spyOn(api, "get").mockResolvedValue(listResp() as never);
    const { getByText, findByText } = renderEdit("/admin/news/1");
    await waitFor(() => expect(getByText("Block-Editor")).toBeTruthy());
    fireEvent.click(getByText("Meldungen"));
    expect(await findByText("NEWS LIST")).toBeTruthy();
  });

  it("formats the status line as singular when there is exactly one block", async () => {
    vi.spyOn(api, "get").mockResolvedValue([
      n({
        id: 1,
        blocks: [{ kind: "paragraph", text: "Eins zwei drei" }],
      }),
    ] as never);
    const { getByTestId } = renderEdit("/admin/news/1");
    await waitFor(() => {
      const line = getByTestId("editor-status-line").textContent ?? "";
      expect(line).toContain("1 Block");
      expect(line).toContain("3 Wörter");
    });
  });

  it("ticks 'now' on its 5s interval and clears it on unmount", async () => {
    vi.spyOn(api, "get").mockResolvedValue(listResp() as never);
    const setSpy = vi.spyOn(globalThis, "setInterval");
    const clearSpy = vi.spyOn(globalThis, "clearInterval");
    const { unmount, getByTestId } = renderEdit("/admin/news/1");
    await waitFor(() => expect(getByTestId("editor-title")).toBeTruthy());
    expect(
      setSpy.mock.calls.some((c) => c[1] === 5000),
    ).toBe(true);
    unmount();
    expect(clearSpy).toHaveBeenCalled();
  });
});

describe("NewsEditPage — keyboard shortcuts", () => {
  it("removes an empty active block on Backspace when the list has more than one block", async () => {
    vi.spyOn(api, "get").mockResolvedValue([
      n({
        id: 1,
        blocks: [
          { kind: "paragraph", text: "first" },
          { kind: "paragraph", text: "" },
        ],
      }),
    ] as never);
    const { container, getByTestId } = renderEdit("/admin/news/1");
    await waitFor(() => expect(getByTestId("editor-title")).toBeTruthy());
    const paragraphs = container.querySelectorAll(
      "textarea[data-testid=block-paragraph]",
    ) as NodeListOf<HTMLTextAreaElement>;
    expect(paragraphs.length).toBe(2);
    // Activate the second (empty) block — clicking its BlockRow updates
    // activeKey, then Backspace on the textarea triggers the remove path.
    const rows = container.querySelectorAll(
      '[data-testid="block-row"]',
    ) as NodeListOf<HTMLDivElement>;
    fireEvent.click(rows[1]);
    fireEvent.keyDown(paragraphs[1], { key: "Backspace" });
    await waitFor(() => {
      const remaining = container.querySelectorAll(
        "textarea[data-testid=block-paragraph]",
      );
      expect(remaining.length).toBe(1);
    });
  });

  it("does NOT remove the only remaining block on Backspace", async () => {
    vi.spyOn(api, "get").mockResolvedValue([
      n({ id: 1, blocks: [{ kind: "paragraph", text: "" }] }),
    ] as never);
    const { container, getByTestId } = renderEdit("/admin/news/1");
    await waitFor(() => expect(getByTestId("editor-title")).toBeTruthy());
    const ta = container.querySelector(
      "textarea[data-testid=block-paragraph]",
    ) as HTMLTextAreaElement;
    fireEvent.keyDown(ta, { key: "Backspace" });
    // Give React a tick — the no-op path still settles via state schedulers.
    await act(async () => {
      await Promise.resolve();
    });
    expect(
      container.querySelectorAll("textarea[data-testid=block-paragraph]").length,
    ).toBe(1);
  });
});

describe("NewsEditPage — preview, save fallbacks, block interactions", () => {
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

  it("Cmd/Ctrl+Shift+Enter inside a paragraph block inserts a fresh paragraph after it", async () => {
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

  it("clicking the block-remove handle on a row removes that block", async () => {
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

  it("typing into a block textarea updates the block", async () => {
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
