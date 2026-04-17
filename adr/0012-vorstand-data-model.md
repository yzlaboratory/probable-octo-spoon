# ADR 0012 — Vorstand data model and portrait handling

- **Status:** Accepted
- **Date:** 2026-04-17
- **Deciders:** Yannik Zeyer.
- **Supersedes:** none
- **Superseded by:** none
- **Related:** `specs/planned/admin-vorstand-editor.md`, `specs/vorstand.md`, ADR 0007 (SQLite), ADR 0010 (shared media table).

## Context

`specs/planned/admin-vorstand-editor.md` fixes the admin experience: a card-grid view that mirrors the public Vorstand section, create/edit dialog with portrait upload, drag-to-reorder, soft delete to an `Ehemalig` archive. Architecture — schema, reorder persistence, portrait crop, vCard generation, consent tracking — was deferred to this ADR. ADR 0003 tracked them in B6.

Per-member DSGVO consent tracking and the hard-erase / audit-scrub flow are cut from the MVP. The public Vorstand roster ships on the legal basis of **legitimate interest** (Art. 6(1)(f) DSGVO): board members publish their official contact data as part of their representative role. This is a defensible basis for office-bearers acting in that capacity; it is weaker for purely private mobile numbers, which the Datenschutzerklärung should make clear. If the club later wants explicit consent tracking, add a `consent_given_at` column at that time.

vCard download is cut — it was already in "could ship later" territory and not MVP.

## Decision

1. **Data model (SQLite).**
   ```
   vorstand(
     id             INTEGER PRIMARY KEY,
     name           TEXT NOT NULL,
     role           TEXT NOT NULL,
     email          TEXT,
     phone          TEXT,
     portrait_media_id INTEGER REFERENCES media(id),  -- null falls back to the club crest at render time
     notes          TEXT,                              -- admin-only
     status         TEXT NOT NULL CHECK (status IN ('active','hidden','archived')),
     display_order  INTEGER NOT NULL,                  -- integer ordinal; mass-update on reorder
     created_at     TEXT NOT NULL,
     updated_at     TEXT NOT NULL
   );
   ```
   Indexes: `vorstand(status, display_order)` for the public-roster query.
2. **Reorder persistence.** Integer `display_order`, assigned in increments of 1. Reordering a member in the admin UI issues one `UPDATE` per affected row in a single transaction. At ~10 members this is trivial; the simpler mental model beats fractional/float ordering or a linked list.
3. **Portrait upload pipeline.**
   - **Accepted formats:** PNG, JPEG, WebP. No SVG for portraits — portraits are raster content.
   - **Max upload size:** 5 MB.
   - **Crop.** Client-side square-crop step in the admin UI using a small crop component. The server receives an already-cropped image and is not responsible for guessing a crop.
   - **Variant generation.** `sharp` generates WebP variants at 160w (avatar), 320w (card), 640w (Retina card). Stored under `/var/lib/clubsoft/media/vorstand/<uuid>/<variant>.webp` via the shared `media` table from ADR 0010.
   - **Missing portrait.** A null `portrait_media_id` renders the club crest, matching current public behaviour. No per-member placeholder.
4. **Status semantics.**
   - `active` — visible in the public roster.
   - `hidden` — kept in the admin list (with a `Verborgen` pill) but not rendered publicly. Used to temporarily remove a member without archiving, e.g. during a role transition.
   - `archived` — soft-deleted. Hidden from admin card grid by default; accessible via the `Ehemalig` filter.
5. **Hard delete.** Only from the `archived` state, with name-typing confirmation in the UI. Deletes the row outright and unlinks the portrait media (refcount from the shared `media` table handles orphan cleanup).
6. **No consent columns, no audit scrub.** Dropping a member is a plain `DELETE`. No `consent_given_at`, no `consent_revoked_at`, no audit-log rewrite pass. The Datenschutzerklärung must describe the legitimate-interest basis; the data model does not carry per-row consent state.
7. **No vCard generation.** The public card's hover-reveal contact strip surfaces phone and email as tap-to-call and `mailto:` links. An admin or visitor who wants to save the contact uses their platform's built-in affordance.

## Alternatives considered

- **Fractional/float `display_order` for O(1) reorders.** Rejected: drift after many reorders requires renormalisation passes, and at ~10 members the integer-with-mass-update approach fits in a single transaction without any of that.
- **Linked list (`prev_id`/`next_id`).** Rejected: simpler moves, painful reads. The public roster query would become a recursive CTE for no reason.
- **Server-side auto-crop.** Rejected: a wrong auto-crop crops someone's forehead off. Client-side crop with a visible preview is the correct UX for a portrait.
- **Accept SVG portraits.** Rejected. Portraits are photographs.
- **Per-member DSGVO consent checkbox + flag for "consent missing."** Cut from the MVP. For office-bearers in their representative role, legitimate interest is a defensible basis. Re-add the column when the club wants to formalise consent tracking, not pre-emptively.
- **Consent-revocation hard-erase + audit-log scrub within the 90-day window.** Cut from the MVP along with the audit log itself (ADR 0009). A `DELETE` is sufficient; there is no audit trail to scrub.
- **vCard generation.** Cut. Was already in "could ship later" territory.
- **Maintain a historical `vorstand_archive` table ("Vorstand 2023–2026").** Rejected at the spec level. The roster is a display; chronicling who held which role historically is a different project.

## Consequences

### Positive

- Schema is the smallest possible shape that satisfies the editor.
- Integer `display_order` with a mass-update UI is easy to reason about.
- Reusing the `media` table from ADR 0010 means the portrait pipeline has no bespoke code outside the `sharp` variant set.
- Hard delete is a single SQL statement, not a multi-step ceremony.

### Negative / Costs

- **Legitimate-interest basis is weaker than explicit consent.** A member who objects to the publication of their phone number in principle (Art. 21 DSGVO — right to object on compelling grounds) has to be handled by the admin via a direct edit (clear the phone field or hide the member); there is no structured revocation flow. Accepted; document in the runbook.
- **Status-change history is not kept.** "When did X stop being Vorsitzender?" cannot be answered from the database; only the current state exists. Accepted at this scale.
- **Reorder transactions become more expensive as the roster grows.** Still fine at hundreds, irrelevant at the dozen-ish scale of a club board.

### DSGVO / legal

- Vorstand contact details are personal data processed on the basis of legitimate interest (Art. 6(1)(f) DSGVO), specifically: the necessity to make office-bearers of a registered association reachable in their representative role. The Datenschutzerklärung must reflect this, and the club must be prepared to handle Art. 21 objections individually.
- Storage of portrait images inherits EBS-at-rest encryption via ADR 0007 and ADR 0008.
- No cross-border transfer. No third-party embed of member data.

## Follow-ups

- Land the `vorstand` migration with the `status`/`display_order` columns and the portrait-media foreign key.
- Update the Datenschutzerklärung to state the legitimate-interest basis for publishing Vorstand contact data, and to describe the process for lodging an Art. 21 objection with the club.
- Write the client-side crop component as a small self-contained piece so it can be reused for other portrait-shaped uploads (e.g. trainer photos in `training-times`).
- Data migration from `src/components/VorstandSection.tsx` at cutover: each hardcoded member becomes a row, the existing portrait assets copy through `sharp` into the media store.
- Reopen the explicit-consent conversation only if the club decides to move off the legitimate-interest basis, or a specific member asks for it.
