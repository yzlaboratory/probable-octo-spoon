// Runtime data client for the public site.
//
// Replaces the build-time imports of src/data/news.json and src/utilities/sponsors.ts
// as the hardcoded VorstandSection array. Hooks fetch once on mount and return
// either the data or `null` while loading (so callers can render their existing
// skeleton state).
//
// The sponsor shape is kept compatible with the legacy callers (Newscard,
// Sponsorcard, Footer, SocialsSection) so those components stay untouched at
// the shape level — they just receive their sponsor list from a hook now.

import { useEffect, useState } from "react";
import logo from "../assets/logo.svg";

// Server payload shapes — kept loose; the backend is the source of truth.
interface MediaPayload {
  id: number;
  variants: Record<string, string>;
  mimeType: string;
}

interface ServerNews {
  id: number;
  slug: string;
  title: string;
  tag: string;
  short: string;
  longHtml: string;
  publishAt: string | null;
  createdAt: string;
  hero: MediaPayload | null;
}

interface ServerSponsor {
  id: number;
  name: string;
  tagline: string | null;
  linkUrl: string;
  cardPalette: "transparent" | "purple" | "warm-neutral" | "cool-neutral";
  logoHasOwnBackground: boolean;
  weight: number;
  logo: MediaPayload | null;
}

interface ServerVorstand {
  id: number;
  name: string;
  role: string;
  email: string | null;
  phone: string | null;
  portrait: MediaPayload | null;
}

// Public shapes consumed by existing components.
export interface PublicNewsItem {
  id: number;
  path: string;
  title: string;
  tag: string;
  short: string;
  long: string; // kept as `long` (plain) for NewsDetail's existing prop name.
  longHtml: string;
  date: string; // ISO — component formats to locale.
  imageurl: string; // concrete src URL (variant).
}

export interface PublicSponsor {
  Name: string;
  Title: string;
  Link: string;
  ImageUrl: string;
  Color?: string; // Tailwind background class (or undefined for transparent).
  hasBackground?: boolean;
  money: number;
}

export interface PublicVorstandMember {
  name: string;
  title: string; // legacy Vorstandcard prop name for role.
  mail: string;
  phone: string;
  imageSrc: string;
}

// Map the admin palette enum to the Tailwind classes the legacy components expect.
function paletteToClass(p: ServerSponsor["cardPalette"]): string | undefined {
  switch (p) {
    case "purple": return "bg-primary/70";
    case "warm-neutral": return "bg-rose-200";
    case "cool-neutral": return "bg-zinc-100";
    case "transparent":
    default: return undefined;
  }
}

function bestNewsImage(hero: MediaPayload | null): string {
  if (!hero) return logo;
  return (
    hero.variants.svg ||
    hero.variants.fallbackJpg ||
    hero.variants["1600w"] ||
    hero.variants["800w"] ||
    hero.variants["400w"] ||
    logo
  );
}

function bestSponsorLogo(media: MediaPayload | null): string {
  if (!media) return logo;
  return (
    media.variants.svg ||
    media.variants["400w"] ||
    media.variants["200w"] ||
    logo
  );
}

function bestPortrait(media: MediaPayload | null): string {
  if (!media) return logo;
  return (
    media.variants["320w"] ||
    media.variants["640w"] ||
    media.variants["160w"] ||
    logo
  );
}

function toPublicNews(n: ServerNews): PublicNewsItem {
  // Strip HTML tags for the legacy plain-text `long` fallback used by NewsDetail
  // until that component is updated. Whitespace-collapsed.
  const plain = n.longHtml
    .replace(/<\/(p|h2|h3|li|blockquote)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .trim();
  return {
    id: n.id,
    path: n.slug,
    title: n.title,
    tag: n.tag,
    short: n.short,
    long: plain,
    longHtml: n.longHtml,
    date: n.publishAt ?? n.createdAt,
    imageurl: bestNewsImage(n.hero),
  };
}

function toPublicSponsor(s: ServerSponsor): PublicSponsor {
  return {
    Name: s.name,
    Title: s.tagline ?? "",
    Link: s.linkUrl,
    ImageUrl: bestSponsorLogo(s.logo),
    Color: paletteToClass(s.cardPalette),
    hasBackground: s.logoHasOwnBackground,
    money: s.weight,
  };
}

function toPublicVorstand(v: ServerVorstand): PublicVorstandMember {
  return {
    name: v.name,
    title: v.role,
    mail: v.email ?? "",
    phone: v.phone ?? "",
    imageSrc: bestPortrait(v.portrait),
  };
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.json();
}

export function usePublicNews(): PublicNewsItem[] | null {
  const [data, setData] = useState<PublicNewsItem[] | null>(null);
  useEffect(() => {
    fetchJson<ServerNews[]>("/api/news/public")
      .then((rows) => setData(rows.map(toPublicNews)))
      .catch(() => setData([]));
  }, []);
  return data;
}

export function usePublicNewsBySlug(slug: string | undefined): PublicNewsItem | null | undefined {
  const [data, setData] = useState<PublicNewsItem | null | undefined>(undefined);
  useEffect(() => {
    if (!slug) {
      setData(null);
      return;
    }
    fetchJson<ServerNews>(`/api/news/public/${encodeURIComponent(slug)}`)
      .then((n) => setData(toPublicNews(n)))
      .catch(() => setData(null));
  }, [slug]);
  return data;
}

export function usePublicSponsors(): PublicSponsor[] | null {
  const [data, setData] = useState<PublicSponsor[] | null>(null);
  useEffect(() => {
    fetchJson<ServerSponsor[]>("/api/sponsors/public")
      .then((rows) => setData(rows.map(toPublicSponsor)))
      .catch(() => setData([]));
  }, []);
  return data;
}

export function usePublicVorstand(): PublicVorstandMember[] | null {
  const [data, setData] = useState<PublicVorstandMember[] | null>(null);
  useEffect(() => {
    fetchJson<ServerVorstand[]>("/api/vorstand/public")
      .then((rows) => setData(rows.map(toPublicVorstand)))
      .catch(() => setData([]));
  }, []);
  return data;
}

// Weighted shuffle preserved from src/utilities/sponsors.ts — now parametric.
export function shuffleSponsors(sponsors: PublicSponsor[]): PublicSponsor[] {
  return [...sponsors]
    .map((s) => ({ s, key: Math.random() ** (1 / (s.money || 1)) }))
    .sort((a, b) => b.key - a.key)
    .map(({ s }) => s);
}

export function shuffleTopSponsors(sponsors: PublicSponsor[], count = 8): PublicSponsor[] {
  return [...sponsors]
    .sort((a, b) => (b.money || 0) - (a.money || 0))
    .slice(0, count)
    .map((s) => ({ s, key: Math.random() ** (1 / (s.money || 1)) }))
    .sort((a, b) => b.key - a.key)
    .map(({ s }) => s);
}
