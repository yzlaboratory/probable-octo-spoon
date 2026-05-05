// Monocart coverage reports config used by the vitest-monocart-coverage provider.
// PR 1 wires this for the existing node + dom Vitest projects.
// Subsequent PRs (per ADR 0014) will add browser/Playwright/e2e raw inputs and merge them.

export default {
  name: "Clubsoft coverage",
  outputDir: "coverage",
  reports: [
    // json-summary writes coverage/coverage-summary.json keyed by file path with
    // line/branch/function metrics. Read by scripts/coverage-diff.mjs.
    "json-summary",
    // raw keeps the original V8 data so PR N+2 can merge with Playwright/e2e
    // inputs via Monocart's multi-source inputDir API.
    "raw",
    // v8 produces a browsable HTML report under coverage/ for human investigation.
    "v8",
  ],
  // Only measure first-party source files; sourcemaps and node_modules excluded.
  sourceFilter: (path) => {
    if (path.includes("/node_modules/")) return false;
    if (path.includes("/dist/")) return false;
    if (path.includes("/coverage/")) return false;
    if (/\.test\.(t|j)sx?$/.test(path)) return false;
    return (
      /^(src|server|scripts)\//.test(path) ||
      path.startsWith("./") ||
      !path.startsWith("/")
    );
  },
  cleanCache: true,
};
