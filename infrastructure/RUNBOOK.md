# Operator runbook

One-stop reference for bringing the ADR 0008 topology online, operating it, and recovering from failure. Covers everything from the first `terraform apply` through routine SQLite backups.

If you are doing a fresh cutover from the old S3 + CloudFront stack, follow **§1 → §2 → §3** in order. If the stack is already live, skip to the section you need.

---

## 1. Staged Terraform apply (cutover from S3 + CloudFront)

The rewrite in `infrastructure/` replaces the S3 + CloudFront + API Gateway stack with a single EC2. Running `terraform apply` in one pass would destroy the old stack before the new one is serving traffic — the site would go dark.

Split the apply into three stages.

### Stage A — stand up the new stack alongside the old

Nothing here touches DNS or the old CloudFront distribution. The new EC2 gets a public EIP you can curl directly.

```bash
cd infrastructure
terraform init
terraform apply \
  -target=aws_security_group.app \
  -target=aws_iam_role.ec2_app \
  -target=aws_iam_role_policy_attachment.ec2_app_ssm \
  -target=aws_iam_role_policy.ec2_app_inline \
  -target=aws_iam_instance_profile.ec2_app \
  -target=aws_ebs_volume.app_data \
  -target=aws_instance.app \
  -target=aws_volume_attachment.app_data \
  -target=aws_eip.app \
  -target=aws_eip_association.app \
  -target=aws_s3_bucket.sqlite_backups \
  -target=aws_s3_bucket_public_access_block.sqlite_backups \
  -target=aws_s3_bucket_server_side_encryption_configuration.sqlite_backups \
  -target=aws_s3_bucket_versioning.sqlite_backups \
  -target=aws_s3_bucket_lifecycle_configuration.sqlite_backups \
  -target=aws_iam_role.dlm \
  -target=aws_iam_role_policy_attachment.dlm \
  -target=aws_dlm_lifecycle_policy.app_data_daily \
  -target=aws_iam_role_policy.github_deploy
```

Note the last target: `github_deploy` inline policy is updated in place; the role itself already exists.

Capture these outputs — you'll need them in §2:

```bash
terraform output app_instance_id
terraform output app_public_ip
```

### Stage B — bootstrap the EC2, deploy, verify on the EIP

See §2 (host bootstrap) and §3 (first deploy). **Stop here and verify `http://<EIP>` serves the app** before touching DNS.

### Stage C — cut DNS at Porkbun, then clean up the old stack

DNS for `svthalexweiler.de` is managed at **Porkbun** (the registrar), not Route53. The zone does not exist in this AWS account, so there is no `terraform apply` for the DNS flip — it has to be done by hand in the Porkbun dashboard.

**At Porkbun (DNS Records for svthalexweiler.de):**

| Host | Type | Value | Old value |
| --- | --- | --- | --- |
| (apex) | A | `<EIP from `terraform output -raw app_public_ip`>` | 4× CloudFront IPs |
| `www` | A | same EIP | `d123w08vbjvbvp.cloudfront.net` (CNAME) |

TTL is already 60 s, so propagation is fast. Keep the old CloudFront distribution running until you've smoke-tested `https://svthalexweiler.de/` on the new EIP — rollback is: change the records back at Porkbun.

Once you're satisfied:

```bash
# Empty the old website bucket first — Terraform won't delete a non-empty bucket.
aws s3 rm s3://svthalexweiler-website --recursive
terraform apply
```

The final apply destroys CloudFront, the ACM cert in `us-east-1`, the API Gateway v2, and the Instagram proxy + FuPa Lambdas. The CloudFront destroy takes 5–15 min; Terraform polls until it finishes.

After the destroy, remove the `aws.us_east_1` provider alias in `main.tf` (it only existed to manage the orphan cert).

### Rollback

If Stage A or B fails, `terraform destroy -target=aws_instance.app` removes the new EC2 without touching the live site. Stage C is the only irreversible step — once the DNS record is flipped and CloudFront is gone, the path back is a restore (§5).

---

## 2. First-boot host bootstrap

After Stage A, the EC2 is running but `/opt/clubsoft` is empty. Do this once.

### 2.1 Open an SSM session

No port 22 is open — you reach the host via SSM. Local pre-req: [AWS SSM session manager plugin](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html) installed.

```bash
aws ssm start-session --region eu-central-1 --target $(terraform -chdir=infrastructure output -raw app_instance_id)
```

You land as `ssm-user`. Elevate: `sudo -i`.

### 2.2 Configure git for the private repo

Two options. Pick one.

