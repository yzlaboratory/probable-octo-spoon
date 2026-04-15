# Public training times (planned)

> **Status:** not implemented.

## What a visitor wants

A parent wondering whether their ten-year-old can try a training session, or an adult new to the village looking to stay fit, wants to know: **when does which group train, and is it open to visitors?**

Today, that information lives only inside Vorstand members' heads, in WhatsApp groups, and on a paper noticeboard at the clubhouse. A first-time visitor cannot answer the question without already knowing someone.

## The visitor scenario

A parent of a nine-year-old sees an Instagram post about youth training, lands on the homepage, and scrolls to a section called **TRAINING**. They see a weekly grid: each row a day, each cell a group. The Bambini cell on Tuesday afternoon names the trainer, the time, and a small label that says "open to visitors." They show up the following Tuesday with their child.

That's the entire flow. No login, no signup, no calendar subscription required.

## MVP

- A new section **TRAINING** on the homepage, after VORSTAND, plus a deep-link route `/training`.
- A weekly grid showing, per slot: group name, time window, trainer name + phone (tap-to-call), and a visibility label — **offen für Gäste** / **Anmeldung erforderlich** / **nur Mitglieder**.
- An admin-editable data source, so a coaching change does not require a deploy. (Depends on the admin area.)
- A simple seasonal banner — "Sommerpause bis [date]" — controllable by the same admin.

That is enough to answer the visitor's question. If the data source can't be admin-editable yet, ship it as a hardcoded list and treat that as a temporary state — but do not ship it as the long-term shape.

## Could ship later

In rough order of incremental value:

1. **One-off cancellation overlays** ("Training fällt heute aus — Gewitter") — most valuable feature beyond the static grid, and the one a coach will actually ask for.
2. **iCalendar feed** so a parent can subscribe their child's group to the family calendar.
3. **Mobile collapse to per-day accordions**, today expanded — only if user testing shows the desktop grid is hard to read on phones.
4. **Per-slot trainer photo or "first time visiting?" expanded help block.**
5. **Weather hint or push-notification cancellations** — speculative; probably never.

## Seasonal handling

Trainings move around twice a year (winter pitch closures, summer break). The data shape needs to support either a date range per slot or a season toggle. Settle on one approach in an ADR — both work; mixing them is what hurts.

## Open questions

- Who maintains this? If the answer is "the trainers themselves," they need their own login and a UI scoped to their group only. If the answer is "one admin types it in once a year," the MVP admin UI is enough.
- Is the AH evening session "open to visitors" or "registration required" by club policy? The grid only works if the labels are accurate; the spec needs the Vorstand's input here.

## Architecture

Tracked in `adr/0003-architecture-backlog.md` B7.

## What it does not do

- No self-service registration or sign-up form.
- No attendance tracking.
- No publicly shared match-prep plans.
