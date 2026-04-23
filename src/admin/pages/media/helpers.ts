import type { Media, MediaKind } from "../../types";

export type KindFilter = "all" | MediaKind;

export const KIND_LABEL: Record<MediaKind, string> = {
  news: "News",
  sponsor: "Sponsor",
  vorstand: "Vorstand",
};

// Every upload path stores at least one variant, but which keys exist depends
// on kind (news: 400/800/1600 + fallbackJpg, sponsor: 200/400 or svg, vorstand:
// 160/320/640). Prefer the smallest for grid thumbnails to keep the page light.
const THUMB_PRIORITY = [
  "160w",
  "200w",
  "320w",
  "400w",
  "640w",
  "800w",
  "svg",
  "fallbackJpg",
  "1600w",
];
const PREVIEW_PRIORITY = [
  "800w",
  "640w",
  "400w",
  "320w",
  "200w",
  "svg",
  "fallbackJpg",
  "1600w",
  "160w",
];
const COPY_PRIORITY = [
  "1600w",
  "800w",
  "640w",
  "400w",
  "320w",
  "200w",
  "svg",
  "fallbackJpg",
  "160w",
];

function firstMatch(variants: Record<string, string>, priority: string[]) {
  for (const key of priority) {
    const v = variants[key];
    if (v) return v;
  }
  return Object.values(variants)[0] ?? null;
}

export function thumbUrl(m: Media): string | null {
  return firstMatch(m.variants, THUMB_PRIORITY);
}

export function previewUrl(m: Media): string | null {
  return firstMatch(m.variants, PREVIEW_PRIORITY);
}

/** Largest available — what "Link kopieren" should hand to the clipboard. */
export function bestUrl(m: Media): string | null {
  return firstMatch(m.variants, COPY_PRIORITY);
}

/** Human-readable short label for the mime type. */
export function mimeLabel(mime: string): string {
  if (mime === "image/svg+xml") return "SVG";
  if (mime === "image/webp") return "WebP";
  if (mime === "image/jpeg") return "JPEG";
  if (mime === "image/png") return "PNG";
  return mime.replace(/^image\//, "").toUpperCase();
}

/** Filename for display. Falls back to `Medium #<id>` when missing. */
export function displayName(m: Media): string {
  return m.filename?.trim() || `Medium #${m.id}`;
}

export interface MediaKpis {
  total: number;
  news: number;
  sponsor: number;
  vorstand: number;
}

export function kpis(list: readonly Media[]): MediaKpis {
  let news = 0;
  let sponsor = 0;
  let vorstand = 0;
  for (const m of list) {
    if (m.kind === "news") news += 1;
    else if (m.kind === "sponsor") sponsor += 1;
    else if (m.kind === "vorstand") vorstand += 1;
  }
  return { total: list.length, news, sponsor, vorstand };
}

/**
 * Client-side filter used by the Mediathek. Case-insensitive, matches against
 * filename and mime label so "svg" finds sponsor logos even without a filename.
 */
export function filterMedia(
  list: readonly Media[],
  kind: KindFilter,
  query: string,
): Media[] {
  const q = query.trim().toLowerCase();
  return list.filter((m) => {
    if (kind !== "all" && m.kind !== kind) return false;
    if (!q) return true;
    const name = (m.filename ?? "").toLowerCase();
    const mime = mimeLabel(m.mimeType).toLowerCase();
    return name.includes(q) || mime.includes(q);
  });
}
