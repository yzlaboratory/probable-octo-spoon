# NEXT — admin-MVP cutover, part 3

Resume cold from this file. Supersedes the NEXT.md merged via PR #1.

## Where things stand (2026-04-18, later same day)

- **`main`** has the full admin MVP + the ADR 0008 infra. PRs merged today: #1 (infra), #2 (SSM deploy ownership fix), #3 (admin-mvp + container persistence fix).
- **EC2** `i-06bc80dcb02d19c7b` at EIP **`35.157.38.25`** is running the admin-mvp code. Traefik is up. SPA + admin routes respond `200` over self-signed TLS (LE can't issue until DNS is flipped).
- **SQLite DB** initialized at `/var/lib/clubsoft/app.db` on the EBS data volume. Backfill ran: 6 news, 32 sponsors, 12 vorstand. Admin `sophisticatedmemento@proton.me` seeded with email-as-password.
- **Legacy CloudFront stack still live.** Porkbun DNS still points `svthalexweiler.de` + `www` at the old CloudFront IPs / domain — no real user traffic has landed on the EC2 yet.

## What's left

Steps marked **[operator]** cannot be driven from Claude Code — they need the human in the loop.

### 1. Rotate the seeded admin password — **[operator]**

Still email-as-password. Log in at `https://35.157.38.25/admin/login` (accept the self-signed warning; Host header gets rewritten by the browser if you type `svthalexweiler.de` and add the override in `/etc/hosts`). Or wait until after the DNS flip and rotate via `https://svthalexweiler.de/admin/login`.

Open `/admin/admins`, issue a reset, follow the `/admin/reset?token=…` link, set a strong passphrase.

### 2. Flip DNS at Porkbun — **[operator]**

The zone is at the registrar, not Route53 (that's a change from the previous NEXT.md — `dns.tf` has been removed; the Terraform Route53 flow was a dead end).

In the Porkbun dashboard for `svthalexweiler.de`:

| Host | Type | New value | Replaces |
| --- | --- | --- | --- |
| (apex) | A | `35.157.38.25` | four CloudFront A records |
| `www` | A | `35.157.38.25` | CNAME `d123w08vbjvbvp.cloudfront.net` |

TTL is already 60 s. Once propagated, Traefik's ACME TLS-ALPN-01 challenge will succeed on first HTTPS hit and Let's Encrypt will issue certs for both hostnames. Smoke-test:

```bash
curl -I https://svthalexweiler.de/
curl -I https://www.svthalexweiler.de/
```

Rollback is: restore the Porkbun records to their old values.

### 3. Destroy the legacy stack

Only after DNS is flipped and the new EC2 is confirmed serving real traffic. I can drive this (AWS CLI + Terraform), just give the word:

```bash
# empty the old website bucket (Terraform won't destroy a non-empty bucket)
aws s3 rm s3://svthalexweiler-website --recursive
terraform -chdir=infrastructure apply
```

Current plan: `Plan: 0 to add, 1 to change, 22 to destroy.` Destroys CloudFront, the us-east-1 ACM cert, API Gateway v2, the Instagram proxy + FuPa Lambdas, and the old S3 website bucket. CloudFront destroy takes 5–15 min. After the apply, I'll drop the `aws.us_east_1` provider alias in a follow-up.

### 4. SQLite backup cron (ADR 0007)

One-liner on the host. I can SSM this once you're ready:

```bash
cat > /etc/cron.weekly/clubsoft-sqlite-backup <<'EOF'
#!/bin/bash
set -euo pipefail
STAMP=$(date -u +%Y-%m-%dT%H-%M-%SZ)
TMP=$(mktemp -d)
sqlite3 /var/lib/clubsoft/app.db ".backup $TMP/app.db"
gzip -9 "$TMP/app.db"
aws s3 cp "$TMP/app.db.gz" "s3://svthalexweiler-sqlite-backups/app-$STAMP.db.gz" \
  --region eu-central-1
rm -rf "$TMP"
EOF
chmod +x /etc/cron.weekly/clubsoft-sqlite-backup
```

First snapshot lands next Sunday 04:02 UTC. Restore drill is RUNBOOK §4.3.

### 5. Documentation cleanup — **[anytime]**

- Graduate `specs/planned/admin-{auth,news-editor,sponsor-editor,vorstand-editor}.md`.
- Document the email-as-password seed override in `specs/planned/admin-auth.md`.
- Delete this NEXT.md.

## Punted follow-ups (track in ADR 0008 backlog)

- CloudWatch agent for CPU/mem/disk/Docker metrics with 30-day retention.
- `/healthz` endpoint + Traefik healthcheck + CloudWatch synthetic.
- Legacy GitHub repo secrets `CLOUDFRONT_DISTRIBUTION_ID`, `S3_BUCKET` — delete once §3 destroy is applied.
- Traefik OTLP tracing config points at `localhost:4318` with nothing listening — noisy, not fatal.