**(a) SSH deploy key (preferred).** On your laptop, generate a read-only deploy key, add the public half to the GitHub repo's *Deploy keys* page (read-only), and copy the private half to `/home/ec2-user/.ssh/id_ed25519` on the host (mode 0600, owned by ec2-user). Then:

```bash
install -d -m 0700 -o ec2-user -g ec2-user /home/ec2-user/.ssh
cat > /home/ec2-user/.ssh/config <<'EOF'
Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519
  IdentitiesOnly yes
  StrictHostKeyChecking accept-new
EOF
chown -R ec2-user:ec2-user /home/ec2-user/.ssh
chmod 600 /home/ec2-user/.ssh/config
```

**(b) HTTPS + PAT.** Store a fine-grained PAT in Secrets Manager, read it into a credential helper on boot. Skipping the details — SSH is less fragile for an unattended host.

### 2.3 Clone the repo

```bash
sudo -u ec2-user git clone git@github.com:yzlaboratory/probable-octo-spoon.git /opt/clubsoft
```

### 2.4 Drop the runtime env file

`server.mjs` loads `.runtime.env` via `node --env-file=`. Create it on the host — never commit it.

```bash
cat > /opt/clubsoft/.runtime.env <<EOF
IG_ACCESS_TOKEN=$(aws secretsmanager get-secret-value \
  --secret-id svthalexweiler/ig-access-token \
  --query SecretString --output text --region eu-central-1)
PORT=4321
DB_PATH=/var/lib/clubsoft/app.db
MEDIA_ROOT=/var/lib/clubsoft/media
SESSION_SECRET=$(openssl rand -hex 32)
EOF
chown ec2-user:ec2-user /opt/clubsoft/.runtime.env
chmod 600 /opt/clubsoft/.runtime.env
```

`DB_PATH`, `MEDIA_ROOT`, and `SESSION_SECRET` are only read by the admin-mvp branch; they're harmless on pre-admin-mvp code.

### 2.5 Verify Traefik bind-mount targets

Cloud-init pre-creates these, but double-check:

```bash
ls -la /home/acme.json                      # 0600
ls -la /var/log/traefik/                    # 0755, owned by root; logs 0644
```

If missing (e.g. the cloud-init step was skipped), re-create with the install commands in `infrastructure/user-data.sh.tpl`.

### 2.6 Start the stack

```bash
sudo -u ec2-user bash -lc 'cd /opt/clubsoft && docker compose up -d --build'
docker compose ps
```

Let's Encrypt issues the cert on first request to port 443 (ACME TLS-ALPN challenge via Traefik). Confirm with:

```bash
curl -I http://<EIP>/
# → HTTP/1.1 308 Permanent Redirect (to https)
curl -kI https://<EIP>/ --resolve svthalexweiler.de:443:<EIP>
# → HTTP/2 200
```

You're ready for Stage C.

---

## 3. Routine deploys

Pushes to `main` trigger `.github/workflows/deploy.yml`. The workflow:

1. Runs `npm test` on a GitHub-hosted runner.
2. Assumes the OIDC role `svthalexweiler-github-deploy`.
3. Looks up the instance by the `Name=svthalexweiler-app` tag.
4. Sends an SSM `AWS-RunShellScript` command: `git fetch --all && git checkout --force <sha> && docker compose up -d --build`.
5. Polls `ssm:GetCommandInvocation` every 10 s up to 15 min.

Manual deploy from your laptop (useful for debugging):

```bash
aws ssm send-command \
  --region eu-central-1 \
  --instance-ids $(terraform -chdir=infrastructure output -raw app_instance_id) \
  --document-name AWS-RunShellScript \
  --comment "manual deploy $(git rev-parse HEAD)" \
  --parameters commands='["set -euxo pipefail","cd /opt/clubsoft","git fetch --all --prune","git checkout --force '"$(git rev-parse HEAD)"'","docker compose up -d --build"]'
```

Watch it finish:

```bash
aws ssm list-command-invocations --region eu-central-1 \
  --instance-id $(terraform -chdir=infrastructure output -raw app_instance_id) \
  --details --max-results 1
```

---

## 4. Backups (ADR 0007)

### 4.1 Install the weekly cron on first commissioning

On the EC2 host:

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

Cron is already enabled on AL2023. `cronie` runs `/etc/cron.weekly/*` on Sundays at 04:02 UTC. The S3 bucket has a 12-week lifecycle — old snapshots auto-expire.

### 4.2 Verify the first snapshot

A week after first commissioning, confirm:

```bash
aws s3 ls s3://svthalexweiler-sqlite-backups/ --region eu-central-1
```

Expect one `app-YYYY-MM-DDTHH-MM-SSZ.db.gz` file.

