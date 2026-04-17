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
- `planned/league-standings.md` — Tabelle on the homepage (shipped; file still in planned-format).
- `planned/game-schedule.md` — Next-fixtures section and `/spiele` route (shipped; file still in planned-format).
- `planned/training-times.md` — Weekly training grid and `/training` route (shipped; file still in planned-format).
- `planned/mobile-sponsor-visibility.md` — Phone-width rotator move (shipped remediation).

## Planned (not yet implemented)

See `planned/README.md` for the shared shape every planned spec follows. Files:

- `planned/contact-form.md` — `/kontakt` catch-all form, server-routed by topic.
- `planned/cart.md` — Placeholder for the header cart affordance's roadmap (merch and/or membership dues).
- `planned/admin-auth.md` — Admin login for a small set of trusted board members.
- `planned/admin-news-editor.md` — Browser-based news CRUD.
- `planned/admin-sponsor-editor.md` — Sponsor CRUD with weight and status.
- `planned/admin-vorstand-editor.md` — Vorstand CRUD with reordering.

## Where architecture lives

- `adr/0000-template.md` — template for new ADRs.
- `adr/0001-migrate-hardcoded-data-to-database.md` — the umbrella decision the admin specs depend on.
- `adr/0002-aws-as-infrastructure.md` — hosting baseline.
- `adr/0003-architecture-backlog.md` — open architectural questions per planned feature, kept here until each feature is scheduled and graduates into its own ADR.
- `adr/0004-database-postgres-on-rds.md` — **superseded by 0007**.
- `adr/0005-compute-ecs-fargate-behind-alb.md` — **superseded by 0008**.
- `adr/0006-api-shape-rest-json.md` — internal API shape.
- `adr/0007-database-sqlite-on-ebs.md` — datastore (SQLite file on the app host's EBS volume, weekly `.backup` to S3).
- `adr/0008-compute-single-ec2-with-traefik.md` — compute topology (single EC2, Traefik, Let's Encrypt).
- `adr/0009-admin-authentication-mechanics.md` — hashing, sessions, timeouts, security headers.
- `adr/0010-news-editor-data-model.md` — TipTap, HTML sanitization, image pipeline.
- `adr/0011-sponsor-data-model.md` — sponsor schema, palette, SVG sanitization.
- `adr/0012-vorstand-data-model.md` — Vorstand schema, reorder model, portrait pipeline.

## Conventions

- One scenario per file. Each file readable cold, without the others.
- Vignettes use generic personas (a parent, a villager, a sponsor). Real names, phone numbers, and email addresses do not belong in scenarios — they rot fast and they are PII.
- Tables of board members, sponsor lists, news titles, and other live data are *not* duplicated in specs. The code is the source of truth for content; specs describe shape and behavior.
