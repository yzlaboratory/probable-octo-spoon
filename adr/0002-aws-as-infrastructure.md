# ADR 0002 — Use AWS as the primary cloud infrastructure

- **Status:** Accepted
- **Date:** 2026-04-15
- **Deciders:** Yannik Zeyer (infrastructure owner), with Vorstand budget sign-off.
- **Supersedes:** none
- **Superseded by:** none
- **Related:** ADR 0001 (database migration), ADR 0004 (Postgres on RDS), ADR 0005 (compute topology), ADR 0006 (API shape).

## Context

The project already carries a partial AWS footprint in `infrastructure/`:

- Terraform stack for **S3** (static asset storage), **CloudFront** (CDN/TLS), **API Gateway**, and a **Lambda** that refreshes the long-lived Instagram access token into **AWS Secrets Manager** on a schedule.
- **GitHub Actions** CI/CD (Node.js 24) already wired to deploy into this account.
- The production container (Express + built SPA) runs behind a **Traefik v3.3** reverse proxy with Let's Encrypt certificates; today this container lives on a self-managed host, not yet in AWS.

Pressures that forced a decision now:

- ADR 0001 commits to a managed database and a mutable data layer. A cloud platform has to be named before schema and backend work can land.
- The planned admin surface needs durable storage, object storage for media, and a secrets store — all of which AWS already partially provides in this account.
- DSGVO obligations (Vorstand PII, admin accounts, audit log) require EU-resident hosting with documented data-processing agreements.
- The infrastructure owner is one person. Operational complexity must stay low. Multi-cloud is not an option.

## Decision

AWS is the primary (and effectively sole) cloud infrastructure provider for this project. All new server-side components run in a single AWS account in an EU region.

This ADR is an **umbrella decision**: it fixes the vendor, the region, and a small set of baseline platform conventions. Concrete service picks are split into their own ADRs so each can be revisited independently.

1. **Region.** `eu-central-1` (Frankfurt) as the home region. All services pinned to EU regions; no cross-region replication outside the EU. Backups stay in `eu-central-1` or a second EU region if disaster recovery requires it.

2. **Database.** Picked in **ADR 0004** (PostgreSQL on RDS).

3. **Compute for the Express app and ingress.** Picked in **ADR 0005** (ECS Fargate behind an ALB, with CloudFront in front).

4. **Internal API shape.** Picked in **ADR 0006** (REST/JSON).

5. **Static assets and media.** **S3** for the built SPA and for user-uploaded media (news hero images, sponsor logos, Vorstand portraits). **CloudFront** in front of both, with cache invalidation issued by the backend on publish.

6. **Secrets.** **AWS Secrets Manager** (already in use for `IG_ACCESS_TOKEN`) extended to hold the database URL, session signing secret, SES credentials, and any future admin integrations. Rotation enabled where services support it.

7. **Email.** **Amazon SES** for the contact-form router (`specs/planned/contact-form.md`), admin auto-acks, password resets, and anomaly emails (`specs/planned/admin-auth.md`). Domain verified for `svthalexweiler.de` with SPF, DKIM, and DMARC records published.

8. **Scheduled jobs.** **EventBridge Scheduler → Lambda** for the IG token refresher, the SFV scrape (if that path is chosen — see `adr/0003-architecture-backlog.md` B2), and housekeeping jobs (audit-log pruning, soft-delete purges).

9. **Identity and access.**
   - All human access via IAM Identity Center (SSO); no long-lived IAM user keys for humans.
   - Application roles via IAM with least-privilege policies.
   - GitHub Actions deploys via **OIDC** federation into a narrowly-scoped deploy role; no long-lived AWS access keys in GitHub secrets.

10. **Observability.** **CloudWatch Logs** for application and access logs with 30-day retention by default. **CloudWatch Alarms** on the ALB, RDS, and Lambda error rates emailing the infrastructure owner. No third-party APM initially.

11. **Infrastructure as Code.** Everything defined in **Terraform** under the existing `infrastructure/` directory. Remote state in S3 with DynamoDB lock table (standard pattern). No click-ops in the console for permanent resources; exceptions documented in-commit.

## Alternatives considered

- **Hetzner Cloud (or a German VPS provider) end-to-end.** Cheaper by an order of magnitude, DSGVO-friendly by default. Rejected: the existing AWS commitment (S3/CloudFront/Lambda/Secrets Manager/IAM) is already load-bearing via the IG token pipeline; relocating it for cost savings of ~20 EUR/month is not worth the operational churn for a volunteer-run project.
- **Cloudflare (Workers, R2, D1) + Hetzner.** Attractive edge-first architecture. Rejected: introduces a second vendor account, a second billing relationship, and a second IAM model on top of the AWS one we already maintain. The club's operational budget is measured in hours of volunteer attention, not euros.
- **On-prem / single VPS for everything.** The current arrangement before AWS was added. Rejected: manual TLS, no managed database backups, no secrets rotation, manual patching — the volunteer footprint is already too thin to run this well.
- **Azure / GCP.** No existing footprint, no offsetting reason to introduce.

## Consequences

### Positive

- Single pane of glass: one AWS account, one billing relationship, one IAM model, one Terraform state.
- Reuses infrastructure already committed and working (S3, CloudFront, Lambda, Secrets Manager, GitHub Actions OIDC).
- DSGVO posture is defensible: EU region, documented sub-processor (Amazon Web Services EMEA SARL), encryption in transit and at rest, auditable access.
- All services needed by `specs/planned/*` (database, object storage, email, secrets, schedules, auth anchor) are available without onboarding a new provider.
- Disaster recovery story is concrete: RDS snapshots + S3 versioning + Terraform in Git + GitHub Actions deploy = reproducible rebuild.

### Negative / Costs

- Base monthly cost rises compared to a VPS. The service-level breakdown lives in ADR 0004 (DB) and ADR 0005 (compute + ingress); realistic baseline lands in the ~50 EUR/month range before traffic, versus ~5–10 EUR/month on a VPS. The Vorstand approves this as the cost of reliability and compliance.
- One-vendor lock-in. Accepted trade-off. The abstraction boundary is kept at the application level (plain Postgres, plain HTTP, plain S3) so a future exit remains tractable.
- The infrastructure owner must maintain AWS literacy (IAM, KMS, VPC networking, CloudWatch). No team redundancy; handover documentation is a follow-up.
- Cost guardrails are required from day one: AWS Budgets with an email alert at 75% of a 100 EUR/month threshold, so a misconfigured Lambda or a data-transfer spike does not produce a surprise invoice.

### DSGVO / legal

- Data Processing Agreement with AWS (the GDPR DPA) accepted at the account level; documented in the club's record of processing activities.
- All personal data (Vorstand PII, admin accounts, audit logs, contact-form messages, logs) stored in `eu-central-1` or another EU region; no cross-border replication.
- KMS-managed encryption at rest on RDS, S3 (SSE-KMS), and Secrets Manager.
- Server access logs (CloudFront, ALB) retained 30 days, then auto-expired, to minimize log-side PII exposure.

## Follow-ups

- Terraform modules reorganized so `infrastructure/` has clear per-domain subfolders (`network/`, `compute/`, `db/`, `cdn/`, `email/`, `ci/`).
- AWS Budgets + CloudWatch alarms set up before any new service is deployed.
- IAM Identity Center rollout for the infrastructure owner (and any future co-maintainer) to eliminate any remaining long-lived IAM user keys.
- Handover documentation so a second maintainer could take over without shoulder-surfing.
