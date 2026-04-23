import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Two test environments: node (server/unit tests under tests/unit) and jsdom
// (frontend component tests colocated under src/**/*.test.tsx).
export default defineConfig({
  plugins: [react()],
  test: {
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
