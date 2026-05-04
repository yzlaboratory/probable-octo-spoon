# ADR 0013 — Theme editor: client-only state for now, server schema sketched for later

- **Status:** Superseded — the theme editor was removed from the admin panel on 2026-05-03 (public-redesign branch). The editor previewed a hypothetical token-driven public site, but the public-redesign (PR #20) shipped a fixed dark `cs-tile` shell that does not consume theme tokens, so the editor was rendering settings nothing reads. Until / unless a real publish path is built, the screen has no job. The `localStorage` key `clubsoft.admin.theme.draft.v1`, the `theme_settings` schema sketch below, and the four palettes / font enums are kept here for future reference if the work is revived.
- **Date:** 2026-05-02
- **Deciders:** Yannik Zeyer.
- **Supersedes:** none
- **Superseded by:** removal commit on `public-redesign` (no replacement ADR — the feature is dropped, not redesigned).
- **Related:** `design/IMPLEMENTATION_PLAN.md` (Phase 5, Decision 3 option (a)), ADR 0007 (SQLite), ADR 0009 (admin authentication mechanics).

## Context

Phase 5 of the admin redesign introduces three net-new entity screens — Events, Members, Theme — each gated on its own data-model decision. This ADR resolves Theme.

The theme editor in `design/design_source/screens-theme.jsx` looks like a CMS-style settings page: pick palette, pick fonts, pick density, click "Übernehmen & veröffentlichen". The button suggests there is something to publish *to*. There isn't — not yet. The public site (`src/styles/global.css`, the existing components) bakes a fixed dark palette and Inter/Material-Symbols typography directly into Tailwind v4 theme tokens. There is no token layer that reads from a server-supplied theme. Decision 4 in the implementation plan deliberately deferred the public-site visual rework to a separate effort after the admin lands.

This creates a sequencing question: do we

- **(A)** ship the editor against `localStorage` only, with the publish button disabled, and graduate to a server-backed `theme_settings` table when the public site can consume it; or
- **(B)** build the full server schema, migration, and API now, even though nothing reads from it; or
- **(C)** defer the entire theme screen until the public-site rework is scheduled?

`design/IMPLEMENTATION_PLAN.md` Decision 3 already picked **(A)** ("the preview is the whole point and fixture-backed theme tokens round-trip cleanly through localStorage until a backend exists"). This ADR ratifies that and pins down the schema sketch so future-us doesn't redesign it on the fly.

## Decision

1. **MVP persistence layer is `localStorage`.** The editor reads and writes a single JSON blob under the key `clubsoft.admin.theme.draft.v1`. No server endpoint, no migration, no `theme_settings` table in the database yet.

2. **Draft shape (the JSON blob).**
   ```ts
   type ThemeDraft = {
     palette: 'editorial' | 'navy' | 'kiosk' | 'moss';
     headingFont: 'Newsreader' | 'Fraunces' | 'DMSerif';
     bodyFont: 'Geist' | 'IBMPlex' | 'Manrope';
     baseSizePx: number;        // clamped 14..20
     density: 'airy' | 'balanced' | 'compact';
     darkNav: boolean;
     instagramOnHome: boolean;
     updatedAt: string;         // ISO8601, set on every write
   };
   ```
   - The four `palette` keys map to the four palettes hardcoded in the prototype's `ThemePreview`. The mapping lives in the React code as a constant, not in storage — palette tokens are not user-supplied data.
   - `headingFont` and `bodyFont` are *labels*, not URLs or font-stack strings. The MVP only renders the swatches; only `Newsreader` and `Geist` (already shipped) actually load. The other labels show as a fallback. This is intentional and called out in the spec.

3. **Defaults.** A missing or malformed `localStorage` entry falls back to: `editorial` palette, `Newsreader` heading, `Geist` body, `16` base size, `balanced` density, `darkNav: true`, `instagramOnHome: true`. This matches the prototype's initial state.

4. **No multi-tab synchronisation.** Two tabs editing the theme simultaneously will overwrite each other on save, last-write-wins. Acceptable: the editor is single-admin in practice and the published state is read-only here.

5. **No publish path in the MVP.** The "Übernehmen & veröffentlichen" button is rendered disabled with a tooltip. The "Verwerfen" button clears the localStorage entry, restoring defaults. The MVP cannot affect visitors.

6. **Schema sketched for the eventual server graduation.** When the public-site rework is scheduled and the public site grows a token layer, the draft graduates to a single-row table:
   ```sql
   CREATE TABLE theme_settings (
     id          INTEGER PRIMARY KEY CHECK (id = 1),  -- single-tenant: exactly one row
     palette        TEXT    NOT NULL,
     heading_font   TEXT    NOT NULL,
     body_font      TEXT    NOT NULL,
     base_size_px   INTEGER NOT NULL CHECK (base_size_px BETWEEN 14 AND 20),
     density        TEXT    NOT NULL CHECK (density IN ('airy','balanced','compact')),
     dark_nav       INTEGER NOT NULL CHECK (dark_nav IN (0,1)),
     instagram_on_home INTEGER NOT NULL CHECK (instagram_on_home IN (0,1)),
     updated_at     TEXT    NOT NULL,
     updated_by     INTEGER REFERENCES admins(id)
   );
   ```
   - Single-row pattern (`id = 1`) keeps the API trivially `GET /api/admin/theme` / `PUT /api/admin/theme`. No row creation, no list view, no slugging.
   - `updated_by` joins to the admin who hit publish, for the "who changed this last" footnote in the editor.
   - **The migration does not ship in this Phase 5 PR.** It lands with the public-site rework, when there is a renderer that reads from it.

7. **Token consumption is out of scope.** How the public site reads palette tokens — Tailwind v4 CSS custom properties keyed off `[data-theme="editorial"]`, a server-rendered `<style>` block, a build-time theme bake — is a public-site-rework decision, not a theme-editor decision.

## Alternatives considered

- **Build the full server schema and API now (Option B).** Rejected. Writing a `theme_settings` table whose rows are read by nothing is the kind of code that bit-rots before it ships. We'd find out the schema was wrong in six months when the renderer is finally built. Pinning the *sketch* in this ADR captures the design intent without paying the migration cost upfront.
- **Defer the entire screen (Option C).** Rejected. The screen is genuinely useful as a prototyping sandbox even without server persistence; the Geschäftsführer can audition palettes against a homepage mock and have an opinion before the public-site work starts. That opinion is the most valuable input the public-site project can have.
- **Persist to the existing `kv_store` table instead of inventing a draft schema.** No `kv_store` exists; introducing one for a single key is overkill. `localStorage` is the natural home for client-side scratch state.
- **Publish across tabs via `BroadcastChannel`.** Cut. Multi-tab admin editing is not a real workflow at this scale; last-write-wins is fine.
- **Free-form hex picker for the palette.** Rejected at the spec level — a fixed palette set keeps the visual system coherent and prevents a non-designer from picking a tone that fails contrast against the chosen ink. Custom palettes is a "could ship later" item.
- **Load the additional font families (Fraunces, DM Serif, IBM Plex, Manrope) at runtime so the previews are accurate.** Cut. The MVP is a labelled prototype; loading four extra Google Fonts on `/admin/theme` for a feature that doesn't yet affect visitors is paying network cost for fidelity nobody asked for. Fonts ship when the publish path opens.
- **Add a `theme_drafts` history table for undo.** Cut. Undo is `Verwerfen`, which clears the draft. History is a "could ship later" if multi-admin editing ever shows up.

## Consequences

### Positive

- **Zero database churn.** No migration, no rollback story, no orphan rows from a feature that doesn't yet do anything.
- **The editor is genuinely useful** as a sandbox for palette decisions ahead of the public-site rework.
- **The schema sketch is recorded** so when the public-site rework picks this up, the data shape isn't relitigated.
- **The "publish is disabled" UX is honest:** the button is visible, so the future workflow is discoverable, but it doesn't lie about what it does.

### Negative / Costs

- **Draft state lives only in the admin's browser.** Clearing site data, switching browsers, or using a different machine loses the in-progress prototype. Acceptable: this is sandbox state, not committed configuration.
- **Schema drift risk.** If the public-site rework discovers the sketched columns are wrong (e.g. it needs a richer palette type than a fixed enum, or per-page overrides), this ADR will be amended or superseded. The ADR is a hypothesis, not a contract.
- **Two storage formats** (localStorage `ThemeDraft` JSON now, SQLite columns later). At graduation time, a small migration step in the editor reads the old `localStorage` blob, `PUT`s it to the new endpoint, and clears the key. Trivial; called out as a follow-up below.

### DSGVO / legal

- No personal data. Theme settings are purely visual configuration.
- `localStorage` use does not require consent under the TTDSG / DSGVO when it is strictly necessary for the requested service — and the editor *is* the requested service. No banner change.

## Follow-ups

- Land the `/admin/theme` screen wired to the `localStorage` draft, removing the `soon: true` flag from the `theme` sidebar entry in `src/admin/shell/Sidebar.tsx`.
- When the public-site rework is scheduled: write the migration for the `theme_settings` table, add `GET`/`PUT /api/admin/theme`, port the editor to read/write through the API, and write a one-time client-side step that imports any existing `localStorage` draft into the server on first load post-deploy.
- Audit the four palette token sets (`editorial`, `navy`, `kiosk`, `moss`) for AA contrast against their `ink` and `paper` pairs before they ship as published options. The MVP only previews them; the rework actually exposes them to visitors and that bar is higher.
