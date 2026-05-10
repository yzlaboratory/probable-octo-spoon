#!/usr/bin/env node
// Reads coverage-summary.json, diffs it against a baseline, prints a short
// report, optionally updates the baseline cache on success, and exits non-zero
// on regression.
//
// Two callers, one orchestrator:
//   - Local: pre-push hook + `npm run verify`. Baseline is the locally cached
//     `.git/last-good-coverage.json`. Cache updates on success.
//     First run with no cache is informational only.
//   - CI: PR jobs override the baseline path to point at `main`'s last-green
//     coverage-summary.json artifact (downloaded ahead of the script). Cache
//     does not update from CI; CI is read-only against the baseline.
//
// CLI flags / env (any one suffices; explicit flag wins):
//   --baseline=<path>   override baseline source path (CI artifact mode)
//   --tier=<name>       use `last-good-coverage.<name>.json` as the local
//                       baseline filename (lets fast/full tiers track
//                       independently, since Playwright/e2e add coverage the
//                       Vitest-only fast tier can't reach)
//   --no-update         do not write the baseline on success (CI mode)
//   COVERAGE_BASELINE   env equivalent of --baseline
//   COVERAGE_NO_UPDATE  truthy → do not update baseline
//
// Threshold comes from package.json `coverage.threshold` (default 0).

import { readFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { diffCoverage } from "./coverage-diff.mjs";
import { readBaseline, writeBaseline } from "./coverage-baseline.mjs";

// Resolve the real .git directory. In worktrees, ".git" at the repo root is a
// pointer file (e.g. "gitdir: /path/to/.git/worktrees/<name>"); writing under
// that path requires resolving to the actual directory.
//
// Strip git's own env vars from the child so a parent that already exported
// GIT_DIR (e.g. the pre-push hook) doesn't override the cwd-driven lookup —
// otherwise rev-parse echoes back GIT_DIR and we write the cache into the
// wrong worktree.
export function resolveGitDir(cwd) {
  const childEnv = { ...process.env };
  for (const key of Object.keys(childEnv)) {
    if (key.startsWith("GIT_")) delete childEnv[key];
  }
  try {
    const out = execSync("git rev-parse --git-dir", {
      cwd,
      encoding: "utf8",
      env: childEnv,
    }).trim();
    return resolve(cwd, out);
  } catch {
    return resolve(cwd, ".git");
  }
}

// Drop the synthetic "total" entry — we diff per file.
function stripTotal(s) {
  if (!s) return s;
  const { total, ...rest } = s;
  return rest;
}

// Pure-ish orchestration. Side effects (read summary, read/write baseline,
// log) are all parameterised so this function is unit-testable.
//
// Returns { exitCode, regressions, informational }. Does not call process.exit.
export function runVerify({
  summaryPath,
  baselinePath,
  threshold = 0,
  updateBaseline = true,
  log = () => {},
  error = () => {},
}) {
  if (!existsSync(summaryPath)) {
    error(
      `[verify-coverage] missing ${summaryPath}; run vitest with --coverage first`,
    );
    return { exitCode: 2, regressions: [], informational: false };
  }
  const current = JSON.parse(readFileSync(summaryPath, "utf8"));
  const baseline = readBaseline(baselinePath);

  const result = diffCoverage({
    current: stripTotal(current),
    baseline: stripTotal(baseline),
    threshold,
  });

  if (result.informational) {
    log(
      "[verify-coverage] no baseline yet — capturing initial baseline (informational, no gate)",
    );
    if (updateBaseline) writeBaseline(baselinePath, current);
    return { exitCode: 0, regressions: [], informational: true };
  }

  if (result.regressions.length === 0) {
    log(`[verify-coverage] ok (threshold=${threshold}%)`);
    if (updateBaseline) writeBaseline(baselinePath, current);
    return { exitCode: 0, regressions: [], informational: false };
  }

  error(
    `[verify-coverage] regression in ${result.regressions.length} file(s):`,
  );
  for (const r of result.regressions) {
    error(
      `  ${r.file}: ${r.metric}.pct ${r.baseline} → ${r.current} (${r.delta.toFixed(2)})`,
    );
  }
  error(
    `[verify-coverage] threshold = ${threshold}%; reset cache with: rm ${baselinePath}`,
  );
  return {
    exitCode: result.exitCode,
    regressions: result.regressions,
    informational: false,
  };
}

// Parse CLI args: --baseline=<path>, --tier=<name>, --no-update.
export function parseArgs(argv) {
  const out = {};
  for (const a of argv) {
    if (a === "--no-update") out.updateBaseline = false;
    else if (a.startsWith("--baseline="))
      out.baselineOverride = a.slice("--baseline=".length);
    else if (a.startsWith("--tier=")) out.tier = a.slice("--tier=".length);
  }
  return out;
}

// CLI orchestration extracted so the bottom of this file is a thin shim.
// All side effects (process.exit / repo-root resolution / env access) flow
// through `opts` so it can be unit-tested in node mode.
export function runCli({
  argv = [],
  env = {},
  repoRoot,
  log = (...a) => console.log(...a),
  error = (...a) => console.error(...a),
} = {}) {
  const args = parseArgs(argv);

  let pkg;
  try {
    pkg = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8"));
  } catch {
    pkg = {};
  }
  const threshold = Number(pkg?.coverage?.threshold ?? 0);

  const summaryPath = resolve(repoRoot, "coverage", "coverage-summary.json");
  const baselineOverride = args.baselineOverride ?? env.COVERAGE_BASELINE;
  const baselineFile = args.tier
    ? `last-good-coverage.${args.tier}.json`
    : "last-good-coverage.json";
  const baselinePath = baselineOverride
    ? resolve(baselineOverride)
    : resolve(resolveGitDir(repoRoot), baselineFile);

  const noUpdateEnv =
    env.COVERAGE_NO_UPDATE &&
    env.COVERAGE_NO_UPDATE !== "0" &&
    env.COVERAGE_NO_UPDATE !== "false";
  const updateBaseline =
    args.updateBaseline === false
      ? false
      : noUpdateEnv
        ? false
        : baselineOverride
          ? false
          : true;

  const result = runVerify({
    summaryPath,
    baselinePath,
    threshold,
    updateBaseline,
    log,
    error,
  });
  return result.exitCode;
}

// Only run the CLI when invoked directly (not when imported by tests).
export function detectIsMain() {
  try {
    const me = fileURLToPath(import.meta.url);
    return process.argv[1] && resolve(process.argv[1]) === me;
  } catch {
    /* v8 ignore next — fileURLToPath only throws on malformed URLs we can't synthesise. */
    return false;
  }
}

/* v8 ignore start — thin CLI shim; runCli covers the orchestration logic. */
if (detectIsMain()) {
  const here = dirname(fileURLToPath(import.meta.url));
  const repoRoot = resolve(here, "..");
  const code = runCli({
    argv: process.argv.slice(2),
    env: process.env,
    repoRoot,
  });
  process.exit(code);
}
/* v8 ignore stop */
