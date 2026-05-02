/**
 * The four palettes the theme editor exposes. Hardcoded in the React layer,
 * not user-supplied — palette tokens are not data the admin gets to invent
 * until the "could ship later" custom-palette feature exists. Mirrors the
 * tokens in `design/design_source/screens-theme.jsx`.
 */
import type { PaletteKey } from "./draft";

export interface Palette {
  key: PaletteKey;
  label: string;
  paper: string;
  ink: string;
  primary: string;
  accent: string;
  /** "dark" → light text on dark nav bar; "light" → the inverse. */
  nav: "dark" | "light";
}

export const PALETTES: Palette[] = [
  {
    key: "editorial",
    label: "Midnight · Purple & Coral",
    paper: "#0e0e12",
    ink: "#f2f1ee",
    primary: "oklch(0.62 0.22 290)",
    accent: "oklch(0.72 0.19 25)",
    nav: "dark",
  },
  {
    key: "navy",
    label: "Deep · Navy & Gold",
    paper: "#0f1626",
    ink: "#f2eee4",
    primary: "#2d528e",
    accent: "#c89a2a",
    nav: "dark",
  },
  {
    key: "kiosk",
    label: "Kiosk · Schwarz & Zinnober",
    paper: "#0a0a0a",
    ink: "#ece6da",
    primary: "#d63816",
    accent: "#d63816",
    nav: "dark",
  },
  {
    key: "moss",
    label: "Light · Grün-Weiß",
    paper: "#ffffff",
    ink: "#14201a",
    primary: "#14201a",
    accent: "#5b7a52",
    nav: "light",
  },
];

export function paletteFor(key: PaletteKey): Palette {
  return PALETTES.find((p) => p.key === key) ?? PALETTES[0];
}

/**
 * Density → preview pad size in CSS pixels. Mirrors the prototype's mapping
 * (Luftig=28 / Ausgewogen=20 / Kompakt=14) and is used only by the preview
 * pane — real public-site density consumption is a future concern.
 */
export const DENSITY_PAD_PX = {
  airy: 28,
  balanced: 20,
  compact: 14,
} as const;

/**
 * Display labels for the heading/body font enums. Only `Newsreader` and
 * `Geist` actually render in their named family — the others fall back to a
 * generic stack and are previewed by name only. See ADR 0013.
 */
export const HEADING_FONT_LABELS = {
  Newsreader: "Newsreader",
  Fraunces: "Fraunces",
  DMSerif: "DM Serif",
} as const;

export const BODY_FONT_LABELS = {
  Geist: "Geist",
  IBMPlex: "IBM Plex",
  Manrope: "Manrope",
} as const;

export const DENSITY_LABELS = {
  airy: "Luftig",
  balanced: "Ausgewogen",
  compact: "Kompakt",
} as const;
