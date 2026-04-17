# ADR 0008 — Single EC2 instance with Traefik for the Express app

- **Status:** Accepted
- **Date:** 2026-04-17
- **Deciders:** Yannik Zeyer.
- **Supersedes:** ADR 0005
- **Superseded by:** none
- **Related:** ADR 0002 (AWS as infrastructure), ADR 0007 (SQLite on EBS).

## Context

ADR 0005 committed to ECS Fargate behind an Application Load Balancer, with CloudFront in front. Re-examining the workload before the admin UI is scheduled made the topology look oversized:

- Traffic is a club site's: hundreds of requests a day, matchday and festival spikes that are comfortably within a single small instance.
- ADR 0007 moved the datastore to SQLite on a local EBS volume. A single-writer, in-process database pins the app to a single node anyway — running multiple Fargate tasks against it would be unsafe, not an improvement.
- The ALB was the single biggest line item in the Fargate topology (~18 EUR/month before traffic), buying load balancing the site does not need.
- The existing production setup already runs Docker + Traefik on a single host with Let's Encrypt. That pattern works, the operator knows it, and it survives a minor incident without paging anyone.

Keeping Fargate + ALB was defensible when ADR 0004 assumed a separate RDS; with SQLite local to the app, the multi-task story collapses.

## Decision

**One Amazon EC2 instance** runs the Docker + Traefik + Express stack. No Fargate, no ALB, no CloudFront in the MVP path.

1. **Compute.** One EC2 instance in `eu-central-1`. Start with `t4g.small` (2 vCPU ARM, 2 GB RAM). Resize vertically if the signal ever shows up.
2. **Storage.** A single EBS gp3 root volume (20 GB to start), default-encrypted. Holds the OS, Docker images, the SQLite file (per ADR 0007), and any admin-uploaded media.
3. **Ingress.** Traefik v3 terminates TLS using Let's Encrypt (ACME HTTP-01). The instance has a public Elastic IP; DNS points at it directly. No ALB, no CloudFront, no ACM.
4. **Process model.** `docker compose up -d` with the Express app container plus Traefik. Systemd unit restarts Docker on reboot.
5. **Deploys.** GitHub Actions builds the image and pushes to GHCR or ECR on merge to `main`; a small deploy step SSHes (via OIDC-issued short-lived SSM session, not a static key) to the instance and runs `docker compose pull && docker compose up -d`. Brief (<10 s) connection blip at release is acceptable.
6. **Backups.** SQLite weekly snapshot to S3 is specified in ADR 0007. EBS daily snapshots via Data Lifecycle Manager provide a secondary safety net for the whole volume, including uploaded media.
7. **Observability.** CloudWatch agent on the instance for CPU, memory, disk, and Docker-container metrics. App logs go to a Docker logging driver that writes to CloudWatch Logs with 30-day retention.

## Alternatives considered

- **ECS Fargate behind an ALB (ADR 0005).** Superseded. Load balancing across multiple tasks is incompatible with the SQLite-on-local-volume decision in ADR 0007, and the ALB cost is not redeemable at this scale.
- **AWS Lightsail.** Simpler pricing, bundled transfer, same single-VPS shape. Rejected for cohesion with the rest of the AWS footprint (IAM, S3, Secrets Manager already in `eu-central-1`); EC2 costs within a few EUR of Lightsail once the VPS is sized the same.
- **Fly.io / Hetzner / other non-AWS VPS.** Cheaper. Rejected to keep ADR 0002's "AWS is the sole cloud" invariant; the small saving does not justify a second vendor.
- **Keep CloudFront in front of the instance.** Rejected for the MVP: with Let's Encrypt already solving TLS and traffic well within a small EC2, CloudFront is cost and complexity without a clear win. Can be bolted on later if a specific performance or DDoS need appears.
- **Two EC2 instances behind Route 53 weighted records.** Rejected: doesn't actually give HA because SQLite pins the write path to one node. Would trade a real cost for a false availability story.

## Consequences

### Positive

- Lowest viable AWS footprint: one EC2, one EBS, one S3 bucket, one Elastic IP.
- Retains the current Traefik + Let's Encrypt deploy pattern the operator already knows.
- Matches ADR 0007's single-writer datastore: the app and its database are co-located, which is what SQLite wants.
- Running cost is ~10–15 EUR/month (instance + EBS + IP + occasional S3), flat.
- Restore drill is straightforward: launch a fresh instance from the latest EBS snapshot, or re-deploy + restore the weekly SQLite snapshot.

### Negative / Costs

- **No horizontal scale.** Vertical resize only. If the club ever needs more, the path is bigger instance → rethink datastore → rethink topology, in that order.
- **Brief downtime on deploy.** Docker Compose restart is seconds, not sub-second. Acceptable given the audience and frequency.
- **Patching the OS is back on the operator.** Weekly `apt upgrade` cron with unattended-upgrades for security patches; documented in the runbook. This was the main reason ADR 0005 picked Fargate — accepting the cost in exchange for everything else this ADR simplifies.
- **Single point of failure.** Instance loss means downtime until a replacement is launched and the latest snapshot restored. Acceptable RTO for a club site; not acceptable for anything else, and that's why this topology is scoped to this project.

### DSGVO / legal

- All compute and storage in `eu-central-1`.
- EBS, S3, and CloudWatch Logs default-encrypted.
- CloudWatch Logs retention 30 days per ADR 0002.
- TLS terminates at Traefik; internal hops on the instance are loopback.

## Follow-ups

- Stand up the instance via Terraform in `infrastructure/`. Include the Elastic IP, security group (80/443 from the internet, 22 only from the operator's CIDR via SSM by preference), and Data Lifecycle Manager for EBS snapshots.
- Write the OS-patching runbook (unattended-upgrades config, manual reboot window) alongside the backup/restore runbook from ADR 0007.
- Add a `/healthz` endpoint to the Express app that Traefik and CloudWatch can probe.
- Revisit CloudFront if a real latency complaint or traffic spike appears. Leave the decision on the table, not pre-answered.
