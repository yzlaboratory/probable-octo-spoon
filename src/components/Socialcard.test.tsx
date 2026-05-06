import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import Socialcard from "./Socialcard";

const baseProps = {
  caption: "hello world",
  timestamp: "2025-04-01T10:00:00Z",
  permalink: "https://instagram.test/p/abc",
  productType: "FEED",
};

describe("Socialcard", () => {
  it("renders an <img> media slot when type is IMAGE", () => {
    const { container } = render(
      <Socialcard
        {...baseProps}
        imageUrl="/single.jpg"
        type="IMAGE"
      />,
    );
    const img = container.querySelector("img[alt='Portrait']") as HTMLImageElement | null;
    expect(img).not.toBeNull();
    expect(img!.getAttribute("src")).toBe("/single.jpg");
    expect(container.querySelector("video")).toBeNull();
    expect(container.querySelector(".ig_gallery")).toBeNull();
  });

  it("renders a <video> media slot when type is VIDEO", () => {
    const { container } = render(
      <Socialcard
        {...baseProps}
        imageUrl="/clip.mp4"
        type="VIDEO"
      />,
    );
    const video = container.querySelector("video") as HTMLVideoElement | null;
    expect(video).not.toBeNull();
    const source = video!.querySelector("source");
    expect(source!.getAttribute("src")).toBe("/clip.mp4");
    expect(container.querySelector("img[alt='Portrait']")).toBeNull();
  });

  it("renders a carousel gallery with one tile per child for CAROUSEL_ALBUM, covering IMAGE / VIDEO / unknown branches", () => {
    const { container } = render(
      <Socialcard
        {...baseProps}
        imageUrl="/cover.jpg"
        type="CAROUSEL_ALBUM"
        children={{
          data: [
            { media_url: "/c1.jpg", media_type: "IMAGE" },
            { media_url: "/c2.mp4", media_type: "VIDEO" },
            { media_url: "/c3.bin", media_type: "UNKNOWN" },
          ],
        }}
      />,
    );
    const gallery = container.querySelector(".ig_gallery")!;
    expect(gallery).not.toBeNull();
    // IMAGE child
    expect(gallery.querySelector("img[src='/c1.jpg']")).not.toBeNull();
    // VIDEO child
    expect(gallery.querySelector("video source[src='/c2.mp4']")).not.toBeNull();
    // Unknown child renders as an empty <div /> placeholder; total children = 3.
    expect(gallery.children.length).toBe(3);
  });

  it("does not render a carousel when CAROUSEL_ALBUM is given without children", () => {
    const { container } = render(
      <Socialcard
        {...baseProps}
        imageUrl="/x.jpg"
        type="CAROUSEL_ALBUM"
      />,
    );
    expect(container.querySelector(".ig_gallery")).toBeNull();
  });

  it("renders no media slot for an unsupported type", () => {
    const { container } = render(
      <Socialcard
        {...baseProps}
        imageUrl="/x.jpg"
        type="REEL"
      />,
    );
    const aspectBox = container.querySelector(".aspect-\\[100\\/56\\]");
    expect(aspectBox).not.toBeNull();
    expect(aspectBox!.children.length).toBe(0);
  });

  it("formats the timestamp as a locale date and exposes the permalink href", () => {
    const { container } = render(
      <Socialcard
        {...baseProps}
        imageUrl="/x.jpg"
        type="IMAGE"
      />,
    );
    const a = container.querySelector("a")!;
    expect(a.getAttribute("href")).toBe("https://instagram.test/p/abc");
    expect(a.getAttribute("target")).toBe("_blank");
    expect(a.getAttribute("rel")).toBe("noopener noreferrer");
    // `caption` text appears in the body.
    expect(container.textContent).toContain("hello world");
    // Date string contains a 4-digit year — locale-agnostic check.
    expect(container.textContent).toMatch(/2025/);
  });
});
