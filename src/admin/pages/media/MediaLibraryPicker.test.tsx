import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MediaLibraryPicker } from "./MediaLibraryPicker";
import { api } from "../../api";
import type { Media } from "../../types";

function m(over: Partial<Media> & { id: number; kind?: Media["kind"] }): Media {
  return {
    variants: { "400w": `/media/x/${over.id}/400w.webp` },
    mimeType: "image/webp",
    kind: "news",
    filename: `photo-${over.id}.webp`,
    uploadedAt: "2025-01-01T00:00:00.000Z",
    uploadedBy: "admin@example.org",
    ...over,
  } as Media;
}

const NEWS_FIXTURE: Media[] = [
  m({ id: 1, kind: "news", filename: "training-camp.webp" }),
  m({ id: 2, kind: "news", filename: "jugend-turnier.webp" }),
];

const SPONSOR_FIXTURE: Media[] = [
  m({
    id: 10,
    kind: "sponsor",
    filename: "acme-logo.svg",
    mimeType: "image/svg+xml",
    variants: { svg: "/media/sponsors/10/logo.svg" },
  }),
];

beforeEach(() => {
  vi.spyOn(api, "get").mockImplementation(async (path: string) => {
    if (path === "/api/media?kind=news") return NEWS_FIXTURE as unknown as never;
    if (path === "/api/media?kind=sponsor")
      return SPONSOR_FIXTURE as unknown as never;
    if (path === "/api/media?kind=vorstand") return [] as unknown as never;
    throw new Error(`unexpected fetch: ${path}`);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("MediaLibraryPicker — happy path", () => {
  it("does not render when closed and skips the fetch", () => {
    const spy = vi.spyOn(api, "get");
    render(
      <MediaLibraryPicker
        open={false}
        kind="news"
        onClose={() => {}}
        onPick={() => {}}
      />,
    );
    expect(screen.queryByTestId("media-picker")).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });

  it("fetches scoped to the given kind and renders a cell per media", async () => {
    render(
      <MediaLibraryPicker
        open
        kind="news"
        onClose={() => {}}
        onPick={() => {}}
      />,
    );
    expect(screen.getByTestId("media-picker-loading")).toBeInTheDocument();

    await waitFor(() => screen.getByTestId("media-picker-cell-1"));
    expect(screen.getByTestId("media-picker-cell-2")).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith("/api/media?kind=news");
  });

  it("picks a cell on click + apply and reports it via onPick, then closes", async () => {
    const onPick = vi.fn();
    const onClose = vi.fn();
    render(
      <MediaLibraryPicker
        open
        kind="news"
        onClose={onClose}
        onPick={onPick}
      />,
    );

    await waitFor(() => screen.getByTestId("media-picker-cell-1"));
    fireEvent.click(screen.getByTestId("media-picker-cell-2"));
    fireEvent.click(screen.getByTestId("media-picker-apply"));

    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onPick.mock.calls[0][0].id).toBe(2);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("double-click picks and closes in one gesture", async () => {
    const onPick = vi.fn();
    const onClose = vi.fn();
    render(
      <MediaLibraryPicker
        open
        kind="news"
        onClose={onClose}
        onPick={onPick}
      />,
    );

    await waitFor(() => screen.getByTestId("media-picker-cell-1"));
    fireEvent.doubleClick(screen.getByTestId("media-picker-cell-1"));

    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("pre-selects the currently-attached media", async () => {
    render(
      <MediaLibraryPicker
        open
        kind="news"
        current={NEWS_FIXTURE[1]}
        onClose={() => {}}
        onPick={() => {}}
      />,
    );

    const apply = await screen.findByTestId("media-picker-apply");
    // Apply is enabled because `current` pre-selects a row.
    expect((apply as HTMLButtonElement).disabled).toBe(false);
    const cell = await screen.findByTestId("media-picker-cell-2");
    expect(cell.getAttribute("aria-pressed")).toBe("true");
  });

  it("filters the visible cells by filename", async () => {
    render(
      <MediaLibraryPicker
        open
        kind="news"
        onClose={() => {}}
        onPick={() => {}}
      />,
    );
    await waitFor(() => screen.getByTestId("media-picker-cell-1"));

    fireEvent.change(screen.getByTestId("media-picker-search"), {
      target: { value: "jugend" },
    });
    expect(screen.queryByTestId("media-picker-cell-1")).toBeNull();
    expect(screen.getByTestId("media-picker-cell-2")).toBeInTheDocument();
  });
});

describe("MediaLibraryPicker — unhappy + edge paths", () => {
  it("disables the apply button until a row is selected", async () => {
    render(
      <MediaLibraryPicker
        open
        kind="news"
        onClose={() => {}}
        onPick={() => {}}
      />,
    );
    const apply = await screen.findByTestId("media-picker-apply");
    expect((apply as HTMLButtonElement).disabled).toBe(true);

    await waitFor(() => screen.getByTestId("media-picker-cell-1"));
    fireEvent.click(screen.getByTestId("media-picker-cell-1"));
    expect((apply as HTMLButtonElement).disabled).toBe(false);
  });

  it("shows an empty-library message when the library has no matching kind", async () => {
    render(
      <MediaLibraryPicker
        open
        kind="vorstand"
        onClose={() => {}}
        onPick={() => {}}
      />,
    );
    await waitFor(() => screen.getByTestId("media-picker-empty"));
    expect(screen.getByText(/Leer/)).toBeInTheDocument();
  });

  it("shows a no-matches message when the search hides everything", async () => {
    render(
      <MediaLibraryPicker
        open
        kind="news"
        onClose={() => {}}
        onPick={() => {}}
      />,
    );
    await waitFor(() => screen.getByTestId("media-picker-cell-1"));

    fireEvent.change(screen.getByTestId("media-picker-search"), {
      target: { value: "absolutely-nothing-matches" },
    });
    expect(screen.getByTestId("media-picker-empty")).toBeInTheDocument();
    expect(screen.getByText(/Keine Treffer/)).toBeInTheDocument();
  });

  it("surfaces server errors via an alert and still lets the user close", async () => {
    vi.spyOn(api, "get").mockRejectedValueOnce(new Error("Boom"));
    const onClose = vi.fn();
    render(
      <MediaLibraryPicker
        open
        kind="news"
        onClose={onClose}
        onPick={() => {}}
      />,
    );
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/Boom/);

    fireEvent.click(screen.getByTestId("media-picker-cancel"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes on Escape", async () => {
    const onClose = vi.fn();
    render(
      <MediaLibraryPicker
        open
        kind="news"
        onClose={onClose}
        onPick={() => {}}
      />,
    );
    await waitFor(() => screen.getByTestId("media-picker-cell-1"));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes on backdrop click but not when clicking inside the dialog", async () => {
    const onClose = vi.fn();
    render(
      <MediaLibraryPicker
        open
        kind="news"
        onClose={onClose}
        onPick={() => {}}
      />,
    );
    await waitFor(() => screen.getByTestId("media-picker-cell-1"));
    // Click on the inner dialog — onClose should NOT fire.
    fireEvent.click(screen.getByTestId("media-picker-cell-1"));
    expect(onClose).not.toHaveBeenCalled();
    // Click the backdrop (the outer container).
    fireEvent.click(screen.getByTestId("media-picker"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("re-fetches when the kind prop changes", async () => {
    const spy = vi.spyOn(api, "get");
    const { rerender } = render(
      <MediaLibraryPicker
        open
        kind="news"
        onClose={() => {}}
        onPick={() => {}}
      />,
    );
    await waitFor(() => screen.getByTestId("media-picker-cell-1"));
    expect(spy).toHaveBeenCalledWith("/api/media?kind=news");

    rerender(
      <MediaLibraryPicker
        open
        kind="sponsor"
        onClose={() => {}}
        onPick={() => {}}
      />,
    );
    await waitFor(() => screen.getByTestId("media-picker-cell-10"));
    expect(spy).toHaveBeenCalledWith("/api/media?kind=sponsor");
  });
});
