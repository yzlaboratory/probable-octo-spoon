import { describe, expect, it, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { createRef } from "react";
import { Input, Textarea } from "./Input";

describe("Input", () => {
  it("renders an input element with the cs-input class", () => {
    const { container } = render(<Input placeholder="Suchen" />);
    const input = container.querySelector("input");
    expect(input?.className).toContain("cs-input");
  });

  it("forwards placeholder", () => {
    const { getByPlaceholderText } = render(<Input placeholder="E-Mail" />);
    expect(getByPlaceholderText("E-Mail")).toBeInTheDocument();
  });

  it("forwards value and onChange", () => {
    const onChange = vi.fn();
    const { container } = render(<Input value="hi" readOnly onChange={onChange} />);
    const input = container.querySelector("input") as HTMLInputElement;
    expect(input.value).toBe("hi");
    fireEvent.change(input, { target: { value: "world" } });
    expect(onChange).toHaveBeenCalled();
  });

  it("forwards refs to the underlying input", () => {
    const ref = createRef<HTMLInputElement>();
    render(<Input ref={ref} />);
    expect(ref.current?.tagName).toBe("INPUT");
  });

  it("honors type=email/password/etc", () => {
    const { container } = render(<Input type="password" />);
    expect(container.querySelector("input")?.getAttribute("type")).toBe("password");
  });

  it("merges user className with cs-input", () => {
    const { container } = render(<Input className="w-48" />);
    const cls = container.querySelector("input")?.className ?? "";
    expect(cls).toContain("cs-input");
    expect(cls).toContain("w-48");
  });

  it("supports required / disabled attrs", () => {
    const { container } = render(<Input required disabled />);
    const input = container.querySelector("input") as HTMLInputElement;
    expect(input.required).toBe(true);
    expect(input.disabled).toBe(true);
  });
});

describe("Textarea", () => {
  it("renders a textarea with cs-input class", () => {
    const { container } = render(<Textarea rows={3} />);
    const ta = container.querySelector("textarea");
    expect(ta).not.toBeNull();
    expect(ta?.className).toContain("cs-input");
    expect(ta?.rows).toBe(3);
  });

  it("forwards refs", () => {
    const ref = createRef<HTMLTextAreaElement>();
    render(<Textarea ref={ref} />);
    expect(ref.current?.tagName).toBe("TEXTAREA");
  });
});
