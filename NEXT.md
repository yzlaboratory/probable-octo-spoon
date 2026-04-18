# NEXT — admin-MVP cutover, part 2

Resume cold from this file. Supersedes the NEXT.md on `worktree-admin-mvp` (dated 2026-04-17).

## Where things stand (2026-04-18)

- **`main` @ `2244609`** — still the four reverts on top of `2fdca1f`. Live site is the old S3 + CloudFront stack. Unchanged since the last NEXT.
- **`origin/worktree-admin-mvp` @ `f5dae6f`** — full admin MVP, untouched. 46 tests passing. Still the merge target once the infra lands.
- **`origin/worktree-adr-0008-infra` @ `97f34db`** — new work. Three commits:
  1. `c60f15e` rewrite terraform for ADR 0008 EC2 topology
  2. `4ea08d1` pre-create traefik bind-mount targets in cloud-init
  3. `97f34db` rewire deploy workflow to ssm:SendCommand
- **`infrastructure/RUNBOOK.md`** — staged apply, bootstrap, deploy, backups, restore, IMDSv2 notes. Everything an operator needs end-to-end.

## What the branch contains

Terraform (all under `infrastructure/`, split by concern):

- `main.tf` — providers, AL2023 ARM AMI + Route53 zone data sources.
- `compute.tf` — EC2 `t4g.small`, 16 GB gp3 root, 20 GB gp3 data volume at `/var/lib/clubsoft` (prevent_destroy), SG (80/443 open, 22 closed), EIP, IAM instance profile with `AmazonSSMManagedInstanceCore` + inline secrets/S3 policy, IMDSv2-only.
- `user-data.sh.tpl` — Docker + compose plugin install, data volume format + mount, Traefik bind-mount targets, dnf-automatic for unattended security patches.
- `dns.tf` — Route53 A records for apex + www → EIP.
- `lambda.tf` — Instagram token refresh Lambda + EventBridge schedule + Secrets Manager (unchanged).
- `backups.tf` — S3 bucket for SQLite weekly snapshots (12-week lifecycle, SSE-S3, BPA), DLM daily EBS snapshots (retain 7).
- `github.tf` — GitHub OIDC deploy role, rewired for `ssm:SendCommand` instead of S3/CloudFront.
- `outputs.tf` — `app_instance_id`, `app_public_ip`, `sqlite_backup_bucket`, `ig_token_secret_name`, `github_deploy_role_arn`.

Workflow (`.github/workflows/deploy.yml`):

- `npm test` gate unchanged.
- Deploy job: assume OIDC role → resolve instance by tag → `ssm:SendCommand` with `git fetch && git checkout --force <sha> && docker compose up -d --build` → poll for completion for up to 15 min.
- Concurrency group `deploy-prod` serializes deploys (no cancel-in-progress — that would leave compose mid-flight).

Dropped from Terraform: S3 website bucket, CloudFront + OAC, ACM cert, API Gateway v2, Instagram proxy Lambda, FuPa Lambda (admin-mvp ports it into Express).

## The cutover, in order

Steps requiring hands-on access are flagged **[operator]**. Everything else is already merged/pushed on the branch.

### 1. Review & merge the infra branch — **[operator]**

Open PR `worktree-adr-0008-infra` → `main` is live; do **not** merge yet. Merging auto-runs `deploy.yml`, which will fail because the EC2 does not exist yet.

Options, in order of preference:

- **A. Apply first, then merge.** Check out `worktree-adr-0008-infra` locally, run the staged apply per `infrastructure/RUNBOOK.md §1`, verify the EIP serves something (even just the old reverted SPA, manually deployed), then merge the PR. The first deploy after merge points the already-existing EC2 at the merge commit.
- **B. Merge with the deploy workflow temporarily disabled.** `gh workflow disable deploy.yml` before the merge, run Terraform from `main`, re-enable.

Either way, the order is: Terraform live → EC2 bootstrapped (§2 below) → merge.

### 2. Bootstrap the EC2 — **[operator]**

See `infrastructure/RUNBOOK.md §2`. Summary:

- `aws ssm start-session --target <instance-id>` (install the session manager plugin if you don't have it).
- Add an SSH deploy key to the repo's *Deploy keys* page, drop the private key at `/home/ec2-user/.ssh/id_ed25519`, wire `~/.ssh/config`.
- `git clone git@github.com:yzlaboratory/probable-octo-spoon.git /opt/clubsoft`.
- Write `/opt/clubsoft/.runtime.env` with `IG_ACCESS_TOKEN` (read from Secrets Manager), `PORT=4321`, `DB_PATH`, `MEDIA_ROOT`, `SESSION_SECRET` (random 32 bytes).
- `docker compose up -d --build` to prove the stack boots. Traefik requests an LE cert on first HTTPS hit.
- Verify on the EIP before DNS flips.

### 3. Merge `worktree-admin-mvp` — **[operator]**

Only after steps 1 and 2 are green. Prefer `git revert a2f5db8..2244609` on `main` over a reset + force push — keeps the log honest.

Push triggers `deploy.yml`, which SSMs the EC2 and rebuilds the compose stack on the new SHA. Expect a short (<10 s) blip while Traefik + Express restart. On first boot of the new image, `server/db.mjs.openDb()` runs migrations inside a transaction against `/var/lib/clubsoft/app.db`.

### 4. Run the backfill — **[operator]**

Once the admin-mvp code is running:

```bash
aws ssm send-command \
  --instance-ids <id> --region eu-central-1 \
  --document-name AWS-RunShellScript \
  --parameters 'commands=["cd /opt/clubsoft && DB_PATH=/var/lib/clubsoft/app.db MEDIA_ROOT=/var/lib/clubsoft/media node scripts/backfill.mjs"]'
```

Expect: `news: 6 inserted`, `sponsors: 32 inserted`, `vorstand: 12 inserted`, ~43 media rows. Idempotent.

### 5. Seed the initial admin — **[operator]**

User-approved override — email as password; rotate immediately:

```bash
aws ssm send-command \
  --instance-ids <id> --region eu-central-1 \
  --document-name AWS-RunShellScript \
  --parameters 'commands=["cd /opt/clubsoft && DB_PATH=/var/lib/clubsoft/app.db node server/seed-admin.mjs sophisticatedmemento@proton.me sophisticatedmemento@proton.me"]'
```

Then log in at `/admin/login`, open `/admin/admins`, issue a reset, follow the `/admin/reset?token=…` link, set a strong passphrase. Current password lives on the Impressum page.

### 6. Cut DNS, destroy the old stack — **[operator]**

`terraform apply -target=aws_route53_record.app` flips apex + www to the EIP. Wait the 300 s TTL, smoke-test `https://svthalexweiler.de/` end-to-end. Then `aws s3 rm s3://svthalexweiler-website --recursive` (the bucket must be empty for Terraform to destroy it) and `terraform apply` one last time to drop CloudFront, ACM, API Gateway, and the two unused Lambdas.

CloudFront destroy is 5–15 min. Terraform polls.

### 7. Install the SQLite backup cron — **[operator]**

See `infrastructure/RUNBOOK.md §4.1`. One-liner `/etc/cron.weekly/clubsoft-sqlite-backup`. Verify first snapshot lands in `s3://svthalexweiler-sqlite-backups/` a week later.

Rehearse the restore drill (§4.3) once at commissioning.

### 8. Documentation cleanup — **[can be done anytime]**

- Graduate `specs/planned/admin-{auth,news-editor,sponsor-editor,vorstand-editor}.md` — either move to `specs/` or mark "shipped" in `specs/README.md` following the existing pattern.
- Update `specs/planned/admin-auth.md` to document the email-as-password override + required rotation.
- Delete this NEXT.md once the cutover is complete.

## Known risks / things I punted on

- **Private-repo auth on the EC2.** The runbook recommends an SSH deploy key; you set it up by hand during bootstrap. I didn't automate it through Secrets Manager — more moving parts than the MVP warrants.
- **The old S3 website bucket must be emptied before `terraform apply` can destroy it.** `force_destroy` isn't set (and shouldn't be, as a safety rail). Runbook §1 Stage C includes the `aws s3 rm` command.
- **ACM cert in `us-east-1`.** Terraform knows about it through the `aws.us_east_1` alias in the old `main.tf`. The new `main.tf` removes that alias, so the cert becomes an orphan in state. The final cleanup apply will destroy it along with CloudFront. If that fails for any reason, `aws acm delete-certificate --region us-east-1 --certificate-arn <arn>` once CloudFront is gone.
- **IG token** is kept in Secrets Manager under the same name; the refresh Lambda still rotates it weekly. The Express app reads the secret on the EC2 at request time.
- **CloudWatch agent / logs.** ADR 0008 calls for CPU/memory/disk/Docker metrics to CloudWatch Logs with 30 d retention. Not provisioned in this pass. Add in a follow-up — the SSM policy covers the metric publishing verb already.
- **`/healthz` endpoint.** ADR 0008 follow-up. Not added yet. Traefik and CloudWatch can probe `/` for now.

## Appendix — useful one-liners

```bash
# Instance ID
terraform -chdir=infrastructure output -raw app_instance_id

# EIP
terraform -chdir=infrastructure output -raw app_public_ip

# Open an interactive shell on the host
aws ssm start-session --region eu-central-1 \
  --target $(terraform -chdir=infrastructure output -raw app_instance_id)

# Tail the most recent SSM deploy output
aws ssm list-commands --region eu-central-1 \
  --instance-id $(terraform -chdir=infrastructure output -raw app_instance_id) \
  --max-results 1 --query 'Commands[0].CommandId' --output text \
  | xargs -I{} aws ssm get-command-invocation --region eu-central-1 \
      --command-id {} \
      --instance-id $(terraform -chdir=infrastructure output -raw app_instance_id) \
      --query 'StandardOutputContent' --output text
```
