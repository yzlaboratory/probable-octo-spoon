# Design Implementation Plan

Companion to `design/README.md`. Breaks the mockup down into phased, mergeable PRs with explicit backend/UX decisions the human needs to make before each phase.

---

## Scope snapshot

| Screen | Exists today | Net-new UI | Needs backend |
|---|---|---|---|
| Dashboard (`/admin`) | redirect-only | yes | stats endpoints (derivable from existing entities) |
| News list (`/admin/news`) | yes (basic) | reskin | no |
| News block editor (`/admin/news/:id`) | yes (rich-text HTML) | **major rework** | **schema decision** |
| Events (`/admin/events`) | no | yes | **new `Event` entity** |
| Media (`/admin/media`) | no (uploader exists) | yes (grid + panel) | library listing endpoint + `Media.tags`/`filename` |
| Sponsors (`/admin/sponsors`) | yes (list/edit) | reskin + weight bar | no |
| Vorstand (`/admin/vorstand`) | yes (reorder) | reskin as card grid | no |
| Members (`/admin/members`) | no | yes | **new `Member` entity** |
| Public preview (`/admin/public`) | no | yes | no (iframe of real public routes) |
| Theme (`/admin/theme`) | no | yes | **new club-level theme settings** |
| Public site redesign | exists (dark tech look) | **total visual rework** | no |

"Reskin" = same data model, new tokens/layout. "Net-new" = new page. "Major rework" = data model affected.

---

## Decisions required before any code

1. **Branding.** Prototype shows `Clubsoft` platform + `SV Grün-Weiß Birkenstett` demo club. Real repo is single-tenant for `SV Alemannia Thalexweiler`. **Option A**: keep admin branded as the real club (swap "Clubsoft" → club name in wordmark, drop the club switcher). **Option B**: rebrand the app as "Clubsoft" and treat Thalexweiler as the one tenant. Recommended: **A** — minimal disruption, the platform framing is aspirational.
2. **News block editor vs. current rich-text.** The real `News.longHtml` is a string. The design assumes a `blocks` array. **Option A**: add a `blocks: Block[]` column alongside `longHtml`, editor writes both (blocks authoritative, HTML rendered on publish). **Option B**: serialize blocks ↔ HTML on the fly (fragile). **Option C**: defer the block editor and just reskin the existing rich-text editor for now. Recommended: **C for phase 1, A as a later phase** — the block editor is the single biggest piece; de-risking it as a follow-up lets the rest ship.
3. **New entities (Event, Member, Theme).** Do you want me to:
   - (a) build the UI against static fixtures now, ship it behind a `?mock=1` query guard, backend later;
   - (b) design and implement the full backend (schemas, migrations, endpoints) as part of this effort;
   - (c) hide those nav entries under a "bald" (coming soon) label as the prototype does for Settings;
   Recommended: **(c) for Events/Members** (they need thoughtful domain modeling); **(a) for Theme** (the preview is the whole point and fixture-backed theme tokens round-trip cleanly through localStorage until a backend exists); **full build for Media** (backend already has media storage for sponsor logos / news hero — library listing is a small addition).
4. **Public site visual rework.** Design specifies a warm editorial palette different from today's dark tech look, with new pages (`/sponsors`, `/team`, `/contact`). This is a product decision, not just a dev task — confirm you want the public site changed at all. Recommended: **split into its own dedicated effort** after the admin lands. Ship admin-only first.
5. **Pixel fidelity.** The mockups are 1440px fixed-width. Are you OK with the admin being desktop-first (min-width ~1200px) and the mobile story being "open the admin on a laptop"? Recommended: **yes** — matches the prototype, matches typical Verein editor workflow.

---

## Phased plan

Each phase = one PR, mergeable on its own. Phases are numbered; within a phase, tasks are ordered but can batch into a single atomic-commit series on a worktree per the project convention.

### Phase 0 — Design foundation (no user-visible change)

**Scope:** only the `/admin/*` routes. Public site untouched.

