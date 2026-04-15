# Admin sponsor editor (planned)

> **Status:** not implemented. Today, sponsors are managed by editing the source TypeScript and redeploying. Commented-out entries preserve former partners; there is no UI for activating or archiving them.

## What the admin wants

The Schatzmeister cycles sponsors throughout the year — a new business signs on, an existing partner increases their contribution, one drops out. The admin wants to add, update, pause, and archive sponsors — including setting the contribution weight that drives rotation prominence — without touching code.

## The visitor scenario

A local dentist agrees to sponsor the club for the upcoming season. The Schatzmeister opens the sponsor list, clicks `+ Neuer Sponsor`, fills in name, link, uploads the logo, sets the weight, saves. On the next homepage render the new logo enters the rotation.

A different sponsor's contract expires while renewal is being discussed. The Schatzmeister clicks `Pausieren` on the row — the sponsor disappears from the live site immediately but stays one click away from reactivation.

## MVP

- A `/admin/sponsors` list view with the active roster, sortable, plus chips for filtering by status (Aktiv / Pausiert / Archiviert).
- Per-row actions: Bearbeiten, Pausieren, Archivieren.
- A create/edit form with: name, optional tagline, link (URL-validated), logo upload, "logo has its own background" flag (controls the footer color treatment), contribution weight (number, with inline guidance on what the values mean), status, optional active-from / active-until dates, and an admin-only notes field.
- A live preview that shows how the sponsor will look in the news rotator, the socials rotator, and the footer tile — including the dark/grayscale treatment — so the Schatzmeister catches a logo that vanishes against the dark background before publishing.
- Soft archive (the "commented-out" pattern in the source today, made first-class in the UI). Hard delete only from the archived state.

That's enough to retire the source-edit workflow.

## Could ship later

Rough order of when value appears:

1. **Bulk operations** (multi-select pause/archive/weight change) — pays off at season boundaries.
2. **CSV export** of the current roster, useful for the Schatzmeister's annual report.
3. **Impression and click counters** — only if the mobile-sponsor-visibility tracking ships first; otherwise there's no data to display.
4. **Renewal reminders** when an active-until date approaches.
5. **Tier-suggestion hint** if a sponsor's impression share drastically outpaces their weight.
6. **CSV import** for season-start bulk loads.
7. **Webhook on activation** for syncing to external tools.
8. **Logo sanitization pipeline** for SVGs once SVG uploads are common.

## Weight guidance, exposed in the form

The form should make the meaning of the weight obvious to a non-technical Schatzmeister: a low number means "rare appearance," the default means "standard," and high numbers mean "headline placement." Concrete suggested tiers belong in the form's helper text, not in this spec.

## Open questions

- The current `Color` field on legacy sponsor entries (e.g. a rose-colored card background) — does the editor support arbitrary color picking, or is it a fixed palette? Pick one; both work.
- Is there a sponsor-facing portal in the long-term roadmap (so sponsors see their own impressions directly)? If yes, the data model should leave room for sponsor user accounts. If not, don't pre-build for it.

## Architecture

Tracked in `adr/0003-architecture-backlog.md` B5.

## What the sponsor editor does not do

- No invoicing or payment tracking (handled elsewhere by the Schatzmeister).
- No contract document storage.
- No automatic notifications when a contract is about to expire (in the MVP).
- No sponsor-facing login.
