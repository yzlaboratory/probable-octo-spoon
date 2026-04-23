import express from "express";
import multer from "multer";
import sharp from "sharp";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { errorEnvelope, requireAuth, requireCsrf } from "../middleware.mjs";
import { mediaRoot } from "../db.mjs";
import { sanitizeSvg } from "../sanitize.mjs";

const NEWS_VARIANTS = [
  { key: "400w", width: 400 },
  { key: "800w", width: 800 },
  { key: "1600w", width: 1600 },
];
const SPONSOR_VARIANTS = [
  { key: "200w", width: 200 },
  { key: "400w", width: 400 },
];
const VORSTAND_VARIANTS = [
  { key: "160w", width: 160 },
  { key: "320w", width: 320 },
  { key: "640w", width: 640 },
];

const MAX_SIZE = {
  news: 10 * 1024 * 1024,
  sponsor: 2 * 1024 * 1024,
  vorstand: 5 * 1024 * 1024,
};

const ALLOWED_MIMES = {
  news: ["image/png", "image/jpeg", "image/webp"],
  sponsor: ["image/png", "image/jpeg", "image/svg+xml"],
  vorstand: ["image/png", "image/jpeg", "image/webp"],
};

const KINDS = ["news", "sponsor", "vorstand"];
const KIND_DIRS = { news: "news", sponsor: "sponsors", vorstand: "vorstand" };

function variantsFor(kind) {
  if (kind === "news") return NEWS_VARIANTS;
  if (kind === "sponsor") return SPONSOR_VARIANTS;
  if (kind === "vorstand") return VORSTAND_VARIANTS;
  throw new Error("unknown kind");
}

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true });
}

// Keep the list and single-item endpoints in agreement by mapping rows here.
function rowToMedia(row) {
  return {
    id: row.id,
    kind: row.kind,
    variants: JSON.parse(row.variants_json),
    mimeType: row.mime_type,
    filename: row.original_filename ?? null,
    uploadedAt: row.uploaded_at,
    uploadedBy: row.uploaded_by_email ?? null,
  };
}

// SQLite's ON DELETE SET NULL would silently orphan news hero images and
// vorstand portraits; the sponsors FK has no cascade and would throw. Check
// every reference up front so the admin UI can explain why a delete failed.
function findReferrers(db, id) {
  const news = db
    .prepare("SELECT id, title FROM news WHERE hero_media_id = ?")
    .all(id)
    .map((r) => ({ kind: "news", id: r.id, label: r.title }));
  const sponsors = db
    .prepare("SELECT id, name FROM sponsors WHERE logo_media_id = ?")
    .all(id)
    .map((r) => ({ kind: "sponsor", id: r.id, label: r.name }));
  const vorstand = db
    .prepare("SELECT id, name FROM vorstand WHERE portrait_media_id = ?")
    .all(id)
    .map((r) => ({ kind: "vorstand", id: r.id, label: r.name }));
  return [...news, ...sponsors, ...vorstand];
}

