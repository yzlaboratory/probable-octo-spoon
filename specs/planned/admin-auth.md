# Admin authentication (planned)

> **Status:** not implemented. Today there is no admin area; every content update is a code edit and a redeploy. The disabled `LOGIN` affordance in the header anticipates this future.

## What the admins are

A small set of trusted board members — initially two or three people: the Geschäftsführer, the Schatzmeister who maintains the site, and one backup. They are not "users" in the SaaS sense; the system never grows to hundreds. There is no self-serve signup, and no "forgot password" flow built around the assumption that a stranger might be locked out.

## The visitor scenario

The Geschäftsführer arrives at the club office, opens the site on the office laptop, clicks the header `LOGIN` (now functional), enters email and password, and lands on an admin dashboard. From there they reach the news, sponsor, and Vorstand editors specified separately.

The login screen is deliberately bare: club crest, the heading **Admin-Bereich**, an email field, a password field, an `Anmelden` button. Nothing else — no "forgot password," no signup, no social login.

## MVP

- Authenticated routes under `/admin`, with unauthenticated visitors redirected to `/admin/login`.
- Password authentication with hashes stored server-side (modern KDF — choose in an ADR).
- Session cookie: HTTP-only, secure, SameSite, with a sensible expiry (a week or two, idle-extending).
- Aggressive rate limiting on the login endpoint and per-account lockout after repeated failures.
- A working `Abmelden` action that ends the session.
- Initial admin seeded by a one-time CLI command run during deployment.
- Subsequent admins added by an existing admin via the dashboard. No self-serve signup.
- Lost-password handling is operational, not technical: another admin issues a one-time reset link from the dashboard. If only one admin exists and locks themselves out, the infrastructure owner reseeds via a documented CLI script.
- A simple audit log of admin actions (login, logout, content changes) viewable to admins.

That set ships the admin area without any third-party identity provider. Deliberately small surface area.

## Could ship later

In rough order, only when the admin set grows or a real need appears:

1. **TOTP as an opt-in second factor.** Useful before passkeys for admins on devices that don't support platform authenticators.
2. **WebAuthn / passkeys** as an additional login method, eventually replacing passwords.
3. **A session list with per-session revocation.**
4. **An optional CIDR allowlist** for the admin area.
5. **HIBP "pwned password" check** at password set/change, if a real concern emerges.
6. **New-device login email notifications.**
7. **Role granularity** — only when there are enough admins that "everyone can do everything" stops being safe.

None of these belong in the MVP. Each one expands the operational and support surface for a population that may never need them.

## Open questions

- Where do user records live? Same database as the rest of the admin content (per ADR 0001), or a separate auth-only store?
- What is the password policy? Length minimum is non-controversial; complexity rules are mostly counterproductive — settle in the ADR.
- What is the audit log's retention policy, given the DSGVO obligation to anonymize records of past actors?

## Architecture and security mechanics

Tracked in `adr/0003-architecture-backlog.md` B3.

## What admin auth does not do

- No public signup.
- No "remember me for 90 days" checkbox.
- No magic-link email login (would require inbox infrastructure for a feature used by three people).
- No SSO, no OAuth — admin set is too small to justify the integration cost.
