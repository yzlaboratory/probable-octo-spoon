import { describe, it, expect, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import MetadataPanel from "./MetadataPanel";

describe("MetadataPanel", () => {
  it("renders the default preset chips and highlights the active tag", () => {
    const { getByTestId } = render(
      <MetadataPanel
        tag="Jugend"
        onTagChange={() => {}}
        slug="my-slug"
        onSlugChange={() => {}}
      />,
    );
    const active = getByTestId("tag-preset-Jugend") as HTMLButtonElement;
    const inactive = getByTestId("tag-preset-Fußball") as HTMLButtonElement;
    // Active preset takes the primary fill; inactive uses the paper background.
    expect(active.style.background).toBe("var(--primary)");
    expect(inactive.style.background).toBe("var(--paper-3)");
  });

  it("supports a custom tagPresets array, replacing the defaults", () => {
    const { getByTestId, queryByTestId } = render(
      <MetadataPanel
        tag=""
        onTagChange={() => {}}
        slug=""
        onSlugChange={() => {}}
        tagPresets={["Custom"]}
      />,
    );
    expect(getByTestId("tag-preset-Custom")).toBeInTheDocument();
    expect(queryByTestId("tag-preset-Fußball")).toBeNull();
  });

  it("fires onTagChange when a preset is clicked", () => {
    const onTagChange = vi.fn();
    const { getByTestId } = render(
      <MetadataPanel
        tag=""
        onTagChange={onTagChange}
        slug=""
        onSlugChange={() => {}}
      />,
    );
    fireEvent.click(getByTestId("tag-preset-Verein"));
    expect(onTagChange).toHaveBeenCalledWith("Verein");
  });

  it("fires onTagChange when the free-text input changes", () => {
    const onTagChange = vi.fn();
    const { getByTestId } = render(
      <MetadataPanel
        tag=""
        onTagChange={onTagChange}
        slug=""
        onSlugChange={() => {}}
      />,
    );
    const input = getByTestId("metadata-tag-input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Custom Tag" } });
    expect(onTagChange).toHaveBeenCalledWith("Custom Tag");
  });

  it("fires onSlugChange when the slug input changes", () => {
    const onSlugChange = vi.fn();
    const { getByTestId } = render(
      <MetadataPanel
        tag=""
        onTagChange={() => {}}
        slug="hello"
        onSlugChange={onSlugChange}
      />,
    );
    const input = getByTestId("metadata-slug-input") as HTMLInputElement;
    expect(input.value).toBe("hello");
    fireEvent.change(input, { target: { value: "new-slug" } });
    expect(onSlugChange).toHaveBeenCalledWith("new-slug");
  });
});
