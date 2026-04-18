import express from "express";
import { z } from "zod";
import { errorEnvelope, requireAuth, requireCsrf } from "../middleware.mjs";

const STATUSES = ["active", "hidden", "archived"];

function toPublic(row, media) {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    email: row.email,
    phone: row.phone,
    notes: row.notes,
    status: row.status,
    displayOrder: row.display_order,
    portrait: media,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function loadPortrait(db, id) {
  if (!id) return null;
  const row = db.prepare("SELECT variants_json, mime_type FROM media WHERE id = ?").get(id);
  if (!row) return null;
  return { id, variants: JSON.parse(row.variants_json), mimeType: row.mime_type };
}

export default function vorstandRoutes(db) {
  const router = express.Router();

  const schema = z.object({
    name: z.string().min(1).max(120),
    role: z.string().min(1).max(120),
    email: z.string().email().nullable().optional(),
    phone: z.string().max(50).nullable().optional(),
    portraitMediaId: z.number().int().nullable().optional(),
    notes: z.string().max(2000).nullable().optional(),
    status: z.enum(STATUSES),
  });

  router.get("/", requireAuth, (req, res) => {
    const status = typeof req.query.status === "string" ? req.query.status : null;
    const rows = STATUSES.includes(status)
      ? db.prepare("SELECT * FROM vorstand WHERE status = ? ORDER BY display_order, id").all(status)
      : db.prepare("SELECT * FROM vorstand ORDER BY display_order, id").all();
    res.json(rows.map((r) => toPublic(r, loadPortrait(db, r.portrait_media_id))));
  });

  router.get("/public", (_req, res) => {
    const rows = db
      .prepare("SELECT * FROM vorstand WHERE status = 'active' ORDER BY display_order, id")
      .all();
    res.json(rows.map((r) => toPublic(r, loadPortrait(db, r.portrait_media_id))));
  });

  router.post("/", requireAuth, requireCsrf, (req, res) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return errorEnvelope(res, 400, "bad_request", "Ungültige Eingabe.", parsed.error.flatten().fieldErrors);
    const d = parsed.data;
    const maxOrder = db.prepare("SELECT MAX(display_order) AS m FROM vorstand").get();
    const now = new Date().toISOString();
    const info = db
      .prepare(
        `INSERT INTO vorstand (
           name, role, email, phone, portrait_media_id, notes, status,
           display_order, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        d.name,
        d.role,
        d.email ?? null,
        d.phone ?? null,
        d.portraitMediaId ?? null,
        d.notes ?? null,
        d.status,
        (maxOrder?.m ?? 0) + 1,
        now,
        now,
      );
    const row = db.prepare("SELECT * FROM vorstand WHERE id = ?").get(info.lastInsertRowid);
    res.status(201).json(toPublic(row, loadPortrait(db, row.portrait_media_id)));
  });

  router.patch("/:id", requireAuth, requireCsrf, (req, res) => {
    const id = Number(req.params.id);
    const row = db.prepare("SELECT * FROM vorstand WHERE id = ?").get(id);
    if (!row) return errorEnvelope(res, 404, "not_found", "Mitglied nicht gefunden.");
    const parsed = schema.partial().safeParse(req.body);
    if (!parsed.success) return errorEnvelope(res, 400, "bad_request", "Ungültige Eingabe.", parsed.error.flatten().fieldErrors);
    const d = parsed.data;
    const now = new Date().toISOString();
    db.prepare(
      `UPDATE vorstand SET
         name = ?, role = ?, email = ?, phone = ?,
         portrait_media_id = ?, notes = ?, status = ?, updated_at = ?
       WHERE id = ?`,
    ).run(
      d.name ?? row.name,
      d.role ?? row.role,
      "email" in d ? (d.email ?? null) : row.email,
      "phone" in d ? (d.phone ?? null) : row.phone,
      "portraitMediaId" in d ? (d.portraitMediaId ?? null) : row.portrait_media_id,
      "notes" in d ? (d.notes ?? null) : row.notes,
      d.status ?? row.status,
      now,
      id,
    );
    const updated = db.prepare("SELECT * FROM vorstand WHERE id = ?").get(id);
    res.json(toPublic(updated, loadPortrait(db, updated.portrait_media_id)));
  });

  router.delete("/:id", requireAuth, requireCsrf, (req, res) => {
    const id = Number(req.params.id);
    const row = db.prepare("SELECT status FROM vorstand WHERE id = ?").get(id);
    if (!row) return errorEnvelope(res, 404, "not_found", "Mitglied nicht gefunden.");
    if (row.status !== "archived") {
      return errorEnvelope(res, 409, "not_archived", "Mitglied muss erst archiviert werden.");
    }
    db.prepare("DELETE FROM vorstand WHERE id = ?").run(id);
    res.json({ ok: true });
  });

  const reorderSchema = z.object({
    orderedIds: z.array(z.number().int()).min(1),
  });

  router.post("/reorder", requireAuth, requireCsrf, (req, res) => {
    const parsed = reorderSchema.safeParse(req.body);
    if (!parsed.success) return errorEnvelope(res, 400, "bad_request", "Ungültige Reihenfolge.");
    const stmt = db.prepare("UPDATE vorstand SET display_order = ?, updated_at = ? WHERE id = ?");
    const now = new Date().toISOString();
    const tx = db.transaction((ids) => {
      ids.forEach((id, idx) => stmt.run(idx + 1, now, id));
    });
    tx(parsed.data.orderedIds);
    const rows = db.prepare("SELECT * FROM vorstand ORDER BY display_order, id").all();
    res.json(rows.map((r) => toPublic(r, loadPortrait(db, r.portrait_media_id))));
  });

  return router;
}
