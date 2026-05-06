import { describe, it, expect, vi, afterEach } from "vitest";
import { act, fireEvent, render } from "@testing-library/react";
import Gallery from "./Gallery";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function makeMatchMedia(matches: boolean) {
  return vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => false),
  }));
}

function child(i: number) {
  return (
    <div key={i} className="kid" style={{ width: 100, height: 80 }}>
      kid-{i}
    </div>
  );
}

function setRect(
  el: HTMLElement,
  rect: Partial<DOMRect> & { width: number; height: number },
) {
  Object.defineProperty(el, "getBoundingClientRect", {
    value: () =>
      ({
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        right: rect.width,
        bottom: rect.height,
        toJSON() {
          return {};
        },
        ...rect,
      }) as DOMRect,
    configurable: true,
  });
}

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

describe("Gallery", () => {
  it("renders the header, the children, and the prev/next overlay buttons", () => {
    vi.stubGlobal("matchMedia", makeMatchMedia(false));
    const { container } = render(
      <Gallery
        headerTitle="DEMO"
        childrenClassName="kid"
        classPrefix="x"
        numberOfItemsInViewport={2}
      >
        {[child(1), child(2), child(3)]}
      </Gallery>,
    );
    expect(container.textContent).toContain("DEMO");
    expect(container.querySelectorAll(".kid").length).toBe(3);
    expect(container.querySelector(".xNextButton")).not.toBeNull();
    expect(container.querySelector(".xPrevButton")).not.toBeNull();
    // ARIA labels surface on the icon buttons.
    expect(container.querySelector("[aria-label='Next']")).not.toBeNull();
    expect(container.querySelector("[aria-label='Previous']")).not.toBeNull();
  });

  it("does not wire up scroll behaviour below the lg breakpoint", () => {
    vi.stubGlobal("matchMedia", makeMatchMedia(false));
    let observed = false;
    class StubRO {
      observe() {
        observed = true;
      }
      unobserve() {}
      disconnect() {}
    }
    vi.stubGlobal("ResizeObserver", StubRO);
    render(
      <Gallery
        headerTitle="DEMO"
        childrenClassName="kid"
        classPrefix="x"
        numberOfItemsInViewport={2}
      >
        {[child(1)]}
      </Gallery>,
    );
    expect(observed).toBe(false);
  });

  it("at the lg breakpoint, advances scrollLeft by pageWidth on next-click and rewinds on prev-click, hiding/showing the buttons accordingly", () => {
    vi.stubGlobal("matchMedia", makeMatchMedia(true));
    let roCb: () => void = () => {};
    class StubRO {
      constructor(cb: () => void) {
        roCb = cb;
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    vi.stubGlobal("ResizeObserver", StubRO);

    const { container } = render(
      <Gallery
        headerTitle="DEMO"
        childrenClassName="kid"
        classPrefix="x"
        numberOfItemsInViewport={2}
      >
        {[child(1), child(2), child(3), child(4), child(5)]}
      </Gallery>,
    );

    const scroller = container.querySelector(
      ".galleryContainer",
    ) as HTMLDivElement;
    const next = container.querySelector(".xNextButton") as HTMLDivElement;
    const prev = container.querySelector(".xPrevButton") as HTMLDivElement;

    // Make the scroller "wide enough to scroll" with a 200px content width and
    // a 100px viewport. pageWidth = childWidth(100) * itemsInViewport(2) = 200.
    setRect(scroller, { width: 100, height: 50 });
    Object.defineProperty(scroller, "scrollWidth", {
      configurable: true,
      value: 1000,
    });
    Object.defineProperty(scroller, "clientWidth", {
      configurable: true,
      value: 100,
    });
    defineSettable(scroller, "scrollLeft", 0);
    const kid = scroller.querySelector(".kid") as HTMLElement;
    setRect(kid, { width: 100, height: 80 });

    // Trigger a ResizeObserver callback so sizeButtons + checkButtons run with
    // the geometry we just set up.
    act(() => {
      roCb();
    });
    // Buttons get a height matching the scroller.
    expect(next.style.height).toBe("50px");
    expect(prev.style.height).toBe("50px");
    // At scrollLeft=0 the prev button is hidden, next is visible.
    expect(prev.style.display).toBe("none");
    expect(next.style.display).toBe("");

    // Clicking next advances scrollLeft by pageWidth (200).
    act(() => {
      fireEvent.click(next);
    });
    expect(scroller.scrollLeft).toBe(200);
    // Now prev should re-appear.
    expect(prev.style.display).toBe("");

    // Clicking prev rewinds.
    act(() => {
      fireEvent.click(prev);
    });
    expect(scroller.scrollLeft).toBe(0);
    expect(prev.style.display).toBe("none");
  });

  it("hides the next button once we've scrolled to the end", () => {
    vi.stubGlobal("matchMedia", makeMatchMedia(true));
    let roCb: () => void = () => {};
    class StubRO {
      constructor(cb: () => void) {
        roCb = cb;
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    vi.stubGlobal("ResizeObserver", StubRO);

    const { container } = render(
      <Gallery
        headerTitle="DEMO"
        childrenClassName="kid"
        classPrefix="x"
        numberOfItemsInViewport={2}
      >
        {[child(1), child(2)]}
      </Gallery>,
    );
    const scroller = container.querySelector(
      ".galleryContainer",
    ) as HTMLDivElement;
    const next = container.querySelector(".xNextButton") as HTMLDivElement;

    setRect(scroller, { width: 200, height: 60 });
    // Already scrolled to the right edge: scrollWidth - clientWidth == 0.
    Object.defineProperty(scroller, "scrollWidth", {
      configurable: true,
      value: 200,
    });
    Object.defineProperty(scroller, "clientWidth", {
      configurable: true,
      value: 200,
    });
    defineSettable(scroller, "scrollLeft", 0);
    const kid = scroller.querySelector(".kid") as HTMLElement;
    setRect(kid, { width: 100, height: 80 });

    act(() => {
      roCb();
    });
    // val (0) >= scrollWidth - clientWidth (0): next is hidden.
    expect(next.style.display).toBe("none");
  });

  it("scroll events flow through checkButtons via the user-driven scroll handler", () => {
    vi.stubGlobal("matchMedia", makeMatchMedia(true));
    class StubRO {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    vi.stubGlobal("ResizeObserver", StubRO);

    const { container } = render(
      <Gallery
        headerTitle="DEMO"
        childrenClassName="kid"
        classPrefix="x"
        numberOfItemsInViewport={2}
      >
        {[child(1), child(2), child(3)]}
      </Gallery>,
    );
    const scroller = container.querySelector(
      ".galleryContainer",
    ) as HTMLDivElement;
    const prev = container.querySelector(".xPrevButton") as HTMLDivElement;
    const next = container.querySelector(".xNextButton") as HTMLDivElement;

    Object.defineProperty(scroller, "scrollWidth", {
      configurable: true,
      value: 1000,
    });
    Object.defineProperty(scroller, "clientWidth", {
      configurable: true,
      value: 200,
    });
    defineSettable(scroller, "scrollLeft", 50);

    act(() => {
      fireEvent.scroll(scroller);
    });
    // Mid-scroll: both buttons stay visible (display === "").
    expect(prev.style.display).toBe("");
    expect(next.style.display).toBe("");
  });

  it("disconnects the ResizeObserver on unmount", () => {
    vi.stubGlobal("matchMedia", makeMatchMedia(true));
    const disconnect = vi.fn();
    class StubRO {
      observe() {}
      unobserve() {}
      disconnect() {
        disconnect();
      }
    }
    vi.stubGlobal("ResizeObserver", StubRO);
    const { unmount } = render(
      <Gallery
        headerTitle="DEMO"
        childrenClassName="kid"
        classPrefix="x"
        numberOfItemsInViewport={2}
      >
        {[child(1)]}
      </Gallery>,
    );
    unmount();
    expect(disconnect).toHaveBeenCalledTimes(1);
  });
});
