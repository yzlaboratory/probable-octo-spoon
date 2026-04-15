# ADR 0006 — REST/JSON for the internal API surface

- **Status:** Accepted
- **Date:** 2026-04-15
- **Deciders:** Yannik Zeyer.
- **Supersedes:** none
- **Superseded by:** none
- **Related:** ADR 0001 (migrate hardcoded data to a database), ADR 0005 (compute topology).

## Context

ADR 0001 commits to serving all content through a CRUD backend. That backend has two kinds of consumers:

1. The **public SPA** — fetches news, sponsors, Vorstand, legal text, training times. Reads only.
2. The **admin SPA** — full CRUD on the same resources plus auth and audit-log reads.

Both consumers are first-party, written in TypeScript, shipped from the same repo, and served from the same origin. There is no third-party API consumer on the roadmap.

## Decision

The backend exposes a **plain REST/JSON** API under `/api/*`, following conventional resource-verb mapping (`GET /api/news`, `POST /api/news`, `PATCH /api/news/:id`, `DELETE /api/news/:id`). Error responses follow a small shared envelope with `code`, `message`, and optional `fields` for validation errors.

1. Content type is `application/json` on both sides.
2. Resource URLs use kebab-case plural nouns (`/api/vorstand`, `/api/sponsors`, `/api/news`, `/api/legal-texts`).
3. Write endpoints accept exactly the fields they change. Partial updates use `PATCH`.
4. Public read endpoints are unauthenticated and cacheable at CloudFront. Write endpoints require an admin session and are never cached.
5. List endpoints support simple `?status=` / `?limit=` / `?cursor=` query params only when a real call site needs them — not pre-emptively.
6. Types are defined once in a shared `types/` module consumed by both server and clients. No runtime RPC codegen.

## Alternatives considered

- **tRPC.** End-to-end typesafe, ergonomic for a single-repo TypeScript stack. Rejected, but barely: it ties the public API to a TypeScript client, which is fine today but closes the door on a future mobile app, a simple curl-based admin script, or a third-party integration. The marginal ergonomic win over typed REST (with a shared `types/` module) does not justify the lock-in for a site whose API will be read once and written to by a handful of admins.
- **GraphQL.** Rejected: the resource graph is shallow (news, sponsors, Vorstand, legal, training — almost no joins on the read path), the audience is one admin UI, and the operational cost of query complexity analysis, persisted queries, and caching at CloudFront is pure overhead for this workload.
- **Server Actions / RPC-style endpoints.** Rejected: we are not on a framework that makes this natural (Vite + React, not Next/Remix). Plain REST plus a shared types module gets the same ergonomic benefit without framework lock-in.

## Consequences

### Positive

- Any HTTP client works. `curl` is a first-class debugging tool.
- CloudFront caches public `GET`s by URL with no special configuration.
- Failure modes are the HTTP ones — status codes, idempotency semantics — not a custom transport layer.
- A future non-TypeScript consumer (an operator script, a mobile app, a partner integration) does not require a rewrite.

### Negative / Costs

- Manual keep-in-sync between server validation and client types. Mitigated by the shared `types/` module and a strict "types live in one file per resource" rule.
- No built-in batching. Expected to never matter at this scale; if it does, the escape hatch is a custom aggregate endpoint, not swapping to GraphQL.
- Pagination and filtering must be designed per-endpoint if they appear. Accepted cost of not pre-building query primitives.

## Follow-ups

- Write a short style guide in the backend README: URL conventions, error envelope, auth header placement, pagination shape. One page.
- Decide request validation library at backend landing time (zod is the obvious default). Small ADR or a README note.
- Put the shared `types/` module in `src/` until a separate package is justified. Do not publish to npm for internal use only.
