# Admin Vorstand editor (planned)

> **Status:** not implemented. Today, the twelve board members are hardcoded in `src/components/VorstandSection.tsx`. Changing a phone number means a commit.

## What the admin wants

After a club AGM (Jahreshauptversammlung), board roles shift: someone steps down, someone new takes a committee, titles change. Phone numbers occasionally update. The admin wants to edit the Vorstand list in the browser, swap a photo, reorder the display sequence, and publish.

## Where it lives

Under `/admin/vorstand`, a list plus create/edit dialogs. Reached from the admin dashboard navigation.

## The list view

A grid of cards that mirrors the public Vorstand section so the admin edits *what they see*. Each admin card has:

- The same 1:1 portrait / name / title layout as the public site.
- A drag handle to reorder.
- A `Bearbeiten` button overlay on hover.
- A status pill: `Aktiv` or `Verborgen`.

The public section preserves the admin-set order exactly — no alphabetical sort, no re-sorting by role. Whoever the admin drags to position one shows up first on the homepage.

Top-right: `+ Neues Mitglied`. A `Vorschau` button opens the public Vorstand section in a new tab so the admin can verify the final look before publishing.

### Example: after the AGM

The Geschäftsführer returns from the March AGM with two new committee chairs. He opens `/admin/vorstand`, clicks `+ Neues Mitglied` twice for the new people, drags them into the right slots, changes the title of the retiring `Spielausschuss` to `Verborgen`, and saves. The homepage reflects the new Vorstand within seconds.

## The create/edit editor

A dialog with these fields:

- **Name** — required. Displayed as-is.
- **Titel/Funktion** — the committee or role title (`Präsident`, `Geschäftsführer`, `Jugendausschuss`, `Bau- & Betriebsausschuss`, …). Free text with autocomplete from existing titles.
- **E-Mail** — required, format-validated. Shown on hover-reveal.
- **Telefon** — required, free-form (German mobile and landline formats vary). Shown on hover-reveal.
- **Portrait** — image upload. Cropper enforces a 1:1 square crop with a preview at the exact card size. Accepts `.jpg`, `.jpeg`, `.png`, `.webp`. If omitted, the card falls back to the club logo (matching today's behavior for members without a portrait).
- **Reihenfolge** — read-only number reflecting drag-and-drop position. Shown for reference.
- **Status** — `Aktiv` or `Verborgen`. Hidden members persist in the admin list but do not render on the homepage.
- **Interne Notizen** — admin-only. Useful for "bestätigt bis AGM 2028" or "telefonisch nur abends erreichbar."

Bottom buttons: `Speichern`, `Löschen`, `Abbrechen`.

## Privacy consent

Before showing a member's phone and email on a public website, an admin must check `Veröffentlichung freigegeben (DSGVO)` on the form. This consent state is timestamped and stored alongside the member record. Without the checkbox the member cannot be set to `Aktiv`. The admin list surfaces a warning icon next to any member whose consent is missing.

### Example: the new committee chair

The new Jugendausschuss member has not yet given explicit consent to having their mobile number on a public website. The admin adds the member but cannot activate them. The admin sends a brief email to the member, gets consent, returns to the editor, checks the box, activates.

## Portrait missing fallback

The club logo is the fallback portrait and is not a real image the admin uploads per-member — it's a shared asset referenced by any card without its own photo. A subtle "Kein Portrait" overlay in the admin card reminds the admin that this member is still using the fallback, without making it jarring.

## Bulk reorder

Drag-and-drop reorders the list. A `Alphabetisch sortieren` button offers one-click alphabetical sorting if the admin ever wants that default. A `Nach Rolle gruppieren` button groups by title (all Präsidenten first, then Geschäftsführer, etc.). These are both destructive reorderings so they ask for confirmation.

## Delete behavior

`Löschen` is soft — the member moves to a `Ehemalig` tab that's archived for the club's own records (useful when looking up "who was Jugendausschuss in 2023"). Hard delete removes them entirely and requires typing the name to confirm.

## Audit and history

Every edit writes an audit log entry (consistent with `admin-auth.md`). A small "zuletzt geändert am …" line on each admin card shows the last touch and admin id, so "why did the phone number change?" has a traceable answer.

## Cross-cutting polish

- **Structured data** — Schema.org `Organization` with `member`/`Person` entries on the public Vorstand section so the Google Knowledge Panel shows the current board.
- **vCard download** — the public Vorstand card exposes a small "Kontakt speichern" affordance that downloads a `.vcf` for one-tap phone save.
- **Field-level visibility** — each member can opt out of displaying phone or email individually while the data stays in the system for internal use. The DSGVO consent checkbox has three states: "Nichts öffentlich", "Nur E-Mail", "E-Mail + Telefon".
- **Photo-refresh reminders** — portraits older than 3 years show a discreet "Foto aktualisieren?" flag in the admin list.
- **Consent revocation flow** — if a former member sends a DSGVO deletion request via the contact form, the admin processes it: the member moves to `Verborgen` immediately, PII is redacted within 30 days, and the audit trail keeps only the anonymized action record.
- **Keyboard accessibility** — tabbing onto a public Vorstand card opens the contact strip and announces email/phone via `aria-live`. The hover-reveal is no longer mouse-only.
- **Alt text for portraits** — the admin upload step requires non-empty `alt` text (default: the member's name and role); fallback-to-logo portraits use `alt="Vereinslogo"`.
- **i18n-readiness** — committee titles ("Präsident", "Jugendausschuss", "Bau- & Betriebsausschuss") are stored as translation keys with a German display string, so a later English variant doesn't require editing every member record.
- **Bulk photo import** — a zip of named images (`bjoern-perius.jpg`, `matthias-heinrich.jpg`) can be dropped on the admin list and the system matches filenames to member slugs, offering a review screen before committing.

## What the Vorstand editor does not do

- No per-member personal biography or long-form text. The card stays minimal by design.
- No social media links per member.
- No election / voting workflow. This is a display editor, not an AGM tool.
- No self-service member login ("let each Vorstand member edit their own phone"). Too much auth complexity for a 12-person list; admins do the edits.
- No export of member data (beyond what an admin can manually copy from the list).
