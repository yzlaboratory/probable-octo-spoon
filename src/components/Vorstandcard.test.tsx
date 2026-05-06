import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import Vorstandcard from "./Vorstandcard";

describe("Vorstandcard", () => {
  it("renders portrait, name, role, mailto, and tel links with phone whitespace stripped", () => {
    const { container, getByText, getByAltText } = render(
      <Vorstandcard
        name="Max Mustermann"
        title="1. Vorsitzender"
        mail="max@example.com"
        phone="0151 2222 8048"
        imageSrc="/portrait.jpg"
      />,
    );

    expect(getByText("Max Mustermann")).toBeInTheDocument();
    expect(getByText("1. Vorsitzender")).toBeInTheDocument();
    const portrait = getByAltText("Portrait") as HTMLImageElement;
    expect(portrait.getAttribute("src")).toBe("/portrait.jpg");

    const mailto = container.querySelector("a[href^='mailto:']")!;
    expect(mailto.getAttribute("href")).toBe("mailto:max@example.com");

    const tel = container.querySelector("a[href^='tel:']")!;
    // Whitespace must be removed in href but preserved in label.
    expect(tel.getAttribute("href")).toBe("tel:015122228048");
    expect(tel.textContent).toContain("0151 2222 8048");
  });
});
