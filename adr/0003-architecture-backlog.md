# ADR 0003 — Architecture backlog (planned-feature open questions)

- **Status:** Living document
- **Date:** 2026-04-15
- **Deciders:** Yannik Zeyer (infrastructure), Vorstand (approval per feature)

## Why this document exists

The `specs/` folder describes user behavior, deliberately not implementation. Several planned specs surface architectural questions that need answers — but answering them now, before each feature is prioritized, produces dead requirements (the critique that triggered this rewrite).

This file is the place those questions live until a feature is committed to. When one is, the relevant question(s) graduate into a proper ADR (0004, 0005, …) that supersedes its entry here.

## Backlog

### B1 — Public site backend reads (relates to ADR 0001)

ADR 0001 commits to migrating hardcoded data into a database with a backend CRUD surface. Open questions:

- Database engine (Postgres vs. DynamoDB vs. SQLite-on-EFS).
- API style (REST/JSON vs. tRPC vs. GraphQL — defaulting to REST).
- First-paint strategy: inlined-at-request vs. fetch-with-skeleton.
- Connection pooling, secrets rotation, backup/restore process.

**Trigger to write the ADR:** when phase 1 of ADR 0001's migration starts.

### B2 — League-standings / fixtures data source (`league-standings.md`, `game-schedule.md`)

The hardest unknown in the planned folder. Three options sketched in `league-standings.md`:

1. Scrape SFV — terms-of-service review needed *before any code*.
2. Manual entry by an admin — requires a sustained human commitment.
3. Wait for an official feed.

Until this is settled, neither feature can move forward.

**Trigger to write the ADR:** when the Vorstand picks one of the three options.

### B3 — Admin authentication mechanics (`admin-auth.md`)

Open questions deferred from the spec:

- Where do user records live (same DB as content, or a dedicated auth store)?
- Password hashing algorithm choice (argon2id is the obvious default; document the parameters).
- Session storage (in-DB vs. signed-cookie sessions).
- Session and lockout numbers (idle timeout, absolute timeout, lockout window, lockout count).
- Audit-log schema and retention policy under DSGVO.
- Security-header set (CSP details, HSTS, Referrer-Policy, Permissions-Policy).

**Trigger:** when the admin-auth feature is scheduled.

### B4 — News editor data model (`admin-news-editor.md`)

Open questions:

- Long-body storage format: portable rich-text JSON vs. sanitized HTML.
- Editor library choice (TipTap, ProseMirror, etc.).
- Image pipeline: variant generation (sizes, formats), CDN invalidation strategy, slug-stable URLs.
- Versioning schema (full snapshots vs. diffs; retention).
- Migration plan from the existing `import.meta.glob` local-asset references to stable image ids without breaking historical slugs.

**Trigger:** when the news editor is scheduled.

### B5 — Sponsor data model and tracking (`admin-sponsor-editor.md`, `mobile-sponsor-visibility.md`)

Open questions:

- Sponsor record schema (status enum, color/background fields, weight bounds).
- Impression and click counter pipeline (server-side; aggregate-only; rate limits; storage; rollups).
- UTM-tagging convention for outbound sponsor links.
- CSV import/export format.
- SVG sanitization pipeline.

**Trigger:** when sponsor tracking moves from "could ship later" to scheduled.

### B6 — Vorstand record and consent model (`admin-vorstand-editor.md`)

Open questions:

- Member record schema, including the consent flag history (need to prove "consent was given on date X").
- Image upload and crop handling.
- Drag-reorder persistence model (explicit ordinal column vs. linked list).
- vCard generation (server-rendered vs. client-built).
- Anonymization process for departed members under DSGVO.

**Trigger:** when the Vorstand editor is scheduled.

### B7 — Training schedule data shape (`training-times.md`)

Open questions:

- Weekly slot encoding (weekday + HH:MM) vs. concrete date series.
- Seasonal handling: per-slot validity ranges vs. a global season toggle. Pick one — mixing both hurts.
- Cancellation overlay storage and expiry.
- ICS feed generation cadence and caching.

**Trigger:** when training-times is scheduled.

### B8 — Contact form delivery (`contact-form.md`)

Open questions:

- Topic-to-recipient mapping storage (code vs. admin-editable config table).
- MTA choice (SES vs. continue using the Impressum-alias provider).
- SPF/DKIM/DMARC posture for the sending domain.
- Server-side log retention.

**Trigger:** when contact-form is scheduled.

## How to use this file

- A new planned feature with architectural unknowns adds an entry here, not a paragraph in the spec.
- When a feature is scheduled for build, the relevant entry is converted into a real ADR in this directory and the entry here is replaced with a pointer to it.
- Entries are not commitments. They are reminders of what is *unknown*, not blueprints of what will be built.
