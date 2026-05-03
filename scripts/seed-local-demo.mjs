// One-shot local seed: copies a handful of asset images into MEDIA_ROOT and
// inserts sponsor / vorstand / news rows so the public site renders with
// content during local dev.
//
// Run: DB_PATH=/tmp/clubsoft-local/app.db MEDIA_ROOT=/tmp/clubsoft-local/media \
//        node scripts/seed-local-demo.mjs

import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import Database from "better-sqlite3";

const DB_PATH = process.env.DB_PATH ?? "/tmp/clubsoft-local/app.db";
const MEDIA_ROOT = process.env.MEDIA_ROOT ?? "/tmp/clubsoft-local/media";
const REPO = path.resolve(import.meta.dirname, "..");

if (!fs.existsSync(DB_PATH)) {
  console.error(`DB not found at ${DB_PATH} — start server.mjs first.`);
  process.exit(1);
}

const db = new Database(DB_PATH);

function copyImage(srcRel, kind, ext) {
  const src = path.join(REPO, srcRel);
  if (!fs.existsSync(src)) throw new Error(`missing asset: ${src}`);
  const uuid = randomUUID();
  const dir = path.join(MEDIA_ROOT, kind, uuid);
  fs.mkdirSync(dir, { recursive: true });
  const filename = `original.${ext}`;
  fs.copyFileSync(src, path.join(dir, filename));
  return { uuid, ext, kind };
}

