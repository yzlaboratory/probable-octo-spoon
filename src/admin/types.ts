export type MediaVariants = Record<string, string>;
export interface Media {
  id: number;
  variants: MediaVariants;
  mimeType: string;
}

export type NewsStatus = "draft" | "scheduled" | "published" | "withdrawn" | "deleted";
export interface News {
  id: number;
  slug: string;
  title: string;
  tag: string;
  short: string;
  longHtml: string;
  status: NewsStatus;
  publishAt: string | null;
  hero: Media | null;
  createdAt: string;
  updatedAt: string;
}

export type SponsorStatus = "active" | "paused" | "archived";
export type CardPalette = "transparent" | "purple" | "warm-neutral" | "cool-neutral";
export interface Sponsor {
  id: number;
  name: string;
  tagline: string | null;
  linkUrl: string;
  logoHasOwnBackground: boolean;
  cardPalette: CardPalette;
  weight: number;
  status: SponsorStatus;
  activeFrom: string | null;
  activeUntil: string | null;
  notes: string | null;
  displayOrder: number;
  logo: Media | null;
  createdAt: string;
  updatedAt: string;
}

export type VorstandStatus = "active" | "hidden" | "archived";
export interface Vorstand {
  id: number;
  name: string;
  role: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  status: VorstandStatus;
  displayOrder: number;
  portrait: Media | null;
  createdAt: string;
  updatedAt: string;
}

export interface Admin {
  id: number;
  email: string;
}
