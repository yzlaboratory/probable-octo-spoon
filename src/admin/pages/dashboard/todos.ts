import type { News, Sponsor, Vorstand } from "../../types";

export type TodoKind = "news-draft" | "sponsor-expiring" | "vorstand-portrait";

export interface TodoItem {
  kind: TodoKind;
  /** Tag pill label ("News" | "Sponsor" | "Vorstand"). */
  tag: string;
  /** Headline shown on the row. */
  label: string;
  /** Smaller meta line under the label — explains why this is on the list. */
  meta: string;
  /** CTA text and the route the row should link to. */
  action: string;
  href: string;
  /** Used to color the tag pill; chosen to mirror the prototype. */
  tone: "accent" | "warn" | "tertiary";
  /** Sort key — lower numbers come first; allows urgent items to bubble up. */
  rank: number;
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/**
 * Build a derived to-do list from current entity state. The dashboard is the
 * only consumer; helpers stay pure so they're easy to unit-test.
 *
 * Rules:
 *   - News in `draft` for more than 24h → "Prüfen & veröffentlichen"
 *   - Sponsors with `activeUntil` ≤ 30 days away (or already past) → review
 *   - Vorstand active members without a portrait → upload a photo
 *
 * Items are returned sorted by urgency (rank ascending) and capped at `limit`.
 */
export function deriveTodos(
  news: News[],
  sponsors: Sponsor[],
  vorstand: Vorstand[],
  now: Date = new Date(),
  limit: number = 5,
): TodoItem[] {
  const items: TodoItem[] = [];
  const nowMs = now.getTime();

  for (const n of news) {
    if (n.status !== "draft") continue;
    const updated = new Date(n.updatedAt).getTime();
    const ageHours = (nowMs - updated) / HOUR;
    if (ageHours < 24) continue;
    items.push({
      kind: "news-draft",
      tag: "News",
      label: n.title || "(ohne Titel)",
      meta: `Entwurf seit ${Math.round(ageHours / 24)} T.`,
      action: "Prüfen & veröffentlichen",
      href: `/admin/news/${n.id}`,
      tone: "accent",
      // Older drafts rank lower (more urgent).
      rank: -ageHours,
    });
  }

  for (const s of sponsors) {
    if (s.status !== "active" || !s.activeUntil) continue;
    const ends = new Date(s.activeUntil).getTime();
    const daysLeft = Math.round((ends - nowMs) / DAY);
    if (daysLeft > 30) continue;
    const meta =
      daysLeft < 0
        ? `Vertrag abgelaufen vor ${Math.abs(daysLeft)} T.`
        : daysLeft === 0
          ? "Vertrag läuft heute aus"
          : `Vertrag läuft in ${daysLeft} T. aus`;
    items.push({
      kind: "sponsor-expiring",
      tag: "Sponsor",
      label: s.name,
      meta,
      action: "Verlängern oder archivieren",
      href: `/admin/sponsors/${s.id}`,
      tone: "warn",
      // Already-expired and soon-expiring rank first.
      rank: daysLeft,
    });
  }

  for (const v of vorstand) {
    if (v.status !== "active" || v.portrait) continue;
    items.push({
      kind: "vorstand-portrait",
      tag: "Vorstand",
      label: `Portrait für ${v.name} fehlt`,
      meta: "Ein Platzhalter wird angezeigt",
      action: "Hochladen",
      href: `/admin/vorstand`,
      tone: "tertiary",
      // Use displayOrder so the list is at least deterministic.
      rank: 100 + v.displayOrder,
    });
  }

  items.sort((a, b) => a.rank - b.rank);
  return items.slice(0, limit);
}
