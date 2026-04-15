# Instagram feed (Socials section)

## The section is live, not static

Below the news reel sits **SOCIALS** — a gallery of the club's recent Instagram posts. Unlike news, this data is fetched at runtime; the visitor sees whatever the club has posted recently to its account.

## The skeleton-first experience

When the visitor first scrolls to the socials section, they never see an empty white gap. Instead, a row of pulsing skeleton cards renders immediately — grey rectangles with shimmer that mimic the shape of a real social card. If the fetch is still in flight, or if it fails, or if Instagram returns nothing, the skeletons stay.

### Example: the expired token

The club's Instagram access has lapsed and hasn't been refreshed yet. A visitor opening the site sees news → skeleton socials → vorstand. The site still looks intentional; the absence of real posts is hidden behind a believable loading state rather than an error.

## The real post card

When posts arrive, each card shows:

- A media block in a wide aspect ratio.
- For image posts: the photo.
- For video posts: a muted autoplay video.
- For carousel albums: a nested mini-gallery inside the card that auto-advances every few seconds and loops; the visitor can also swipe inside it to jump ahead.
- Below the media: an accent bar, the post date, the word `SOCIAL`, and a small Instagram glyph that links to the original post.
- The caption, line-clamped to a few lines.

### Example: a carousel post of the Kirmes

A multi-image Kirmes post appears as a single card whose media area cycles through the photos one by one. The visitor can also swipe inside the card to control it.

## Sponsor insertion

Just like the news gallery, a sponsor rotator is injected partway through the socials section. Here the rotator draws from the full sponsor roster (not just the top tier), and it cycles a little faster than the news rotator. While the section is in its skeleton state, the rotator keeps cycling so sponsor impressions continue. See `sponsor-display.md`.

## How posts arrive, as far as the visitor can tell

From the visitor's side there is no visible handshake with Instagram. Posts appear when they are ready, skeletons stay when they are not. If anything goes wrong — expired credentials, network error, Instagram outage — the visitor sees skeletons, not an error message. The section gracefully looks like it is still loading.

## What the socials section does not do

- No per-post comment or like counts displayed.
- No filter by media type.
- No posting or commenting back to Instagram.
- No on-site caching of the feed; every visit produces a fresh fetch.
