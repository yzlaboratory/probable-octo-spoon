# Admin theme editor (planned)

> **Status:** not implemented. The public site today is a fixed dark theme defined in `src/styles/global.css`; changing the look means a code edit and a deploy. The admin sidebar already lists `Erscheinungsbild` with a `bald` pill (see `src/admin/shell/Sidebar.tsx`).

## What the admin wants

The Geschäftsführer wants to try on different visual treatments of the public site — palette, headline font, body font, layout density — and see what they look like together before committing. Today this is a designer-and-deploy round trip; the admin wants to do it themselves, in the browser, without affecting what visitors see until they explicitly publish.

## The visitor scenario

An admin opens `/admin/theme`. The screen splits into a settings column on the left (palette swatches, font pickers, density toggle, a couple of layout switches) and a live preview pane on the right that mirrors the public homepage with the chosen settings. They click through the four palettes, switch the headline font, drop density to "Kompakt" — the preview updates instantly. They like the moss palette best. They walk away, come back later, and the editor still shows their last selection because it persisted client-side. The public site is unchanged — the editor is a sandbox.

The "Übernehmen & veröffentlichen" button in the prototype is **disabled** in this MVP, with a hover tooltip explaining that publishing to the live site lands with the public-site rework. The visitor can prototype freely; they cannot push their choice to visitors yet.

## MVP

- A `/admin/theme` route activated in the sidebar (drop `soon: true` on the `theme` nav entry).
- A two-column screen matching `design/design_source/screens-theme.jsx`:
  - **Settings column.** Palette picker (4 fixed palettes), heading font picker (3 serif options), body font picker (3 sans options), base-size slider (14–20 px), density segmented control (Luftig / Ausgewogen / Kompakt), two layout switches (dark menu, Instagram gallery on home).
  - **Preview column.** A scoped, in-page mock of the public homepage hero + news grid + sponsor strip, exactly the `ThemePreview` component shape from the prototype. **Not** an iframe of the real `/` route — the real public site doesn't yet consume theme tokens, so previewing it would be misleading.
- **Persistence is client-only.** State round-trips through `localStorage` under a single namespaced key. Reloading restores the last selection; clearing site data resets to defaults. No server endpoint, no migration, no `theme_settings` row.
- The "Übernehmen & veröffentlichen" button is rendered but disabled, with a `Bald verfügbar — kommt mit dem Website-Redesign` tooltip. The "Verwerfen" button resets the editor state back to defaults.
- The font pickers list font names but do **not** load new fonts at runtime. The MVP uses the fonts already shipped (`Inter`, `Newsreader`, `Geist`, `Geist Mono`); other names render their swatch in a generic fallback. Real font shipping ships with the public-site rework.

That covers the actual job: prototype-and-park. Everything else is later.

## Could ship later

Roughly in order of when a real need is likely to surface:

1. **Public-site theme consumption.** A token layer on the public site that reads the published theme, replacing the fixed `global.css` palette. This is the chunky one and gates the publish button — it lands with the public-site rework.
2. **Server-side persistence** of the published theme in a `theme_settings` SQLite table. Schema sketched in ADR 0013; migration ships when the public site can consume it.
3. **Per-page overrides** — a different look for `/news/:path` than the homepage.
4. **Seasonal presets** — "Saisoneröffnung", "Adventszeit" — the admin schedules a palette change for a date window.
5. **Custom palettes** beyond the four built-ins, with WCAG contrast checking.
6. **A/B preview** — desktop + tablet + mobile breakpoints in the preview pane (the prototype shows three pills; only Desktop is wired in the MVP).
7. **Audit log** of theme changes — only once there are multiple admins editing it.
8. **Font shipping** — pull in the additional font families on demand, possibly self-hosted to avoid a Google Fonts dependency.

## Open questions

None gating the MVP. The questions that exist (server persistence, public-site theme layer, font shipping) all live behind the publish gate, which is deliberately closed in this MVP. Reopen them when the public-site rework is scheduled.

## Architecture

Specified in ADR 0013.

## What the theme editor does not do

- Does **not** change what visitors see. The public site keeps rendering the existing dark theme until the public-site rework lands.
- Does **not** persist on the server. Selections live in `localStorage` only.
- Does **not** load new web fonts at runtime. The font picker is a labelled choice, not a network request.
- Does **not** support per-admin themes. The editor edits a single theme (single-tenant, single-admin-team).
- Does **not** preview the real public site. The preview pane is a mock of the homepage shape, not an iframe of `/`.
- Does **not** offer custom hex pickers. Palette is a fixed set of four; deviation is a future feature, not a spec hole.
