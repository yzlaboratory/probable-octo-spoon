# ADR 0009 — Admin authentication mechanics

- **Status:** Accepted
- **Date:** 2026-04-17
- **Deciders:** Yannik Zeyer.
- **Supersedes:** none
- **Superseded by:** none
- **Related:** `specs/planned/admin-auth.md`, ADR 0007 (SQLite as the datastore).

## Context

`specs/planned/admin-auth.md` fixes the admin-auth experience: a small set of trusted board members, bare login screen, session-based auth, no self-serve signup, no magic links, no third-party identity. The spec deferred the concrete mechanics (hashing algorithm, session storage, timeouts, security headers) to this ADR. ADR 0003 tracked them in backlog entry B3.

The decisions below are scoped to what an admin-MVP needs. Audit logging, originally listed in B3, is out of scope — the MVP does not record an audit trail. Revisit if a compliance or incident-response need appears.

## Decision

1. **Password hashing.** `argon2id` via the `argon2` Node library, with the current OWASP-recommended parameters: `m=19456 KiB`, `t=2`, `p=1`. Parameters live in a single server-side constants module so they can be re-tuned in one commit. Hashes are stored in the `admins` table as opaque strings.
2. **Session storage.** In-database sessions. A `sessions` table holds `(id, admin_id, created_at, last_seen, expires_at)`. The session ID is a 256-bit random token, set as an `HttpOnly`, `Secure`, `SameSite=Strict` cookie with `Path=/`. Logout deletes the row. An admin can revoke any session by deleting its row (useful for force-signing-out a departed board member).
3. **Timeouts and lockout.**
   - **Idle timeout:** 30 minutes. Updating `last_seen` on each authenticated request.
   - **Absolute timeout:** 24 hours from `created_at`. Re-auth required daily.
   - **Lockout threshold:** 5 failed login attempts against the same account.
   - **Lockout window:** 15 minutes auto-unlock. No admin-only manual unlock path in the MVP.
   - Failed-attempt counts live on the `admins` row (`failed_attempts`, `locked_until`). Successful auth resets both.
4. **Security headers.** `helmet` middleware with its stock defaults (HSTS, X-Frame-Options: DENY, X-Content-Type-Options, Referrer-Policy: strict-origin-when-cross-origin, etc.) plus an explicit Content-Security-Policy:
   - `default-src 'self'`
   - `script-src 'self'` — no inline scripts, no CDN scripts
   - `style-src 'self' 'unsafe-inline'` — Tailwind's runtime sets no inline styles in production, but Emotion (MUI) emits `<style>` tags; `unsafe-inline` is scoped to styles only
   - `img-src 'self' data: https:` — admin-uploaded images plus Instagram CDN
   - `connect-src 'self'` — XHR/fetch back to the same origin only
   - `frame-ancestors 'none'` — defense-in-depth against clickjacking
   - `base-uri 'self'`, `form-action 'self'`
5. **CSRF.** All state-changing endpoints require a matching CSRF token in both a cookie and a request header (double-submit pattern). Token is rotated per session.
6. **Rate limiting.** `POST /api/auth/login` rate-limited to 10 attempts / 15 minutes / IP in addition to the per-account lockout above. In-memory counter — acceptable because the app is a single node (ADR 0008).
7. **No audit log in the MVP.** Reconsider if a concrete incident-response or compliance need appears.

## Alternatives considered

- **bcrypt.** Still an acceptable KDF. Rejected in favour of argon2id because the latter is the OWASP first recommendation, is memory-hard, and the library is well-maintained. Migration from bcrypt if we had chosen it would also have been cheap — so this is a preference, not a cliff.
- **Node's built-in `scrypt`.** Would have removed one dependency. Rejected because argon2id is the modern default and the operational cost of one native dependency is not meaningful.
- **Signed-cookie (stateless) sessions.** Zero DB reads per authenticated request. Rejected because we want the ability to force-revoke a session *now* (a compromised admin, a departed board member) without rotating a global secret and logging everyone out. Against local SQLite the per-request read is effectively free.
- **Redis-backed sessions.** Rejected: an extra service for a benefit — distributed session storage — that a single-node topology (ADR 0008) does not need.
- **Audit log.** Considered and cut from the MVP. The three admin set makes "who changed this" socially obvious; a compromise of the single admin account is the real risk and is not meaningfully mitigated by a log the attacker can also delete. Re-add if the admin set grows or a concrete compliance requirement appears.

## Consequences

### Positive

- Industry-standard hashing. No bespoke crypto.
- Force-revoke works. Sign-out-all-devices is `DELETE FROM sessions WHERE admin_id = ?`.
- CSP is tight enough that a successful XSS injection through the news editor cannot exfiltrate to an external host.
- Timeouts are short enough that an unattended laptop at the clubhouse is not a long-lived credential leak.

### Negative / Costs

- Admin UX friction: a 24 h absolute ceiling means the Schatzmeister who logs in every Monday also re-auths every Monday. Acceptable, and by design.
- `unsafe-inline` in `style-src` is a concession to MUI/Emotion. Defensible — style injection is a much smaller attack surface than script injection — but worth reconsidering if we ever drop Emotion.
- No audit trail means incident forensics after a credential compromise is harder. Mitigated by the small admin set and short session lifetimes.

### DSGVO / legal

- Admin records (email, hashed password) are personal data and live on the same `eu-central-1` EBS volume as the rest of the application data (ADR 0007).
- Session rows contain no request content or IP history in the MVP; they are operational state, not a tracking log.

## Follow-ups

- Write the `admins` and `sessions` schema in the first backend migration. Include the unique-email constraint and the `failed_attempts`/`locked_until` columns.
- Implement the one-time CLI seeding command referenced in `admin-auth.md` (initial admin bootstrap).
- Document the recovery path when the single admin locks themselves out: the infrastructure owner re-runs the seeding CLI over SSM.
- Re-run OWASP's argon2id parameter guidance annually; bump `m` in lockstep with the recommendation.
- Reopen the audit-log question if the admin set grows beyond ~5, or if an incident forces the conversation.
