# ADR 0005 — ECS Fargate behind an Application Load Balancer for the Express app

- **Status:** Accepted
- **Date:** 2026-04-15
- **Deciders:** Yannik Zeyer (infrastructure owner), with Vorstand budget sign-off.
- **Supersedes:** none
- **Superseded by:** none
- **Related:** ADR 0002 (AWS as infrastructure), ADR 0001 (database migration).

## Context

The production runtime today is the Express app in `server.mjs`, which serves the built SPA and proxies `/api/instagram`. It runs in Docker behind Traefik on a self-managed host. ADR 0002 moves the host into AWS; this ADR picks the concrete compute topology.

Constraints:

- A single operator maintains the infrastructure. Host patching, kernel updates, and Docker daemon upkeep are time the operator does not have.
- Traffic is low: a club site, hundreds of requests a day, spikes around matchdays and festival announcements. Sub-second cold starts are not required.
- Outbound calls include the Instagram Graph API and (after ADR 0001) the database in the same VPC.
- The admin area, once it lands, requires a stable long-lived session handler — not a pure function-per-request model.

## Decision

**Amazon ECS on Fargate**, with one service and one or two tasks, fronted by an **Application Load Balancer** terminating TLS via ACM. CloudFront sits in front of the ALB for public read paths.

1. **Compute.** One ECS service, one task definition, starting at 1 task × 0.25 vCPU × 0.5 GB. Scales to 2 tasks on CPU > 60% sustained.
2. **Ingress.** Application Load Balancer with an ACM certificate for `svthalexweiler.de` and `www.svthalexweiler.de`. HTTP → HTTPS redirect at the ALB.
3. **CDN.** CloudFront distribution in front of the ALB. Long TTLs on static asset paths, short/zero TTL on `/api/*`. Cache invalidations issued by the backend on admin publishes.
4. **Traefik retires** once traffic cuts over to the ALB. Let's Encrypt is replaced by ACM.
5. **Networking.** Tasks run in private subnets in the existing VPC, egress via a single NAT gateway. Only the ALB has a public IP.
6. **Image registry.** Amazon ECR for the app image. GitHub Actions pushes on merge to `main` via OIDC (per ADR 0002).

## Alternatives considered

- **EC2 `t4g.small` with Docker Compose.** Cheapest AWS option (~5 EUR/month plus EBS). Rejected: puts host patching back on the operator, which is the pain we are trying to escape. The cost delta vs. Fargate is smaller than an hour of volunteer time per month.
- **AWS App Runner.** Simplest deployment model. Rejected: opaque networking made it awkward to reach RDS in a private subnet without extra VPC-connector setup, and the per-request pricing is not obviously cheaper at this scale.
- **Lambda container behind a Function URL or API Gateway.** Cheapest at idle. Rejected: the app holds sessions, serves the SPA's static assets, and calls Instagram synchronously on request; a long-running container fits the model better than per-request functions. Cold-start UX on a volunteer site is also not worth debating.
- **ECS on EC2.** Rejected: all the Fargate work *plus* the EC2 patching work. No upside for this scale.

## Consequences

### Positive

- No host to patch. Fargate handles the underlying instance; the operator owns the container image and task definition.
- Horizontal scale is a numeric change, not a capacity-planning exercise.
- ALB + ACM + CloudFront is the well-trodden AWS path. Nothing bespoke.
- VPC-local access to RDS (ADR 0004) is straightforward.

### Negative / Costs

- **ALB is the largest single line item** — roughly 18 EUR/month before traffic, versus zero on a VPS. This is the single biggest cost increase from the VPS baseline.
- One NAT gateway is ~30 EUR/month if kept always-on with RDS reachable from tasks. Consider a VPC endpoint for S3/ECR to trim data-transfer costs.
- Fargate idle cost continues during quiet weeks. Not refundable.
- Deploys cycle tasks; brief (~30s) connection draining is expected at each release. Acceptable for this audience.

### DSGVO / legal

- All compute in `eu-central-1`. ALB and CloudWatch logs stay in the same region; 30-day log retention per ADR 0002.
- TLS everywhere: ACM at the ALB edge, CloudFront-to-ALB over TLS, app-to-RDS over TLS.

## Follow-ups

- Decide on NAT alternatives (VPC endpoints for S3/ECR/Secrets Manager/CloudWatch Logs) to cut data-transfer cost before it matters.
- Health-check path in the Express app (`/healthz`) plus a task stop-timeout tuned for graceful drain.
- Revisit ingress cost after six months of traffic data. If ALB is still overkill, the escape hatch is CloudFront → Fargate via a Lambda URL or a single-task public IP — explicitly on the table.
- Blue/green deploy via CodeDeploy is a nice-to-have, not an MVP requirement; Fargate rolling updates are fine to start.
