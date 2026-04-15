# Game schedule (planned)

> **Status:** not implemented. The legacy "Website Development" news post explicitly lists "Spieltagskalender" among the missing features.
> **Depends on:** the same data-source decision as `league-standings.md`. If that question doesn't get answered, this feature can't ship either.

## What a visitor wants

A supporter deciding whether to drive out to the pitch on Saturday wants to know: who is playing, what time, home or away, where. A traveling relative wants to check whether the team has a home fixture during their visit.

## The visitor scenario

A villager opens the homepage on Friday afternoon. Below the news, a section called **NÄCHSTE SPIELE** shows the next handful of fixtures as cards, each with a date, kickoff time, the two teams (with the club's name bolded), the venue, and a small home/away tag. Tapping the venue opens Maps with directions. After kickoff the same visitor reopens the page and the card for the live match shows a "LIVE" pill instead of the kickoff time.

That's the entire flow. Routing to a separate screen is optional.

## MVP

- A homepage section showing the next two or three fixtures as cards.
- A `/spiele` route showing all fixtures for the current season, grouped by month, past matches showing final score, future matches showing kickoff time.
- Cards/rows show: date, kickoff, both team names, venue, home/away tag, competition (Liga / Pokal / Freundschaft).
- Venue is tappable and opens the device's default maps app.

That's enough to answer "is there a match this weekend, and where?" Anything else is later.

## Could ship later

In rough order:

1. **Live state** ("LIVE" pill during the kickoff window) — only if the data source actually emits a status. If not, skip it; nobody refreshes the website during a match anyway.
2. **`SPIELBERICHT` cross-linking** between a finished fixture and a news article about it — a nice editorial touch, low effort once both exist.
3. **Filter bar** (Heim / Auswärts / Pokal) on `/spiele` — only if the season has enough fixtures to warrant it.
4. **iCalendar feed** (`.ics` per team), so a supporter can subscribe.
5. **Match-day push reminders** — speculative; probably never.

## Hard prerequisite: the data source

This feature does not exist without a reliable feed of fixtures. The same SFV-data question covered in `league-standings.md` applies here. **Solve that first.** Until it's solved, this spec is paper.

## Open questions

- Same data-access uncertainty as standings.
- Does the club ever play "behind closed doors" / cancelled fixtures, and if so how does the source represent them? The card needs a clean way to render that.
- Are there second-team or youth-team fixtures the audience would also want? If yes, scope multiplies — pick a primary team for the MVP and add tabs only when the data exists.

## Architecture

Endpoint shape, data fetch cadence, caching strategy, ICS generation, structured-data emission, and accessibility implementation details belong in the same data-source ADR as the standings feature.

## What it does not do

- No ticket purchase (amateur football, free entry).
- No lineup announcements.
- No in-match commentary.
