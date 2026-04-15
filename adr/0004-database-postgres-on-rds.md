# ADR 0004 — PostgreSQL on Amazon RDS as the primary datastore

- **Status:** Accepted
- **Date:** 2026-04-15
- **Deciders:** Yannik Zeyer (infrastructure owner), with Vorstand budget sign-off.
- **Supersedes:** none
- **Superseded by:** none
- **Related:** ADR 0001 (migrate hardcoded data to a database), ADR 0002 (AWS as infrastructure).

## Context

ADR 0001 commits to moving all hardcoded content (news, sponsors, Vorstand, legal text, training schedule) behind a mutable datastore with a CRUD backend. ADR 0002 commits to AWS as the sole cloud and `eu-central-1` as the home region. Those two decisions narrow the concrete engine choice to a small set of options and force picking one before schema work can begin.

The workload is small: kilobytes of content, dozens of reads per minute at peak, writes bursting only when an admin publishes. Public reads will sit behind CloudFront. The hard requirement is reliability — a volunteer-run club cannot afford a weekend where the site is broken because of a half-understood database.

## Decision

**PostgreSQL on Amazon RDS** is the single datastore for all application data covered by ADR 0001.

1. Engine: PostgreSQL, latest minor of a current major supported by RDS.
2. Instance class: smallest viable (`db.t4g.micro` to start), Single-AZ pre-launch.
3. Multi-AZ enabled before the admin UI is exposed to real edits.
4. Automated daily snapshots, 14-day retention. Point-in-time recovery enabled.
5. Encryption at rest via AWS KMS using a customer-managed key. TLS required in transit.
6. Region: `eu-central-1` (Frankfurt). Snapshots stay in-region; if DR later needs cross-region copies, they stay within the EU.
7. One database, separate schemas per domain (`content`, `auth`, `audit`) so concerns stay isolated without the overhead of multiple instances.

## Alternatives considered

- **DynamoDB.** Cheaper at rest, zero instance management. Rejected: the data shape is relational (news → versions → media, sponsors with weighted rotation, Vorstand with roles and consent history). Modeling that in DynamoDB means custom indexes, fan-out on write, and reinventing transactions. For a volunteer-maintained project, SQL is the lower-cognitive-load choice even if the bill is marginally higher.
- **SQLite on EFS.** Cheapest option. Rejected: concurrent write story is weak, backup/restore story is manual, and the single-writer constraint would bite as soon as the admin UI has two people editing.
- **Self-managed Postgres on the Fargate task.** Rejected: backups, upgrades, and recovery all become the infrastructure owner's problem; RDS's price over self-managed on a `t4g.micro` is small enough that the operational saving dominates.
- **Aurora Serverless v2.** Rejected: overkill for the workload, higher baseline cost, and its scaling story adds complexity we do not need.

## Consequences

### Positive

- Mature tooling: `pg_dump`/`pg_restore`, migrations via a standard tool (pick in a future small ADR), client libraries everywhere.
- Relational constraints (`FOREIGN KEY`, `CHECK`, unique slugs) catch bad data at write time instead of at render time.
- RDS takes minor-version upgrades, automated backups, and parameter-group tuning off the infrastructure owner's plate.
- PITR means a "bad admin action on Sunday evening" is recoverable to a ten-minute window.

### Negative / Costs

- Baseline ~15 EUR/month before Multi-AZ. Multi-AZ roughly doubles that; acceptable once the admin UI ships.
- One more moving part in the AWS footprint — VPC networking, security groups, parameter groups, and the KMS key are now maintained surface.
- Schema migrations become a real process with rollbacks, not just a `git revert`.

### DSGVO / legal

- Personal data (Vorstand PII, admin accounts, audit log, contact-form messages if stored) lives in `eu-central-1` only.
- KMS-managed encryption at rest; TLS in transit.
- Backups inherit the same encryption and retention window, aligned with the club's record of processing activities.

## Follow-ups

- Pick a migrations tool (dbmate, node-pg-migrate, or similar) and commit to one migration-file style — very small ADR, or a line in this one once the backend repo lands.
- Parameter-group hardening (statement timeout, `idle_in_transaction_session_timeout`, `log_min_duration_statement`) before the admin UI is public.
- Backup restore drill before Multi-AZ goes live — one full restore into a throwaway instance, documented.
- Decide connection-pooling story (RDS Proxy vs. a per-process pool in the Express app). Tracked in `adr/0003-architecture-backlog.md` B1.
