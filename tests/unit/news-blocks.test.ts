import { describe, it, expect } from "vitest";
// @ts-expect-error — .mjs with no types
import {
  compileBlocksToHtml,
  htmlToBlocks,
  backfillNewsBlocks,
  blocksSchema,
} from "../../server/news-blocks.mjs";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

function freshDb() {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  const schemaDir = path.resolve(__dirname, "../../server/schema");
  for (const file of fs.readdirSync(schemaDir).sort()) {
    if (!file.endsWith(".sql")) continue;
    db.exec(fs.readFileSync(path.join(schemaDir, file), "utf8"));
  }
  return db;
}

describe("compileBlocksToHtml — happy path per kind", () => {
  it("renders heading at levels 1/2/3", () => {
    expect(
      compileBlocksToHtml([
        { kind: "heading", level: 1, text: "Überschrift" },
        { kind: "heading", level: 2, text: "Zwischen" },
        { kind: "heading", level: 3, text: "Klein" },
      ]),
    ).toBe("<h1>Überschrift</h1>\n<h2>Zwischen</h2>\n<h3>Klein</h3>");
  });

  it("renders paragraph preserving newlines as <br>", () => {
    const html = compileBlocksToHtml([
      { kind: "paragraph", text: "erste zeile\nzweite zeile" },
    ]);
    expect(html).toBe("<p>erste zeile<br />zweite zeile</p>");
  });

  it("renders lead paragraph with class", () => {
    const html = compileBlocksToHtml([{ kind: "lead", text: "Einleitung." }]);
    expect(html).toBe('<p class="lead">Einleitung.</p>');
  });

  it("renders quote with attribution", () => {
    const html = compileBlocksToHtml([
      { kind: "quote", text: "Wir bleiben dran.", attr: "J. Schmitt" },
    ]);
    expect(html).toBe(
      "<blockquote>Wir bleiben dran.<cite>J. Schmitt</cite></blockquote>",
    );
  });

  it("renders callout with allowed tones", () => {
    for (const tone of ["primary", "accent", "warn"] as const) {
      const html = compileBlocksToHtml([
        { kind: "callout", tone, text: "Hinweis." },
      ]);
      expect(html).toBe(`<aside class="callout callout-${tone}">Hinweis.</aside>`);
    }
  });

  it("renders image from a mediaId via the mediaById map", () => {
    const mediaById = new Map([
      [
        7,
        {
          variants: { "800w": "/media/7/800w.webp", fallbackJpg: "/media/7/fallback.jpg" },
        },
      ],
    ]);
    const html = compileBlocksToHtml(
      [
        {
          kind: "image",
          mediaId: 7,
          caption: "Jubel",
          credit: "Foto: Keller",
        },
      ],
      mediaById,
    );
    expect(html).toContain('<img src="/media/7/800w.webp" alt="Jubel" />');
    expect(html).toContain("<figcaption>Jubel");
    expect(html).toContain('<span class="credit">Foto: Keller</span>');
  });
});

describe("compileBlocksToHtml — edge cases", () => {
  it("empty blocks array yields empty string", () => {
    expect(compileBlocksToHtml([])).toBe("");
  });

  it("non-array input yields empty string", () => {
    expect(compileBlocksToHtml(null as any)).toBe("");
    expect(compileBlocksToHtml(undefined as any)).toBe("");
    expect(compileBlocksToHtml("oops" as any)).toBe("");
  });

  it("strips unknown block kinds silently", () => {
    const html = compileBlocksToHtml([
      { kind: "paragraph", text: "ok" },
      { kind: "video" as any, src: "x" },
      { kind: "heading", level: 2, text: "weiter" },
    ]);
    expect(html).toBe("<p>ok</p>\n<h2>weiter</h2>");
  });

  it("skips image blocks whose mediaId is missing from the map", () => {
    const html = compileBlocksToHtml(
      [{ kind: "image", mediaId: 99, caption: "x", credit: "" }],
      new Map(),
    );
    expect(html).toBe("");
  });

  it("skips image blocks with null mediaId (not yet picked)", () => {
    const html = compileBlocksToHtml([
      { kind: "image", mediaId: null, caption: "x", credit: "" },
    ]);
    expect(html).toBe("");
  });

  it("escapes HTML-looking text so authors can't smuggle tags", () => {
    const html = compileBlocksToHtml([
      { kind: "paragraph", text: "<script>alert(1)</script>" },
    ]);
    expect(html).not.toMatch(/<script>/i);
    expect(html).toContain("&lt;script&gt;");
  });

  it("unknown callout tone falls back to primary", () => {
    const html = compileBlocksToHtml([
      { kind: "callout", tone: "rainbow" as any, text: "Hm." },
    ]);
    expect(html).toBe('<aside class="callout callout-primary">Hm.</aside>');
  });

  it("empty paragraph renders as empty <p>", () => {
    // Editor allows empty paragraphs mid-authoring; sanitizer keeps the tag.
    const html = compileBlocksToHtml([{ kind: "paragraph", text: "" }]);
    expect(html).toBe("<p></p>");
  });
});

