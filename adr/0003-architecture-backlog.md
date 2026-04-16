# ADR 0003 — Architecture backlog (planned-feature open questions)

- **Status:** Living document
- **Date:** 2026-04-15 (last rewrite)
- **Deciders:** Yannik Zeyer, per feature.

## Why this document exists

The `specs/` folder describes user behavior, deliberately not implementation. Several planned specs surface architectural questions that need answers — but answering them now, before each feature is prioritized, produces dead requirements.

This file is the place those questions live until a feature is committed to. When one is, the relevant question(s) graduate into a proper ADR that supersedes its entry here.

Each entry is a **reminder that something is unknown**, not a blueprint of what will be built. Entries here are deliberately terse; expand them only when the feature is about to be scheduled.

## Backlog

### B1 — Frontend data delivery, pooling, and backup mechanics (relates to ADR 0001, 0004)

The engine (Postgres on RDS) and API shape (REST/JSON) are fixed in ADR 0004 and 0006. What's still open:

- **First-paint strategy** per public section: inline-at-request vs. skeleton-first fetch. The Instagram section already does skeleton-first; news and Vorstand might land differently.
- **Connection pooling:** RDS Proxy vs. a per-process pool in the Express app.
- **Backup/restore drill:** must be documented and rehearsed before the admin UI goes public.

**Trigger to write the ADR:** when phase 1 of ADR 0001's migration starts.

### B2 — League-standings / fixtures data source (`league-standings.md`, `game-schedule.md`)

**Source decision: FuPa.** The club already embeds FuPa widgets on its legacy site, making FuPa the de facto authoritative upstream for both the league table and fixtures. Primary ingest targets the public widget endpoints; HTML scraping of FuPa's league page is the fallback if a widget can't deliver the required shape. SFV and fussball.de are not used.

Open architectural questions:

- Ingest cadence and orchestration (daily refresh per the specs; where does the scheduled job run?).
- Caching layer between FuPa and the public page (last-known-good snapshot storage for the standings staleness rule).
- HTML-scrape fallback selectors and how brittle they are to FuPa layout changes.

**Pre-ship operational follow-up** (not an architectural question): email support@fupa.net to confirm terms for widget embedding / programmatic fetching and ask whether a documented export exists.

**Trigger to write the ADR:** when standings/schedule is scheduled for build.

### B3 — Admin authentication mechanics (`admin-auth.md`)

Resolved at spec level: user records live in the main application Postgres (not a separate auth store); password policy is min-12 with no composition or rotation rules; audit log retention is 90 days with hard delete.

Open architectural questions:

- Password hashing algorithm choice (argon2id is the obvious default; document the parameters).
- Session storage (in-DB vs. signed-cookie sessions).
- Session and lockout numbers (idle timeout, absolute timeout, lockout window, lockout count).
- Audit-log table schema (event types, indexing for the 90-day retention sweep).
- Security-header set (CSP details, HSTS, Referrer-Policy, Permissions-Policy).

**Trigger:** when the admin-auth feature is scheduled.

### B4 — News editor data model (`admin-news-editor.md`)

Resolved at spec level: long-body is sanitized HTML (not portable rich-text JSON); the existing `src/assets/` images migrate via a one-time backfill at cutover (not dual-source branching).

Open architectural questions:

- Editor library choice (TipTap, ProseMirror, etc.) — the one that produces HTML within the specified allowlist with the least sanitization friction.
- Image pipeline details: variant generation (sizes, formats), CDN invalidation strategy, slug-stable URLs, backfill script sequencing.
- HTML sanitization allowlist implementation (DOMPurify config or equivalent).
- Versioning schema (full snapshots vs. diffs; retention).

**Trigger:** when the news editor is scheduled.

### B5 — Sponsor data model and tracking (`admin-sponsor-editor.md`, `mobile-sponsor-visibility.md`)

Resolved at spec level: card background colour is chosen from a fixed palette (not a free hex picker); there will be no sponsor-facing portal, so the data model does not reserve a `sponsor_user` relationship; `mobile-sponsor-visibility` ships without impression measurement (desktop rotator positions stay put; no baseline collection, no beacon).

Open architectural questions:

- Sponsor record schema (status enum, palette enum for the colour field, weight bounds).
- Impression and click counter pipeline (server-side; aggregate-only; rate limits; storage; rollups) — only if sponsor reporting becomes a real ask later.
- UTM-tagging convention for outbound sponsor links.
- CSV import/export format.
- SVG sanitization pipeline.

**Trigger:** when sponsor tracking moves from "could ship later" to scheduled.

### B6 — Vorstand record and consent model (`admin-vorstand-editor.md`)

Resolved at spec level: consent revocation is hard-erase (member deleted from the roster; name scrubbed from audit-log entries within the 90-day window; no separate historical-roster archive maintained).

Open architectural questions:

- Member record schema, including the consent flag history (need to prove "consent was given on date X").
- Image upload and crop handling.
- Drag-reorder persistence model (explicit ordinal column vs. linked list).
- vCard generation (server-rendered vs. client-built).
- Audit-log scrubbing mechanics for hard-erase (does the scrub write a new audit entry, or is it invisible?).

**Trigger:** when the Vorstand editor is scheduled.

### B7 — Training schedule data shape (`training-times.md`)

Open questions:

- Weekly slot encoding (weekday + HH:MM) vs. concrete date series.
- Seasonal handling: per-slot validity ranges vs. a global season toggle. Pick one — mixing both hurts.
- Cancellation overlay storage and expiry.
- ICS feed generation cadence and caching.

**Trigger:** when training-times is scheduled.

### B8 — Contact form delivery (`contact-form.md`)

Resolved at spec level: MTA is AWS SES; server-side retention is zero (validate → forward → forget); topic→recipient mapping is an admin-editable table in the admin area (the feature is blocked on the admin area landing first for that reason).

Open architectural questions:

- Mapping table schema and migration alongside the Vorstand editor.
- SES sender domain, verification, and out-of-sandbox approval sequencing.
- Spam-handling escalation if the honeypot + rate limit is insufficient.

SPF/DKIM/DMARC posture is part of the SES umbrella; not a separate question.

**Trigger:** when contact-form is scheduled.

## How to use this file

- A new planned feature with architectural unknowns adds an entry here, not a paragraph in the spec.
- When a feature is scheduled for build, the relevant entry is converted into a real ADR in this directory and the entry here is replaced with a pointer to it.
- When a question is answered by a broader ADR (for example B1's API-shape question, now owned by ADR 0006), remove it — don't leave a stale entry.
- Entries are not commitments. They are reminders of what is *unknown*, not blueprints of what will be built.
