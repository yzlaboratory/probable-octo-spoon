# Mobile sponsor visibility (planned fix)

> **Status:** existing behavior underserves sponsors on phones. This is a remediation spec, not a net-new feature.

## The problem today

On a phone, the News and Socials galleries render one card at a 90%-viewport width. The sponsor rotator sits at index 3 in news (and index 4 in socials), which means it's only visible when the visitor has swiped past the first three news items — and in practice most mobile visitors read one or two cards and leave. Sponsors are paying to be seen; on mobile, they largely aren't.

The Footer sponsor grid does render every sponsor, but on mobile it's 96px tiles — small, dim, and only encountered after the visitor scrolls to the very bottom.

Net effect: a mobile visitor can realistically finish a session without a clean sponsor impression.

## What a sponsor expects

Three to five sponsor impressions per mobile session, not zero. Each impression should be large enough that the logo is legible without zooming. Sponsors do not expect parity with desktop — they expect fair representation.

## The fix: always-visible rotator band

A new always-visible sponsor band is introduced **just below the header** on mobile only. On screens <lg (1024px) the band is a sticky sub-header element: full viewport width, 64px tall, dark translucent background (`#121212` @ 85% with a subtle backdrop blur). Inside the band, a single sponsor logo is shown at any time, auto-rotating every 7 seconds through the weighted-shuffle order.

The band is dismissible once per session with a small `×` at the right edge — if the visitor closes it, it stays closed until they reopen the site. (Closing is a courtesy; most users won't.)

On desktop the band does not render — desktop visitors already see the in-gallery rotators at comfortable size.

### Example: the 15-second visitor

A villager opens the site on their phone to check if there's a news update, scrolls once to see the top card, sees nothing new, and closes the tab. During those 15 seconds they were exposed to two sponsor logos in the sticky band, above the fold, unmissable.

## The fix: in-gallery rotator moves up

The sponsor card in the News gallery moves from index 3 to index 1 (second slot), so any mobile visitor who swipes even once lands on it. The Socials gallery sponsor similarly moves from index 4 to index 2.

This is a tradeoff against the desktop view, where visitors see four news cards at once and the sponsor-at-index-3 still lands in the first visible batch. Moving to index 1 on desktop would push the fourth news card out of the initial view. Solution: make the index responsive — `1` on `<lg`, `3` on `≥lg`. The weighted-shuffle order is unaffected.

## The fix: footer sponsor tiles grow

Mobile footer tiles grow from 96px to 140px wide, single-row horizontal scroll instead of wrap-flex. This gives every sponsor a readable tile at the cost of requiring a horizontal swipe — but it turns a forgettable wrapped grid into a deliberate "browse our sponsors" interaction.

## Accessibility and performance

- The sticky band uses `prefers-reduced-motion` to disable the auto-rotation for users with that setting (the first sponsor stays in place).
- Logos in the band are lazy-loaded with width/height reserved to prevent CLS.
- All sticky-band logos are still links to the sponsor's site with descriptive `alt` text.

## Measurement

Add a simple impression counter (server-side, privacy-respecting, no third-party analytics): when the band's auto-rotation advances, a `POST /api/sponsor-impression` fires with the sponsor id. Aggregated counts surface in the admin dashboard (see `planned/admin-sponsor-editor.md`). This lets the board show sponsors actual impression numbers at the end of the year.

## Cross-cutting polish

- **UTM tagging** — every outbound sponsor click is appended with `?utm_source=svthalexweiler&utm_medium=website&utm_campaign=sponsor-rotator&utm_content={sponsor-slug}` so sponsors running their own analytics see the traffic cleanly attributed.
- **Click tracking** — `/api/sponsor-click` logs clicks server-side (sponsor id, timestamp, user-agent family). Aggregate only; no cookies, no PII.
- **Consent posture** — impression and click tracking are aggregate server-side counters, which fall outside TTDSG/§25 cookie-consent scope. No banner required.
- **Frequency cap** — the same sponsor is not shown twice in the sticky band within one session, preventing a "single logo spam" experience.
- **Accessibility** — `prefers-reduced-motion: reduce` disables auto-rotation; each logo has an `aria-label` naming the sponsor; reserved width/height prevents layout shift; sticky band can be dismissed via keyboard.
- **A/B baseline** — before rolling out the sticky band, a two-week baseline captures impressions, click-through, and bounce rate on the existing layout so the impact is measurable rather than vibes-based.
- **Defense-in-depth** — rate-limit on `/api/sponsor-click` and `/api/sponsor-impression` (100 req/min/IP) prevents a malicious actor from inflating a sponsor's counts.

## What this fix does not do

- It does not add a full-screen interstitial, modal, or dismissible popover. The band is passive.
- It does not introduce tracking cookies or third-party ad networks.
- It does not differentiate by sponsor tier visually — the band treats every sponsor equally; weighting is still entirely via the `money`-biased shuffle order.
