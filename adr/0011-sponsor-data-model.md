# ADR 0011 — Sponsor data model and logo handling

- **Status:** Accepted
- **Date:** 2026-04-17
- **Deciders:** Yannik Zeyer.
- **Supersedes:** none
- **Superseded by:** none
- **Related:** `specs/planned/admin-sponsor-editor.md`, `specs/sponsor-display.md`, ADR 0007 (SQLite), ADR 0010 (shared media table).

## Context

`specs/planned/admin-sponsor-editor.md` fixes the admin experience: CRUD over the sponsor roster with status (Aktiv / Pausiert / Archiviert), weighted rotation, logo upload, fixed colour palette for card backgrounds, soft-archive pattern. Architecture — schema shape, logo upload safety, tracking, CSV, UTM — was deferred to this ADR. ADR 0003 tracked them in B5.

Impression/click tracking, UTM tagging, and CSV import/export are cut from the MVP: the first two are infrastructure for reporting the club has not asked for; the third is a convenience for a roster that fits on one screen. Add them when a concrete ask appears.

## Decision

1. **Data model (SQLite).**
   ```
   sponsors(
     id             INTEGER PRIMARY KEY,
     name           TEXT NOT NULL,
     tagline        TEXT,
     link_url       TEXT NOT NULL,
     logo_media_id  INTEGER NOT NULL REFERENCES media(id),
     logo_has_own_background INTEGER NOT NULL DEFAULT 0,  -- boolean
     card_palette   TEXT NOT NULL CHECK (card_palette IN ('transparent','purple','warm-neutral','cool-neutral')),
     weight         INTEGER NOT NULL DEFAULT 1 CHECK (weight >= 1 AND weight <= 100),
     status         TEXT NOT NULL CHECK (status IN ('active','paused','archived')),
     active_from    TEXT,                  -- ISO-8601; null = no lower bound
     active_until   TEXT,                  -- ISO-8601; null = no upper bound
     notes          TEXT,                  -- admin-only
     display_order  INTEGER NOT NULL,      -- for stable ordering in the admin list; weighted shuffle ignores it
     created_at     TEXT NOT NULL,
     updated_at     TEXT NOT NULL
   );
   ```
   Indexes: `sponsors(status, active_from, active_until)` for the public-roster query.
2. **Card palette.** A fixed enum of four values, mirroring the palette in the spec. New palette entries require a code change — intentional, to keep a non-designer from introducing a colour that fails contrast.
3. **Weighted rotation.** The current `shuffleSponsors` / `shuffleTopSponsors` helpers in `src/utilities/sponsors.ts` carry over unchanged; they consume the same `money` weight that the `weight` column will expose.
4. **Logo upload pipeline.**
   - **Accepted formats:** PNG, JPEG, SVG. (SVG is allowed here — unlike news images — because sponsor logos are the one place it genuinely shines for crispness and file size.)
   - **Max upload size:** 2 MB (logos are small; a larger upload is almost always a source file the sponsor should have pre-exported).
   - **SVG sanitization.** Every uploaded SVG runs through `svgo` with a hardened preset: strip `<script>`, `<foreignObject>`, event-handler attributes (`on*`), `<use href>` to external URLs, XLink external refs, and any `<style>` containing `@import`. The sanitized SVG is stored; the original is discarded.
   - **Raster variants.** For PNG/JPEG uploads, `sharp` generates WebP variants at 200w and 400w (logos are small; variants above that are wasted bytes). SVG uploads skip variant generation — the vector scales.
   - **Storage.** `/var/lib/clubsoft/media/sponsors/<uuid>/<variant>.<ext>`, tracked via the shared `media` table from ADR 0010.
5. **Active-window logic.** A sponsor is visible on the public site iff `status = 'active'` and (`active_from IS NULL OR active_from <= now`) and (`active_until IS NULL OR active_until > now`). `paused` and `archived` are never public; the date fields are a convenience for future-dated activations without admin work at a specific moment.
6. **Soft archive.** `status = 'archived'` is the default "former sponsor" state, first-class in the UI. Hard delete is only available from the archived state and requires name-typing confirmation in the admin UI.

## Alternatives considered

- **PNG/JPEG only for sponsor logos.** Rejected. Sponsors overwhelmingly hand over SVG or EPS; rejecting SVG means the admin does a per-sponsor "export a PNG at the right size" dance for every upload.
- **Accept EPS / PDF.** Rejected. Both need a conversion step the admin UI cannot verify visually, and both are rarely delivered by sponsors who have any digital presence at all.
- **Free hex colour picker for card background.** Rejected at the spec level. The fixed palette keeps contrast predictable on the dark page without a designer in the loop.
- **Impression and click tracking in the MVP.** Rejected. No stakeholder has asked for sponsor reporting; building the aggregation pipeline before a real ask is infrastructure-for-nothing. The data model deliberately does not reserve counter columns — add them when reporting lands.
- **UTM-tag every outbound sponsor link.** Rejected for the same reason as tracking. The club does not consume any analytics that would act on UTM data today.
- **CSV import/export.** Rejected for the MVP. The roster is a short list; bulk tooling pays off only when a whole season is loaded at once, and the Schatzmeister's annual report is served just as well by a one-off SQL query.
- **Separate `sponsor_assets` table instead of reusing `media`.** Rejected. The shared media table from ADR 0010 covers the shape; a second table would fork the refcount logic without buying anything.

## Consequences

### Positive

- Active/paused/archived is first-class instead of the current "commented-out in TypeScript" pattern. Reactivation becomes one click.
- Weighted rotation behaviour is preserved end-to-end: the existing shuffle helpers do not need to change.
- SVG logos keep their crispness without a separate raster-export workflow for the admin.
- The palette enum is a single point of truth the UI can render preview swatches from.

### Negative / Costs

- `svgo` misconfiguration is a footgun: a too-aggressive preset strips legitimate features (gradients, embedded fonts); a too-permissive one lets a script through. The config belongs in a single module with tests.
- Active-window logic lives in SQL; admins who want "starts next Saturday" need to know they enter an ISO datetime. The form should provide a date picker and default the time sanely.
- The 2 MB logo size ceiling will occasionally reject a sponsor-supplied file. Acceptable; the admin can re-export or ask the sponsor.

### DSGVO / legal

- Sponsors are organisations, not natural persons. Sponsor fields (`name`, `link_url`, `tagline`, logo) are not personal data. `notes` could be if an admin writes them into it — that is a process concern, not a schema concern.

## Follow-ups

- Land the migration for `sponsors`. Write the `card_palette` values in a shared TS constant consumed by both the form and the renderer so adding a palette entry is a one-file change.
- Write the `svgo` config as a dedicated module with unit tests covering: `<script>` stripping, external-ref stripping, event-handler stripping, and a "normal logo survives" test.
- Data migration from `src/utilities/sponsors.ts` at cutover: each current entry becomes a row, `money` becomes `weight`, the existing logo files copy through `sharp` into the media store. Commented-out entries become `status='archived'`.
- Reopen the tracking/UTM conversation only when a stakeholder asks for a specific report.
- Consider CSV export only if the Schatzmeister's annual report ever becomes a repeat copy-paste exercise.
