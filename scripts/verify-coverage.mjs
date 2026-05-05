#!/usr/bin/env node
// Reads ./coverage/coverage-summary.json, diffs it against the locally cached
// baseline (.git/last-good-coverage.json by default), prints a short report,
// updates the cache on success, and exits non-zero on regression.
//
// First run with no cache is informational only — it captures the baseline and
// exits 0. The next run gates against that baseline.
//
// Threshold comes from package.json `coverage.threshold` (default 0).

import { readFileSync, existsSync, statSync } from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { diffCoverage } from "./coverage-diff.mjs";
import { readBaseline, writeBaseline } from "./coverage-baseline.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");

// Resolve the real .git directory. In worktrees, ".git" at the repo root is a
// pointer file (e.g. "gitdir: /path/to/.git/worktrees/<name>"); writing under
// that path requires resolving to the actual directory.
function resolveGitDir(cwd) {
  try {
    const out = execSync("git rev-parse --git-dir", {
      cwd,
      encoding: "utf8",
    }).trim();
    return resolve(cwd, out);
  } catch {
    return resolve(cwd, ".git");
  }
}

const summaryPath = resolve(repoRoot, "coverage", "coverage-summary.json");

// Tier-aware baseline path. The default `last-good-coverage.json` is the
// fast tier (Vitest only) used by the pre-push hook. The full tier (Vitest +
// Playwright + e2e merge) writes to `last-good-coverage.full.json` so the two
// signals don't whipsaw each other — Playwright/e2e add coverage Vitest can't
// reach, so a single shared baseline would cause the fast tier to fail every
// time after the full tier runs.
const baselineArg = process.argv.find((a) => a.startsWith("--baseline="));
const baselineName = baselineArg ? baselineArg.slice("--baseline=".length) : "";
const baselineFile = baselineName
  ? `last-good-coverage.${baselineName}.json`
  : "last-good-coverage.json";
const baselinePath = resolve(resolveGitDir(repoRoot), baselineFile);

if (!existsSync(summaryPath)) {
  console.error(
    `[verify-coverage] missing ${summaryPath}; run vitest with --coverage first`,
  );
  process.exit(2);
}

let pkg;
try {
  pkg = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8"));
} catch {
  pkg = {};
}
const threshold = Number(pkg?.coverage?.threshold ?? 0);

const current = JSON.parse(readFileSync(summaryPath, "utf8"));
const baseline = readBaseline(baselinePath);

// Drop the synthetic "total" entry — we diff per file.
const stripTotal = (s) => {
  if (!s) return s;
  const { total, ...rest } = s;
  return rest;
};

const result = diffCoverage({
  current: stripTotal(current),
  baseline: stripTotal(baseline),
  threshold,
});

if (result.informational) {
  console.log(
    "[verify-coverage] no baseline yet — capturing initial baseline (informational, no gate)",
  );
  writeBaseline(baselinePath, current);
  process.exit(0);
}

if (result.regressions.length === 0) {
  console.log(`[verify-coverage] ok (threshold=${threshold}%)`);
  writeBaseline(baselinePath, current);
  process.exit(0);
}

console.error(
  `[verify-coverage] regression in ${result.regressions.length} file(s):`,
);
for (const r of result.regressions) {
  console.error(
    `  ${r.file}: ${r.metric}.pct ${r.baseline} → ${r.current} (${r.delta.toFixed(2)})`,
  );
}
console.error(
  `[verify-coverage] threshold = ${threshold}%; reset cache with: rm ${baselinePath}`,
);
process.exit(result.exitCode);
