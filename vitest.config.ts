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
// Coverage: V8 raw output via the vitest-monocart-coverage provider. Output
// goes to ./coverage/ — coverage-summary.json (json-summary) is the
// machine-parseable signal consumed by scripts/coverage-diff.mjs and the
// pre-push hook. See ADR 0014 / ADR 0015 and mcr.config.mjs.
export default defineConfig({
  plugins: [react()],
  test: {
    coverage: {
      enabled: false,
      provider: "custom",
      customProviderModule: "vitest-monocart-coverage",
      include: ["src/**", "server/**", "scripts/coverage-*.mjs"],
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        "**/coverage/**",
        "**/*.test.{ts,tsx,mjs}",
        "**/*.config.{ts,js,mjs}",
        "tests/**",
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
