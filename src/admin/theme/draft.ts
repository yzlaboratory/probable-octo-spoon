/**
 * Theme editor draft state — client-only persistence per ADR 0013.
 *
 * The MVP intentionally has no server-side endpoint. All edits live in
 * localStorage under a single namespaced key. When the public-site rework
 * lands and grows a token layer, this graduates to a single-row
 * `theme_settings` table; until then, the draft is sandbox state.
 */

export type PaletteKey = "editorial" | "navy" | "kiosk" | "moss";
export type HeadingFont = "Newsreader" | "Fraunces" | "DMSerif";
export type BodyFont = "Geist" | "IBMPlex" | "Manrope";
export type Density = "airy" | "balanced" | "compact";

export interface ThemeDraft {
  palette: PaletteKey;
  headingFont: HeadingFont;
  bodyFont: BodyFont;
  baseSizePx: number;
  density: Density;
  darkNav: boolean;
  instagramOnHome: boolean;
  updatedAt: string;
}

export const STORAGE_KEY = "clubsoft.admin.theme.draft.v1";

export const DEFAULT_DRAFT: ThemeDraft = {
  palette: "editorial",
  headingFont: "Newsreader",
  bodyFont: "Geist",
  baseSizePx: 16,
  density: "balanced",
  darkNav: true,
  instagramOnHome: true,
  updatedAt: "1970-01-01T00:00:00.000Z",
};

const PALETTE_KEYS: PaletteKey[] = ["editorial", "navy", "kiosk", "moss"];
const HEADING_FONTS: HeadingFont[] = ["Newsreader", "Fraunces", "DMSerif"];
const BODY_FONTS: BodyFont[] = ["Geist", "IBMPlex", "Manrope"];
const DENSITIES: Density[] = ["airy", "balanced", "compact"];

const MIN_BASE_SIZE = 14;
const MAX_BASE_SIZE = 20;

function isOneOf<T extends string>(value: unknown, options: T[]): value is T {
  return typeof value === "string" && (options as string[]).includes(value);
}

/**
 * Coerce an arbitrary blob into a valid ThemeDraft. Any field that fails to
 * validate falls back to the default. This is deliberately permissive —
 * a partially-corrupted entry should still produce a working editor, not
 * throw and lock the screen.
 */
export function coerceDraft(input: unknown): ThemeDraft {
  if (!input || typeof input !== "object") return { ...DEFAULT_DRAFT };
  const o = input as Record<string, unknown>;
  const baseSizeNum = typeof o.baseSizePx === "number" ? o.baseSizePx : NaN;
  const baseSizeOk =
    Number.isFinite(baseSizeNum) &&
    baseSizeNum >= MIN_BASE_SIZE &&
    baseSizeNum <= MAX_BASE_SIZE;
  return {
    palette: isOneOf(o.palette, PALETTE_KEYS) ? o.palette : DEFAULT_DRAFT.palette,
    headingFont: isOneOf(o.headingFont, HEADING_FONTS)
      ? o.headingFont
      : DEFAULT_DRAFT.headingFont,
    bodyFont: isOneOf(o.bodyFont, BODY_FONTS) ? o.bodyFont : DEFAULT_DRAFT.bodyFont,
    baseSizePx: baseSizeOk ? Math.round(baseSizeNum) : DEFAULT_DRAFT.baseSizePx,
    density: isOneOf(o.density, DENSITIES) ? o.density : DEFAULT_DRAFT.density,
    darkNav: typeof o.darkNav === "boolean" ? o.darkNav : DEFAULT_DRAFT.darkNav,
    instagramOnHome:
      typeof o.instagramOnHome === "boolean"
        ? o.instagramOnHome
        : DEFAULT_DRAFT.instagramOnHome,
    updatedAt:
      typeof o.updatedAt === "string" ? o.updatedAt : DEFAULT_DRAFT.updatedAt,
  };
}

/**
 * Read the draft from localStorage. Missing/malformed entries return defaults
 * — the editor must always have a usable starting point.
 */
export function loadDraft(storage: Storage = window.localStorage): ThemeDraft {
  let raw: string | null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    // Some privacy modes throw on getItem. Treat as no draft.
    return { ...DEFAULT_DRAFT };
  }
  if (!raw) return { ...DEFAULT_DRAFT };
  try {
    return coerceDraft(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_DRAFT };
  }
}

/**
 * Persist a draft, stamping `updatedAt` to now. Storage failures are swallowed
 * so a full quota or a privacy block never crashes the editor — the user can
 * still edit in-memory; only the cross-reload restore would be lost.
 */
export function saveDraft(
  draft: Omit<ThemeDraft, "updatedAt">,
  storage: Storage = window.localStorage,
  now: () => Date = () => new Date(),
): ThemeDraft {
  const stamped: ThemeDraft = { ...draft, updatedAt: now().toISOString() };
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(stamped));
  } catch {
    // Quota exceeded / private mode — best effort.
  }
  return stamped;
}

/** Wipe the stored draft (used by the "Verwerfen" button). */
export function resetDraft(storage: Storage = window.localStorage): ThemeDraft {
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // best effort
  }
  return { ...DEFAULT_DRAFT };
}

/** Clamp an arbitrary base-size input to the supported range. */
export function clampBaseSize(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_DRAFT.baseSizePx;
  return Math.min(MAX_BASE_SIZE, Math.max(MIN_BASE_SIZE, Math.round(value)));
}

export const BASE_SIZE_RANGE = {
  min: MIN_BASE_SIZE,
  max: MAX_BASE_SIZE,
} as const;
