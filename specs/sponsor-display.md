# Sponsor display

Sponsors are load-bearing for the club — they underwrite the facilities, the youth teams, the festivities. The site surfaces them in three distinct contexts with three different rotation rhythms, each tuned to what the section around it is already doing.

## Where sponsors appear

1. **Inside the News gallery**, partway through the news cards, as a single rotating panel.
2. **Inside the Socials gallery**, partway through the post cards, as a single rotating panel.
3. **In the Footer**, as a flat grid of every sponsor's logo.

## Weighted-but-fair rotation

Each sponsor carries an internal contribution weight. The rotation order is randomized on every page load, but higher-weight sponsors are biased toward earlier slots — so a top-tier sponsor appears more often in the visible position, while every sponsor still has a real chance at every slot. No one feels permanently buried.

## Rule 1: News section — top tier only, slow rotation

Inside the News gallery the rotator draws from the top-funded sponsors only. The panel is roomy and auto-advances slowly, so a visitor lingering on the news section sees a handful of distinct sponsors over the course of a minute.

### Example

A visitor reads the news cards for half a minute while deciding whether to tap an article. In that time, the rotator has cycled through two top-tier sponsors.

## Rule 2: Socials section — full roster, faster rotation

Inside the Socials gallery the rotator uses the full sponsor list and advances faster than the news rotator. Even while the socials section is in its skeleton-loading state, the rotator keeps cycling so sponsor impressions continue.

### Example

A visitor scrolls past the news, pauses on a carousel post in socials, and during their twenty-second pause the sponsor card has cycled through three sponsors.

## Rule 3: Footer — every sponsor, static grid

The Footer shuffles the full sponsor list once per render and displays every sponsor as a small tile. Sponsors whose logo asset is the club's own crest (a fallback for partners without a usable logo file) are filtered out — they would render as the club's own mark and look wrong among third-party brands.

Logos are normalized to a uniform tone — either desaturated or flattened to a single color — so the row reads as a coherent band even though real sponsor logos vary wildly in palette. The visual treatment is chosen per sponsor based on whether their logo already sits on a colored background.

### Example: the walking tour

A visitor scrolls all the way to the bottom after reading an article. They see the full sponsor roster at a glance — about a dozen and a half local businesses. They recognize a neighbor's company, their dentist's landlord, the village café, and mentally note that "the sport club is embedded in the town."

## Paused or former sponsors

Inactive partnerships never reach the visitor. When a sponsor returns, they reappear in the rotation; the visitor has no way to tell the difference between "new sponsor" and "reactivated sponsor."

## Click behavior

Every sponsor logo links to the sponsor's own website (or to a directory listing for businesses without one). Clicks are not measured.

## What sponsor display does not do

- No sponsor detail pages — only the logo and outbound link.
- No tier labels shown to visitors. The contribution weight is internal.
- No ad-server integration; sponsor rotation is entirely client-side.
- No impressions reporting back to sponsors.