function insertMedia({ uuid, ext, kind }, mime) {
  const variants = {};
  const base = `/media/${kind === "vorstand" ? "vorstand" : kind === "sponsor" ? "sponsors" : "news"}/${uuid}`;
  // The publicData lookups try several keys; we point the most-likely-used
  // ones at the same single original.
  if (ext === "svg") {
    variants.svg = `${base}/original.svg`;
  } else {
    variants["1600w"] = `${base}/original.${ext}`;
    variants["800w"] = `${base}/original.${ext}`;
    variants["400w"] = `${base}/original.${ext}`;
    variants["320w"] = `${base}/original.${ext}`;
    variants["640w"] = `${base}/original.${ext}`;
    variants["160w"] = `${base}/original.${ext}`;
    variants["200w"] = `${base}/original.${ext}`;
    variants.fallbackJpg = `${base}/original.${ext}`;
  }
  const dirSeg = kind === "vorstand" ? "vorstand" : kind === "sponsor" ? "sponsors" : "news";
  const now = new Date().toISOString();
  const info = db
    .prepare(
      `INSERT INTO media (kind, original_path, variants_json, mime_type, original_filename, uploaded_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      kind,
      `/media/${dirSeg}/${uuid}/original.${ext}`,
      JSON.stringify(variants),
      mime,
      `original.${ext}`,
      now,
    );
  return Number(info.lastInsertRowid);
}

const now = new Date().toISOString();

// ---- Sponsors ----
const sponsorAssets = [
  { rel: "src/assets/logos/allianz.png", ext: "png", mime: "image/png", name: "Allianz", url: "https://www.allianz.de", palette: "transparent", weight: 80, ownBg: false },
  { rel: "src/assets/logos/bestattungengiebel.png", ext: "png", mime: "image/png", name: "Bestattungen Giebel", url: "https://www.giebel-bestattungen.de", palette: "warm-neutral", weight: 40, ownBg: true },
  { rel: "src/assets/logos/bikesportscheid.png", ext: "png", mime: "image/png", name: "Bikesport Scheid", url: "https://www.bikesport-scheid.de", palette: "transparent", weight: 30, ownBg: false },
  { rel: "src/assets/logos/falk.jpeg", ext: "jpeg", mime: "image/jpeg", name: "Falk", url: "https://example.com", palette: "warm-neutral", weight: 20, ownBg: true },
  { rel: "src/assets/logos/glaab.png", ext: "png", mime: "image/png", name: "Glaab", url: "https://example.com", palette: "transparent", weight: 60, ownBg: false },
  { rel: "src/assets/logos/grohs-thewes.png", ext: "png", mime: "image/png", name: "Grohs-Thewes", url: "https://example.com", palette: "transparent", weight: 50, ownBg: false },
  { rel: "src/assets/logos/hjm.png", ext: "png", mime: "image/png", name: "HJM", url: "https://example.com", palette: "transparent", weight: 25, ownBg: false },
  { rel: "src/assets/logos/horreum.png", ext: "png", mime: "image/png", name: "Horreum", url: "https://example.com", palette: "transparent", weight: 35, ownBg: false },
];

let order = 0;
for (const s of sponsorAssets) {
  const f = copyImage(s.rel, "sponsor", s.ext);
  const mediaId = insertMedia(f, s.mime);
  db.prepare(
    `INSERT INTO sponsors (
       name, tagline, link_url, logo_media_id, logo_has_own_background,
       card_palette, weight, status, display_order, created_at, updated_at
     ) VALUES (?, NULL, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
  ).run(s.name, s.url, mediaId, s.ownBg ? 1 : 0, s.palette, s.weight, ++order, now, now);
  console.log(`sponsor: ${s.name}`);
}

// ---- Vorstand ----
const portraitCandidates = [
  "src/assets/annetreib.jpeg",
  "src/assets/bruno.png",
  "src/assets/britz.png",
];
const vorstandPeople = [
  { name: "Anne Treib", role: "1. Vorsitzende", email: "anne.treib@example.com", phone: "0151 0000 0001" },
  { name: "Bruno Müller", role: "Stellv. Vorsitzender", email: "bruno@example.com", phone: "0151 0000 0002" },
  { name: "Christian Britz", role: "Kassenwart", email: "britz@example.com", phone: "0151 0000 0003" },
  { name: "Anna Treib", role: "Schriftführerin", email: "anna@example.com", phone: "0151 0000 0004" },
  { name: "Bernd Bruno", role: "Jugendleiter", email: "jugend@example.com", phone: "0151 0000 0005" },
  { name: "Cara Britz", role: "Beisitzerin", email: "beisitz@example.com", phone: "0151 0000 0006" },
];

order = 0;
for (let i = 0; i < vorstandPeople.length; i++) {
  const p = vorstandPeople[i];
  const portraitPath = portraitCandidates[i % portraitCandidates.length];
  const ext = portraitPath.endsWith(".png") ? "png" : "jpeg";
  const mime = ext === "png" ? "image/png" : "image/jpeg";
  const f = copyImage(portraitPath, "vorstand", ext);
  const mediaId = insertMedia(f, mime);
  db.prepare(
    `INSERT INTO vorstand (
       name, role, email, phone, portrait_media_id, notes, status, display_order, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, NULL, 'active', ?, ?, ?)`,
  ).run(p.name, p.role, p.email, p.phone, mediaId, ++order, now, now);
  console.log(`vorstand: ${p.name}`);
}

// ---- News ----
const newsImages = [
  "src/assets/background.svg",
  "src/assets/annetreib.jpeg",
  "src/assets/bruno.png",
  "src/assets/britz.png",
];
const newsItems = [
  { slug: "saisonstart-2026", title: "Saisonstart 2026: Alle Mannschaften zurück auf dem Platz", tag: "MANNSCHAFT", short: "Nach kurzer Sommerpause läuft das Training wieder. Alle Teams stehen bereit für die neue Spielzeit." },
  { slug: "auswaertssieg-bezirksliga", title: "Verdienter Auswärtssieg in der Bezirksliga", tag: "SPIELBERICHT", short: "Konzentrierte Leistung über 90 Minuten — drei Punkte und ein Plus auf dem Konto." },
  { slug: "jugendcup-erfolg", title: "Jugendcup: Bambini holen Bronze", tag: "JUGEND", short: "Mit großer Begeisterung kämpften unsere Jüngsten um jeden Ball." },
  { slug: "neuer-trainer", title: "Neuer Trainer für die Herrenmannschaft", tag: "PERSONAL", short: "Mit frischer Energie und klarer Spielidee starten wir in die Rückrunde." },
  { slug: "spendenaktion", title: "Spendenaktion für neuen Trainingsplatz", tag: "VEREIN", short: "Jede Mark zählt — gemeinsam machen wir den neuen Platz möglich." },
  { slug: "sommerfest-rueckblick", title: "Sommerfest 2025: Ein voller Erfolg", tag: "FESTLICHKEIT", short: "Beste Stimmung, leckeres Essen und viele zufriedene Gesichter." },
];

const longHtml = `<p>Dies ist ein Demo-Artikel. Der Inhalt wird im Admin gepflegt und kann beliebig viele Absätze, Zwischenüberschriften und Listen enthalten.</p><h2>Hintergrund</h2><p>Hier stehen die Details zum Ereignis. Die Vereins-Website rendert diesen Block als typografisch sauberes Long-Read-Layout.</p><ul><li>Ein erster Punkt</li><li>Ein zweiter Punkt</li><li>Und ein dritter</li></ul><p>Mehr unter <a href="/">Startseite</a>.</p>`;

for (let i = 0; i < newsItems.length; i++) {
  const n = newsItems[i];
  const heroPath = newsImages[i % newsImages.length];
  const ext = heroPath.endsWith(".png") ? "png" : heroPath.endsWith(".svg") ? "svg" : "jpeg";
  const mime = ext === "png" ? "image/png" : ext === "svg" ? "image/svg+xml" : "image/jpeg";
  const f = copyImage(heroPath, "news", ext);
  const mediaId = insertMedia(f, mime);
  const publishAt = new Date(Date.now() - i * 86400000 * 5).toISOString();
  db.prepare(
    `INSERT INTO news (
       slug, title, tag, short, long_html, hero_media_id,
       status, publish_at, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, 'published', ?, ?, ?)`,
  ).run(n.slug, n.title, n.tag, n.short, longHtml, mediaId, publishAt, now, now);
  console.log(`news: ${n.slug}`);
}

console.log("seed complete.");
