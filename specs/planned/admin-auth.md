# Admin authentication (planned)

> **Status:** not implemented. Today there is no admin area at all — every content update is a code edit + redeploy. A disabled `LOGIN` button is rendered in the header (`hover:cursor-not-allowed`) anticipating this future.

## What the admins are

A small set of trusted board members (initially 2–3 people: the Geschäftsführer, the Schatzmeister who maintains the site, and one backup) who need to edit news, sponsors, Vorstand, and training without touching code.

They are not "users" in the SaaS sense — the system never grows to hundreds. No self-serve signup. No password reset flow that assumes a stranger might be locked out.

## Where it lives

A new route `/admin` that:

1. If the visitor is not authenticated, redirects to `/admin/login`.
2. If authenticated, renders the admin dashboard.

The existing header `LOGIN` button becomes functional on the admin-reachable build and routes to `/admin/login` instead of dangling.

## The login screen

Minimalist, full-height, centered card on the `#121212` background:

- Club crest at the top.
- Single heading: **Admin-Bereich**.
- `E-Mail` input.
- `Passwort` input.
- `Anmelden` primary-color button.
- Nothing else — no "forgot password," no "sign up," no social login. The tab title is `Admin – SV Alemannia Thalexweiler`.

### Example: the Monday-morning login

The Geschäftsführer arrives at the club office, opens the site on the office laptop, clicks the header `LOGIN` (or types `/admin` directly), enters his email and password, and lands on the dashboard.

## The mechanism

Password-based authentication, argon2id hashes stored in a small table (SQLite or DynamoDB — matches the existing AWS footprint). No OAuth, no SSO — the admin set is too small to warrant the complexity.

On success, the server issues an HTTP-only, secure, SameSite=Lax session cookie with a 7-day idle expiry and a 30-day absolute expiry. No refresh tokens. No JWT. Server-side session records so revocation is instant.

TLS is already enforced by Traefik. The login endpoint has aggressive rate limiting: 5 attempts per IP per 15 minutes, with a 60-second lockout per account after 5 consecutive failures.

## Forgot password

Not a self-serve flow. Instead: a board member who forgets their password asks another admin, who issues a one-time reset link from the admin dashboard (`/admin/users`). The link is valid for 1 hour and single-use.

If the board ever has only one admin and they lose access, the infrastructure owner (Yannik Zeyer per Impressum) reseeds the password via a CLI script that runs against the database directly.

## Two-factor (optional from day one)

Each admin can enable TOTP (authenticator app) from their own settings page. Enabling is opt-in initially; after one year, TOTP becomes mandatory for all admins. Recovery codes are generated once at enrollment and shown exactly once — the admin must save them offline.

## Session states

- **Logged in** — every admin route renders normally. A "Signed in as [name]" line sits in the dashboard header with a `Abmelden` link.
- **Idle timeout** — after 7 days of no requests, the cookie expires; next request to an admin route 302s to the login page.
- **Absolute timeout** — after 30 days, forced re-login regardless of activity.
- **Manual logout** — `Abmelden` clears the server session and the cookie, redirects to `/`.

## Audit log

Every admin action (login, logout, failed login, content create/update/delete, user invite) writes to an append-only audit log with timestamp, admin id, action, and resource affected. The log is visible to admins under `/admin/audit` as a reverse-chronological list.

### Example: figuring out what went wrong

A news post that used to be on the homepage is suddenly gone. An admin opens `/admin/audit`, filters by resource type `news`, and sees that another admin deleted the post three days ago and by whom. They restore from the trash (soft-delete keeps deleted items for 30 days — see the individual admin editor specs).

## The first admin account

Seeded via a one-time `npm run admin:seed` script, which prompts for email and password on stdin, hashes the password, and inserts the row. Documented in the deployment README. After the first admin is seeded, additional admins are invited from the dashboard.

## Cross-cutting polish

- **Passkeys / WebAuthn** — admins can register a platform authenticator (Touch ID, Windows Hello, Android credential manager) as a login method alongside password. Long-term goal is passkey-only auth with password as a fallback.
- **Password policy** — minimum 12 characters; on set/change, the password is checked against HIBP's `Pwned Passwords` range API (k-anonymity, no plaintext leaves the server) and rejected if compromised. The policy is *check for strength*, not arbitrary complexity rules.
- **Session management UI** — `/admin/sessions` lists the admin's active sessions (device, IP, city, last seen) with a per-session revoke and a "Alle anderen abmelden" button.
- **IP allowlist (optional)** — `/admin/security` toggles a CIDR allowlist for the entire admin area, useful if the board decides to restrict access to club-office or home networks.
- **Anomaly signals** — a login from a new country or a never-before-seen user-agent fingerprint triggers an email ("Neue Anmeldung aus … – warst du das?") with a one-click "Session widerrufen" link.
- **TOTP recovery** — enrollment generates 8 single-use backup codes, shown exactly once, downloadable as a `.txt`. Each code is argon2-hashed server-side.
- **GDPR data export & erasure** — `/admin/account/export` returns a JSON dump (profile + audit history) for self-service SAR compliance. Account deletion cascades to the audit log: the admin's id is anonymized but the timestamps and actions remain for legal record-keeping.
- **Security headers** — strict `Content-Security-Policy` (no inline scripts outside hash-nonced blocks), `Strict-Transport-Security`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Content-Type-Options: nosniff`, `Permissions-Policy` restricting camera/mic/geolocation.
- **Observability** — failed logins, new device logins, and admin action spikes emit structured logs that can be alerted on (CloudWatch alarm → email to infrastructure owner).

## What admin auth does not do

- No public signup.
- No "remember me for 90 days" checkbox.
- No magic-link email login (would require inbox infra for a feature used by 3 people).
- No role granularity initially — every admin can do everything. Roles can be added later if the admin set grows.
