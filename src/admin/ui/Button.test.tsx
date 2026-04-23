import { describe, expect, it, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { Button } from "./Button";
import type { ButtonKind, ButtonSize } from "./Button";

describe("Button", () => {
  it("renders children", () => {
    const { getByRole } = render(<Button>Speichern</Button>);
    expect(getByRole("button").textContent).toBe("Speichern");
  });

  it("defaults to type=button to avoid accidental form submits", () => {
    const { getByRole } = render(<Button>x</Button>);
    expect(getByRole("button").getAttribute("type")).toBe("button");
  });

  it("honors an explicit type=submit", () => {
    const { getByRole } = render(<Button type="submit">x</Button>);
    expect(getByRole("button").getAttribute("type")).toBe("submit");
  });

  describe.each<ButtonKind>(["primary", "ghost", "accent", "danger"])(
    "kind=%s",
    (kind) => {
      it("applies the matching btn-* class", () => {
        const { getByRole } = render(<Button kind={kind}>x</Button>);
        expect(getByRole("button").className).toContain(`btn-${kind}`);
        expect(getByRole("button").getAttribute("data-kind")).toBe(kind);
      });
    },
  );

  describe.each<ButtonSize>(["sm", "md", "lg"])("size=%s", (size) => {
    it("marks size via data-size", () => {
      const { getByRole } = render(<Button size={size}>x</Button>);
      expect(getByRole("button").getAttribute("data-size")).toBe(size);
    });
  });

  it("renders leading and trailing slots around the label", () => {
    const { container } = render(
      <Button
        leading={<span data-testid="l">L</span>}
        trailing={<span data-testid="t">T</span>}
      >
        mid
      </Button>,
    );
    const btn = container.querySelector("button")!;
    const kids = Array.from(btn.children);
    expect(kids[0].getAttribute("data-testid")).toBe("l");
    expect(kids[kids.length - 1].getAttribute("data-testid")).toBe("t");
    expect(btn.textContent).toContain("mid");
  });

  it("calls onClick", () => {
    const onClick = vi.fn();
    const { getByRole } = render(<Button onClick={onClick}>x</Button>);
    fireEvent.click(getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("honors disabled", () => {
    const onClick = vi.fn();
    const { getByRole } = render(
      <Button onClick={onClick} disabled>
        x
      </Button>,
    );
    const btn = getByRole("button") as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("merges user className alongside the kind class", () => {
    const { getByRole } = render(
      <Button kind="primary" className="w-full">
        x
      </Button>,
    );
    const cls = getByRole("button").className;
    expect(cls).toContain("btn-primary");
    expect(cls).toContain("w-full");
  });

  it("forwards arbitrary props like aria-label", () => {
    const { getByRole } = render(<Button aria-label="Löschen">x</Button>);
    expect(getByRole("button").getAttribute("aria-label")).toBe("Löschen");
  });
});
