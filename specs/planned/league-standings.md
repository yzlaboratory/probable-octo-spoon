# League standings (planned)

> **Status:** not implemented. The legacy "Website Development" news post dated 2025-02-20 explicitly lists "Tabelle" among the missing features.

## What a visitor wants

On a Sunday evening after a match, a fan wants to see where SV Alemannia Thalexweiler stands in the league: position, games played, wins, draws, losses, goals for/against, goal difference, and points. They want the club's own row visually highlighted among the dozen or so other teams.

## Where it lives

A new section **TABELLE** on the homepage, below **ALEMANNIA NEWS** and above **SOCIALS**, so league context sits near news but ahead of the lighter social content. A deep-link route `/tabelle` renders the same table full-screen for sharing.

## The table itself

A full-width table, dark-mode-native, with these columns in order:

| # | Verein | Sp | S | U | N | Tore | Diff | Pkt |
|---|---|---|---|---|---|---|---|---|
| 1 | … | 14 | 10 | 3 | 1 | 34:9 | +25 | 33 |

- The SV Alemannia row uses a primary-color left border and slightly brighter text, so a visitor instantly finds "us."
- Top three rows get a subtle green left border (promotion zone); bottom two rows a red left border (relegation zone). The colors are thin and muted — not a traffic-light UI.
- Rows are striped with a 3% opacity white overlay for readability without fighting the `#121212` background.

### Example: the Saturday-night check

It's 19:30, a Saturday after the 15:00 kickoff. Björn opens the site on his phone, scrolls past the latest news, and lands on the table. Thalexweiler is sitting 4th with 22 points, one behind 3rd place. The table tells him what he needs without opening any other app.

## Data source

The table reads from the regional league association (SFV — Saarländischer Fußballverband) via one of:

1. A scheduled Lambda that scrapes the public SFV page once every hour and writes a normalized JSON blob to S3.
2. A community-maintained API if one becomes available.

The frontend fetches this JSON from `/api/standings` (a new Express route that proxies to S3 or returns a cached copy). On fetch failure, the table falls back to a skeleton with a discreet footer line: *"Tabelle wird aktualisiert – zuletzt gesehen: Samstag, 22:00 Uhr"* so the visitor knows whether they're looking at stale numbers.

## Responsive behavior

- **Desktop (≥lg)**: full table visible.
- **Mobile**: columns collapse to `#`, `Verein`, `Pkt`, `Tore` only; tapping a row expands it to show the remaining stats.

## Multiple teams

If the club fields a second team (Reserve) or youth teams, a small tab row above the table lets the visitor switch: **Erste | AH | A-Jugend | …** The default tab is "Erste."

## Cross-cutting polish

- **Structured data** — Schema.org `SportsTeam` and `SportsEvent` JSON-LD on the standings and detail pages so Google can show rich match snippets.
- **OpenGraph cards** — `/tabelle` has a server-rendered OG image showing the club's current position, so sharing the link in WhatsApp or Threema produces a legible card.
- **Caching** — `/api/standings` responds with an `ETag` and `Cache-Control: public, s-maxage=300, stale-while-revalidate=900`. CloudFront caches the response so SFV isn't hammered and the UI stays snappy even mid-scrape.
- **Accessibility** — table uses `scope="col"` headers, a `<caption>` naming the season, and row focus indicators. Promotion/relegation borders are paired with textual `aria-label` ("Aufstiegszone", "Abstiegszone") so status is not conveyed by color alone. WCAG AA contrast verified for all row states.
- **Deep-link archive** — `/tabelle/2024-25` (and earlier) for historical seasons once the backfill lands.
- **Analytics** — page views counted via a privacy-respecting, cookieless tool (Plausible/GoatCounter). No PII, no consent banner required under TTDSG.
- **Data quality** — if the scrape returns an internally inconsistent payload (e.g. points don't match wins × 3 + draws), the component stays on the last-known-good snapshot and surfaces a discreet "Tabelle prüfen" note to admins only.

## What it does not do

- No historical standings (past seasons).
- No chart of position over time.
- No "what if" calculator for remaining matches.
- No push notifications when the position changes.