export default function mediaRoutes(db) {
  const router = express.Router();
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
  });

  const listStmt = db.prepare(
    `SELECT m.id, m.kind, m.variants_json, m.mime_type, m.original_filename, m.uploaded_at,
            a.email AS uploaded_by_email
     FROM media m
     LEFT JOIN admins a ON a.id = m.uploaded_by
     ORDER BY m.uploaded_at DESC, m.id DESC`,
  );
  const listByKindStmt = db.prepare(
    `SELECT m.id, m.kind, m.variants_json, m.mime_type, m.original_filename, m.uploaded_at,
            a.email AS uploaded_by_email
     FROM media m
     LEFT JOIN admins a ON a.id = m.uploaded_by
     WHERE m.kind = ?
     ORDER BY m.uploaded_at DESC, m.id DESC`,
  );
  const getStmt = db.prepare(
    `SELECT m.id, m.kind, m.variants_json, m.mime_type, m.original_filename, m.uploaded_at, m.original_path,
            a.email AS uploaded_by_email
     FROM media m
     LEFT JOIN admins a ON a.id = m.uploaded_by
     WHERE m.id = ?`,
  );

  router.get("/", requireAuth, (req, res) => {
    const kind = typeof req.query.kind === "string" ? req.query.kind : null;
    if (kind && !KINDS.includes(kind)) {
      return errorEnvelope(res, 400, "bad_request", "Unbekannter Medientyp.");
    }
    const rows = kind ? listByKindStmt.all(kind) : listStmt.all();
    res.json(rows.map(rowToMedia));
  });

  router.post(
    "/",
    requireAuth,
    requireCsrf,
    upload.single("file"),
    async (req, res) => {
      const kind = (req.body.kind || "").trim();
      if (!KINDS.includes(kind)) {
        return errorEnvelope(res, 400, "bad_request", "Unbekannter Medientyp.");
      }
      if (!req.file)
        return errorEnvelope(
          res,
          400,
          "bad_request",
          "Keine Datei hochgeladen.",
        );
      if (req.file.size > MAX_SIZE[kind]) {
        return errorEnvelope(
          res,
          413,
          "too_large",
          "Datei überschreitet die Größenbeschränkung.",
        );
      }
      if (!ALLOWED_MIMES[kind].includes(req.file.mimetype)) {
        return errorEnvelope(
          res,
          415,
          "unsupported_type",
          "Dateityp nicht erlaubt.",
        );
      }

      const uuid = crypto.randomUUID();
      const dir = path.join(mediaRoot(), KIND_DIRS[kind], uuid);
      await ensureDir(dir);

      const variantsJson = {};
      let originalPath;

      if (req.file.mimetype === "image/svg+xml") {
        const sanitized = sanitizeSvg(req.file.buffer.toString("utf8"));
        originalPath = path.join(dir, "original.svg");
        await fs.promises.writeFile(originalPath, sanitized);
        variantsJson.svg = `/media/${KIND_DIRS[kind]}/${uuid}/original.svg`;
      } else {
        const ext = "webp";
        originalPath = path.join(dir, `original.${ext}`);
        const img = sharp(req.file.buffer, { failOn: "error" });
        const meta = await img.metadata();
        const makeVariant = async (v) => {
          const outPath = path.join(dir, `${v.key}.webp`);
          await sharp(req.file.buffer)
            .resize({ width: v.width, withoutEnlargement: true })
            .webp({ quality: 82 })
            .toFile(outPath);
          variantsJson[v.key] =
            `/media/${KIND_DIRS[kind]}/${uuid}/${v.key}.webp`;
        };
        await Promise.all(variantsFor(kind).map(makeVariant));
        // Fallback JPEG for news hero images, per ADR 0010.
        if (kind === "news") {
          const fallback = path.join(dir, "fallback.jpg");
          await sharp(req.file.buffer)
            .resize({
              width: Math.min(meta.width || 1600, 1600),
              withoutEnlargement: true,
            })
            .jpeg({ quality: 82 })
            .toFile(fallback);
          variantsJson.fallbackJpg = `/media/news/${uuid}/fallback.jpg`;
        }
        // Persist a canonical "original" webp so refcount/cleanup has a stable path.
        await sharp(req.file.buffer).webp({ quality: 90 }).toFile(originalPath);
      }

      const now = new Date().toISOString();
      const filename = req.file.originalname || null;
      const info = db
        .prepare(
          `INSERT INTO media (kind, original_path, variants_json, mime_type, original_filename, uploaded_at, uploaded_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          kind,
          originalPath,
          JSON.stringify(variantsJson),
          req.file.mimetype,
          filename,
          now,
          req.admin.id,
        );
      res.status(201).json({
        id: info.lastInsertRowid,
        kind,
        variants: variantsJson,
        mimeType: req.file.mimetype,
        filename,
        uploadedAt: now,
        uploadedBy: req.admin.email,
      });
    },
  );

  router.get("/:id", requireAuth, (req, res) => {
    const row = getStmt.get(Number(req.params.id));
    if (!row)
      return errorEnvelope(res, 404, "not_found", "Medium nicht gefunden.");
    res.json(rowToMedia(row));
  });

  router.delete("/:id", requireAuth, requireCsrf, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return errorEnvelope(res, 400, "bad_request", "Ungültige ID.");
    }
    const row = getStmt.get(id);
    if (!row)
      return errorEnvelope(res, 404, "not_found", "Medium nicht gefunden.");

    const refs = findReferrers(db, id);
    if (refs.length) {
      return res.status(409).json({
        code: "in_use",
        message: "Medium ist noch verknüpft und kann nicht gelöscht werden.",
        references: refs,
      });
    }

    db.prepare("DELETE FROM media WHERE id = ?").run(id);
    // Best-effort filesystem cleanup: the DB row is already gone, so log and
    // keep going if rm fails — an operator can reconcile orphaned dirs.
    const dir = path.dirname(row.original_path);
    try {
      await fs.promises.rm(dir, { recursive: true, force: true });
    } catch (err) {
      console.error("media file cleanup failed:", err);
    }
    res.status(204).end();
  });

  return router;
}
