# Public training times (planned)

> **Status:** not implemented.

## What a visitor wants

A parent wondering whether their ten-year-old can try a training session, or an adult new to the village looking to stay fit, wants to know: **when does which group train, and is it open to visitors?**

## Where it lives

A section titled **TRAINING** placed after **VORSTAND** on the homepage — the board directory already funnels contact intent, and training times sit naturally next to that "how to get involved" moment. A deep-link `/training` also works for direct sharing.

## The layout: a weekly grid

A Monday-through-Sunday grid. Each cell shows the team/group training at that slot with:

- Group name (e.g. `A-Jugend`, `Erste Mannschaft`, `AH`, `Bambini`).
- Time window (`18:30 – 20:00`).
- Trainer name and phone (tap-to-call).
- A small **offen für Gäste / Anmeldung erforderlich / nur Mitglieder** pill that tells a newcomer at a glance whether they can just show up.

Empty cells render as a dim "–" so the grid's shape is always readable.

### Example: the curious parent

A mother of a 9-year-old sees an Instagram post about youth training, lands on the homepage, scrolls to the training grid. She sees **Dienstag 17:00 – 18:15 / Bambini / Trainer: [name] / offen für Gäste**. She shows up with her son next Tuesday at 17:00.

### Example: the hobby player

A 40-year-old who moved into the village wants to kick a ball with the Alte Herren. The grid shows **AH / Donnerstag 19:30 – 21:00 / Anmeldung erforderlich** with Holger Saar's phone. He calls first, introduces himself, then comes along the following Thursday.

## Data shape

Training entries are stored in the data layer alongside news and sponsors. Fields:

- `group` — display name.
- `weekday` — `1` (Monday) through `7` (Sunday).
- `startTime`, `endTime` — 24-hour HH:MM.
- `trainerName`, `trainerPhone`.
- `visitorPolicy` — one of `open`, `registration`, `members_only`.
- `location` — default is Sportplatz Alemaniastraße 21, override for winter-hall bookings.
- `validFrom`, `validTo` — optional date range so seasonal schedule changes can be staged.

The source lives in `src/data/training.json` initially, later editable via the admin UI (see `planned/admin-*.md`).

## Seasonal variants

In the winter months the outdoor pitch is unusable and some groups move to Don-Bosco-Halle. The `validFrom`/`validTo` fields let two versions of the same slot coexist. The homepage shows whichever entry is active for today's date.

## Closed-period handling

Summer break (typically 6 weeks) and winter break should be announceable without deleting every entry. A global `trainingPause` field with start/end dates, when present, renders a banner above the grid: *"Sommerpause bis 12.08. – ab dann läuft der normale Trainingsbetrieb wieder."*

## Responsive behavior

- **Desktop**: 7-column weekly grid.
- **Mobile**: stacked day-by-day, each day a collapsed accordion by default, with today expanded on load.

## Cross-cutting polish

- **ICS per group** — `/api/training/:group.ics` generates a recurring iCalendar event so a parent can subscribe their child's group to the family calendar and inherit cancellations and venue changes automatically.
- **One-off cancellations** — admins can post a single-session cancellation ("Training heute Abend fällt aus – Gewitter") that renders above the relevant cell for the next 6 hours, fires an ICS `EXDATE` for subscribers, and (for opt-in push subscribers) sends a notification.
- **Weather hint (optional)** — when Open-Meteo reports heavy rain during a slot's window, a small cloud icon appears next to the time as a non-authoritative hint. Not an automatic cancellation.
- **Structured data** — Schema.org `SportsActivityLocation` with weekly schedules for local-SEO discoverability.
- **First-time visitor block** — a persistent helper near the grid: "Erstes Mal dabei? Sportzeug, Hallenschuhe, Getränk mitbringen. Probetraining kostenlos."
- **Accessibility** — alongside the grid, an equivalent list-style view for screen readers. Each slot is a focusable region with a complete `aria-label` ("Dienstag 17:00 bis 18:15, Bambini, Trainer X, offen für Gäste"). Reduced-motion disables accordion animations.
- **Analytics** — ICS downloads, cancellation views, group-filter usage counted cookielessly.

## What it does not do

- No self-service registration flow (no sign-up form). Contact is phone/email only for now.
- No attendance tracking.
- No match-preparation plans shared publicly.
