# Navigation and site chrome

## Single-page application with four routes

The site is a Vite + React 19 SPA. Four routes live under a shared `Layout`:

- `/` — HomePage (news, socials, vorstand, footer).
- `/Impressum` — static legal page.
- `/Datenschutzerklaerung` — static privacy page.
- `/news/:path` — dynamic article page.

All transitions are client-side via react-router's `<Link>`. A user clicking a news card or a footer legal link never sees a full page reload; the browser history still advances so the back button works.

A refresh at any URL (including `/news/foo`) is served by the Express static middleware with an SPA fallback: any unknown path returns `dist/index.html` and react-router re-resolves the route on the client.

## The persistent header

`Header` renders at the top of every route. It never scrolls away (relative, not sticky, but always first in the layout order).

Visible and functional on every screen:

- **Club crest** (left) — decorative, not a link.
- **Wordmark** `SVALEMANNIA / THALEXWEILER` — decorative.
- **Instagram glyph** (right) — outbound to `https://www.instagram.com/sgthalexweileraschbach/`.

Visible but inert on large screens (≥lg, 1024px):

- A hamburger `menu` icon at left edge.
- `LOGIN` button.
- `shopping_cart` glyph.
- `search` glyph.

These all carry `hover:cursor-not-allowed hover:opacity-50`. They exist in the markup because the design anticipates a future with member login, merchandise, and site search, but none of those ship today. A visitor who hovers any of them sees a "not allowed" cursor and dimmed opacity — an honest signal that the feature is not live.

### Example: the member who expects to log in

A long-time member who heard the website was relaunched goes looking for a login. They see the `LOGIN` button at large-screen size, click it, notice nothing happens, hover again and see the crossed-circle cursor, and close the tab. The affordance tells them "not yet" without a broken-looking error.

## The header is not a navigation menu

There is no menu of site sections in the header. The only navigation out of the homepage is via footer links or by clicking a news card. This is deliberate: with only four routes, a nav bar would be more chrome than content.

## The footer as nav-of-last-resort

The Footer is the only place to reach Impressum, Datenschutzerklärung, and the external Instagram page (besides the header glyph). It also includes a `Startseite` link so a visitor stranded on a news article can get home without using the back button.

## Layout nesting

`<Layout>` renders `<Header>` once, then `<Outlet>` for the page content. Each page is responsible for rendering its own `<Footer>` (HomePage, NewsDetailPage, ImpressumPage all do). The DatenschutzPage also includes a footer. If a future page forgets to include a footer, it will render without one — the Layout does not enforce a footer.

## Responsive breakpoints

The site uses Tailwind's default breakpoints, and real layout shifts happen at:

- **md (768px)** — wordmark grows, spacing between logo and wordmark opens up, headings scale up.
- **lg (1024px)** — gallery left/right chevrons appear; sponsors-in-footer go from 96px-wide tiles to auto-width; Datenschutz headings jump to display sizes.
- **xl (1280px)** — menu icon becomes "visible" (still inert).
- **2xl** — font sizes bump once more inside cards.

Below 768px the site is phone-first: one news card fills 90% of the viewport, the gallery chevrons are hidden, and horizontal swipe is the only way to advance.

## What the site chrome does not include

- No breadcrumb trail (e.g. on news detail, the user is not told "News > Dreikampf").
- No skip-to-content link for accessibility.
- No language switcher.
- No theme switcher — the site is dark-mode-only.
- No cookie banner.
- No live chat widget.
