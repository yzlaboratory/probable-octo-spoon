import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";

// Two test projects per ADR 0014:
//   - node:    tests/unit/**/*.test.ts (no React — server, pure logic, scripts)
//   - browser: src/**/*.test.{ts,tsx} (React-importing component / hook tests)
//              runs in real Chromium via Vitest browser mode + Playwright
//              provider, headless. No jsdom anywhere.
//
// Mechanical placement rule: a test file imports React → browser. It does not
// → node. New pure-logic .test.ts files belong under tests/unit/**.
//
// Coverage: built-in `@vitest/coverage-v8` provider (NOT the third-party
// `vitest-monocart-coverage`). The third-party provider can't define separate
// entrypoints for node vs browser projects in one workspace — vitest doesn't
// support per-project provider modules — so the browser project's V8 coverage
// silently dropped on the floor. See vitest-dev/vitest#7316 and
// cenfun/vitest-monocart-coverage#8.
//
// The built-in v8 provider works across both projects. It writes Istanbul-
// shaped reports (json-summary, json, html) to ./coverage/ and the merge
// orchestrator (scripts/merge-coverage.mjs) folds the istanbul JSON into the
// unified report alongside Playwright + server-e2e raw V8.
export default defineConfig({
  plugins: [react()],
  test: {
    coverage: {
      enabled: false,
      provider: "v8",
      reporter: ["json-summary", "json", "html"],
      reportsDirectory: "coverage",
      include: ["src/**/*.{ts,tsx}", "server/**/*.mjs", "scripts/coverage-*.mjs"],
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        "**/coverage/**",
        "**/*.test.{ts,tsx,mjs}",
        "**/*.config.{ts,js,mjs}",
        "tests/**",
        // Binary / non-source assets that the v8 provider tries to remap and
        // chokes on (.DS_Store, images, fonts, etc.).
        "**/*.{svg,png,jpg,jpeg,gif,webp,ico,woff,woff2,ttf,otf,eot}",
        "**/.DS_Store",
      ],
    },
    projects: [
      {
        extends: true,
        test: {
          name: "node",
          include: ["tests/unit/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        extends: true,
        // Pre-bundle every dep React-rendered components reach so the first
        // run after a node_modules / lockfile change doesn't trigger a mid-
        // run Vite re-optimisation (which loads React twice and produces
        // "Invalid hook call" failures on transitively-React-using libs).
        optimizeDeps: {
          include: [
            "react",
            "react-dom",
            "react-dom/client",
            "react/jsx-dev-runtime",
            "react/jsx-runtime",
            "react-router-dom",
            "@testing-library/react",
            "@testing-library/jest-dom/vitest",
            "@dnd-kit/core",
            "@dnd-kit/sortable",
            "@dnd-kit/utilities",
            "@mui/material/Card",
            "@mui/material/IconButton",
            "@mui/material/Skeleton",
            "slug",
          ],
        },
        test: {
          name: "browser",
          include: ["src/**/*.test.{ts,tsx}"],
          setupFiles: ["tests/setup-dom.ts"],
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{ browser: "chromium" }],
          },
        },
      },
    ],
  },
});
