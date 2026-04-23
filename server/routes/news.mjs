import express from "express";
import { z } from "zod";
import slug from "slug";
import { errorEnvelope, requireAuth, requireCsrf } from "../middleware.mjs";
import { blocksSchema, compileBlocksToHtml } from "../news-blocks.mjs";

const STATUSES = ["draft", "scheduled", "published", "withdrawn", "deleted"];

function parseBlocks(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function toPublic(row, mediaMap) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    tag: row.tag,
    short: row.short,
    longHtml: row.long_html,
    blocks: parseBlocks(row.blocks_json),
    status: row.status,
    publishAt: row.publish_at,
    hero: row.hero_media_id ? mediaMap.get(row.hero_media_id) || null : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function collectMediaIds(blocks) {
  const ids = [];
  for (const b of blocks) {
    if (b && b.kind === "image" && typeof b.mediaId === "number") {
      ids.push(b.mediaId);
    }
  }
  return ids;
}

function loadMediaMap(db, ids) {
  if (!ids.length) return new Map();
  const placeholders = ids.map(() => "?").join(",");
  const rows = db
    .prepare(
      `SELECT id, variants_json, mime_type, original_filename
       FROM media WHERE id IN (${placeholders})`,
    )
    .all(...ids);
  return new Map(
    rows.map((r) => [
      r.id,
      {
        id: r.id,
        variants: JSON.parse(r.variants_json),
        mimeType: r.mime_type,
        filename: r.original_filename ?? null,
      },
    ]),
  );
}

export default function newsRoutes(db) {
  const router = express.Router();

  const createSchema = z.object({
    title: z.string().min(1).max(240),
    tag: z.string().min(1).max(80),
    short: z.string().min(1).max(600),
    blocks: blocksSchema.default([]),
    slug: z.string().min(1).max(160).optional(),
    heroMediaId: z.number().int().nullable().optional(),
    status: z.enum(["draft", "scheduled", "published", "withdrawn"]),
    publishAt: z.string().datetime().nullable().optional(),
  });

  // On patch, every field is optional. Importantly, `blocks` stays
  // `undefined` when the client didn't send it — we use that as a signal to
  // leave stored blocks/long_html untouched.
  const patchSchema = z.object({
    title: z.string().min(1).max(240).optional(),
    tag: z.string().min(1).max(80).optional(),
    short: z.string().min(1).max(600).optional(),
    blocks: blocksSchema.optional(),
    slug: z.string().min(1).max(160).optional(),
    heroMediaId: z.number().int().nullable().optional(),
    status: z.enum(["draft", "scheduled", "published", "withdrawn"]).optional(),
    publishAt: z.string().datetime().nullable().optional(),
  });

  function compileFromBlocks(blocks) {
    const ids = collectMediaIds(blocks);
    const mediaMap = loadMediaMap(db, ids);
    return compileBlocksToHtml(blocks, mediaMap);
  }

  function uniqueSlug(base, excludeId) {
    let candidate = base;
    let i = 2;
    for (;;) {
      const row = db
        .prepare("SELECT id FROM news WHERE slug = ?")
        .get(candidate);
      if (!row || row.id === excludeId) return candidate;
      candidate = `${base}-${i}`;
      i += 1;
    }
  }

  router.get("/", requireAuth, (req, res) => {
    const status =
      typeof req.query.status === "string" ? req.query.status : null;
    const where =
      status && STATUSES.includes(status)
        ? "WHERE status = ?"
        : "WHERE status != 'deleted'";
    const rows =
      status && STATUSES.includes(status)
        ? db
            .prepare(
              `SELECT * FROM news ${where} ORDER BY COALESCE(publish_at, created_at) DESC`,
            )
            .all(status)
        : db
            .prepare(
              `SELECT * FROM news ${where} ORDER BY COALESCE(publish_at, created_at) DESC`,
            )
            .all();
    const mediaIds = rows
      .filter((r) => r.hero_media_id)
      .map((r) => r.hero_media_id);
    const mediaMap = loadMediaMap(db, mediaIds);
    res.json(rows.map((r) => toPublic(r, mediaMap)));
  });

  router.get("/public", (_req, res) => {
    const rows = db
      .prepare(
        "SELECT * FROM news WHERE status = 'published' AND (publish_at IS NULL OR publish_at <= ?) ORDER BY COALESCE(publish_at, created_at) DESC",
      )
      .all(new Date().toISOString());
    const mediaMap = loadMediaMap(
      db,
      rows.filter((r) => r.hero_media_id).map((r) => r.hero_media_id),
    );
    res.json(rows.map((r) => toPublic(r, mediaMap)));
  });

  router.get("/public/:slug", (req, res) => {
    const row = db
      .prepare(
        "SELECT * FROM news WHERE slug = ? AND status = 'published' AND (publish_at IS NULL OR publish_at <= ?)",
      )
      .get(req.params.slug, new Date().toISOString());
    if (!row)
      return errorEnvelope(res, 404, "not_found", "Beitrag nicht gefunden.");
    const mediaMap = loadMediaMap(
      db,
      row.hero_media_id ? [row.hero_media_id] : [],
    );
    res.json(toPublic(row, mediaMap));
  });

  router.post("/", requireAuth, requireCsrf, (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success)
      return errorEnvelope(
        res,
        400,
        "bad_request",
        "Ungültige Eingabe.",
        parsed.error.flatten().fieldErrors,
      );
    const data = parsed.data;
    const baseSlug = slug(data.slug || data.title, { lower: true });
    if (!baseSlug)
      return errorEnvelope(
        res,
        400,
        "bad_request",
        "Titel darf nicht leer sein.",
      );
    const finalSlug = uniqueSlug(baseSlug);
    const now = new Date().toISOString();
    const publishAt =
      data.status === "scheduled" || data.status === "published"
        ? (data.publishAt ?? now)
        : null;
    const longHtml = compileFromBlocks(data.blocks);
    const info = db
      .prepare(
        `INSERT INTO news (slug, title, tag, short, long_html, blocks_json, hero_media_id, status, publish_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        finalSlug,
        data.title,
        data.tag,
        data.short,
        longHtml,
        JSON.stringify(data.blocks),
        data.heroMediaId ?? null,
        data.status,
        publishAt,
        now,
        now,
      );
    const row = db
      .prepare("SELECT * FROM news WHERE id = ?")
      .get(info.lastInsertRowid);
    const mediaMap = loadMediaMap(
      db,
      row.hero_media_id ? [row.hero_media_id] : [],
    );
    res.status(201).json(toPublic(row, mediaMap));
  });

  router.patch("/:id", requireAuth, requireCsrf, (req, res) => {
    const id = Number(req.params.id);
    const row = db.prepare("SELECT * FROM news WHERE id = ?").get(id);
    if (!row)
      return errorEnvelope(res, 404, "not_found", "Beitrag nicht gefunden.");
    const parsed = patchSchema.safeParse(req.body);
    if (!parsed.success)
      return errorEnvelope(
        res,
        400,
        "bad_request",
        "Ungültige Eingabe.",
        parsed.error.flatten().fieldErrors,
      );
    const d = parsed.data;
    const nextTitle = d.title ?? row.title;
    const nextStatus = d.status ?? row.status;
    const nextSlug = d.slug
      ? uniqueSlug(slug(d.slug, { lower: true }), id)
      : row.slug;
    const nextPublishAt = (() => {
      if ("publishAt" in d) return d.publishAt ?? null;
      return row.publish_at;
    })();
    const hasBlocks = d.blocks !== undefined;
    const nextBlocks = hasBlocks ? d.blocks : parseBlocks(row.blocks_json);
    const nextBlocksJson = hasBlocks
      ? JSON.stringify(d.blocks)
      : row.blocks_json;
    // Always recompile when blocks change; otherwise preserve stored html so
    // content is never silently altered by a metadata-only update.
    const nextLongHtml = hasBlocks
      ? compileFromBlocks(nextBlocks)
      : row.long_html;
    const now = new Date().toISOString();
    db.prepare(
      `UPDATE news SET
         slug = ?, title = ?, tag = ?, short = ?, long_html = ?, blocks_json = ?, hero_media_id = ?,
         status = ?, publish_at = ?, updated_at = ?
       WHERE id = ?`,
    ).run(
      nextSlug,
      nextTitle,
      d.tag ?? row.tag,
      d.short ?? row.short,
      nextLongHtml,
      nextBlocksJson,
      d.heroMediaId !== undefined ? d.heroMediaId : row.hero_media_id,
      nextStatus,
      nextPublishAt,
      now,
      id,
    );
    const updated = db.prepare("SELECT * FROM news WHERE id = ?").get(id);
    const mediaMap = loadMediaMap(
      db,
      updated.hero_media_id ? [updated.hero_media_id] : [],
    );
    res.json(toPublic(updated, mediaMap));
  });

  // Soft delete -> status='deleted'. Hard delete only from that state.
  router.delete("/:id", requireAuth, requireCsrf, (req, res) => {
    const id = Number(req.params.id);
    const row = db.prepare("SELECT status FROM news WHERE id = ?").get(id);
    if (!row)
      return errorEnvelope(res, 404, "not_found", "Beitrag nicht gefunden.");
    if (row.status === "deleted") {
      db.prepare("DELETE FROM news WHERE id = ?").run(id);
      return res.json({ ok: true, hard: true });
    }
    db.prepare(
      "UPDATE news SET status = 'deleted', updated_at = ? WHERE id = ?",
    ).run(new Date().toISOString(), id);
    res.json({ ok: true, hard: false });
  });

  return router;
}

export function runPublishTick(db) {
  const now = new Date().toISOString();
  db.prepare(
    "UPDATE news SET status = 'published' WHERE status = 'scheduled' AND publish_at <= ?",
  ).run(now);
}
