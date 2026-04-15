# Admin sponsor editor (planned)

> **Status:** not implemented. Today, sponsors are managed by editing `src/utilities/sponsors.ts` and redeploying. Commented-out entries preserve former partners; there is no UI for activating or archiving them.

## What the admin wants

The Schatzmeister renews sponsor agreements throughout the year: a new business signs on, an existing partner increases their contribution, one drops out. The admin wants to add, update, pause, and archive sponsors — including setting the `money` weight that drives rotation prominence — without touching TypeScript.

## Where it lives

Under `/admin/sponsors`, a list plus create/edit dialogs. Reached from the admin dashboard navigation.

## The list view

A single table with the entire active roster, sortable by any column:

| Logo | Name | Titel | Beitrag | Status | Aktiv seit | Aktionen |
|---|---|---|---|---|---|---|
| [img] | Getränke Falk | seit 1927 | 50 | Aktiv | 2022-03 | Bearbeiten / Pausieren / Archivieren |

Above the table, a `+ Neuer Sponsor` button and filter chips: `Aktiv | Pausiert | Archiviert`.

A small stats strip at the top shows: `23 aktive Sponsoren · Gesamtbeitrag 1.150 · Durchschnittlich 50/Sponsor`.

### Example: the new partner

A local dentist has agreed to sponsor the club for the upcoming season. The Schatzmeister opens the editor, fills in name, link, uploads the logo, sets `money` to 75 (the dentist is contributing more than most), and clicks `Speichern`. On the next homepage render the new logo enters the rotation with a slight bias toward earlier slots.

### Example: the contract pause

A sponsor's contract expires mid-season while renewal is under discussion. Rather than deleting, the admin clicks `Pausieren` — the sponsor disappears from the live site immediately but stays visible in the admin list under the `Pausiert` chip, ready to reactivate in one click.

## The create/edit editor

Fields:

- **Name** — required. Displayed as `alt` text and used in admin list.
- **Titel/Untertitel** — optional short tagline (e.g. `seit 1927`).
- **Link** — URL, required, validated. External links open in same tab (matches current behavior).
- **Logo** — drag-drop upload, accepts `.svg`, `.png`, `.jpg`, `.jpeg`, `.webp`. SVG preferred. Preview renders on both light and dark backgrounds so the admin can see whether the `brightness-0 invert` footer treatment mangles the mark.
- **hasBackground** — checkbox `Logo hat eigenen Hintergrund`. Controls whether the footer tile uses grayscale or the white-invert treatment.
- **Color (optional)** — color swatch picker if the logo needs a specific background tint in the sponsor card (replicates the legacy `Color: "bg-rose-200"` behavior).
- **Beitrag (money)** — number input, default 50. Inline help text explains: *"Höhere Werte → etwas häufiger in den oberen Rotationen. Die Reihenfolge bleibt zufällig."*
- **Status** — `Aktiv` / `Pausiert` / `Archiviert`.
- **Aktiv seit / Aktiv bis** — optional date range. If `Aktiv bis` is in the past the sponsor auto-moves to `Archiviert` on the next render.
- **Interne Notizen** — textarea, admin-only, never shown to visitors. For "Rechnung 2026 bezahlt am 12.03." or "Kontakt: Frau Müller 0151…".

Bottom buttons: `Speichern`, `Löschen`, `Abbrechen`.

## The preview

Next to the form, a live preview shows the sponsor card at three sizes simultaneously:

- News rotator slot (desktop).
- Socials rotator slot (desktop).
- Footer tile (both mobile and desktop treatments).

Any edit to the logo or `hasBackground` flag updates all three previews in real time. This catches the common mistake of uploading a logo that looks fine on a white background but vanishes under `brightness-0 invert` in the footer.

## Money weight guidance

The form includes a "contribution tiers" reference:

- **20** — nominal, small sponsor.
- **50** — standard (current default for all active sponsors).
- **100** — major sponsor, visible roughly 2× more often on the news rotator.
- **200+** — headline sponsor, dominates the top tier.

These are suggestions, not enforced — the admin can type any positive integer.

## Impression counts

If the mobile-sponsor-visibility feature ships with impression tracking, the list view adds an `Impressionen (30 T.)` column. Sorting by it lets the Schatzmeister see at a glance which sponsors are actually getting value from their placement. Can be shared with sponsors at renewal conversations.

### Example: the renewal conversation

Before meeting with Kempf Aussenanlagen to renew, the Schatzmeister opens the admin, sees 12,400 impressions over 30 days, exports the list to CSV, and walks into the meeting with a hard number rather than a vague "we showed your logo a lot."

## Bulk operations

Select multiple sponsors via checkboxes and apply: `Pausieren`, `Archivieren`, `Beitrag ändern`, `Exportieren als CSV`. Useful at season boundaries when many sponsors pause or reactivate simultaneously.

## Archived sponsors

Archiving is the soft form of deletion — the row is hidden by default but reachable via the `Archiviert` chip, and reactivation is a single click. Matches today's behavior of keeping commented-out former sponsors in the source file for later reactivation.

Hard-delete is available only from the archived state, requires typing the sponsor name to confirm, and does not remove historical impression data (aggregate only).

## Cross-cutting polish

- **CSV import/export** — bulk upload roster changes at season start; export the full list with 30-/90-/365-day impression and click stats for the Schatzmeister's annual report.
- **Contract renewal reminders** — when `Aktiv bis` enters a 30-day window the dashboard surfaces a reminder card and the admin receives an email. A 7-day follow-up escalates.
- **Click attribution** — every outbound sponsor link carries UTM tags (see `mobile-sponsor-visibility.md`); the editor shows 30-day impression and click counts side-by-side with CTR.
- **Structured data** — Schema.org `Organization` with sponsor relationships in the footer, improving the club's local-SEO graph.
- **Image optimization & sanitization** — uploads are converted to AVIF/WebP/JPEG variants; SVGs are validated and sanitized (scripts, foreign objects, event handlers stripped) before storage.
- **Tier suggestion** — if a sponsor's impression share is in the top 10% while their `money` is below 50, the admin sees a hint: "Dieser Sponsor liefert überdurchschnittliche Sichtbarkeit – Beitrag prüfen?"
- **Accessibility preview** — the live preview runs a WCAG AA contrast check against the dark footer and the rotator card; failing logos get a yellow "Kontrast niedrig" badge in the admin list so the Schatzmeister can request a logo variant.
- **Webhook on activation** — optional outbound webhook fires when a sponsor's status changes to `Aktiv`, so external systems (e.g. a Notion sponsor tracker or invoicing tool) can stay in sync.
- **Soft-limit on weight values** — the editor accepts arbitrary positive integers but warns on values above 500 ("sehr hoher Beitragswert – gewollt?") to prevent fat-finger errors that would dominate the rotation.

## What the sponsor editor does not do

- No built-in invoicing or payment tracking (tracked elsewhere by the Schatzmeister).
- No contract document storage.
- No automatic notification when `Aktiv bis` is approaching — that remains a calendar task.
- No sponsor-facing login (sponsors do not log in to see their own impressions — the Schatzmeister exports a CSV when asked).
