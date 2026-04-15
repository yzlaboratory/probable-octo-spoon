# News browsing

## The news reel on the homepage

The news section is a horizontal gallery titled **ALEMANNIA NEWS**. On a desktop viewport it shows several cards at once; on phones, a single card fills most of the screen and the visitor advances by swiping.

News is sorted newest first. Each card shows: an accent bar in the primary color, the localized date, the uppercase category tag (e.g. `FESTLICHKEIT`, `AUFRUF`, `DIGITAL`), the title, and a short, line-clamped description.

### Example: Maria and the freshest news

In April, the top card is a recent call-for-volunteers article. Behind it come Dreikampf, Kirmes, Fünfkampf, the previous year's Dreikampf, and the legacy Website Development post last.

## The sponsor card breaks up the news flow

Inside the news gallery, a sponsor rotator is inserted partway through so the visitor cannot scan all the freshest cards in an uninterrupted row. This is intentional: it gives the club's paying backers guaranteed eyeballs next to the most-read section. See `sponsor-display.md` for the rotation rules.

## Desktop gallery navigation

On wider screens, left and right chevron buttons overlay the gallery. Clicking *next* scrolls the gallery forward by a full batch of cards. The buttons hide when there's nothing more to scroll to in that direction. On phones the chevrons are absent — the visitor swipes.

## Reading a single article

Every news card links to a detail page at `/news/:slug`. Tapping a card navigates the SPA without a full reload.

On the detail page the visitor sees:

- A large uppercase title.
- The accent bar with the localized date and tag.
- A hero image alongside the long description on desktop, stacked on mobile. The image is sized to feel substantial without dominating the viewport.

The footer appears beneath.

### Example: the deep-read

A visitor taps the call-for-volunteers card from the homepage. The short preview expands into the full article — a candid explanation that the club needs help, with named contacts. The article is roughly twice the length of the homepage preview.

## Missing-article fallback

If the visitor manually types a slug that doesn't exist, the page renders an inline **"Artikel nicht gefunden"** message inside the standard layout. No redirect, no 404 chrome — header and footer still render.

## What news browsing does not include

- No pagination or "load more" — the full set fits in the horizontal scroll.
- No filtering by tag. The tag is decorative, not a facet.
- No search.
- No comments, likes, or shares.
- No RSS.
