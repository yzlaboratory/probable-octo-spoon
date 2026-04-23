/**
 * News block helpers — the server-side counterpart of the admin block editor.
 *
 * A News article is authored as an ordered list of blocks:
 *   heading   — { kind, level: 1|2|3, text }
 *   lead      — { kind, text }                 large serif intro paragraph
 *   paragraph — { kind, text }                 body text
 *   image     — { kind, mediaId, caption, credit }
 *   quote     — { kind, text, attr }
 *   callout   — { kind, tone: 'primary'|'accent'|'warn', text }
 *
 * Blocks are the editor's source of truth. On write the server compiles them
 * to sanitized HTML stored in `long_html` so the public SPA keeps rendering
 * a single HTML blob at `/news/:slug` unchanged.
 *
 * `htmlToBlocks` exists for the one-time backfill from legacy tiptap-produced
 * HTML. It deliberately flattens inline formatting (bold/italic/links/lists)
 * to plain text — the block editor is plain-text-only by design.
 */

import { z } from "zod";
import { sanitizeNewsHtml } from "./sanitize.mjs";

export const BLOCK_KINDS = [
  "heading",
  "lead",
  "paragraph",
  "image",
  "quote",
  "callout",
];

export const CALLOUT_TONES = ["primary", "accent", "warn"];

export const blockSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("heading"),
    level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    text: z.string().max(240).default(""),
  }),
  z.object({
    kind: z.literal("lead"),
    text: z.string().max(600).default(""),
  }),
  z.object({
    kind: z.literal("paragraph"),
    text: z.string().max(4000).default(""),
  }),
  z.object({
    kind: z.literal("image"),
    mediaId: z.number().int().positive().nullable().default(null),
    caption: z.string().max(240).default(""),
    credit: z.string().max(120).default(""),
  }),
  z.object({
    kind: z.literal("quote"),
    text: z.string().max(1000).default(""),
    attr: z.string().max(120).default(""),
  }),
  z.object({
    kind: z.literal("callout"),
    tone: z.enum(["primary", "accent", "warn"]).default("primary"),
    text: z.string().max(800).default(""),
  }),
]);

export const blocksSchema = z.array(blockSchema).max(200);

/**
 * HTML-escape a plain string for safe interpolation into rendered HTML.
 */
function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Convert a plain-text paragraph body into HTML, preserving line breaks as
 * `<br>` so authors can split within a paragraph without needing a new block.
 */
function textToHtml(text) {
  const trimmed = String(text ?? "").trim();
  if (!trimmed) return "";
  return esc(trimmed).replace(/\r?\n/g, "<br>");
}

/**
 * Render a single block to HTML. Unknown kinds render as nothing so a
 * malformed row can never break the public renderer.
 *
 * `mediaById` maps numeric ids to a Media object shaped
 * `{ variants: { "800w": url, ... }, ... }`. When the block references an id
 * that isn't in the map (e.g. the media row was deleted), the image block
 * is skipped entirely.
 */
export function blockToHtml(b, mediaById = new Map()) {
  switch (b?.kind) {
    case "heading": {
      const lvl = b.level === 1 ? "h1" : b.level === 3 ? "h3" : "h2";
      return `<${lvl}>${esc(b.text)}</${lvl}>`;
    }
    case "lead":
      return `<p class="lead">${textToHtml(b.text)}</p>`;
    case "paragraph":
      return `<p>${textToHtml(b.text)}</p>`;
    case "quote": {
      const attr = b.attr
        ? `<cite>${esc(b.attr)}</cite>`
        : "";
      return `<blockquote>${textToHtml(b.text)}${attr}</blockquote>`;
    }
    case "callout": {
      const tone = CALLOUT_TONES.includes(b.tone) ? b.tone : "primary";
      return `<aside class="callout callout-${tone}">${textToHtml(b.text)}</aside>`;
    }
    case "image": {
      if (!b.mediaId) return "";
      const media = mediaById.get(b.mediaId);
      if (!media) return "";
      const v = media.variants || {};
      const src = v["1600w"] || v["800w"] || v["400w"] || v.fallbackJpg || "";
      if (!src) return "";
      const alt = b.caption || "";
      const figcaption = b.caption || b.credit
        ? `<figcaption>${b.caption ? esc(b.caption) : ""}${
            b.credit ? ` <span class="credit">${esc(b.credit)}</span>` : ""
          }</figcaption>`
        : "";
      return `<figure><img src="${esc(src)}" alt="${esc(alt)}">${figcaption}</figure>`;
    }
    default:
      return "";
  }
}

