import { describe, it, expect, vi, afterEach } from "vitest";
import { fireEvent, render, waitFor } from "@testing-library/react";
import { DetailPanel } from "./DetailPanel";
import { api, ApiError } from "../../api";
import type { Media } from "../../types";

function media(over: Partial<Media> = {}): Media {
  return {
    id: 42,
    kind: "news",
    mimeType: "image/jpeg",
    width: 1200,
    height: 800,
    bytes: 12345,
    altText: null,
    sourceFilename: "hero.jpg",
    filename: "hero.jpg",
    variants: {
      "400w": "/m/400/hero.jpg",
      "200w": "/m/200/hero.jpg",
    },
    palette: null,
    createdAt: "2026-04-01T00:00:00Z",
    uploadedAt: "2026-04-02T10:00:00Z",
    uploadedBy: "Admin",
    ...over,
  } as Media;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("DetailPanel", () => {
  it("renders the empty state when no media is selected", () => {
    const { getByTestId, getByText } = render(
      <DetailPanel selected={null} onDeleted={vi.fn()} />,
    );
    expect(getByTestId("media-detail-empty")).toBeInTheDocument();
    expect(getByText(/Datei anklicken/)).toBeInTheDocument();
  });

  it("renders preview, displayName, type, hochgeladen-by, and filename rows for a full media row", () => {
    const { getByTestId, container } = render(
      <DetailPanel selected={media()} onDeleted={vi.fn()} />,
    );
    expect(getByTestId("media-detail-preview")).toBeInTheDocument();
    expect(container.textContent).toContain("Admin");
    expect(container.textContent).toContain("Dateiname");
  });

  it("falls back to a 'keine Vorschau' placeholder when previewUrl returns nothing", () => {
    const { container } = render(
      <DetailPanel
        selected={media({ variants: {} as Record<string, string> })}
        onDeleted={vi.fn()}
      />,
    );
    expect(container.textContent).toContain("keine Vorschau");
  });

  it("hides the uploadedBy prefix when the row has no uploader (covers the ?: branch)", () => {
    const { container } = render(
      <DetailPanel
        selected={media({ uploadedBy: undefined })}
        onDeleted={vi.fn()}
      />,
    );
    // The 'Hochgeladen' row contains only a date, no separator dot.
    expect(container.textContent).toMatch(/Hochgeladen/);
    expect(container.textContent).not.toContain("Admin · ");
  });

  it("hides the filename row when filename is missing", () => {
    const { container } = render(
      <DetailPanel
        selected={media({ filename: undefined })}
        onDeleted={vi.fn()}
      />,
    );
    expect(container.textContent).not.toContain("Dateiname");
  });

  it("formats a missing uploadedAt as an em-dash via formatDate", () => {
    const { container } = render(
      <DetailPanel
        selected={media({ uploadedAt: undefined, uploadedBy: undefined })}
        onDeleted={vi.fn()}
      />,
    );
    expect(container.textContent).toContain("—");
  });

  it("shows '?' for kind label when selected has no kind value (defensive)", () => {
    const { container } = render(
      <DetailPanel
        selected={media({ kind: undefined as unknown as Media["kind"] })}
        onDeleted={vi.fn()}
      />,
    );
    // `... · ?` segment in the Typ row.
    expect(container.textContent).toMatch(/· \?/);
  });

  it("copies an absolute URL via navigator.clipboard.writeText and toggles 'Kopiert' for ~1.5s", async () => {
    vi.useFakeTimers();
    try {
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: { writeText },
      });
      const { getByTestId } = render(
        <DetailPanel selected={media()} onDeleted={vi.fn()} />,
      );
      fireEvent.click(getByTestId("media-detail-copy"));
      await vi.advanceTimersByTimeAsync(0);
      expect(writeText).toHaveBeenCalled();
      const arg = writeText.mock.calls[0][0] as string;
      expect(arg).toMatch(/^https?:\/\//);
      // After the timeout the label flips back from "Kopiert" to "Link kopieren".
      await vi.advanceTimersByTimeAsync(1600);
    } finally {
      vi.useRealTimers();
    }
  });

  it("falls back to 'Kopieren nicht möglich.' when clipboard.writeText rejects", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: vi.fn().mockRejectedValue(new Error("denied")),
      },
    });
    const { getByTestId, findByRole } = render(
      <DetailPanel selected={media()} onDeleted={vi.fn()} />,
    );
    fireEvent.click(getByTestId("media-detail-copy"));
    const alert = await findByRole("alert");
    expect(alert.textContent).toContain("Kopieren nicht möglich.");
  });

  it("does nothing on copy when the media has no usable URL (covers `if (!url) return`)", async () => {
    const writeText = vi.fn();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    const { getByTestId } = render(
      <DetailPanel
        selected={media({ variants: {} as Record<string, string> })}
        onDeleted={vi.fn()}
      />,
    );
    fireEvent.click(getByTestId("media-detail-copy"));
    expect(writeText).not.toHaveBeenCalled();
  });

  it("opens the delete confirm UI, lets the editor cancel it back to the single 'Löschen' button", () => {
    const { getByTestId, queryByTestId } = render(
      <DetailPanel selected={media()} onDeleted={vi.fn()} />,
    );
    fireEvent.click(getByTestId("media-detail-delete"));
    expect(getByTestId("media-detail-delete-confirm")).toBeInTheDocument();
    fireEvent.click(getByTestId("media-detail-delete-cancel"));
    expect(queryByTestId("media-detail-delete-confirm")).toBeNull();
  });

  it("calls api.delete and onDeleted on confirm", async () => {
    vi.spyOn(api, "delete").mockResolvedValue(undefined as never);
    const onDeleted = vi.fn();
    const { getByTestId } = render(
      <DetailPanel selected={media()} onDeleted={onDeleted} />,
    );
    fireEvent.click(getByTestId("media-detail-delete"));
    fireEvent.click(getByTestId("media-detail-delete-confirm"));
    await waitFor(() => expect(onDeleted).toHaveBeenCalledWith(42));
  });

  it("shows a 'Noch in Verwendung' references panel on a 409 ApiError", async () => {
    vi.spyOn(api, "delete").mockRejectedValue(
      new ApiError(409, {
        code: "media/in-use",
        message: "Datei in Verwendung",
        references: [
          { kind: "news", id: 1, label: "Hero of news 1" },
          { kind: "sponsor", id: 2, label: "Logo of sponsor 2" },
        ],
      }),
    );
    const { getByTestId } = render(
      <DetailPanel selected={media()} onDeleted={vi.fn()} />,
    );
    fireEvent.click(getByTestId("media-detail-delete"));
    fireEvent.click(getByTestId("media-detail-delete-confirm"));
    const refs = await waitFor(() => getByTestId("media-detail-refs"));
    expect(refs.textContent).toContain("Hero of news 1");
    expect(refs.textContent).toContain("Logo of sponsor 2");
  });

  it("shows the ApiError message inline (without refs) on non-409 errors", async () => {
    vi.spyOn(api, "delete").mockRejectedValue(
      new ApiError(500, { code: "server/error", message: "Boom" }),
    );
    const { getByTestId, findByRole } = render(
      <DetailPanel selected={media()} onDeleted={vi.fn()} />,
    );
    fireEvent.click(getByTestId("media-detail-delete"));
    fireEvent.click(getByTestId("media-detail-delete-confirm"));
    const alert = await findByRole("alert");
    expect(alert.textContent).toContain("Boom");
  });

  it("falls back to 'Löschen fehlgeschlagen.' for non-ApiError errors", async () => {
    vi.spyOn(api, "delete").mockRejectedValue(new Error("network"));
    const { getByTestId, findByRole } = render(
      <DetailPanel selected={media()} onDeleted={vi.fn()} />,
    );
    fireEvent.click(getByTestId("media-detail-delete"));
    fireEvent.click(getByTestId("media-detail-delete-confirm"));
    const alert = await findByRole("alert");
    expect(alert.textContent).toContain("Löschen fehlgeschlagen.");
  });

  it("ignores non-array `references` payloads from the server (defensive parse)", async () => {
    vi.spyOn(api, "delete").mockRejectedValue(
      new ApiError(409, {
        code: "media/in-use",
        message: "Datei in Verwendung",
        references: "not-an-array",
      }),
    );
    const { getByTestId, queryByTestId, findByRole } = render(
      <DetailPanel selected={media()} onDeleted={vi.fn()} />,
    );
    fireEvent.click(getByTestId("media-detail-delete"));
    fireEvent.click(getByTestId("media-detail-delete-confirm"));
    await findByRole("alert");
    // Refs panel does NOT appear because `setRefs` only sets when an Array.
    expect(queryByTestId("media-detail-refs")).toBeNull();
  });

  it("resets the transient UI state when the selected row changes", async () => {
    const { rerender, getByTestId, queryByTestId } = render(
      <DetailPanel selected={media({ id: 1 })} onDeleted={vi.fn()} />,
    );
    fireEvent.click(getByTestId("media-detail-delete"));
    expect(getByTestId("media-detail-delete-confirm")).toBeInTheDocument();
    rerender(<DetailPanel selected={media({ id: 2 })} onDeleted={vi.fn()} />);
    // Confirm UI dismissed when id changed.
    expect(queryByTestId("media-detail-delete-confirm")).toBeNull();
  });
});
