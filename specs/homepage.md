# Homepage

## The visitor arrives at svthalexweiler.de

A villager in Thalexweiler hears at the bakery that the Fasend-Dreikampf registration deadline is approaching. They pull out their phone and type `svthalexweiler.de` into Chrome.

The page opens with a dark header band: the club crest sits beside the stacked wordmark **SVALEMANNIA / THALEXWEILER**, and an Instagram glyph on the right links out to the club's account. On larger screens the visitor may notice menu, login, cart, and search affordances rendered in a disabled style — they signal "not yet" rather than offering a broken click.

Below the header, the visitor scrolls through three thematic sections in fixed order, each preceded by a large italic headline:

1. **ALEMANNIA NEWS** — the most recent news items as cards, newest first.
2. **SOCIALS** — the club's recent Instagram posts.
3. **VORSTAND** — the board of directors with name, role, and contact-on-hover.

A footer closes the page with the remaining sponsor logos, the club's postal address, the copyright line, and links to Impressum and Datenschutzerklärung.

### Example: the Dreikampf-hunter

A Thalexweiler resident lands on the homepage and the freshest news card is the upcoming Dreikampf event with a photo of the hall. They tap it and read the registration details in the long description.

### Example: the first-time supporter (on a laptop)

A relative visiting from out of town opens the site on a laptop to find a contact for joining. They scroll past news and socials, reach VORSTAND, hover the Präsident's card — the right edge slides open revealing email and phone. They have a direct line without needing a contact form. (On a phone the hover-reveal does not open; see `vorstand.md`.)

## Section ordering is fixed

News always comes before Socials, which always comes before Vorstand. This reflects the club's priority: event-driven announcements outrank social-media activity, which outranks the static people directory. The Footer is last.

## Planned section order (canonical, once new sections land)

As planned features land, they slot into a single agreed order so no planned spec has to claim homepage real estate on its own:

1. **ALEMANNIA NEWS** (current)
2. **NÄCHSTE SPIELE** (`planned/game-schedule.md`)
3. **TABELLE** (`planned/league-standings.md`)
4. **TRAINING** (`planned/training-times.md`)
5. **SOCIALS** (current)
6. **VORSTAND** (current)
7. Footer

The shape is match-first: news, then the weekend's fixtures, then where the club sits in the table, then the weekly training grid — the "what's happening this week" block — followed by the existing social and people sections. Each planned spec references this order rather than redeclaring it.

## Section rhythm

Sections breathe with consistent vertical spacing, and the first news card is never clipped by the header on initial load — even on a small phone. The visitor feels a deliberate cadence rather than a wall of content.

## What the homepage does not do

- No login, no cart, no search — the affordances render as disabled visual placeholders.
- No newsletter signup.
- No contact form — contact is always a `mailto:`, `tel:`, or Instagram DM.
- No game schedule, no league table, no squad list — those are tracked in `planned/game-schedule.md` and `planned/league-standings.md`.
