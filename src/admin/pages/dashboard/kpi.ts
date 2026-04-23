import type { News, Sponsor, Vorstand } from "../../types";

export interface NewsKpi {
  published: number;
  drafts: number;
  scheduled: number;
  withdrawn: number;
}

export interface SponsorKpi {
  active: number;
  paused: number;
  archived: number;
}

export interface VorstandKpi {
  active: number;
  withoutPortrait: number;
}

export function newsKpi(news: News[]): NewsKpi {
  const k: NewsKpi = { published: 0, drafts: 0, scheduled: 0, withdrawn: 0 };
  for (const n of news) {
    if (n.status === "published") k.published++;
    else if (n.status === "draft") k.drafts++;
    else if (n.status === "scheduled") k.scheduled++;
    else if (n.status === "withdrawn") k.withdrawn++;
  }
  return k;
}

export function sponsorKpi(sponsors: Sponsor[]): SponsorKpi {
  const k: SponsorKpi = { active: 0, paused: 0, archived: 0 };
  for (const s of sponsors) {
    if (s.status === "active") k.active++;
    else if (s.status === "paused") k.paused++;
    else if (s.status === "archived") k.archived++;
  }
  return k;
}

export function vorstandKpi(vorstand: Vorstand[]): VorstandKpi {
  const k: VorstandKpi = { active: 0, withoutPortrait: 0 };
  for (const v of vorstand) {
    if (v.status !== "active") continue;
    k.active++;
    if (!v.portrait) k.withoutPortrait++;
  }
  return k;
}

/** Formatted subline for the News KPI card. */
export function newsSubline(k: NewsKpi): string {
  const bits: string[] = [];
  if (k.scheduled > 0) bits.push(`+${k.scheduled} geplant`);
  if (k.drafts > 0) bits.push(`${k.drafts} ${k.drafts === 1 ? "Entwurf" : "Entwürfe"}`);
  if (bits.length === 0) return "Alles veröffentlicht";
  return bits.join(" · ");
}

export function sponsorSubline(k: SponsorKpi): string {
  const bits: string[] = [];
  bits.push(`${k.paused} pausiert`);
  bits.push(`${k.archived} archiviert`);
  return bits.join(" · ");
}

export function vorstandSubline(k: VorstandKpi): string {
  if (k.active === 0) return "Keine aktiven Mitglieder";
  if (k.withoutPortrait === 0) return "vollständig · alle mit Foto";
  return `${k.withoutPortrait} ohne Portrait`;
}