### 4.3 Restore drill (rehearse once at commissioning)

```bash
# On the host:
cd /var/lib/clubsoft
docker compose -f /opt/clubsoft/docker-compose.yml stop clubsoft
cp app.db app.db.pre-restore                 # safety copy
aws s3 cp s3://svthalexweiler-sqlite-backups/app-<stamp>.db.gz - \
  --region eu-central-1 | gunzip > app.db.restored
mv app.db.restored app.db
chown ec2-user:ec2-user app.db
docker compose -f /opt/clubsoft/docker-compose.yml start clubsoft
```

Smoke-test, then delete `app.db.pre-restore`. Document any surprises in the runbook.

### 4.4 Secondary safety net — EBS daily snapshots

Data Lifecycle Manager takes a daily snapshot of `svthalexweiler-app-data` at 03:00 UTC, retains 7. Restore path (worst case, full volume loss):

```bash
aws ec2 describe-snapshots --owner-ids self \
  --filters "Name=tag:Name,Values=svthalexweiler-app-data" \
  --query "Snapshots[?StartTime>='$(date -u -v-3d +%Y-%m-%d)'].[SnapshotId,StartTime]" \
  --output table
# Pick a snapshot, create a volume from it in the same AZ, detach the old,
# attach the new. See AWS EBS docs for the exact sequence.
```

---

## 5. OS patching (ADR 0008)

Cloud-init installs `dnf-automatic` with `apply_updates = yes`, so security patches apply nightly. Kernel updates still need a reboot. Schedule a monthly manual reboot during a low-traffic window:

```bash
sudo systemctl reboot
```

Docker Compose is `restart: unless-stopped` — containers come back on their own. Traefik re-reads `/home/acme.json` and keeps the existing cert.

---

## 6. Common SSM session tasks

All run as `root` in an SSM session (`sudo -i` after `aws ssm start-session`).

### Tail app logs

```bash
docker logs -f clubsoft-clubsoft-1
```

### Tail Traefik access log

```bash
tail -f /var/log/traefik/access.log
```

### Inspect the SQLite DB

```bash
sqlite3 /var/lib/clubsoft/app.db '.schema news'
sqlite3 /var/lib/clubsoft/app.db 'SELECT count(*) FROM news;'
```

### Run the one-time admin seed

```bash
cd /opt/clubsoft
node server/seed-admin.mjs sophisticatedmemento@proton.me sophisticatedmemento@proton.me
```

(Only after the admin-mvp branch is merged and deployed.)

### Run the one-time backfill

```bash
cd /opt/clubsoft
DB_PATH=/var/lib/clubsoft/app.db \
MEDIA_ROOT=/var/lib/clubsoft/media \
node scripts/backfill.mjs
```

Idempotent — re-runs log `[skip]` for every row.

---

## 7. IMDSv2, security group, and why SSH is closed

The security group allows **80, 443, and nothing else**. Port 22 is closed. All admin access goes through SSM Session Manager (`aws ssm start-session`), which tunnels over the SSM agent and leaves a CloudTrail audit record per session.

`http_tokens = "required"` on the instance forces IMDSv2. Any library that still uses IMDSv1 will fail — this is intentional.

If you ever need port 22 (emergency, SSM agent broken), add a one-off rule scoped to your current IP:

```bash
aws ec2 authorize-security-group-ingress --group-id <sg-id> \
  --protocol tcp --port 22 --cidr $(curl -s https://checkip.amazonaws.com)/32
# revoke it afterwards
aws ec2 revoke-security-group-ingress --group-id <sg-id> \
  --protocol tcp --port 22 --cidr <your-ip>/32
```

---

## 8. Known gotchas

- **Traefik bind mounts.** `acme.json` must be `0600` and a **file**, not a directory. If Traefik crashes on boot with "permission denied" or "is a directory", check `/home/acme.json`. Cloud-init creates it correctly; manual re-installs of the compose stack can accidentally recreate it as a directory.
- **EBS volume on Nitro.** Appears as `/dev/nvme1n1`, not `/dev/sdf`. Cloud-init iterates through the candidates.
- **Instance replacement.** If Terraform replaces the EC2 (AMI update, subnet change), the EBS data volume stays (`prevent_destroy = true`) and reattaches via `aws_volume_attachment` to the new instance. The EIP also reassociates. Expect ~2 min of downtime during replacement.
- **`terraform apply` dependencies.** The `aws_ebs_volume.app_data` AZ is pinned to the first AZ returned by `data.aws_availability_zones.available`. Do not let AWS reshuffle AZ ordering mid-apply — Terraform will attempt to move the volume and fail on `prevent_destroy`.
