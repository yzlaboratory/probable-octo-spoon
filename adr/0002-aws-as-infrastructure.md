# ADR 0002 — Use AWS as the primary cloud infrastructure

- **Status:** Accepted
- **Date:** 2026-04-15
- **Deciders:** Yannik Zeyer (infrastructure owner), Vorstand (budget approval)
- **Supersedes:** none
- **Superseded by:** none
- **Related:** ADR 0001 (database migration) — depends on the hosting platform chosen here.

## Context

The project already carries partial AWS footprint committed in `infrastructure/`:

- Terraform stack for **S3** (static asset storage), **CloudFront** (CDN/TLS), **API Gateway**, and a **Lambda** that refreshes the long-lived Instagram access token into **AWS Secrets Manager** on a schedule.
- **GitHub Actions** CI/CD (Node.js 24) already wired to deploy into this account.
- The production container (Express + built SPA) runs behind a **Traefik v3.3** reverse proxy with Let's Encrypt certificates; today this container lives on a self-managed host, not yet in AWS.

Pressures that forced a decision now:

- ADR 0001 commits to a managed database and a mutable data layer. A hosting platform has to be named before the schema and backend work can land.
- The planned admin surface (admin-auth, admin-news-editor, admin-sponsor-editor, admin-vorstand-editor) needs durable storage, object storage for media, and a secrets store — all of which AWS already partially provides in this account.
- DSGVO obligations (Vorstand PII, admin accounts, audit log) require EU-resident hosting with documented data-processing agreements.
- The infrastructure owner is one person. Operational complexity must stay low. Multi-cloud is not an option.

## Decision

AWS is the primary (and effectively sole) cloud infrastructure provider for this project. All new server-side components — database, backend API, admin UI hosting, media storage, authentication, logging, secrets, scheduled jobs — run in a single AWS account in an EU region.

Specific platform choices:

1. **Region.** `eu-central-1` (Frankfurt) as the home region. All services pinned to EU regions; no cross-region replication outside the EU. Backups stay in `eu-central-1` or a second EU region if disaster recovery requires it.

2. **Compute for the Express app.**
   - Short term: keep the existing Docker container, but move the host into AWS. Either **ECS Fargate** (one small task, ALB in front) or a single **EC2 t4g.small** behind CloudFront. Default plan is ECS Fargate for less host-patching burden.
   - The Traefik reverse proxy is retained only if the VPS stays; once on Fargate, an **Application Load Balancer** with ACM certificates replaces it.

3. **Static assets and media.** **S3** for the built SPA and for user-uploaded media (news hero images, sponsor logos, Vorstand portraits). **CloudFront** in front of both, with cache invalidation issued by the backend on publish.

4. **Database (per ADR 0001).** **Amazon RDS for PostgreSQL** (smallest viable instance, single AZ to start, Multi-AZ before the admin UI goes live) with automated daily snapshots retained 14 days, point-in-time recovery enabled, and encryption at rest via KMS.

5. **Secrets.** **AWS Secrets Manager** (already in use for `IG_ACCESS_TOKEN`) extended to hold the database URL, session signing secret, SES credentials, and any future admin integrations. Rotation enabled where services support it.

6. **Email.** **Amazon SES** for the contact-form router (`specs/planned/contact-form.md`), admin auto-acks, password resets, and anomaly emails (`specs/planned/admin-auth.md`). Domain verified for `svthalexweiler.de` with SPF, DKIM, and DMARC records published.

7. **Scheduled jobs.** **EventBridge Scheduler → Lambda** for the IG token refresher, the SFV scrape (standings + fixtures), and housekeeping jobs (audit-log pruning, soft-delete purges).

8. **Identity and access.**
   - All human access via IAM Identity Center (SSO); no long-lived IAM user keys for humans.
   - Application roles via IAM with least-privilege policies.
   - GitHub Actions deploys via **OIDC** federation into a narrowly-scoped deploy role; no long-lived AWS access keys in GitHub secrets.

9. **Observability.** **CloudWatch Logs** for application and access logs with 30-day retention by default. **CloudWatch Alarms** on the ALB, RDS, and Lambda error rates emailing the infrastructure owner. No third-party APM initially.

10. **Infrastructure as Code.** Everything defined in **Terraform** under the existing `infrastructure/` directory. Remote state in S3 with DynamoDB lock table (standard pattern). No click-ops in the console for permanent resources; exceptions documented in-commit.

## Alternatives considered

- **Hetzner Cloud (or a German VPS provider) end-to-end.** Cheaper by an order of magnitude for a workload of this size, DSGVO-friendly by default. Rejected: the existing AWS commitment (S3/CloudFront/Lambda/Secrets Manager/IAM) is already load-bearing via the IG token pipeline; relocating it for cost savings of ~20 EUR/month is not worth the operational churn for a volunteer-run project.
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

- Base monthly cost rises compared to a VPS. Rough estimate: RDS `db.t4g.micro` (~15 EUR), ECS Fargate ~1 vCPU×0.5 GB (~10 EUR), ALB (~18 EUR), CloudFront + S3 + SES + CloudWatch (~5 EUR). Realistic baseline ~50 EUR/month before traffic, versus ~5–10 EUR/month on a VPS. The Vorstand approves this as the cost of reliability and compliance.
- ALB cost is the largest single line item. Revisit if traffic stays well below ALB break-even by dropping to CloudFront + Lambda URL or ECS-with-public-IP once usage is known.
- One-vendor lock-in. Accepted trade-off. The abstraction boundary is kept at the application level (plain Postgres, plain HTTP, plain S3) so a future exit remains tractable if ever needed.
- The infrastructure owner must maintain AWS literacy (IAM, KMS, VPC networking, CloudWatch). No team redundancy; handover documentation is a follow-up.
- Cost guardrails are required from day one: AWS Budgets with an email alert at 75% of a 100 EUR/month threshold, so a misconfigured Lambda or a data-transfer spike does not produce a surprise invoice.

### DSGVO / legal

- Data Processing Agreement with AWS (the GDPR DPA) accepted at the account level; documented in the club's record of processing activities.
- All personal data (Vorstand PII, admin accounts, audit logs, contact-form messages, logs) stored in `eu-central-1` or another EU region; no cross-border replication.
- KMS-managed encryption at rest on RDS, S3 (SSE-KMS), and Secrets Manager.
- Server access logs (CloudFront, ALB) retained 30 days, then auto-expired, to minimize log-side PII exposure.

## Follow-ups

- Separate ADR for the concrete compute topology (ECS Fargate vs. EC2 vs. App Runner vs. Lambda container).
- Separate ADR for the DB engine choice (Postgres assumed here, confirm against ADR 0001 migration plan).
- Terraform modules reorganized so `infrastructure/` has clear per-domain subfolders (`network/`, `compute/`, `db/`, `cdn/`, `email/`, `ci/`).
- AWS Budgets + CloudWatch alarms set up before any new service is deployed.
- IAM Identity Center rollout for the infrastructure owner (and any future co-maintainer) to eliminate any remaining long-lived IAM user keys.
- Cost review after the admin UI ships, to decide whether ALB is still the right ingress or whether a lighter alternative fits.
