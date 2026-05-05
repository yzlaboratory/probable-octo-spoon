import { defineConfig, devices } from "@playwright/test";

// Playwright config for the unified V8 coverage stack (ADR 0014 / 0015).
//
// Key choices:
// - `monocart-reporter` collects browser-side (Chromium CDP) V8 coverage and
//   writes raw output to coverage/raw/playwright/ so the merge orchestrator
//   can fold it into the unified report.
// - The Express e2e server is booted *outside* of Playwright by
//   scripts/run-e2e.mjs (which uses scripts/e2e-server-lifecycle.mjs to set
//   NODE_V8_COVERAGE and trap SIGTERM cleanly). Playwright itself only drives
//   the browser.
// - baseURL points at the e2e server's port (4322 by default to avoid clashing
//   with `npm run dev` on 4321).

const E2E_BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:4322";

export default defineConfig({
  testDir: "./e2e",
  testMatch: /.*\.spec\.ts/,
  fullyParallel: false,
  retries: 0,
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: E2E_BASE_URL,
    // Production serves a German club; assertions on rendered times (e.g. FuPa
    // fixtures) assume Europe/Berlin. Pin the browser context so CI runners
    // (UTC by default) don't shift kickoffs by 1–2 hours.
    timezoneId: "Europe/Berlin",
    locale: "de-DE",
    trace: "off",
    screenshot: "off",
    video: "off",
  },
  reporter: [
    ["list"],
    [
      "monocart-reporter",
      {
        name: "Clubsoft Playwright report",
        outputFile: "./coverage/playwright-report/index.html",
        coverage: {
          name: "Clubsoft Playwright coverage (raw)",
          outputDir: "./coverage/raw/playwright",
          // raw-only: the merge orchestrator owns the merged report.
          reports: [["raw"]],
          entryFilter: (entry: { url?: string }) => {
            if (!entry.url) return false;
            // First-party only: anything served from our origin.
            return (
              entry.url.startsWith(E2E_BASE_URL) ||
              entry.url.startsWith("http://localhost:")
            );
          },
          sourceFilter: (sourcePath: string) => {
            if (!sourcePath) return false;
            if (sourcePath.includes("/node_modules/")) return false;
            return /\b(src|server|scripts)\b/.test(sourcePath);
          },
        },
      },
    ],
  ],
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
