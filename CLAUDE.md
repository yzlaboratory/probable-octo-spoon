# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Website for SV Alemannia Thalexweiler (German sports club) — built as a Vite + React 19 single-page application, served in production by an Express app that also proxies the Instagram Graph API. Styled with Tailwind CSS v4 and MUI. Deployed via Docker behind a Traefik v3.3 reverse proxy. The site is in German.

## Commands

```bash
npm run dev            # Vite dev server (port 4321)
npm run build          # Production build → ./dist
npm run preview        # Preview the built SPA (port 4321)
npm run serve          # Serve built app: node --env-file=.runtime.env server.mjs
npm test               # Run Vitest unit tests once
npm run test:watch     # Vitest watch mode
npm run test:e2e       # Run Cypress end-to-end tests headless
npm run test:e2e:open  # Open Cypress UI
```

## Architecture

**Vite + React 19 SPA** with client-side routing via `react-router-dom` v7. Production is served by a small Express app (`server.mjs`) that serves the static build and exposes one API route (`/api/instagram`) as a thin proxy to the Instagram Graph API. There is no SSR.

### Key directories

- `src/main.tsx` — React entry point; wraps `<App />` in `<BrowserRouter>`.
- `src/App.tsx` — Route table (`/`, `/Impressum`, `/Datenschutzerklaerung`, `/news/:path`) all wrapped by `<Layout>`.
- `src/components/` — React components (`.tsx` only). `Layout.tsx` renders `<Header />` + `<Outlet />`; each page renders its own `<Footer />`.
- `src/pages/` — Top-level route components: `HomePage`, `ImpressumPage`, `DatenschutzPage`, `NewsDetailPage`.
- `src/data/news.json` — News articles imported directly as JSON.
- `src/utilities/sponsors.ts` — Sponsor data plus `shuffleSponsors()` / `shuffleTopSponsors(n)` weighted-shuffle helpers keyed on the `money` field.
- `src/assets/` — Images (and `src/assets/logos/` for sponsor logos) imported by components; resolved at build time via `import.meta.glob('/src/assets/*.{jpeg,jpg,png,svg}', { eager: true })` in `Newscard.tsx` and `NewsDetailPage.tsx`.
- `src/styles/global.css` — Tailwind v4 theme config and custom animations.
- `server.mjs` — Express server used by `npm run serve`.

### Content patterns

- **News**: Add entries to `src/data/news.json`. Fields: `id`, `path`, `title`, `tag`, `short`, `long`, `date`, `imageurl`. The SPA route `/news/:path` looks up the item by `path`; a missing slug renders the inline "Artikel nicht gefunden" fallback.
- **Sponsors**: Configured in `src/utilities/sponsors.ts`. Each entry carries a `money` weight used by the exponential-key shuffle (`Math.random() ** (1/money)`). `shuffleTopSponsors(8)` is used in the News gallery; `shuffleSponsors()` is used in the Socials gallery and Footer.
- **Board members (Vorstand)**: Data is hardcoded in `src/components/VorstandSection.tsx`.

### External integrations

- **Instagram Graph API v22.0**: Fetched by the Express server at `GET /api/instagram` using `IG_ACCESS_TOKEN`. On missing/placeholder token or any error the endpoint returns `[]` so the frontend keeps showing the skeleton state. The frontend `SocialsSection` calls this endpoint on mount. User id is hardcoded to `17841429201354204` in `server.mjs`.
- **AWS infrastructure** (`infrastructure/`): Terraform stack for S3, CloudFront, API Gateway, and a Lambda that auto-refreshes the Instagram long-lived token into AWS Secrets Manager. GitHub Actions handles CI/CD (Node 24).

### Styling

- Tailwind CSS v4 via `@tailwindcss/vite`.
- MUI v7 (`@mui/material`) with Emotion for a few primitives (`Card`, `IconButton`, `Skeleton`).
- Dark theme: background `#121212`, primary color is oklch purple/blue.
- Inter font (Google Fonts), Material Symbols Rounded icons.

### Deployment

- Dockerfile builds the app and runs `npm run serve` on port 4321.
- Traefik v3.3 reverse proxy with Let's Encrypt SSL (see `docker-compose.yml`).
- Domains: svthalexweiler.de / www.svthalexweiler.de.
- `.runtime.env` holds production environment variables (not committed); loaded by `node --env-file=.runtime.env`.

## Environment Variables

- `IG_ACCESS_TOKEN` — Instagram Graph API token, read by `server.mjs`. If missing or equal to `"placeholder"`, `/api/instagram` returns an empty array.
- `PORT` — server port for `npm run serve` (defaults to 4321).
