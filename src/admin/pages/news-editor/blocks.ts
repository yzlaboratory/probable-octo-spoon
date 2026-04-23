import type { NewsBlock, NewsBlockKind } from "../../types";

let seq = 0;
/**
 * Stable client-only key for React list reconciliation. Blocks don't need
 * identifiers on the wire — ordering is positional in the array — so this
 * key never leaves the editor.
 */
export function makeBlockKey(): string {
  seq += 1;
  return `b${seq}-${Math.random().toString(36).slice(2, 7)}`;
}

export type KeyedBlock = NewsBlock & { __key: string };

export function keyBlocks(blocks: NewsBlock[]): KeyedBlock[] {
  return blocks.map((b) => ({ ...b, __key: makeBlockKey() }));
}

export function stripKeys(blocks: KeyedBlock[]): NewsBlock[] {
  return blocks.map(({ __key: _k, ...rest }) => rest as NewsBlock);
}

export function newBlock(kind: NewsBlockKind): NewsBlock {
  switch (kind) {
    case "heading":
      return { kind: "heading", level: 2, text: "" };
    case "lead":
      return { kind: "lead", text: "" };
    case "paragraph":
      return { kind: "paragraph", text: "" };
    case "image":
      return { kind: "image", mediaId: null, caption: "", credit: "" };
    case "quote":
      return { kind: "quote", text: "", attr: "" };
    case "callout":
      return { kind: "callout", tone: "primary", text: "" };
  }
}

/**
 * Insert a new block directly after the one with `afterKey`. If the list is
 * empty or the key isn't found, append to the end.
 */
export function insertAfter(
  blocks: KeyedBlock[],
  afterKey: string | null,
  kind: NewsBlockKind,
): { next: KeyedBlock[]; insertedKey: string } {
  const tpl = newBlock(kind) as KeyedBlock;
  tpl.__key = makeBlockKey();
  if (!afterKey || blocks.length === 0) {
    return { next: [...blocks, tpl], insertedKey: tpl.__key };
  }
  const i = blocks.findIndex((b) => b.__key === afterKey);
  if (i === -1) return { next: [...blocks, tpl], insertedKey: tpl.__key };
  const next = [...blocks];
  next.splice(i + 1, 0, tpl);
  return { next, insertedKey: tpl.__key };
}

export function moveBlock(
  blocks: KeyedBlock[],
  key: string,
  dir: -1 | 1,
): KeyedBlock[] {
  const i = blocks.findIndex((b) => b.__key === key);
  if (i === -1) return blocks;
  const j = i + dir;
  if (j < 0 || j >= blocks.length) return blocks;
  const next = [...blocks];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

export function removeBlock(blocks: KeyedBlock[], key: string): KeyedBlock[] {
  return blocks.filter((b) => b.__key !== key);
}

export function updateBlock(
  blocks: KeyedBlock[],
  key: string,
  patch: Partial<NewsBlock>,
): KeyedBlock[] {
  return blocks.map((b) =>
    b.__key === key ? ({ ...b, ...patch } as KeyedBlock) : b,
  );
}

export function blockIsEmpty(b: NewsBlock): boolean {
  switch (b.kind) {
    case "heading":
    case "lead":
    case "paragraph":
    case "quote":
    case "callout":
      return b.text.trim() === "";
    case "image":
      return b.mediaId === null && !b.caption && !b.credit;
  }
}

/**
 * Word counter used in the editor status bar. Paragraph/heading/lead/quote/
 * callout contribute their text; image blocks count caption + credit.
 */
export function wordCount(blocks: NewsBlock[]): number {
  let total = 0;
  for (const b of blocks) {
    const bits: string[] = [];
    if ("text" in b) bits.push(b.text);
    if (b.kind === "image") bits.push(b.caption, b.credit);
    if (b.kind === "quote") bits.push(b.attr);
    for (const bit of bits) {
      const words = bit.split(/\s+/).filter(Boolean).length;
      total += words;
    }
  }
  return total;
}
