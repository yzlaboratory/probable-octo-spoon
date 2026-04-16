# Specs

Prose-style user scenarios for the SV Alemannia Thalexweiler website.

Each file describes what a person using the site experiences. Implementation details (component structure, routing config, build tooling, data shapes, endpoint definitions) live in the code, in `CLAUDE.md`, and in `adr/` — not in these specs. If a paragraph here only makes sense by reading source, it has drifted and should be moved.

"Person using the site" covers both public visitors and admins (once the admin area lands). Both get scenarios written the same way.

## Current behavior

- `homepage.md` — Landing page flow: news reel, socials, board members, sponsors.
- `news-browsing.md` — How a visitor discovers and reads a news article.
- `instagram-feed.md` — The socials section, fetched live.
- `vorstand.md` — Viewing the board of directors and their contact details.
- `sponsor-display.md` — Sponsor placement and rotation rhythm across the site.
- `legal-pages.md` — Impressum and Datenschutzerklärung static pages.
- `navigation-and-chrome.md` — Header, footer, and site-wide navigation.

## Planned (not yet implemented)

See `planned/README.md` for the shared shape every planned spec follows. Files:

- `planned/league-standings.md` — Tabelle on the homepage. Data source settled (FuPa); pre-ship terms check outstanding.
- `planned/game-schedule.md` — Next-fixtures section. Shares the FuPa ingest with standings.
- `planned/training-times.md` — Weekly public training grid.
- `planned/contact-form.md` — `/kontakt` catch-all form, server-routed by topic.
- `planned/mobile-sponsor-visibility.md` — Move the in-gallery rotator earlier on phones.
- `planned/cart.md` — Placeholder for the header cart affordance's roadmap (merch and/or membership dues).
- `planned/admin-auth.md` — Admin login for a small set of trusted board members.
- `planned/admin-news-editor.md` — Browser-based news CRUD.
- `planned/admin-sponsor-editor.md` — Sponsor CRUD with weight and status.
- `planned/admin-vorstand-editor.md` — Vorstand CRUD with DSGVO consent and reordering.

## Where architecture lives

- `adr/0000-template.md` — template for new ADRs.
- `adr/0001-migrate-hardcoded-data-to-database.md` — the umbrella decision the admin specs depend on.
- `adr/0002-aws-as-infrastructure.md` — hosting baseline.
- `adr/0003-architecture-backlog.md` — open architectural questions per planned feature, kept here until each feature is scheduled and graduates into its own ADR.
- `adr/0004-database-postgres-on-rds.md` — DB engine and instance choice.
- `adr/0005-compute-ecs-fargate-behind-alb.md` — compute topology and ingress.
- `adr/0006-api-shape-rest-json.md` — internal API shape.

## Conventions

- One scenario per file. Each file readable cold, without the others.
- Vignettes use generic personas (a parent, a villager, a sponsor). Real names, phone numbers, and email addresses do not belong in scenarios — they rot fast and they are PII.
- Tables of board members, sponsor lists, news titles, and other live data are *not* duplicated in specs. The code is the source of truth for content; specs describe shape and behavior.
