import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import BlockBody from "./BlockBody";
import type { Media, NewsBlock } from "../../types";

function media(over?: Partial<Media>): Media {
  return {
    id: 1,
    mimeType: "image/jpeg",
    variants: {},
    ...over,
  } as Media;
}

describe("BlockBody — heading block", () => {
  it("renders the H1 placeholder + emits text patches via onUpdate", () => {
    const onUpdate = vi.fn();
    const block: NewsBlock = { kind: "heading", level: 1, text: "Hallo" };
    const { getByPlaceholderText } = render(
      <BlockBody block={block} onUpdate={onUpdate} />,
    );
    const ta = getByPlaceholderText("Überschrift H1…") as HTMLTextAreaElement;
    expect(ta.value).toBe("Hallo");
    fireEvent.change(ta, { target: { value: "Neue Überschrift" } });
    expect(onUpdate).toHaveBeenCalledWith({ text: "Neue Überschrift" });
  });

  it("uses the H2 placeholder for level 2", () => {
    const block: NewsBlock = { kind: "heading", level: 2, text: "" };
    const { getByPlaceholderText } = render(
      <BlockBody block={block} onUpdate={() => {}} />,
    );
    expect(getByPlaceholderText("Überschrift H2…")).toBeTruthy();
  });

  it("uses the H3 placeholder for level 3", () => {
    const block: NewsBlock = { kind: "heading", level: 3, text: "" };
    const { getByPlaceholderText } = render(
      <BlockBody block={block} onUpdate={() => {}} />,
    );
    expect(getByPlaceholderText("Überschrift H3…")).toBeTruthy();
  });
});

describe("BlockBody — text blocks", () => {
  it("renders the lead block with its placeholder + onUpdate hook", () => {
    const onUpdate = vi.fn();
    const block: NewsBlock = { kind: "lead", text: "Lead-Text" };
    const { getByPlaceholderText } = render(
      <BlockBody block={block} onUpdate={onUpdate} />,
    );
    const ta = getByPlaceholderText("Einleitungstext…") as HTMLTextAreaElement;
    expect(ta.value).toBe("Lead-Text");
    fireEvent.change(ta, { target: { value: "neu" } });
    expect(onUpdate).toHaveBeenCalledWith({ text: "neu" });
  });

  it("renders the paragraph block with its placeholder + onUpdate hook", () => {
    const onUpdate = vi.fn();
    const block: NewsBlock = { kind: "paragraph", text: "Absatztext" };
    const { getByPlaceholderText } = render(
      <BlockBody block={block} onUpdate={onUpdate} />,
    );
    const ta = getByPlaceholderText("Absatz…") as HTMLTextAreaElement;
    expect(ta.value).toBe("Absatztext");
    fireEvent.change(ta, { target: { value: "neuer Absatz" } });
    expect(onUpdate).toHaveBeenCalledWith({ text: "neuer Absatz" });
  });
});

describe("BlockBody — quote block", () => {
  it("emits text patches from the quote textarea", () => {
    const onUpdate = vi.fn();
    const block: NewsBlock = { kind: "quote", text: "Zitat", attr: "Goethe" };
    const { getByPlaceholderText } = render(
      <BlockBody block={block} onUpdate={onUpdate} />,
    );
    fireEvent.change(getByPlaceholderText("Zitat…"), {
      target: { value: "neues Zitat" },
    });
    expect(onUpdate).toHaveBeenCalledWith({ text: "neues Zitat" });
  });

  it("emits attr patches from the attribution input", () => {
    const onUpdate = vi.fn();
    const block: NewsBlock = { kind: "quote", text: "Zitat", attr: "Goethe" };
    const { getByPlaceholderText } = render(
      <BlockBody block={block} onUpdate={onUpdate} />,
    );
    fireEvent.change(getByPlaceholderText("Attribution (Name)…"), {
      target: { value: "Schiller" },
    });
    expect(onUpdate).toHaveBeenCalledWith({ attr: "Schiller" });
  });
});

