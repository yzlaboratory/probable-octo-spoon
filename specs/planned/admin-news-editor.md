# Admin news editor (planned)

> **Status:** not implemented. Today, news are edited by modifying the source JSON and redeploying. Content updates are locked to whoever has commit access.

## What the admin wants

A board member announcing a youth tournament, an event, or a call-for-volunteers wants to write a post in the browser — title, tag, short summary, long body, hero image — and publish it without touching code.

## The visitor scenario

A youth-committee chair wants to announce a tournament. They log in, click `+ Neue Meldung` in the news list, fill the form, choose to publish either immediately or on a future date, and save. The homepage news reel reflects the post within seconds (or at the scheduled time).

For an existing post, the same admin opens the list, clicks `Bearbeiten` on the row, edits the long text, saves. The change appears live shortly after.

## MVP

- A `/admin/news` list view: reverse chronological table of all news with date, tag, title, status, and per-row actions (Bearbeiten, Löschen, Veröffentlichen / Zurückziehen).
- A create/edit form with: title, tag (autocompleting against existing tags), date, short summary, long body, hero image upload, slug (auto-derived, editable, uniqueness-validated), status (Entwurf / Sofort veröffentlichen / Planen + datetime).
- A long-body editor that supports headings, bold/italic, lists, links, blockquotes, and inline images. No raw HTML input. No third-party embeds.
- **Long-body storage format: sanitized HTML.** The editor produces HTML; the server strips everything outside a small allowlist (`p`, `h2`, `h3`, `strong`, `em`, `ul`/`ol`/`li`, `a`, `blockquote`, `img`) before storing. Cheap to render and a low-friction migration from the existing long-string descriptions. Portable rich-text JSON is deliberately deferred — it earns its keep only once the site needs multiple renderers or structured block types, neither of which is on the horizon.
- Image uploads stored server-side and served from a stable URL (see ADR 0002 for the S3/CloudFront pipeline). Images survive editing the post.
- **One-time image backfill at cutover.** A migration script copies every image currently referenced by `src/data/news.json` and the `import.meta.glob` asset folder into the new image store, rewrites each article's `imageurl` to the new URL, and the build-time asset import disappears for news. Old slugs keep working; the codebase stops being a content store. No permanent legacy branching in the renderer.
- Soft delete with a `Papierkorb` view; hard delete only after soft delete.
- Save creates a new version; the editor exposes a short version history that an admin can roll back from.
- A `Vorschau` action that renders the article exactly as a visitor will see it, accessible only to logged-in admins, not crawlable.

That covers the actual job. Everything else is later.

## Could ship later

Roughly in order of when a real need is likely to surface:

1. **Autosave of in-progress drafts** — if an admin loses work to a tab close, this pays for itself fast.
2. **Edit-lock warning** when two admins open the same post.
3. **Co-author attribution.**
4. **Per-article SEO meta override fields** — only if defaults from title + summary stop being good enough.
5. **Responsive image variants** generated on upload — pure performance win, but not visitor-blocking.
6. **RSS feed.**
7. **Sitemap regeneration on publish.**
8. **Draft share link** for non-admin reviewers.
9. **Publish webhook** for cross-posting to social media.
10. **Full-text search across the admin archive.**

Most of these are routine improvements; none belongs in the first cut.

## Open questions

None gating the MVP. Long-body is sanitized HTML, image migration is a one-time backfill, and posts age out of the visible reel rather than auto-unpublishing.

## Architecture

Tracked in `adr/0003-architecture-backlog.md` B4.

## What the news editor does not do

- No comments, reactions, or shares.
- No multilingual authoring today (the site is German-only — see `../navigation-and-chrome.md` for the project-wide language stance).
- No collaborative real-time editing.
- No scheduled-unpublish workflow. Posts stay published until an admin withdraws them or deletes them; the existing content pattern is evergreen announcements, and time-bounded notices have not been frequent enough to warrant a second date field.
