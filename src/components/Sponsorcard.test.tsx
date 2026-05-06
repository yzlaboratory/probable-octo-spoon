import { describe, it, expect, vi, afterEach } from "vitest";
import { act, render } from "@testing-library/react";
import Sponsorcard from "./Sponsorcard";

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

function defineSettable(el: HTMLElement, prop: string, initial: number) {
  let v = initial;
  Object.defineProperty(el, prop, {
    configurable: true,
    get: () => v,
    set: (val: number) => {
      v = val;
    },
  });
}
function defineFixed(el: HTMLElement, prop: string, value: number) {
  Object.defineProperty(el, prop, { configurable: true, value });
}

describe("Sponsorcard", () => {
  it("renders one anchor + image per logo URL with the matching href and target=_blank", () => {
    const { container } = render(
      <Sponsorcard
        imageUrls={["/a.png", "/b.png"]}
        urls={["https://a.test", "https://b.test"]}
        interval={1000}
        lgWidthClass="lg:w-1/4"
      />,
    );
    const anchors = container.querySelectorAll("a");
    expect(anchors.length).toBe(2);
    expect(anchors[0].getAttribute("href")).toBe("https://a.test");
    expect(anchors[0].getAttribute("target")).toBe("_blank");
    expect(anchors[0].getAttribute("rel")).toBe("noopener noreferrer");
    const imgs = container.querySelectorAll("img");
    expect(imgs.length).toBe(2);
    expect(imgs[0].getAttribute("src")).toBe("/a.png");
  });

  it("applies optional backgroundClasses to each image and the containerClassName to the wrapper", () => {
    const { container } = render(
      <Sponsorcard
        imageUrls={["/a.png", "/b.png"]}
        urls={["https://a", "https://b"]}
        interval={1000}
        lgWidthClass="lg:w-1/4"
        backgroundClasses={["bg-red-200", ""]}
        containerClassName="hidden lg:block"
      />,
    );
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toContain("hidden");
    expect(wrapper.className).toContain("lg:block");
    const imgs = container.querySelectorAll("img");
    expect(imgs[0].className).toContain("bg-red-200");
    // Second image had an empty backgroundClass entry — none injected.
    expect(imgs[1].className).not.toContain("bg-red-200");
  });

  it("does not start an interval when animated is falsy", () => {
    vi.useFakeTimers();
    const setSpy = vi.spyOn(globalThis, "setInterval");
    render(
      <Sponsorcard
        imageUrls={["/a.png"]}
        urls={["https://a"]}
        interval={1000}
        lgWidthClass="lg:w-1/4"
      />,
    );
    // No timer registered with our 1000ms interval.
    const ours = setSpy.mock.calls.filter((c) => c[1] === 1000);
    expect(ours.length).toBe(0);
  });

  it("when animated, advances scrollLeft by 0.51*clientWidth on each tick and rewinds at the right edge", () => {
    vi.useFakeTimers();
    const { container, unmount } = render(
      <Sponsorcard
        imageUrls={["/a.png", "/b.png", "/c.png"]}
        urls={["https://a", "https://b", "https://c"]}
        interval={1000}
        lgWidthClass="lg:w-1/4"
        animated
      />,
    );
    const scroller = container.querySelector(
      ".hidescrollbar",
    ) as HTMLDivElement;
    defineFixed(scroller, "scrollWidth", 1000);
    defineFixed(scroller, "clientWidth", 200);
    defineSettable(scroller, "scrollLeft", 10);

    // Tick 1: 10 + 0.51*200 = 112 < maxScroll(800) → advance to 112.
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(scroller.scrollLeft).toBe(10 + 0.51 * 200);

    // Push very close to the right edge so the next tick should reset.
    scroller.scrollLeft = 800;
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(scroller.scrollLeft).toBe(0);

    unmount();
  });

  it("clears its interval on unmount", () => {
    vi.useFakeTimers();
    const setSpy = vi.spyOn(globalThis, "setInterval");
    const clearSpy = vi.spyOn(globalThis, "clearInterval");
    const { unmount } = render(
      <Sponsorcard
        imageUrls={["/a.png"]}
        urls={["https://a"]}
        interval={2000}
        lgWidthClass="lg:w-1/4"
        animated
      />,
    );
    const intervalCalls = setSpy.mock.calls.filter((c) => c[1] === 2000);
    expect(intervalCalls.length).toBeGreaterThanOrEqual(1);
    unmount();
    expect(clearSpy).toHaveBeenCalled();
  });
});
