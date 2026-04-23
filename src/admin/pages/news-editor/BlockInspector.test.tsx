import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import BlockInspector from "./BlockInspector";

describe("BlockInspector", () => {
  it("shows the neutral hint when no block is selected", () => {
    render(<BlockInspector block={null} onUpdate={() => {}} />);
    expect(screen.getByText(/Block anklicken/)).toBeTruthy();
    expect(screen.queryByTestId("block-inspector")).toBeNull();
  });

  it("shows the kind of the selected block", () => {
    render(
      <BlockInspector
        block={{ kind: "paragraph", text: "" }}
        onUpdate={() => {}}
      />,
    );
    expect(screen.getByTestId("inspector-kind").textContent).toBe("paragraph");
  });

  it("offers heading level buttons that call onUpdate with the chosen level", () => {
    const onUpdate = vi.fn();
    render(
      <BlockInspector
        block={{ kind: "heading", level: 2, text: "" }}
        onUpdate={onUpdate}
      />,
    );
    fireEvent.click(screen.getByTestId("inspector-heading-level-3"));
    expect(onUpdate).toHaveBeenCalledWith({ level: 3 });
  });

  it("offers callout tone buttons that call onUpdate with the chosen tone", () => {
    const onUpdate = vi.fn();
    render(
      <BlockInspector
        block={{ kind: "callout", tone: "primary", text: "" }}
        onUpdate={onUpdate}
      />,
    );
    fireEvent.click(screen.getByTestId("inspector-callout-tone-warn"));
    expect(onUpdate).toHaveBeenCalledWith({ tone: "warn" });
  });

  it("does not render level controls for non-heading blocks", () => {
    render(
      <BlockInspector
        block={{ kind: "paragraph", text: "" }}
        onUpdate={() => {}}
      />,
    );
    expect(screen.queryByTestId("inspector-heading-level-1")).toBeNull();
  });

  it("does not render tone controls for non-callout blocks", () => {
    render(
      <BlockInspector
        block={{ kind: "paragraph", text: "" }}
        onUpdate={() => {}}
      />,
    );
    expect(screen.queryByTestId("inspector-callout-tone-primary")).toBeNull();
  });
});
