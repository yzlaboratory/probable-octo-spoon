# ADR 0007 — SQLite on an EBS volume as the primary datastore

- **Status:** Accepted
- **Date:** 2026-04-17
- **Deciders:** Yannik Zeyer.
- **Supersedes:** ADR 0004
- **Superseded by:** none
- **Related:** ADR 0001 (migrate hardcoded data to a database), ADR 0008 (single-EC2 compute topology).

## Context

ADR 0004 committed the project to PostgreSQL on Amazon RDS. Re-examining the workload before the admin UI is scheduled made that choice look oversized:

- The admin population is 2–3 board members. Concurrent writes are vanishingly rare.
- All data covered by ADR 0001 is kilobytes: news, sponsors, Vorstand, legal text, training schedule.
- Public reads are low volume and cacheable.
- The operator-time budget for this project is minutes per month, not hours. Every managed service the stack carries is maintenance surface that a volunteer pays for.

RDS was priced at ~15 EUR/month before Multi-AZ, plus the VPC, security-group, and KMS surface that comes with it. For the scale above, that is fixed cost and fixed complexity for capacity and features the site will never use.

## Decision

**SQLite** is the single datastore for all application data covered by ADR 0001. The database file lives on the **EBS volume attached to the single EC2 instance** committed in ADR 0008.

1. Engine: SQLite (latest stable in the distro), accessed in-process from the Node/Express app via `better-sqlite3`.
2. Journal mode: WAL. `synchronous = NORMAL`. `foreign_keys = ON`.
3. Database file: `/var/lib/clubsoft/app.db` on the EC2 instance's EBS root volume (same volume as the app). Encrypted at rest via EBS default encryption.
4. Migrations: one `schema/` directory of numbered `.sql` files, applied at app boot inside a transaction. Tool choice deferred until the first migration is written; a 20-line runner is acceptable.
5. Backup: a weekly cron runs `sqlite3 /var/lib/clubsoft/app.db ".backup /tmp/app.db.bak"`, gzips the file, uploads it to an S3 bucket in `eu-central-1`, and deletes the local copy. Bucket lifecycle: retain 12 weekly snapshots, then expire.
6. Restore: documented runbook steps — stop the app, `aws s3 cp` the desired snapshot down, gunzip into place, start the app. Rehearsed once at commissioning.

## Alternatives considered

- **PostgreSQL on RDS (ADR 0004).** Superseded. The managed-backup and replication features RDS sells are not features this workload needs; they are fixed cost for a site with three admins.
- **SQLite on EFS.** Rejected the same way ADR 0004 rejected it, and still right: EFS is slow for SQLite's small-read pattern, and network-filesystem locking against SQLite is documented as unsafe. EBS is a local block device and sidesteps both problems.
- **Litestream (continuous replication to S3).** Tempting — continuous backup, near-zero RPO. Rejected for now as more moving parts than the workload warrants: a board member's lost afternoon of edits on a rare instance failure is recoverable from memory, and the weekly `.backup` story is one cron line. Reopen the question if admin activity volume ever makes a week feel long.
- **DuckDB, LibSQL, Turso.** Rejected: each adds either a new service or a new vendor relationship. SQLite is in the standard library of every operating environment we care about.
- **Keep Postgres but self-host on the EC2 instance.** Rejected: loses RDS's only real upside (managed backups, point-in-time recovery) while keeping Postgres's operational weight (WAL archiving, vacuum tuning, minor-version upgrades).

## Consequences

### Positive

- Zero managed-service cost. No RDS, no Multi-AZ, no KMS customer-managed key, no RDS Proxy.
- Backup is one cron line. Restore is one `aws s3 cp`. Both are trivially scriptable.
- In-process access eliminates the connection-pool question entirely; there is no network round-trip on any query.
- Schema changes are `git`-tracked SQL files, applied at boot. No migration tool to maintain.
- Developer onboarding is unchanged from "clone the repo and run." No local Postgres to install.

### Negative / Costs

- **RPO is up to one week.** A disk failure on Sunday evening loses a week of admin edits. Accepted: edit volume is low and board members remember what they published.
- **Single writer.** Concurrent admin saves serialize at the SQLite lock. At ~3 admins the chance of collision is effectively zero; any observed collision would be a signal to rethink, not a daily friction.
- **Single-host blast radius.** The app, database, and uploaded images live on one EBS volume. If the instance is lost, recovery depends on the weekly snapshot + re-deploying the app. Addressed by ADR 0008's restore runbook.
- **No point-in-time recovery.** A "bad edit on Tuesday" cannot be rolled back to Monday evening; the only restore point is the last weekly snapshot. Accepted at this scale.
- **Scaling out requires migration.** If the club ever genuinely needs multi-node writes (it won't), SQLite has to be replaced. The migration would be to Postgres, and the data shape ports cleanly.

### DSGVO / legal

- All personal data (admin accounts, Vorstand PII) stays on an `eu-central-1` EBS volume, encrypted at rest.
- Weekly snapshots land in an `eu-central-1` S3 bucket, default-encrypted, with block-public-access on.
- Snapshot retention is 12 weeks; lifecycle expiry removes older copies automatically.
- No cross-region replication.

## Follow-ups

- Commit the schema directory layout and migration runner in the first backend PR. One small ADR if the runner grows beyond a few dozen lines.
- Write the backup/restore runbook in `infrastructure/` alongside the Terraform. Rehearse the restore once at commissioning.
- Set `statement_timeout` equivalents at the app layer (`better-sqlite3` `timeout` option) to avoid a single stuck query wedging the process.
- Confirm EBS snapshot settings on the root volume as a secondary safety net, independent of the weekly S3 dump.
