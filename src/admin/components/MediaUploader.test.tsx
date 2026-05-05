import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/react";
import MediaUploader from "./MediaUploader";
import { api, ApiError } from "../api";
import type { Media } from "../types";

function media(over: Partial<Media> = {}): Media {
  return {
    id: 1,
    kind: "news",
    mimeType: "image/jpeg",
    width: 1200,
    height: 800,
    bytes: 12345,
    altText: null,
    sourceFilename: "hero.jpg",
    variants: {
      "400w": "/m/400/hero.jpg",
      "200w": "/m/200/hero.jpg",
      "320w": "/m/320/hero.jpg",
    },
    palette: null,
    createdAt: "2026-04-01T00:00:00Z",
    ...over,
  } as Media;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("MediaUploader", () => {
  it("renders the empty state with a 'Hochladen' button when no value is set", () => {
    const onChange = vi.fn();
    const { getByText, container } = render(
      <MediaUploader kind="news" value={null} onChange={onChange} />,
    );
    expect(getByText("Bild")).toBeTruthy();
    expect(getByText("kein Bild")).toBeTruthy();
    expect(getByText("Hochladen")).toBeTruthy();
    // Remove button is hidden when there is no value.
    expect(container.textContent).not.toContain("Entfernen");
  });

  it("uses the provided label and helper, and shows 'Ersetzen' when a value is attached", () => {
    const { getByText, container } = render(
      <MediaUploader
        kind="news"
        value={media()}
        onChange={vi.fn()}
        label="Hero"
        helper="Empfohlen: 1200×800"
      />,
    );
    expect(getByText("Hero")).toBeTruthy();
    expect(getByText("Empfohlen: 1200×800")).toBeTruthy();
    expect(getByText("Ersetzen")).toBeTruthy();
    // Preview img should point at one of the variants.
    const img = container.querySelector("img") as HTMLImageElement;
    expect(img).toBeTruthy();
    expect(img.src).toContain("/m/400/hero.jpg");
  });

  it("falls back through preview variants 400w → 320w → 200w → svg", () => {
    const { container } = render(
      <MediaUploader
        kind="sponsor"
        value={media({
          variants: { "200w": "/m/200/x.jpg", svg: "/m/x.svg" } as never,
        })}
        onChange={vi.fn()}
      />,
    );
    expect(
      (container.querySelector("img") as HTMLImageElement).src,
    ).toContain("/m/200/x.jpg");
  });

  it("falls back to svg variant when no raster sizes are available", () => {
    const { container } = render(
      <MediaUploader
        kind="sponsor"
        value={media({ variants: { svg: "/m/logo.svg" } as never })}
        onChange={vi.fn()}
      />,
    );
    expect(
      (container.querySelector("img") as HTMLImageElement).src,
    ).toContain("/m/logo.svg");
  });

  it("uploads on file selection and surfaces the resulting Media via onChange", async () => {
    const newMedia = media({ id: 99 });
    const upload = vi
      .spyOn(api, "upload")
      .mockResolvedValue(newMedia as never);
    const onChange = vi.fn();
    const { container } = render(
      <MediaUploader kind="news" value={null} onChange={onChange} />,
    );
    const input = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const file = new File(["..."], "photo.jpg", { type: "image/jpeg" });
    Object.defineProperty(input, "files", { value: [file] });
    fireEvent.change(input);
    await waitFor(() => expect(upload).toHaveBeenCalledTimes(1));
    const [path, form] = upload.mock.calls[0] as [string, FormData];
    expect(path).toBe("/api/media");
    expect(form.get("kind")).toBe("news");
    expect(form.get("file")).toBe(file);
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(newMedia));
    // After upload completes, the input is cleared.
    expect(input.value).toBe("");
  });

  it("ignores the change event when no file is selected", () => {
    const upload = vi.spyOn(api, "upload");
    const onChange = vi.fn();
    const { container } = render(
      <MediaUploader kind="news" value={null} onChange={onChange} />,
    );
    const input = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    Object.defineProperty(input, "files", { value: [] });
    fireEvent.change(input);
    expect(upload).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("surfaces an ApiError message inline and does not call onChange", async () => {
    vi.spyOn(api, "upload").mockRejectedValue(
      new ApiError(413, {
        code: "media/too-large",
        message: "Datei zu groß",
      }),
    );
    const onChange = vi.fn();
    const { container, getByText } = render(
      <MediaUploader kind="news" value={null} onChange={onChange} />,
    );
    const input = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    Object.defineProperty(input, "files", {
      value: [new File(["..."], "f.jpg", { type: "image/jpeg" })],
    });
    fireEvent.change(input);
    await waitFor(() => expect(getByText("Datei zu groß")).toBeTruthy());
    expect(onChange).not.toHaveBeenCalled();
  });

  it("falls back to a generic message for non-ApiError upload failures", async () => {
    vi.spyOn(api, "upload").mockRejectedValue(new Error("network"));
    const { container, getByText } = render(
      <MediaUploader kind="news" value={null} onChange={vi.fn()} />,
    );
    const input = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    Object.defineProperty(input, "files", {
      value: [new File(["..."], "f.jpg", { type: "image/jpeg" })],
    });
    fireEvent.change(input);
    await waitFor(() => expect(getByText("Upload fehlgeschlagen.")).toBeTruthy());
  });

  it("invokes onChange(null) when the editor clicks 'Entfernen'", () => {
    const onChange = vi.fn();
    const { getByText } = render(
      <MediaUploader kind="news" value={media()} onChange={onChange} />,
    );
    fireEvent.click(getByText("Entfernen"));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("uses an SVG-friendly accept list for the sponsor kind", () => {
    const { container } = render(
      <MediaUploader kind="sponsor" value={null} onChange={vi.fn()} />,
    );
    const input = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    expect(input.accept).toContain("image/svg+xml");
    expect(input.accept).toContain("image/png");
  });

  it("uses a raster-only accept list for non-sponsor kinds", () => {
    const { container } = render(
      <MediaUploader kind="news" value={null} onChange={vi.fn()} />,
    );
    const input = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    expect(input.accept).not.toContain("image/svg+xml");
    expect(input.accept).toContain("image/webp");
  });
});
