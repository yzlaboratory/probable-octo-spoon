# Admin Vorstand editor (planned)

> **Status:** not implemented. Today, board members are hardcoded in source. Changing a phone number means a commit.

## What the admin wants

After a club AGM (Jahreshauptversammlung), board roles shift: someone steps down, someone new takes over a committee, titles change. Phone numbers occasionally update. The admin wants to edit the Vorstand list in the browser, swap a photo, reorder the display sequence, and publish.

## The visitor scenario

The Geschäftsführer returns from the March AGM with two new committee chairs. They open the admin Vorstand editor, click `+ Neues Mitglied` twice for the new people, drag them into the right slots, hide the retiring chair, save. The homepage Vorstand section reflects the new roster within seconds.

The admin list mirrors the public section visually — they edit the cards as they appear to visitors, not a separate abstract table.

## MVP

- A `/admin/vorstand` view that mirrors the public card grid, with each admin card showing a status pill (Aktiv / Verborgen), a drag handle for reordering, and a `Bearbeiten` action.
- A create/edit dialog with: name, role/title (autocompleting against existing titles), email, phone, portrait upload (square crop, fallback to club crest if absent), status, admin-only notes.
- An explicit DSGVO consent checkbox per member: the member's contact details cannot go public until an admin confirms the member has agreed. The list flags any member whose consent is missing.
- Soft delete to an `Ehemalig` archive that preserves the historical record. Hard delete only from the archive, with name-typing confirmation.
- **Consent revocation = hard erase.** When a former member requests removal under DSGVO, their record is deleted from the live roster *and* their name is scrubbed from audit-log entries (replaced with `<ehemaliges Mitglied>`) within the 90-day audit window. The club does not maintain a separate "Vorstand 2023–2026" historical archive — the simplicity is deliberate, at the cost of losing a historical record of who held which role.
- Audit-log entry per change, retained for 90 days per `admin-auth.md`.

That's enough to retire the source-edit workflow.

## Could ship later

Rough order:

1. **Photo crop tooling** in the upload step — only if free-form upload produces too many badly framed cards.
2. **vCard download** affordance on public cards ("Kontakt speichern" → `.vcf`).
3. **Granular consent**: separate flags for "show email" vs. "show phone."
4. **Photo-refresh reminders** for portraits older than a few years.
5. **Bulk reorder helpers** ("alphabetisch sortieren," "nach Rolle gruppieren").
6. **Bulk photo import** by filename matching.
7. **Keyboard accessibility** for the public hover-reveal contact strip — should be addressed regardless, but tracked here as a follow-up if not in the MVP.

## Open questions

None gating the MVP. The public hover-reveal's keyboard and touch accessibility are handled as a separate concern (tracked under each individual spec's follow-ups rather than a dedicated a11y track — see `../README.md`), and the editor ships against the current public component as-is. Consent revocation is hard-erase, as above.

## Architecture

Tracked in `adr/0003-architecture-backlog.md` B6.

## What the Vorstand editor does not do

- No per-member biography or long-form text on the public card.
- No social media links per member.
- No election or voting workflow — this is a display editor, not an AGM tool.
- No self-service per-member login (admins do all edits for the small board).
- No public export of member data.
