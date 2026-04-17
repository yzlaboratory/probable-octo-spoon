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
- **Card background colour is picked from a fixed palette**, not a free hex picker. The palette covers the existing club accent (low-saturation purple), one warm neutral, one cool neutral, and a "no background / transparent" default. Keeps the visual system coherent and stops a non-designer Schatzmeister from picking a colour that clashes with the dark page or fails contrast against the logo. If a legacy sponsor used a one-off tone outside the palette, the closest palette entry is chosen at migration.
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

None gating the MVP. Colour is a fixed palette; no sponsor-facing portal is planned, so the data model does not reserve space for sponsor user accounts.

## Architecture

Specified in ADR 0011.

## What the sponsor editor does not do

- No invoicing or payment tracking (handled elsewhere by the Schatzmeister).
- No contract document storage.
- No automatic notifications when a contract is about to expire (in the MVP).
- No sponsor-facing login — not in the MVP, and not planned. Sponsors remain data, not users; the data model deliberately does not reserve a `sponsor_user` relationship.
