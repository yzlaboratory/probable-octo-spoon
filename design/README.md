# Handoff: Clubsoft — Admin Dashboard + Public Website

## Overview

**Clubsoft** is an all-in-one platform for German amateur sports clubs ("Vereine") to manage their digital presence. It consists of two connected surfaces:

1. **Admin dashboard** — where the club's board/editors manage News, Events, Members, Sponsors, Board (Vorstand), Media, and Theme
2. **Public website** — the outward-facing club site that reflects all edits live

The fictional example club used in the prototype is **SV Grün-Weiß Birkenstett** (invented — replace with real club data in production).

## About the Design Files

The files in `design_source/` are **design references created as a single-page HTML prototype** (React loaded via `<script type="text/babel">` + Tailwind CDN). They are **not production code to copy directly** — they are a high-fidelity mockup of intended look, layout, and behavior.

The task is to **recreate these designs in the target codebase's real environment**. For this project that environment already exists — the repo at `github.com/yzlaboratory/probable-octo-spoon` (also called `clubsoft-website`) is a Vite + React + TypeScript + React Router app. Use its existing patterns:
- `src/admin/` holds the admin shell, auth context, API client, and page components
- `src/admin/types.ts` defines real domain types (`Media`, `NewsPost`, `Sponsor`, `Vorstand`, etc.) — these match the shapes used in the prototype
- Real components (`VorstandPage.tsx`, `NewsListPage.tsx`) show conventions for table rows, drag-and-drop (`@dnd-kit`), and API state — mirror those

Do not port the prototype's inline Tailwind / CSS-variable setup verbatim. Instead, translate the design tokens (below) into the codebase's CSS variables or theme object, and build components with the project's existing UI primitives.

## Fidelity

**High-fidelity.** All screens are pixel-level mockups with final colors, typography, spacing, and interaction states. Recreate them pixel-perfectly using the codebase's component library. Where the prototype uses placeholders (abstract gradients for media thumbnails, for example), use real assets in production.

## Product Structure

### Admin dashboard (all at `/admin/*`)

| Route        | Screen             | File                        |
|--------------|--------------------|-----------------------------|
| `/admin`     | Übersicht (Dashboard) | `screens-dashboard.jsx`  |
| `/admin/news` | News list + block editor | `screens-news.jsx`, `screens-news-editor.jsx` |
| `/admin/events` | Termine & Kalender (month / week / agenda) | `screens-events.jsx` |
| `/admin/media` | Mediathek (grid + list) | `screens-media.jsx` |
| `/admin/sponsors` | Sponsoren (tiered, weighted rotation) | `screens-sponsors.jsx` |
| `/admin/vorstand` | Vorstand (reorder) | `screens-vorstand.jsx` |
| `/admin/members` | Mitglieder (roster) | `screens-members.jsx` |
| `/admin/public` | Öffentliche Website (live preview) | `screens-public.jsx` |
| `/admin/theme` | Erscheinungsbild (theme editor) | `screens-theme.jsx` |

### Public website (all at `/`)

- `/` — Home (hero, news grid, fixtures strip, sponsor ribbon)
- `/news/:slug` — Article
- `/sponsors` — Tiered sponsor grid
- `/team` — Teams
- `/contact` — Contact + form

The **public website preview** screen in the admin renders these same pages inside a simulated browser chrome with desktop/tablet/mobile toggles — implement as iframe of the real public routes or as a dedicated preview renderer.

## Design Tokens

### Colors (dark editorial theme)

```css
/* Surfaces (dark) */
--paper:   #0e0e12;  /* page background */
--paper-2: #16161d;  /* cards */
--paper-3: #1e1e28;  /* raised surfaces, chips, inputs */

/* Ink (text on dark) */
--ink:    #e8e6df;   /* primary */
--ink-2:  #b4b2a8;   /* secondary */
--ink-3:  #84827a;   /* tertiary / meta */
--ink-4:  #5a584f;   /* quaternary / disabled */

/* Rules / borders */
--rule:   rgba(255,255,255,.06);
--rule-2: rgba(255,255,255,.12);

/* Brand / semantic (all oklch) */
--forest:   oklch(0.62 0.22 290);  /* primary — electric violet */
--forest-2: oklch(0.72 0.18 290);  /* primary hover / glow */
--glow:     oklch(0.62 0.22 290 / 0.4);
--rust:     oklch(0.72 0.19 25);   /* accent — warm coral */
--ochre:    oklch(0.78 0.16 85);   /* warning / attention */
--plum:     oklch(0.55 0.18 330);  /* tertiary */
```

