import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { Pill } from "./Pill";
import type { PillTone } from "./Pill";

describe("Pill", () => {
  it("renders the label text", () => {
    const { getByText } = render(<Pill>Entwurf</Pill>);
    expect(getByText("Entwurf")).toBeInTheDocument();
  });

  it("renders with neutral tone by default", () => {
    const { container } = render(<Pill>x</Pill>);
    expect(container.firstElementChild?.getAttribute("data-tone")).toBe("neutral");
  });

  it("includes a leading dot by default", () => {
    const { container } = render(<Pill>x</Pill>);
    expect(container.querySelector(".chip-dot")).not.toBeNull();
  });

  it("omits the dot when dot=false", () => {
    const { container } = render(<Pill dot={false}>x</Pill>);
    expect(container.querySelector(".chip-dot")).toBeNull();
  });

  describe.each<PillTone>(["neutral", "primary", "accent", "warn", "tertiary", "mute"])(
    "tone=%s",
    (tone) => {
      it("marks its tone via data-tone", () => {
        const { container } = render(<Pill tone={tone}>x</Pill>);
        expect(container.firstElementChild?.getAttribute("data-tone")).toBe(tone);
      });
    },
  );

  it("applies the chip class for layout", () => {
    const { container } = render(<Pill>x</Pill>);
    expect(container.firstElementChild?.className).toContain("chip");
  });

  it("merges a user-supplied className", () => {
    const { container } = render(<Pill className="ml-2">x</Pill>);
    const cls = container.firstElementChild?.className ?? "";
    expect(cls).toContain("chip");
    expect(cls).toContain("ml-2");
  });

  it("mute tone gets an explicit border", () => {
    const { container } = render(<Pill tone="mute">x</Pill>);
    const style = (container.firstElementChild as HTMLElement).getAttribute("style") ?? "";
    expect(style).toContain("border");
  });

  it("non-mute tones do not add an explicit border", () => {
    const { container } = render(<Pill tone="primary">x</Pill>);
    const style = (container.firstElementChild as HTMLElement).getAttribute("style") ?? "";
    expect(style).not.toContain("border:");
  });
});
