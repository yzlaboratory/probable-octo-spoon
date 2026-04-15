# Game schedule (planned)

> **Status:** not implemented. The legacy "Website Development" news post dated 2025-02-20 explicitly lists "Spieltagskalender" among the missing features.

## What a visitor wants

A supporter deciding whether to drive out to the pitch on Saturday wants to know: who is playing, at what time, home or away, and where. A traveling relative wants to check if the team has a home fixture during their visit.

## Where it lives

A new section **NÄCHSTE SPIELE** (next matches) on the homepage, directly under the TABELLE section. A deep-link `/spiele` renders a fuller schedule view with past results included.

## The homepage component: next 3 fixtures

A horizontal strip of three cards, styled like the existing news cards for visual consistency:

- **Left edge** — a large day/month block (`SA 22.03.`) in the primary color.
- **Kickoff time** — `15:00 Uhr`.
- **Teams** — `SV Alemannia Thalexweiler — FC Schmelz`, with the club name bolded whichever side it is on.
- **Venue** — `Alemaniastr. 21, Thalexweiler` for home matches, the away club's address for away matches. Tapping opens Google/Apple Maps.
- **Competition badge** — small pill, e.g. `Kreisliga`, `Pokal`, `Freundschaft`.
- **Home/Away indicator** — a two-character tag `H` or `A` in the corner.

### Example: the away-match fan

Thomas checks Friday afternoon. The first card shows: **SA 22.03. / 15:00 Uhr / SV Schmelz — SV Alemannia Thalexweiler / A / Kreisliga**. He taps the venue and Maps opens with directions from his house.

## The full schedule view `/spiele`

A vertical list grouped by month. Past matches show the final score in a primary-color box (`3:1` green if won, `1:1` neutral if drawn, `0:2` muted red if lost), upcoming matches show just the kickoff time. A filter bar at the top switches between **Alle | Heim | Auswärts | Pokal**.

### Example: the season review

In April, a long-time fan opens `/spiele`, scrolls through the season, and sees which matches Thalexweiler won, lost, drew. No stats dashboard — just the list, honest.

## Data source

Same pipeline as the standings — a Lambda scrapes SFV once per hour and writes `/api/schedule`. Each fixture has: date, time, home team, away team, venue, competition, status (`scheduled` / `live` / `finished`), and score (for finished).

## Live-match state

On match day during the kickoff window, the card for the currently-playing match switches to a "LIVE" pill (pulsing primary color) with the current minute if available from the scrape. When the scrape does not supply live minute data, the pill just reads "LIVE" without a clock.

## Team selection

Matches the league-standings section: a tab row to switch between Erste, AH, youth teams as applicable. Default is Erste.

## Cross-cutting polish

- **ICS calendar feed** — `/api/schedule.ics` emits an iCalendar document a supporter can subscribe to once in Apple Calendar, Google Calendar, or Outlook and receive fixture updates automatically. Per-team feeds (`/api/schedule/erste.ics`, `/api/schedule/ah.ics`) also available.
- **Structured data** — Schema.org `SportsEvent` JSON-LD per fixture (home/away, kickoff, venue, competition) drives rich Google snippets.
- **OpenGraph per fixture** — `/spiele/:id` produces a shareable OG image with the date, teams, kickoff, and competition badge.
- **Match-day reminders** (opt-in via Web Push API) — two hours before kickoff, subscribed visitors get a browser notification. Opt-out is a single click in the notification settings of the site.
- **Schedule ↔ news linking** — a finished match with a `SPIELBERICHT` news article linked by fixture id gets a "Bericht lesen" action on its row. Conversely the news article shows a small fixture card above the body.
- **Accessibility** — list items use `<time datetime>` for machine-readable times; keyboard focus order follows reading order; live state uses `aria-live="polite"` so screen readers announce changes.
- **Analytics** — schedule.ics downloads, push-subscription rate, fixture detail views, and news cross-click counted.
- **Caching** — same SFV-scrape → S3 → `/api/schedule` pipeline as standings, with ETag and `stale-while-revalidate`.

## What it does not do

- No ticket purchase (amateur football, free entry).
- No lineup announcements (manager decides minutes before kickoff).
- No in-match commentary.
- No calendar export button (could be added later as an `.ics` endpoint).
