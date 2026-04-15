# Sponsor display

Sponsors are load-bearing for the club — they underwrite the facilities, the youth teams, the festivities. The site surfaces them in three distinct contexts with three different rotation rules, each tuned for what the section is already doing.

## Where sponsors appear

1. **Inside the News gallery**, as the fourth item (before the fourth news card).
2. **Inside the Socials gallery**, as the fifth item (before the fifth social card).
3. **In the Footer**, as a flat grid of logos.

## The weighted shuffle

Each sponsor in `src/utilities/sponsors.ts` has a numeric `money` field (currently all active sponsors are set to `50`). The shuffle function uses the exponential-key algorithm:

```ts
key = Math.random() ** (1 / money)
```

Sort by `key` descending. Sponsors with higher money have keys biased closer to 1, so they rise to the front on average — but the randomness guarantees that every sponsor has a chance at every slot. This means no sponsor feels "always buried" even if their tier is lower.

Currently all sponsors share `money: 50`, so the effective behavior is a uniform random shuffle. The weighting infrastructure is in place for the moment a higher-tier sponsor comes in.

## Rule 1: News section — top-tier only, big rotator

Inside the News gallery, `shuffleTopSponsors(8)` is called. It:

1. Sorts by `money` descending.
2. Takes the top 8.
3. Weighted-shuffles just those 8.

The resulting card is one wide rotator (25% of viewport on desktop) that auto-advances every **15 seconds**. A visitor lingering on the news section sees 4 distinct sponsors in a typical minute.

### Example

Maria reads the news cards for 30 seconds while deciding whether to tap Dreikampf. In that time, the rotator has cycled through two sponsors — a stuckateur and a Fliesenleger.

## Rule 2: Socials section — full roster, tighter rotation

Inside the Socials gallery, `shuffleSponsors()` is called with the full sponsor list. The card is narrower (20% of viewport) and auto-advances every **7.5 seconds** in the live state, or **5 seconds** during the skeleton fallback — so even during loading, sponsor impressions continue.

### Example

Thomas scrolls past the news, pauses at the socials to watch a carousel post, and during his 20-second pause the sponsor card has flipped through three sponsors.

## Rule 3: Footer — every sponsor, static grid

The Footer shuffles the full sponsor list once per render and displays every sponsor as a small tile in a wrap-flex grid. Sponsors whose `ImageUrl` is the fallback club logo (e.g. "Sandra Maione Friseursalon") are filtered out — they would collapse to the club's own crest and look wrong among third-party marks.

Tiles are 96px wide on mobile and auto-width on desktop, with a thin white border. Logos are dimmed — `grayscale` when the sponsor has `hasBackground: true` (their logo is already on a colored background), otherwise `brightness-0 invert` (flatten to pure white). This enforces a visually consistent sponsor row even though the real logos vary wildly in palette.

### Example: the walking tour

A visitor scrolls all the way to the bottom after reading an article. They see the full sponsor roster at a glance — about 16 local businesses. They recognize their neighbor's company (Bestattungen Giebel), their dentist's landlord (Reis & Wilhelm Fliesenleger), the café (Gasthaus Grohs-Thewes), and mentally note that "the sport club is embedded in the town."

## Commented-out sponsors

The source file carries a large history of commented-out sponsor entries (Allianz, BBL, Bikesport, Sporthaus Glaab, Holzhauser, Opticland, Reitenbach, Baustoffe Rosport, Saar-Mosel Baumaschinen, Gartenbau Waigel, Paulus & Korneker, Hermann). These are former or paused partnerships, preserved in-file rather than deleted so that the club can reactivate them quickly when a sponsorship renews.

## Click behavior

Every sponsor logo is an `<a>` to the sponsor's own website (or a TripAdvisor / local-directory page for businesses without their own site). These links are external and open in the same tab — the visitor trusts that they can use the back button. The links do not include `rel="noopener"` or a tracking UTM — clicks are not measured.

## What sponsor display does not do

- No sponsor detail pages ("About Getränke Falk") — only the logo and outbound link.
- No tier labels shown to visitors (Gold/Silver/Bronze). `money` is internal.
- No ad-server integration; sponsor rotation is entirely client-side.
- No impressions reporting back to sponsors.
