import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import BlockInsert from "./BlockInsert";

describe("BlockInsert", () => {
  it("shows only the + button when visible=false", () => {
    render(
      <BlockInsert visible={false} onToggle={() => {}} onInsert={() => {}} />,
    );
    expect(screen.getByTestId("block-insert-toggle")).toBeTruthy();
    expect(screen.queryByTestId("block-insert-menu")).toBeNull();
  });

  it("opens the menu with every insertable kind when visible=true", () => {
    render(
      <BlockInsert visible onToggle={() => {}} onInsert={() => {}} />,
    );
    expect(screen.getByTestId("block-insert-menu")).toBeTruthy();
    for (const kind of ["paragraph", "heading", "image", "quote", "callout", "lead"]) {
      expect(screen.getByTestId(`block-insert-${kind}`)).toBeTruthy();
    }
  });

  it("does not expose a stats option (phase 4 scope)", () => {
    render(
      <BlockInsert visible onToggle={() => {}} onInsert={() => {}} />,
    );
    expect(screen.queryByTestId("block-insert-stats")).toBeNull();
  });

  it("calls onInsert with the chosen kind", () => {
    const onInsert = vi.fn();
    render(
      <BlockInsert visible onToggle={() => {}} onInsert={onInsert} />,
    );
    fireEvent.click(screen.getByTestId("block-insert-heading"));
    expect(onInsert).toHaveBeenCalledWith("heading");
  });

  it("calls onToggle when the + button is clicked", () => {
    const onToggle = vi.fn();
    render(
      <BlockInsert visible={false} onToggle={onToggle} onInsert={() => {}} />,
    );
    fireEvent.click(screen.getByTestId("block-insert-toggle"));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
