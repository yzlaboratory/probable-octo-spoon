# Navigation and site chrome

## A small set of routes

The site exposes a handful of routes:

- `/` — the homepage (news, socials, vorstand, footer).
- `/Impressum` — the legal disclosure page.
- `/Datenschutzerklaerung` — the privacy policy.
- `/news/:slug` — a single news article.

All transitions feel instant: clicking a news card or a footer link does not produce a full page reload, and the browser's back button still works as expected. Refreshing a deep URL also lands on the right page.

### Unknown routes

If a visitor types a URL that doesn't match any route — a mistyped `/impresum`, a stale bookmark, a crawler guessing at paths — the page renders an inline **"Seite nicht gefunden"** message inside the standard Layout, with a short link back to the homepage. Header and footer still show. No dedicated 404 route, no error chrome; the treatment mirrors the article-level fallback in `news-browsing.md`.

## The persistent header

A header renders at the top of every route. It does not scroll away with the content below.

Always visible and functional:

- The club crest on the left (decorative, not a link).
- The wordmark **SVALEMANNIA / THALEXWEILER** (decorative).
- An Instagram glyph on the right that links out to the club's Instagram account.

On larger screens, two affordances are visible but visibly disabled — a `LOGIN` button and a cart icon. They render with a dimmed appearance and a "not allowed" cursor on hover. Each anticipates a real roadmap item (`planned/admin-auth.md` for login, `planned/cart.md` for merch and membership dues) and communicates "not yet" without producing a broken click.

A hamburger menu and a search icon previously rendered here alongside login and cart. Neither has a planned follow-up, so both have been removed — keeping disabled affordances that don't point at a real roadmap would be dishonest chrome.

### Example: the member who expects to log in

A long-time member who heard the website was relaunched goes looking for a login. They see the disabled `LOGIN` affordance, hover it, see the disabled cursor, and close the tab. The signal is honest — "not yet" — rather than a broken-looking error.

## The header is not a navigation menu

There is no menu of site sections in the header. The only navigation away from the homepage is via footer links or by tapping a news card. With only a handful of routes, a nav bar would be more chrome than content.

## The footer as nav-of-last-resort

The Footer is the only place to reach Impressum, Datenschutzerklärung, and the external Instagram page (besides the header glyph). A `Startseite` link returns a visitor stranded on a news article to the homepage without forcing the back button.

## Responsive behavior

The site rearranges itself across phone, tablet, and desktop widths: spacing opens up, typography scales up, gallery navigation buttons appear on wider screens, and footer sponsor tiles change shape. The phone experience is swipe-first; the desktop experience adds chevron buttons and shows more content per row.

## Language

The site is German-only today because the audience is German. That is a current-state observation, not a permanent policy — if the club ever grows a meaningfully non-German-speaking cohort (airbase families, newly arrived residents, etc.), multilingual content becomes a real question. Individual specs repeat the "no multilingual" disclaimer because the feature is not on any roadmap, not because it has been ruled out forever.

## What the site chrome does not include

- No breadcrumb trail.
- No skip-to-content link.
- No language switcher (see "Language" above).
- No theme switcher — the site is dark-mode-only.
- No cookie banner.
- No live chat widget.
