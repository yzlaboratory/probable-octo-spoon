import { describe, it, expect } from "vitest";
import {
  blockIsEmpty,
  insertAfter,
  keyBlocks,
  moveBlock,
  newBlock,
  removeBlock,
  stripKeys,
  updateBlock,
  wordCount,
} from "./blocks";

describe("newBlock", () => {
  it("returns sensible defaults per kind", () => {
    expect(newBlock("heading")).toEqual({ kind: "heading", level: 2, text: "" });
    expect(newBlock("lead")).toEqual({ kind: "lead", text: "" });
    expect(newBlock("paragraph")).toEqual({ kind: "paragraph", text: "" });
    expect(newBlock("image")).toEqual({
      kind: "image",
      mediaId: null,
      caption: "",
      credit: "",
    });
    expect(newBlock("quote")).toEqual({ kind: "quote", text: "", attr: "" });
    expect(newBlock("callout")).toEqual({
      kind: "callout",
      tone: "primary",
      text: "",
    });
  });
});

describe("keyBlocks / stripKeys", () => {
  it("assigns unique __keys and strips them back to wire shape", () => {
    const raw = [newBlock("heading"), newBlock("paragraph")];
    const keyed = keyBlocks(raw);
    expect(keyed[0].__key).toMatch(/^b\d+-/);
    expect(keyed[0].__key).not.toBe(keyed[1].__key);
    expect(stripKeys(keyed)).toEqual(raw);
  });
});

describe("insertAfter", () => {
  it("inserts directly after the given key", () => {
    const blocks = keyBlocks([
      { kind: "paragraph", text: "a" },
      { kind: "paragraph", text: "c" },
    ]);
    const { next, insertedKey } = insertAfter(blocks, blocks[0].__key, "heading");
    expect(next.map((b) => b.kind)).toEqual(["paragraph", "heading", "paragraph"]);
    expect(next[1].__key).toBe(insertedKey);
  });

  it("appends when afterKey is null or list is empty", () => {
    const r1 = insertAfter([], null, "paragraph");
    expect(r1.next).toHaveLength(1);

    const start = keyBlocks([{ kind: "paragraph", text: "x" }]);
    const r2 = insertAfter(start, null, "heading");
    expect(r2.next.map((b) => b.kind)).toEqual(["paragraph", "heading"]);
  });

  it("appends when afterKey is unknown", () => {
    const blocks = keyBlocks([{ kind: "paragraph", text: "x" }]);
    const { next } = insertAfter(blocks, "does-not-exist", "heading");
    expect(next.map((b) => b.kind)).toEqual(["paragraph", "heading"]);
  });
});

describe("moveBlock", () => {
  const start = keyBlocks([
    { kind: "paragraph", text: "a" },
    { kind: "paragraph", text: "b" },
    { kind: "paragraph", text: "c" },
  ]);

  it("moves down", () => {
    const next = moveBlock(start, start[0].__key, 1);
    expect((next[0] as any).text).toBe("b");
    expect((next[1] as any).text).toBe("a");
  });

  it("moves up", () => {
    const next = moveBlock(start, start[2].__key, -1);
    expect((next[1] as any).text).toBe("c");
    expect((next[2] as any).text).toBe("b");
  });

  it("is a no-op at edges", () => {
    expect(moveBlock(start, start[0].__key, -1)).toEqual(start);
    expect(moveBlock(start, start[2].__key, 1)).toEqual(start);
  });
});

describe("removeBlock / updateBlock", () => {
  const start = keyBlocks([
    { kind: "paragraph", text: "a" },
    { kind: "paragraph", text: "b" },
  ]);

  it("removes by key", () => {
    const next = removeBlock(start, start[0].__key);
    expect(next).toHaveLength(1);
    expect((next[0] as any).text).toBe("b");
  });

  it("updates by key without touching siblings", () => {
    const next = updateBlock(start, start[1].__key, { text: "B!" } as any);
    expect((next[0] as any).text).toBe("a");
    expect((next[1] as any).text).toBe("B!");
  });
});

describe("blockIsEmpty", () => {
  it("treats whitespace-only text as empty", () => {
    expect(blockIsEmpty({ kind: "paragraph", text: "   " })).toBe(true);
    expect(blockIsEmpty({ kind: "paragraph", text: "x" })).toBe(false);
  });

  it("image empty iff no mediaId and no caption/credit", () => {
    expect(
      blockIsEmpty({ kind: "image", mediaId: null, caption: "", credit: "" }),
    ).toBe(true);
    expect(
      blockIsEmpty({ kind: "image", mediaId: 5, caption: "", credit: "" }),
    ).toBe(false);
    expect(
      blockIsEmpty({ kind: "image", mediaId: null, caption: "cap", credit: "" }),
    ).toBe(false);
  });
});

describe("wordCount", () => {
  it("sums words across text-bearing blocks", () => {
    expect(
      wordCount([
        { kind: "heading", level: 2, text: "Zwei Wörter" },
        { kind: "paragraph", text: "drei weitere Wörter" },
      ]),
    ).toBe(5);
  });

  it("counts image caption + credit", () => {
    expect(
      wordCount([
        {
          kind: "image",
          mediaId: 1,
          caption: "ein zwei",
          credit: "drei",
        },
      ]),
    ).toBe(3);
  });

  it("counts quote attribution", () => {
    expect(
      wordCount([{ kind: "quote", text: "zwei Wörter", attr: "Name Nachname" }]),
    ).toBe(4);
  });

  it("returns 0 on empty", () => {
    expect(wordCount([])).toBe(0);
  });
});
