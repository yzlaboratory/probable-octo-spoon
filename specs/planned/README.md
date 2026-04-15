# Planned specs

Prose-style scenarios for features the site does not yet have.

## Audience

A "visitor" in these specs is anyone using the feature — including admins using the admin area. The public site has public visitors; the admin area has admin visitors. Both get scenarios written the same way.

## Fixed shape

Each file follows the same structure so a reader can cold-read any one of them:

1. **The visitor scenario** — what a real person would do, end to end.
2. **MVP** — the smallest set of behaviors that satisfies the scenario.
3. **Could ship later** — stack-ranked follow-ups, *not* requirements.
4. **Open questions** — what is unknown and gates the work.
5. **What it does not do** — explicit scope cuts.

## Where architecture lives

Implementation mechanics — storage schema, editor library, session model, rate-limit numbers, image pipeline, audit-log schema, structured-data emission, security headers — do **not** appear in these specs. They live in `adr/`:

- Committed decisions go in a dedicated ADR (`adr/0001-…`, `adr/0004-…`, etc.).
- Open architectural questions live in `adr/0003-architecture-backlog.md` until the feature is scheduled, then graduate into their own ADR.

Specs link to the backlog entry or ADR by number, but do not duplicate the mechanics. If a planned spec needs to say "the hashing algorithm belongs in an ADR," the link is enough — a whole paragraph is not.

## Conventions

- One scenario per file. Readable cold, without the others.
- Generic personas (a parent, a villager, a sponsor). No real names, phone numbers, or email addresses.
- Live content (news lists, sponsor rosters, board members) is never duplicated here — the code is the source of truth.
- "Status" callouts at the top state whether the feature is unimplemented, partially implemented, or a remediation of existing behavior.
