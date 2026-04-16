# League standings (planned)

> **Status:** not implemented.
> **Data source:** FuPa (see below). Shipping still depends on a short terms-of-use check with FuPa support.

## Where the data comes from

The club already embeds FuPa widgets on its current (legacy) site for the first team's table and fixtures, so FuPa is in practice the authoritative upstream. This spec assumes the same source:

- Primary ingest: FuPa's public widget endpoints for the club's current league table.
- Fallback: scraping FuPa's public league page if a widget can't deliver the shape the renderer needs.
- SFV and fussball.de are not used — neither offers a reuse-friendly surface, and the club's own audience already encounters FuPa as the league-table brand.

Before any code lands, someone emails support@fupa.net to confirm the terms for widget embedding and programmatic fetching, and to ask whether a documented export exists. That's an operational follow-up, not an open design question.

## What a visitor experiences

On a Sunday evening after a matchday, a fan opens the homepage, scrolls past news and the next-fixtures section, and lands on a section called **TABELLE**. A simple table shows the league: position, team name, games played, wins/draws/losses, goals for/against, goal difference, points. The club's own row is visually highlighted so the fan finds "us" immediately. Top and bottom of the table carry subtle visual cues for the promotion and relegation zones.

That is the entire scenario. No calculator, no chart, no notifications.

## MVP

- A homepage section (placement: see `../homepage.md` for the canonical order) showing the current league table.
- The club's row visually marked.
- A timestamp ("zuletzt aktualisiert: …") so the visitor knows whether the table is fresh. The timestamp reflects *the snapshot being shown*, which is important under the staleness rule below.
- Graceful skeleton/fallback when FuPa is unreachable, matching the same pattern the Instagram feed already uses.
- Daily ingest. A single refresh per day is enough for a Sunday-evening read; matchdays don't need faster cadence given the audience size.
- Staleness rule: if the latest fetch returns data that fails a basic reconciliation check (e.g. points don't match wins×3 + draws, a row is obviously half-parsed), the site shows the **last-known-good snapshot** with its original "zuletzt aktualisiert" timestamp — not the broken numbers, and not a placeholder. Honesty about freshness, not about the outage.

That's it. No deep-link route, no historical view, no per-team page.

## Could ship later

Rough order:

1. **A `/tabelle` deep-link route** for sharing.
2. **Promotion/relegation visual cues** with proper accessible labels.
3. **Mobile collapse** to fewer columns with row expansion.
4. **Multiple-team tabs** (Erste / AH / youth) — only if those teams' tables come from the same data source.
5. **Historical seasons** archive — useful only if the club ever wants it.

## Open questions

None gating the MVP. The FuPa terms-of-use check remains as an operational pre-ship step, tracked alongside the feature ticket rather than here.

## Architecture

Tracked in `adr/0003-architecture-backlog.md` B2 (shared with `game-schedule.md`).

## What it does not do

- No historical standings.
- No position-over-time chart.
- No "what if" calculator.
- No push notifications when position changes.
