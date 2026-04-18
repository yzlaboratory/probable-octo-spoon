#!/usr/bin/env node
// One-time backfill of the legacy hardcoded data into the admin DB.
//
// Idempotent: safe to re-run. Skips rows whose natural key already exists
// (news by slug, sponsors by name, vorstand by name+role).
//
// Usage:
//   DB_PATH=./local.db MEDIA_ROOT=./local-media node scripts/backfill.mjs
//
// Reads:
//   src/data/news.json          (with imageurl paths like /src/assets/foo.jpg)
//   src/assets/**               (source files for news images, sponsor logos, portraits)

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { openDb, dbPath, mediaRoot } from "../server/db.mjs";
import { sanitizeNewsHtml, sanitizeSvg } from "../server/sanitize.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ASSETS = path.join(ROOT, "src", "assets");

const PALETTE_MAP = {
  "bg-neutral-600": "cool-neutral",
  "bg-zinc-100": "cool-neutral",
  "bg-rose-200": "warm-neutral",
  "bg-yellow-300": "warm-neutral",
};
const DEFAULT_PALETTE = "transparent";

function readAsset(rel) {
  const abs = path.join(ASSETS, rel);
  if (!fs.existsSync(abs)) throw new Error(`missing asset: ${abs}`);
  return { abs, buffer: fs.readFileSync(abs) };
}

async function writeVariants(kind, buffer, mimeType) {
  const uuid = crypto.randomUUID();
  const dir = path.join(mediaRoot(), kind === "sponsor" ? "sponsors" : kind, uuid);
  fs.mkdirSync(dir, { recursive: true });
  const variants = {};
  let originalPath;
  let finalMime = mimeType;

  if (mimeType === "image/svg+xml") {
    const svg = sanitizeSvg(buffer.toString("utf8"));
    originalPath = path.join(dir, "original.svg");
    fs.writeFileSync(originalPath, svg);
    variants.svg = `/media/${kind === "sponsor" ? "sponsors" : kind}/${uuid}/original.svg`;
  } else {
    const sizes =
      kind === "news"
        ? [["400w", 400], ["800w", 800], ["1600w", 1600]]
        : kind === "sponsor"
          ? [["200w", 200], ["400w", 400]]
          : [["160w", 160], ["320w", 320], ["640w", 640]];
    for (const [key, width] of sizes) {
      const out = path.join(dir, `${key}.webp`);
      // eslint-disable-next-line no-await-in-loop
      await sharp(buffer).resize({ width, withoutEnlargement: true }).webp({ quality: 82 }).toFile(out);
      variants[key] = `/media/${kind === "sponsor" ? "sponsors" : kind}/${uuid}/${key}.webp`;
    }
    if (kind === "news") {
      const fb = path.join(dir, "fallback.jpg");
      await sharp(buffer).resize({ width: 1600, withoutEnlargement: true }).jpeg({ quality: 82 }).toFile(fb);
      variants.fallbackJpg = `/media/news/${uuid}/fallback.jpg`;
    }
    originalPath = path.join(dir, "original.webp");
    await sharp(buffer).webp({ quality: 90 }).toFile(originalPath);
    finalMime = "image/webp";
  }
  return { originalPath, variants, mimeType: finalMime };
}

async function ingestMedia(db, kind, filename) {
  const ext = path.extname(filename).toLowerCase();
  const mime =
    ext === ".svg" ? "image/svg+xml"
    : ext === ".png" ? "image/png"
    : ext === ".webp" ? "image/webp"
    : "image/jpeg";
  const asset = readAsset(filename);
  const { originalPath, variants, mimeType } = await writeVariants(kind, asset.buffer, mime);
  const now = new Date().toISOString();
  const info = db
    .prepare(
      `INSERT INTO media (kind, original_path, variants_json, mime_type, uploaded_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(kind, originalPath, JSON.stringify(variants), mimeType, now);
  return Number(info.lastInsertRowid);
}

function plainTextToHtml(s) {
  // Split on blank lines (explicit paragraphs) and single newlines (line breaks
  // that should still behave like paragraph breaks for the old freeform style).
  const paragraphs = s
    .split(/\n\s*\n|\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`)
    .join("");
  return sanitizeNewsHtml(paragraphs);
}

