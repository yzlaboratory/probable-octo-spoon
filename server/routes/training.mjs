import express from "express";
import { z } from "zod";
import { errorEnvelope, requireAuth, requireCsrf } from "../middleware.mjs";

const STATUSES = ["active", "hidden", "archived"];
const DAYS = [
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
  "Samstag",
  "Sonntag",
];
const VISIBILITIES = [
  "offen für Gäste",
  "Anmeldung erforderlich",
  "nur Mitglieder",
];
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function toPublic(row) {
  return {
    id: row.id,
    group: row.group_name,
    day: row.day,
    timeFrom: row.time_from,
    timeTo: row.time_to,
    trainer: row.trainer,
    phone: row.phone,
    visibility: row.visibility,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toBanner(row) {
  return {
    message: row?.banner_message ?? null,
    updatedAt: row?.updated_at ?? null,
  };
}

export default function trainingRoutes(db) {
  const router = express.Router();

  // Schema is intentionally unrefined: the timeFrom < timeTo invariant is
  // checked manually after merge so PATCH (partial) and POST (full) both
  // validate the *resulting* row, not the request payload in isolation.
  const slotSchema = z.object({
    group: z.string().min(1).max(120),
    day: z.enum(DAYS),
    timeFrom: z.string().regex(TIME_RE, "HH:MM erwartet"),
    timeTo: z.string().regex(TIME_RE, "HH:MM erwartet"),
    trainer: z.string().min(1).max(120),
    phone: z.string().min(1).max(50),
    visibility: z.enum(VISIBILITIES),
    status: z.enum(STATUSES),
  });

  function badTimeRange(res) {
    return errorEnvelope(res, 400, "bad_request", "Ungültige Eingabe.", {
      timeTo: ["Endzeit muss nach Startzeit liegen."],
    });
  }

  router.get("/", requireAuth, (req, res) => {
    const status =
      typeof req.query.status === "string" ? req.query.status : null;
    const rows = STATUSES.includes(status)
      ? db
          .prepare(
            "SELECT * FROM training_slots WHERE status = ? ORDER BY day, time_from, id",
          )
          .all(status)
      : db
          .prepare("SELECT * FROM training_slots ORDER BY day, time_from, id")
          .all();
    res.json(rows.map(toPublic));
  });

  router.get("/public", (_req, res) => {
    const rows = db
      .prepare(
        "SELECT * FROM training_slots WHERE status = 'active' ORDER BY day, time_from, id",
      )
      .all();
    const banner = db
      .prepare(
        "SELECT banner_message, updated_at FROM training_settings WHERE id = 1",
      )
      .get();
    res.json({
      slots: rows.map(toPublic),
      banner: toBanner(banner),
    });
  });

  router.post("/", requireAuth, requireCsrf, (req, res) => {
    const parsed = slotSchema.safeParse(req.body);
    if (!parsed.success)
      return errorEnvelope(
        res,
        400,
        "bad_request",
        "Ungültige Eingabe.",
        parsed.error.flatten().fieldErrors,
      );
    const d = parsed.data;
    if (d.timeFrom >= d.timeTo) return badTimeRange(res);
    const now = new Date().toISOString();
    const info = db
      .prepare(
        `INSERT INTO training_slots
           (group_name, day, time_from, time_to, trainer, phone, visibility, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        d.group,
        d.day,
        d.timeFrom,
        d.timeTo,
        d.trainer,
        d.phone,
        d.visibility,
        d.status,
        now,
        now,
      );
    const row = db
      .prepare("SELECT * FROM training_slots WHERE id = ?")
      .get(info.lastInsertRowid);
    res.status(201).json(toPublic(row));
  });

  // Banner routes are registered BEFORE /:id so PATCH /banner doesn't fall
  // into the slot-by-id matcher (`Number("banner")` would 404 noisily).
  router.get("/banner", requireAuth, (_req, res) => {
    const row = db
      .prepare(
        "SELECT banner_message, updated_at FROM training_settings WHERE id = 1",
      )
      .get();
    res.json(toBanner(row));
  });

  const bannerSchema = z.object({
    message: z.string().max(280).nullable(),
  });

  router.patch("/banner", requireAuth, requireCsrf, (req, res) => {
    const parsed = bannerSchema.safeParse(req.body);
    if (!parsed.success)
      return errorEnvelope(
        res,
        400,
        "bad_request",
        "Ungültige Eingabe.",
        parsed.error.flatten().fieldErrors,
      );
    // Treat empty/whitespace as cleared so the public banner toggles off
    // without the admin having to remember the literal `null` distinction.
    const trimmed = parsed.data.message?.trim();
    const message = trimmed ? trimmed : null;
    const now = new Date().toISOString();
    db.prepare(
      "UPDATE training_settings SET banner_message = ?, updated_at = ? WHERE id = 1",
    ).run(message, now);
    const row = db
      .prepare(
        "SELECT banner_message, updated_at FROM training_settings WHERE id = 1",
      )
      .get();
    res.json(toBanner(row));
  });

  router.patch("/:id", requireAuth, requireCsrf, (req, res) => {
    const id = Number(req.params.id);
    const row = db.prepare("SELECT * FROM training_slots WHERE id = ?").get(id);
    if (!row)
      return errorEnvelope(
        res,
        404,
        "not_found",
        "Trainingseintrag nicht gefunden.",
      );
    const parsed = slotSchema.partial().safeParse(req.body);
    if (!parsed.success)
      return errorEnvelope(
        res,
        400,
        "bad_request",
        "Ungültige Eingabe.",
        parsed.error.flatten().fieldErrors,
      );
    const d = parsed.data;
    const next = {
      group_name: d.group ?? row.group_name,
      day: d.day ?? row.day,
      time_from: d.timeFrom ?? row.time_from,
      time_to: d.timeTo ?? row.time_to,
      trainer: d.trainer ?? row.trainer,
      phone: d.phone ?? row.phone,
      visibility: d.visibility ?? row.visibility,
      status: d.status ?? row.status,
    };
    if (next.time_from >= next.time_to) return badTimeRange(res);
    const now = new Date().toISOString();
    db.prepare(
      `UPDATE training_slots SET
         group_name = ?, day = ?, time_from = ?, time_to = ?,
         trainer = ?, phone = ?, visibility = ?, status = ?, updated_at = ?
       WHERE id = ?`,
    ).run(
      next.group_name,
      next.day,
      next.time_from,
      next.time_to,
      next.trainer,
      next.phone,
      next.visibility,
      next.status,
      now,
      id,
    );
    const updated = db
      .prepare("SELECT * FROM training_slots WHERE id = ?")
      .get(id);
    res.json(toPublic(updated));
  });

  router.delete("/:id", requireAuth, requireCsrf, (req, res) => {
    const id = Number(req.params.id);
    const row = db
      .prepare("SELECT id FROM training_slots WHERE id = ?")
      .get(id);
    if (!row)
      return errorEnvelope(
        res,
        404,
        "not_found",
        "Trainingseintrag nicht gefunden.",
      );
    db.prepare("DELETE FROM training_slots WHERE id = ?").run(id);
    res.json({ ok: true });
  });

  return router;
}
