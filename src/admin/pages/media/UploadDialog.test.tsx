import { describe, it, expect, vi, afterEach } from "vitest";
import { fireEvent, render, waitFor } from "@testing-library/react";
import { UploadDialog } from "./UploadDialog";
import { api, ApiError } from "../../api";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("UploadDialog", () => {
  it("renders nothing when open=false", () => {
    const { container } = render(
      <UploadDialog
        open={false}
        onClose={vi.fn()}
        onUploaded={vi.fn()}
      />,
    );
    expect(container.querySelector("[role='dialog']")).toBeNull();
  });

  it("shows the kind selector by default and the locked variant when lockKind=true", () => {
    const { rerender, queryByTestId } = render(
      <UploadDialog open={true} onClose={vi.fn()} onUploaded={vi.fn()} />,
    );
    expect(queryByTestId("upload-kind-news")).not.toBeNull();
    rerender(
      <UploadDialog
        open={true}
        onClose={vi.fn()}
        onUploaded={vi.fn()}
        lockKind
        initialKind="sponsor"
      />,
    );
    expect(queryByTestId("upload-kind-news")).toBeNull();
  });

  it("flips kind when a different radio is selected", () => {
    const { getByTestId } = render(
      <UploadDialog open={true} onClose={vi.fn()} onUploaded={vi.fn()} />,
    );
    const sponsor = getByTestId("upload-kind-sponsor") as HTMLInputElement;
    fireEvent.click(sponsor);
    expect(sponsor.checked).toBe(true);
  });

  it("captures the file via input.onChange (covers the optional-chain fallback)", () => {
    const { getByTestId } = render(
      <UploadDialog open={true} onClose={vi.fn()} onUploaded={vi.fn()} />,
    );
    const input = getByTestId("upload-file") as HTMLInputElement;
    const file = new File(["x"], "x.jpg", { type: "image/jpeg" });
    Object.defineProperty(input, "files", {
      configurable: true,
      value: [file],
    });
    fireEvent.change(input);
    // Reset to no files via the configurable redefine to drive the `?? null` branch.
    Object.defineProperty(input, "files", { configurable: true, value: [] });
    fireEvent.change(input);
  });

  it("shows 'Bitte eine Datei auswählen.' when submitted without a file", async () => {
    const { container, findByText } = render(
      <UploadDialog open={true} onClose={vi.fn()} onUploaded={vi.fn()} />,
    );
    fireEvent.submit(container.querySelector("form")!);
    await findByText("Bitte eine Datei auswählen.");
  });

  it("uploads the selected file, calls onUploaded with the response, and closes the dialog", async () => {
    const onUploaded = vi.fn();
    const onClose = vi.fn();
    vi.spyOn(api, "upload").mockResolvedValue({ id: 7 } as never);

    const { getByTestId, container } = render(
      <UploadDialog open={true} onClose={onClose} onUploaded={onUploaded} />,
    );
    const input = getByTestId("upload-file") as HTMLInputElement;
    const file = new File(["x"], "x.jpg", { type: "image/jpeg" });
    Object.defineProperty(input, "files", { value: [file] });
    fireEvent.change(input);
    fireEvent.submit(container.querySelector("form")!);

    await waitFor(() => expect(onUploaded).toHaveBeenCalledWith({ id: 7 }));
    expect(onClose).toHaveBeenCalled();
  });

  it("shows the ApiError message inline on a failed upload", async () => {
    vi.spyOn(api, "upload").mockRejectedValue(
      new ApiError(413, { code: "media/too-large", message: "Datei zu groß" }),
    );
    const { getByTestId, container, findByText } = render(
      <UploadDialog open={true} onClose={vi.fn()} onUploaded={vi.fn()} />,
    );
    const input = getByTestId("upload-file") as HTMLInputElement;
    Object.defineProperty(input, "files", {
      value: [new File(["x"], "x.jpg", { type: "image/jpeg" })],
    });
    fireEvent.change(input);
    fireEvent.submit(container.querySelector("form")!);
    await findByText("Datei zu groß");
  });

  it("falls back to a generic message for non-ApiError upload failures", async () => {
    vi.spyOn(api, "upload").mockRejectedValue(new Error("network down"));
    const { getByTestId, container, findByText } = render(
      <UploadDialog open={true} onClose={vi.fn()} onUploaded={vi.fn()} />,
    );
    const input = getByTestId("upload-file") as HTMLInputElement;
    Object.defineProperty(input, "files", {
      value: [new File(["x"], "x.jpg", { type: "image/jpeg" })],
    });
    fireEvent.change(input);
    fireEvent.submit(container.querySelector("form")!);
    await findByText("Upload fehlgeschlagen.");
  });

  it("closes when Escape is pressed (covers the keydown listener)", () => {
    const onClose = vi.fn();
    render(
      <UploadDialog open={true} onClose={onClose} onUploaded={vi.fn()} />,
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("ignores other key presses", () => {
    const onClose = vi.fn();
    render(
      <UploadDialog open={true} onClose={onClose} onUploaded={vi.fn()} />,
    );
    fireEvent.keyDown(window, { key: "a" });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("removes the keydown listener on unmount", () => {
    const onClose = vi.fn();
    const { unmount } = render(
      <UploadDialog open={true} onClose={onClose} onUploaded={vi.fn()} />,
    );
    unmount();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes when the backdrop is clicked but not when the panel is clicked", () => {
    const onClose = vi.fn();
    const { getByTestId } = render(
      <UploadDialog open={true} onClose={onClose} onUploaded={vi.fn()} />,
    );
    const backdrop = getByTestId("media-upload-dialog");
    // Click directly on the backdrop (target === currentTarget): closes.
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
    // Click bubbles up from a child — should NOT close.
    onClose.mockClear();
    const inner = backdrop.querySelector("h2")!;
    fireEvent.click(inner);
    expect(onClose).not.toHaveBeenCalled();
  });
});
