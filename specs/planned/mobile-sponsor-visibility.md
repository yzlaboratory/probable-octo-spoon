# Mobile sponsor visibility (planned fix)

> **Status:** remediation, not a net-new feature.

## The problem

On a phone, the news and socials galleries show one card at a time, and the sponsor rotator currently sits a few cards in. Most mobile visitors read one or two cards and leave — meaning they often finish a session without ever seeing a sponsor logo at a useful size. The footer sponsor grid is a fallback, but it's small and only encountered after a full scroll.

Sponsors are paying to be seen. On mobile, they largely aren't.

## What the visitor experiences after the fix

A villager opens the site on their phone to check whether there's news. Within the first card they swipe to, a sponsor logo is visible and legible — not buried at index 3 or 4. By the time they close the tab, they have been exposed to two or three sponsor impressions at a comfortable size.

That is the whole user-facing change. The visitor has nothing to learn, no setting to flip, and no banner to dismiss.

## MVP — ship and trust the reasoning

Move the sponsor rotator forward in the news and socials galleries on phone widths only, so it lands within the first card or two a mobile visitor can swipe to. On desktop the rotator stays where it is — the desktop positions (index 3 in news, index 4 in socials) are treated as deliberate; wider screens already show several cards plus the rotator together, and changing them without need risks breaking the balance between "first few cards get read" and "rotator interrupts the scan."

That single change is the MVP. It is reversible, has no new infrastructure, and either improves the situation or it doesn't.

**No measurement in the MVP.** No baseline collection, no server-logged rotator-reached beacon, no third-party analytics. The change ships on reasoning alone. If renewal conversations later require sponsor-impression numbers, a server-side beacon becomes a follow-up — but it is not in scope here.

## Could ship later

Stack-ranked roughly by likely impact vs. risk:

1. **Larger footer sponsor tiles on phone**, with a single horizontal scroll instead of a wrap grid — turns the forgettable wrap into a deliberate "browse our sponsors" interaction.
2. **A persistent sponsor band below the header on phones**, auto-rotating, dismissible once per session. Higher sponsor impact, higher UX risk (it eats vertical space on every page). Decide only after the MVP results are in.
3. **Server-side impression and click counters**, so the Schatzmeister can show sponsors hard numbers at renewal — addresses a sales conversation, not a visitor problem.

Each of these ships independently. None should be bundled with the MVP.

## What this fix does not do

- No full-screen interstitial, modal, or popover.
- No tracking cookies, no third-party ad networks.
- No tier-based visual differentiation; all sponsors continue to share the same weighted shuffle.

## Open questions

None gating the MVP. Desktop positions are treated as load-bearing and are not moved. No impression measurement in the MVP — if sponsor reporting becomes a real ask later, a server-side beacon is the path to explore.

## Architecture and instrumentation

Tracked in `adr/0003-architecture-backlog.md` B5 (shared with `admin-sponsor-editor.md`).
