# ADR 0001 — Migrate hardcoded data to a database with admin UI and CRUD backend

- **Status:** Proposed
- **Date:** 2026-04-15
- **Deciders:** Yannik Zeyer (infrastructure), Vorstand (approval)
- **Supersedes:** none
- **Superseded by:** none

## Context

The site currently carries all its content in the source tree:

| What | Where it lives today |
|---|---|
| News articles | `src/data/news.json` (static JSON imported at build time) |
| Sponsors + `money` weights | `src/utilities/sponsors.ts` (hardcoded TS object; image imports) |
| Vorstand (board members) | `src/components/VorstandSection.tsx` (hardcoded TS array) |
| Impressum | `src/pages/ImpressumPage.tsx` (hardcoded JSX) |
| Datenschutzerklärung | `src/pages/DatenschutzPage.tsx` (hardcoded HTML string) |
| Images referenced by the above | `src/assets/**` resolved via `import.meta.glob` at build |

Consequences observed:

- Every content change (new news post, sponsor pause, board-member phone update, legal-text revision) requires a commit, a merge, and a redeploy. Only people with GitHub access and Node/Vite familiarity can touch content.
- Time-to-publish for a routine news post is measured in "whenever the webmaster has time" — typically hours to days — against an ideal of minutes.
- The Vorstand has no self-service way to correct their own data, announce event updates, or rotate sponsors. That is a real operational bottleneck for a club whose news cadence is tied to weekend matches and seasonal festivities.
- Commented-out sponsor blocks in `sponsors.ts` are used as a de-facto archive, which is both error-prone and invisible to the Vorstand.
- The `specs/planned/` folder already describes a full admin surface (news, sponsors, Vorstand, auth, audit) that the current data layout cannot support.

## Decision

All hardcoded content data in this repository will be migrated to a database, edited through a browser-based admin UI, and served through a thin backend that performs CRUD operations against that database.

Specifically:

1. **Database.** A single managed relational database (Postgres on AWS RDS or a lightweight equivalent like DynamoDB/SQLite-on-EFS if cost pressure demands it) becomes the source of truth for:
   - News (articles, versions, attachments).
   - Sponsors (name, logo, link, weight, status, dates, notes).
   - Vorstand members (name, role, contact, photo, consent flags, display order).
   - Training schedule (planned per `specs/planned/training-times.md`).
   - Legal pages: Impressum and Datenschutzerklärung rendered from a versioned long-text record rather than hardcoded JSX.
   - Optional once implemented: league standings snapshots, fixtures, audit log entries, admin accounts.

2. **Backend (CRUD).** The existing Express app (`server.mjs`) grows a versioned REST/JSON API — `/api/news`, `/api/sponsors`, `/api/vorstand`, `/api/legal`, etc. — with the usual verbs (`GET`, `POST`, `PATCH`, `DELETE`). Public reads are cached at CloudFront with short TTLs; writes are authenticated (per `specs/planned/admin-auth.md`) and audit-logged. Media (images) is stored in S3 and referenced by stable ids; uploads go through a signed-URL flow initiated by the backend.

3. **Admin UI.** A single-page admin area under `/admin` implements the editor flows already specified in `specs/planned/admin-{auth,news-editor,sponsor-editor,vorstand-editor}.md`. The UI consumes only the backend API — no direct DB access from the browser, no shared secrets in the client bundle.

4. **Frontend.** The public site replaces its build-time JSON imports and hardcoded arrays with runtime fetches against the public read endpoints. Where latency matters (homepage first paint), initial data is either inlined at request time by the Express server or fetched with a skeleton-first pattern (matching how the Instagram feed already works).

5. **Migration pathway.**
   - Phase 1: stand up the DB schema and backend endpoints with read-only routes that return the current hardcoded data as seeds. Verify the public site behaves identically when wired to the API.
   - Phase 2: ship the admin UI and auth. Dual-write a while so rollback is a code revert.
   - Phase 3: remove hardcoded arrays/JSON from the source tree; DB becomes the only source of truth.

## Alternatives considered

- **Keep the JSON/TS files, add a Git-based CMS (e.g. Decap/Netlify CMS).** Lower infrastructure cost and no new database. Rejected: every edit still triggers a full CI deploy (minutes), preview/staging flows are fragile, image handling via Git is clumsy, and the audit trail lives in Git history which is opaque to non-engineers. Doesn't unlock real-time edits (cancellation banners, impression tracking, sponsor pauses) for the planned admin specs.
- **SaaS headless CMS (Contentful, Sanity, Strapi Cloud, Hygraph).** Fast to start, nice editor UX. Rejected: recurring monthly cost for a small club's data volume, data leaves German hosting (DSGVO friction for Vorstand PII and member data), vendor lock-in on schema, still needs a thin backend proxy for auth and rate-limits. The club has an AWS footprint already and can host a small Postgres + Express stack cheaply.
- **Flat files edited via a web UI that commits to Git.** Hybrid of the first two. Rejected for the same latency and audit-trail reasons as option 1.

## Consequences

### Positive

- Vorstand members can publish, correct, and retire content in minutes, from any browser, without asking the webmaster.
- The planned admin specs (news editor, sponsor editor, Vorstand editor, training schedule, cancellation banners, impression tracking) become implementable as described, because they assume a mutable datastore.
- Soft delete, versioning, and audit logging become native database concerns rather than Git archaeology.
- Sponsor impressions and outbound-click counts can be persisted and surfaced to the Schatzmeister for renewal conversations.
- Legal-text updates stop touching TSX/HTML and become a normal editor workflow.

### Negative / Costs

- Operational surface grows: database backups, migrations, connection pooling, secrets rotation, log retention, and DSGVO data-lifecycle rules now live in this project.
- Hosting cost increases by the price of a small managed database and slightly more compute/memory for the Express app. Expected to remain within a low two-digit EUR/month range for a club-scale workload.
- Authentication, authorization, and audit become non-optional before the admin UI can ship. `specs/planned/admin-auth.md` is a blocker, not a nice-to-have.
- First-paint performance requires care: public reads must be either inlined in the SSR-equivalent response or cached at the CDN layer to avoid replacing a build-time import with a network round-trip on every page load.
- A backfill and cutover window is needed to migrate the existing `news.json`, `sponsors.ts`, and `VorstandSection.tsx` data without losing slugs, image references, or display order.
- All content changes now require an online path to the database; a prolonged DB outage makes content editable only via emergency DB access. Public reads remain available thanks to CDN caching but become stale.

### DSGVO / legal

- The database stores personal data (Vorstand names, phones, emails, consent timestamps; admin account credentials and audit trails). Records of processing activity (Verzeichnis von Verarbeitungstätigkeiten) must be updated accordingly.
- Database and backups must be hosted within the EU. Encryption at rest and in transit is required.
- Admin actions on personal data must be audit-logged with actor, action, and timestamp (per `admin-auth.md`).

## Follow-ups

- Write schema ADRs per domain as the design crystallizes (or a single schema ADR when the first migration lands).
- Decide the database engine concretely (Postgres vs. DynamoDB vs. SQLite) — separate ADR.
- Decide the API shape (REST vs. tRPC vs. a GraphQL layer) — separate ADR, but default to plain REST/JSON for simplicity.
- Plan and schedule the three migration phases with the Vorstand so cutover does not collide with Kirmes, Dreikampf, or the season-opening fixture.