/**
 * Compile a blocks array to sanitized HTML.
 *
 * The result is guaranteed to round-trip through our existing `sanitizeNewsHtml`
 * allowlist (p, h1/h2/h3, blockquote, img, figure, figcaption, etc.) — adding
 * `figure`, `figcaption`, `aside`, `cite`, and `class` attributes there.
 */
export function compileBlocksToHtml(blocks, mediaById = new Map()) {
  if (!Array.isArray(blocks)) return "";
  return sanitizeNewsHtml(
    blocks.map((b) => blockToHtml(b, mediaById)).filter(Boolean).join("\n"),
  );
}

/**
 * Best-effort HTML → blocks parser. Purpose: one-time backfill from legacy
 * tiptap-produced content. Preserves block structure (paragraphs, headings,
 * blockquotes, images); flattens inline formatting to plain text; converts
 * `<ul>`/`<ol>` to newline-separated paragraphs with `• ` / `1. ` prefixes
 * so no content is lost.
 *
 * Not meant to be bullet-proof; invariant is that every published article
 * still has readable text after the migration.
 */
export function htmlToBlocks(html) {
  const s = String(html ?? "").trim();
  if (!s) return [];

  const blocks = [];
  // Two alternatives: paired block element with inner content, OR self-closing
  // <img>. Groups: 1 = paired tag name, 2 = paired inner, 3 = img attrs.
  const blockRegex =
    /<(h1|h2|h3|p|blockquote|ul|ol)\b[^>]*>([\s\S]*?)<\/\1>|<img\b([^>]*)\/?>/gi;
  let m;
  let matched = false;
  while ((m = blockRegex.exec(s)) !== null) {
    matched = true;
    if (m[3] !== undefined) {
      const attrs = m[3];
      const src = (attrs.match(/\bsrc\s*=\s*"([^"]*)"/) || [])[1] || "";
      const alt = (attrs.match(/\balt\s*=\s*"([^"]*)"/) || [])[1] || "";
      blocks.push({
        kind: "image",
        mediaId: null,
        caption: alt,
        credit: "",
        // Backfill cannot recover the original media row — the editor will
        // prompt the author to re-pick from the library. Keep `srcHint` on
        // the block so the HTML can still render until they do.
        srcHint: src,
      });
      continue;
    }
    const tag = m[1].toLowerCase();
    const inner = m[2] ?? "";
    if (tag === "ul" || tag === "ol") {
      const items = [...inner.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)].map(
        (mm, i) =>
          `${tag === "ol" ? `${i + 1}. ` : "• "}${stripInline(mm[1])}`,
      );
      if (items.length)
        blocks.push({ kind: "paragraph", text: items.join("\n") });
      continue;
    }
    const text = stripInline(inner);
    if (!text.trim()) continue;
    if (tag === "h1" || tag === "h2" || tag === "h3") {
      const level = tag === "h1" ? 1 : tag === "h2" ? 2 : 3;
      blocks.push({ kind: "heading", level, text });
      continue;
    }
    if (tag === "blockquote") {
      blocks.push({ kind: "quote", text, attr: "" });
      continue;
    }
    if (tag === "p") {
      blocks.push({ kind: "paragraph", text });
      continue;
    }
  }

  if (!matched) {
    // Plain text article with no block markup — just dump it as one paragraph.
    return [{ kind: "paragraph", text: stripInline(s) }];
  }
  return blocks;
}

function stripInline(html) {
  return String(html ?? "")
    .replace(/<br\s*\/?>(\s*)/gi, "\n")
    .replace(/<\/(p|div|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Walks all news rows whose `blocks_json` is NULL and populates them from
 * `long_html`. Idempotent — runs once per row. Called from db.mjs after SQL
 * migrations so legacy articles surface in the new block editor immediately
 * after deploy.
 */
export function backfillNewsBlocks(db) {
  const rows = db
    .prepare(
      "SELECT id, long_html FROM news WHERE blocks_json IS NULL",
    )
    .all();
  if (!rows.length) return 0;
  const update = db.prepare("UPDATE news SET blocks_json = ? WHERE id = ?");
  const tx = db.transaction((batch) => {
    for (const r of batch) {
      const blocks = htmlToBlocks(r.long_html || "");
      update.run(JSON.stringify(blocks), r.id);
    }
  });
  tx(rows);
  return rows.length;
}
