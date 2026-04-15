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
- Image uploads stored server-side and served from a stable URL. Images survive editing the post.
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

- Does the long-body field need its own structured representation (portable rich-text JSON), or is sanitized HTML enough? Choosing JSON unlocks safer rendering later but is more work upfront.
- How does the existing local-asset image pipeline migrate to the new image-id scheme without breaking old slugs? This needs a one-time backfill plan.
- Is there a "scheduled unpublish" use case, or do posts simply age out of the reel?

## Architecture

Tracked in `adr/0003-architecture-backlog.md` B4.

## What the news editor does not do

- No comments, reactions, or shares.
- No multilingual authoring; the site is German-only.
- No collaborative real-time editing.
- No scheduled-unpublish workflow in the MVP.
