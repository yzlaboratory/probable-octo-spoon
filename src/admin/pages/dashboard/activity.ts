import type { News, Sponsor, Vorstand } from "../../types";

export type ActivityKind = "news" | "sponsor" | "vorstand";

export interface ActivityItem {
  kind: ActivityKind;
  /** Display name of the entity ("Meldung", "Sponsor", "Vorstand"). */
  noun: string;
  /** Human-meaningful name of the touched record. */
  title: string;
  /** ISO timestamp from updatedAt, used for sort + relative-time rendering. */
  at: string;
  /** Admin route to jump to the entity. */
  href: string;
}

/**
 * Merge updatedAt timestamps from News, Sponsors, and Vorstand into a single
 * activity feed sorted newest-first. We don't track who-did-what today, so the
 * feed is "what changed and when" only.
 *
 * `limit` caps the result length (default 10). Pass `Infinity` for all.
 */
export function mergeActivity(
  news: News[],
  sponsors: Sponsor[],
  vorstand: Vorstand[],
  limit: number = 10,
): ActivityItem[] {
  const items: ActivityItem[] = [];

  for (const n of news) {
    items.push({
      kind: "news",
      noun: "Meldung",
      title: n.title,
      at: n.updatedAt,
      href: `/admin/news/${n.id}`,
    });
  }
  for (const s of sponsors) {
    items.push({
      kind: "sponsor",
      noun: "Sponsor",
      title: s.name,
      at: s.updatedAt,
      href: `/admin/sponsors/${s.id}`,
    });
  }
  for (const v of vorstand) {
    items.push({
      kind: "vorstand",
      noun: "Vorstand",
      title: v.name,
      at: v.updatedAt,
      href: `/admin/vorstand`,
    });
  }

  items.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  return items.slice(0, limit);
}
