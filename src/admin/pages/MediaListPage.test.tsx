import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MediaListPage from "./MediaListPage";
import { api, ApiError } from "../api";
import type { Media } from "../types";

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

function renderPage() {
  return render(
    <MemoryRouter>
      <MediaListPage />
    </MemoryRouter>,
  );
}

const FIXTURE: Media[] = [
  m({
    id: 1,
    kind: "news",
    filename: "training-camp.webp",
    uploadedAt: "2025-03-01T00:00:00.000Z",
  }),
  m({
    id: 2,
    kind: "sponsor",
    filename: "acme-logo.svg",
    mimeType: "image/svg+xml",
    variants: { svg: "/media/sponsors/2/logo.svg" },
  }),
  m({
    id: 3,
    kind: "vorstand",
    filename: "marta.webp",
    variants: { "160w": "/media/vorstand/3/160.webp" },
  }),
];

beforeEach(() => {
  vi.spyOn(api, "get").mockImplementation(async (path: string) => {
    if (path === "/api/media") return FIXTURE as unknown as never;
    throw new Error(`unexpected fetch: ${path}`);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("MediaListPage — happy path", () => {
  it("shows a loading state, then renders every media cell in grid view by default", async () => {
    renderPage();
    expect(screen.getByTestId("media-loading")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId("media-cell-1")).toBeInTheDocument();
    });
    expect(screen.getByTestId("media-cell-2")).toBeInTheDocument();
    expect(screen.getByTestId("media-cell-3")).toBeInTheDocument();
    expect(screen.getByTestId("media-grid")).toBeInTheDocument();
  });

  it("shows kind-breakdown KPIs", async () => {
    renderPage();
    await waitFor(() => screen.getByTestId("media-cell-1"));
    // Total, News, Sponsor, Vorstand columns — order from the DOM.
    const values = screen.getAllByText(/^\d+$/).map((el) => el.textContent);
    expect(values).toEqual(["3", "1", "1", "1"]);
  });

  it("switches to list view and back", async () => {
    renderPage();
    await waitFor(() => screen.getByTestId("media-cell-1"));

    fireEvent.click(screen.getByTestId("view-toggle-list"));
    expect(screen.queryByTestId("media-grid")).toBeNull();
    expect(screen.getByTestId("media-row-1")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("view-toggle-grid"));
    expect(screen.getByTestId("media-grid")).toBeInTheDocument();
  });

  it("filters by kind pill", async () => {
    renderPage();
    await waitFor(() => screen.getByTestId("media-cell-1"));

    fireEvent.click(screen.getByTestId("kind-sponsor"));
    expect(screen.queryByTestId("media-cell-1")).toBeNull();
    expect(screen.getByTestId("media-cell-2")).toBeInTheDocument();
    expect(screen.queryByTestId("media-cell-3")).toBeNull();
  });

  it("searches by filename", async () => {
    renderPage();
    await waitFor(() => screen.getByTestId("media-cell-1"));

    fireEvent.change(screen.getByTestId("media-search"), {
      target: { value: "marta" },
    });
    expect(screen.queryByTestId("media-cell-1")).toBeNull();
    expect(screen.queryByTestId("media-cell-2")).toBeNull();
    expect(screen.getByTestId("media-cell-3")).toBeInTheDocument();
  });

  it("searches by mime label so 'svg' locates the sponsor logo", async () => {
    renderPage();
    await waitFor(() => screen.getByTestId("media-cell-1"));

    fireEvent.change(screen.getByTestId("media-search"), {
      target: { value: "SVG" },
    });
    expect(screen.getByTestId("media-cell-2")).toBeInTheDocument();
    expect(screen.queryByTestId("media-cell-1")).toBeNull();
  });

  it("shows a 'no matches' message when the filter hides everything", async () => {
    renderPage();
    await waitFor(() => screen.getByTestId("media-cell-1"));

    fireEvent.change(screen.getByTestId("media-search"), {
      target: { value: "absolutely-nothing-matches" },
    });
    expect(screen.getByText("Keine Treffer")).toBeInTheDocument();
  });
});

describe("MediaListPage — selection and detail panel", () => {
  it("starts with the 'keine Auswahl' placeholder and reveals the detail card on click", async () => {
    renderPage();
    await waitFor(() => screen.getByTestId("media-cell-1"));

    expect(screen.getByTestId("media-detail-empty")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("media-cell-1"));
    expect(screen.queryByTestId("media-detail-empty")).toBeNull();
    expect(screen.getByTestId("media-detail-name")).toHaveTextContent(
      "training-camp.webp",
    );
  });

  it("swaps the preview when a different cell is clicked", async () => {
    renderPage();
    await waitFor(() => screen.getByTestId("media-cell-1"));

    fireEvent.click(screen.getByTestId("media-cell-1"));
    fireEvent.click(screen.getByTestId("media-cell-2"));
    expect(screen.getByTestId("media-detail-name")).toHaveTextContent(
      "acme-logo.svg",
    );
  });

  it("clears the selection when a kind filter hides the selected row", async () => {
    renderPage();
    await waitFor(() => screen.getByTestId("media-cell-1"));
    fireEvent.click(screen.getByTestId("media-cell-1")); // news
    expect(screen.getByTestId("media-detail")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("kind-sponsor"));
    // The news row is gone from the list, and the panel falls back to empty.
    expect(screen.queryByTestId("media-cell-1")).toBeNull();
    expect(screen.getByTestId("media-detail-empty")).toBeInTheDocument();
  });

  it("keeps the selection if the selected row is still visible after filtering", async () => {
    renderPage();
    await waitFor(() => screen.getByTestId("media-cell-2"));
    fireEvent.click(screen.getByTestId("media-cell-2")); // sponsor

    fireEvent.click(screen.getByTestId("kind-sponsor"));
    expect(screen.getByTestId("media-detail-name")).toHaveTextContent(
      "acme-logo.svg",
    );
  });
});

describe("MediaListPage — delete", () => {
  it("calls DELETE and removes the row after confirmation", async () => {
    const spy = vi
      .spyOn(api, "delete")
      .mockResolvedValue(undefined as unknown as never);

    renderPage();
    await waitFor(() => screen.getByTestId("media-cell-1"));
    fireEvent.click(screen.getByTestId("media-cell-1"));

    fireEvent.click(screen.getByTestId("media-detail-delete"));
    // Inline confirmation buttons appear.
    expect(
      screen.getByTestId("media-detail-delete-confirm"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("media-detail-delete-confirm"));
    await waitFor(() => expect(spy).toHaveBeenCalledWith("/api/media/1"));
    await waitFor(() => {
      expect(screen.queryByTestId("media-cell-1")).toBeNull();
    });
    expect(screen.getByTestId("media-detail-empty")).toBeInTheDocument();
  });

  it("shows blocking references when the server responds 409", async () => {
    vi.spyOn(api, "delete").mockRejectedValue(
      new ApiError(409, {
        code: "in_use",
        message: "Medium ist noch verknüpft.",
        references: [{ kind: "news", id: 42, label: "Jugendturnier" }],
      }),
    );

    renderPage();
    await waitFor(() => screen.getByTestId("media-cell-1"));
    fireEvent.click(screen.getByTestId("media-cell-1"));
    fireEvent.click(screen.getByTestId("media-detail-delete"));
    fireEvent.click(screen.getByTestId("media-detail-delete-confirm"));

    const refs = await screen.findByTestId("media-detail-refs");
    expect(refs).toHaveTextContent("Jugendturnier");
    // Row is still in the list — delete never happened.
    expect(screen.getByTestId("media-cell-1")).toBeInTheDocument();
  });

  it("cancels the delete confirmation without calling the API", async () => {
    const spy = vi.spyOn(api, "delete");
    renderPage();
    await waitFor(() => screen.getByTestId("media-cell-1"));
    fireEvent.click(screen.getByTestId("media-cell-1"));
    fireEvent.click(screen.getByTestId("media-detail-delete"));
    fireEvent.click(screen.getByTestId("media-detail-delete-cancel"));
    expect(screen.queryByTestId("media-detail-delete-confirm")).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("MediaListPage — copy link", () => {
  it("copies the largest variant URL to the clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    // `navigator.clipboard` is undefined in jsdom; define a minimal stub.
    Object.defineProperty(window.navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    renderPage();
    await waitFor(() => screen.getByTestId("media-cell-1"));
    fireEvent.click(screen.getByTestId("media-cell-1"));
    fireEvent.click(screen.getByTestId("media-detail-copy"));

    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(
        expect.stringContaining("/media/x/1/400w.webp"),
      ),
    );
  });
});

describe("MediaListPage — unhappy paths", () => {
  it("shows an error banner and stays functional when the fetch fails", async () => {
    vi.spyOn(api, "get").mockRejectedValueOnce(new Error("Boom"));
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/Boom/);
    });
    // Empty state should render since no items loaded.
    expect(screen.getByText("Leer")).toBeInTheDocument();
  });

  it("shows the empty state with onboarding copy when no media exist", async () => {
    vi.spyOn(api, "get").mockResolvedValueOnce([] as unknown as never);
    renderPage();
    await waitFor(() => screen.getByText("Leer"));
    expect(
      screen.getByText(/Noch keine Medien hochgeladen/i),
    ).toBeInTheDocument();
  });
});
