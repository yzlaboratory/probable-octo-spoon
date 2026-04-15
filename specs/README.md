# Specs

Prose-style user scenarios for the SV Alemannia Thalexweiler website, extracted from the current codebase (Vite + React 19 SPA with Express server and Instagram API proxy).

Each file describes what a visitor experiences on the site, grounded in actual component behavior — not aspirational requirements.

## Current behavior

- `homepage.md` — Landing page flow: news reel, socials, board members, sponsors.
- `news-browsing.md` — How a visitor discovers and reads a news article.
- `instagram-feed.md` — The socials section powered by the Instagram Graph API.
- `vorstand.md` — Viewing the board of directors and their contact details.
- `sponsor-display.md` — The weighted sponsor rotation and placement rules.
- `legal-pages.md` — Impressum and Datenschutzerklärung static pages.
- `navigation-and-chrome.md` — Header, footer, and site-wide navigation.

## Planned (not yet implemented)

See [`planned/`](./planned/) for scenarios describing features that are wanted but do not exist in the code yet. Each file is self-contained and written in the same prose style — a future implementer should be able to pick up any one spec without reading the others.

- `planned/league-standings.md` — Tabelle section showing the club's position.
- `planned/game-schedule.md` — Spieltagskalender with next matches and results.
- `planned/training-times.md` — Weekly public training grid.
- `planned/contact-form.md` — `/kontakt` form routed to the right committee by subject.
- `planned/mobile-sponsor-visibility.md` — Remediation for under-served sponsor impressions on mobile.
- `planned/admin-auth.md` — Admin login, sessions, audit log.
- `planned/admin-news-editor.md` — Browser-based news CRUD with rich text and images.
- `planned/admin-sponsor-editor.md` — Sponsor CRUD with `money`-weight editing and impression counts.
- `planned/admin-vorstand-editor.md` — Vorstand CRUD with reorderable cards and DSGVO consent.

## Source of truth

These scenarios describe observable user-facing behavior. Implementation details (routing config, component structure, build tooling) live in the code and `CLAUDE.md`.