The "forest" naming is legacy from the earlier warm palette — the actual value is a purple. Rename to `--primary` / `--accent` / `--warn` / `--tertiary` in the real codebase.

### Public-site palette (different DNA — editorial warm)

The public website does **not** inherit the admin's dark theme. It uses a warm cream paper aesthetic:

```css
--p-paper:   #f4eee2;
--p-paper-2: #ece5d4;
--p-ink:     #14140f;
--p-ink-2:   #3a3a32;
--p-ink-3:   #7a7868;
--p-rule:    #d2c9b3;
--p-primary: #1f3a2e;  /* deep forest green */
--p-accent:  #b5401b;  /* terracotta */
```

These are theme-editor-configurable (see `screens-theme.jsx`) — implement as database-backed tokens per club.

### Typography

- **Display** (headings, wordmark): `Newsreader` (Google Fonts), weights 400/500/600, italic available. Letter-spacing `-0.015em` to `-0.02em` on large sizes.
- **UI body**: `Geist` (Vercel) — weights 400/500/600
- **Mono** (IDs, numbers, timestamps): `Geist Mono` — used with `font-variant-numeric: tabular-nums` for aligned digits

### Type scale (admin)

| Use | Size | Weight | Line-height | Tracking |
|---|---|---|---|---|
| Page H1 | 44px | 500 | 1.05 | -0.015em |
| Section H2 | 28px | 500 | 1.15 | -0.01em |
| Card title | 20–22px | 500 | 1.2 | -0.01em |
| Body | 14–15px | 400 | 1.5–1.65 | 0 |
| Small | 12.5px | 400 | 1.4 | 0 |
| Meta / mono | 10.5–11.5px | 400 | 1.3 | 0 (tabular) |
| Caps label | 10–10.5px | 500 | 1 | 0.18em–0.2em |

### Spacing

Tailwind's default scale. Page padding `px-10 pt-10 pb-14`. Cards use `p-5` or unpadded when holding tables. Gap between cards `gap-6`. Borders: `1px solid var(--rule)` for separators; `var(--rule-2)` for emphasized edges.

### Radii

- Small chips/inputs: 6px
- Cards: 10px
- Buttons: 8px (primary/ghost)
- Pills: 999px (full)

### Shadows

Almost none — the design relies on borders and background contrast, not drop shadows. Primary button has a subtle glow: `box-shadow: 0 0 12px var(--glow)`.

## Shell / Chrome

- **Sidebar** (260px, fixed left): Wordmark row, search input, two nav sections ("Inhalte" and "Konfiguration"), active item highlighted with filled primary background + glow.
- **Topbar** (56px, sticky top): Breadcrumbs on left, notification bell + avatar on right. Mobile: title + screen select.
- **Page content** lives in a scroll container with `page-enter` fade (opacity 0.4 → 1, 240ms).

## Screens — detailed

### Dashboard
Grid of KPI cards (members, news drafts, upcoming events, sponsors revenue), recent News list, next events timeline, activity feed. Mix of numeric mono type and display headings.

### News list + Block editor
List: filterable table of posts with status pills (Entwurf / Geplant / Veröffentlicht), search, tag filter.
**Block editor** (`screens-news-editor.jsx`):
- Title + teaser inputs (no borders, fluid inline editing)
- Block stream: `heading`, `lead`, `paragraph`, `image`, `quote`, `stats`, `callout`
- Each block has hover chrome: move up/down buttons on left, trash on right, kind label on far-left
- Active block: soft purple glow bar on left + tinted background
- **BlockInsert** appears between blocks on hover — `+` button opens a popover with block-type options
- Right rail: Block Inspector (context-sensitive controls per kind), Publication (radio: draft / scheduled / now), Metadata (tag, slug)

### Events / Kalender
Three views toggled via pill group: **Monat** (month grid), **Woche** (week time grid), **Agenda** (list grouped by date).
Kind filter chips: Spiel (rust), Training (primary), Verein (ochre). Side panel shows selected event detail + upcoming list.
Week view has hour labels 8:00–20:00 on left, 7-day column grid, events positioned absolutely using `(startHour - 8) / 12 * 520px` formula.

