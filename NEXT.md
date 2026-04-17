# NEXT — Admin MVP handoff

Resume cold from this file. Everything you need to know is in the numbered list; the appendices are reference.

## Where things stand (2026-04-17)

- **`main` @ `2244609`** — four revert commits on top of `2fdca1f`. Tree is byte-identical to `2fdca1f` (last-good pre-admin-MVP state). Live site `svthalexweiler.de` recovered; bundle `index-DHCRKWK5.js`.
- **`origin/worktree-admin-mvp` @ `f5dae6f`** — full admin MVP work, untouched. 46 unit tests passing. Contains: SQLite backend, auth (argon2/sessions/CSRF/lockout), media pipeline, news/sponsors/vorstand CRUD, admin SPA with TipTap/palette/@dnd-kit, `scripts/backfill.mjs`, and the public site wired to `/api/*/public`.
- **Why it was reverted:** the merge auto-deployed via `.github/workflows/deploy.yml` to the live S3 + CloudFront + Lambda stack. That stack has no Express server behind `/api/*`, so `/api/news/public` etc. returned the SPA shell and the homepage News/Sponsors/Vorstand sections rendered empty. Root cause: ADR 0008 (single EC2 + Traefik) is **accepted on paper but never provisioned** — zero EC2 instances in any region, SSM has zero managed instances.
- **User override on record:** initial admin password must be set to `sophisticatedmemento@proton.me` (email as password). I flagged this as weak; user accepted. Document it in the runbook and rotate ASAP.

## Next steps, in order

### 1. Provision ADR 0008 infra (Terraform)

Rewrite `infrastructure/main.tf`. Keep: the Instagram token refresh Lambda + Secrets Manager, the FuPa Lambda (unless you also port it into the Express app). Remove or deprioritize: the S3 website bucket + CloudFront default behavior (or keep S3 as static fallback).

Add:

- `aws_instance` — `t4g.small` in `eu-central-1`, Amazon Linux 2023 or Ubuntu 24.04 LTS ARM.
- `aws_ebs_volume` + `aws_volume_attachment` — 20 GB gp3, encrypted (EBS default encryption). Mount at `/var/lib/clubsoft`.
- `aws_security_group` — 80/443 inbound, 22 closed (SSM only), egress all.
- `aws_eip` + association.
- `aws_iam_role` for the EC2 instance with the SSM-managed-instance policy attached so `aws ssm send-command` works.
- `aws_route53_record` for `svthalexweiler.de` and `www.svthalexweiler.de` → the EIP.
- User data / cloud-init: install Docker + docker-compose, pull the repo to `/opt/clubsoft`, `npm ci`, ensure `/var/lib/clubsoft` is mounted and writable.

Optional: drop CloudFront. ADR 0008 says Traefik + Let's Encrypt directly. If you keep CloudFront, you must change the default behavior origin from `S3Website` to a custom origin pointing at the EC2 EIP and lift caching on `/api/*` — confusingly overlapping with Traefik. Recommend: delete the CloudFront distribution.

### 2. Update the deploy workflow

`.github/workflows/deploy.yml` currently does `aws s3 sync dist/ ...`. Replace with: build, `aws ssm send-command` to the EC2 instance doing `cd /opt/clubsoft && git fetch && git checkout <sha> && npm ci && npm run build && pm2 restart clubsoft` (or a systemd `Restart` of the node service, or `docker compose up -d --build` if you go Docker). Gate on `needs: test`.

Keep `npm test` as the test gate — the 46 tests in `worktree-admin-mvp` cover the backend auth/sanitize/CRUD paths.

### 3. Merge `worktree-admin-mvp` into main (again, but this time safely)

Only after steps 1 and 2 are deployed and smoke-tested. Fast-forward merge + push will auto-deploy via the new pipeline. Expect CI to run `npm test` and then SSM-restart the node service.

On first boot of the new code, `server/db.mjs` `openDb()` runs the migrations in `server/schema/` inside a transaction. Verify `/var/lib/clubsoft/app.db` exists after restart.

### 4. Run the backfill over SSM

```bash
aws ssm send-command \
  --instance-ids i-XXXX \
  --document-name AWS-RunShellScript \
  --parameters 'commands=["cd /opt/clubsoft && DB_PATH=/var/lib/clubsoft/app.db MEDIA_ROOT=/var/lib/clubsoft/media node scripts/backfill.mjs"]' \
  --region eu-central-1
```

Expected output: `news: 6 inserted`, `sponsors: 32 inserted` (20 active + 12 archived), `vorstand: 12 inserted`, ~43 media rows. Script is idempotent — a re-run logs `[skip]` for every row and inserts nothing.

The script reads `scripts/fixtures/news.json` (migration artifact, not live data) and has sponsor/vorstand data inlined.

### 5. Seed the initial admin over SSM

User-approved override — email as password:

