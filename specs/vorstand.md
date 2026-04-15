# Vorstand (Board of Directors)

## The section's job

The Vorstand section is the club's phone book. Any reader — a potential sponsor, a parent looking to register their child, a former player returning to help — can find *the right person* for their concern and contact them in one click.

## The card grid

Below SOCIALS, the third horizontal gallery renders **VORSTAND**. A grid of cards covering the current board, with several visible at a time on desktop and the rest reachable by horizontal scroll. Each card is a square portrait above the person's name (bold), their role/title (smaller), and a hover-reveal contact strip.

The roster currently covers roughly a dozen members across the standard committees:

- **Präsidenten** — top-level club leadership (the club traditionally has more than one).
- **Geschäftsführer** — day-to-day operations and external correspondence.
- **Schatzmeister** — finances, sponsor renewals, infrastructure ownership.
- **Haushaltsausschuss** — budget oversight.
- **Spielausschuss** — match operations and senior team logistics.
- **Jugendausschuss** — youth teams and registrations.
- **Festausschuss** — events and festivities (Kirmes, Dreikampf, etc.).
- **Bau- & Betriebsausschuss** — pitch, clubhouse, and grounds.
- **AH Abteilung** — Alte-Herren team leadership.

Some members have a portrait photo; the rest fall back to the club crest in the same card frame.

## The hover-reveal contact

Each card has a thin invisible sliver on its right edge. When the visitor hovers it, the sliver expands across the card to reveal the person's email and phone number with mail and phone icons. On phones (no hover) the strip never opens — phone visitors instead use the Instagram glyph in the header or the footer email links to reach the club.

### Example: the sponsorship inquiry

A local business owner wants to discuss sponsoring the club. They scroll to VORSTAND, hover the Geschäftsführer's card, see the email and phone, and decide to call.

### Example: the youth registration

A parent wants to enroll their ten-year-old in the youth team. They hover the Jugendausschuss card and use the email there.

## Roles drive navigation

The implicit expectation: the reader maps their concern to a committee (`Ausschuss`) and that committee's chair is their contact. Finance → Schatzmeister. Events → Festausschuss. Matches → Spielausschuss. Youth → Jugendausschuss. Building/grounds → Bau- & Betriebsausschuss. Senior/Alte-Herren team → AH Abteilung.

## Dual Präsidenten

The club is led by more than one Präsident, treated as peers. Either is a valid top-level contact — the visitor does not have to pick the "right" one.

## Data staleness

The roster currently lives as a hardcoded list in the source. If a member resigns or a role changes hands, someone has to edit code and redeploy. There is no admin interface yet — see `planned/admin-vorstand-editor.md`.

## What the section does not offer

- No biographies or "meet the team" pages.
- No photos on click — the image is decorative only.
- No sorting or filtering.
- No org-chart visualization of the committee hierarchy.
