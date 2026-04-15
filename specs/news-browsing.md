# News browsing

## The news reel on the homepage

The news section is a horizontal gallery titled **ALEMANNIA NEWS**. On a desktop viewport it shows four cards at a time; on mobile, cards are 90% of the viewport width and the user scrolls laterally with a finger swipe.

News items live in `src/data/news.json`. Every time the homepage renders, the list is sorted by `date` descending — newest first — before being handed to the gallery. A card shows: a small primary-color bar, the localized date, the uppercase category tag (e.g. `FESTLICHKEIT`, `AUFRUF`, `DIGITAL`), the title, and a four-line-clamped short description.

### Example: Maria and the freshest news

In April 2026, the top card is **"Der Verein braucht DICH!"** (AUFRUF, 22.03.2026) because it's the most recent. Behind it come DREIKAMPF (Jan 2026), KIRMES (Jun 2025), FÜNFKAMPF (May 2025), FAASEND DREIKAMPF (Jan 2025), and the legacy Website Development post last.

## The sponsor card breaks up the fourth slot

After the third news card, before the fourth, the gallery inserts a sponsor rotator. This means the visitor cannot scan all four newest cards in an uninterrupted row — the sponsor panel is unavoidable. This is intentional: it gives the club's paying backers guaranteed eyeballs next to the most-read section.

The top-funded sponsors (by `money` weight) are preselected, then shuffled for fairness within that top tier, and each sponsor gets ~15 seconds of display before auto-advancing to the next. See `sponsor-display.md` for the full logic.

## Desktop gallery navigation

On screens ≥64rem (1024px), left and right chevron buttons overlay the gallery. Clicking *next* scrolls the container by `card-width × 4`, revealing the next batch of four. The buttons auto-hide: the *prev* button disappears at scroll position zero, the *next* button disappears once the end is reached.

On mobile and tablet the chevrons are hidden entirely — the visitor swipes.

## Reading a single article

Every news card is a `<Link>` to `/news/:path` where `:path` is a URL-safe slug stored on the item (e.g. `dreikampf2026-02-14`). Tapping a card navigates the SPA to the detail page without a full reload; the react-router route renders `NewsDetailPage`.

On the detail page, the visitor sees:

- A large uppercase title (`DREIKAMPF`).
- The primary-color bar with the localized date and tag.
- A hero image occupying two-thirds of the row on desktop, full width on mobile, capped at 70vh to avoid dominating the screen.
- The `long` description on the right third (desktop) or stacked below (mobile).

The footer appears beneath.

### Example: the deep-read

Thomas taps "Der Verein braucht DICH!" from the homepage. He lands at `/news/vereinbrauchtdich2026-03-22`. The short preview he saw on the card expands into the full call-to-arms — a candid explanation that the club needs volunteers, listing Björn and Matthias as contacts. The article is about twice as long as the homepage preview.

## Missing-article fallback

If the visitor manually types `/news/nonsense-slug`, `NewsDetailPage` calls `rawNews.find()`, gets `undefined`, and renders a centered white line: **"Artikel nicht gefunden"**. No redirect, no 404 chrome — just the inline message inside the standard layout. The header and footer still render because Layout is a parent route.

## Image resolution

Image URLs in `news.json` are written as `/src/assets/filename.jpg`. On page render, Vite's `import.meta.glob('/src/assets/*.{jpeg,jpg,png,svg}', { eager: true })` produces a keyed map and the card/detail page looks up the real hashed build asset. Missing images render as empty — no broken-image icon.

## What news browsing does not include

- No pagination or "load more" — all six items fit in the horizontal scroll.
- No filtering by tag. The tag is decorative, not a facet.
- No search.
- No comments, likes, or shares.
- No RSS.
