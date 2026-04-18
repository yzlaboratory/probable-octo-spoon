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

function variantsFor(kind) {
  if (kind === "news") return NEWS_VARIANTS;
  if (kind === "sponsor") return SPONSOR_VARIANTS;
  if (kind === "vorstand") return VORSTAND_VARIANTS;
  throw new Error("unknown kind");
}

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true });
}

export default function mediaRoutes(db) {
  const router = express.Router();
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
  });

  router.post("/", requireAuth, requireCsrf, upload.single("file"), async (req, res) => {
    const kind = (req.body.kind || "").trim();
    if (!["news", "sponsor", "vorstand"].includes(kind)) {
      return errorEnvelope(res, 400, "bad_request", "Unbekannter Medientyp.");
    }
    if (!req.file) return errorEnvelope(res, 400, "bad_request", "Keine Datei hochgeladen.");
    if (req.file.size > MAX_SIZE[kind]) {
      return errorEnvelope(res, 413, "too_large", "Datei überschreitet die Größenbeschränkung.");
    }
    if (!ALLOWED_MIMES[kind].includes(req.file.mimetype)) {
      return errorEnvelope(res, 415, "unsupported_type", "Dateityp nicht erlaubt.");
    }

    const uuid = crypto.randomUUID();
    const dir = path.join(mediaRoot(), kind === "news" ? "news" : kind === "sponsor" ? "sponsors" : "vorstand", uuid);
    await ensureDir(dir);

    const variantsJson = {};
    let originalPath;

    if (req.file.mimetype === "image/svg+xml") {
      const sanitized = sanitizeSvg(req.file.buffer.toString("utf8"));
      originalPath = path.join(dir, "original.svg");
      await fs.promises.writeFile(originalPath, sanitized);
      variantsJson.svg = `/media/${kind === "news" ? "news" : kind === "sponsor" ? "sponsors" : "vorstand"}/${uuid}/original.svg`;
    } else {
      const ext = "webp";
      originalPath = path.join(dir, `original.${ext}`);
      const img = sharp(req.file.buffer, { failOn: "error" });
      const meta = await img.metadata();
      const makeVariant = async (v) => {
        const outPath = path.join(dir, `${v.key}.webp`);
        await sharp(req.file.buffer).resize({ width: v.width, withoutEnlargement: true }).webp({ quality: 82 }).toFile(outPath);
        variantsJson[v.key] = `/media/${kind === "news" ? "news" : kind === "sponsor" ? "sponsors" : "vorstand"}/${uuid}/${v.key}.webp`;
      };
      await Promise.all(variantsFor(kind).map(makeVariant));
      // Fallback JPEG for news hero images, per ADR 0010.
      if (kind === "news") {
        const fallback = path.join(dir, "fallback.jpg");
        await sharp(req.file.buffer)
          .resize({ width: Math.min(meta.width || 1600, 1600), withoutEnlargement: true })
          .jpeg({ quality: 82 })
          .toFile(fallback);
        variantsJson.fallbackJpg = `/media/news/${uuid}/fallback.jpg`;
      }
      // Persist a canonical "original" webp so refcount/cleanup has a stable path.
      await sharp(req.file.buffer).webp({ quality: 90 }).toFile(originalPath);
    }

    const now = new Date().toISOString();
    const info = db
      .prepare(
        `INSERT INTO media (kind, original_path, variants_json, mime_type, uploaded_at, uploaded_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(kind, originalPath, JSON.stringify(variantsJson), req.file.mimetype, now, req.admin.id);
    res.status(201).json({
      id: info.lastInsertRowid,
      kind,
      variants: variantsJson,
      mimeType: req.file.mimetype,
    });
  });

  router.get("/:id", requireAuth, (req, res) => {
    const row = db.prepare("SELECT * FROM media WHERE id = ?").get(Number(req.params.id));
    if (!row) return errorEnvelope(res, 404, "not_found", "Medium nicht gefunden.");
    res.json({
      id: row.id,
      kind: row.kind,
      mimeType: row.mime_type,
      variants: JSON.parse(row.variants_json),
      uploadedAt: row.uploaded_at,
    });
  });

  return router;
}
