# League standings (planned)

> **Status:** not implemented. The legacy "Website Development" news post lists "Tabelle" among the missing features.
> **Blocked on:** an open question, not on engineering.

## The open question that gates everything

The Saarländischer Fußballverband (SFV) publishes the league table on its public website. The club does not have a contractual data feed and there is no community-maintained API the team has identified. Three options exist, none of them obviously correct:

1. **Scrape the SFV page on a schedule.** Cheapest. Fragile to layout changes. Depends on what SFV's terms of service say about automated reuse — *that needs to be answered before any code is written.* Unknown today.
2. **Manual entry by an admin** after each matchday. Robust, no scraping, but adds a recurring chore for someone in the Vorstand. Realistic only if there is an actual person willing to commit to it for a season.
3. **Wait for an official feed.** Ongoing — there is no timeline.

This spec exists, but **the feature does not move forward until one of these three options is selected and committed to.** Picking a UI before picking a source produces dead requirements.

## What a visitor would experience, once the source exists

On a Sunday evening after a matchday, a fan opens the homepage, scrolls past news, and lands on a section called **TABELLE**. A simple table shows the league: position, team name, games played, wins/draws/losses, goals for/against, goal difference, points. The club's own row is visually highlighted so the fan finds "us" immediately. Top and bottom of the table carry subtle visual cues for the promotion and relegation zones.

That is the entire scenario. No calculator, no chart, no notifications.

## MVP — once the data source is settled

- A homepage section after **ALEMANNIA NEWS** showing the current league table.
- The club's row visually marked.
- A timestamp ("zuletzt aktualisiert: …") so the visitor knows whether the table is fresh.
- Graceful skeleton/fallback when the source is unreachable, matching the same pattern the Instagram feed already uses.

That's it. No deep-link route, no historical view, no per-team page.

## Could ship later

Rough order:

1. **A `/tabelle` deep-link route** for sharing.
2. **Promotion/relegation visual cues** with proper accessible labels.
3. **Mobile collapse** to fewer columns with row expansion.
4. **Multiple-team tabs** (Erste / AH / youth) — only if those teams' tables come from the same data source.
5. **Historical seasons** archive — useful only if the club ever wants it.

## Open questions, beyond the data source

- If the data source ever returns inconsistent numbers (points don't match wins×3 + draws), what should the visitor see — the broken numbers, the last-known-good snapshot, or a "Tabelle wird geprüft" placeholder?
- Update cadence: hourly is fine for a Sunday evening read; do we ever need faster?

## Architecture

Once the source decision is made, the fetch pipeline (Lambda? cron? cache layer?), endpoint shape, schema, structured-data emission, and accessibility specifics belong in an ADR. Do not pre-design the implementation in this spec.

## What it does not do

- No historical standings.
- No position-over-time chart.
- No "what if" calculator.
- No push notifications when position changes.
