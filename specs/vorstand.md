# Vorstand (Board of Directors)

## The section's job

The Vorstand section is the club's phone book. Any reader — a potential sponsor, a parent looking to register their child, a former player returning to help — can find *the right person* for their concern and contact them in one click.

## The card grid

Below SOCIALS, the third horizontal gallery renders **VORSTAND**. Twelve cards, six visible at a time on desktop. Each card is a 1:1 portrait photo above the person's name (bold), their role/title (smaller), and a hover-reveal contact strip.

The twelve current members are hardcoded in `VorstandSection.tsx`:

| Name | Role |
|---|---|
| Björn Perius | Präsident |
| Christian Schwirz | Präsident |
| Matthias Heinrich | Geschäftsführer |
| Yannik Zeyer | Schatzmeister |
| Benno Bohliner | Haushaltsausschuss |
| Mathias Zöhler | Spielausschuss |
| Pascal Herre | Jugendausschuss |
| Dennis Hurth | Festausschuss |
| Markus Leinenbach | Bau- & Betriebsausschuss |
| Holger Saar | Vorsitzender AH Abteilung |
| Nicolas Heinrich | Spielausschuss |
| Andre Seewald | AH Abteilung |

Five members have a portrait photo (Matthias Heinrich, Mathias Zöhler, Dennis Hurth, Holger Saar, Nicolas Heinrich). The remaining seven fall back to the club logo.

## The hover-reveal contact

Each card has an invisible vertical sliver on the right edge — 4px wide. When the visitor hovers, the sliver expands to fill the card's width, revealing the person's email and phone number with mail and phone icons. On mobile (no hover), the strip never opens — phone users instead tap the sponsor/news sections or use the footer links for contact.

### Example: the sponsorship inquiry

A local business owner wants to discuss sponsoring the club. They scroll to VORSTAND, hover Matthias Heinrich (Geschäftsführer), get `matze234@t-online.de` and `0151 1560 7391`, and decide to call.

### Example: the youth registration

A parent wants to enroll their 10-year-old in the youth team. They hover Pascal Herre (Jugendausschuss) and use the email.

## Roles drive navigation

The implicit expectation: the reader maps their concern to a committee (`Ausschuss`) and that committee's chair is their contact. Finance → Schatzmeister. Events/festivities → Festausschuss. Games/matches → Spielausschuss. Youth → Jugendausschuss. Building/grounds → Bau- & Betriebsausschuss. Senior/Alte-Herren team → AH Abteilung.

## Dual Präsidenten

The site lists **two** Präsidenten (Björn Perius and Christian Schwirz). Both are treated as peers — either is a valid top-level contact.

## Data staleness warning

The Vorstand list is a hardcoded TSX constant, not loaded from a CMS. If a member resigns or a role changes hands, someone must edit `VorstandSection.tsx` and redeploy. There is no admin interface.

## What the section does not offer

- No biographies or "meet the team" pages.
- No photos on click (the image is decorative only).
- No sorting or filtering.
- No org-chart visualization of the committee hierarchy.
