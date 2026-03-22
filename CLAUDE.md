# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Website for SV Alemannia Thalexweiler (German sports club) — built with Astro 5, Tailwind CSS v4, and deployed via Docker with Traefik reverse proxy. The site is in German.

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build (sets IG_ACCESS_TOKEN=placeholder if not in env)
npm run preview      # Preview production build
npm run serve        # Serve built app (needs .runtime.env): node --env-file=.runtime.env ./dist/server/entry.mjs
```

## Architecture

**Astro SSR** with `@astrojs/node` adapter in standalone mode (`server` output). File-based routing under `src/pages/`.

### Key directories

- `src/components/` — Astro components (`.astro` files only, no framework components)
- `src/pages/` — Routes: index, Impressum, Datenschutzerklaerung, `news/[news].astro` (dynamic)
- `src/data/news.json` — News articles loaded via Astro Content Loader with Zod schema
- `src/utilities/sponsors.ts` — Sponsor data and image imports
- `src/styles/global.css` — Tailwind v4 theme config, custom animations, icon font setup
- `src/layouts/Layout.astro` — Single layout wrapping all pages with Header/Footer

### Content patterns

- **News**: Add entries to `src/data/news.json`. Fields: id, path, title, tag, short, long, date, imageurl. Dynamic pages generated at `/news/[path]`.
- **Sponsors**: Configured in `src/utilities/sponsors.ts` with imported images from `src/assets/logos/`.
- **Board members (Vorstand)**: Data is hardcoded directly in `src/components/Vorstand.astro`.

### External integrations

- **Instagram Graph API v22.0**: Fetched server-side in `DynamicSocial.astro` using `IG_ACCESS_TOKEN` env var (defined in Astro env schema). Uses `server:defer` for deferred rendering.

### Styling

- Tailwind CSS v4 via Vite plugin (not the older `@astrojs/tailwind` integration)
- Dark theme: background `#121212`, primary color is oklch purple/blue
- Inter font (Google Fonts), Material Symbols Rounded icons
- Custom animation utilities in global.css: `.springy`, `.overshoot`, `.overshoot2`

### Deployment

- Docker container serving on port 4321
- Traefik v3.3 reverse proxy with Let's Encrypt SSL
- Domains: svthalexweiler.de / www.svthalexweiler.de
- `.runtime.env` holds production environment variables (not committed)

## Environment Variables

- `IG_ACCESS_TOKEN` — Instagram Graph API token (server secret, defined in `astro.config.mjs` env schema)
