# Mobile sponsor visibility (planned fix)

> **Status:** remediation, not a net-new feature.

## The problem

On a phone, the news and socials galleries show one card at a time, and the sponsor rotator currently sits a few cards in. Most mobile visitors read one or two cards and leave — meaning they often finish a session without ever seeing a sponsor logo at a useful size. The footer sponsor grid is a fallback, but it's small and only encountered after a full scroll.

Sponsors are paying to be seen. On mobile, they largely aren't.

## What the visitor experiences after the fix

A villager opens the site on their phone to check whether there's news. Within the first card they swipe to, a sponsor logo is visible and legible — not buried at index 3 or 4. By the time they close the tab, they have been exposed to two or three sponsor impressions at a comfortable size.

That is the whole user-facing change. The visitor has nothing to learn, no setting to flip, and no banner to dismiss.

## MVP — ship first, measure

Move the sponsor rotator forward in the news and socials galleries on phone widths only, so it lands within the first card or two a mobile visitor can swipe to. On desktop the rotator stays where it is — wider screens already show several cards plus the rotator together.

That single change is the MVP. It is reversible, has no new infrastructure, and either improves the situation or it doesn't.

To know which, capture a baseline first: a couple of weeks of "current state" sponsor impression rates against the same metric after the change. Without the baseline this becomes a vibes-based decision.

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

- Is the current "sponsor at index 3 in news, index 4 in socials" choice load-bearing for desktop, or did it inherit those positions from an earlier desktop-first layout? (If the latter, moving it on mobile is even cheaper.)
- What is the smallest passive measurement we can do without introducing client-side tracking? Server-side rendering could log "rotator slot N reached" for the visible window without touching the browser.

## Architecture and instrumentation

Specific endpoint shapes, tracking payloads, UTM conventions, rate-limit policies, and the session-frequency cap all belong in their own ADR if and when the persistent band or the impression counters move from "could ship later" to "shipping now."
