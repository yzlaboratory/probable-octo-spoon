# ADR 0003 — Architecture backlog (planned-feature open questions)

- **Status:** Living document
- **Date:** 2026-04-17 (last rewrite)
- **Deciders:** Yannik Zeyer, per feature.

## Why this document exists

The `specs/` folder describes user behavior, deliberately not implementation. Several planned specs surface architectural questions that need answers — but answering them now, before each feature is prioritized, produces dead requirements.

This file is the place those questions live until a feature is committed to. When one is, the relevant question(s) graduate into a proper ADR that supersedes its entry here.

Each entry is a **reminder that something is unknown**, not a blueprint of what will be built. Entries here are deliberately terse; expand them only when the feature is about to be scheduled.

## Graduated or resolved

- **B1 — Frontend data delivery, pooling, backup mechanics.** Resolved. Connection pooling is moot under ADR 0007 (SQLite is in-process). Backup is specified in ADR 0007 (weekly `.backup` to S3) and ADR 0008 (daily EBS snapshots as a secondary). First-paint strategy is skeleton-first across all public sections by default, matching the existing Instagram section — the site has no SSR, so there is no inline-at-request variant to choose.
- **B2 — League-standings / fixtures data source.** Shipped. FuPa confirmed as the ingest source; implementation lives under `src/components/LeagueStandingsSection.tsx` and `src/components/NextFixturesSection.tsx`.
- **B3 — Admin authentication mechanics.** Graduated to ADR 0009.
- **B4 — News editor data model.** Graduated to ADR 0010.
- **B5 — Sponsor data model and tracking.** Graduated to ADR 0011.
- **B6 — Vorstand record and consent model.** Graduated to ADR 0012.
- **B7 — Training schedule data shape.** Shipped. Implementation lives under `src/components/TrainingSection.tsx` and `src/pages/TrainingPage.tsx`.

## Backlog

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