- Add Google Fonts (`Newsreader`, `Geist`, `Geist Mono`) — preferred via `index.html` `<link>` or `@import` in `src/styles/global.css`.
- Add CSS custom properties from `README.md` §Design Tokens under a `.admin-shell` scope (so they don't leak into the public site). Rename `--forest → --primary`, `--rust → --accent`, `--ochre → --warn`, `--plum → --tertiary` (preserving `--paper`, `--ink-*`, `--rule`, `--rule-2`, `--glow`).
- Port the prototype's global CSS helpers (`.caps`, `.chip`, `.btn-primary`, `.btn-ghost`, `.cs-input`, `.page-enter`, `.row-hover`, `.drag-dots`, `.stripes`, `.live-dot`, `.nav-item`, `kbd`) into `src/styles/admin.css`. Keep public-site styles fully isolated.
- Create `src/admin/ui/` primitives matching `shell.jsx`:
  - `Card.tsx`, `Pill.tsx` (tones: `neutral|primary|accent|warn|tertiary|mute`), `Button.tsx` (`primary|ghost|accent` × `sm|md|lg`), `PageHeader.tsx`, `Input.tsx`, `KindSegmented.tsx` (pill-group), `Kbd.tsx`.
  - `Icons.tsx`: one component per prototype icon. 34 total (see Explore summary). All stroke-based, 1.5px, 24×24.
- Unit-test each primitive (renders with each variant, applies correct className/tones). Keep happy + edge cases per project convention.

**No route changes. No data touched. CI green on `npm test && npm run build`.**

### Phase 1 — Admin shell + existing-page reskin

**Scope:** Replace `AdminLayout` with sidebar+topbar from `shell.jsx`; reskin News-list, Sponsors-list, Vorstand, Admins; keep the current rich-text News editor (decision **2C**).

- **Shell:**
  - `AdminLayout.tsx` → sidebar (248px fixed) + topbar (60px sticky) + scrollable main. Ambient gradient/noise pseudo-elements (`body::before`, `body::after`) scoped to the admin layout wrapper.
  - `Sidebar`: wordmark, club badge (decision **1A** → club name, no switcher), two nav sections (Inhalte / Konfiguration). Nav entries whose backend does not exist yet are rendered with `opacity: .5` and a `bald` pill per prototype (decision **3c**).
  - `Topbar`: breadcrumbs from react-router `useMatches`, search input (stub — `⌘K` opens nothing yet), website-link, avatar (from `useAuth().admin.email` initials), logout button moved into an avatar dropdown or kept in topbar (clarify in PR review).
- **News list:** filter tabs (`all|draft|scheduled|published|withdrawn`), search, table with status pill tones, pagination.
- **Sponsors list:** weight distribution bar (top), drag-reorder table (existing @dnd-kit, port to new row styles), right-side inspector on row select. Existing `SponsorEditPage` becomes the inspector contents (inline, not a separate route) — or kept as a modal. Flag for PR review.
- **Vorstand:** card grid (4-col, draggable), portrait tile + info footer. Keeps current @dnd-kit ordering code.
- **Admins:** reskin in the new token palette; no layout change.
- **Tests:** update existing component/e2e tests for new DOM structure; add tests for sidebar active-state and breadcrumb derivation.

**Risk:** this is the biggest visual diff. The existing e2e tests (Cypress) likely rely on text/role selectors that will mostly keep working; table-row selectors may need updating.

### Phase 2 — Dashboard

Stats derivable from existing data:
- Members count → **skip until Members exist** (show `—` or hide card).
- News: drafts count, scheduled count, published this month, views — `views` not tracked today → **hide or show `—`**.
- Events: upcoming count → **skip until Events exist**.
- Sponsors: active count, sum of monthly revenue → `monthly revenue` not on `Sponsor` today → **hide or show `—`**.

Build the grid and card chrome now, wire real data where it exists (`News.status` counts, `Sponsor.status` counts), and leave the other cards as static dashes with a "Bald verfügbar" footnote. Activity feed reads the `updatedAt` timestamps across all entities and renders a merged log.

### Phase 3 — Media library

Requires small backend extension: `GET /api/admin/media` returning `Media[]` with `filename`, `tags?`, `createdAt`, uploader info. Current `Media` type only has `id`/`variants`/`mimeType`.

- Grid view (4-col), dropzone, list view, side panel with Einfügen/Link kopieren/Löschen.
- Wire into existing uploader flow.
- Add "Select from library" path for News hero and Sponsor logo (replaces "upload fresh every time").

### Phase 4 — News block editor (decision 2A if chosen)

Separate, focused PR. Likely 2–3 days of work alone.
- Add `News.blocks` (nullable `Block[]`). Migration + API fields.
- Frontend: `BlockStream`, `BlockRow`, `BlockInsert` popover, per-kind renderers (`Heading`, `Lead`, `Paragraph`, `Image`, `Quote`, `Stats`, `Callout`), right-rail `Inspector` (kind-specific controls), `PublicationPanel` (draft/scheduled/now + datetime), `MetadataPanel` (tag + slug).
- Autosave debounce 800ms.
- Compile `blocks → longHtml` on server for the public renderer (keep `longHtml` as the render source of truth so `/news/:path` doesn't change).
- Keyboard: `Cmd+Shift+Enter` to insert block after, `Delete` to remove empty block (per prototype).

### Phase 5 — Net-new entity screens (gated on decisions)

Only begin once the entity decisions (3) are settled. Each becomes its own PR:
- **Events:** ADR for `Event` shape → migration → API → month/week/agenda views + side panel.
- **Members:** ADR for `Member` shape (incl. GDPR posture) → migration → API → KPI strip + filter + table.
- **Theme:** club-scoped `theme_settings` table (palette key, density, font pair) → API → theme editor with live preview iframe.

### Phase 6 — Public-site preview (`/admin/public`)

- Controls row (page tabs + device toggle) + mock browser chrome.
- Renders the real public routes inside a scoped iframe with `src` switched to `/`, `/news/:slug` (pick latest), `/sponsors`, `/team`, `/contact`, and width clamped via the toggle.
- Requires the new public routes (`/sponsors`, `/team`, `/contact`) to exist — these may or may not be built yet.

### Phase 7 — Public-site redesign (if desired, decision 4)

Separate effort. Warm-editorial palette, new pages, hero/news-grid/fixtures/sponsor-ribbon composition. Not blocking admin work.

---

## Ordering

Recommended merge sequence:

1. **Phase 0 → Phase 1** together (no-op foundation on its own is wasted ceremony). One PR, one worktree, atomic commits throughout.
2. **Phase 2** (Dashboard). Pure additive.
3. **Phase 3** (Media). Small backend change, big UX unlock.
4. **Phase 4** (Block editor). Highest-value, highest-risk. Feature-flag until confident.
5. **Phase 5** entity screens — each on its own PR, in any order once decisions are locked.
6. **Phase 6** public-preview.
7. **Phase 7** public-site redesign (separate product conversation).

Stop at any phase boundary without leaving the app in a broken state.

---

## What I will need from you

- Answers to the five decisions above.
- Confirmation you want me to start with **Phase 0 + 1 on a worktree**, push atomic commits to the remote, and open a PR for review — not merge straight to `main` (per memory: push-to-main auto-deploys; a visual rework this size warrants a preview).
- Optional: which of the new entities matter most to you product-wise so I order Phase 5 accordingly.
