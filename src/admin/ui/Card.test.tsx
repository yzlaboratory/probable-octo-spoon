import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { Card } from "./Card";

describe("Card", () => {
  it("renders children inside a div by default", () => {
    const { container, getByText } = render(<Card>content</Card>);
    expect(container.firstElementChild?.tagName).toBe("DIV");
    expect(getByText("content")).toBeInTheDocument();
  });

  it("applies padding by default", () => {
    const { container } = render(<Card>x</Card>);
    expect(container.firstElementChild?.className).toContain("p-5");
  });

  it("omits padding when padded=false", () => {
    const { container } = render(<Card padded={false}>x</Card>);
    expect(container.firstElementChild?.className).not.toContain("p-5");
  });

  it("merges a custom className alongside the base cs-card class", () => {
    const { container } = render(<Card className="mt-4 border-red-500">x</Card>);
    const cls = container.firstElementChild?.className ?? "";
    expect(cls).toContain("cs-card");
    expect(cls).toContain("mt-4");
    expect(cls).toContain("border-red-500");
  });

  it("honors the as prop to render a different element", () => {
    const { container } = render(<Card as="section">x</Card>);
    expect(container.firstElementChild?.tagName).toBe("SECTION");
  });

  it("forwards inline style", () => {
    const { container } = render(<Card style={{ width: 320 }}>x</Card>);
    expect((container.firstElementChild as HTMLElement).style.width).toBe("320px");
  });

  it("renders an empty card without crashing", () => {
    const { container } = render(<Card>{null}</Card>);
    expect(container.firstElementChild).not.toBeNull();
  });
});
