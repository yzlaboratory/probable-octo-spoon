import { CLUB_SHORT } from "./club";

/**
 * Map the current admin URL path to a list of breadcrumb labels. Strategy is
 * intentionally simple: walk the pathname segments and look them up in a small
 * table. Unknown segments fall through as-is so deep-links still render sanely.
 */
const SEGMENT_LABELS: Record<string, string> = {
  admin: CLUB_SHORT,
  news: "News",
  sponsors: "Sponsoren",
  vorstand: "Vorstand",
  admins: "Administratoren",
  new: "Neu",
  events: "Termine",
  media: "Mediathek",
  members: "Mitglieder",
  public: "Website-Vorschau",
};

export function breadcrumbsFor(pathname: string): string[] {
  const segments = pathname.split("/").filter(Boolean);
  // The admin root alone still deserves a meaningful crumb.
  if (segments.length === 0) return [CLUB_SHORT];

  const crumbs: string[] = [];
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const known = SEGMENT_LABELS[seg];
    if (known) {
      crumbs.push(known);
      continue;
    }
    // Numeric ids → "Bearbeiten" to avoid surfacing raw ids as crumbs.
    if (/^\d+$/.test(seg)) {
      crumbs.push("Bearbeiten");
      continue;
    }
    crumbs.push(seg);
  }
  return crumbs;
}
