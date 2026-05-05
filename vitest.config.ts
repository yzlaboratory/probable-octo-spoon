import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Two test environments: node (server/unit tests under tests/unit) and jsdom
// (frontend component tests colocated under src/**/*.test.tsx).
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
        "cypress/**",
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
        test: {
          name: "dom",
          include: ["src/**/*.test.{ts,tsx}"],
          environment: "jsdom",
          setupFiles: ["tests/setup-dom.ts"],
        },
      },
    ],
  },
});