### Mediathek
Grid view: 4-col square thumbnails, first cell is upload dropzone, each media tile has abstract gradient preview (replace with real thumbs) and info footer on hover.
List view: dense table (60px thumb + name + meta).
Right side panel: preview + metadata + tag chips + action buttons (In Meldung einfügen, Link kopieren, Löschen).

### Sponsoren
Tier groups (Hauptsponsor, Premium, Standard, Partner) with weighted rotation sliders. Each sponsor: logo tile, tier pill, monthly revenue, contract expiry, impressions counter.

### Vorstand
Sortable list (drag handle) of board positions: role, name, photo placeholder, term, since. Uses `@dnd-kit` in the real admin code — mirror that.

### Mitglieder
Stats strip (4 KPI cards), filter row (search + Sparte select + Beitrag select), dense member table, detail side panel with avatar, membership number (mono), status pills, dues status, GDPR notice.

### Website-Vorschau
Controls row: page tabs (Start / Meldung / Sponsoren / Mannschaft / Kontakt) + device toggle (Desktop / Tablet / Mobile).
Below: mock browser chrome (traffic-light dots, URL bar), then the public site renders inside. Width clamped by device choice: desktop = fluid, tablet = 820px, mobile = 390px.

### Erscheinungsbild (Theme)
Theme picker (preset cards), density toggle (comfortable / compact), typography pair selector, palette swatches, live preview panel.

## Interactions

- **Hover** on table rows: `var(--paper-3)` background + 80ms transition
- **Active nav**: solid primary bg, `#fff` text, glow shadow
- **Primary button**: `var(--forest)` bg, `0 0 12px var(--glow)` shadow, scale(0.98) on press
- **Page transitions**: `page-enter` CSS class, fades from opacity 0.4 to 1 over 240ms
- **Toasts**: bottom-right, dark pill, auto-dismiss 2500ms (see `app.jsx`)
- **Tweaks panel**: toolbar-driven overlay (see prototype's `__edit_mode_available` / `__activate_edit_mode` protocol — can be omitted in production)

## State Management

Prototype uses local `useState` throughout. In the real app, replace with:
- **Server state**: React Query / TanStack Query hitting the existing API layer (`src/admin/api.ts`)
- **Draft state** (news editor): local state, auto-save debounce 800ms → PATCH
- **Theme**: club-level setting, stored on server, cached in React context
- **Navigation**: React Router, breadcrumb from route match

## Domain Types (from real repo — `src/admin/types.ts`)

Use these as-is:
```ts
export type MediaVariants = Record<string, string>;
export interface Media { id: number; variants: MediaVariants; filename: string; ... }
export interface NewsPost { id: number; title: string; slug: string; ... }
export interface Sponsor { id: number; name: string; tier: string; weight: number; ... }
export interface VorstandEntry { id: number; role: string; name: string; order: number; ... }
```

Extend with `Event`, `Member` (not in real repo yet) — shapes in `data-extra.jsx`.

## Screenshots

See `screenshots/` — PNG capture of each screen at 1440px wide:
- `01-dashboard.png`
- `02-news-list.png`
- `03-news-editor.png` — block editor with active paragraph
- `04-events.png` — month view with event side panel
- `05-media.png` — grid view
- `06-sponsors.png`
- `07-vorstand.png`
- `08-members.png`
- `09-public-home.png` — public site preview inside browser frame
- `10-theme.png`

## Files in This Bundle

All in `design_source/`:
- `clubsoft.html` — entry, loads all scripts
- `app.jsx` — top-level screen routing + tweaks/toasts
- `shell.jsx` — Sidebar, Topbar, PageHeader, Card, Pill, Button
- `icons.jsx` — stroke-based icon set (1.5px)
- `data.jsx`, `data-extra.jsx` — fixture data
- `screens-*.jsx` — one file per admin screen
- `screens-public.jsx` — public website preview

## Notes

- All German UI strings should be preserved verbatim
- Replace all placeholder data with real API calls
- Replace abstract gradient media thumbnails with real image variants from the `Media.variants` map
- The "Clubsoft" name and wordmark are the platform brand; each club has its own name + short-form that appear in the shell subtitle and breadcrumbs
