import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { Check, Icons, Plus, Wordmark, X } from "./Icons";
import type { IconName } from "./Icons";

describe("Icons", () => {
  it("exports all 33 prototype icons", () => {
    const expected: IconName[] = [
      "Dashboard", "News", "Sponsors", "Vorstand", "Media", "Schedule",
      "Settings", "Search", "Plus", "Arrow", "Chevron", "Down", "Eye", "EyeOff",
      "Calendar", "Tag", "Drag", "Check", "X", "Bold", "Italic", "Link", "Image",
      "Heading", "List", "External", "Upload", "Bell", "Trash", "Star", "Sliders",
      "Globe", "Menu",
    ];
    expect(Object.keys(Icons).sort()).toEqual([...expected].sort());
  });

  describe("rendering", () => {
    it("renders an svg with the canonical 24×24 viewBox", () => {
      const { container } = render(<Plus />);
      const svg = container.querySelector("svg");
      expect(svg).not.toBeNull();
      expect(svg?.getAttribute("viewBox")).toBe("0 0 24 24");
    });

    it("applies the default stroke width of 1.5", () => {
      const { container } = render(<Check />);
      expect(container.querySelector("svg")?.getAttribute("stroke-width")).toBe("1.5");
    });

    it("uses currentColor as the default stroke so color flows from CSS", () => {
      const { container } = render(<X />);
      expect(container.querySelector("svg")?.getAttribute("stroke")).toBe("currentColor");
    });
  });

  describe("props", () => {
    it("honors size", () => {
      const { container } = render(<Plus size={24} />);
      const svg = container.querySelector("svg");
      expect(svg?.getAttribute("width")).toBe("24");
      expect(svg?.getAttribute("height")).toBe("24");
    });

    it("honors a custom stroke color", () => {
      const { container } = render(<Plus stroke="#ff0000" />);
      expect(container.querySelector("svg")?.getAttribute("stroke")).toBe("#ff0000");
    });

    it("honors a custom stroke width via sw", () => {
      const { container } = render(<Plus sw={3} />);
      expect(container.querySelector("svg")?.getAttribute("stroke-width")).toBe("3");
    });

    it("forwards arbitrary className", () => {
      const { container } = render(<Plus className="nav-icon text-red-500" />);
      expect(container.querySelector("svg")?.getAttribute("class")).toBe(
        "nav-icon text-red-500",
      );
    });

    it("forwards aria attributes for accessibility", () => {
      const { container } = render(<Plus aria-label="Hinzufügen" role="img" />);
      const svg = container.querySelector("svg");
      expect(svg?.getAttribute("aria-label")).toBe("Hinzufügen");
      expect(svg?.getAttribute("role")).toBe("img");
    });
  });

  describe("edge cases", () => {
    it("accepts size=0 without collapsing to the default", () => {
      const { container } = render(<Plus size={0} />);
      expect(container.querySelector("svg")?.getAttribute("width")).toBe("0");
    });

    it("accepts string size for responsive usage", () => {
      const { container } = render(<Plus size="1em" />);
      expect(container.querySelector("svg")?.getAttribute("width")).toBe("1em");
    });

    it("produces non-empty path contents for every icon in the set", () => {
      for (const [name, Component] of Object.entries(Icons)) {
        const { container } = render(<Component />);
        const svg = container.querySelector("svg");
        expect(svg, `${name} should render an svg`).not.toBeNull();
        expect(
          svg!.children.length,
          `${name} should render at least one child shape`,
        ).toBeGreaterThan(0);
      }
    });
  });
});

describe("Wordmark", () => {
  it("renders the default 'club·soft' label", () => {
    const { getByText } = render(<Wordmark />);
    expect(getByText("club")).toBeInTheDocument();
    expect(getByText("soft")).toBeInTheDocument();
  });

  it("accepts a custom label for the tenant club", () => {
    const { getByText } = render(<Wordmark label="SV Alemannia" />);
    expect(getByText("SV Alemannia")).toBeInTheDocument();
  });

  it("honors size on the glyph", () => {
    const { container } = render(<Wordmark size={40} />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("width")).toBe("40");
  });

  it("applies a custom accent color to the separator", () => {
    const { container } = render(<Wordmark accent="#ff00aa" />);
    const accentSpan = Array.from(container.querySelectorAll("span")).find(
      (el) => el.textContent === "·" || el.textContent === "·",
    );
    expect(accentSpan).toBeDefined();
    expect(accentSpan!.getAttribute("style")).toMatch(/#ff00aa|rgb\(255,\s*0,\s*170\)/);
  });
});