describe("htmlToBlocks — migration from legacy rich-text", () => {
  it("splits heading/paragraph/blockquote in document order", () => {
    const blocks = htmlToBlocks(
      "<h2>Titel</h2><p>Erster Absatz.</p><blockquote>Zitat.</blockquote><p>Letzter.</p>",
    );
    expect(blocks).toEqual([
      { kind: "heading", level: 2, text: "Titel" },
      { kind: "paragraph", text: "Erster Absatz." },
      { kind: "quote", text: "Zitat.", attr: "" },
      { kind: "paragraph", text: "Letzter." },
    ]);
  });

  it("flattens inline formatting inside paragraphs to plain text", () => {
    const blocks = htmlToBlocks(
      '<p>Das ist <strong>fett</strong> und <em>kursiv</em> mit <a href="https://x">Link</a>.</p>',
    );
    expect(blocks).toEqual([
      { kind: "paragraph", text: "Das ist fett und kursiv mit Link." },
    ]);
  });

  it("converts ul to newline-prefixed paragraph", () => {
    const blocks = htmlToBlocks("<ul><li>Eins</li><li>Zwei</li></ul>");
    expect(blocks).toEqual([
      { kind: "paragraph", text: "• Eins\n• Zwei" },
    ]);
  });

  it("converts ol to numbered paragraph", () => {
    const blocks = htmlToBlocks("<ol><li>Eins</li><li>Zwei</li></ol>");
    expect(blocks).toEqual([
      { kind: "paragraph", text: "1. Eins\n2. Zwei" },
    ]);
  });

  it("captures images as image blocks with null mediaId and srcHint", () => {
    const blocks = htmlToBlocks(
      '<p>Intro.</p><img src="/media/3/800w.webp" alt="Jubel"><p>Outro.</p>',
    );
    expect(blocks).toEqual([
      { kind: "paragraph", text: "Intro." },
      {
        kind: "image",
        mediaId: null,
        caption: "Jubel",
        credit: "",
        srcHint: "/media/3/800w.webp",
      },
      { kind: "paragraph", text: "Outro." },
    ]);
  });

  it("treats unknown/plain text as single paragraph", () => {
    const blocks = htmlToBlocks("Einfach nur Text,\nmit Zeilenumbruch.");
    expect(blocks).toEqual([
      { kind: "paragraph", text: "Einfach nur Text,\nmit Zeilenumbruch." },
    ]);
  });

  it("handles empty / whitespace input", () => {
    expect(htmlToBlocks("")).toEqual([]);
    expect(htmlToBlocks("   \n  ")).toEqual([]);
  });

  it("skips empty block elements (does not emit empty paragraphs)", () => {
    const blocks = htmlToBlocks("<p></p><h2></h2><p>Text.</p>");
    expect(blocks).toEqual([{ kind: "paragraph", text: "Text." }]);
  });
});

describe("blocksSchema — zod validation", () => {
  it("accepts a valid mixed article", () => {
    const res = blocksSchema.safeParse([
      { kind: "heading", level: 2, text: "t" },
      { kind: "paragraph", text: "p" },
      { kind: "quote", text: "q", attr: "a" },
      { kind: "callout", tone: "accent", text: "c" },
      { kind: "image", mediaId: 5, caption: "cap", credit: "cr" },
      { kind: "lead", text: "lead" },
    ]);
    expect(res.success).toBe(true);
  });

  it("rejects unknown kind", () => {
    const res = blocksSchema.safeParse([{ kind: "video", url: "x" }]);
    expect(res.success).toBe(false);
  });

  it("rejects heading with level 4", () => {
    const res = blocksSchema.safeParse([
      { kind: "heading", level: 4, text: "x" },
    ]);
    expect(res.success).toBe(false);
  });

  it("rejects paragraph above 4000 chars", () => {
    const res = blocksSchema.safeParse([
      { kind: "paragraph", text: "a".repeat(4001) },
    ]);
    expect(res.success).toBe(false);
  });

  it("caps list length at 200", () => {
    const arr = Array.from({ length: 201 }, () => ({
      kind: "paragraph" as const,
      text: "x",
    }));
    expect(blocksSchema.safeParse(arr).success).toBe(false);
  });
});

describe("backfillNewsBlocks — data migration", () => {
  it("populates blocks_json for rows where it was NULL and leaves populated rows untouched", () => {
    const db = freshDb();
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO news (slug, title, tag, short, long_html, status, created_at, updated_at, blocks_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      "a",
      "A",
      "tag",
      "short",
      "<h2>Überschrift</h2><p>Absatz.</p>",
      "published",
      now,
      now,
      null,
    );
    db.prepare(
      `INSERT INTO news (slug, title, tag, short, long_html, status, created_at, updated_at, blocks_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      "b",
      "B",
      "tag",
      "short",
      "<p>schon da</p>",
      "draft",
      now,
      now,
      JSON.stringify([{ kind: "paragraph", text: "already migrated" }]),
    );

    const changed = backfillNewsBlocks(db);
    expect(changed).toBe(1);

    const rows = db
      .prepare("SELECT slug, blocks_json FROM news ORDER BY slug")
      .all() as { slug: string; blocks_json: string }[];
    expect(JSON.parse(rows[0].blocks_json)).toEqual([
      { kind: "heading", level: 2, text: "Überschrift" },
      { kind: "paragraph", text: "Absatz." },
    ]);
    expect(JSON.parse(rows[1].blocks_json)).toEqual([
      { kind: "paragraph", text: "already migrated" },
    ]);
  });

  it("is idempotent — second run is a no-op", () => {
    const db = freshDb();
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO news (slug, title, tag, short, long_html, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run("a", "A", "tag", "s", "<p>t</p>", "draft", now, now);
    expect(backfillNewsBlocks(db)).toBe(1);
    expect(backfillNewsBlocks(db)).toBe(0);
  });
});
