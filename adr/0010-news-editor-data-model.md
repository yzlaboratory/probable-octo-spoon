# ADR 0010 — News editor data model

- **Status:** Accepted
- **Date:** 2026-04-17
- **Deciders:** Yannik Zeyer.
- **Supersedes:** none
- **Superseded by:** none
- **Related:** `specs/planned/admin-news-editor.md`, ADR 0007 (SQLite), ADR 0008 (single EC2).

## Context

`specs/planned/admin-news-editor.md` fixes the admin experience: browser-based CRUD, title + tag + date + short + long body + hero image, scheduled publish, soft delete. The spec pinned long-body storage as sanitized HTML and pinned a one-time image backfill at cutover. The concrete mechanics — editor library, sanitization library, image pipeline, versioning — were deferred to this ADR. ADR 0003 tracked them in B4.

Versioning, originally listed in the spec MVP and in B4, is cut from the MVP. A board member's ability to undo is "write the post again, correctly." Add versioning back if edit-regret becomes a real complaint.

## Decision

1. **Editor library.** TipTap (ProseMirror-based) on the admin SPA. Configured with extensions that produce only the tags in the server-side allowlist: `Document`, `Paragraph`, `Text`, `Bold`, `Italic`, `Heading` (levels 2, 3), `BulletList`, `OrderedList`, `ListItem`, `Link`, `Blockquote`, `Image`. No `HardBreak`, no `Code`, no third-party embed extensions. The toolbar exposes exactly those formats.
2. **Server-side HTML sanitization.** `sanitize-html` (Node library) with an allowlist matching the editor: `p`, `h2`, `h3`, `strong`, `em`, `ul`, `ol`, `li`, `a`, `blockquote`, `img`. Allowed attributes: `href` on `<a>` (http/https/mailto schemes only), `src`/`alt`/`width`/`height` on `<img>` (src must resolve to the club's own image store). All other tags and attributes stripped silently. Sanitization runs on every write; the stored HTML is assumed safe to render without further escaping.
3. **Image upload pipeline.**
   - **Accepted formats:** PNG, JPEG, WebP. SVG rejected for news images (XSS vector; not needed in this context).
   - **Max upload size:** 10 MB. Rejected above that with a clear error.
   - **Variant generation:** `sharp` generates three resized WebP variants (400w, 800w, 1600w) plus one fallback JPEG at the original's aspect ratio. Stored on the EBS volume under `/var/lib/clubsoft/media/news/<slug>/<uuid>/<variant>.webp`.
   - **Serving:** `<img srcset>` with the three WebP variants and `sizes` tuned for the news card + detail page breakpoints. The fallback JPEG is referenced as the `src` attribute for very old clients.
   - **Naming:** the stored path includes a UUID so two articles with the same slug (during slug editing) never collide; the public URL is derived from the stored path.
4. **Data model (SQLite).**
   ```
   news(
     id           INTEGER PRIMARY KEY,
     slug         TEXT NOT NULL UNIQUE,
     title        TEXT NOT NULL,
     tag          TEXT NOT NULL,
     short        TEXT NOT NULL,
     long_html    TEXT NOT NULL,         -- sanitized HTML
     hero_media_id INTEGER REFERENCES media(id),
     status       TEXT NOT NULL CHECK (status IN ('draft','scheduled','published','withdrawn','deleted')),
     publish_at   TEXT,                  -- ISO-8601 UTC; null unless status='scheduled' or 'published'
     created_at   TEXT NOT NULL,
     updated_at   TEXT NOT NULL
   );
   media(
     id           INTEGER PRIMARY KEY,
     kind         TEXT NOT NULL,         -- 'news' | 'sponsor' | 'vorstand'
     original_path TEXT NOT NULL,
     variants_json TEXT NOT NULL,        -- {"400w": "...", "800w": "...", ...}
     uploaded_at  TEXT NOT NULL,
     uploaded_by  INTEGER REFERENCES admins(id)
   );
   ```
   Indexes: `news(status, publish_at)` for the publish-schedule sweep; `news(slug)` is already unique.
5. **Scheduled publish.** A lightweight in-process tick (every 60 s) runs `UPDATE news SET status='published' WHERE status='scheduled' AND publish_at <= now`. No separate worker in the MVP.
6. **Soft delete.** `status='deleted'` hides the row from list views except the `Papierkorb` filter. Hard delete from the Papierkorb removes the row and unlinks any media exclusively referenced by it (a `media_refcount` view handles the orphan check).
7. **One-time backfill script.** At cutover, a migration reads `src/data/news.json`, copies each referenced image from `src/assets/` into the media store (running it through the `sharp` variant pipeline), and inserts rows into `news` and `media`. The `long` field is sanitized through the same pipeline during the copy. Old slugs survive because `news.slug` carries them forward.

## Alternatives considered

- **Plain `<textarea>` + Markdown.** Zero frontend deps. Rejected because the admins are not engineers and Markdown's raw syntax is an unforced friction for a user population that will write a handful of posts per month.
- **Portable rich-text JSON (ProseMirror-native JSON, or a schema like Lexical's).** The spec explicitly deferred this. Rejected for the MVP: HTML renders directly, migrates cleanly from the current long-string descriptions, and no second renderer is on the horizon.
- **DOMPurify (server-side via jsdom).** Would work. Rejected because `sanitize-html` is purpose-built for Node-side allowlisting without a jsdom dependency.
- **Accept SVG for news hero images.** Rejected. SVG as a hero image is unusual, and safe SVG ingestion requires a sanitization pipeline we would only run once. Not worth it.
- **Versioning with full snapshots on every save.** Cut from the MVP. If edit-regret becomes a real complaint, add an `news_versions` table that stores the pre-edit row; do not reach for a diff library until the cost of full-row snapshots is actually felt.
- **Offload images to S3 + CloudFront.** Rejected for the MVP alongside ADR 0008's "no CloudFront." Keeping media on the EBS volume collapses the image pipeline to `sharp` + static file serving. Revisit when traffic actually warrants it.

## Consequences

### Positive

- Non-engineer-friendly editor with a direct path from typed content to stored HTML, end-to-end.
- One sanitization seam on the server. The renderer does not re-escape or re-sanitize; whatever is in `long_html` is assumed safe.
- `srcset` variant generation keeps mobile bandwidth reasonable without admin discipline about image sizes.
- Soft delete preserves recovery from an accidental `Löschen` without adding a versioning system.

### Negative / Costs

- Media lives on the app's EBS volume. Disk usage is a metric to watch. A 20 GB volume tolerates years of club news imagery, but is not free.
- The 60-second publish tick means a "publish at 19:00" can appear up to 60 s late. Acceptable for the audience.
- No version history means a slip of the keyboard that deletes a paragraph is gone once the save lands. Soft delete does not help here — it covers the whole article, not individual edits. Admins save deliberately.

### DSGVO / legal

- News content is not personal data. The `uploaded_by` foreign key on `media` is admin PII and lives on the same encrypted volume as the rest of the app data.
- No third-party scripts, no third-party image CDN, no tracking pixels.

## Follow-ups

- Land the first migration with the `news` and `media` tables and the unique-slug constraint.
- Write the TipTap extension set as a single module so the allowlist is literally one source of truth.
- Implement the backfill script and rehearse it against a copy of `src/data/news.json` before cutover.
- Reconsider versioning if an admin complains about undo more than once. Keep the schema open to an `news_versions` table without migrating toward it pre-emptively.
- Reconsider S3 + CDN for media only when bandwidth or disk pressure on the EBS volume becomes real.
