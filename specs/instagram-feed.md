# Instagram feed (Socials section)

## The section is live, not static

Below the news reel sits **SOCIALS** — a gallery of the club's recent Instagram posts. Unlike news, this data is fetched at runtime: on mount, the browser calls `GET /api/instagram` and renders whatever comes back.

## The skeleton-first experience

When the visitor first scrolls to the socials section, they never see an empty white gap. Instead, 25 pulsing skeleton cards render immediately — grey rectangles with animated shimmer that mimic the shape of a real social card (image placeholder on top, date-and-icon row, four lines of "caption"). If the fetch is still in flight, or if it fails, or if Instagram returns nothing, the skeletons stay.

### Example: the expired token

The club's IG access token expired overnight and the refresh Lambda hasn't run yet. A visitor opening the site sees news → skeleton socials → vorstand. The site still looks intentional; the absence of real posts is hidden behind a believable loading state rather than an error.

## The real post card

When posts arrive, each card shows:

- A media block in 100:56 aspect ratio (≈16:9).
- For `IMAGE` posts: the photo.
- For `VIDEO` posts: a muted autoplay video.
- For `CAROUSEL_ALBUM` posts: a nested horizontally-scrolling gallery inside the card, snap-scrolled by a page-level timer every 5 seconds, looping back to the start when near the end.
- Below the media: a primary bar, the post date, the word `SOCIAL`, and a small Instagram glyph that links to the original post's `permalink`.
- The caption, clamped to four lines.

### Example: a carousel post of the Kirmes

The Kirmes 2025 post is a 5-image carousel. Inside the socials card, the visitor sees the first image fill the card; five seconds later the card automatically scrolls to image 2, then 3, and so on. They can also swipe inside that mini-gallery to jump ahead manually.

## Sponsor insertion

Just like the news gallery, after the fourth real post (index 4), a small sponsor rotator is injected before the fifth post. In the socials section the rotator uses **all active sponsors**, weighted-shuffled by `money` — not just the top tier. Animation cycles every 7.5 seconds when posts are present, or every 5 seconds in the skeleton state.

## Backend: how posts are fetched

The Express server exposes `GET /api/instagram`. When called, it:

1. Reads `process.env.IG_ACCESS_TOKEN`. If missing or equal to `"placeholder"`, returns `[]`.
2. Calls `https://graph.instagram.com/v22.0/{USER_ID}/media?access_token=...` with the hardcoded user id `17841429201354204` to get a list of media ids.
3. For every id, fetches details in parallel (caption, media_url, permalink, timestamp, media_type, children, like_count, etc.).
4. Returns the array of detail objects as JSON.

On any thrown error, the handler logs it and returns `[]` — a silent graceful degradation. The frontend treats empty and error the same way: keep showing skeletons.

## Token lifecycle

`IG_ACCESS_TOKEN` is held in AWS Secrets Manager and refreshed by the Lambda function in `infrastructure/lambda/`. The server reads it from `.runtime.env` when `npm run serve` is invoked. During `vite build`, a placeholder is injected so the build never fails due to a missing token.

## What the socials section does not do

- No per-post comment or like counts displayed, though they are fetched.
- No filter by media type.
- No posting or commenting back to Instagram.
- No caching layer — every page load hits the Instagram API again.
