# Specs

Prose-style user scenarios for the SV Alemannia Thalexweiler website.

Each file describes what a visitor experiences on the site. Implementation details (component structure, routing config, build tooling, data shapes, endpoint definitions) live in the code, in `CLAUDE.md`, and in `adr/` — not in these specs. If a paragraph here only makes sense by reading source, it has drifted and should be moved.

## Current behavior

- `homepage.md` — Landing page flow: news reel, socials, board members, sponsors.
- `news-browsing.md` — How a visitor discovers and reads a news article.
- `instagram-feed.md` — The socials section, fetched live.
- `vorstand.md` — Viewing the board of directors and their contact details.
- `sponsor-display.md` — Sponsor placement and rotation rhythm across the site.
- `legal-pages.md` — Impressum and Datenschutzerklärung static pages.
- `navigation-and-chrome.md` — Header, footer, and site-wide navigation.

## Planned (not yet implemented)

Each planned spec follows a fixed shape:

1. **The visitor scenario** — what a real person would do, end to end.
2. **MVP** — the smallest set of behaviors that satisfies the scenario.
3. **Could ship later** — stack-ranked follow-ups, *not* requirements.
4. **Open questions** — what is unknown and gates the work.
5. **Architecture** — a one-line pointer to where implementation choices live (the ADR backlog).
6. **What it does not do** — explicit scope cuts.

Files:

- `planned/league-standings.md` — Tabelle on the homepage. **Blocked on data-source decision.**
- `planned/game-schedule.md` — Next-fixtures section. Same data-source dependency.
- `planned/training-times.md` — Weekly public training grid.
- `planned/contact-form.md` — `/kontakt` catch-all form, server-routed by topic.
- `planned/mobile-sponsor-visibility.md` — Move the in-gallery rotator earlier on phones.
- `planned/admin-auth.md` — Admin login for a small set of trusted board members.
- `planned/admin-news-editor.md` — Browser-based news CRUD.
- `planned/admin-sponsor-editor.md` — Sponsor CRUD with weight and status.
- `planned/admin-vorstand-editor.md` — Vorstand CRUD with DSGVO consent and reordering.

## Where architecture lives

- `adr/0001-migrate-hardcoded-data-to-database.md` — the umbrella decision the admin specs depend on.
- `adr/0002-aws-as-infrastructure.md` — hosting baseline.
- `adr/0003-architecture-backlog.md` — open architectural questions per planned feature, kept here until each feature is scheduled and graduates into its own ADR.

## Conventions

- One scenario per file. Each file readable cold, without the others.
- Vignettes use generic personas (a parent, a villager, a sponsor). Real names, phone numbers, and email addresses do not belong in scenarios — they rot fast and they are PII.
- Tables of board members, sponsor lists, news titles, and other live data are *not* duplicated in specs. The code is the source of truth for content; specs describe shape and behavior.
