# Game schedule (planned)

> **Status:** not implemented.
> **Data source:** FuPa, same as `league-standings.md`.

## What a visitor wants

A supporter deciding whether to drive out to the pitch on Saturday wants to know: who is playing, what time, home or away, where. A traveling relative wants to check whether the team has a home fixture during their visit.

## The visitor scenario

A villager opens the homepage on Friday afternoon. A section called **NÄCHSTE SPIELE** shows the next handful of fixtures as cards, each with a date, kickoff time, the two teams (with the club's name bolded), the venue, and a small home/away tag. Tapping the venue opens Maps with directions. After kickoff the same visitor reopens the page and the card for the live match shows a "LIVE" pill instead of the kickoff time.

That's the entire flow. Routing to a separate screen is optional.

## MVP

- A homepage section (placement: see `../homepage.md` for the canonical order) showing the next two or three fixtures as cards.
- A `/spiele` route showing all fixtures for the current season, grouped by month, past matches showing final score, future matches showing kickoff time.
- Cards/rows show: date, kickoff, both team names, venue, home/away tag, competition (Liga / Pokal / Freundschaft).
- Venue is tappable and opens the device's default maps app.
- **First team only.** The AH and youth fixtures are out of scope for the MVP — one audience, one section. Adding other teams becomes a tabs question once the ingest is proven.
- **Cancelled, postponed, and behind-closed-doors fixtures are hidden.** If FuPa flags a match as not playable, the card does not render. A postponed fixture reappears once FuPa attaches a replacement date. The visitor only ever sees matches they could actually attend.

That's enough to answer "is there a match this weekend, and where?" Anything else is later.

## Could ship later

In rough order:

1. **Live state** ("LIVE" pill during the kickoff window) — only if FuPa actually emits a status. If not, skip it; nobody refreshes the website during a match anyway.
2. **`SPIELBERICHT` cross-linking** between a finished fixture and a news article about it — a nice editorial touch, low effort once both exist.
3. **Filter bar** (Heim / Auswärts / Pokal) on `/spiele` — only if the season has enough fixtures to warrant it.
4. **iCalendar feed** (`.ics` per team), so a supporter can subscribe.
5. **Match-day push reminders** — speculative; probably never.
6. **Second-team and youth tabs** — only once the first-team ingest is solid and FuPa reliably covers those sides.

## Data source

FuPa, via the same ingest path as `league-standings.md`. The pre-ship terms-of-use check with FuPa support applies here too. Same daily cadence as standings — a Friday-morning refresh gives the weekend-planning audience what they need.

## Open questions

None gating the MVP.

## Architecture

Tracked in `adr/0003-architecture-backlog.md` B2 (shared with `league-standings.md`).

## What it does not do

- No ticket purchase (amateur football, free entry).
- No lineup announcements.
- No in-match commentary.
- No cancelled-match surface — cancelled, postponed, and behind-closed-doors fixtures are filtered out rather than labelled.
- No AH or youth fixtures in the MVP.
