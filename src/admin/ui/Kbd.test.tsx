import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Kbd } from "./Kbd";

describe("Kbd", () => {
  it("renders its children inside a <kbd> element", () => {
    const { container } = render(<Kbd>Ctrl + S</Kbd>);
    const kbd = container.querySelector("kbd");
    expect(kbd).not.toBeNull();
    expect(kbd!.textContent).toBe("Ctrl + S");
  });
});
