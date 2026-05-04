# ADR 0000 — Template

Copy this file to `NNNN-short-slug.md` when writing a new ADR. Keep the headings; replace everything else.

- **Status:** Proposed | Accepted | Deprecated | Superseded
- **Date:** YYYY-MM-DD
- **Deciders:** Named individuals. If "the Vorstand" signs off, still name the person actually making the call.
- **Supersedes:** ADR-XXXX (or `none`)
- **Superseded by:** ADR-XXXX (or `none`)
- **Related:** other ADRs this leans on or interacts with.

## Context

What forced a decision now. Prior state, constraints, pressures. Keep factual — no persuasion yet.

## Decision

The smallest, clearest statement of what was decided. One or two sentences, then numbered specifics if the decision has parts.

## Alternatives considered

Each alternative in one short paragraph: what it was, why it was rejected. Rejection reasons are load-bearing — they are why the chosen option survives re-reading a year later.

## Consequences

### Positive
Things that get easier because of this decision.

### Negative / Costs
Things that get harder, more expensive, or newly risky.

### DSGVO / legal
Only when relevant. Skip the heading otherwise.

## Follow-ups

Concrete work items this decision creates — but **not decisions this ADR dodged**. If something is still open, either decide it here or put it in `0003-architecture-backlog.md`. Don't leave it as "separate ADR coming."

## Conventions

- **Numbering.** Monotonic, zero-padded, never reused.
- **Status.** Proposed → Accepted at merge. An accepted ADR is not edited in place; a superseding ADR replaces it and both stay in the folder.
- **Scope.** One decision per ADR. If the body names three service choices, it's three ADRs.
- **Specs vs. ADRs.** Specs describe what a person experiences. ADRs describe why an implementation choice was made. If a paragraph fits in both, it belongs in the ADR.