// -------- News --------
async function backfillNews(db) {
  const newsJson = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts/fixtures/news.json"), "utf8"));
  let inserted = 0;
  for (const item of newsJson) {
    const slug = item.path;
    const exists = db.prepare("SELECT id FROM news WHERE slug = ?").get(slug);
    if (exists) {
      console.log(`  [skip] news ${slug}`);
      continue;
    }
    const file = item.imageurl.replace(/^\/src\/assets\//, "");
    // eslint-disable-next-line no-await-in-loop
    const mediaId = await ingestMedia(db, "news", file);
    const publishAt = new Date(item.date).toISOString();
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO news (slug, title, tag, short, long_html, hero_media_id,
         status, publish_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'published', ?, ?, ?)`,
    ).run(
      slug,
      item.title,
      item.tag,
      item.short,
      plainTextToHtml(item.long),
      mediaId,
      publishAt,
      now,
      now,
    );
    inserted += 1;
    console.log(`  [ok]   news ${slug}`);
  }
  console.log(`news: ${inserted} inserted`);
}

// -------- Sponsors --------
const SPONSORS = [
  // Active (currently uncommented in src/utilities/sponsors.ts).
  { name: "Getränke Falk", tagline: "seit 1927", link: "https://www.xn--getrnke-falk-jcb.de/", file: "logos/falk.jpeg", hasBg: true, weight: 50, status: "active" },
  { name: "Kempf Aussenanlagen", tagline: "Garten- & Landschaftsbau", link: "https://kempf-gmbh.com/", file: "logos/kempf.png", hasBg: true, weight: 50, status: "active" },
  { name: "Erik Kirchen", tagline: "Stuckateurmeister", link: "https://kirchen-stuckateur.de/", file: "logos/kirchen.png", hasBg: true, weight: 50, status: "active" },
  { name: "LS", tagline: "Heizung & Sanitär", link: "https://www.ls-heizung.de/", file: "logos/ls.png", hasBg: true, weight: 50, status: "active" },
  { name: "MB Fischhaus", tagline: "Meeresspezialitäten", link: "https://www.mb-fischhaus.de/", file: "logos/mbfischhaus.png", hasBg: true, weight: 50, status: "active" },
  { name: "Metallbau Walter", tagline: "Spenglerei seit 1956", link: "https://www.metallbau-walter.info/", file: "metallbauwalter.jpg", hasBg: true, weight: 50, status: "active" },
  { name: "Beerdigunsinstitut Rack", tagline: "Tradition seit 20 Jahren", link: "https://beerdigungsinstitut-rack.de/", file: "logos/paulrack.png", hasBg: true, weight: 50, status: "active" },
  { name: "Reis & Wilhelm", tagline: "Fliesenleger in der 3. Generation", link: "https://www.reis-wilhelm.de/", file: "logos/reis.png", hasBg: true, weight: 50, status: "active" },
  { name: "Schmitt Food", tagline: "Qualität seit 1893", link: "https://www.schmitt-food.net/", file: "schmittfood.jpg", hasBg: true, weight: 50, status: "active" },
  { name: "Gasthaus Grohs-Thewes", tagline: "Tradition seit 1905", link: "https://www.grohs-thewes.de/", file: "logos/grohs-thewes.png", hasBg: true, weight: 50, status: "active", color: "bg-rose-200" },
  { name: "Zimmer & Schu Gmbh", tagline: "Ihr kompetenter Auto-Service", link: "https://www.zsmobile.de/", file: "logos/zimmerundschu.png", hasBg: true, weight: 50, status: "active" },
  { name: "Gasthaus zur Starz", tagline: "Dörsdorf", link: "https://www.tripadvisor.de/Restaurant_Review-g1081425-d14989641-Reviews-Gasthaus_zur_Starz-Lebach_Saarland.html", file: "logos/starz.png", hasBg: true, weight: 50, status: "active" },
  { name: "Bestattungen Giebel", tagline: "Zur Erzkaul 1, Thalexweiler", link: "https://www.thalexweiler.de/portfolio-item/bestattungen-giebel/", file: "logos/bestattungengiebel.png", hasBg: true, weight: 50, status: "active" },
  { name: "HaArTrium", tagline: "Mühlenstr. 29, Thalexweiler", link: "https://www.thalexweiler.de/portfolio-item/at-haartrium/", file: "logos/haartrium.jpeg", hasBg: true, weight: 50, status: "active" },
  { name: "Sandra Maione", tagline: "Friseursalon", link: "https://branchenbuch.meinestadt.de/schmelz/company/500036897", file: "logo.svg", hasBg: true, weight: 50, status: "active" },
  { name: "Anne Treib", tagline: "Buch & Papier", link: "https://www.anne-treib.de/", file: "annetreib.jpeg", hasBg: true, weight: 50, status: "active" },
  { name: "Tankstelle Zimmer", tagline: "Freie Tankstelle", link: "https://www.zsmobile.de/", file: "logos/tankstellezimmer.png", hasBg: true, weight: 50, status: "active" },
  { name: "Hans-Jürgen Müller", tagline: "Sachverständiger", link: "https://www.sachverstaendiger-mueller.de/index.html", file: "logos/hjm.png", hasBg: true, weight: 50, status: "active" },
  { name: "Rieker Physiotherapie", tagline: "Mühlenstr. 57, Thalexweiler", link: "https://www.thalexweiler.de/portfolio-item/rieker-physiotherapie/", file: "logos/rieker.png", hasBg: true, weight: 50, status: "active" },
  { name: "Obbo", tagline: null, link: "https://www.obbo.de/", file: "obbo.svg", hasBg: true, weight: 50, status: "active" },

  // Archived (currently commented out — former or pending partners).
  { name: "Udo Andres", tagline: "ALLIANZ Generalvertretung", link: "https://vertretung.allianz.de/udo.andres/", file: "allianz.svg", weight: 10, status: "archived" },
  { name: "BBL Mietservice", tagline: "Baumaschinenvermietung", link: "https://www.bbl-baumaschinen.de/mietservice", file: "bbl.png", weight: 10, status: "archived", color: "bg-neutral-600" },
  { name: "Bikesport Scheid", tagline: "Profi in Sachen Fahrradsport", link: "https://www.bikesport-scheid.de/", file: "bikesport.png", weight: 10, status: "archived" },
  { name: "Sporthaus Glaab", tagline: "Teamsportspezialist an der Saar", link: "https://sporthaus-glaab.de/", file: "glaab.png", weight: 10, status: "archived" },
  { name: "Holzhauser GmBH", tagline: "Baumaschinen Vermietung & Verkauf", link: "https://www.holzhauser.info/", file: "holzhauser.svg", hasBg: true, weight: 10, status: "archived" },
  { name: "Michael Schmidt", tagline: "Malermeister", link: "https://www.malerschmidt.eu/", file: "malermeisterschmitd.png", weight: 10, status: "archived", color: "bg-zinc-100" },
  { name: "Opticland", tagline: "die Brille", link: "https://www.opticland-die-brille.de/", file: "opticland.png", weight: 10, status: "archived", color: "bg-yellow-300" },
  { name: "Autohaus Reitenbach", tagline: "50 Jahre GmbH", link: "https://www.mercedes-benz-reitenbach.de/", file: "reitenbach.jpg", hasBg: true, weight: 10, status: "archived" },
  { name: "Baustoffe Rosport", tagline: "Bauen Sie auf uns", link: "https://www.baustoffe-rosport.de/", file: "rosport.jpg", hasBg: true, weight: 10, status: "archived" },
  { name: "Saar-Mosel Baumaschinen", tagline: "von Spezialisten für Spezialisten", link: "https://www.saar-mosel-baumaschinen.de/", file: "saarmoselbaumaschinen.svg", weight: 10, status: "archived" },
  { name: "Gartenbau Waigel", tagline: "Gestaltung & Pflege", link: "https://www.gartenbau-waigel.de/", file: "waigel.png", weight: 10, status: "archived" },
  { name: "Hermann", tagline: "Friseur", link: "https://g.co/kgs/YZukj1n", file: "hermann.jpeg", hasBg: true, weight: 10, status: "archived" },
];

async function backfillSponsors(db) {
  let inserted = 0;
  for (const s of SPONSORS) {
    const exists = db.prepare("SELECT id FROM sponsors WHERE name = ?").get(s.name);
    if (exists) {
      console.log(`  [skip] sponsor ${s.name}`);
      continue;
    }
    // eslint-disable-next-line no-await-in-loop
    const mediaId = await ingestMedia(db, "sponsor", s.file);
    const palette = s.color ? (PALETTE_MAP[s.color] ?? DEFAULT_PALETTE) : DEFAULT_PALETTE;
    const maxOrder = db.prepare("SELECT MAX(display_order) AS m FROM sponsors").get();
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO sponsors (
         name, tagline, link_url, logo_media_id, logo_has_own_background,
         card_palette, weight, status, display_order, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      s.name,
      s.tagline ?? null,
      s.link,
      mediaId,
      s.hasBg ? 1 : 0,
      palette,
      s.weight,
      s.status,
      (maxOrder?.m ?? 0) + 1,
      now,
      now,
    );
    inserted += 1;
    console.log(`  [ok]   sponsor ${s.name} (${s.status})`);
  }
  console.log(`sponsors: ${inserted} inserted`);
}

// -------- Vorstand --------
// Portraits are optional — members whose prior entry used the club logo get null,
// and the public renderer falls back to the crest (ADR 0012).
const VORSTAND = [
  { name: "Björn Perius", role: "Präsident", email: "b.perius@gmx.de", phone: "0177 3448 469", file: null },
  { name: "Christian Schwirz", role: "Präsident", email: "christian.schwirz@evs.de", phone: "0178 8094 579", file: null },
  { name: "Matthias Heinrich", role: "Geschäftsführer", email: "matze234@t-online.de", phone: "0151 1560 7391", file: "matzeheinrich.png" },
  { name: "Yannik Zeyer", role: "Schatzmeister", email: "finanzen@svthalexweiler.de", phone: "0151 2222 8048", file: null },
  { name: "Benno Bohliner", role: "Haushaltsausschuss", email: "bohlinger-bauideen@t-online.de", phone: "0177 6559 401", file: null },
  { name: "Mathias Zöhler", role: "Spielausschuss", email: "mathiaszoehler@aol.com", phone: "0163 4337 073", file: "zoehler.png" },
  { name: "Pascal Herre", role: "Jugendausschuss", email: "pascal.herre86@gmail.com", phone: "0179 5087 849", file: null },
  { name: "Dennis Hurth", role: "Festausschuss", email: "de-hurth@t-online.de", phone: "0151 5258 5535", file: "hurthi.png" },
  { name: "Markus Leinenbach", role: "Bau- & Betriebsausschuss", email: "markusleinenbach@gmx.de", phone: "0151 6511 9495", file: null },
  { name: "Holger Saar", role: "Vorsitzender AH Abteilung", email: "Holger.Saar@web.de", phone: "0152 2661 7025", file: "holgersaar.png" },
  { name: "Nicolas Heinrich", role: "Spielausschuss", email: "nicolas.heinrich@gmx.de", phone: "0170 9624 109", file: "nicolas.png" },
  { name: "Andre Seewald", role: "AH Abteilung", email: "andreseewald@gmx.de", phone: "0171 3635 521", file: null },
];

async function backfillVorstand(db) {
  let inserted = 0;
  for (const m of VORSTAND) {
    const exists = db
      .prepare("SELECT id FROM vorstand WHERE name = ? AND role = ?")
      .get(m.name, m.role);
    if (exists) {
      console.log(`  [skip] vorstand ${m.name}`);
      continue;
    }
    let mediaId = null;
    if (m.file) {
      // eslint-disable-next-line no-await-in-loop
      mediaId = await ingestMedia(db, "vorstand", m.file);
    }
    const maxOrder = db.prepare("SELECT MAX(display_order) AS m FROM vorstand").get();
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO vorstand (
         name, role, email, phone, portrait_media_id, status, display_order,
         created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
    ).run(m.name, m.role, m.email, m.phone, mediaId, (maxOrder?.m ?? 0) + 1, now, now);
    inserted += 1;
    console.log(`  [ok]   vorstand ${m.name}`);
  }
  console.log(`vorstand: ${inserted} inserted`);
}

async function main() {
  fs.mkdirSync(path.dirname(dbPath()), { recursive: true });
  fs.mkdirSync(mediaRoot(), { recursive: true });
  const db = openDb(dbPath());
  console.log(`DB:    ${dbPath()}`);
  console.log(`Media: ${mediaRoot()}\n`);
  await backfillNews(db);
  console.log();
  await backfillSponsors(db);
  console.log();
  await backfillVorstand(db);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
