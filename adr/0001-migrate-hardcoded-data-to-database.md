# ADR 0001 — Migrate hardcoded data to a database with admin UI and CRUD backend

- **Status:** Accepted
- **Date:** 2026-04-15
- **Deciders:** Yannik Zeyer (infrastructure owner), with Vorstand budget sign-off.
- **Supersedes:** none
- **Superseded by:** none
- **Related:** ADR 0002 (AWS), ADR 0004 (Postgres on RDS), ADR 0005 (compute topology), ADR 0006 (API shape).

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
- Inactive sponsors are preserved as commented-out blocks in the source, a de-facto archive that is error-prone and invisible to the Vorstand.
- The `specs/planned/` folder already describes a full admin surface (news, sponsors, Vorstand, auth, audit) that the current data layout cannot support.

## Decision

All hardcoded content data in this repository will be migrated to a database, edited through a browser-based admin UI, and served through a thin backend that performs CRUD operations against that database.

Specifically:

1. **Database** (per ADR 0004): a single managed relational datastore becomes the source of truth for news, sponsors, Vorstand members, training schedule, legal pages, and the admin/audit records that the admin area will add. Engine and instance choices live in ADR 0004.

2. **Backend (CRUD).** The existing Express app (`server.mjs`) grows a versioned API surface for news, sponsors, Vorstand, and legal text. API shape (REST/JSON) is fixed in ADR 0006. Public reads are cached at the CDN with short TTLs; writes are authenticated (per `specs/planned/admin-auth.md`) and audit-logged. Media (images) is stored in S3 and referenced by stable ids; uploads go through a signed-URL flow initiated by the backend.

3. **Admin UI.** A single-page admin area under `/admin` implements the editor flows already specified in `specs/planned/admin-{auth,news-editor,sponsor-editor,vorstand-editor}.md`. The UI consumes only the backend API — no direct DB access from the browser, no shared secrets in the client bundle.

4. **Frontend.** The public site replaces its build-time JSON imports and hardcoded arrays with runtime fetches against the public read endpoints. The first-paint strategy (inlined at request time vs. skeleton-first fetch) is tracked in `adr/0003-architecture-backlog.md` B1 — both patterns are already in the codebase and the choice per section can be made when each migration phase lands.

5. **Migration pathway.**
   - Phase 1: stand up the DB schema and backend endpoints with read-only routes that return the current hardcoded data as seeds. Verify the public site behaves identically when wired to the API.
   - Phase 2: ship the admin UI and auth. Dual-write for long enough that rollback is a code revert.
   - Phase 3: remove hardcoded arrays/JSON from the source tree; DB becomes the only source of truth.

## Alternatives considered

- **Keep the JSON/TS files, add a Git-based CMS (e.g. Decap/Netlify CMS).** Lower infrastructure cost, no new database. Rejected: every edit still triggers a full CI deploy (minutes), preview/staging flows are fragile, image handling via Git is clumsy, and the audit trail lives in Git history which is opaque to non-engineers. Doesn't unlock real-time edits for the planned admin specs.
- **SaaS headless CMS (Contentful, Sanity, Strapi Cloud, Hygraph).** Fast to start, nice editor UX. Rejected: recurring monthly cost for a small club's data volume, data leaves German hosting (DSGVO friction for Vorstand PII and member data), vendor lock-in on schema, still needs a thin backend proxy for auth and rate-limits. The club has an AWS footprint already and can host a small Postgres + Express stack cheaply.
- **Flat files edited via a web UI that commits to Git.** Hybrid of the first two. Rejected for the same latency and audit-trail reasons as option 1.

## Consequences

### Positive

- Vorstand members can publish, correct, and retire content in minutes, from any browser, without asking the webmaster.
- The planned admin specs (news editor, sponsor editor, Vorstand editor, training schedule, cancellation banners) become implementable as described, because they assume a mutable datastore.
- Soft delete, versioning, and audit logging become native database concerns rather than Git archaeology.
- Legal-text updates stop touching TSX/HTML and become a normal editor workflow.

### Negative / Costs

- Operational surface grows: database backups, migrations, connection pooling, secrets rotation, log retention, and DSGVO data-lifecycle rules now live in this project.
- Hosting cost increases by the price of a small managed database and slightly more compute/memory for the Express app. Concrete figures live in ADR 0004 and ADR 0005.
- Authentication, authorization, and audit become non-optional before the admin UI can ship. `specs/planned/admin-auth.md` is a blocker, not a nice-to-have.
- First-paint performance requires care: public reads must be either inlined in the Express response or cached at the CDN layer to avoid replacing a build-time import with a network round-trip on every page load.
- A backfill and cutover window is needed to migrate the existing `news.json`, `sponsors.ts`, and `VorstandSection.tsx` data without losing slugs, image references, or display order.
- All content changes now require an online path to the database; a prolonged DB outage makes content editable only via emergency DB access. Public reads remain available thanks to CDN caching but become stale.

### DSGVO / legal

- The database stores personal data (Vorstand names, phones, emails, consent timestamps; admin account credentials and audit trails). Records of processing activity (Verzeichnis von Verarbeitungstätigkeiten) must be updated accordingly.
- Database and backups must be hosted within the EU. Encryption at rest and in transit is required — mechanics in ADR 0004.
- Admin actions on personal data must be audit-logged with actor, action, and timestamp (per `admin-auth.md`).

## Follow-ups

- Write per-domain schema notes as the design crystallizes — either one schema ADR when the first migration lands, or a small ADR per domain if schemas diverge.
- Plan and schedule the three migration phases with the Vorstand so cutover does not collide with Kirmes, Dreikampf, or the season-opening fixture.
- Resolve `adr/0003-architecture-backlog.md` B1 (first-paint strategy, connection pooling, backup/restore drill) as phase 1 begins.
