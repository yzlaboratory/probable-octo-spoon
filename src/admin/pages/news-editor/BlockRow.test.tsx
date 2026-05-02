import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import BlockRow from "./BlockRow";

const sampleBlock = { kind: "paragraph" as const, text: "Hallo" };

describe("BlockRow", () => {
  it("renders its children and the kind abbreviation", () => {
    render(
      <BlockRow
        block={sampleBlock}
        active={false}
        onActivate={() => {}}
        onMove={() => {}}
        onRemove={() => {}}
      >
        <span>child</span>
      </BlockRow>,
    );
    expect(screen.getByText("child")).toBeTruthy();
    expect(screen.getByText("par")).toBeTruthy();
  });

  it("marks data-active when active=true", () => {
    const { container } = render(
      <BlockRow
        block={sampleBlock}
        active
        onActivate={() => {}}
        onMove={() => {}}
        onRemove={() => {}}
      >
        <span />
      </BlockRow>,
    );
    const row = container.querySelector("[data-testid=block-row]");
    expect(row?.getAttribute("data-active")).toBe("true");
  });

  it("activates on click", () => {
    const onActivate = vi.fn();
    render(
      <BlockRow
        block={sampleBlock}
        active={false}
        onActivate={onActivate}
        onMove={() => {}}
        onRemove={() => {}}
      >
        <span />
      </BlockRow>,
    );
    fireEvent.click(screen.getByTestId("block-row"));
    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it("calls onMove with -1 / +1 from the handles without triggering activate", () => {
    const onActivate = vi.fn();
    const onMove = vi.fn();
    render(
      <BlockRow
        block={sampleBlock}
        active={false}
        onActivate={onActivate}
        onMove={onMove}
        onRemove={() => {}}
      >
        <span />
      </BlockRow>,
    );
    fireEvent.click(screen.getByTestId("block-move-up"));
    fireEvent.click(screen.getByTestId("block-move-down"));
    expect(onMove).toHaveBeenNthCalledWith(1, -1);
    expect(onMove).toHaveBeenNthCalledWith(2, 1);
    expect(onActivate).not.toHaveBeenCalled();
  });

  it("calls onRemove from the trash handle", () => {
    const onRemove = vi.fn();
    render(
      <BlockRow
        block={sampleBlock}
        active={false}
        onActivate={() => {}}
        onMove={() => {}}
        onRemove={onRemove}
      >
        <span />
      </BlockRow>,
    );
    fireEvent.click(screen.getByTestId("block-remove"));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});
