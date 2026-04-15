# Homepage

## The visitor arrives at svthalexweiler.de

A villager in Thalexweiler hears at the bakery that the Fasend-Dreikampf registration deadline is approaching. They pull out their phone and type `svthalexweiler.de` into Chrome.

The page loads with a black header band: on the left, the club crest sits beside the stacked wordmark **SVALEMANNIA / THALEXWEILER**. On the right, a small Instagram glyph links out to `@sgthalexweileraschbach`. A few ghostly menu, search, and login affordances are visible on larger screens but inert — they have `hover:cursor-not-allowed` and no routes. The visitor ignores them.

Below the header, scrolling begins. Three thematic sections appear in order, each preceded by a large italic headline:

1. **ALEMANNIA NEWS** — the four most recent news items as cards, newest first.
2. **SOCIALS** — the club's recent Instagram posts.
3. **VORSTAND** — twelve board members with name, role, and contact-on-hover.

A dark gradient footer closes the page with the remaining sponsor logos, the club's postal address (Alemaniastraße 21, 66822 Lebach), the 2025 copyright, and links to Impressum and Datenschutzerklärung.

### Example: the Dreikampf-hunter

Maria, mid-30s, a Thalexweiler resident, lands on the homepage in February 2026. The news section's first card is **DREIKAMPF** tagged `FESTLICHKEIT`, dated 28.01.2026, with a photo of the hall. She taps it and reads the long description with the registration phone number.

### Example: the first-time supporter

Thomas, a relative visiting from out of town, opens the site to find a contact for joining. He scrolls past news and socials, reaches VORSTAND, hovers Björn Perius' card on his laptop — the right edge slides open revealing his email and phone. He now has a direct line to the Präsident without needing a contact form.

## Section ordering is fixed

News always comes before Socials, which always comes before Vorstand. This reflects the club's priority: event-driven announcements outrank social-media activity, which outrank the static people directory. The Footer is last.

## The gap between sections

Every section is separated by a fixed `gap-30` rhythm (120px). On mobile, content starts 120px below the header band so the first news card is never clipped by the header on load.

## What the homepage does not do

- No login, no cart, no search — the icons render as disabled visual placeholders.
- No newsletter signup.
- No contact form — contact is always a `mailto:` or `tel:` or Instagram DM.
- No game schedule, no table, no squad list. (The existing "Website Development" news post acknowledges these as future work.)