```bash
aws ssm send-command \
  --instance-ids i-XXXX \
  --document-name AWS-RunShellScript \
  --parameters 'commands=["cd /opt/clubsoft && DB_PATH=/var/lib/clubsoft/app.db node server/seed-admin.mjs sophisticatedmemento@proton.me sophisticatedmemento@proton.me"]' \
  --region eu-central-1
```

The CLI enforces ≥12 chars and the blocklist (`password`, `alemannia`, `thalexweiler`, etc.) — the email passes both. Expected output: `Created admin sophisticatedmemento@proton.me`.

**Immediately after seeding**, advise the user to rotate via `/admin/admins` → "Passwort-Reset ausstellen" → follow the generated `/admin/reset?token=...` link and set a real passphrase. Current password is weak because it's public on the Impressum and will land in every breach dump.

### 6. Smoke test

- `https://svthalexweiler.de/` — news reel + sponsors + Vorstand all render with DB data.
- `https://svthalexweiler.de/news/kirmes2025-06-12` — article detail renders sanitized HTML.
- `https://svthalexweiler.de/admin/login` — login page loads.
- Log in with seeded creds, open `/admin/news`, `/admin/sponsors`, `/admin/vorstand`, `/admin/admins`.
- Check `/admin/news/new` → create a test post → confirm it appears on `/` within 60s (publish tick) or immediately if status=published.

### 7. Documentation follow-ups

- **Update the runbook in `infrastructure/`** with backup/restore steps from ADR 0007 (`sqlite3 .backup /tmp/app.db.bak`, S3 upload, 12-weekly lifecycle).
- **Graduate the planned specs** — `specs/planned/admin-{auth,news-editor,sponsor-editor,vorstand-editor}.md` are now implemented; either move them to `specs/` or, following the repo convention, leave in `planned/` and note "shipped" in `specs/README.md` the way the existing shipped-but-still-in-planned specs do.
- **Update `specs/planned/admin-auth.md`** to document the email-as-password override + the requirement to rotate.

## Appendix A — Known gotchas already fixed

- `res.sendFile` in Express 5 errored with `NotFoundError` on SPA paths containing segments (`/news/x`, `/Impressum`) despite the absolute path resolving and the file existing on disk. Replaced with `res.type("html").send(fs.readFileSync(path))`. See `server.mjs:89-91`.
- SVGO config needed `removeScripts` (not `removeScriptElement`), and a regex post-pass for `xlink:href` / `on*` / `@import` / `<foreignObject>` — the plugin didn't reliably strip them. See `server/sanitize.mjs`.
- News hero `bestNewsImage` must check `variants.svg` as a fallback — the backfill preserves the one news entry whose hero is the club crest SVG (`vereinbrauchtdich2026-03-22`). See `src/utilities/publicData.ts`.

## Appendix B — File map of the admin MVP branch

Backend (`server/`):
- `db.mjs` — better-sqlite3 wrapper + migration runner.
- `schema/001_init.sql` — admins, sessions, password_resets, media, news, sponsors, vorstand.
- `auth.mjs` — argon2id, session CRUD, lockout, password policy.
- `middleware.mjs` — Helmet CSP, session loader, `requireAuth`, `requireCsrf`, rate limiter.
- `sanitize.mjs` — `sanitize-html` allowlist + `svgo` config.
- `routes/{auth,media,news,sponsors,vorstand}.mjs` — REST handlers.
- `seed-admin.mjs` — idempotent admin CLI.

Admin SPA (`src/admin/`):
- `AuthContext.tsx`, `RequireAuth.tsx`, `AdminLayout.tsx`, `api.ts`, `types.ts`.
- `pages/{LoginPage,ResetPage,NewsListPage,NewsEditPage,SponsorListPage,SponsorEditPage,VorstandPage,AdminsPage}.tsx`.
- `components/{MediaUploader,RichTextEditor}.tsx`.

Public wire-up:
- `src/utilities/publicData.ts` — hooks + shuffle helpers.
- Modified: `HomePage`, `NewsDetailPage`, `NewsSection`, `SocialsSection`, `Footer`, `VorstandSection`, `Newscard`, `NewsDetail`, `Header` (LOGIN → Link).

Backfill:
- `scripts/backfill.mjs` (consumes `scripts/fixtures/news.json`).

Tests (46 total in the branch):
- `tests/unit/{admin-auth,sanitize,news-routes,public-data-shuffle}.test.ts` — new.
- Existing `fupa`, `training` tests preserved.

## Appendix C — Reverts to drop before re-merging

On `main`, commits `a2f5db8`, `d460d69`, `ab31b7a`, `2244609` are the reverts. When re-merging the admin MVP after the infra lands, you have two clean options:

1. **Revert-the-reverts** on main: `git revert a2f5db8..2244609` — creates four new commits that restore the admin MVP. History is a bit noisy but safe.
2. **Reset main to `f5dae6f` and force-push** — clean history, destructive. Only do this if you're sure no one else pulled the reverts in the meantime.

Prefer option 1 unless you care about the log looking tidy.
