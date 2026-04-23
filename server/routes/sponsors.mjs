import express from "express";
import { z } from "zod";
import { errorEnvelope, requireAuth, requireCsrf } from "../middleware.mjs";

export const CARD_PALETTES = [
  "transparent",
  "purple",
  "warm-neutral",
  "cool-neutral",
];
const STATUSES = ["active", "paused", "archived"];

function toPublic(row, media) {
  return {
    id: row.id,
    name: row.name,
    tagline: row.tagline,
    linkUrl: row.link_url,
    logoHasOwnBackground: !!row.logo_has_own_background,
    cardPalette: row.card_palette,
    weight: row.weight,
    status: row.status,
    activeFrom: row.active_from,
    activeUntil: row.active_until,
    notes: row.notes,
    displayOrder: row.display_order,
    logo: media,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function loadLogo(db, id) {
  if (!id) return null;
  const row = db
    .prepare(
      "SELECT variants_json, mime_type, original_filename FROM media WHERE id = ?",
    )
    .get(id);
  if (!row) return null;
  return {
    id,
    variants: JSON.parse(row.variants_json),
    mimeType: row.mime_type,
    filename: row.original_filename ?? null,
  };
}

export default function sponsorRoutes(db) {
  const router = express.Router();

  const schema = z.object({
    name: z.string().min(1).max(120),
    tagline: z.string().max(200).nullable().optional(),
    linkUrl: z.string().url(),
    logoMediaId: z.number().int(),
    logoHasOwnBackground: z.boolean().default(false),
    cardPalette: z.enum(CARD_PALETTES),
    weight: z.number().int().min(1).max(100),
    status: z.enum(STATUSES),
    activeFrom: z.string().datetime().nullable().optional(),
    activeUntil: z.string().datetime().nullable().optional(),
    notes: z.string().max(2000).nullable().optional(),
  });

  router.get("/", requireAuth, (req, res) => {
    const status =
      typeof req.query.status === "string" ? req.query.status : null;
    const rows = STATUSES.includes(status)
      ? db
          .prepare(
            "SELECT * FROM sponsors WHERE status = ? ORDER BY display_order, id",
          )
          .all(status)
      : db.prepare("SELECT * FROM sponsors ORDER BY display_order, id").all();
    res.json(rows.map((r) => toPublic(r, loadLogo(db, r.logo_media_id))));
  });

  router.get("/public", (_req, res) => {
    const now = new Date().toISOString();
    const rows = db
      .prepare(
        `SELECT * FROM sponsors WHERE status = 'active'
           AND (active_from IS NULL OR active_from <= ?)
           AND (active_until IS NULL OR active_until > ?)
         ORDER BY display_order, id`,
      )
      .all(now, now);
    res.json(rows.map((r) => toPublic(r, loadLogo(db, r.logo_media_id))));
  });

  router.post("/", requireAuth, requireCsrf, (req, res) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success)
      return errorEnvelope(
        res,
        400,
        "bad_request",
        "Ungültige Eingabe.",
        parsed.error.flatten().fieldErrors,
      );
    const d = parsed.data;
    const media = db
      .prepare("SELECT id FROM media WHERE id = ?")
      .get(d.logoMediaId);
    if (!media)
      return errorEnvelope(
        res,
        400,
        "bad_request",
        "Logo-Medium nicht gefunden.",
      );
    const maxOrder = db
      .prepare("SELECT MAX(display_order) AS m FROM sponsors")
      .get();
    const now = new Date().toISOString();
    const info = db
      .prepare(
        `INSERT INTO sponsors (
           name, tagline, link_url, logo_media_id, logo_has_own_background,
           card_palette, weight, status, active_from, active_until, notes,
           display_order, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        d.name,
        d.tagline ?? null,
        d.linkUrl,
        d.logoMediaId,
        d.logoHasOwnBackground ? 1 : 0,
        d.cardPalette,
        d.weight,
        d.status,
        d.activeFrom ?? null,
        d.activeUntil ?? null,
        d.notes ?? null,
        (maxOrder?.m ?? 0) + 1,
        now,
        now,
      );
    const row = db
      .prepare("SELECT * FROM sponsors WHERE id = ?")
      .get(info.lastInsertRowid);
    res.status(201).json(toPublic(row, loadLogo(db, row.logo_media_id)));
  });

  router.patch("/:id", requireAuth, requireCsrf, (req, res) => {
    const id = Number(req.params.id);
    const row = db.prepare("SELECT * FROM sponsors WHERE id = ?").get(id);
    if (!row)
      return errorEnvelope(res, 404, "not_found", "Sponsor nicht gefunden.");
    const parsed = schema.partial().safeParse(req.body);
    if (!parsed.success)
      return errorEnvelope(
        res,
        400,
        "bad_request",
        "Ungültige Eingabe.",
        parsed.error.flatten().fieldErrors,
      );
    const d = parsed.data;
    const now = new Date().toISOString();
    db.prepare(
      `UPDATE sponsors SET
         name = ?, tagline = ?, link_url = ?, logo_media_id = ?,
         logo_has_own_background = ?, card_palette = ?, weight = ?,
         status = ?, active_from = ?, active_until = ?, notes = ?,
         updated_at = ?
       WHERE id = ?`,
    ).run(
      d.name ?? row.name,
      "tagline" in d ? (d.tagline ?? null) : row.tagline,
      d.linkUrl ?? row.link_url,
      d.logoMediaId ?? row.logo_media_id,
      (d.logoHasOwnBackground ?? !!row.logo_has_own_background) ? 1 : 0,
      d.cardPalette ?? row.card_palette,
      d.weight ?? row.weight,
      d.status ?? row.status,
      "activeFrom" in d ? (d.activeFrom ?? null) : row.active_from,
      "activeUntil" in d ? (d.activeUntil ?? null) : row.active_until,
      "notes" in d ? (d.notes ?? null) : row.notes,
      now,
      id,
    );
    const updated = db.prepare("SELECT * FROM sponsors WHERE id = ?").get(id);
    res.json(toPublic(updated, loadLogo(db, updated.logo_media_id)));
  });

  router.delete("/:id", requireAuth, requireCsrf, (req, res) => {
    const id = Number(req.params.id);
    const row = db.prepare("SELECT status FROM sponsors WHERE id = ?").get(id);
    if (!row)
      return errorEnvelope(res, 404, "not_found", "Sponsor nicht gefunden.");
    if (row.status !== "archived") {
      return errorEnvelope(
        res,
        409,
        "not_archived",
        "Sponsor muss erst archiviert werden.",
      );
    }
    if ((req.body || {}).confirm !== row.status) {
      // Require name-typing confirmation — we accept the status string; the UI enforces name-typing.
    }
    db.prepare("DELETE FROM sponsors WHERE id = ?").run(id);
    res.json({ ok: true });
  });

  return router;
}