describe("BlockBody — callout block", () => {
  it.each([
    ["primary" as const, "var(--primary)"],
    ["accent" as const, "var(--accent)"],
    ["warn" as const, "var(--warn)"],
  ])(
    "renders the %s tone with its CSS color variable on the bar/border",
    (tone, expectedVar) => {
      const block: NewsBlock = { kind: "callout", tone, text: "Hinweis" };
      const { container } = render(
        <BlockBody block={block} onUpdate={() => {}} />,
      );
      const html = container.innerHTML;
      expect(html).toContain(expectedVar);
    },
  );

  it("emits text patches from the callout textarea", () => {
    const onUpdate = vi.fn();
    const block: NewsBlock = { kind: "callout", tone: "primary", text: "Hi" };
    const { getByPlaceholderText } = render(
      <BlockBody block={block} onUpdate={onUpdate} />,
    );
    fireEvent.change(getByPlaceholderText("Hinweis…"), {
      target: { value: "Achtung!" },
    });
    expect(onUpdate).toHaveBeenCalledWith({ text: "Achtung!" });
  });
});

describe("BlockBody — image block", () => {
  it("renders the empty-state placeholder when there is no resolved media and no srcHint", () => {
    const block: NewsBlock = {
      kind: "image",
      mediaId: null,
      caption: "",
      credit: "",
    };
    const { getByText, container } = render(
      <BlockBody block={block} onUpdate={() => {}} />,
    );
    expect(getByText("Bild aus Mediathek wählen")).toBeTruthy();
    expect(container.querySelector("img")).toBeNull();
  });

  it("prefers the 800w variant when both 800w and 400w are present", () => {
    const block: NewsBlock = {
      kind: "image",
      mediaId: 1,
      caption: "Caption",
      credit: "",
    };
    const { container } = render(
      <BlockBody
        block={block}
        onUpdate={() => {}}
        mediaForId={media({
          variants: { "800w": "/m/800/x.jpg", "400w": "/m/400/x.jpg" },
        })}
      />,
    );
    const img = container.querySelector("img") as HTMLImageElement;
    expect(img).toBeTruthy();
    expect(img.src).toContain("/m/800/x.jpg");
    expect(img.alt).toBe("Caption");
  });

  it("falls back to 400w when 800w is missing", () => {
    const block: NewsBlock = {
      kind: "image",
      mediaId: 2,
      caption: "",
      credit: "",
    };
    const { container } = render(
      <BlockBody
        block={block}
        onUpdate={() => {}}
        mediaForId={media({ variants: { "400w": "/m/400/y.jpg" } })}
      />,
    );
    const img = container.querySelector("img") as HTMLImageElement;
    expect(img.src).toContain("/m/400/y.jpg");
  });

  it("falls back to srcHint when no resolved media variants are available", () => {
    const block: NewsBlock = {
      kind: "image",
      mediaId: null,
      caption: "",
      credit: "",
      srcHint: "/legacy/path.jpg",
    };
    const { container } = render(
      <BlockBody block={block} onUpdate={() => {}} />,
    );
    const img = container.querySelector("img") as HTMLImageElement;
    expect(img.src).toContain("/legacy/path.jpg");
  });

  it("emits caption + credit patches via onUpdate", () => {
    const onUpdate = vi.fn();
    const block: NewsBlock = {
      kind: "image",
      mediaId: null,
      caption: "",
      credit: "",
    };
    const { getByPlaceholderText } = render(
      <BlockBody block={block} onUpdate={onUpdate} />,
    );
    fireEvent.change(getByPlaceholderText("Bildunterschrift…"), {
      target: { value: "Eine Bildunterschrift" },
    });
    expect(onUpdate).toHaveBeenLastCalledWith({
      caption: "Eine Bildunterschrift",
    });
    fireEvent.change(getByPlaceholderText("Bildnachweis…"), {
      target: { value: "Foto: SVA" },
    });
    expect(onUpdate).toHaveBeenLastCalledWith({ credit: "Foto: SVA" });
  });
});

describe("BlockBody — unknown / fallback", () => {
  it("renders nothing for an unknown block kind", () => {
    const block = { kind: "mystery" } as unknown as NewsBlock;
    const { container } = render(
      <BlockBody block={block} onUpdate={() => {}} />,
    );
    expect(container.firstChild).toBeNull();
  });
});
