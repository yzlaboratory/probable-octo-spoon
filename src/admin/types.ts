export type MediaVariants = Record<string, string>;
export type MediaKind = "news" | "sponsor" | "vorstand";
export interface Media {
  id: number;
  variants: MediaVariants;
  mimeType: string;
  /** Uploader's original filename. Null for rows predating the Phase 3 migration. */
  filename?: string | null;
  /**
   * Admin-library metadata: set by the Mediathek endpoints and by the response
   * to a fresh upload. Omitted when Media is embedded inside a News, Sponsor,
   * or Vorstand response.
   */
  kind?: MediaKind;
  uploadedAt?: string;
  uploadedBy?: string | null;
}

export type NewsStatus =
  | "draft"
  | "scheduled"
  | "published"
  | "withdrawn"
  | "deleted";

export type CalloutTone = "primary" | "accent" | "warn";

export type NewsBlock =
  | { kind: "heading"; level: 1 | 2 | 3; text: string }
  | { kind: "lead"; text: string }
  | { kind: "paragraph"; text: string }
  | {
      kind: "image";
      mediaId: number | null;
      caption: string;
      credit: string;
      /** Set only by the legacy HTML migration; editor prompts to re-pick. */
      srcHint?: string;
    }
  | { kind: "quote"; text: string; attr: string }
  | { kind: "callout"; tone: CalloutTone; text: string };

export type NewsBlockKind = NewsBlock["kind"];

export interface News {
  id: number;
  slug: string;
  title: string;
  tag: string;
  short: string;
  /** Server-rendered HTML derived from `blocks`. Public render source. */
  longHtml: string;
  blocks: NewsBlock[];
  status: NewsStatus;
  publishAt: string | null;
  hero: Media | null;
  createdAt: string;
  updatedAt: string;
}

export type SponsorStatus = "active" | "paused" | "archived";
export type CardPalette =
  | "transparent"
  | "purple"
  | "warm-neutral"
  | "cool-neutral";
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
